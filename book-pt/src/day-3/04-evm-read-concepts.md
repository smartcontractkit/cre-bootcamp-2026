# EVM Read: Lendo o Estado do Contrato

Antes de podermos liquidar um mercado com IA, precisamos ler seus detalhes da blockchain. Vamos aprender a capability **EVM Read**.

A capability **EVM Read** (`callContract`) permite que você chame funções `view` e `pure` em smart contracts. 

Todas as leituras acontecem em múltiplos nós da DON e são verificadas via consenso, protegendo contra endpoints RPC defeituosos, dados desatualizados ou respostas maliciosas.

## O padrão de leitura

```typescript
import { cre, getNetwork, encodeCallMsg, LAST_FINALIZED_BLOCK_NUMBER, bytesToHex } from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult, zeroAddress } from "viem";

// 1. Obter rede e criar cliente
const network = getNetwork({
  chainFamily: "evm",
  chainSelectorName: "ethereum-testnet-sepolia",
  isTestnet: true,
});
const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

// 2. Codificar a chamada da função
const callData = encodeFunctionData({
  abi: contractAbi,
  functionName: "myFunction",
  args: [arg1, arg2],
});

// 3. Chamar o contrato
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

// 4. Decodificar o resultado
const decodedValue = decodeFunctionResult({
  abi: contractAbi,
  functionName: "myFunction",
  data: bytesToHex(result.data),
});
```

## Opções de número de bloco

| Valor | Descrição |
|-------|-----------|
| `LAST_FINALIZED_BLOCK_NUMBER` | Último bloco finalizado (mais seguro, recomendado) |
| `LATEST_BLOCK_NUMBER` | Bloco mais recente |
| `blockNumber(n)` | Número de bloco específico para consultas históricas |

## Por que `zeroAddress` para `from`?

Para operações de leitura, o endereço `from` não importa porque nenhuma transação é enviada, nenhum gas é consumido e nenhum estado é modificado.

## Uma nota sobre bindings Go

O **Go SDK** requer que você gere bindings type-safe a partir da ABI do seu contrato antes de interagir com ele:

```bash
cre generate-bindings evm
```

Este passo único cria métodos auxiliares para leituras, escritas e decodificação de eventos - sem necessidade de definições manuais de ABI.
