# EVM Write en Prediction Market

Aprendiste cada parte de una capacidad EVMClient. 

Ahora completemos el archivo `httpCallback.ts` que iniciamos antes agregando la capacidad EVM Write para crear mercados on-chain.

### Actualizar httpCallback.ts

Actualiza `my-workflow/httpCallback.ts` con el código completo a continuación, que incluye la escritura en la blockchain:

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

## Ejecutando el Workflow Completo

### 1. Asegúrate de que tu contrato esté desplegado

Verifica que hayas actualizado el `my-workflow/config.staging.json` con la dirección de tu contrato desplegado:

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

### 2. Verifica tu archivo .env

El archivo `.env` fue creado anteriormente en la configuración del proyecto CRE. Asegúrate de que esté en el directorio `prediction-market` y contenga:

```bash
# CRE Configuration
CRE_ETH_PRIVATE_KEY=your_private_key_here
CRE_TARGET=staging-settings
GEMINI_API_KEY_VAR=your_gemini_api_key_here
```

Si necesitas actualizarlo, edita el archivo `.env` en el directorio `prediction-market`.

### 3. Simular con broadcast

Por defecto, el simulador realiza un dry run para operaciones de escritura on-chain. 

- Prepara la transacción pero no la transmite a la blockchain.

Para transmitir transacciones realmente durante la simulación, usa el flag `--broadcast`:

- Ve al directorio `prediction-market` (directorio padre de my-workflow)
- En la terminal, ejecuta:

```bash
cre workflow simulate my-workflow --broadcast
```

> **Nota**: Asegúrate de estar en el directorio `prediction-market` (directorio padre de `my-workflow`), y que el archivo `.env` esté en el directorio `prediction-market`.

### 4. Seleccionar HTTP trigger e ingresar payload

Este es el payload:

```json
{"question": "Will Argentina win the 2022 World Cup?"}
```

### Salida Esperada

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

Ejemplo

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

### 5. Verificar en el Block Explorer

Verifica la transacción en [Sepolia Etherscan](https://sepolia.etherscan.io).


### 6. Verificar que el mercado fue creado

> En una computadora con Windows, usa `Git Bash` para ejecutar los comandos de esta sección.

Puedes verificar que el mercado fue creado leyéndolo desde el contrato.

Configura la variable MARKET_ADDRESS:

```bash
export MARKET_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```

Ejemplo

```bash
export MARKET_ADDRESS=0x3c01d85D7d2b7C505b1317b1e7f418334A7777bd
```

Ejecuta la función `getMarket` para leer el Smart Contract del Prediction Market:

```bash
cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

Esto devolverá los datos del mercado para el market ID 0, mostrando el creador, timestamps, estado de liquidación, pools y pregunta.

Ejemplo del resultado:

```bash
(0x15fC6ae953E024d975e77382eEeC56A9101f9F88, 1776291024 [1.776e9], 0, false, 0, 0, 0, 0, "Will Argentina win the 2022 World Cup?")
```


## Día 2 Completado!

Has logrado exitosamente:
- Configurar un proyecto CRE
- Desplegar un smart contract
- Construir un workflow activado por HTTP
- Escribir datos en la blockchain

Mañana agregaremos:
- Log Triggers (reaccionar a eventos on-chain)
- EVM Read (leer estado del contrato)
- Integración con IA (API de Gemini)
- Flujo completo de liquidación

**Nos vemos mañana!**
