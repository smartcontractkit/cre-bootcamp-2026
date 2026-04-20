# Log Trigger no Prediction Market

Quando a liquidação é solicitada em um Mercado, Log trigger é utilizado para iniciar um workflow e obter a resposta do Gemini AI.

## O Evento: SettlementRequested

Lembre-se que nosso smart contract emite este evento:

```solidity
event SettlementRequested(uint256 indexed marketId, string question);
```

Queremos que o CRE:
1. **Detecte** quando este evento é emitido
2. **Decodifique** o marketId e a pergunta
3. **Execute** nosso workflow de liquidação

## O Payload EVMLog para SettlementRequested 

Estas são as informações no Payload do evento `SettlementRequested(uint256 indexed marketId, string question)`:
- `topics[0]` = Hash da assinatura do evento
- `topics[1]` = `marketId` (indexado, então está nos topics)
- `data` = `question` (não indexado)

## Criando logCallback.ts

Crie um novo arquivo `my-workflow/logCallback.ts` com a lógica de decodificação do evento:

```typescript
// prediction-market/my-workflow/logCallback.ts

import {
  type Runtime,
  type EVMLog,
  bytesToHex,
} from "@chainlink/cre-sdk";
import { decodeEventLog, parseAbi } from "viem";

type Config = {
  geminiModel: string;
  evms: Array<{
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
};

const EVENT_ABI = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string question)",
]);

export function onLogTrigger(runtime: Runtime<Config>, log: EVMLog): string {
  // Convert topics to hex format for viem
  const topics = log.topics.map((t: Uint8Array) => bytesToHex(t)) as [
    `0x${string}`,
    ...`0x${string}`[]
  ];
  const data = bytesToHex(log.data);

  // Decode the event
  const decodedLog = decodeEventLog({ abi: EVENT_ABI, data, topics });

  // Extract the values
  const marketId = decodedLog.args.marketId as bigint;
  const question = decodedLog.args.question as string;

  runtime.log(`Settlement requested for Market #${marketId}`);
  runtime.log(`Question: "${question}"`);

  // Continue with EVM Read, AI, EVM Write (next chapters)...
  return "Processed";
}
```

## Atualizando main.ts

Atualize `my-workflow/main.ts` para usar o Log Trigger:

```typescript
// prediction-market/my-workflow/main.ts

import { cre, Runner, getNetwork, hexToBase64 } from "@chainlink/cre-sdk";
import { keccak256, toHex } from "viem";
import { onHttpTrigger } from "./httpCallback";
import { onLogTrigger } from "./logCallback";

// Config type (matches config.staging.json structure)
type Config = {
  geminiModel: string;
  evms: Array<{
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
};

const SETTLEMENT_REQUESTED_SIGNATURE = "SettlementRequested(uint256,string)";

const initWorkflow = (config: Config) => {
  // Initialize HTTP capability
  const httpCapability = new cre.capabilities.HTTPCapability();
  const httpTrigger = httpCapability.trigger({});

  // Get network for Log Trigger
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.evms[0].chainSelectorName,
    isTestnet: true,
  });  

  if (!network) {
    throw new Error(`Network not found: ${config.evms[0].chainSelectorName}`);
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);
  const eventHash = keccak256(toHex(SETTLEMENT_REQUESTED_SIGNATURE));

  
  return [
    // Day 1: HTTP Trigger - Market Creation
    cre.handler(httpTrigger, onHttpTrigger),
    
    // Day 2: Log Trigger - Event-Driven Settlement ← NEW!
    cre.handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.evms[0].marketAddress as `0x${string}`)],
        topics: [{ values: [hexToBase64(eventHash)] }],
        confidence: "CONFIDENCE_LEVEL_FINALIZED",
      }),
      onLogTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
```

## Simulando um Log Trigger

### 1. Primeiro, solicite a liquidação de um mercado no smart contract

- Interaja com o `PredictionMarket.sol`
- Chame a função `requestSettlement`, com o parâmetro `0`, que é o id da pergunta do mercado criada anteriormente.

> Em um computador Windows, use `Git Bash` para executar o comando abaixo.

Execute:

```bash
cast send $MARKET_ADDRESS \
  "requestSettlement(uint256)" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

