# Log Trigger：事件驱动的 Workflow

今天的重要新概念：**Log Trigger**。它让你的 workflow 能够自动响应链上事件。

## 熟悉该 capability

**EVM Log Trigger**在智能合约发出特定事件时触发。你可以通过调用 `EVMClient.logTrigger()` 并传入配置来创建 Log Trigger，配置中指定要监听的合约地址和事件 topic。

这很有用，因为：

- **响应式**：只在链上发生某件事时才运行 workflow
- **高效**：无需轮询或定期检查
- **精确**：可按合约地址、事件签名和 topic 过滤

### 创建 trigger

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

### 配置

`logTrigger()` 方法接受一个配置对象：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `addresses` | `string[]` | 要监控的合约地址（至少需要一个） |
| `topics` | `TopicValues[]` | 可选。按事件签名与 indexed 参数过滤 |
| `confidence` | `string` | 区块确认级别：`CONFIDENCE_LEVEL_LATEST`、`CONFIDENCE_LEVEL_SAFE`（默认）或 `CONFIDENCE_LEVEL_FINALIZED` |

### Log Trigger 与 CRON Trigger

| 模式 | Log Trigger | CRON Trigger |
|---------|-------------|--------------|
| **触发时机** | 链上发出事件 | 按计划（例如每小时） |
| **风格** | 响应式 | 主动式 |
| **适用场景** | 「当 X 发生时，做 Y」 | 「每小时检查一次 X」 |
| **示例** | Settlement requested → 结算 | 每小时 → 检查所有市场 |

## 我们的事件：SettlementRequested

回忆一下，我们的智能合约会发出该事件：

```solidity
event SettlementRequested(uint256 indexed marketId, string question);
```

我们希望 CRE：

1. **检测**该事件何时发出
2. **解码** marketId 与 question
3. **运行**我们的 settlement workflow


## 理解 EVMLog Payload

当 CRE 触发你的 callback 时，会提供：

| 属性 | 类型 | 说明 |
|----------|------|-------------|
| `topics` | `Uint8Array[]` | 事件 topics（indexed 参数） |
| `data` | `Uint8Array` | 非 indexed 的事件数据 |
| `address` | `Uint8Array` | 发出事件的合约地址 |
| `blockNumber` | `bigint` | 事件所在区块 |
| `txHash` | `Uint8Array` | 交易哈希 |

### 解码 Topics

对于 `SettlementRequested(uint256 indexed marketId, string question)`：

- `topics[0]` = 事件签名哈希
- `topics[1]` = `marketId`（indexed，因此在 topics 中）
- `data` = `question`（非 indexed）

## 创建 logCallback.ts

新建文件 `my-workflow/logCallback.ts`，写入事件解码逻辑：

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

## 更新 main.ts

更新 `my-workflow/main.ts`，注册 Log Trigger：

```typescript
// prediction-market/my-workflow/main.ts

import { cre, Runner, getNetwork } from "@chainlink/cre-sdk";
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
        addresses: [config.evms[0].marketAddress],
        topics: [{ values: [eventHash] }],
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

## 模拟 Log Trigger

### 1. 先在合约上请求 settlement

```bash
cast send $MARKET_ADDRESS \
  "requestSettlement(uint256)" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

**请保存交易哈希！**

### 2. 运行 simulation

```bash
# From the prediction-market directory
cre workflow simulate my-workflow
```

### 3. 选择 Log Trigger

```bash
🚀 Workflow simulation ready. Please select a trigger:
1. http-trigger@1.0.0-alpha Trigger
2. evm:ChainSelector:16015286601757825753@1.0.0 LogTrigger

Enter your choice (1-2): 2
```

### 4. 输入交易详情

```bash
🔗 EVM Trigger Configuration:
Please provide the transaction hash and event index for the EVM log event.
Enter transaction hash (0x...):
```

粘贴步骤 1 中的交易哈希。

### 5. 输入 event index

```bash
Enter event index (0-based): 0
```

输入**0**。

### 预期输出

```bash
[SIMULATION] Running trigger trigger=evm:ChainSelector:16015286601757825753@1.0.0
[USER LOG] Settlement requested for Market #0
[USER LOG] Question: "Will Argentina win the 2022 World Cup?"

Workflow Simulation Result:
 "Processed"

[SIMULATION] Execution finished signal received
```

## 要点回顾

- **Log Trigger**会自动响应链上事件
- 使用 `keccak256(toHex("EventName(types)"))` 计算事件哈希
- 使用 Viem 的 `decodeEventLog` 解码事件
- 测试流程：先在链上触发事件，再用 tx hash 进行 simulation

## 下一步

接下来在结算之前，我们需要从合约读取更多数据。
