# EVM Read en Prediction Market

## Leyendo los Datos del Mercado

Para leer los datos del mercado, nuestro contrato tiene una función `getMarket`:

```solidity
function getMarket(uint256 marketId) external view returns (Market memory);
```

Llamemosla desde CRE.

### Paso 1: Definir el ABI

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
          { name: "outcome", type: "uint8" },  // Prediction enum
          { name: "totalYesPool", type: "uint256" },
          { name: "totalNoPool", type: "uint256" },
          { name: "question", type: "string" },
        ],
      },
    ],
  },
] as const;
```

### Paso 2: Actualizar el archivo `logCallback.ts`

Ahora actualicemos `my-workflow/logCallback.ts` para agregar funcionalidad de EVM Read:

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
  // Step 1: Decode the event
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

  // Step 2: Read market details (EVM Read)
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

  // Step 3: Continue to AI (next chapter)...
  // Step 4: Write settlement (next chapter)...

  return "Success";
}
```

## Simulando un EVM Read via Log Trigger

Ahora ejecutemos la simulación CRE una vez más

### 1. Ejecutar la simulación

```bash
# Desde el directorio prediction-market
cre workflow simulate my-workflow
```

### 2. Seleccionar Log Trigger

```bash
🚀 Workflow simulation ready. Please select a trigger:
1. http-trigger@1.0.0-alpha Trigger
2. evm:ChainSelector:16015286601757825753@1.0.0 LogTrigger

Enter your choice (1-2): 2
```

### 3. Ingresar los detalles de la transacción

```bash
🔗 EVM Trigger Configuration:
Please provide the transaction hash and event index for the EVM log event.
Enter transaction hash (0x...):
```

Pega el hash de la transacción que guardaste previamente (de la llamada a la función `requestSettlement`).

### 4. Ingresar el indice del evento

```bash
Enter event index (0-based): 0
```

Ingresa **0**.

### Salida Esperada

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

### Consenso en las Lecturas

Incluso las operaciones de lectura se ejecutan a través de multiples nodos del DON:
1. Cada nodo lee los datos
2. Los resultados se comparan
3. Se alcanza consenso BFT
4. Se devuelve un unico resultado verificado

## Resumen

Has aprendido:
- Cómo codificar llamadas a funciones con Viem
- Cómo usar `callContract` para lecturas
- Cómo decodificar los resultados
- Lectura con verificación por consenso

## Siguientes Pasos

Ahora llamemos a Gemini AI para determinar el resultado del mercado!
