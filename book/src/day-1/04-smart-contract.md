# Smart Contract: PredictionMarket.sol

Now let's deploy the smart contract that our CRE workflow will interact with.

## How It Works

Our prediction market supports four key actions:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PREDICTION MARKET FLOW                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. CREATE MARKET                                                       │
│     Anyone creates a market with a Yes/No question                      │
│     Example: "Will Argentina win the 2022 World Cup?"                   │
│                                                                         │
│  2. PREDICT                                                             │
│     Users stake ETH on Yes or No                                        │
│     → Funds go into Yes Pool or No Pool                                 │
│                                                                         │
│  3. REQUEST SETTLEMENT                                                  │
│     Anyone can request settlement                                       │
│     → Emits SettlementRequested event                                   │
│     → CRE Log Trigger detects event                                     │
│     → CRE asks Gemini AI for the answer                                 │
│     → CRE writes outcome back via onReport()                            │
│                                                                         │
│  4. CLAIM WINNINGS                                                      │
│     Winners claim their share of the total pool                         │
│     → Your stake × (Total Pool / Winning Pool)                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Building CRE-Compatible Contracts

For a smart contract to receive data from CRE, it must implement the `IReceiver` interface. This interface defines a single `onReport()` function that the Chainlink `KeystoneForwarder` contract calls to deliver verified data.

While you can implement `IReceiver` manually, we recommend using `IReceiverTemplate` - an abstract contract that handles boilerplate like ERC165 support and metadata decoding, letting you focus on your business logic in `_processReport()`.

> The `MockKeystoneForwarder` contract, that we will use for simulations, on Ethereum Sepolia is located at: [https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code](https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code)

Here's how CRE delivers data to your contract:

1. **CRE doesn't call your contract directly** - it submits a signed report to a Chainlink `KeystoneForwarder` contract
2. **The forwarder validates signatures** - ensuring the report came from a trusted DON
3. **The forwarder calls `onReport()`** - delivering the verified data to your contract
4. **You decode and process** - extract the data from the report bytes

This two-step pattern (workflow → forwarder → your contract) ensures cryptographic verification of all data before it reaches your contract.

## The Contract Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IReceiverTemplate} from "./interfaces/IReceiverTemplate.sol";

