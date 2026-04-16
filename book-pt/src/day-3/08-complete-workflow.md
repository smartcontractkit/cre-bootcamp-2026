# Fluxo Completo: Conectando Tudo

É hora de combinar tudo em um workflow completo e funcional de liquidação!

## O Fluxo Completo

```
SettlementRequested Event
         │
         ▼
    Log Trigger
         │
         ▼
┌────────────────────┐
│ Passo 1: Decodificar│
│ Dados do evento     │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Passo 2: EVM Read  │
│ Obter detalhes     │
│ do mercado         │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Passo 3: HTTP      │
│ Consultar Gemini AI│
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Passo 4: EVM Write │
│ Submeter liquidação│
└────────┬───────────┘
         │
         ▼
    Retornar txHash
```

## logCallback.ts Completo

Atualize `my-workflow/logCallback.ts` com o fluxo completo de liquidação:

```typescript
// prediction-market/my-workflow/logCallback.ts

import {
  cre,
  type Runtime,
  type EVMLog,
  getNetwork,
  bytesToHex,
  hexToBase64,
  TxStatus,
  encodeCallMsg,
} from "@chainlink/cre-sdk";
import {
  decodeEventLog,
  parseAbi,
  encodeAbiParameters,
  parseAbiParameters,
  encodeFunctionData,
  decodeFunctionResult,
  zeroAddress,
} from "viem";
import { askGemini } from "./gemini";

// Tipos inline
type Config = {
  geminiModel: string;
  evms: Array<{
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
};

interface Market {
  creator: string;
  createdAt: bigint;
  settledAt: bigint;
  settled: boolean;
  confidence: number;
  outcome: number; // 0 = Yes, 1 = No
  totalYesPool: bigint;
  totalNoPool: bigint;
  question: string;
}

interface GeminiResult {
  result: "YES" | "NO" | "INCONCLUSIVE";
  confidence: number; // 0-10000
}

// ===========================
// ABIs do Contrato
// ===========================

/** ABI para o evento SettlementRequested */
const EVENT_ABI = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string question)",
]);

/** ABI para leitura de dados do mercado */
const GET_MARKET_ABI = [
  {
    name: "getMarket",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "createdAt", type: "uint48" },
          { name: "settledAt", type: "uint48" },
          { name: "settled", type: "bool" },
          { name: "confidence", type: "uint16" },
          { name: "outcome", type: "uint8" },
          { name: "totalYesPool", type: "uint256" },
          { name: "totalNoPool", type: "uint256" },
          { name: "question", type: "string" },
        ],
      },
    ],
  },
] as const;

/** Parâmetros ABI para relatório de liquidação (outcome é uint8 para enum Prediction) */
const SETTLEMENT_PARAMS = parseAbiParameters("uint256 marketId, uint8 outcome, uint16 confidence");

// ===========================
// Handler do Log Trigger
// ===========================

/**
 * Lida com eventos do Log Trigger para liquidar mercados de previsão.
 *
 * Fluxo:
 * 1. Decodificar o evento SettlementRequested
 * 2. Ler detalhes do mercado do contrato (EVM Read)
 * 3. Consultar Gemini AI para o resultado (HTTP)
 * 4. Escrever o relatório de liquidação no contrato (EVM Write)
 *
 * @param runtime - Runtime CRE com config e capabilities
 * @param log - Os dados do evento EVM log
 * @returns Mensagem de sucesso com hash da transação
 */
export function onLogTrigger(runtime: Runtime<Config>, log: EVMLog): string {
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  runtime.log("CRE Workflow: Log Trigger - Settle Market");
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // ─────────────────────────────────────────────────────────────
    // Passo 1: Decodificar o log do evento
    // ─────────────────────────────────────────────────────────────
    const topics = log.topics.map((t: Uint8Array) => bytesToHex(t)) as [
      `0x${string}`,
      ...`0x${string}`[]
    ];
    const data = bytesToHex(log.data);

    const decodedLog = decodeEventLog({ abi: EVENT_ABI, data, topics });
    const marketId = decodedLog.args.marketId as bigint;
    const question = decodedLog.args.question as string;

    runtime.log(`[Step 1] Settlement requested for Market #${marketId}`);
    runtime.log(`[Step 1] Question: "${question}"`);

    // ─────────────────────────────────────────────────────────────
    // Passo 2: Ler detalhes do mercado do contrato (EVM Read)
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 2] Reading market details from contract...");

    const evmConfig = runtime.config.evms[0];
    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName: evmConfig.chainSelectorName,
      isTestnet: true,
    });

    if (!network) {
      throw new Error(`Unknown chain: ${evmConfig.chainSelectorName}`);
    }

    const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

    const callData = encodeFunctionData({
      abi: GET_MARKET_ABI,
      functionName: "getMarket",
      args: [marketId],
    });

    const readResult = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({
          from: zeroAddress,
          to: evmConfig.marketAddress,
          data: callData,
        })
      })
      .result();

    const market = decodeFunctionResult({
      abi: GET_MARKET_ABI,
      functionName: "getMarket",
      data: bytesToHex(readResult.data),
    }) as Market;

    runtime.log(`[Step 2] Market creator: ${market.creator}`);
    runtime.log(`[Step 2] Already settled: ${market.settled}`);
    runtime.log(`[Step 2] Yes Pool: ${market.totalYesPool}`);
    runtime.log(`[Step 2] No Pool: ${market.totalNoPool}`);

    if (market.settled) {
      runtime.log("[Step 2] Market already settled, skipping...");
      return "Market already settled";
    }

    // ─────────────────────────────────────────────────────────────
    // Passo 3: Consultar IA (HTTP)
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 3] Querying Gemini AI...");

    const geminiResult = askGemini(runtime, question);
    
    // Extrair JSON da resposta (IA pode incluir texto antes/depois do JSON)
    const jsonMatch = geminiResult.geminiResponse.match(/\{[\s\S]*"result"[\s\S]*"confidence"[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Could not find JSON in AI response: ${geminiResult.geminiResponse}`);
    }
    const parsed = JSON.parse(jsonMatch[0]) as GeminiResult;

    // Validar o resultado - apenas YES ou NO podem liquidar um mercado
    if (!["YES", "NO"].includes(parsed.result)) {
      throw new Error(`Cannot settle: AI returned ${parsed.result}. Only YES or NO can settle a market.`);
    }
    if (parsed.confidence < 0 || parsed.confidence > 10000) {
      throw new Error(`Invalid confidence: ${parsed.confidence}`);
    }

    runtime.log(`[Step 3] AI Result: ${parsed.result}`);
    runtime.log(`[Step 3] AI Confidence: ${parsed.confidence / 100}%`);

    // Converter string do resultado para valor do enum Prediction (0 = Yes, 1 = No)
    const outcomeValue = parsed.result === "YES" ? 0 : 1;

    // ─────────────────────────────────────────────────────────────
    // Passo 4: Escrever relatório de liquidação no contrato (EVM Write)
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 4] Generating settlement report...");

    // Codificar dados de liquidação
    const settlementData = encodeAbiParameters(SETTLEMENT_PARAMS, [
      marketId,
      outcomeValue,
      parsed.confidence,
    ]);

    // Adicionar prefixo 0x01 para que o contrato direcione para _settleMarket
    const reportData = ("0x01" + settlementData.slice(2)) as `0x${string}`;

    const reportResponse = runtime
      .report({
        encodedPayload: hexToBase64(reportData),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      })
      .result();

    runtime.log(`[Step 4] Writing to contract: ${evmConfig.marketAddress}`);

    const writeResult = evmClient
      .writeReport(runtime, {
        receiver: evmConfig.marketAddress,
        report: reportResponse,
        gasConfig: {
          gasLimit: evmConfig.gasLimit,
        },
      })
      .result();

    if (writeResult.txStatus === TxStatus.SUCCESS) {
      const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
      runtime.log(`[Step 4] ✓ Settlement successful: ${txHash}`);
      runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return `Settled: ${txHash}`;
    }

    throw new Error(`Transaction failed: ${writeResult.txStatus}`);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    runtime.log(`[ERROR] ${msg}`);
    runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw err;
  }
}
```

## Fazendo uma Previsão

Antes de solicitar a liquidação, vamos fazer uma previsão no mercado. Isso demonstra o fluxo completo - previsões com ETH, liquidação por IA e vencedores resgatando sua parte.

> Em um computador Windows, use `Git Bash` para executar todos os comandos **cast**.

A Prediction é um tipo enum em Solidity
- 0 = Yes
- 1 = No

Vamos prever:
- YES (0)
- No mercado id #0
- Pagando 0.01 ETH

Execute este comando para executar a função predict no PredictionMarket.sol implantado no endereço da variável $MARKET_ADDRESS:

```bash
# Prever YES no mercado #0 com 0.01 ETH
cast send $MARKET_ADDRESS \
  "predict(uint256,uint8)" 0 0 \
  --value 0.01ether \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

Podemos então ver os detalhes do mercado novamente:

```bash
cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

E até obter apenas nossa previsão:

```bash
export PREDICTOR=0xYOUR_WALLET_ADDRESS
```

```bash
cast call $MARKET_ADDRESS \
  "getPrediction(uint256,address) returns ((uint256,uint8,bool))" \
  0 $PREDICTOR \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

- Você pode ter múltiplos participantes prevendo - alguns YES, alguns NO. 
- Após o CRE liquidar o mercado, os vencedores podem chamar `claim()` para receber sua parte do pool total!

---

## Liquidar o Mercado

Agora vamos executar o fluxo completo de liquidação usando o Log Trigger.

### Passo 1: Solicitar Liquidação

Primeiro, acione o evento `SettlementRequested` do smart contract:

```bash
cast send $MARKET_ADDRESS \
  "requestSettlement(uint256)" 0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

**Salve o hash da transação!** Você precisará dele no próximo passo.

### Passo 2: Executar a Simulação

```bash
cre workflow simulate my-workflow --broadcast
```

### Passo 3: Selecionar Log Trigger

```bash
🚀 Workflow simulation ready. Please select a trigger:
┃   http-trigger@1.0.0-alpha Trigger
┃ > evm:ChainSelector:16015286601757825753@1.0.0 LogTrigger
```

Selecione: `evm:ChainSelector: ... LogTrigger` e pressione Enter

### Passo 4: Inserir Detalhes da Transação

```bash
🔗 EVM Trigger Configuration:
Please provide the transaction hash and event index for the EVM log event.
Enter transaction hash (0x...):
```

Cole o hash da transação do Passo 1.

### Passo 5: Inserir Índice do Evento

```bash
Enter event index (0-based): 0
```

Insira **0**.

### Saída Esperada

```bash
[SIMULATION] Running trigger trigger=evm:ChainSelector:16015286601757825753@1.0.0
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] CRE Workflow: Log Trigger - Settle Market
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] [Step 1] Settlement requested for Market #0
[USER LOG] [Step 1] Question: "Will Argentina win the 2022 World Cup?"
[USER LOG] [Step 2] Reading market details from contract...
[USER LOG] [Step 2] Market creator: 0x...
[USER LOG] [Step 2] Already settled: false
[USER LOG] [Step 2] Yes Pool: 10000000000000000
[USER LOG] [Step 2] No Pool: 0
[USER LOG] [Step 3] Querying Gemini AI...
[USER LOG] [Gemini] Querying AI for market outcome...
[USER LOG] [Gemini] Response received: Argentina won the 2022 World Cup, defeating France in the final.

{"result": "YES", "confidence": 10000}
[USER LOG] [Step 3] AI Result: YES
[USER LOG] [Step 3] AI Confidence: 100%
[USER LOG] [Step 4] Generating settlement report...
[USER LOG] [Step 4] Writing to contract: 0x...
[USER LOG] [Step 4] ✓ Settlement successful: 0xabc123...
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Workflow Simulation Result:
 "Settled: 0xabc123..."

[SIMULATION] Execution finished signal received
```

### Passo 6: Verificar Liquidação On-Chain

```bash
cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

Você deve ver `settled: true` e o resultado determinado pela IA!

### Passo 7: Resgatar Seus Ganhos

Se você previu o resultado vencedor, resgate sua parte do pool:

```bash
cast send $MARKET_ADDRESS \
  "claim(uint256)" 0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

---

## 🎉 Você Conseguiu!

**Parabéns!** Você acabou de construir e executar um mercado de previsão completo com IA usando CRE!

Vamos recapitular o que você realizou:

| Capability | O Que Você Construiu |
|------------|----------------------|
| **HTTP Trigger** | Criação de mercado via requisições de API |
| **Log Trigger** | Automação de liquidação orientada a eventos |
| **EVM Read** | Leitura do estado do mercado da blockchain |
| **HTTP (IA)** | Consulta ao Gemini AI para resultados do mundo real |
| **EVM Write** | Escritas on-chain verificadas com consenso DON |

Seu workflow agora:
- ✅ Cria mercados sob demanda via HTTP
- ✅ Escuta solicitações de liquidação via eventos blockchain
- ✅ Lê dados do mercado do seu smart contract
- ✅ Consulta IA para determinar resultados do mundo real
- ✅ Escreve liquidações verificadas de volta on-chain
- ✅ Permite que vencedores resgatem suas recompensas

---

## Próximos Passos

Vá para o capítulo final para um passo a passo completo de ponta a ponta e o que vem a seguir na sua jornada CRE!
