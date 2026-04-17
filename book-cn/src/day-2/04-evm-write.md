# Capability：EVM Write

**EVM Write** capability 让你的 CRE workflow 可以向 EVM 兼容区块链上的智能合约写入数据。这是 CRE 中最重要的模式之一。

## 熟悉该能力

EVM Write capability 让你的 workflow 向智能合约提交经密码学签名的 report。与传统直接发送交易的 web3 应用不同，CRE 使用安全的两步流程：

1. **生成已签名的 report**— 你的数据经 ABI 编码，并封装在密码学签名的「包」中
2. **提交 report**— 已签名的 report 通过 Chainlink `KeystoneForwarder` 提交到你的 consumer 合约

### 创建 EVM client

```typescript
import { cre, getNetwork } from "@chainlink/cre-sdk";

// Get network configuration
const network = getNetwork({
  chainFamily: "evm",
  chainSelectorName: "ethereum-testnet-sepolia", // or from config
  isTestnet: true,
});

// Create EVM client
const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);
```

### 两步写入流程

#### 步骤 1：生成已签名的 report

首先编码数据并生成密码学签名的 report：

```typescript
import { encodeAbiParameters, parseAbiParameters } from "viem";
import { hexToBase64 } from "@chainlink/cre-sdk";

// Define ABI parameters (must match what your contract expects)
const PARAMS = parseAbiParameters("string question");

// Encode your data
const reportData = encodeAbiParameters(PARAMS, ["Your question here"]);

// Generate the signed report
const reportResponse = runtime
  .report({
    encodedPayload: hexToBase64(reportData),
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
  })
  .result();
```

**Report 参数：**

| 参数 | 取值 | 说明 |
|-----------|-------|-------------|
| `encodedPayload` | base64 string | 你的 ABI 编码数据（由 hex 转换而来） |
| `encoderName` | `"evm"` | 用于 EVM 兼容链 |
| `signingAlgo` | `"ecdsa"` | 签名算法 |
| `hashingAlgo` | `"keccak256"` | 哈希算法 |

#### 步骤 2：提交 report

将已签名的 report 提交到你的 consumer 合约：

```typescript
import { bytesToHex, TxStatus } from "@chainlink/cre-sdk";

const writeResult = evmClient
  .writeReport(runtime, {
    receiver: "0x...", // Your consumer contract address
    report: reportResponse, // The signed report from Step 1
    gasConfig: {
      gasLimit: "500000", // Gas limit for the transaction
    },
  })
  .result();

// Check the result
if (writeResult.txStatus === TxStatus.SUCCESS) {
  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
  return txHash;
}

throw new Error(`Transaction failed: ${writeResult.txStatus}`);
```

**WriteReport 参数：**

- `receiver`：`string` — consumer 合约地址（必须实现 `IReceiver` 接口）
- `report`：`ReportResponse` — 来自 `runtime.report()` 的已签名 report
- `gasConfig`：`{ gasLimit: string }` — 可选的 gas 配置

**响应：**

- `txStatus`：`TxStatus` — 交易状态（`SUCCESS`、`FAILURE` 等）
- `txHash`：`Uint8Array` — 交易哈希（使用 `bytesToHex()` 转换）

### Consumer 合约

为了让智能合约能够接收来自 CRE 的数据，它必须实现 `IReceiver` 接口。该接口定义了一个 `onReport()` 函数，由 Chainlink `KeystoneForwarder` 合约调用以投递已验证的数据。

虽然你可以手动实现 `IReceiver`，我们建议使用 `ReceiverTemplate`——一个抽象合约，可处理 ERC165 支持、metadata 解码和安全检查（forwarder 验证）等样板代码，让你把精力放在 `_processReport()` 中的业务逻辑上。

> 用于模拟的 `MockKeystoneForwarder` 合约在 Ethereum Sepolia 上的地址见：[https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code](https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code)


## 构建我们的 EVM Write Workflow

现在通过为 `httpCallback.ts` 添加 EVM Write 能力，在链上创建市场，完成上一章开始的文件。

### 更新 httpCallback.ts

用包含区块链写入的完整代码更新 `my-workflow/httpCallback.ts`：

