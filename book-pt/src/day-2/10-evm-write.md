# EVM Write no Prediction Market

Você aprendeu cada parte de uma capability EVMClient. 

Agora vamos completar o arquivo `httpCallback.ts` que começamos antes, adicionando a capability EVM Write para criar mercados on-chain.

### Atualizar httpCallback.ts

Atualize `my-workflow/httpCallback.ts` com o código completo abaixo, que inclui a escrita na blockchain:

```typescript
// prediction-market/my-workflow/httpCallback.ts

import {
  cre,
  type Runtime,
  type HTTPPayload,
  getNetwork,
  bytesToHex,
  hexToBase64,
  TxStatus,
  decodeJson,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters } from "viem";

// Inline types
interface CreateMarketPayload {
  question: string;
}

type Config = {
    geminiModel: string;
    evms: Array<{
        marketAddress: string;
        chainSelectorName: string;
        gasLimit: string;
    }>;
};

// ABI parameters for createMarket function
const CREATE_MARKET_PARAMS = parseAbiParameters("string question");

export function onHttpTrigger(runtime: Runtime<Config>, payload: HTTPPayload): string {
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  runtime.log("CRE Workflow: HTTP Trigger - Create Market");
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // ─────────────────────────────────────────────────────────────
    // Step 1: Parse and validate the incoming payload
    // ─────────────────────────────────────────────────────────────
    if (!payload.input || payload.input.length === 0) {
      runtime.log("[ERROR] Empty request payload");
      return "Error: Empty request";
    }

    const inputData = decodeJson(payload.input) as CreateMarketPayload;
    runtime.log(`[Step 1] Received market question: "${inputData.question}"`);

    if (!inputData.question || inputData.question.trim().length === 0) {
      runtime.log("[ERROR] Question is required");
      return "Error: Question is required";
    }

    // ─────────────────────────────────────────────────────────────
    // Step 2: Get network and create EVM client
    // ─────────────────────────────────────────────────────────────
    const evmConfig = runtime.config.evms[0];

    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName: evmConfig.chainSelectorName,
      isTestnet: true,
    });

    if (!network) {
      throw new Error(`Unknown chain: ${evmConfig.chainSelectorName}`);
    }

    runtime.log(`[Step 2] Target chain: ${evmConfig.chainSelectorName}`);
    runtime.log(`[Step 2] Contract address: ${evmConfig.marketAddress}`);

    const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

    // ─────────────────────────────────────────────────────────────
    // Step 3: Encode the market data for the smart contract
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 3] Encoding market data...");

    const reportData = encodeAbiParameters(CREATE_MARKET_PARAMS, [inputData.question]);

    // ─────────────────────────────────────────────────────────────
    // Step 4: Generate a signed CRE report
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 4] Generating CRE report...");

    const reportResponse = runtime
      .report({
        encodedPayload: hexToBase64(reportData),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      })
      .result();

    // ─────────────────────────────────────────────────────────────
    // Step 5: Write the report to the smart contract
    // ─────────────────────────────────────────────────────────────
    runtime.log(`[Step 5] Writing to contract: ${evmConfig.marketAddress}`);

    const writeResult = evmClient
      .writeReport(runtime, {
        receiver: evmConfig.marketAddress,
        report: reportResponse,
        gasConfig: {
          gasLimit: evmConfig.gasLimit,
        },
      })
      .result();

    // ─────────────────────────────────────────────────────────────
    // Step 6: Check result and return transaction hash
    // ─────────────────────────────────────────────────────────────
    if (writeResult.txStatus === TxStatus.SUCCESS) {
      const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
      runtime.log(`[Step 6] ✓ Transaction successful: ${txHash}`);
      runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return txHash;
    }

    throw new Error(`Transaction failed with status: ${writeResult.txStatus}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    runtime.log(`[ERROR] ${msg}`);
    runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw err;
  }
}
```

## Executando o Workflow Completo

### 1. Certifique-se de que seu smart contract está publicado

Verifique se você atualizou o `my-workflow/config.staging.json` com o endereço do seu smart contract publicado:

```json
{
  "geminiModel": "gemini-2.5-flash",
  "evms": [
    {
      "marketAddress": "0xYOUR_CONTRACT_ADDRESS_HERE",
      "chainSelectorName": "ethereum-testnet-sepolia",
      "gasLimit": "500000"
    }
  ]
}
```

### 2. Verifique seu arquivo .env

O arquivo `.env` foi criado anteriormente na configuração do projeto CRE. Certifique-se de que está no diretório `prediction-market` e contém:

```bash
# CRE Configuration
CRE_ETH_PRIVATE_KEY=your_private_key_here
CRE_TARGET=staging-settings
GEMINI_API_KEY_VAR=your_gemini_api_key_here
```

Se precisar atualizá-lo, edite o arquivo `.env` no diretório `prediction-market`.

### 3. Simular com broadcast

Por padrão, o simulador realiza um dry run para operações de escrita on-chain. 

- Ele prepara a transação mas não a transmite para a blockchain.

Para realmente transmitir transações durante a simulação, use a flag `--broadcast`:

- Vá para o diretório `prediction-market` (pai de my-workflow)
- No terminal, execute:

```bash
cre workflow simulate my-workflow --broadcast
```

> **Nota**: Certifique-se de estar no diretório `prediction-market` (pai de `my-workflow`), e o arquivo `.env` está no diretório `prediction-market`.

### 4. Selecionar HTTP trigger e inserir payload

Este é o payload:

```json
{"question": "Will Argentina win the 2022 World Cup?"}
```

### Saída Esperada

```
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] CRE Workflow: HTTP Trigger - Create Market
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] [Step 1] Received market question: "Will Argentina win the 2022 World Cup?"
[USER LOG] [Step 2] Target chain: ethereum-testnet-sepolia
[USER LOG] [Step 2] Contract address: 0x...
[USER LOG] [Step 3] Encoding market data...
[USER LOG] [Step 4] Generating CRE report...
[USER LOG] [Step 5] Writing to contract: 0x...
[USER LOG] [Step 6] ✓ Transaction successful: 0xabc123...

