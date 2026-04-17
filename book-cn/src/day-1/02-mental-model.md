# CRE 基础概念

在开始写代码之前，我们先建立对 CRE 是什么、如何工作的清晰概念。

## CRE 是什么？

**Chainlink Runtime Environment（CRE）**是一个编排层，让你可以用 TypeScript 或 Golang 编写智能合约并运行自己的 workflow，由 Chainlink 去中心化预言机网络（DON）驱动。借助 CRE，你可以将不同能力（例如 HTTP、链上读写、签名、共识）组合成可验证的 workflow，把智能合约连接到 API、云服务、AI 系统、其他区块链等。这些 workflow 在 DON 上执行，并内置共识，作为安全、抗篡改且高可用的运行时。

### CRE 要解决的问题

智能合约有一个根本限制：**只能看到本链上的数据**。

- ❌ 无法从外部 API 拉取数据，无法查询当前天气和比赛结果
- ❌ 无法调用 AI 模型
- ❌ 无法读取其他区块链

CRE 通过提供**可验证的运行时**来弥合这一差距，你可以在其中：

- ✅ 从任意 API 获取数据
- ✅ 从多条区块链读取
- ✅ 调用 AI 服务
- ✅ 将已验证结果写回链上

并且全程由**密码学共识**保证每一步操作都经过验证。

## 核心概念

### 1. Workflow（工作流）

**Workflow**是你开发的链下代码，用 TypeScript 或 Go 编写。CRE 将其编译为 WebAssembly（WASM），并在去中心化预言机网络（DON）上运行。

```typescript
// A workflow is just a TypeScript or Go code!
const initWorkflow = (config: Config) => {
  return [
    cre.handler(trigger, callback),
  ]
}
```

### 2. Trigger（触发器）

**Trigger**是启动 workflow 的事件。CRE 支持三种类型：

| Trigger | 何时触发 | 例子 |
|---------|---------------|----------|
| **CRON** | 按计划 | 「每小时运行一次 workflow」 |
| **HTTP** | 收到 HTTP 请求时 | 「API 被调用时创建市场」 |
| **Log** | 智能合约发出事件时 | 「SettlementRequested 触发时结算」 |

### 3. Capability（能力）

**Capability**是 workflow **能做什么**—— 执行具体任务的微服务：

| Capability | 作用 |
|------------|--------------|
| **HTTP** | 向外部 API 发起 HTTP 请求 |
| **EVM Read** | 从智能合约读取数据 |
| **EVM Write** | 向智能合约写入数据 |

每种 capability 都在各自专用的 DON 上运行，并内置共识。

### 4. 去中心化预言机网络（DON）

**DON**是由独立节点组成的网络，会：

1. 各自独立执行你的 workflow
2. 比对各自结果
3. 使用拜占庭容错（BFT）协议达成共识
4. 返回单一、已验证的结果

## Trigger 与 Callback 模式

这是你在每个 CRE workflow 中都会用到的核心架构模式：

```typescript
cre.handler(
  trigger,    // WHEN to execute (cron, http, log)
  callback    // WHAT to execute (your logic)
)
```

### 示例：简单的 Cron Workflow

```typescript
// The trigger: every 10 minutes
const cronCapability = new cre.capabilities.CronCapability()
const cronTrigger = cronCapability.trigger({ schedule: "0 */10 * * * *" })

// The callback: what runs when triggered
function onCronTrigger(runtime: Runtime<Config>): string {
  runtime.log("Hello from CRE!")
  return "Success"
}

// Connect them together
const initWorkflow = (config: Config) => {
  return [
    cre.handler(
      cronTrigger,
      onCronTrigger
    ),
  ]
}
```

## 执行流程

当 trigger 触发时，会发生：

```
1. Trigger fires (cron schedule, HTTP request, or on-chain event)
           │
           ▼
2. Workflow DON receives the trigger
           │
           ▼
3. Each node executes your callback independently
           │
           ▼
4. When callback invokes a capability (HTTP, EVM Read, etc.):
           │
           ▼
5. Capability DON performs the operation
           │
           ▼
6. Nodes compare results via BFT consensus
           │
           ▼
7. Single verified result returned to your callback
           │
           ▼
8. Callback continues with trusted data
```

## 要点速记

| 概念 | 一句话 |
|---------|-----------|
| **Workflow** | 你的自动化逻辑，编译为 WASM |
| **Trigger** | 启动执行的事件（CRON、HTTP、Log） |
| **Callback** | 包含业务逻辑的函数 |
| **Capability** | 执行具体任务的微服务（HTTP、EVM Read/Write） |
| **DON** | 在共识下执行的网络节点集合 |
| **Consensus** | BFT 协议，保证结果是已验证的 |


## 下一步

理解了基础概念之后，我们来搭建你的第一个 CRE 项目！
