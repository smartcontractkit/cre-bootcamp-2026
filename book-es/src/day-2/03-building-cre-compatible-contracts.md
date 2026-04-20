# Construyendo Contratos Compatibles con CRE

Para que un smart contract reciba datos de CRE, debe implementar la interfaz `IReceiver`. Esta interfaz define una única función `onReport()` que el contrato `KeystoneForwarder` de Chainlink llama para entregar datos verificados.

Echa un vistazo a la interfaz `IReceiver`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title IReceiver - receives keystone reports
/// @notice Implementations must support the IReceiver interface through ERC165.
interface IReceiver is IERC165 {
  /// @notice Handles incoming keystone reports.
  /// @dev If this function call reverts, it can be retried with a higher gas
  /// limit. The receiver is responsible for discarding stale reports.
  /// @param metadata Report's metadata.
  /// @param report Workflow report.
  function onReport(bytes calldata metadata, bytes calldata report) external;
}
```

Aunque puedes implementar `IReceiver` manualmente, recomendamos usar `ReceiverTemplate` - un contrato abstracto que maneja el boilerplate como soporte ERC165, decodificación de metadata y verificaciones de seguridad (validación del forwarder), permitiéndote enfocarte en tu lógica de negocio en `_processReport()`.

Para simulaciones en la red Ethereum Sepolia, usaremos un smart contract mock, llamado `MockKeystoneForwarder`.

> El contrato `MockKeystoneForwarder` en Ethereum Sepolia se encuentra en: [https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code](https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code)

Así es como CRE entrega datos a tu contrato:

1. **CRE no llama a tu contrato directamente** - envía un reporte firmado al contrato `KeystoneForwarder` de Chainlink
2. **El forwarder valida las firmas** - asegurando que el reporte proviene de un DON confiable
3. **El forwarder llama a `onReport()`** - entregando los datos verificados a tu contrato
4. **Tu decodificas y procesas** - extraes los datos de los bytes del reporte

### El patrón de dos pasos

Este es el patrón de dos pasos, que asegura la verificación criptográfica de todos los datos antes de que lleguen a tu contrato:

> workflow -> forwarder -> tu contrato


