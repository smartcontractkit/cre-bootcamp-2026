# Configuração do Projeto CRE Prediction Market

Vamos criar o projeto CRE Prediction Market do zero usando o CLI.

## Passo 1: Inicializar Seu Projeto

Abra seu terminal e execute:

```bash
cre init
```

Você verá o assistente de inicialização do CRE:

```bash
Create a new CRE project

  Project name
  Name for your new CRE project

  > my-project
```

Altere o nome para `prediction-market` e pressione Enter.

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
✔ Workflow name? [my-workflow]:
```

**Pressione Enter** para aceitar o padrão `my-workflow`.

```bash
🎉 Project created successfully!

╭────────────────────────────────────────╮
│ Next steps                             │
│                                        │
│ 1. Navigate to your project:           │
│      cd prediction-market              │
│                                        │
│ 2. Install Bun (if needed):            │
│      npm install -g bun                │
│                                        │
│ 3. Install dependencies:               │
│      bun install --cwd ./my-workflow   │
│                                        │
│ 4. Run the workflow:                   │
│      cre workflow simulate my-workflow │
╰────────────────────────────────────────╯

```

## Passo 2: Navegar e Instalar Dependências

Siga as instruções do CLI:

Vá para a pasta

```bash
cd prediction-market
```

Instale as dependências

```bash
bun install --cwd ./my-workflow
```

Você verá o Bun instalando o CRE SDK e as dependências:

```bash
bun install v1.3.12 (700fc117)

+ typescript@5.9.3
+ @chainlink/cre-sdk@1.5.0

25 packages installed [7.67s]
```

## Passo 3: Configurar Variáveis de Ambiente

O comando `cre init` cria um arquivo `.env` na raiz do projeto. Este arquivo será usado tanto pelos workflows CRE quanto pelo Foundry (para deploy de smart contracts). Vamos configurá-lo.

- Abra o arquivo `.env`
- Delete o conteúdo
- Copie e cole isto:

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

# Gemini configuration: API Key
GEMINI_API_KEY_VAR=YOUR_GEMINI_API_KEY_HERE
```

> ⚠️ **Aviso de Segurança**: Nunca faça commit do seu arquivo `.env` ou compartilhe suas chaves privadas! O arquivo `.gitignore` já exclui arquivos `.env`.

Substitua os valores de exemplo:
- `YOUR_PRIVATE_KEY_HERE`: Sua chave privada Ethereum (com prefixo `0x`)
- `YOUR_GEMINI_API_KEY_HERE`: Sua chave de API do Google Gemini (obtenha uma no [Google AI Studio](https://aistudio.google.com/app/apikey))

**Nota sobre a chave de API do Gemini**

Certifique-se de configurar o faturamento para sua chave de API do Gemini no painel do Google AI Studio para evitar o erro `Gemini API error: 429` mais tarde. Você precisará conectar seu cartão de crédito para ativar o faturamento, mas não se preocupe - o nível gratuito é mais que suficiente para completar este bootcamp.

![gemini-billing](../assets/gemini-billing.png)

🎉 Parabéns! O projeto CRE está inicializado. 
