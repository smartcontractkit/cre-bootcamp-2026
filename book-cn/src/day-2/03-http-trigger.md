# HTTP Trigger：接收请求

现在让我们构建一个通过 HTTP 请求创建市场的 workflow。

## 熟悉 HTTP Trigger

当向 workflow 的指定端点发起 HTTP 请求时，**HTTP Trigger**会触发。这让你可以从外部系统启动 workflow，适用于：

- 创建资源（例如我们的市场）
- 由 API 驱动的 workflow
- 与外部系统集成

### 创建 trigger

```typescript
import { cre } from "@chainlink/cre-sdk";

const http = new cre.capabilities.HTTPCapability();

// Basic trigger (no authorization)
const trigger = http.trigger({});

// Or with authorized keys for signature validation
const trigger = http.trigger({
  authorizedKeys: [
    {
      type: "KEY_TYPE_ECDSA_EVM",
      publicKey: "0x...",
    },
  ],
});
```

### 配置

`trigger()` 方法接受一个配置对象，包含以下字段：

- `authorizedKeys`：`AuthorizedKey[]` — 用于校验入站请求签名的公钥列表。

### `AuthorizedKey`

定义用于请求认证的公钥。

- `type`：`string` — 密钥类型。对 EVM 签名使用 `"KEY_TYPE_ECDSA_EVM"`。
- `publicKey`：`string` — 以字符串形式表示的公钥。

**示例：**

```typescript
const config = {
  authorizedKeys: [
    {
      type: "KEY_TYPE_ECDSA_EVM",
      publicKey: "0x1234567890abcdef...",
    },
  ],
};
```

### Payload

传递给你回调函数的 payload 包含 HTTP 请求数据。

- `input`：`Uint8Array` — HTTP 请求体中的 JSON 输入，以原始字节表示。
- `method`：`string` — HTTP 方法（GET、POST 等）。
- `headers`：`Record<string, string>` — 请求头。

**使用 `input` 字段：**

`input` 字段是包含 HTTP 请求体原始字节的 `Uint8Array`。SDK 提供 `decodeJson` 辅助函数用于解析：

```typescript
import { decodeJson } from "@chainlink/cre-sdk";

// Parse as JSON (recommended)
const inputData = decodeJson(payload.input);

// Or convert to string manually
const inputString = new TextDecoder().decode(payload.input);

// Or parse manually
const inputJson = JSON.parse(new TextDecoder().decode(payload.input));
```

### 回调函数

HTTP trigger 的回调函数必须符合以下签名：

```typescript
import { type Runtime, type HTTPPayload } from "@chainlink/cre-sdk";

const onHttpTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): YourReturnType => {
  // Your workflow logic here
  return result;
}
```

**参数：**

- `runtime`：用于调用能力并访问配置的 runtime 对象
- `payload`：包含请求 input、method 与 headers 的 HTTP payload

## 构建我们的 HTTP Trigger

现在来构建 HTTP trigger workflow。我们将在 `cre init` 创建的 `my-workflow` 目录中工作。

### 步骤 1：创建 httpCallback.ts

新建文件 `my-workflow/httpCallback.ts`：

```typescript
// prediction-market/my-workflow/httpCallback.ts

import {
    cre,
    type Runtime,
    type HTTPPayload,
    decodeJson,
} from "@chainlink/cre-sdk";

// Simple interface for our HTTP payload
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

export function onHttpTrigger(runtime: Runtime<Config>, payload: HTTPPayload): string {
    runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    runtime.log("CRE Workflow: HTTP Trigger - Create Market");
    runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Step 1: Parse and validate the incoming payload
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

    // Steps 2-6: EVM Write (covered in next chapter)
    // We'll complete this in the EVM Write chapter

    return "Success";
}
```


### 步骤 2：更新 main.ts

更新 `my-workflow/main.ts` 以注册 HTTP trigger：

```typescript
// prediction-market/my-workflow/main.ts

import { cre, Runner, type Runtime } from "@chainlink/cre-sdk";
import { onHttpTrigger } from "./httpCallback";

type Config = {
  geminiModel: string;
  evms: Array<{
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
};

const initWorkflow = (config: Config) => {
  const httpCapability = new cre.capabilities.HTTPCapability();
  const httpTrigger = httpCapability.trigger({});

  return [
    cre.handler(
      httpTrigger,
      onHttpTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
```


## 模拟 HTTP Trigger

### 1. 运行模拟

```bash
# From the prediction-market directory (parent of my-workflow)
cd prediction-market
cre workflow simulate my-workflow
```

你应该看到：

```bash
Workflow compiled

🔍 HTTP Trigger Configuration:
Please provide JSON input for the HTTP trigger.
You can enter a file path or JSON directly.

Enter your input: 
```

### 2. 输入 JSON Payload

出现提示时，粘贴：

```json
{"question": "Will Argentina win the 2022 World Cup?"}
```

### 预期输出

```
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] CRE Workflow: HTTP Trigger - Create Market
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] [Step 1] Received market question: "Will Argentina win the 2022 World Cup?"

Workflow Simulation Result:
 "Success"

[SIMULATION] Execution finished signal received
```

## 授权（生产环境）

在生产环境中，你需要用真实的公钥配置 `authorizedKeys`：

```typescript
http.trigger({
  authorizedKeys: [
    {
      type: "KEY_TYPE_ECDSA_EVM",
      publicKey: "0x04abc123...", // Your public key
    },
  ],
})
```

这样可以确保只有授权调用方可以触发你的 workflow。模拟时我们使用空配置对象。


## 小结

你已经了解：

- ✅ HTTP Trigger 如何工作
- ✅ 如何解码 JSON payload
- ✅ 如何校验输入
- ✅ 如何模拟 HTTP trigger

## 下一步

现在让我们通过将市场写入区块链来完成整个 workflow！
