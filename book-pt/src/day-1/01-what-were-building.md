# O Que Vamos Construir

## O Caso de Uso: Mercados de Previsão com IA

Estamos construindo um **Mercado de Previsão On-chain com IA** - um sistema completo onde:

1. **Mercados on-chain são criados** via workflows CRE acionados por HTTP
2. **Usuários fazem previsões** apostando ETH em Sim ou Não
3. **Usuários podem solicitar a liquidação** de qualquer mercado
4. **O CRE detecta automaticamente** solicitações de liquidação via Log Triggers
5. **O Google Gemini AI** determina o resultado do mercado
6. **O CRE escreve** o resultado verificado de volta on-chain
7. **Vencedores resgatam** sua parte do pool total → `Sua aposta * (Pool Total / Pool Vencedor)`


## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Dia 2: Criação de Mercado                │
│                                                                 │
│   HTTP Request ──▶ CRE Workflow ──▶ PredictionMarket.sol        │
│   (pergunta)       (HTTP Trigger)   (createMarket)              │
└─────────────────────────────────────────────────────────────────┘

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

## Objetivos de Aprendizado

Após completar este bootcamp, você será capaz de:

- ✅ **Explicar** o que é o CRE e quando usá-lo
- ✅ **Criar um modelo de negócios** usando CRE
- ✅ **Desenvolver e simular** workflows CRE em TypeScript
- ✅ **Usar** todos os triggers do CRE (CRON, HTTP, Log) e capabilities (HTTP, EVM Read, EVM Write)
- ✅ **Conectar** serviços de IA a smart contracts através de workflows verificáveis
- ✅ **Construir** smart contracts compatíveis com a capability de escrita on-chain do CRE


## O Que Você Vai Aprender

### 📅 Dia 1: Pré-requisitos, Fundamentos e Mentalidade de Negócios CRE

| Tópico | O Que Você Vai Aprender |
|--------|-------------------------|
| Configuração do CRE CLI | Instalar ferramentas, criar conta, verificar configuração |
| Modelo Mental do CRE | O que é o CRE, Workflows, Capabilities, DONs |
| Criando um Projeto CRE | `cre init`, estrutura do projeto, primeira simulação |
| Scaffold CRE | `plan` sua aplicação antes de desenvolvê-la |

**Final do Dia 1**: Você está pronto para criar um projeto CRE! 


### Dia 2: Smart Contracts + Criação de Mercados

| Tópico | O Que Você Vai Aprender |
|--------|-------------------------|
| Smart Contract | Desenvolver o PredictionMarket.sol  |
| Interfaces | Construir um Contrato Compatível com CRE |
| HTTP Trigger | Receber requisições HTTP externas |
| Capability EVM Write | Escrever dados na blockchain |
| Workflow de Criação de Mercado | Criar e Simular a Criação de Mercado |

**Final do Dia 2**: Você vai criar mercados on-chain via requisições HTTP!


### Dia 3: Fluxo Completo de Liquidação

| Tópico | O Que Você Vai Aprender |
|--------|-------------------------|
| Log Trigger | Reagir a eventos on-chain |
| EVM Read | Ler estado de smart contracts |
| HTTP Capability | Fazer requisições HTTP |
| Integração com IA | Chamar a API do Gemini com consenso |
| Fazendo Previsões | Apostar em mercados com ETH |
| Fluxo Completo | Conectar tudo, liquidar, resgatar ganhos |

**Final do Dia 3**: Liquidação completa com IA funcionando de ponta a ponta!


## 🎬 Hora da Demo!

Antes de mergulharmos na construção, vamos ver o resultado final em ação.
