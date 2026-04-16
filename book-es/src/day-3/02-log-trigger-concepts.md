# Log Trigger: Flujos de Trabajo Basados en Eventos

El gran concepto nuevo de hoy: **Log Triggers**. Estos permiten que tu flujo de trabajo reaccióne a eventos on-chain automaticamente.

## Familiarizate con la capacidad

El **EVM Log Trigger** se activa cuando un smart contract emite un evento específico. Creas un Log Trigger llamando a `EVMClient.logTrigger()` con una configuración que especifica que direcciones de contrato y topics de eventos escuchar.

Esto es poderoso porque:

- **Reactivo**: Tu flujo de trabajo se ejecuta solo cuando algo sucede on-chain
- **Eficiente**: No necesitas hacer polling o verificar periodicamente
- **Preciso**: Filtra por dirección de contrato, firma del evento y topics

### Entendiendo el código del Log trigger

```typescript
import { cre, getNetwork } from "@chainlink/cre-sdk";
import { keccak256, toHex } from "viem";

// Get the network
const network = getNetwork({
  chainFamily: "evm",
  chainSelectorName: "ethereum-testnet-sepolia",
  isTestnet: true,
});

const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

// Compute the event signature hash
const eventHash = keccak256(toHex("Transfer(address,address,uint256)"));

// Create the trigger
const trigger = evmClient.logTrigger({
  addresses: ["0x..."], // Contract addresses to watch
  topics: [{ values: [eventHash] }], // Event signatures to filter
  confidence: "CONFIDENCE_LEVEL_FINALIZED", // Wait for finality
});
```

### Configuración

El método `logTrigger()` acepta un objeto de configuración:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `addresses` | `string[]` | Direcciones de contratos a monitorear (al menos una requerida) |
| `topics` | `TopicValues[]` | Opcional. Filtrar por firma del evento y parámetros indexados |
| `confidence` | `string` | Nivel de confirmación de bloque: `CONFIDENCE_LEVEL_LATEST`, `CONFIDENCE_LEVEL_SAFE` (predeterminado), o `CONFIDENCE_LEVEL_FINALIZED` |

### Log Trigger vs CRON Trigger

| Patrón | Log Trigger | CRON Trigger |
|--------|-------------|--------------|
| **Cuando se activa** | Evento on-chain emitido | Horario (cada hora, etc.) |
| **Estilo** | Reactivo | Proactivo |
| **Caso de uso** | "Cuando suceda X, hacer Y" | "Verificar cada hora si hay X" |
| **Ejemplo** | Liquidación solicitada -> Liquidar | Cada hora -> Verificar todos los mercados |

## Entendiendo el Payload EVMLog

Cuando CRE activa tu callback, proporciona:

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `topics` | `Uint8Array[]` | Topics del evento (parámetros indexados) |
| `data` | `Uint8Array` | Datos no indexados del evento |
| `address` | `Uint8Array` | Dirección del contrato que emitió |
| `blockNumber` | `bigint` | Bloque donde ocurrio el evento |
| `txHash` | `Uint8Array` | Hash de la transacción |
