# Flujo Completo: Conectando Todo

Es hora de combinarlo todo en un workflow de liquidación de mercado completo y funcional!

## El Flujo Completo

```
SettlementRequested Event
         |
         v
    Log Trigger
         |
         v
+--------------------+
| Paso 1: Decodificar|
| Datos del evento   |
+--------+-----------+
         |
         v
+--------------------+
| Paso 2: EVM Read   |
| Obtener detalles   |
+--------+-----------+
         |
         v
+--------------------+
| Paso 3: HTTP       |
| Consultar Gemini AI|
+--------+-----------+
         |
         v
+--------------------+
| Paso 4: EVM Write  |
| Enviar liquidación |
+--------+-----------+
         |
         v
    Retornar txHash
```

## logCallback.ts Completo

Actualiza `my-workflow/logCallback.ts` con el flujo completo de liquidación:

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

// Inline types
type Config = {
  geminiModel: string;
  evms: Array<{
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
};

interface Market {
  creator: `0x${string}`;
  createdAt: number;
  settledAt: number;
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
// Contract ABIs
// ===========================

/** ABI for the SettlementRequested event */
const EVENT_ABI = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string question)",
]);

/** ABI for reading market data */
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

/** ABI parameters for settlement report (outcome is uint8 for Prediction enum) */
const SETTLEMENT_PARAMS = parseAbiParameters("uint256 marketId, uint8 outcome, uint16 confidence");

// ===========================
// Log Trigger Handler
// ===========================

/**
 * Handles Log Trigger events for settling prediction markets.
 *
 * Flow:
 * 1. Decode the SettlementRequested event
 * 2. Read market details from the contract (EVM Read)
 * 3. Query Gemini AI for the outcome (HTTP)
 * 4. Write the settlement report to the contract (EVM Write)
 *
 * @param runtime - CRE runtime with config and capabilities
 * @param log - The EVM log event data
 * @returns Success message with transaction hash
 */
