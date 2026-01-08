# CRE Bootcamp: AI-Powered Prediction Markets

A 2-day hands-on bootcamp for building with **Chainlink Runtime Environment (CRE)**.

> **Disclaimer**: This tutorial represents an educational example to use a Chainlink system, product, or service and is provided to demonstrate how to interact with Chainlink's systems, products, and services to integrate them into your own. This template is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, it has not been audited, and it may be missing key checks or error handling to make the usage of the system, product or service more clear. Do not use the code in this example in a production environment without completing your own audits and application of best practices. Neither Chainlink Labs, the Chainlink Foundation, nor Chainlink node operators are responsible for unintended outputs that are generated due to errors in code.

## What You'll Build

An AI-powered prediction market with:
- **HTTP Trigger** - Create markets via API requests
- **Log Trigger** - Event-driven settlement automation  
- **EVM Read** - Read market state from the blockchain
- **HTTP Capability** - Query Gemini AI for real-world outcomes
- **EVM Write** - Verified on-chain writes with DON consensus

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [CRE CLI](https://docs.chain.link/cre/getting-started/cli-installation)
- [Gemini API Key](https://aistudio.google.com/apikey)
- Sepolia ETH for gas

## Repository Structure

```
cre-bootcamp-2026/
├── book/                    # mdBook tutorial
│   └── src/                 # Markdown source files
└── prediction-market/       # Complete working example
    ├── contracts/           # Foundry smart contract
    └── my-workflow/         # CRE workflow (TypeScript)
```

## Getting Started

Follow the book at `book/src/` or build and serve it locally:

```bash
cd book
cargo install mdbook
mdbook serve --open
```

## Curriculum

**Day 1: Foundations + Market Creation**
- CRE Mental Model
- Project Setup
- Smart Contract Development
- HTTP Trigger & EVM Write

**Day 2: Complete Settlement Workflow**
- Log Trigger
- EVM Read
- AI Integration (Gemini)
- End-to-End Testing
