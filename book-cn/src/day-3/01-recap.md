# 回顾与答疑

欢迎回到 Day 3！让我们回顾昨天学到的内容，并解答一些常见问题。

## Day 2 回顾

### 我们构建的内容

昨天，我们部署了智能合约并构建了一个**市场创建工作流**：

```
HTTP Request ──▶ CRE Workflow ──▶ PredictionMarket.sol
(question)       (HTTP Trigger)   (createMarket)
```

### 涵盖的关键概念

| 概念 | 我们学到的内容 |
|---------|-----------------|
| **智能合约** | 部署 PredictionMarket.sol 到 Sepolia |
| **HTTP Trigger** | 接收外部 HTTP 请求 |
| **EVM Write** | 两步模式（report → writeReport） |

### 两步写入模式

这是 Day 2 中最重要的模式：

```typescript
// Step 1: Encode and sign the data
const reportResponse = runtime
  .report({
    encodedPayload: hexToBase64(reportData),
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
  })
  .result();

// Step 2: Write to the contract
const writeResult = evmClient
  .writeReport(runtime, {
    receiver: contractAddress,
    report: reportResponse,
    gasConfig: { gasLimit: "500000" },
  })
  .result();
```

## 今日内容

今天我们将完成预测市场，内容包括：

1. **Log Trigger** — 响应链上事件
2. **EVM Read** — 从智能合约读取状态
3. **HTTP Capability** — 调用 Gemini AI
4. **Complete Flow** — 将所有部分串联起来

### 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      Day 3: Market Settlement                   │
│                                                                 │
│   requestSettlement() ──▶ SettlementRequested Event             │
│                                   │                             │
│                                   ▼                             │
│                           CRE Log Trigger                       │
│                                   │                             │
│                    ┌──────────────┼───────────────────┐         │
│                    ▼              ▼                   ▼         │
│              EVM Read         Gemini AI           EVM Write     │
│           (market data)   (determine outcome)  (settle market)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 第 2 天课程常见问题

### 问：为什么需要两步写入模式？

**答：**两步模式提供：

- **安全性**：报告由 DON 加密签名
- **可验证性**：合约可以验证签名来自 CRE
- **共识**：多个节点在签名前就数据达成一致

### 问：如果交易失败怎么办？

**答：**请检查：

1. 钱包中有足够的 ETH 支付 gas
2. 合约地址正确
3. gas limit 足够
4. 合约函数接受编码后的数据

### 问：如何调试 workflow 问题？

**答：**多使用 `runtime.log()`：

```typescript
runtime.log(`[DEBUG] Value: ${JSON.stringify(data)}`);
```

所有日志都会出现在 simulation 输出中。

### 问：一个 workflow 里可以有多个 trigger 吗？

**答：**可以！这正是今天要做的事。一个 workflow 最多可以有 10 个 trigger。

```typescript
const initWorkflow = (config: Config) => {
  return [
    cre.handler(httpTrigger, onHttpTrigger),
    cre.handler(logTrigger, onLogTrigger),
  ];
};
```

## 快速环境检查

在继续之前，先确认环境已就绪：

```bash
# Check CRE authentication
cre whoami

# From the prediction-market directory
source .env

export MARKET_ADDRESS=0xYOUR_CONTRACT_ADDRESS

# Verify you have markets created (decoded output)
cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

## 准备好开始 Day 3！

接下来深入学习 Log Trigger，并构建 settlement workflow。