export function onLogTrigger(runtime: Runtime<Config>, log: EVMLog): string {
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  runtime.log("CRE Workflow: Log Trigger - Settle Market");
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // ─────────────────────────────────────────────────────────────
    // Step 1: Decode the event log
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
    // Step 2: Read market details from contract (EVM Read)
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
          to: evmConfig.marketAddress as `0x${string}`,
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
    // Step 3: Query AI (HTTP)
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 3] Querying Gemini AI...");

    const geminiResult = askGemini(runtime, question);
    
    // Extract JSON from response (AI may include prose before/after the JSON)
    const jsonMatch = geminiResult.geminiResponse.match(/\{[\s\S]*"result"[\s\S]*"confidence"[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Could not find JSON in AI response: ${geminiResult.geminiResponse}`);
    }
    const parsed = JSON.parse(jsonMatch[0]) as GeminiResult;

    // Validate the result - only YES or NO can settle a market
    if (!["YES", "NO"].includes(parsed.result)) {
      throw new Error(`Cannot settle: AI returned ${parsed.result}. Only YES or NO can settle a market.`);
    }
    if (parsed.confidence < 0 || parsed.confidence > 10000) {
      throw new Error(`Invalid confidence: ${parsed.confidence}`);
    }

    runtime.log(`[Step 3] AI Result: ${parsed.result}`);
    runtime.log(`[Step 3] AI Confidence: ${parsed.confidence / 100}%`);

    // Convert result string to Prediction enum value (0 = Yes, 1 = No)
    const outcomeValue = parsed.result === "YES" ? 0 : 1;

    // ─────────────────────────────────────────────────────────────
    // Step 4: Write settlement report to contract (EVM Write)
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 4] Generating settlement report...");

    // Encode settlement data
    const settlementData = encodeAbiParameters(SETTLEMENT_PARAMS, [
      marketId,
      outcomeValue,
      parsed.confidence,
    ]);

    // Prepend 0x01 prefix so contract routes to _settleMarket
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

## Haciendo una Predicción

Antes de solicitar la liquidación, hagamos una predicción en el mercado. 

Esto demuestra el flujo completo - predicciones con ETH, liquidación por IA, y ganadores reclamando su parte.

> En una computadora con Windows, usa `Git Bash` para ejecutar todos los comandos **cast**.

La Predicción es un tipo enum en Solidity
- 0 = Yes
- 1 = No

Predigamos:
- YES (0)
- En el market id #0
- Pagando 0.01 ETH

Envía este comando para ejecutar la función `predict` en PredictionMarket.sol que está desplegado en la variable $MARKET_ADDRESS:

```bash
# Predict YES on market #0 with 0.01 ETH
cast send $MARKET_ADDRESS \
  "predict(uint256,uint8)" 0 0 \
  --value 0.01ether \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

Luego podemos ver los detalles del mercado de nuevo, incluyendo la predicción:

```bash
cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

E incluso obtener solo nuestra predicción!

- Establece la dirección de tu wallet en la variable `PREDICTOR`:

```bash
export PREDICTOR=0xYOUR_WALLET_ADDRESS
```

- Y luego ejecutar:

```bash
cast call $MARKET_ADDRESS \
  "getPrediction(uint256,address) returns ((uint256,uint8,bool))" \
  0 $PREDICTOR \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

- Puedes tener múltiples participantes prediciendo - algunos YES, algunos NO. 
- Después de que CRE liquide el mercado, los ganadores pueden llamar la functión `claim()` para recibir su parte del pool total!

---

## Liquidar el Mercado

Ahora ejecutemos el flujo completo de liquidación usando el Log Trigger.

### Paso 1: Solicitar Liquidación

Primero, activa el evento `SettlementRequested` desde el smart contract:

```bash
cast send $MARKET_ADDRESS \
  "requestSettlement(uint256)" 0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

**Guarda el hash de la transacción!** Lo necesitarás para el siguiente paso.

### Paso 2: Ejecutar la Simulación

```bash
cre workflow simulate my-workflow --broadcast
```

### Paso 3: Seleccionar Log Trigger

```bash
🚀 Workflow simulation ready. Please select a trigger:
┃   http-trigger@1.0.0-alpha Trigger
┃ > evm:ChainSelector:16015286601757825753@1.0.0 LogTrigger
```

Selecciona: `evm:ChainSelector: ... LogTrigger` y presiona Enter

### Paso 4: Ingresar Detalles de la Transacción

```bash
🔗 EVM Trigger Configuration:
Please provide the transaction hash and event index for the EVM log event.
Enter transaction hash (0x...):
```

Pega el hash de la transacción del Paso 1.

### Paso 5: Ingresar Índice del Evento

```bash
Enter event index (0-based): 0
```

Ingresa **0**.

### Salida Esperada

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

### Paso 6: Verificar la Liquidación On-Chain

```bash
cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

Deberías ver `settled: true` y el resultado determinado por IA!

### Paso 7: Reclamar Tus Ganancias

Si predijiste el resultado ganador, reclama tu parte del pool:

```bash
cast send $MARKET_ADDRESS \
  "claim(uint256)" 0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

---

## **Felicitaciones!**

Acabas de construir y ejecutar un mercado de predicción completo impulsado por IA usando CRE!

Repasemos lo que lograste:

| Capacidad | Lo Que Construiste |
|-----------|-------------------|
| **HTTP Trigger** | Creación de mercados via solicitudes API |
| **Log Trigger** | Automatización de liquidación basada en eventos |
| **EVM Read** | Lectura del estado del mercado desde la blockchain |
| **HTTP (IA)** | Consultas a Gemini AI para resultados del mundo real |
| **EVM Write** | Escrituras verificadas on-chain con consenso del DON |

Tu workflow ahora:
- Crea mercados bajo demanda via HTTP
- Escucha solicitudes de liquidación via eventos de blockchain
- Lee datos del mercado de tu smart contract
- Consulta a la IA para determinar resultados del mundo real
- Escribe liquidaciones verificadas de vuelta on-chain
- Permite a los ganadores reclamar sus recompensas

---

## Siguientes Pasos

Ve al capítulo final para un recorrido completo, de extremo a extremo, y lo que sigue en tu viaje con CRE!
