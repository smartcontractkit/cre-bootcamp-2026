# The CRE Mental Model

Before we start coding, let's build a strong mental model of what CRE is and how it works.

## What is CRE?

The **Chainlink Runtime Environment (CRE)** is an orchestration layer that lets you write institutional-grade smart contracts and run your own workflows in TypeScript or Golang, powered by Chainlink decentralized oracle networks (DONs). With CRE, you can compose different capabilities (e.g., HTTP, onchain reads and writes, signing, consensus) into verifiable workflows that connect smart contracts to APIs, cloud services, AI systems, other blockchains, and more. The workflows then execute across DONs with built-in consensus, serving as a secure, tamper-resistant, and highly available runtime.

### The Problem CRE Solves

Smart contracts have a fundamental limitation: **they can only see what's on their blockchain**.

- ❌ Can't check the current weather
- ❌ Can't fetch data from external APIs
- ❌ Can't call AI models
- ❌ Can't read from other blockchains

CRE bridges this gap by providing a **decentralized runtime** where you can:

- ✅ Fetch data from any API
- ✅ Read from multiple blockchains
- ✅ Call AI services
- ✅ Write verified results back on-chain

All with **cryptographic consensus** ensuring every operation is verified.

## Core Concepts

### 1. Workflows

A **Workflow** is the offchain code you develop, written in TypeScript or Go. CRE compiles it to WebAssembly (WASM) and runs it across a Decentralized Oracle Network (DON).

```typescript
// A workflow is just a TypeScript or Go code!
const initWorkflow = (config: Config) => {
  return [
    cre.handler(trigger, callback),
  ]
}
```

### 2. Triggers

**Triggers** are events that start your workflow. CRE supports three types:

| Trigger | When It Fires | Use Case |
|---------|---------------|----------|
| **CRON** | On a schedule | "Run workflow every hour" |
| **HTTP** | When receiving an HTTP request | "Create market when API called" |
| **Log** | When a smart contract emits an event | "Settle when SettlementRequested fires" |

### 3. Capabilities

**Capabilities** are what your workflow can DO - decentralized microservices that perform specific tasks:

| Capability | What It Does |
|------------|--------------|
| **HTTP** | Make HTTP requests to external APIs |
| **EVM Read** | Read data from smart contracts |
| **EVM Write** | Write data to smart contracts |

Each capability runs on its own specialized DON with built-in consensus.

### 4. Decentralized Oracle Networks (DONs)

A **DON** is a network of independent nodes that:
1. Execute your workflow independently
2. Compare their results
3. Reach consensus using Byzantine Fault Tolerant (BFT) protocols
4. Return a single, verified result

This means even your API calls are decentralized and verified!

## The Trigger-and-Callback Pattern

This is the core architectural pattern you'll use in every CRE workflow:

```typescript
cre.handler(
  trigger,    // WHEN to execute (cron, http, log)
  callback    // WHAT to execute (your logic)
)
```

### Example: A Simple Cron Workflow

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

## Execution Flow

When a trigger fires, here's what happens:

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

## Key Takeaways

| Concept | One-liner |
|---------|-----------|
| **Workflow** | Your automation logic, compiled to WASM |
| **Trigger** | Event that starts execution (CRON, HTTP, Log) |
| **Callback** | Function containing your business logic |
| **Capability** | Decentralized microservice (HTTP, EVM Read/Write) |
| **DON** | Network of nodes that execute with consensus |
| **Consensus** | BFT protocol ensuring verified results |


## Next Steps

Now that you understand the mental model, let's set up your first CRE project!