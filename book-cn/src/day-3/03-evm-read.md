# EVM Read：读取合约状态

在用 AI 结算市场之前，我们需要从区块链读取市场详情。下面学习**EVM Read** capability。

## 熟悉该 capability

**EVM Read** capability（`callContract`）允许你调用智能合约上的 `view` 与 `pure` 函数。所有读取会在多个 DON 节点上执行，并通过共识校验，从而降低错误 RPC、陈旧数据或恶意响应的风险。

### 读取模式

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

### 区块号选项

| 值 | 说明 |
|-------|-------------|
| `LAST_FINALIZED_BLOCK_NUMBER` | 最新 finalized 区块（最安全，推荐） |
| `LATEST_BLOCK_NUMBER` | 最新区块 |
| `blockNumber(n)` | 指定区块号，用于历史查询 |

### 为什么 `from` 使用 `zeroAddress`？

对于读取操作，`from` 地址并不重要：不会发送交易、不消耗 gas、也不修改状态。

### 关于 Go bindings 的说明

**Go SDK**要求你先从合约 ABI 生成类型安全的 bindings，再与之交互：

```bash
cre generate-bindings evm
```

这是一次性步骤，会创建用于 read、write 与事件解码的辅助方法，无需手写 ABI 定义。

## 读取市场数据

我们的合约有一个 `getMarket` 函数：

```solidity
function getMarket(uint256 marketId) external view returns (Market memory);
```

下面从 CRE 调用它。

### 步骤 1：定义 ABI

```typescript
const GET_MARKET_ABI = [
  {
    name: "getMarket",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "createdAt", type: "uint48" },
          { name: "settledAt", type: "uint48" },
          { name: "settled", type: "bool" },
          { name: "confidence", type: "uint16" },
          { name: "outcome", type: "uint8" },  // Prediction enum
          { name: "totalYesPool", type: "uint256" },
          { name: "totalNoPool", type: "uint256" },
          { name: "question", type: "string" },
        ],
      },
    ],
  },
] as const;
```

### 步骤 2：更新 `logCallback.ts` 文件

现在更新 `my-workflow/logCallback.ts`，加入 EVM Read 功能：

```typescript
// prediction-market/my-workflow/logCallback.ts

import {
  cre,
  type Runtime,
  type EVMLog,
  getNetwork,
  bytesToHex,
  encodeCallMsg,
} from "@chainlink/cre-sdk";
import {
  decodeEventLog,
  parseAbi,
  encodeFunctionData,
  decodeFunctionResult,
  zeroAddress,
} from "viem";

// Inline types
type Config = {
  geminiModel: string;
  evms: Array<{
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
};

interface Market {
  creator: string;
  createdAt: bigint;
  settledAt: bigint;
  settled: boolean;
  confidence: number;
  outcome: number;
  totalYesPool: bigint;
  totalNoPool: bigint;
  question: string;
}

const EVENT_ABI = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string question)",
]);

const GET_MARKET_ABI = [
  {
    name: "getMarket",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "createdAt", type: "uint48" },
          { name: "settledAt", type: "uint48" },
          { name: "settled", type: "bool" },
          { name: "confidence", type: "uint16" },
          { name: "outcome", type: "uint8" },
          { name: "totalYesPool", type: "uint256" },
          { name: "totalNoPool", type: "uint256" },
          { name: "question", type: "string" },
        ],
      },
    ],
  },
] as const;

export function onLogTrigger(runtime: Runtime<Config>, log: EVMLog): string {
  // Step 1: Decode the event
  const topics = log.topics.map((t: Uint8Array) => bytesToHex(t)) as [
    `0x${string}`,
    ...`0x${string}`[]
  ];
  const data = bytesToHex(log.data);

  const decodedLog = decodeEventLog({ abi: EVENT_ABI, data, topics });
  const marketId = decodedLog.args.marketId as bigint;
  const question = decodedLog.args.question as string;

  runtime.log(`Settlement requested for Market #${marketId}`);
  runtime.log(`Question: "${question}"`);

  // Step 2: Read market details (EVM Read)
  const evmConfig = runtime.config.evms[0];
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Unknown chain: ${evmConfig.chainSelectorName}`);
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  const callData = encodeFunctionData({
    abi: GET_MARKET_ABI,
    functionName: "getMarket",
    args: [marketId],
  });

  const readResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: evmConfig.marketAddress,
        data: callData,
      }),
    })
    .result();

  const market = decodeFunctionResult({
    abi: GET_MARKET_ABI,
    functionName: "getMarket",
    data: bytesToHex(readResult.data),
  }) as Market;

  runtime.log(`Creator: ${market.creator}`);
  runtime.log(`Already settled: ${market.settled}`);
  runtime.log(`Yes Pool: ${market.totalYesPool}`);
  runtime.log(`No Pool: ${market.totalNoPool}`);

  if (market.settled) {
    return "Market already settled";
  }

  // Step 3: Continue to AI (next chapter)...
  // Step 4: Write settlement (next chapter)...

  return "Success";
}
```

## 通过 Log Trigger 模拟 EVM Read

现在重复上一章的流程，再次运行 CRE simulation。

### 1. 运行 simulation

```bash
# From the prediction-market directory
cre workflow simulate my-workflow
```

### 2. 选择 Log Trigger

```bash
🚀 Workflow simulation ready. Please select a trigger:
1. http-trigger@1.0.0-alpha Trigger
2. evm:ChainSelector:16015286601757825753@1.0.0 LogTrigger

Enter your choice (1-2): 2
```

### 3. 输入交易详情

```bash
🔗 EVM Trigger Configuration:
Please provide the transaction hash and event index for the EVM log event.
Enter transaction hash (0x...):
```

粘贴你之前保存的交易哈希（来自 `requestSettlement` 调用）。

### 4. 输入 event index

```bash
Enter event index (0-based): 0
```

输入**0**。

### 预期输出

```bash
[SIMULATION] Running trigger trigger=evm:ChainSelector:16015286601757825753@1.0.0
[USER LOG] Settlement requested for Market #0
[USER LOG] Question: "Will Argentina win the 2022 World Cup?"
[USER LOG] Creator: 0x15fC6ae953E024d975e77382eEeC56A9101f9F88
[USER LOG] Already settled: false
[USER LOG] Yes Pool: 0
[USER LOG] No Pool: 0

Workflow Simulation Result:
 "Success"

[SIMULATION] Execution finished signal received
```

### 读取上的共识

即使是读取操作，也会在多个 DON 节点上执行：

1. 每个节点读取数据
2. 比对结果
3. 达成 BFT Consensus
4. 返回单一已验证结果

## 小结

你已经学会：

- ✅ 如何用 Viem 编码函数调用
- ✅ 如何用 `callContract` 进行读取
- ✅ 如何解码返回值
- ✅ 如何在共识校验下进行读取

## 下一步

接下来调用 Gemini AI 来判断市场结果！