**Salve o hash da transação!**

O resultado em nosso contrato publicado:

```bash
blockHash            0x123ec1ae9e4e5fcfec18edd3e76aa99a4628904c2380a6d578e5471928e71e78
blockNumber          10668469
contractAddress
cumulativeGasUsed    51861828
effectiveGasPrice    42409327
from                 0x12Fbc10072650d844492De4bcCd0298eaE07dB96
gasUsed              41125
logs                 [{"address":"0x3c01d85d7d2b7c505b1317b1e7f418334a7777bd","topics":["0x0355cdf68e24814c7dc62aff7f0f02eecf17779d969144accb1ad4b432f51dad","0x0000000000000000000000000000000000000000000000000000000000000000"],"data":"0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002657696c6c20417267656e74696e612077696e20746865203230323220576f726c64204375703f0000000000000000000000000000000000000000000000000000","blockHash":"0x123ec1ae9e4e5fcfec18edd3e76aa99a4628904c2380a6d578e5471928e71e78","blockNumber":"0xa2c9b5","blockTimestamp":"0x69e04324","transactionHash":"0x152352a8c56b67300423227010b2993d3e44c10d95d958796e0b5c8572c4700b","transactionIndex":"0xaf","logIndex":"0x803","removed":false}]
logsBloom            0x00000000000000000000000000000000000000400000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000020000000000000000000800000000000000000000000000000000000000004000000000000000000000000000000000000000000000002000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000
root
status               1 (success)
transactionHash      0x152352a8c56b67300423227010b2993d3e44c10d95d958796e0b5c8572c4700b
transactionIndex     175
type                 2
blobGasPrice
blobGasUsed
to                   0x3c01d85D7d2b7C505b1317b1e7f418334A7777bd
```

Neste exemplo, o hash da transação é 
[0x152352a8c56b67300423227010b2993d3e44c10d95d958796e0b5c8572c4700b](https://sepolia.etherscan.io/tx/0x152352a8c56b67300423227010b2993d3e44c10d95d958796e0b5c8572c4700b)

### 2. Executar a simulação

A partir do diretório prediction-market

```bash
cre workflow simulate my-workflow
```

### 3. Selecionar Log Trigger

Agora o workflow tem 2 triggers e você precisa escolher um deles na simulação.

```bash
🚀 Workflow simulation ready. Please select a trigger:
┃   http-trigger@1.0.0-alpha Trigger
┃ > evm:ChainSelector:16015286601757825753@1.0.0 LogTrigger
```

Selecione a segunda opção: `evm:ChainSelector: ... LogTrigger` e pressione Enter


### 4. Inserir os detalhes da transação

Continue com o hash da transação para o evento EVM log:

```bash
🔗 EVM Trigger Configuration:
┃ Transaction hash for the EVM log event
┃ > 0x...
```

Cole o hash da transação do Passo 1.

### 5. Inserir índice do evento

Insira o índice do evento (baseado em 0).

Verificando os Logs da transação no block explorer, você pode ver que o evento `SettlementRequested` é o primeiro, que é o índice `0`.

Confira o exemplo:
[SettlementRequested Log](https://sepolia.etherscan.io/tx/0x152352a8c56b67300423227010b2993d3e44c10d95d958796e0b5c8572c4700b#eventlog)

```bash
┃ Event Index
┃ Log event index (0-based)
┃ > 0
```

Digite **0** e pressione Enter.

### Saída Esperada

```bash
[SIMULATION] Running trigger trigger=evm:ChainSelector:16015286601757825753@1.0.0
[USER LOG] Settlement requested for Market #0
[USER LOG] Question: "Will Argentina win the 2022 World Cup?"

Workflow Simulation Result:
 "Processed"

[SIMULATION] Execution finished signal received
```

## Principais Conclusões

- **Log Triggers** reagem a eventos on-chain automaticamente
- Use `keccak256(toHex("EventName(types)"))` para calcular o hash do evento
- Decodifique eventos usando `decodeEventLog` do Viem
- Teste primeiro acionando o evento on-chain, depois simulando com o hash da tx

## Próximos Passos

Agora vamos ler mais dados do contrato antes de executar a liquidação do mercado solicitado.
