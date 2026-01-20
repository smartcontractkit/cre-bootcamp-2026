# Wrap-Up: End-to-End & What's Next

You've built an AI-powered prediction market. Now let's walk through the complete flow from start to finish.

## Complete End-to-End Flow

Here's the full journey from market creation to claiming winnings:

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  0. DEPLOY CONTRACT (Foundry)                                   │
│     └─► forge create → PredictionMarket deployed on Sepolia     │
│                                                                 │
│  1. CREATE MARKET (HTTP Trigger)                                │
│     └─► HTTP Request → CRE Workflow → EVM Write → Market Live   │
│                                                                 │
│  2. PLACE PREDICTIONS (Direct Contract Calls)                   │
│     └─► Users call predict() with ETH stakes                    │
│                                                                 │
│  3. REQUEST SETTLEMENT (Direct Contract Call)                   │
│     └─► Anyone calls requestSettlement() → Emits Event          │
│                                                                 │
│  4. SETTLE MARKET (Log Trigger)                                 │
│     └─► Event → CRE Workflow → AI Query → EVM Write → Settled   │
│                                                                 │
│  5. CLAIM WINNINGS (Direct Contract Call)                       │
│     └─► Winners call claim() → Receive ETH payout               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 0: Deploy the Contract

```bash
source .env
cd prediction-market/contracts

forge create src/PredictionMarket.sol:PredictionMarket \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --broadcast \
  --constructor-args 0x15fc6ae953e024d975e77382eeec56a9101f9f88
```

Save the deployed address and update `config.staging.json`:

```bash
export MARKET_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
```

### Step 1: Create a Market

```bash
cd .. # make sure you are in the prediction-market directory
cre workflow simulate my-workflow --broadcast
```

Select HTTP trigger (option 1), then enter:

```json
{"question": "Will Argentina win the 2022 World Cup?"}
```

### Step 2: Place Predictions

```bash
# Predict YES on market #0 with 0.01 ETH
cast send $MARKET_ADDRESS \
  "predict(uint256,uint8)" 0 0 \
  --value 0.01ether \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

### Step 3: Request Settlement

```bash
cast send $MARKET_ADDRESS \
  "requestSettlement(uint256)" 0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

Save the transaction hash!

### Step 4: Settle via CRE

```bash
cre workflow simulate my-workflow --broadcast
```

Select Log trigger (option 2), enter the tx hash and event index 0.

### Step 5: Claim Winnings

```bash
cast send $MARKET_ADDRESS \
  "claim(uint256)" 0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

---


## What's Next?

### 🏆 Convergence: A Chainlink Hackathon

![cre-hackathon-2026](../assets/cre-hackathon-2026.png)

The **Convergence Hackathon** invites you to create advanced smart contracts using the Chainlink Runtime Environment, with $100K in prizes up for grabs.

Connect chains, data, AI, and enterprise systems - all in one workflow.

Put your new CRE skills to the test! Join the upcoming hackathon and build something amazing.

Register now 👉 **[hack.chain.link](https://hack.chain.link)**

Ideas to explore:
- Stablecoin Issuance
- Tokenized Asset Servicing and Lifecycle Management
- Custom Proof of Reserve Data Feed
- AI-Powered Prediction Market Settlement
- Event-driven Market Resolution using Off-chain data
- Automated Risk Monitoring
- Real-Time Reserve Health Checks
- Protocol Safeguard Triggers
- AI Agents Consuming CRE Workflows With x402 Payments
- AI Agent Blockchain Abstraction
- AI-Assisted CRE Workflow Generation
- Cross-chain Workflow Orchestration
- Decentralized Backend Workflows for Web3 Applications
- CRE Workflow Builders & Visualizers
- and more...

### 📚 Explore More Use Cases

Check out [5 Ways to Build with CRE](https://blog.chain.link/5-ways-to-build-with-cre/):

1. **Stablecoin Issuance** - Automated reserve verification
2. **Tokenized Asset Servicing** - Real-world asset management
3. **AI-Powered Prediction Markets** - You just built this!
4. **AI Agents with x402 Payments** - Autonomous agents
5. **Custom Proof of Reserve** - Transparency infrastructure

### 🔗 Useful CRE links

- [Consensus Computing](https://docs.chain.link/cre/concepts/consensus-computing)
- [Finality and Confidence Levels](https://docs.chain.link/cre/concepts/finality-ts)
- [Secrets Management](https://docs.chain.link/cre/guides/workflow/secrets)
- [Deploying Workflows](https://docs.chain.link/cre/guides/operations/deploying-workflows)
- [Monitoring & Debugging Workflows](https://docs.chain.link/cre/guides/operations/monitoring-workflows)

### 🚀 Deploy to Production

Ready to go live? Request Early Access:
- [cre.chain.link/request-access](https://cre.chain.link/request-access)

### 💬 Join the Community

- [Discord](https://discord.gg/chainlink) - Get help and share your builds
- [Developer Docs](https://docs.chain.link/cre) - Deep dive into CRE
- [GitHub](https://github.com/smartcontractkit) - Explore examples

---

## 🎉 Thank You!
