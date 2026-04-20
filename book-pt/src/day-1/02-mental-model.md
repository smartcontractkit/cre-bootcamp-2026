# O Modelo Mental do CRE

Antes de começarmos a programar, vamos construir um modelo mental do que é o CRE e como ele funciona.

## O Que é o CRE?

O **Chainlink Runtime Environment (CRE)** é uma camada de orquestração que permite escrever smart contracts de nível institucional e executar seus próprios workflows em TypeScript ou Golang, alimentados por redes de oráculos descentralizados da Chainlink (DONs). 

Com o CRE, você pode compor diferentes capabilities (ex.: HTTP, leituras e escritas on-chain, assinatura, consenso) em workflows verificáveis que conectam smart contracts a APIs, serviços em nuvem, sistemas de IA, outras blockchains e mais. Os workflows são executados através de DONs com consenso integrado, servindo como um runtime seguro, à prova de adulteração e altamente disponível.

### O Problema Que o CRE Resolve

Smart contracts têm uma limitação fundamental: **eles só podem ver o que está na sua blockchain**.

- ❌ Não podem verificar o clima atual
- ❌ Não podem buscar dados de APIs externas
- ❌ Não podem chamar modelos de IA
- ❌ Não podem ler de outras blockchains

O CRE preenche essa lacuna fornecendo um **runtime verificável** onde você pode:

- ✅ Buscar dados de qualquer API
- ✅ Ler de múltiplas blockchains
- ✅ Chamar serviços de IA
- ✅ Escrever resultados verificados de volta on-chain

Tudo com **consenso criptográfico** garantindo que cada operação é verificada.

## Conceitos Fundamentais

### 1. Workflows

Um **Workflow** é o código offchain que você desenvolve, escrito em TypeScript ou Go. O CRE compila para WebAssembly (WASM) e o executa através de uma Rede de Oráculos Descentralizada (DON).

```typescript
// Um workflow é apenas código em TypeScript ou Go!
const initWorkflow = (config: Config) => {
  return [
    cre.handler(trigger, callback),
  ]
}
```

### 2. Triggers

**Triggers** são eventos que iniciam seu workflow. O CRE suporta três tipos:

| Trigger | Quando Dispara | Caso de Uso |
|---------|----------------|-------------|
| **CRON** | Em um agendamento | "Executar workflow a cada hora" |
| **HTTP** | Ao receber uma requisição HTTP | "Criar mercado quando a API for chamada" |
| **Log** | Quando um smart contract emite um evento | "Liquidar quando SettlementRequested for acionado" |

### 3. Capabilities

**Capabilities** são o que seu workflow pode FAZER - microsserviços que executam tarefas específicas:

| Capability | O Que Faz |
|------------|-----------|
| **HTTP** | Fazer requisições HTTP para APIs externas |
| **EVM Read** | Ler dados de smart contracts |
| **EVM Write** | Escrever dados em smart contracts |

Cada capability executa em sua própria DON especializada com consenso integrado.

### 4. Redes de Oráculos Descentralizados (DONs)

Uma **DON** é uma rede de nós independentes que:
1. Executam seu workflow independentemente
2. Comparam seus resultados
3. Alcançam consenso usando protocolos Tolerantes a Falhas Bizantinas (BFT)
4. Retornam um único resultado verificado

## O Padrão Trigger-e-Callback

Esta é a pnricipal arquitetura padrão / standard que você usará em todo workflow CRE:

```typescript
cre.handler(
  trigger,    // QUANDO executar (cron, http, log)
  callback    // O QUE executar (sua lógica)
)
```

### Exemplo: Um Workflow Cron Simples

```typescript
// Trigger: a cada 10 minutos
const cronCapability = new cre.capabilities.CronCapability()
const cronTrigger = cronCapability.trigger({ schedule: "0 */10 * * * *" })

// Callback: o que executa quando acionado
function onCronTrigger(runtime: Runtime<Config>): string {
  runtime.log("Olá do CRE!")
  return "Sucesso"
}

// Conecte-os juntos
const initWorkflow = (config: Config) => {
  return [
    cre.handler(
      cronTrigger,
      onCronTrigger
    ),
  ]
}
```

## Fluxo de Execução

Quando um trigger dispara, aqui está o que acontece:

```
1. Trigger dispara (agendamento cron, requisição HTTP ou evento on-chain)
           │
           ▼
2. DON do Workflow recebe o trigger
           │
           ▼
3. Cada nó executa seu callback independentemente
           │
           ▼
4. Quando o callback invoca uma capability (HTTP, EVM Read, etc.):
           │
           ▼
5. DON da Capability realiza a operação
           │
           ▼
6. Nós comparam resultados via consenso BFT
           │
           ▼
7. Único resultado verificado retornado ao seu callback
           │
           ▼
8. Callback continua com dados confiáveis
```

## Conceitos Principais

| Conceito | Resumo |
|----------|--------|
| **Workflow** | Sua lógica de automação, compilada para WASM |
| **Trigger** | Evento que inicia a execução (CRON, HTTP, Log) |
| **Callback** | Função contendo sua lógica de negócios |
| **Capability** | Microsserviço que executa tarefa específica (HTTP, EVM Read/Write) |
| **DON** | Rede de nós que executam com consenso |
| **Consenso** | Protocolo BFT garantindo resultados verificados |


## Próximos Passos

Agora que você entende o modelo mental, vamos configurar seu primeiro projeto CRE!