/// @title PredictionMarket
/// @notice A simplified prediction market for CRE bootcamp.
contract PredictionMarket is IReceiverTemplate {
    error MarketDoesNotExist();
    error MarketAlreadySettled();
    error MarketNotSettled();
    error AlreadyPredicted();
    error InvalidAmount();
    error NothingToClaim();
    error AlreadyClaimed();
    error TransferFailed();

    event MarketCreated(uint256 indexed marketId, string question, address creator);
    event PredictionMade(uint256 indexed marketId, address indexed predictor, Prediction prediction, uint256 amount);
    event SettlementRequested(uint256 indexed marketId, string question);
    event MarketSettled(uint256 indexed marketId, Prediction outcome, uint16 confidence);
    event WinningsClaimed(uint256 indexed marketId, address indexed claimer, uint256 amount);

    enum Prediction {
        Yes,
        No
    }

    struct Market {
        address creator;
        uint48 createdAt;
        uint48 settledAt;
        bool settled;
        uint16 confidence;
        Prediction outcome;
        uint256 totalYesPool;
        uint256 totalNoPool;
        string question;
    }

    struct UserPrediction {
        uint256 amount;
        Prediction prediction;
        bool claimed;
    }

    uint256 internal nextMarketId;
    mapping(uint256 marketId => Market market) internal markets;
    mapping(uint256 marketId => mapping(address user => UserPrediction)) internal predictions;

    constructor() IReceiverTemplate(address(0), bytes10("")) {}

    // ================================================================
    // │                       Create market                          │
    // ================================================================

    /// @notice Create a new prediction market.
    /// @param question The question for the market.
    /// @return marketId The ID of the newly created market.
    function createMarket(string memory question) public returns (uint256 marketId) {
        marketId = nextMarketId++;

        markets[marketId] = Market({
            creator: msg.sender,
            createdAt: uint48(block.timestamp),
            settledAt: 0,
            settled: false,
            confidence: 0,
            outcome: Prediction.Yes,
            totalYesPool: 0,
            totalNoPool: 0,
            question: question
        });

        emit MarketCreated(marketId, question, msg.sender);
    }

    // ================================================================
    // │                          Predict                             │
    // ================================================================

    /// @notice Make a prediction on a market.
    /// @param marketId The ID of the market.
    /// @param prediction The prediction (Yes or No).
    function predict(uint256 marketId, Prediction prediction) external payable {
        Market memory m = markets[marketId];

        if (m.creator == address(0)) revert MarketDoesNotExist();
        if (m.settled) revert MarketAlreadySettled();
        if (msg.value == 0) revert InvalidAmount();

        UserPrediction memory userPred = predictions[marketId][msg.sender];
        if (userPred.amount != 0) revert AlreadyPredicted();

        predictions[marketId][msg.sender] = UserPrediction({
            amount: msg.value,
            prediction: prediction,
            claimed: false
        });

        if (prediction == Prediction.Yes) {
            markets[marketId].totalYesPool += msg.value;
        } else {
            markets[marketId].totalNoPool += msg.value;
        }

        emit PredictionMade(marketId, msg.sender, prediction, msg.value);
    }

    // ================================================================
    // │                    Request settlement                        │
    // ================================================================

    /// @notice Request settlement for a market.
    /// @dev Emits SettlementRequested event for CRE Log Trigger.
    /// @param marketId The ID of the market to settle.
    function requestSettlement(uint256 marketId) external {
        Market memory m = markets[marketId];

        if (m.creator == address(0)) revert MarketDoesNotExist();
        if (m.settled) revert MarketAlreadySettled();

        emit SettlementRequested(marketId, m.question);
    }

    // ================================================================
    // │                 Market settlement by CRE                     │
    // ================================================================

    /// @notice Settles a market from a CRE report with AI-determined outcome.
    /// @dev Called via onReport → _processReport when prefix byte is 0x01.
    /// @param report ABI-encoded (uint256 marketId, Prediction outcome, uint16 confidence)
    function _settleMarket(bytes calldata report) internal {
        (uint256 marketId, Prediction outcome, uint16 confidence) = abi.decode(
            report,
            (uint256, Prediction, uint16)
        );

        Market memory m = markets[marketId];

        if (m.creator == address(0)) revert MarketDoesNotExist();
        if (m.settled) revert MarketAlreadySettled();

        markets[marketId].settled = true;
        markets[marketId].confidence = confidence;
        markets[marketId].settledAt = uint48(block.timestamp);
        markets[marketId].outcome = outcome;

        emit MarketSettled(marketId, outcome, confidence);
    }

    // ================================================================
    // │                      CRE Entry Point                         │
    // ================================================================

    /// @inheritdoc IReceiverTemplate
    /// @dev TODO: Restrict this to be called only by the Chainlink KeystoneForwarder.
    function onReport(bytes calldata, bytes calldata report) external override {
        _processReport(report);
    }

    /// @inheritdoc IReceiverTemplate
    /// @dev Routes to either market creation or settlement based on prefix byte.
    ///      - No prefix → Create market (Day 1)
    ///      - Prefix 0x01 → Settle market (Day 2)
    function _processReport(bytes calldata report) internal override {
        if (report.length > 0 && report[0] == 0x01) {
            _settleMarket(report[1:]);
        } else {
            string memory question = abi.decode(report, (string));
            createMarket(question);
        }
    }

    // ================================================================
    // │                      Claim winnings                          │
    // ================================================================

    /// @notice Claim winnings after market settlement.
    /// @param marketId The ID of the market.
    function claim(uint256 marketId) external {
        Market memory m = markets[marketId];

        if (m.creator == address(0)) revert MarketDoesNotExist();
        if (!m.settled) revert MarketNotSettled();

        UserPrediction memory userPred = predictions[marketId][msg.sender];

        if (userPred.amount == 0) revert NothingToClaim();
        if (userPred.claimed) revert AlreadyClaimed();
        if (userPred.prediction != m.outcome) revert NothingToClaim();

        predictions[marketId][msg.sender].claimed = true;

        uint256 totalPool = m.totalYesPool + m.totalNoPool;
        uint256 winningPool = m.outcome == Prediction.Yes ? m.totalYesPool : m.totalNoPool;
        uint256 payout = (userPred.amount * totalPool) / winningPool;

        (bool success,) = msg.sender.call{value: payout}("");
        if (!success) revert TransferFailed();

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    // ================================================================
    // │                          Getters                             │
    // ================================================================

    /// @notice Get market details.
    /// @param marketId The ID of the market.
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    /// @notice Get user's prediction for a market.
    /// @param marketId The ID of the market.
    /// @param user The user's address.
    function getPrediction(uint256 marketId, address user) external view returns (UserPrediction memory) {
        return predictions[marketId][user];
    }
}
```

## Key CRE Integration Points

### 1. The `SettlementRequested` Event

```solidity
event SettlementRequested(uint256 indexed marketId, string question);
```

This event is what CRE's **Log Trigger** listens for. When emitted, CRE automatically runs the settlement workflow.

### 2. The `onReport` Function

```solidity
/// @dev Called by CRE via the KeystoneForwarder
function onReport(bytes calldata, bytes calldata report) external override {
    _processReport(report);
}
```

CRE calls this function to deliver settlement results. The `report` contains `(marketId, outcome, confidence)` ABI-encoded.

## Setting Up the Foundry Project

We'll create a new Foundry project for our smart contract. From your `prediction-market` directory:

```bash
# Create a new Foundry project
forge init contracts --no-git

cd contracts
```

You'll see:
```bash
Initializing forge project...
Installing dependencies...
Installed forge-std
```

### Project Structure

Your complete project structure now includes both the CRE workflow and the Foundry contracts:

```bash
prediction-market/
├── project.yaml              # CRE project-wide settings
├── secrets.yaml              # CRE secret variable mappings
├── my-workflow/              # CRE workflow directory
│   ├── workflow.yaml         # Workflow-specific settings
│   ├── main.ts               # Workflow entry point
│   ├── config.staging.json   # Configuration for simulation
│   ├── package.json          # Node.js dependencies
│   └── tsconfig.json         # TypeScript configuration
└── contracts/                # Foundry project (newly created)
    ├── foundry.toml          # Foundry configuration
    ├── script/               # Deployment scripts (we won't use these)
    ├── src/
    │   ├── PredictionMarket.sol
    │   └── interfaces/
    │       └── IReceiverTemplate.sol
    └── test/                 # Tests (optional)
```

### Create the Contract Files

1. **Create the interface directory:**
```bash
mkdir -p src/interfaces
```

2. **Create `src/interfaces/IReceiverTemplate.sol`:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IReceiverTemplate
/// @notice Interface for contracts that receive reports from CRE workflows.
/// @dev Implement this interface to allow your contract to receive signed reports from CRE.
abstract contract IReceiverTemplate {
    /// @notice Called by CRE to deliver a signed report.
    /// @param metadata Metadata about the report.
    /// @param report The ABI-encoded report data.
    function onReport(bytes calldata metadata, bytes calldata report) external virtual;

    /// @notice Internal function to process the report data.
    /// @dev Override this in your contract to handle the decoded report.
    /// @param report The ABI-encoded report data.
    function _processReport(bytes calldata report) internal virtual;

    constructor(address, bytes10) {}
}
```

3. **Create `src/PredictionMarket.sol`** with the contract code shown above.

### Compile the Contract

```bash
forge build
```

You should see:
```bash
Compiler run successful!
```

## Deploying the Contract

We'll use the `.env` file we created earlier. Load the environment variables and deploy:

```bash
# From the contracts directory
# Load environment variables from .env file
source ../.env

# Deploy
forge create src/PredictionMarket.sol:PredictionMarket \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --broadcast
```

> **Note**: The `source ../.env` command loads variables from the `.env` file in the `prediction-market` directory (parent of `contracts`).

You'll see output like:
```bash
Deployer: 0x...
Deployed to: 0x...   <-- Save this address!
Transaction hash: 0x...
```

## After Deployment

**Save your contract address!** Update your CRE workflow config:

```bash
cd ../my-workflow
```

Update `config.staging.json`:

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

> **Note**: We'll create markets via the HTTP trigger workflow in the next chapters. For now, you just need the contract deployed!

## Summary

You now have:
- ✅ A deployed `PredictionMarket` contract on Sepolia
- ✅ An event (`SettlementRequested`) that CRE can listen for
- ✅ A function (`onReport`) that CRE can call with AI-determined results
- ✅ Winner payout logic after settlement
