# 我们要构建什么

## 用例：AI 驱动的预测市场

我们要构建一个**AI 驱动的链上预测市场**—— 一套完整系统，其中：

1. 通过**HTTP 触发的 CRE workflow** **在链上创建市场**
2. **用户在 Yes 或 No 上质押 ETH**进行预测
3. **用户可以请求结算**任意市场
4. **CRE 通过 Log Trigger 自动检测**结算请求
5. **Google Gemini AI**判定市场结果
6. **CRE 将**已验证的结果**写回链上**
7. **获胜者领取**总奖池中的份额 → `Your stake * (Total Pool / Winning Pool)`

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        Day 1: Market Creation                   │
│                                                                 │
│   HTTP Request ──▶ CRE Workflow ──▶ PredictionMarket.sol        │
│   (question)       (HTTP Trigger)   (createMarket)              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Day 2: Market Settlement                   │
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

## 学习目标

完成本训练营后，你将能够：

- ✅ **说明** CRE 是什么以及何时使用它
- ✅ **用 TypeScript 开发与模拟** CRE workflow
- ✅ **使用**全部 CRE trigger（CRON、HTTP、Log）与 Capability（HTTP、EVM Read、EVM Write）
- ✅ **通过可验证的 workflow**将 AI 服务与智能合约连接起来
- ✅ **编写**与 CRE 链上写入能力兼容的智能合约

## 你将学到什么

### 第一天：基础知识 + CRE 入门

| 主题 | 你将学到 |
|-------|-------------------|
| CRE CLI 配置 | 安装工具、创建账户、验证环境 |
| CRE 基础概念 | CRE 是什么、Workflow、Capability、DON |
| 项目搭建 | `cre init`、项目结构、首次模拟 |

**第一天课程结束时**：你将理解 CRE 核心概念并跑通第一个 workflow！

### 第二天：智能合约 + 链上写入

| 主题 | 你将学到 |
|-------|-------------------|
| 智能合约 | 开发并部署 PredictionMarket.sol |
| HTTP Trigger | 接收外部 HTTP 请求 |
| EVM Write | 两步写入模式，向区块链写入数据 |

**第二天课程结束时**：你将能通过 HTTP 请求在链上创建市场！

### 第三天：完整结算 Workflow

| 主题 | 你将学到 |
|-------|-------------------|
| Log Trigger | 响应链上事件 |
| EVM Read | 从智能合约读取状态 |
| AI 集成 | 在共识机制下调用 Gemini API |
| 进行预测 | 用 ETH 在市场上下注 |
| 完整流程 | 串联一切、结算、领取奖励 |

**第三天课程结束时**：端到端的 AI 驱动结算全部跑通！


## 🎬 演示时间！

在动手搭建之前，我们先看看最终效果实际运行起来是什么样。
