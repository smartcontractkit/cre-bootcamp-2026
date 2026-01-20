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
│     → Your stake * (Total Pool / Winning Pool)                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Building CRE-Compatible Contracts

For a smart contract to receive data from CRE, it must implement the `IReceiver` interface. This interface defines a single `onReport()` function that the Chainlink `KeystoneForwarder` contract calls to deliver verified data.

```js
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title IReceiver - receives keystone reports
/// @notice Implementations must support the IReceiver interface through ERC165.
interface IReceiver is IERC165 {
  /// @notice Handles incoming keystone reports.
  /// @dev If this function call reverts, it can be retried with a higher gas
  /// limit. The receiver is responsible for discarding stale reports.
  /// @param metadata Report's metadata.
  /// @param report Workflow report.
  function onReport(bytes calldata metadata, bytes calldata report) external;
}
```

While you can implement `IReceiver` manually, we recommend using `ReceiverTemplate` - an abstract contract that handles boilerplate like ERC165 support, metadata decoding, and security checks (forwarder validation), letting you focus on your business logic in `_processReport()`.

> The `MockKeystoneForwarder` contract, that we will use for simulations, on Ethereum Sepolia is located at: [https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code](https://sepolia.etherscan.io/address/0x15fc6ae953e024d975e77382eeec56a9101f9f88#code)

Here's how CRE delivers data to your contract:

1. **CRE doesn't call your contract directly** - it submits a signed report to a Chainlink `KeystoneForwarder` contract
2. **The forwarder validates signatures** - ensuring the report came from a trusted DON
3. **The forwarder calls `onReport()`** - delivering the verified data to your contract
4. **You decode and process** - extract the data from the report bytes

This two-step pattern (workflow → forwarder → your contract) ensures cryptographic verification of all data before it reaches your contract.

## The Contract Code

```js
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReceiverTemplate} from "./interfaces/ReceiverTemplate.sol";

/// @title PredictionMarket
/// @notice A simplified prediction market for CRE bootcamp.
contract PredictionMarket is ReceiverTemplate {
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

    /// @notice Constructor sets the Chainlink Forwarder address for security
    /// @param _forwarderAddress The address of the Chainlink KeystoneForwarder contract
    /// @dev For Sepolia testnet, use: 0x15fc6ae953e024d975e77382eeec56a9101f9f88
    constructor(address _forwarderAddress) ReceiverTemplate(_forwarderAddress) {}

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

    /// @inheritdoc ReceiverTemplate
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

```js
event SettlementRequested(uint256 indexed marketId, string question);
```

This event is what CRE's **Log Trigger** listens for. When emitted, CRE automatically runs the settlement workflow.

### 2. The `onReport` Function

The `ReceiverTemplate` base contract handles `onReport()` automatically, including security checks to ensure only the trusted Chainlink KeystoneForwarder can call it. Your contract only needs to implement `_processReport()` to handle the decoded report data.

CRE calls `onReport()` via the KeystoneForwarder to deliver settlement results. The `report` contains `(marketId, outcome, confidence)` ABI-encoded.

## Setting Up the Foundry Project

We'll create a new Foundry project for our smart contract. From your `prediction-market` directory:

```bash
# Create a new Foundry project
forge init contracts
```

You'll see:
```bash
Initializing forge project...
Installing dependencies...
Installed forge-std
```

### Create the Contract Files

1. **Create the interface directory:**
```bash
cd contracts
mkdir -p src/interfaces
```

2. **Install OpenZeppelin Contracts (required by ReceiverTemplate):**
```bash
forge install OpenZeppelin/openzeppelin-contracts
```

3. **Create the interface files:**

**Create `src/interfaces/IReceiver.sol`:**
```js
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface IReceiver is IERC165 {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}
```

**Create `src/interfaces/ReceiverTemplate.sol`:**

The `ReceiverTemplate` provides forwarder address validation, optional workflow validation, ERC165 support, and metadata decoding utilities. Copy the full implementation:

```js
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IReceiver} from "./IReceiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ReceiverTemplate - Abstract receiver with optional permission controls
/// @notice Provides flexible, updatable security checks for receiving workflow reports
/// @dev The forwarder address is required at construction time for security.
///      Additional permission fields can be configured using setter functions.
abstract contract ReceiverTemplate is IReceiver, Ownable {
  // Required permission field at deployment, configurable after
  address private s_forwarderAddress; // If set, only this address can call onReport

  // Optional permission fields (all default to zero = disabled)
  address private s_expectedAuthor; // If set, only reports from this workflow owner are accepted
  bytes10 private s_expectedWorkflowName; // Only validated when s_expectedAuthor is also set
  bytes32 private s_expectedWorkflowId; // If set, only reports from this specific workflow ID are accepted

  // Hex character lookup table for bytes-to-hex conversion
  bytes private constant HEX_CHARS = "0123456789abcdef";

  // Custom errors
  error InvalidForwarderAddress();
  error InvalidSender(address sender, address expected);
  error InvalidAuthor(address received, address expected);
  error InvalidWorkflowName(bytes10 received, bytes10 expected);
  error InvalidWorkflowId(bytes32 received, bytes32 expected);
  error WorkflowNameRequiresAuthorValidation();

  // Events
  event ForwarderAddressUpdated(address indexed previousForwarder, address indexed newForwarder);
  event ExpectedAuthorUpdated(address indexed previousAuthor, address indexed newAuthor);
  event ExpectedWorkflowNameUpdated(bytes10 indexed previousName, bytes10 indexed newName);
  event ExpectedWorkflowIdUpdated(bytes32 indexed previousId, bytes32 indexed newId);
  event SecurityWarning(string message);

  /// @notice Constructor sets msg.sender as the owner and configures the forwarder address
  /// @param _forwarderAddress The address of the Chainlink Forwarder contract (cannot be address(0))
  /// @dev The forwarder address is required for security - it ensures only verified reports are processed
  constructor(
    address _forwarderAddress
  ) Ownable(msg.sender) {
    if (_forwarderAddress == address(0)) {
      revert InvalidForwarderAddress();
    }
    s_forwarderAddress = _forwarderAddress;
    emit ForwarderAddressUpdated(address(0), _forwarderAddress);
  }

  /// @notice Returns the configured forwarder address
  /// @return The forwarder address (address(0) if disabled)
  function getForwarderAddress() external view returns (address) {
    return s_forwarderAddress;
  }

  /// @notice Returns the expected workflow author address
  /// @return The expected author address (address(0) if not set)
  function getExpectedAuthor() external view returns (address) {
    return s_expectedAuthor;
  }

  /// @notice Returns the expected workflow name
  /// @return The expected workflow name (bytes10(0) if not set)
  function getExpectedWorkflowName() external view returns (bytes10) {
    return s_expectedWorkflowName;
  }

  /// @notice Returns the expected workflow ID
  /// @return The expected workflow ID (bytes32(0) if not set)
  function getExpectedWorkflowId() external view returns (bytes32) {
    return s_expectedWorkflowId;
  }

  /// @inheritdoc IReceiver
  /// @dev Performs optional validation checks based on which permission fields are set
  function onReport(
    bytes calldata metadata,
    bytes calldata report
  ) external override {
    // Security Check 1: Verify caller is the trusted Chainlink Forwarder (if configured)
    if (s_forwarderAddress != address(0) && msg.sender != s_forwarderAddress) {
      revert InvalidSender(msg.sender, s_forwarderAddress);
    }

    // Security Checks 2-4: Verify workflow identity - ID, owner, and/or name (if any are configured)
    if (s_expectedWorkflowId != bytes32(0) || s_expectedAuthor != address(0) || s_expectedWorkflowName != bytes10(0)) {
      (bytes32 workflowId, bytes10 workflowName, address workflowOwner) = _decodeMetadata(metadata);

      if (s_expectedWorkflowId != bytes32(0) && workflowId != s_expectedWorkflowId) {
        revert InvalidWorkflowId(workflowId, s_expectedWorkflowId);
      }
      if (s_expectedAuthor != address(0) && workflowOwner != s_expectedAuthor) {
        revert InvalidAuthor(workflowOwner, s_expectedAuthor);
      }

      // ================================================================
      // WORKFLOW NAME VALIDATION - REQUIRES AUTHOR VALIDATION
      // ================================================================
      // Do not rely on workflow name validation alone. Workflow names are unique
      // per owner, but not across owners.
      // Furthermore, workflow names use 40-bit truncation (bytes10), making collisions possible.
      // Therefore, workflow name validation REQUIRES author (workflow owner) validation.
      // The code enforces this dependency at runtime.
      // ================================================================
      if (s_expectedWorkflowName != bytes10(0)) {
        // Author must be configured if workflow name is used
        if (s_expectedAuthor == address(0)) {
          revert WorkflowNameRequiresAuthorValidation();
        }
        // Validate workflow name matches (author already validated above)
        if (workflowName != s_expectedWorkflowName) {
          revert InvalidWorkflowName(workflowName, s_expectedWorkflowName);
        }
      }
    }

    _processReport(report);
  }

  /// @notice Updates the forwarder address that is allowed to call onReport
  /// @param _forwarder The new forwarder address
  /// @dev WARNING: Setting to address(0) disables forwarder validation.
  ///      This makes your contract INSECURE - anyone can call onReport() with arbitrary data.
  ///      Only use address(0) if you fully understand the security implications.
  function setForwarderAddress(
    address _forwarder
  ) external onlyOwner {
    address previousForwarder = s_forwarderAddress;

    // Emit warning if disabling forwarder check
    if (_forwarder == address(0)) {
      emit SecurityWarning("Forwarder address set to zero - contract is now INSECURE");
    }

    s_forwarderAddress = _forwarder;
    emit ForwarderAddressUpdated(previousForwarder, _forwarder);
  }

  /// @notice Updates the expected workflow owner address
  /// @param _author The new expected author address (use address(0) to disable this check)
  function setExpectedAuthor(
    address _author
  ) external onlyOwner {
    address previousAuthor = s_expectedAuthor;
    s_expectedAuthor = _author;
    emit ExpectedAuthorUpdated(previousAuthor, _author);
  }

  /// @notice Updates the expected workflow name from a plaintext string
  /// @param _name The workflow name as a string (use empty string "" to disable this check)
  /// @dev IMPORTANT: Workflow name validation REQUIRES author validation to be enabled.
  ///      The workflow name uses only 40-bit truncation, making collision attacks feasible
  ///      when used alone. However, since workflow names are unique per owner, validating
  ///      both the name AND the author address provides adequate security.
  ///      You must call setExpectedAuthor() before or after calling this function.
  ///      The name is hashed using SHA256 and truncated to bytes10.
  function setExpectedWorkflowName(
    string calldata _name
  ) external onlyOwner {
    bytes10 previousName = s_expectedWorkflowName;

    if (bytes(_name).length == 0) {
      s_expectedWorkflowName = bytes10(0);
      emit ExpectedWorkflowNameUpdated(previousName, bytes10(0));
      return;
    }

    // Convert workflow name to bytes10:
    // SHA256 hash → hex encode → take first 10 chars → hex encode those chars
    bytes32 hash = sha256(bytes(_name));
    bytes memory hexString = _bytesToHexString(abi.encodePacked(hash));
    bytes memory first10 = new bytes(10);
    for (uint256 i = 0; i < 10; i++) {
      first10[i] = hexString[i];
    }
    s_expectedWorkflowName = bytes10(first10);
    emit ExpectedWorkflowNameUpdated(previousName, s_expectedWorkflowName);
  }

  /// @notice Updates the expected workflow ID
  /// @param _id The new expected workflow ID (use bytes32(0) to disable this check)
  function setExpectedWorkflowId(
    bytes32 _id
  ) external onlyOwner {
    bytes32 previousId = s_expectedWorkflowId;
    s_expectedWorkflowId = _id;
    emit ExpectedWorkflowIdUpdated(previousId, _id);
  }

  /// @notice Helper function to convert bytes to hex string
  /// @param data The bytes to convert
  /// @return The hex string representation
  function _bytesToHexString(
    bytes memory data
  ) private pure returns (bytes memory) {
    bytes memory hexString = new bytes(data.length * 2);

    for (uint256 i = 0; i < data.length; i++) {
      hexString[i * 2] = HEX_CHARS[uint8(data[i] >> 4)];
      hexString[i * 2 + 1] = HEX_CHARS[uint8(data[i] & 0x0f)];
    }

    return hexString;
  }

  /// @notice Extracts all metadata fields from the onReport metadata parameter
  /// @param metadata The metadata bytes encoded using abi.encodePacked(workflowId, workflowName, workflowOwner)
  /// @return workflowId The unique identifier of the workflow (bytes32)
  /// @return workflowName The name of the workflow (bytes10)
  /// @return workflowOwner The owner address of the workflow
  function _decodeMetadata(
    bytes memory metadata
  ) internal pure returns (bytes32 workflowId, bytes10 workflowName, address workflowOwner) {
    // Metadata structure (encoded using abi.encodePacked by the Forwarder):
    // - First 32 bytes: length of the byte array (standard for dynamic bytes)
    // - Offset 32, size 32: workflow_id (bytes32)
    // - Offset 64, size 10: workflow_name (bytes10)
    // - Offset 74, size 20: workflow_owner (address)
    assembly {
      workflowId := mload(add(metadata, 32))
      workflowName := mload(add(metadata, 64))
      workflowOwner := shr(mul(12, 8), mload(add(metadata, 74)))
    }
    return (workflowId, workflowName, workflowOwner);
  }

  /// @notice Abstract function to process the report data
  /// @param report The report calldata containing your workflow's encoded data
  /// @dev Implement this function with your contract's business logic
  function _processReport(
    bytes calldata report
  ) internal virtual;

  /// @inheritdoc IERC165
  function supportsInterface(
    bytes4 interfaceId
  ) public pure virtual override returns (bool) {
    return interfaceId == type(IReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
  }
}
```

4. **Update `foundry.toml` to add OpenZeppelin remapping:**
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
remappings = [
    "@openzeppelin/=lib/openzeppelin-contracts/"
]
```

5. **Create `src/PredictionMarket.sol`** with the contract code shown above.

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
    │       ├── IReceiver.sol
    │       └── ReceiverTemplate.sol
    └── test/                 # Tests (optional)
```

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

# Deploy with the MockKeystoneForwarder address for Sepolia
forge create src/PredictionMarket.sol:PredictionMarket \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --broadcast \
  --constructor-args 0x15fc6ae953e024d975e77382eeec56a9101f9f88
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

We set `gasLimit` to `500000` for this example because that's sufficient, but other use cases may consume more gas.

> **Note**: We'll create markets via the HTTP trigger workflow in the next chapters. For now, you just need the contract deployed!

## Summary

You now have:
- ✅ A deployed `PredictionMarket` contract on Sepolia
- ✅ An event (`SettlementRequested`) that CRE can listen for
- ✅ A function (`onReport`) that CRE can call with AI-determined results
- ✅ Winner payout logic after settlement