Workflow Simulation Result:
 "0xabc123..."
```

Exemplo

```
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] CRE Workflow: HTTP Trigger - Create Market
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] [Step 1] Received market question: "Will Argentina win the 2022 World Cup?"
[USER LOG] [Step 2] Target chain: ethereum-testnet-sepolia
[USER LOG] [Step 2] Contract address: 0x3c01d85D7d2b7C505b1317b1e7f418334A7777bd
[USER LOG] [Step 3] Encoding market data...
[USER LOG] [Step 4] Generating CRE report...
[USER LOG] [Step 5] Writing to contract: 0x3c01d85D7d2b7C505b1317b1e7f418334A7777bd
[USER LOG] [Step 6] ✓ Transaction successful: 0x16abcb86a1d67ce2ecc2b8c42db8d9717aed82ecedf9459ebe51d2c5a41d29b2

Workflow Simulation Result:
 "0x16abcb86a1d67ce2ecc2b8c42db8d9717aed82ecedf9459ebe51d2c5a41d29b2"
```

### 5. Verificar no Block Explorer

Verifique a transação no [Sepolia Etherscan](https://sepolia.etherscan.io).


### 6. Verificar se o mercado foi criado

> Em um computador Windows, use `Git Bash` para executar os comandos desta seção.

Você pode verificar se o mercado foi criado lendo-o do contrato.

Configure a variável MARKET_ADDRESS:

```bash
export MARKET_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```

Exemplo

```bash
export MARKET_ADDRESS=0x3c01d85D7d2b7C505b1317b1e7f418334A7777bd
```

Execute a função `getMarket` para ler o Smart Contract Prediction Market:

```bash
cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

Isso retornará os dados do mercado para o ID 0, mostrando o criador, timestamps, status de liquidação, pools e pergunta.

Exemplo de resultado:

```bash
(0x15fC6ae953E024d975e77382eEeC56A9101f9F88, 1776291024 [1.776e9], 0, false, 0, 0, 0, 0, "Will Argentina win the 2022 World Cup?")
```


## 🎉 Dia 2 Completo!

Você completou com sucesso:
- ✅ Configurou um projeto CRE
- ✅ Implantou um smart contract
- ✅ Construiu um workflow acionado por HTTP
- ✅ Escreveu dados na blockchain

Amanhã adicionaremos:
- Log Triggers (reagir a eventos on-chain)
- EVM Read (ler estado do contrato)
- Integração com IA (API do Gemini)
- Fluxo completo de liquidação

**Até amanhã!**
