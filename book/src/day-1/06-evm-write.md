# Capability: EVM Write

The **EVM Write** capability allows your CRE workflow to write data to smart contracts on EVM-compatible blockchains. This is one of the most important patterns in CRE.

## Familiarize yourself with the capability

The EVM Write capability enables your workflow to submit cryptographically signed reports to smart contracts. Unlike traditional web3 applications that send transactions directly, CRE uses a secure two-step process:

1. **Generate a signed report** - Your data is ABI-encoded and wrapped in a cryptographically signed "package"
2. **Submit the report** - The signed report is submitted to your consumer contract via the Chainlink `KeystoneForwarder`

This approach ensures:
- **Decentralization**: Multiple nodes in the DON agree on what data to write
- **Verification**: The blockchain has cryptographic proof the data came from a trusted Chainlink network
- **Accountability**: A verifiable trail showing which workflow and owner created the data

### Creating the EVM client

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

### The two-step write process

#### Step 1: Generate a signed report

First, encode your data and generate a cryptographically signed report:

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

**Report parameters:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| `encodedPayload` | base64 string | Your ABI-encoded data (converted from hex) |
| `encoderName` | `"evm"` | For EVM-compatible chains |
| `signingAlgo` | `"ecdsa"` | Signature algorithm |
| `hashingAlgo` | `"keccak256"` | Hash algorithm |

#### Step 2: Submit the report

Submit the signed report to your consumer contract:

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

**WriteReport parameters:**

- `receiver`: `string` - The address of your consumer contract (must implement `IReceiver` interface)
- `report`: `ReportResponse` - The signed report from `runtime.report()`
- `gasConfig`: `{ gasLimit: string }` - Optional gas configuration

**Response:**

- `txStatus`: `TxStatus` - Transaction status (`SUCCESS`, `FAILURE`, etc.)
- `txHash`: `Uint8Array` - Transaction hash (convert with `bytesToHex()`)

### Consumer contracts

For a smart contract to receive data from CRE, it must implement the `IReceiver` interface. This interface defines a single `onReport()` function that the Chainlink `KeystoneForwarder` contract calls to deliver verified data.

While you can implement `IReceiver` manually, we recommend using `IReceiverTemplate` - an abstract contract that handles boilerplate like ERC165 support and metadata decoding, letting you focus on your business logic in `_processReport()`.

> The `MockKeystoneForwarder` contract, that we will use for simulations, on Ethereum Sepolia is located at: [https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code](https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code)


## Building Our EVM Write Workflow

Now let's complete the `httpCallback.ts` file we started in the previous chapter by adding the EVM Write capability to create markets on-chain.

### Update httpCallback.ts

Update `my-workflow/httpCallback.ts` with the complete code that includes writing to the blockchain:

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

## Running the Complete Workflow

### 1. Make sure your contract is deployed

Verify you have updated the `my-workflow/config.staging.json` with your deployed contract address:

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

### 2. Verify your .env file

The `.env` file was created earlier in the CRE project setup. Make sure it's in the `prediction-market` directory and contains:

```bash
# CRE Configuration
CRE_ETH_PRIVATE_KEY=your_private_key_here
CRE_TARGET=staging-settings
GEMINI_API_KEY_VAR=your_gemini_api_key_here
```

If you need to update it, edit the `.env` file in the `prediction-market` directory.

### 3. Simulate with broadcast

```bash
# From the prediction-market directory
cd prediction-market
cre workflow simulate my-workflow --broadcast
```

> **Note**: Make sure you're in the `prediction-market` directory (parent of `my-workflow`), and the `.env` file is in the `prediction-market` directory.

### 4. Select HTTP trigger and enter payload

```json
{"question": "Will Argentina win the 2022 World Cup?"}
```

### Expected Output

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

### 5. Verify on Block Explorer

Check the transaction on [Sepolia Etherscan](https://sepolia.etherscan.io).

### 6. Verify the market was created

You can verify the market was created by reading it from the contract:

```bash
export MARKET_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```
```bash
cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

This will return the market data for market ID 0, showing the creator, timestamps, settlement status, pools, and question.

## 🎉 Day 1 Complete!

You've successfully:
- ✅ Set up a CRE project
- ✅ Deployed a smart contract
- ✅ Built an HTTP-triggered workflow
- ✅ Written data to the blockchain

Tomorrow we'll add:
- Log Triggers (react to on-chain events)
- EVM Read (read contract state)
- AI Integration (Gemini API)
- Complete settlement flow

**See you tomorrow!**
