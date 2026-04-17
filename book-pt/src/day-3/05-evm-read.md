# EVM Read no Prediction Market

## Lendo Dados do Mercado

Para ler os Dados do Mercado, nosso contrato tem uma função `getMarket`:

```solidity
function getMarket(uint256 marketId) external view returns (Market memory);
```

Vamos chamá-la a partir do CRE.

### Passo 1: Definir a ABI

```typescript
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
          { name: "outcome", type: "uint8" },  // Enum Prediction
          { name: "totalYesPool", type: "uint256" },
          { name: "totalNoPool", type: "uint256" },
          { name: "question", type: "string" },
        ],
      },
    ],
  },
] as const;
```

### Passo 2: Atualizar o arquivo `logCallback.ts`

Agora vamos atualizar `my-workflow/logCallback.ts` para adicionar a funcionalidade EVM Read:

```typescript
// prediction-market/my-workflow/logCallback.ts

import {
  cre,
  type Runtime,
  type EVMLog,
  getNetwork,
  bytesToHex,
  encodeCallMsg,
} from "@chainlink/cre-sdk";
import {
  decodeEventLog,
  parseAbi,
  encodeFunctionData,
  decodeFunctionResult,
  zeroAddress,
} from "viem";

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
  outcome: number;
  totalYesPool: bigint;
  totalNoPool: bigint;
  question: string;
}

const EVENT_ABI = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string question)",
]);

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

export function onLogTrigger(runtime: Runtime<Config>, log: EVMLog): string {
  // Passo 1: Decodificar o evento
  const topics = log.topics.map((t: Uint8Array) => bytesToHex(t)) as [
    `0x${string}`,
    ...`0x${string}`[]
  ];
  const data = bytesToHex(log.data);

  const decodedLog = decodeEventLog({ abi: EVENT_ABI, data, topics });
  const marketId = decodedLog.args.marketId as bigint;
  const question = decodedLog.args.question as string;

  runtime.log(`Settlement requested for Market #${marketId}`);
  runtime.log(`Question: "${question}"`);

  // Passo 2: Ler detalhes do mercado (EVM Read)
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
      }),
    })
    .result();

  const market = decodeFunctionResult({
    abi: GET_MARKET_ABI,
    functionName: "getMarket",
    data: bytesToHex(readResult.data),
  }) as Market;

  runtime.log(`Creator: ${market.creator}`);
  runtime.log(`Already settled: ${market.settled}`);
  runtime.log(`Yes Pool: ${market.totalYesPool}`);
  runtime.log(`No Pool: ${market.totalNoPool}`);

  if (market.settled) {
    return "Market already settled";
  }

  // Passo 3: Continuar para IA (próximo capítulo)...
  // Passo 4: Escrever liquidação (próximo capítulo)...

  return "Success";
}
```

## Simulando um EVM Read via Log Trigger

Agora vamos executar a simulação CRE novamente

### 1. Executar a simulação

```bash
# A partir do diretório prediction-market
cre workflow simulate my-workflow
```

### 2. Selecionar Log Trigger

```bash
🚀 Workflow simulation ready. Please select a trigger:
1. http-trigger@1.0.0-alpha Trigger
2. evm:ChainSelector:16015286601757825753@1.0.0 LogTrigger

Enter your choice (1-2): 2
```

### 3. Inserir os detalhes da transação

```bash
🔗 EVM Trigger Configuration:
Please provide the transaction hash and event index for the EVM log event.
Enter transaction hash (0x...):
```

Cole o hash da transação que você salvou anteriormente (da chamada da função `requestSettlement`).

### 4. Inserir índice do evento

```bash
Enter event index (0-based): 0
```

Insira **0**.

### Saída Esperada

```bash
[SIMULATION] Running trigger trigger=evm:ChainSelector:16015286601757825753@1.0.0
[USER LOG] Settlement requested for Market #0
[USER LOG] Question: "Will Argentina win the 2022 World Cup?"
[USER LOG] Creator: 0x15fC6ae953E024d975e77382eEeC56A9101f9F88
[USER LOG] Already settled: false
[USER LOG] Yes Pool: 0
[USER LOG] No Pool: 0

Workflow Simulation Result:
 "Success"

[SIMULATION] Execution finished signal received
```

### Consenso nas Leituras

Mesmo operações de leitura executam em múltiplos nós da DON:
1. Cada nó lê os dados
2. Resultados são comparados
3. Consenso BFT é alcançado
4. Único resultado verificado é retornado

## Resumo

Você aprendeu:
- ✅ Como codificar chamadas de função com Viem
- ✅ Como usar `callContract` para leituras
- ✅ Como decodificar os resultados
- ✅ Leitura com verificação por consenso

## Próximos Passos

Agora vamos chamar o Gemini AI para determinar o resultado do mercado!
