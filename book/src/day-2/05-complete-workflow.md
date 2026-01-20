# Complete Workflow: Wiring It Together

It's time to combine everything into a complete, working settlement workflow!

## The Complete Flow

```
SettlementRequested Event
         │
         ▼
    Log Trigger
         │
         ▼
┌────────────────────┐
│ Step 1: Decode     │
│ Event data         │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Step 2: EVM Read   │
│ Get market details │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Step 3: HTTP       │
│ Query Gemini AI    │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Step 4: EVM Write  │
│ Submit settlement  │
└────────┬───────────┘
         │
         ▼
    Return txHash
```

## Complete logCallback.ts

Update `my-workflow/logCallback.ts` with the complete settlement flow:

```typescript
// prediction-market/my-workflow/logCallback.ts

import {
  cre,
  type Runtime,
  type EVMLog,
  getNetwork,
  bytesToHex,
  hexToBase64,
  TxStatus,
  encodeCallMsg,
} from "@chainlink/cre-sdk";
import {
  decodeEventLog,
  parseAbi,
  encodeAbiParameters,
  parseAbiParameters,
  encodeFunctionData,
  decodeFunctionResult,
  zeroAddress,
} from "viem";
import { askGemini } from "./gemini";

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
  outcome: number; // 0 = Yes, 1 = No
  totalYesPool: bigint;
  totalNoPool: bigint;
  question: string;
}

interface GeminiResult {
  result: "YES" | "NO" | "INCONCLUSIVE";
  confidence: number; // 0-10000
}

// ===========================
// Contract ABIs
// ===========================

/** ABI for the SettlementRequested event */
const EVENT_ABI = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string question)",
]);

/** ABI for reading market data */
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

/** ABI parameters for settlement report (outcome is uint8 for Prediction enum) */
const SETTLEMENT_PARAMS = parseAbiParameters("uint256 marketId, uint8 outcome, uint16 confidence");

// ===========================
// Log Trigger Handler
// ===========================

/**
 * Handles Log Trigger events for settling prediction markets.
 *
 * Flow:
 * 1. Decode the SettlementRequested event
 * 2. Read market details from the contract (EVM Read)
 * 3. Query Gemini AI for the outcome (HTTP)
 * 4. Write the settlement report to the contract (EVM Write)
 *
 * @param runtime - CRE runtime with config and capabilities
 * @param log - The EVM log event data
 * @returns Success message with transaction hash
 */
export function onLogTrigger(runtime: Runtime<Config>, log: EVMLog): string {
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  runtime.log("CRE Workflow: Log Trigger - Settle Market");
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // ─────────────────────────────────────────────────────────────
    // Step 1: Decode the event log
    // ─────────────────────────────────────────────────────────────
    const topics = log.topics.map((t: Uint8Array) => bytesToHex(t)) as [
      `0x${string}`,
      ...`0x${string}`[]
    ];
    const data = bytesToHex(log.data);

    const decodedLog = decodeEventLog({ abi: EVENT_ABI, data, topics });
    const marketId = decodedLog.args.marketId as bigint;
    const question = decodedLog.args.question as string;

    runtime.log(`[Step 1] Settlement requested for Market #${marketId}`);
    runtime.log(`[Step 1] Question: "${question}"`);

    // ─────────────────────────────────────────────────────────────
    // Step 2: Read market details from contract (EVM Read)
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 2] Reading market details from contract...");

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
        })
      })
      .result();

    const market = decodeFunctionResult({
      abi: GET_MARKET_ABI,
      functionName: "getMarket",
      data: bytesToHex(readResult.data),
    }) as Market;

    runtime.log(`[Step 2] Market creator: ${market.creator}`);
    runtime.log(`[Step 2] Already settled: ${market.settled}`);
    runtime.log(`[Step 2] Yes Pool: ${market.totalYesPool}`);
    runtime.log(`[Step 2] No Pool: ${market.totalNoPool}`);

    if (market.settled) {
      runtime.log("[Step 2] Market already settled, skipping...");
      return "Market already settled";
    }

    // ─────────────────────────────────────────────────────────────
    // Step 3: Query AI (HTTP)
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 3] Querying Gemini AI...");

    const geminiResult = askGemini(runtime, question);
    
    // Parse AI response (Structured Output ensures this is valid JSON)
    let parsed: GeminiResult;
    try {
      parsed = JSON.parse(geminiResult.geminiResponse.trim()) as GeminiResult;
    } catch (err) {
      // Fallback: Gemini sometimes still includes markdown code fences even with application/json
      const jsonMatch = geminiResult.geminiResponse.match(/\{[\s\S]*"result"[\s\S]*"confidence"[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]) as GeminiResult;
      } else {
        throw new Error(`Failed to parse AI response: ${geminiResult.geminiResponse}. ResponseID: ${geminiResult.responseId}`);
      }
    }

    // Validate the result - only YES or NO can settle a market
    if (!["YES", "NO"].includes(parsed.result)) {
      throw new Error(`Cannot settle: AI returned ${parsed.result}. Only YES or NO can settle a market.`);
    }
    if (parsed.confidence < 0 || parsed.confidence > 10000) {
      throw new Error(`Invalid confidence: ${parsed.confidence}`);
    }

    runtime.log(`[Step 3] AI Result: ${parsed.result}`);
    runtime.log(`[Step 3] AI Confidence: ${parsed.confidence / 100}%`);

    // Convert result string to Prediction enum value (0 = Yes, 1 = No)
    const outcomeValue = parsed.result === "YES" ? 0 : 1;

    // ─────────────────────────────────────────────────────────────
    // Step 4: Write settlement report to contract (EVM Write)
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 4] Generating settlement report...");

    // Encode settlement data
    const settlementData = encodeAbiParameters(SETTLEMENT_PARAMS, [
      marketId,
      outcomeValue,
      parsed.confidence,
    ]);

    // Prepend 0x01 prefix so contract routes to _settleMarket
    const reportData = ("0x01" + settlementData.slice(2)) as `0x${string}`;

    const reportResponse = runtime
      .report({
        encodedPayload: hexToBase64(reportData),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      })
      .result();

    runtime.log(`[Step 4] Writing to contract: ${evmConfig.marketAddress}`);

    const writeResult = evmClient
      .writeReport(runtime, {
        receiver: evmConfig.marketAddress,
        report: reportResponse,
        gasConfig: {
          gasLimit: evmConfig.gasLimit,
        },
      })
      .result();

    if (writeResult.txStatus === TxStatus.SUCCESS) {
      const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
      runtime.log(`[Step 4] ✓ Settlement successful: ${txHash}`);
      runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return `Settled: ${txHash}`;
    }

    throw new Error(`Transaction failed: ${writeResult.txStatus}`);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    runtime.log(`[ERROR] ${msg}`);
    runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw err;
  }
}
```

## Making a Prediction

Before requesting settlement, let's place a prediction on the market. This demonstrates the full flow - predictions with ETH, AI settlement, and winners claiming their share.

```bash
# Predict YES on market #0 with 0.01 ETH
# Prediction enum: 0 = Yes, 1 = No
cast send $MARKET_ADDRESS \
  "predict(uint256,uint8)" 0 0 \
  --value 0.01ether \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

