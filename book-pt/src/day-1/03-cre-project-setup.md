# Configuração do Projeto CRE

Vamos criar seu primeiro projeto CRE do zero usando o CLI.

## Passo 1: Inicializar Seu Projeto

Abra seu terminal e execute:

```bash
cre init
```

Você verá o assistente de inicialização do CRE:

```bash

      ÷÷÷                                          ÷÷÷
   ÷÷÷÷÷÷                                          ÷÷÷÷÷÷
÷÷÷÷÷÷÷÷÷                                          ÷÷÷÷÷÷÷÷÷
÷÷÷÷÷÷       ÷÷÷÷÷÷÷÷÷÷  ÷÷÷÷÷÷÷÷÷÷  ÷÷÷÷÷÷÷÷÷÷       ÷÷÷÷÷÷
÷÷÷÷÷÷       ÷÷÷÷÷÷÷÷÷÷  ÷÷÷÷÷÷÷÷÷÷  ÷÷÷÷÷÷÷÷÷÷       ÷÷÷÷÷÷
÷÷÷÷÷÷       ÷÷÷÷    ÷÷÷ ÷÷÷   ÷÷÷÷  ÷÷÷              ÷÷÷÷÷÷
÷÷÷÷÷÷       ÷÷÷         ÷÷÷÷÷÷÷÷÷   ÷÷÷÷÷÷÷÷÷÷       ÷÷÷÷÷÷
÷÷÷÷÷÷       ÷÷÷         ÷÷÷÷÷÷÷÷    ÷÷÷÷÷÷÷÷÷÷       ÷÷÷÷÷÷
÷÷÷÷÷÷       ÷÷÷÷    ÷÷÷ ÷÷÷  ÷÷÷÷   ÷÷÷              ÷÷÷÷÷÷
÷÷÷÷÷÷       ÷÷÷÷÷÷÷÷÷÷  ÷÷÷   ÷÷÷÷  ÷÷÷÷÷÷÷÷÷÷       ÷÷÷÷÷÷
÷÷÷÷÷÷       ÷÷÷÷÷÷÷÷÷÷  ÷÷÷    ÷÷÷÷ ÷÷÷÷÷÷÷÷÷÷       ÷÷÷÷÷÷
÷÷÷÷÷÷÷÷÷                                          ÷÷÷÷÷÷÷÷÷
   ÷÷÷÷÷÷                                          ÷÷÷÷÷÷
      ÷÷÷                                          ÷÷÷

Create a new CRE project

  Project name
  Name for your new CRE project

  > my-project
```

**Digite:** `hello-world` e pressione Enter.

```bash
Pick a template
  All    Go   [TS]
```

Pressione **Tab** até selecionar **TS** (Typescript). 

```bash
│ Hello World TS
│ A minimal cron-triggered workflow to get started from scratch
│ cron
```

Selecione **Hello World** `TS` e pressione Enter.

```bash
Create a new CRE project

  Project: prediction-market
  Template: Hello World (TypeScript) [typescript]

  Workflow name
  Name for your workflow

  > my-workflow
```

**Pressione Enter** para aceitar o nome padrão `my-workflow`.

```bash
🎉 Project created successfully!

Next steps:
  cd hello-world
  bun install --cwd ./my-workflow
  cre workflow simulate my-workflow
```

## Passo 2: Navegar e Instalar Dependências

Siga as instruções do CLI:

```bash
cd hello-world
bun install --cwd ./my-workflow
```

Você verá o Bun instalando o CRE SDK e as dependências:

```bash
bun install v1.3.12 (700fc117)

+ typescript@5.9.3
+ @chainlink/cre-sdk@1.5.0

25 packages installed [7.67s]
```

## Passo 2.5: Configurar Variáveis de Ambiente

O comando `cre init` cria um arquivo `.env` na raiz do projeto. Este arquivo será usado tanto pelos workflows CRE quanto pelo Foundry (para deploy de smart contracts). 

