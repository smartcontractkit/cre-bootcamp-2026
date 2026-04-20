# Conceptos de EVM Write: El Patrón de Dos Pasos

La capacidad **EVM Write** permite que tu workflow CRE escriba datos en smart contracts en blockchains compatibles con EVM. 

> Este es uno de los patrones más importantes en CRE.

## Familiarízate con la capacidad

La capacidad EVM Write permite que tu workflow envíe reportes firmados criptográficamente a smart contracts. 

A diferencia de las aplicaciones web3 tradicionales que envían transacciones directamente, CRE usa un proceso seguro de dos pasos:

1. **Generar un reporte firmado** - Tus datos son codificados en ABI y envueltos en un "paquete" firmado criptográficamente
2. **Enviar el reporte** - El reporte firmado se envía a tu contrato consumidor a través del `KeystoneForwarder` de Chainlink

### El proceso de escritura en dos pasos

#### Paso 1: Generar un reporte firmado

No necesitas actualizar el código ahora, entendamos todas las partes antes.

Primero, codifica tus datos y genera un reporte firmado criptográficamente.

Mira cómo hacerlo para el mercado que obtuvimos del HTTP Trigger:

```typescript
import { encodeAbiParameters, parseAbiParameters } from "viem";
import { hexToBase64 } from "@chainlink/cre-sdk";

// Define ABI parameters (must match what your contract expects)
const PARAMS = parseAbiParameters("string question");

// Encode your data
const reportData = encodeAbiParameters(PARAMS, ["Your question here"]);

// Generate the signed report
const reportResponse = runtime
  .report({
    encodedPayload: hexToBase64(reportData),
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
  })
  .result();
```

**Parámetros del reporte:**

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `encodedPayload` | string base64 | Tus datos codificados en ABI (convertidos desde hex) |
| `encoderName` | `"evm"` | Para chains compatibles con EVM |
| `signingAlgo` | `"ecdsa"` | Algoritmo de firma |
| `hashingAlgo` | `"keccak256"` | Algoritmo de hash |

#### Paso 2: Enviar el reporte

Cómo enviar el reporte firmado al contrato consumidor:

```typescript
import { bytesToHex, TxStatus } from "@chainlink/cre-sdk";

const writeResult = evmClient
  .writeReport(runtime, {
    receiver: "0x...", // Your consumer contract address
    report: reportResponse, // The signed report from Step 1
    gasConfig: {
      gasLimit: "500000", // Gas limit for the transaction
    },
  })
  .result();

// Check the result
if (writeResult.txStatus === TxStatus.SUCCESS) {
  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
  return txHash;
}

throw new Error(`Transaction failed: ${writeResult.txStatus}`);
```

**Parámetros de WriteReport:**

- `receiver`: `string` - La dirección de tu contrato consumidor (debe implementar la interfaz `IReceiver`)
- `report`: `ReportResponse` - El reporte firmado de `runtime.report()`
- `gasConfig`: `{ gasLimit: string }` - Configuración opcional de gas

**Respuesta:**

- `txStatus`: `TxStatus` - Estado de la transacción (`SUCCESS`, `FAILURE`, etc.)
- `txHash`: `Uint8Array` - Hash de la transacción (convertir con `bytesToHex()`)

### Contratos consumidores

Para que un smart contract reciba datos de CRE, debe implementar la interfaz `IReceiver`. Esta interfaz define una única función `onReport()` que el contrato `KeystoneForwarder` de Chainlink llama para entregar datos verificados.

Aunque puedes implementar `IReceiver` manualmente, recomendamos usar `ReceiverTemplate` - un contrato abstracto que maneja el boilerplate como soporte ERC165, decodificación de metadata y verificaciones de seguridad (validación del forwarder), permitiéndote enfocarte en tu lógica de negocio en `_processReport()`.

> El contrato `MockKeystoneForwarder`, que usaremos para simulaciones, en Ethereum Sepolia se encuentra en: [https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code](https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code)


### El código básico del cliente EVM

Mira cómo configurar la red blockchain y crear el cliente EVM:

```typescript
import { cre, getNetwork } from "@chainlink/cre-sdk";

// Get network configuration
const network = getNetwork({
  chainFamily: "evm",
  chainSelectorName: "ethereum-testnet-sepolia", // or from config
  isTestnet: true,
});

// Create EVM client
const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);
```

Ahora hagámoslo en el proyecto Prediction Market!
