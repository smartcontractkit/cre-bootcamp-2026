# 回顾与答疑

欢迎来到第 2 天的课程！让我们回顾昨天学到的内容，并解答一些常见问题。

## 第 1 天回顾

### 我们学到的内容

昨天，我们建立了 CRE 的基础知识：

| 概念 | 我们学到的内容 |
|---------|-----------------|
| **CRE 思维模型** | Workflow、Trigger、Capability、DON |
| **项目搭建** | `cre init`、项目结构、首次模拟 |
| **Trigger-Callback 模式** | 每个 CRE workflow 的核心架构模式 |

### 核心概念回顾

#### Workflow、Trigger 与 Capability

```
Trigger 触发 ──▶ Workflow 运行 ──▶ 调用 Capability
（CRON/HTTP/Log）   （你的业务逻辑）   （HTTP/EVM Read/EVM Write）
```

- **Workflow**：你的自动化逻辑，编译为 WASM，在 DON 上执行
- **Trigger**：启动 workflow 的事件（CRON、HTTP、Log）
- **Capability**：执行具体任务的微服务（HTTP、EVM Read、EVM Write）
- **DON**：通过 BFT 共识执行并验证结果的去中心化节点网络

#### Trigger-Callback 模式

```typescript
cre.handler(
  trigger,    // 何时执行（CRON、HTTP、Log）
  callback    // 执行什么（你的逻辑）
)
```

## 今日内容

今天我们将在第 1 天的基础上，部署智能合约并学习如何通过 CRE workflow 与区块链交互：

1. **智能合约** — 开发并部署 PredictionMarket.sol
2. **HTTP Trigger** — 通过 HTTP 请求启动 workflow
3. **EVM Write** — 将数据写入链上智能合约

### 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                   Day 2: Market Creation                        │
│                                                                 │
│   HTTP Request ──▶ CRE Workflow ──▶ PredictionMarket.sol        │
│   (question)       (HTTP Trigger)   (createMarket)              │
└─────────────────────────────────────────────────────────────────┘
```

## 第 1 天常见问题

### 问：CRE workflow 在哪里运行？

**答：**CRE workflow 被编译为 WASM，在去中心化预言机网络（DON）上运行。每个节点独立执行你的代码，然后通过 BFT 共识协议对比结果，返回一个经过验证的结果。

### 问：simulation 和实际部署有什么区别？

**答：**
- `cre workflow simulate` — 在本地模拟执行，默认不上链
- `cre workflow simulate --broadcast` — 模拟执行并**真正广播**交易到区块链
- 生产部署需要申请 Early Access

### 问：如果 `cre init` 或 `cre workflow simulate` 报错怎么办？

**答：**请检查：
1. `cre whoami` 确认已登录
2. `.env` 文件在 `prediction-market` 目录下且私钥正确
3. `bun install --cwd ./my-workflow` 已成功安装依赖
4. 当前工作目录是 `prediction-market`（而非 `my-workflow`）

## 快速环境检查

在继续之前，先确认环境已就绪：

```bash
# 检查 CRE 认证状态
cre whoami
```

## 准备好开始第 2 天课程！

接下来我们将部署智能合约，并学习 HTTP Trigger 和 EVM Write，实现通过 HTTP 请求在链上创建预测市场。