We can then see the market details again:

```bash
cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

And even get our prediction only:

```bash
export PREDICTOR=0xYOUR_WALLET_ADDRESS
```

```bash
cast call $MARKET_ADDRESS \
  "getPrediction(uint256,address) returns ((uint256,uint8,bool))" \
  0 $PREDICTOR \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

You can have multiple participants predict - some YES, some NO. After CRE settles the market, winners can call `claim()` to receive their share of the total pool!

---

## Settle the Market

Now let's execute the complete settlement flow using the Log Trigger.

### Step 1: Request Settlement

First, trigger the `SettlementRequested` event from the smart contract:

```bash
cast send $MARKET_ADDRESS \
  "requestSettlement(uint256)" 0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

**Save the transaction hash!** You'll need it for the next step.

### Step 2: Run the Simulation

```bash
cre workflow simulate my-workflow --broadcast
```

### Step 3: Select Log Trigger

```bash
🚀 Workflow simulation ready. Please select a trigger:
1. http-trigger@1.0.0-alpha Trigger
2. evm:ChainSelector:16015286601757825753@1.0.0 LogTrigger

Enter your choice (1-2): 2
```

### Step 4: Enter Transaction Details

```bash
🔗 EVM Trigger Configuration:
Please provide the transaction hash and event index for the EVM log event.
Enter transaction hash (0x...):
```

Paste the transaction hash from Step 1.

### Step 5: Enter Event Index

```bash
Enter event index (0-based): 0
```

Enter **0**.

### Expected Output

```bash
[SIMULATION] Running trigger trigger=evm:ChainSelector:16015286601757825753@1.0.0
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] CRE Workflow: Log Trigger - Settle Market
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] [Step 1] Settlement requested for Market #0
[USER LOG] [Step 1] Question: "Will Argentina win the 2022 World Cup?"
[USER LOG] [Step 2] Reading market details from contract...
[USER LOG] [Step 2] Market creator: 0x...
[USER LOG] [Step 2] Already settled: false
[USER LOG] [Step 2] Yes Pool: 10000000000000000
[USER LOG] [Step 2] No Pool: 0
[USER LOG] [Step 3] Querying Gemini AI...
[USER LOG] [Gemini] Querying AI for market outcome...
[USER LOG] [Gemini] Response received: Argentina won the 2022 World Cup, defeating France in the final.

{"result": "YES", "confidence": 10000}
[USER LOG] [Step 3] AI Result: YES
[USER LOG] [Step 3] AI Confidence: 100%
[USER LOG] [Step 4] Generating settlement report...
[USER LOG] [Step 4] Writing to contract: 0x...
[USER LOG] [Step 4] ✓ Settlement successful: 0xabc123...
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Workflow Simulation Result:
 "Settled: 0xabc123..."

[SIMULATION] Execution finished signal received
```

### Step 6: Verify Settlement On-Chain

```bash
cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

You should see `settled: true` and the AI-determined outcome!

### Step 7: Claim Your Winnings

If you predicted the winning outcome, claim your share of the pool:

```bash
cast send $MARKET_ADDRESS \
  "claim(uint256)" 0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

---

## 🎉 You Did It!

**Congratulations!** You've just built and executed a complete AI-powered prediction market using CRE!

Let's recap what you accomplished:

| Capability | What You Built |
|------------|----------------|
| **HTTP Trigger** | Market creation via API requests |
| **Log Trigger** | Event-driven settlement automation |
| **EVM Read** | Reading market state from the blockchain |
| **HTTP (AI)** | Querying Gemini AI for real-world outcomes |
| **EVM Write** | Verified on-chain writes with DON consensus |

Your workflow now:
- ✅ Creates markets on-demand via HTTP
- ✅ Listens for settlement requests via blockchain events
- ✅ Reads market data from your smart contract
- ✅ Queries AI to determine real-world outcomes
- ✅ Writes verified settlements back on-chain
- ✅ Enables winners to claim their rewards

---

## Next Steps

Head to the final chapter for a complete end-to-end walkthrough and what's next for your CRE journey!
