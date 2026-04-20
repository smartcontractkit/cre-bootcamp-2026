# EVM Read: Leyendo el Estado del Contrato

Antes de poder liquidar un mercado con IA, necesitamos leer sus detalles de la blockchain. Aprendamos la capacidad **EVM Read**.

La capacidad **EVM Read** (`callContract`) te permite llamar funciones `view` y `pure` en smart contracts. 

Todas las lecturas se realizan a través de múltiples nodos del DON y se verifican mediante consenso, protegiendo contra endpoints RPC defectuosos, datos obsoletos o respuestas maliciosas.

## El patrón de lectura

```typescript
import { cre, getNetwork, encodeCallMsg, LAST_FINALIZED_BLOCK_NUMBER, bytesToHex } from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult, zeroAddress } from "viem";

// 1. Get network and create client
const network = getNetwork({
  chainFamily: "evm",
  chainSelectorName: "ethereum-testnet-sepolia",
  isTestnet: true,
});
const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

// 2. Encode the function call
const callData = encodeFunctionData({
  abi: contractAbi,
  functionName: "myFunction",
  args: [arg1, arg2],
});

// 3. Call the contract
const result = evmClient
  .callContract(runtime, {
    call: encodeCallMsg({
      from: zeroAddress,
      to: contractAddress,
      data: callData,
    }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  })
  .result();

// 4. Decode the result
const decodedValue = decodeFunctionResult({
  abi: contractAbi,
  functionName: "myFunction",
  data: bytesToHex(result.data),
});
```

## Opciones de número de bloque

| Valor | Descripción |
|-------|-------------|
| `LAST_FINALIZED_BLOCK_NUMBER` | Último bloque finalizado (más seguro, recomendado) |
| `LATEST_BLOCK_NUMBER` | Bloque más reciente |
| `blockNumber(n)` | Número de bloque específico para consultas históricas |

## ¿Por qué `zeroAddress` para `from`?

Para operaciones de lectura, la dirección `from` no importa porque no se envía ninguna transacción, no se consume gas y no se modifica el estado.

## Una nota sobre Go bindings

El **Go SDK** requiere que generes bindings con tipos seguros desde el ABI de tu contrato antes de interactuar con el:

```bash
cre generate-bindings evm
```

Este paso único crea métodos helper para lecturas, escrituras y decodificación de eventos - sin necesidad de definiciones ABI manuales.
