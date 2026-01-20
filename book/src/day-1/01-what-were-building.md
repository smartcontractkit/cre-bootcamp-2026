# What We're Building

## The Use Case: AI-Powered Prediction Markets

We're building an **AI-Powered Onchain Prediction Market** - a complete system where:

1. **Onchain Markets are created** via HTTP-triggered CRE workflows
2. **Users make predictions** by staking ETH on Yes or No
3. **Users can request settlement** for any market
4. **CRE automatically detects** settlement requests via Log Triggers
5. **Google Gemini AI** determines the market outcome
6. **CRE writes** the verified outcome back onchain
7. **Winners claim** their share of the total pool → `Your stake * (Total Pool / Winning Pool)`

## Architecture Overview

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

## Learning Objectives

After completing this bootcamp, you will be able to:

- ✅ **Explain** what CRE is and when to use it
- ✅ **Develop and simulate** CRE workflows in TypeScript
- ✅ **Use** all CRE triggers (CRON, HTTP, Log) and capabilities (HTTP, EVM Read, EVM Write)
- ✅ **Connect** AI services to smart contracts through verifiable workflows
- ✅ **Build** smart contracts compatible with CRE's chain write capability

## What You'll Learn

### Day 1: Foundations + Market Creation

| Topic | What You'll Learn |
|-------|-------------------|
| CRE CLI Setup | Install tools, create account, verify setup |
| CRE Mental Model | What CRE is, Workflows, Capabilities, DONs |
| Project Setup | `cre init`, project structure, first simulation |
| Smart Contract | Develop PredictionMarket.sol  |
| HTTP Trigger | Receive external HTTP requests |
| EVM Write | Write data to the blockchain |

**End of Day 1**: You'll create markets on-chain via HTTP requests!

### Day 2: Complete Settlement Workflow

| Topic | What You'll Learn |
|-------|-------------------|
| Log Trigger | React to on-chain events |
| EVM Read | Read state from smart contracts |
| AI Integration | Call Gemini API with consensus |
| Making Predictions | Place bets on markets with ETH |
| Complete Flow | Wire everything, settle, claim winnings |

**End of Day 2**: Full AI-powered settlement working end-to-end!


## 🎬 Demo Time!

Before we dive into building, let's see the end result in action.
