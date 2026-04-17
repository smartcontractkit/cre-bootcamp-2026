# Encerramento: Ponta a Ponta & Próximos Passos

Você construiu um mercado de previsão com IA. 

Agora vamos percorrer o fluxo completo do início ao fim.

## Fluxo Completo Ponta a Ponta

Aqui está a jornada completa desde a criação do mercado até o resgate dos ganhos:

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  0. DEPLOY DO CONTRATO (Foundry)                                │
│     └─► forge create → PredictionMarket implantado na Sepolia   │
│                                                                 │
│  1. CRIAR MERCADO (HTTP Trigger)                                │
│     └─► HTTP Request → CRE Workflow → EVM Write → Mercado Ativo│
│                                                                 │
│  2. FAZER PREVISÕES (Chamadas Diretas ao Contrato)              │
│     └─► Usuários chamam predict() com apostas em ETH            │
│                                                                 │
│  3. SOLICITAR LIQUIDAÇÃO (Chamada Direta ao Contrato)           │
│     └─► Qualquer um chama requestSettlement() → Emite Evento    │
│                                                                 │
│  4. LIQUIDAR MERCADO (Log Trigger)                              │
│     └─► Evento → CRE Workflow → Consulta IA → EVM Write → Liquidado │
│                                                                 │
│  5. RESGATAR GANHOS (Chamada Direta ao Contrato)                │
│     └─► Vencedores chamam claim() → Recebem pagamento em ETH   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Passo 0: Deploy do Contrato

```bash
source .env
cd prediction-market/contracts

forge create src/PredictionMarket.sol:PredictionMarket \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --broadcast \
  --constructor-args 0x15fc6ae953e024d975e77382eeec56a9101f9f88
```

Salve o endereço implantado e atualize `config.staging.json`:

```bash
export MARKET_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
```

### Passo 1: Criar um Mercado

```bash
cd .. # certifique-se de estar no diretório prediction-market
cre workflow simulate my-workflow --broadcast
```

Selecione HTTP trigger (opção 1), depois insira:

```json
{"question": "Will Argentina win the 2022 World Cup?"}
```

### Passo 2: Fazer Previsões

```bash
# Prever YES no mercado #0 com 0.01 ETH
cast send $MARKET_ADDRESS \
  "predict(uint256,uint8)" 0 0 \
  --value 0.01ether \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

### Passo 3: Solicitar Liquidação

```bash
cast send $MARKET_ADDRESS \
  "requestSettlement(uint256)" 0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

Salve o hash da transação!

### Passo 4: Liquidar via CRE

```bash
cre workflow simulate my-workflow --broadcast
```

Selecione Log trigger (opção 2), insira o hash da tx e índice do evento 0.

### Passo 5: Resgatar Ganhos

```bash
cast send $MARKET_ADDRESS \
  "claim(uint256)" 0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

> Em um computador Windows, use `Git Bash` para executar todos os comandos foundry, como **forge**, **cast**, ou outros comandos baseados em Unix, como **export**.

---


## O Que Vem a Seguir?

### 📚 Explore Casos de Uso

Confira [5 Ways to Build with CRE](https://blog.chain.link/5-ways-to-build-with-cre/):

1. **Emissão de Stablecoins** - Verificação automatizada de reservas
2. **Serviço de Ativos Tokenizados** - Gestão de ativos do mundo real
3. **Mercados de Previsão com IA** - Você acabou de construir isso!
4. **Agentes de IA com Pagamentos x402** - Agentes autônomos
5. **Prova de Reserva Personalizada** - Infraestrutura de transparência


### 🏆 Explore Convergence: Um Hackathon Chainlink

![cre-hackathon-2026](../assets/cre-hackathon-2026.png)

Este Hackathon da Chainlink reuniu desenvolvedores de todo o mundo para construir aplicações avançadas aproveitando a plataforma Chainlink.

[Anunciando os Vencedores](https://blog.chain.link/convergence-hackathon-winners/)
[Explore os projetos vencedores](https://chain.link/hackathon/winners)


### 🔗 Links Úteis sobre CRE

- [Computação por Consenso](https://docs.chain.link/cre/concepts/consensus-computing)
- [Finalidade e Níveis de Confiança](https://docs.chain.link/cre/concepts/finality-ts)
- [Gerenciamento de Secrets](https://docs.chain.link/cre/guides/workflow/secrets)
- [Deploy de Workflows](https://docs.chain.link/cre/guides/operations/deploying-workflows)
- [Monitoramento e Debug de Workflows](https://docs.chain.link/cre/guides/operations/monitoring-workflows)

### 🚀 Deploy em Produção

Pronto para ir ao vivo? Solicite Acesso Antecipado:
- [cre.chain.link/request-access](https://cre.chain.link/request-access)

### 💬 Junte-se à Comunidade

- [Discord](https://discord.gg/chainlink) - Obtenha ajuda e compartilhe suas construções
- [Documentação para Desenvolvedores](https://docs.chain.link/cre) - Aprofunde-se no CRE
- [GitHub](https://github.com/smartcontractkit) - Explore exemplos

---

## 🎉 Obrigado!
