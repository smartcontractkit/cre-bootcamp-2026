# Configuración del Proyecto Prediction Market en CRE

Vamos a crear el proyecto CRE Prediction Market desde cero usando el CLI.

## Paso 1: Inicializar Tu Proyecto

Abre tu terminal y ejecuta:

```bash
cre init
```

Verás el asistente de inicialización de CRE:

```bash
Create a new CRE project

  Project name
  Name for your new CRE project

  > my-project
```

Cambia el nombre a `prediction-market` y presiona Enter.

```bash
Pick a template
  All    Go   [TS]
```

Presiona **Tab** hasta seleccionar **TS** (Typescript). 

```bash
│ Hello World TS
│ A minimal cron-triggered workflow to get started from scratch
│ cron
```

Selecciona **Hello World** `TS` y presiona Enter.

```bash
✔ Workflow name? [my-workflow]:
```

**Presiona Enter** para aceptar el valor predeterminado `my-workflow`.

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

## Paso 2: Navegar e Instalar Dependencias

Sigue las instrucciones del CLI:

Ve a la carpeta

```bash
cd prediction-market
```

Instala las dependencias

```bash
bun install --cwd ./my-workflow
```

Verás a Bun instalando el SDK de CRE y las dependencias:

```bash
bun install v1.3.12 (700fc117)

+ typescript@5.9.3
+ @chainlink/cre-sdk@1.5.0

25 packages installed [7.67s]
```

## Paso 3: Configurar Variables de Entorno

El comando `cre init` crea un archivo `.env` en la raiz del proyecto. Este archivo sera usado tanto por los flujos de trabajo CRE como por Foundry (para el despliegue de smart contracts). Vamos a configurarlo.

- Abre el archivo `.env`
- Borra el contenido
- Copia y pega esto:

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

> **Advertencia de Seguridad**: Nunca hagas commit de tu archivo `.env` ni compartas tus claves privadas! El archivo `.gitignore` ya excluye los archivos `.env`.

Reemplaza los valores de ejemplo:
- `YOUR_PRIVATE_KEY_HERE`: Tu clave privada de Ethereum (con prefijo `0x`)
- `YOUR_GEMINI_API_KEY_HERE`: Tu clave API de Google Gemini (obten una desde [Google AI Studio](https://aistudio.google.com/app/apikey))

**Nota sobre la clave API de Gemini**

Asegúrate de configurar la facturación para tu clave API de Gemini en el panel de Google AI Studio para evitar obtener el error `Gemini API error: 429` más adelante. Necesitarás conectar tu tarjeta de crédito para activar la facturación, pero no te preocupes - el nivel gratuito es más que suficiente para completar este bootcamp.

![gemini-billing](../assets/gemini-billing.png)

Felicitaciones! El proyecto CRE está inicializado. 
