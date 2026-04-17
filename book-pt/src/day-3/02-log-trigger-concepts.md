# Log Trigger: Fluxos Orientados a Eventos

O grande conceito novo de hoje: **Log Triggers**. Eles permitem que seu workflow reaja a eventos on-chain automaticamente.

## Familiarize-se com a capability

O **EVM Log Trigger** dispara quando um smart contract emite um evento específico. Você cria um Log Trigger chamando `EVMClient.logTrigger()` com uma configuração que especifica quais endereços de contrato e tópicos de evento monitorar.

Isso é poderoso porque:

- **Reativo**: Seu workflow executa apenas quando algo acontece on-chain
- **Eficiente**: Não precisa fazer polling ou verificar periodicamente
- **Preciso**: Filtra por endereço do contrato, assinatura do evento e tópicos

### Entendendo o código do Log trigger

```typescript
import { cre, getNetwork } from "@chainlink/cre-sdk";
import { keccak256, toHex } from "viem";

// Obter a rede
const network = getNetwork({
  chainFamily: "evm",
  chainSelectorName: "ethereum-testnet-sepolia",
  isTestnet: true,
});

const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

// Calcular o hash da assinatura do evento
const eventHash = keccak256(toHex("Transfer(address,address,uint256)"));

// Criar o trigger
const trigger = evmClient.logTrigger({
  addresses: ["0x..."], // Endereços de contrato para monitorar
  topics: [{ values: [eventHash] }], // Assinaturas de evento para filtrar
  confidence: "CONFIDENCE_LEVEL_FINALIZED", // Aguardar finalidade
});
```

### Configuração

O método `logTrigger()` aceita um objeto de configuração:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `addresses` | `string[]` | Endereços de contrato para monitorar (pelo menos um obrigatório) |
| `topics` | `TopicValues[]` | Opcional. Filtrar por assinatura de evento e parâmetros indexados |
| `confidence` | `string` | Nível de confirmação de bloco: `CONFIDENCE_LEVEL_LATEST`, `CONFIDENCE_LEVEL_SAFE` (padrão), ou `CONFIDENCE_LEVEL_FINALIZED` |

### Log Trigger vs CRON Trigger

| Padrão | Log Trigger | CRON Trigger |
|--------|-------------|--------------|
| **Quando dispara** | Evento on-chain emitido | Agendamento (a cada hora, etc.) |
| **Estilo** | Reativo | Proativo |
| **Caso de uso** | "Quando X acontecer, faça Y" | "Verificar a cada hora se X" |
| **Exemplo** | Liquidação solicitada → Liquidar | A cada hora → Verificar todos os mercados |

## Entendendo o Payload EVMLog

Quando o CRE aciona seu callback, ele fornece:

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `topics` | `Uint8Array[]` | Tópicos do evento (parâmetros indexados) |
| `data` | `Uint8Array` | Dados não indexados do evento |
| `address` | `Uint8Array` | Endereço do contrato que emitiu |
| `blockNumber` | `bigint` | Bloco onde o evento ocorreu |
| `txHash` | `Uint8Array` | Hash da transação |
