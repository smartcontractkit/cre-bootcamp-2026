# Log Trigger: Event-Driven Workflows

Today's big new concept: **Log Triggers**. These allow your workflow to react to on-chain events automatically.

## Familiarize yourself with the capability

The **EVM Log Trigger** fires when a smart contract emits a specific event. You create a Log Trigger by calling `EVMClient.logTrigger()` with a configuration that specifies which contract addresses and event topics to listen for.

This is powerful because:

- **Reactive**: Your workflow runs only when something happens on-chain
- **Efficient**: No need to poll or check periodically
- **Precise**: Filter by contract address, event signature, and topics

### Creating the trigger

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

### Configuration

The `logTrigger()` method accepts a configuration object:

| Field | Type | Description |
|-------|------|-------------|
| `addresses` | `string[]` | Contract addresses to monitor (at least one required) |
| `topics` | `TopicValues[]` | Optional. Filter by event signature and indexed parameters |
| `confidence` | `string` | Block confirmation level: `CONFIDENCE_LEVEL_LATEST`, `CONFIDENCE_LEVEL_SAFE` (default), or `CONFIDENCE_LEVEL_FINALIZED` |

### Log Trigger vs CRON Trigger

| Pattern | Log Trigger | CRON Trigger |
|---------|-------------|--------------|
| **When it fires** | On-chain event emitted | Schedule (every hour, etc.) |
| **Style** | Reactive | Proactive |
| **Use case** | "When X happens, do Y" | "Check every hour for X" |
| **Example** | Settlement requested → Settle | Hourly → Check all markets |

## Our Event: SettlementRequested

Recall our smart contract emits this event:

```solidity
event SettlementRequested(uint256 indexed marketId, string question);
```

We want CRE to:
1. **Detect** when this event is emitted
2. **Decode** the marketId and question
3. **Run** our settlement workflow

## Setting Up the Log Trigger

### 1. Compute the Event Signature Hash

```typescript
import { keccak256, toHex } from "viem";

const SETTLEMENT_REQUESTED_SIGNATURE = "SettlementRequested(uint256,string)";
const eventHash = keccak256(toHex(SETTLEMENT_REQUESTED_SIGNATURE));
```

### 2. Configure the Log Trigger

```typescript
const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

cre.handler(
  evmClient.logTrigger({
    // Which contract(s) to watch
    addresses: [config.evms[0].marketAddress],
    
    // Which events to filter for (by topic)
    topics: [{ values: [eventHash] }],
    
    // Wait for finality
    confidence: "CONFIDENCE_LEVEL_FINALIZED",
  }),
  onLogTrigger
)
```

### 3. The Callback Function

```typescript
import { type EVMLog, bytesToHex } from "@chainlink/cre-sdk";
import { decodeEventLog, parseAbi } from "viem";

const EVENT_ABI = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string question)"
]);

function onLogTrigger(runtime: Runtime<Config>, log: EVMLog): string {
  // Convert topics to hex format for viem
  const topics = log.topics.map(t => bytesToHex(t)) as [
    `0x${string}`,
    ...`0x${string}`[]
  ];
  const data = bytesToHex(log.data);

  // Decode the event
  const decodedLog = decodeEventLog({
    abi: EVENT_ABI,
    data,
    topics
  });

  // Extract the values
  const marketId = decodedLog.args.marketId as bigint;
  const question = decodedLog.args.question as string;

  runtime.log(`Settlement requested for Market #${marketId}`);
  runtime.log(`Question: "${question}"`);

  // Continue with EVM Read, AI, EVM Write...
  return "Processed";
}
```

## Understanding the EVMLog Payload

When CRE triggers your callback, it provides:

| Property | Type | Description |
|----------|------|-------------|
| `topics` | `Uint8Array[]` | Event topics (indexed parameters) |
| `data` | `Uint8Array` | Non-indexed event data |
| `address` | `Uint8Array` | Contract address that emitted |
| `blockNumber` | `bigint` | Block where event occurred |
| `txHash` | `Uint8Array` | Transaction hash |

### Decoding Topics

For `SettlementRequested(uint256 indexed marketId, string question)`:
- `topics[0]` = Event signature hash
- `topics[1]` = `marketId` (indexed, so it's in topics)
- `data` = `question` (not indexed)

## Creating logCallback.ts

Create a new file `my-workflow/logCallback.ts` with the event decoding logic:

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

## Updating main.ts

Update `my-workflow/main.ts` to register the Log Trigger:

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

## Simulating a Log Trigger

### 1. First, request settlement on your contract

```bash
cast send $MARKET_ADDRESS \
  "requestSettlement(uint256)" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

**Save the transaction hash!**

### 2. Run the simulation

```bash
# From the prediction-market directory
cre workflow simulate my-workflow
```

### 3. Select Log Trigger

```bash
🚀 Workflow simulation ready. Please select a trigger:
1. http-trigger@1.0.0-alpha Trigger
2. evm:ChainSelector:16015286601757825753@1.0.0 LogTrigger

Enter your choice (1-2): 2
```

### 4. Enter the transaction details

```bash
🔗 EVM Trigger Configuration:
Please provide the transaction hash and event index for the EVM log event.
Enter transaction hash (0x...):
```

Paste the transaction hash you just saved (from the `requestSettlement` function call).

### 5. Enter event index

```bash
Enter event index (0-based): 0
```

Enter **0**.

### Expected Output

```bash
[SIMULATION] Running trigger trigger=evm:ChainSelector:16015286601757825753@1.0.0
[USER LOG] Settlement requested for Market #0
[USER LOG] Question: "Will Argentina win the 2022 World Cup?"

Workflow Simulation Result:
 "Processed"

[SIMULATION] Execution finished signal received
```

## Key Takeaways

- **Log Triggers** react to on-chain events automatically
- Use `keccak256(toHex("EventName(types)"))` to compute the event hash
- Decode events using Viem's `decodeEventLog`
- Test by first triggering the event on-chain, then simulating with the tx hash

## Next Steps

Now let's read more data from the contract before settling.