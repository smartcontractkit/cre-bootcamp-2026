# EVM Read: Reading Contract State

Before we can settle a market with AI, we need to read its details from the blockchain. Let's learn the **EVM Read** capability.

## Familiarize yourself with the capability

The **EVM Read** capability (`callContract`) allows you to call `view` and `pure` functions on smart contracts. All reads happen across multiple DON nodes and are verified via consensus, protecting against faulty RPC endpoints, stale data, or malicious responses.

### The read pattern

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

### Block number options

| Value | Description |
|-------|-------------|
| `LAST_FINALIZED_BLOCK_NUMBER` | Latest finalized block (safest, recommended) |
| `LATEST_BLOCK_NUMBER` | Very latest block |
| `blockNumber(n)` | Specific block number for historical queries |

### Why `zeroAddress` for `from`?

For read operations, the `from` address doesn't matter because no transaction is sent, no gas is consumed, and no state is modified.

### A note on Go bindings

The **Go SDK** requires you to generate type-safe bindings from your contract's ABI before interacting with it:

```bash
cre generate-bindings evm
```

This one-time step creates helper methods for reads, writes, and event decoding - no manual ABI definitions needed.

## Reading Market Data

Our contract has a `getMarket` function:

```solidity
function getMarket(uint256 marketId) external view returns (Market memory);
```

Let's call it from CRE.

### Step 1: Define the ABI

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

### Step 2: Encode the Function Call

```typescript
import { encodeFunctionData } from "viem";

const callData = encodeFunctionData({
  abi: GET_MARKET_ABI,
  functionName: "getMarket",
  args: [marketId],  // e.g., 0n for market ID 0
});
```

### Step 3: Call the Contract

```typescript
import { 
  cre, 
  encodeCallMsg, 
  LAST_FINALIZED_BLOCK_NUMBER,
  bytesToHex 
} from "@chainlink/cre-sdk";
import { zeroAddress } from "viem";

const evmClient = new cre.capabilities.EVMClient(
  network.chainSelector.selector
);

const result = evmClient
  .callContract(runtime, {
    call: encodeCallMsg({
      from: zeroAddress,      // Use zero address for reads
      to: contractAddress,    // Your contract
      data: callData,         // Encoded function call
    }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  })
  .result();
```

### Step 4: Decode the Result

```typescript
import { decodeFunctionResult } from "viem";

const market = decodeFunctionResult({
  abi: GET_MARKET_ABI,
  functionName: "getMarket",
  data: bytesToHex(result.data),
}) as Market;

runtime.log(`Question: ${market.question}`);
runtime.log(`Creator: ${market.creator}`);
runtime.log(`Settled: ${market.settled}`);
runtime.log(`Yes Pool: ${market.totalYesPool}`);
runtime.log(`No Pool: ${market.totalNoPool}`);
```

## Complete Example

Now let's update `my-workflow/logCallback.ts` to add EVM Read functionality:

```typescript
// prediction-market/my-workflow/logCallback.ts

import {
  cre,
  type Runtime,
  type EVMLog,
  getNetwork,
  bytesToHex,
  encodeCallMsg,
  LAST_FINALIZED_BLOCK_NUMBER,
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
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
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

## Simulating an EVM Read via Log Trigger

Now let's repeat the same process from the previous chapter and run the CRE simulation once again

### 1. Run the simulation

```bash
# From the prediction-market directory
cre workflow simulate my-workflow
```

### 2. Select Log Trigger

```bash
🚀 Workflow simulation ready. Please select a trigger:
1. http-trigger@1.0.0-alpha Trigger
2. evm:ChainSelector:16015286601757825753@1.0.0 LogTrigger

Enter your choice (1-2): 2
```

### 3. Enter the transaction details

```bash
🔗 EVM Trigger Configuration:
Please provide the transaction hash and event index for the EVM log event.
Enter transaction hash (0x...):
```

Paste the transaction hash you previously saved (from the `requestSettlement` function call).

### 4. Enter event index

```bash
Enter event index (0-based): 0
```

Enter **0**.

### Expected Output

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

### Consensus on Reads

Even read operations run across multiple DON nodes:
1. Each node reads the data
2. Results are compared
3. BFT Consensus is reached
4. Single verified result returned

## Summary

You've learned:
- ✅ How to encode function calls with Viem
- ✅ How to use `callContract` for reads
- ✅ How to decode the results
- ✅ Reading with consensus verification

## Next Steps

Now let's call Gemini AI to determine the market outcome!