Veja o `.env`:

```bash
###############################################################################
### REQUIRED ENVIRONMENT VARIABLES - SENSITIVE INFORMATION                  ###
### DO NOT STORE RAW SECRETS HERE IN PLAINTEXT IF AVOIDABLE                 ###
### DO NOT UPLOAD OR SHARE THIS FILE UNDER ANY CIRCUMSTANCES                ###
###############################################################################

# Ethereum private key or 1Password reference (e.g. op://vault/item/field)
CRE_ETH_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE

# Default target used when --target flag is not specified (e.g. staging-settings, production-settings, my-target)
CRE_TARGET=staging-settings

```

> ⚠️ **Aviso de Segurança**: Nunca faça commit do seu arquivo `.env` ou compartilhe suas chaves privadas! O arquivo `.gitignore` já exclui arquivos `.env`.

Hoje não faremos transações on-chain, então você não precisa atualizar o `CRE_ETH_PRIVATE_KEY`.

## Passo 3: Explorar a Estrutura do Projeto

Vamos ver o que o `cre init` criou para nós:

```bash
prediction-market/
├── project.yaml            # Configurações do projeto
├── secrets.yaml            # Mapeamento de variáveis secretas
├── .env                    # Variáveis de ambiente
└── my-workflow/            # Diretório do seu workflow
    ├── workflow.yaml       # Configurações específicas do workflow
    ├── main.ts             # Ponto de entrada do workflow ⭐
    ├── config.staging.json # Configuração para simulação
    ├── package.json        # Dependências Node.js
    └── tsconfig.json       # Configuração TypeScript
```

### Arquivos Principais Explicados

| Arquivo | Finalidade |
|---------|------------|
| `project.yaml` | Endpoints RPC para acesso à blockchain |
| `secrets.yaml` | Mapeia variáveis de ambiente para secrets |
| `.env` | Variáveis de ambiente para CRE e Foundry |
| `workflow.yaml` | Nome do workflow e caminhos dos arquivos |
| `main.ts` | Seu código de workflow fica aqui |
| `config.staging.json` | Valores de configuração para simulação |

## Passo 4: Executar Sua Primeira Simulação

Agora a parte emocionante - vamos simular o workflow:

```bash
cre workflow simulate my-workflow
```

Você verá o simulador inicializar:

```bash
[SIMULATION] Simulator Initialized

[SIMULATION] Running trigger trigger=cron-trigger@1.0.0
[USER LOG] Hello world! Workflow triggered.

Workflow Simulation Result:
 "Hello world!"

[SIMULATION] Execution finished signal received
```

🎉 **Parabéns!** Você acabou de executar seu primeiro workflow CRE!

## Passo 5: Entender o Código Hello World

Vamos ver `my-workflow/main.ts`:

```typescript
// my-workflow/main.ts

import { cre, Runner, type Runtime } from "@chainlink/cre-sdk";

type Config = {
  schedule: string;
};

const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("Hello world! Workflow triggered.");
  return "Hello world!";
};

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();

  return [
    cre.handler(
      cron.trigger(
        { schedule: config.schedule }
      ), 
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
```

### O Padrão: Trigger → Callback

Todo workflow CRE segue este padrão:

```ts
cre.handler(trigger, callback)
```

- **Trigger**: O que inicia o workflow (CRON, HTTP, Log)
- **Callback**: O que acontece quando o trigger dispara

> **Nota**: O Hello World usa um CRON Trigger (baseado em tempo). Neste bootcamp, vamos construir com **HTTP Trigger** (Dia 2) e **Log Trigger** (Dia 3) para nosso mercado de previsão.

## Referência de Comandos

| Comando | O Que Faz |
|---------|-----------|
| `cre init` | Cria um novo projeto CRE |
| `cre workflow simulate <nome>` | Simula um workflow localmente |
| `cre workflow simulate <nome> --broadcast` | Simula com escritas reais on-chain |
