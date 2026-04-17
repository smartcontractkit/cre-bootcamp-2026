# Revisão & Perguntas

Bem-vindo de volta ao Dia 2! Vamos revisar o que aprendemos ontem e responder a quaisquer perguntas.

## Revisão do Dia 1


### Conceitos Principais Abordados

| Conceito | O Que Aprendemos |
|----------|------------------|
| **Modelo Mental do CRE** | Workflows, Triggers, Capabilities, DONs |
| **Estrutura do Projeto** | project.yaml, workflow.yaml, config.json |
| **Scaffold CRE** | Criando um modelo de negócios CRE |


## Agenda de Hoje

Hoje vamos completar o mercado de previsão com:

1. **PredictionMarket.sol** - Criando o smart contract
2. **HTTP Trigger** - Recebendo requisições HTTP externas
3. **Capability EVM Write** - O padrão de dois passos (report → writeReport)
4. **Workflow de Criação de Mercado** - Criando uma pergunta de mercado de previsão


### Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Dia 2: Criação de Mercado                │
│                                                                 │
│   HTTP Request ──▶ CRE Workflow ──▶ PredictionMarket.sol        │
│   (pergunta)       (HTTP Trigger)   (createMarket)              │
└─────────────────────────────────────────────────────────────────┘

```


## Verificação Rápida do Ambiente

Antes de continuar, vamos verificar se está tudo configurado:

```bash
# Verificar autenticação CRE
cre whoami
```


## Prontos para o Dia 2!

Vamos mergulhar no projeto Prediction Market.