```typescript
// prediction-market/my-workflow/httpCallback.ts

import {
  cre,
  type Runtime,
  type HTTPPayload,
  getNetwork,
  bytesToHex,
  hexToBase64,
  TxStatus,
  decodeJson,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters } from "viem";

// Inline types
interface CreateMarketPayload {
  question: string;
}

type Config = {
    geminiModel: string;
    evms: Array<{
        marketAddress: string;
        chainSelectorName: string;
        gasLimit: string;
    }>;
};

// ABI parameters for createMarket function
const CREATE_MARKET_PARAMS = parseAbiParameters("string question");

export function onHttpTrigger(runtime: Runtime<Config>, payload: HTTPPayload): string {
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  runtime.log("CRE Workflow: HTTP Trigger - Create Market");
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // ─────────────────────────────────────────────────────────────
    // Step 1: Parse and validate the incoming payload
    // ─────────────────────────────────────────────────────────────
    if (!payload.input || payload.input.length === 0) {
      runtime.log("[ERROR] Empty request payload");
      return "Error: Empty request";
    }

    const inputData = decodeJson(payload.input) as CreateMarketPayload;
    runtime.log(`[Step 1] Received market question: "${inputData.question}"`);

    if (!inputData.question || inputData.question.trim().length === 0) {
      runtime.log("[ERROR] Question is required");
      return "Error: Question is required";
    }

    // ─────────────────────────────────────────────────────────────
    // Step 2: Get network and create EVM client
    // ─────────────────────────────────────────────────────────────
    const evmConfig = runtime.config.evms[0];

    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName: evmConfig.chainSelectorName,
      isTestnet: true,
    });

    if (!network) {
      throw new Error(`Unknown chain: ${evmConfig.chainSelectorName}`);
    }

    runtime.log(`[Step 2] Target chain: ${evmConfig.chainSelectorName}`);
    runtime.log(`[Step 2] Contract address: ${evmConfig.marketAddress}`);

    const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

    // ─────────────────────────────────────────────────────────────
    // Step 3: Encode the market data for the smart contract
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 3] Encoding market data...");

    const reportData = encodeAbiParameters(CREATE_MARKET_PARAMS, [inputData.question]);

    // ─────────────────────────────────────────────────────────────
    // Step 4: Generate a signed CRE report
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 4] Generating CRE report...");

    const reportResponse = runtime
      .report({
        encodedPayload: hexToBase64(reportData),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      })
      .result();

    // ─────────────────────────────────────────────────────────────
    // Step 5: Write the report to the smart contract
    // ─────────────────────────────────────────────────────────────
    runtime.log(`[Step 5] Writing to contract: ${evmConfig.marketAddress}`);

    const writeResult = evmClient
      .writeReport(runtime, {
        receiver: evmConfig.marketAddress,
        report: reportResponse,
        gasConfig: {
          gasLimit: evmConfig.gasLimit,
        },
      })
      .result();

    // ─────────────────────────────────────────────────────────────
    // Step 6: Check result and return transaction hash
    // ─────────────────────────────────────────────────────────────
    if (writeResult.txStatus === TxStatus.SUCCESS) {
      const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
      runtime.log(`[Step 6] ✓ Transaction successful: ${txHash}`);
      runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return txHash;
    }

    throw new Error(`Transaction failed with status: ${writeResult.txStatus}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    runtime.log(`[ERROR] ${msg}`);
    runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw err;
  }
}
```

## 运行完整 Workflow

### 1. 确认合约已部署

确认你已用已部署的合约地址更新 `my-workflow/config.staging.json`：

```json
{
  "geminiModel": "gemini-2.0-flash",
  "evms": [
    {
      "marketAddress": "0xYOUR_CONTRACT_ADDRESS_HERE",
      "chainSelectorName": "ethereum-testnet-sepolia",
      "gasLimit": "500000"
    }
  ]
}
```

### 2. 检查 `.env` 文件

`.env` 文件在 CRE 项目设置步骤中已创建。确保它位于 `prediction-market` 目录，并包含：

```bash
# CRE Configuration
CRE_ETH_PRIVATE_KEY=your_private_key_here
CRE_TARGET=staging-settings
GEMINI_API_KEY_VAR=your_gemini_api_key_here
```

如需更新，请编辑 `prediction-market` 目录下的 `.env` 文件。

### 3. 带 broadcast 的模拟

默认情况下，模拟器会对链上写入操作进行 dry run：它会准备交易但不会向区块链广播。

若要在模拟期间实际广播交易，请使用 `--broadcast` 标志：

```bash
# From the prediction-market directory
cd prediction-market
cre workflow simulate my-workflow --broadcast
```

> **说明**：请确保当前在 `prediction-market` 目录（`my-workflow` 的父目录），且 `.env` 文件位于 `prediction-market` 目录。

### 4. 选择 HTTP trigger 并输入 payload

```json
{"question": "Will Argentina win the 2022 World Cup?"}
```

### 预期输出

```
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] CRE Workflow: HTTP Trigger - Create Market
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] [Step 1] Received market question: "Will Argentina win the 2022 World Cup?"
[USER LOG] [Step 2] Target chain: ethereum-testnet-sepolia
[USER LOG] [Step 2] Contract address: 0x...
[USER LOG] [Step 3] Encoding market data...
[USER LOG] [Step 4] Generating CRE report...
[USER LOG] [Step 5] Writing to contract: 0x...
[USER LOG] [Step 6] ✓ Transaction successful: 0xabc123...

Workflow Simulation Result:
 "0xabc123..."
```

### 5. 在区块浏览器上验证

在 [Sepolia Etherscan](https://sepolia.etherscan.io) 上查看交易。

### 6. 验证市场已创建

你可以通过从合约读取来验证市场是否已创建：

```bash
export MARKET_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```
```bash
cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

这将返回市场 ID 0 的市场数据，包括创建者、时间戳、结算状态、资金池与问题。

## 🎉 第 2 天课程完成！

你已经成功：

- ✅ 部署智能合约
- ✅ 构建由 HTTP 触发的 workflow
- ✅ 将数据写入区块链

明天我们将添加：

- Log Trigger（响应链上事件）
- EVM Read（读取合约状态）
- AI 集成（Gemini API）
- 完整结算流程

**明天见！**
