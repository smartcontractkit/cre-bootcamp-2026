# Conceitos de EVM Write: O Padrão de Dois Passos

A capability **EVM Write** permite que seu workflow CRE escreva dados em smart contracts em blockchains compatíveis com EVM. 

> Este é um dos padrões mais importantes no CRE.

## Familiarize-se com a capability

A capability EVM Write permite que seu workflow submeta relatórios criptograficamente assinados para smart contracts. 

Diferente de aplicações web3 tradicionais que enviam transações diretamente, o CRE usa um processo seguro de dois passos:

1. **Gerar um relatório assinado** - Seus dados são codificados em ABI e empacotados em um "pacote" criptograficamente assinado
2. **Submeter o relatório** - O relatório assinado é submetido ao seu smart contract consumidor via o `KeystoneForwarder` da Chainlink

### O processo de escrita em dois passos

#### Passo 1: Gerar um relatório assinado

Você não precisa atualizar o código agora, vamos entender todas as partes antes

Primeiro, codifique seus dados e gere um relatório criptograficamente assinado.

Veja como fazer isso para o mercado que obtivemos do HTTP Trigger:

```typescript
import { encodeAbiParameters, parseAbiParameters } from "viem";
import { hexToBase64 } from "@chainlink/cre-sdk";

// Definir parâmetros ABI (devem corresponder ao que seu smart contract espera)
const PARAMS = parseAbiParameters("string question");

// Codificar seus dados
const reportData = encodeAbiParameters(PARAMS, ["Your question here"]);

// Gerar o relatório assinado
const reportResponse = runtime
  .report({
    encodedPayload: hexToBase64(reportData),
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
  })
  .result();
```

**Parâmetros do relatório:**

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `encodedPayload` | string base64 | Seus dados codificados em ABI (convertidos de hex) |
| `encoderName` | `"evm"` | Para chains compatíveis com EVM |
| `signingAlgo` | `"ecdsa"` | Algoritmo de assinatura |
| `hashingAlgo` | `"keccak256"` | Algoritmo de hash |

#### Passo 2: Submeter o relatório

Como submeter o relatório assinado ao contrato consumidor:

```typescript
import { bytesToHex, TxStatus } from "@chainlink/cre-sdk";

const writeResult = evmClient
  .writeReport(runtime, {
    receiver: "0x...", // Endereço do seu smart contract consumidor
    report: reportResponse, // O relatório assinado do Passo 1
    gasConfig: {
      gasLimit: "500000", // Limite de gas para a transação
    },
  })
  .result();

// Verificar o resultado
if (writeResult.txStatus === TxStatus.SUCCESS) {
  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
  return txHash;
}

throw new Error(`Transaction failed: ${writeResult.txStatus}`);
```

**Parâmetros do WriteReport:**

- `receiver`: `string` - O endereço do seu smart contract consumidor (deve implementar a interface `IReceiver`)
- `report`: `ReportResponse` - O relatório assinado de `runtime.report()`
- `gasConfig`: `{ gasLimit: string }` - Configuração opcional de gas

**Resposta:**

- `txStatus`: `TxStatus` - Status da transação (`SUCCESS`, `FAILURE`, etc.)
- `txHash`: `Uint8Array` - Hash da transação (converter com `bytesToHex()`)

### Contratos consumidores

Para que um smart contract receba dados do CRE, ele deve implementar a interface `IReceiver`. Esta interface define uma única função `onReport()` que o contrato `KeystoneForwarder` da Chainlink chama para entregar dados verificados.

Embora você possa implementar `IReceiver` manualmente, recomendamos usar `ReceiverTemplate` - um contrato abstrato que lida com código padrão como suporte ERC165, decodificação de metadados e verificações de segurança (validação do forwarder), permitindo que você foque na sua lógica de negócios em `_processReport()`.

> O contrato `MockKeystoneForwarder`, que usaremos para simulações, na Ethereum Sepolia está localizado em: [https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code](https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code)


### O código básico do cliente EVM

Veja como configurar a rede blockchain e criar o cliente EVM:

```typescript
import { cre, getNetwork } from "@chainlink/cre-sdk";

// Obter configuração da rede
const network = getNetwork({
  chainFamily: "evm",
  chainSelectorName: "ethereum-testnet-sepolia", // ou da config
  isTestnet: true,
});

// Criar cliente EVM
const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);
```

Agora vamos fazer isso no projeto Prediction Market!
