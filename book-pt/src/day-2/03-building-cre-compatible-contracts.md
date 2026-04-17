# Construindo Contratos Compatíveis com CRE

Para que um smart contract receba dados do CRE, ele deve implementar a interface `IReceiver`. Esta interface define uma única função `onReport()` que o contrato `KeystoneForwarder` da Chainlink chama para entregar dados verificados.

Veja a interface `IReceiver`:

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

Embora você possa implementar `IReceiver` manualmente, recomendamos usar `ReceiverTemplate` - um contrato abstrato que lida com código padrão como suporte ERC165, decodificação de metadados e verificações de segurança (validação do forwarder), permitindo que você foque na sua lógica de negócios em `_processReport()`.

Para simulações na rede Ethereum Sepolia, usaremos um smart contract mock, chamado `MockKeystoneForwarder`.

> O contrato `MockKeystoneForwarder` na Ethereum Sepolia está localizado em: [https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code](https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code)

Veja como o CRE entrega dados ao seu contrato:

1. **O CRE não chama seu contrato diretamente** - ele submete um relatório assinado a um contrato `KeystoneForwarder` da Chainlink
2. **O forwarder valida assinaturas** - garantindo que o relatório veio de uma DON confiável
3. **O forwarder chama `onReport()`** - entregando os dados verificados ao seu contrato
4. **Você decodifica e processa** - extrai os dados dos bytes do relatório

### O padrão de dois passos

Este é o padrão de dois passos, que garante verificação criptográfica de todos os dados antes de chegarem ao seu contrato:

> workflow → forwarder → seu contrato


