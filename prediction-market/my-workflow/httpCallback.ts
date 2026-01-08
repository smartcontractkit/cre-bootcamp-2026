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
