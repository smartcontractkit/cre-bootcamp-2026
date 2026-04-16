# Revisão & Perguntas

Bem-vindo de volta ao Dia 3! Vamos revisar o que aprendemos ontem e responder a quaisquer perguntas.

## Revisão do Dia 2

### O Que Construímos

Ontem, construímos um **workflow de criação de mercado**:

```
HTTP Request ──▶ CRE Workflow ──▶ PredictionMarket.sol
(pergunta)       (HTTP Trigger)   (createMarket)
```

### Conceitos Principais Abordados

| Conceito | O Que Aprendemos |
|----------|------------------|
| **PredictionMarket.sol** | A lógica do smart contract |
| **HTTP Trigger** | Recebendo requisições HTTP externas |
| **EVM Write** | O padrão de dois passos (report → writeReport) |
| **Workflow de Criação de Mercado** | Criando uma pergunta de mercado de previsão na Blockchain |

### O Padrão de Escrita em Dois Passos

Este é o padrão mais importante do Dia 2:

```typescript
// Passo 1: Codificar e assinar os dados
const reportResponse = runtime
  .report({
    encodedPayload: hexToBase64(reportData),
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
  })
  .result();

// Passo 2: Escrever no contrato
const writeResult = evmClient
  .writeReport(runtime, {
    receiver: contractAddress,
    report: reportResponse,
    gasConfig: { gasLimit: "500000" },
  })
  .result();
```

## Agenda de Hoje

Hoje vamos completar o mercado de previsão com:

1. **Log Trigger** - Reagir a eventos on-chain
2. **EVM Read** - Ler estado de smart contracts
3. **HTTP Capability** - Chamar o Gemini AI
4. **Fluxo Completo** - Conectar tudo

### Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                      Dia 3: Liquidação do Mercado               │
│                                                                 │
│   requestSettlement() ──▶ SettlementRequested Event             │
│                                   │                             │
│                                   ▼                             │
│                           CRE Log Trigger                       │
│                                   │                             │
│                    ┌──────────────┼───────────────────┐         │
│                    ▼              ▼                   ▼         │
│              EVM Read         Gemini AI           EVM Write     │
│           (dados do mercado) (determinar resultado) (liquidar)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Perguntas Frequentes

### P: Por que precisamos do padrão de escrita em dois passos?

**R:** O padrão de dois passos fornece:
- **Segurança**: O relatório é criptograficamente assinado pela DON
- **Verificação**: Seu contrato pode verificar que a assinatura veio do CRE
- **Consenso**: Múltiplos nós concordam com os dados antes de assinar

### P: O que acontece se minha transação falhar?

**R:** Verifique:
1. Sua carteira tem ETH suficiente para gas
2. O endereço do contrato está correto
3. O limite de gas é suficiente
4. A função do contrato aceita os dados codificados

### P: Como depuro problemas no workflow?

**R:** Use `runtime.log()` liberalmente:

```typescript
runtime.log(`[DEBUG] Value: ${JSON.stringify(data)}`);
```

Todos os logs aparecem na saída da simulação.

### P: Posso ter múltiplos triggers em um workflow?

**R:** Sim! É exatamente isso que faremos hoje. Um workflow pode ter até 10 triggers.

```typescript
const initWorkflow = (config: Config) => {
  return [
    cre.handler(httpTrigger, onHttpTrigger),
    cre.handler(logTrigger, onLogTrigger),
  ];
};
```

## Verificação Rápida do Ambiente

Antes de continuar, vamos verificar se está tudo configurado:

Verificar autenticação CRE
```bash
cre whoami
```

- No diretório prediction-market
- Carregar variáveis de ambiente do arquivo .env.
- Em um computador Windows, use `Git Bash` para executar os comandos desta seção.

```bash
source .env
```

Verificar se você tem mercados criados (saída decodificada)

```bash
export MARKET_ADDRESS=0xYOUR_CONTRACT_ADDRESS

cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

O resultado são os dados do mercado para o ID 0.

## Prontos para o Dia 3!

Vamos mergulhar nos Log Triggers e construir o workflow de liquidação.
