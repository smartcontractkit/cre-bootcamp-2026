# Configuración del Proyecto CRE

Vamos a crear tu primer proyecto CRE desde cero usando el CLI.

## Paso 1: Inicializar Tu Proyecto

Abre tu terminal y ejecuta:

```bash
cre init
```

Verás el asistente de inicialización de CRE:

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

**Escribe:** `hello-world` y presiona Enter.

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
Create a new CRE project

  Project: prediction-market
  Template: Hello World (TypeScript) [typescript]

  Workflow name
  Name for your workflow

  > my-workflow
```

**Presiona Enter** para aceptar el nombre predeterminado `my-workflow`.

```bash
🎉 Project created successfully!

Next steps:
  cd hello-world
  bun install --cwd ./my-workflow
  cre workflow simulate my-workflow
```

## Paso 2: Navegar e Instalar Dependencias

Sigue las instrucciones del CLI:

```bash
cd hello-world
bun install --cwd ./my-workflow
```

Verás a Bun instalando el SDK de CRE y las dependencias:

```bash
bun install v1.3.12 (700fc117)

+ typescript@5.9.3
+ @chainlink/cre-sdk@1.5.0

25 packages installed [7.67s]
```

## Paso 2.5: Configurar Variables de Entorno

El comando `cre init` crea un archivo `.env` en la raíz del proyecto. Este archivo será usado tanto por los workflows CRE como por Foundry (para el despliegue de smart contracts). 

Echa un vistazo al `.env`:

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

> **Advertencia de Seguridad**: Nunca hagas commit de tu archivo `.env` ni compartas tus claves privadas! El archivo `.gitignore` ya excluye los archivos `.env`.

Hoy no vamos a hacer transacciones on-chain, así que no necesitas actualizar el `CRE_ETH_PRIVATE_KEY`.

## Paso 3: Explorar la Estructura del Proyecto

Veamos qué creó `cre init` para nosotros:

```bash
prediction-market/
├── project.yaml            # Configuraciones a nivel de proyecto (RPCs, chains)
├── secrets.yaml            # Mapeo de variables secretas
├── .env                    # Variables de entorno
└── my-workflow/            # Directorio de tu workflow
    ├── workflow.yaml       # Configuraciones específicas del workflow
    ├── main.ts             # Punto de entrada del workflow ⭐
    ├── config.staging.json # Configuración para simulación
    ├── package.json        # Dependencias de Node.js
    └── tsconfig.json       # Configuración de TypeScript
```

### Archivos Clave Explicados

| Archivo | Propósito |
|---------|-----------|
| `project.yaml` | Endpoints RPC para acceso a blockchain |
| `secrets.yaml` | Mapea variables de entorno a secretos |
| `.env` | Variables de entorno para CRE y Foundry |
| `workflow.yaml` | Nombre y rutas de archivos del workflow |
| `main.ts` | Tu código del workflow vive aquí |
| `config.staging.json` | Valores de configuración para simulación |

## Paso 4: Ejecutar Tu Primera Simulación

Ahora la parte emocionante - simulemos el workflow:

```bash
cre workflow simulate my-workflow
```

Verás el simulador inicializarse:

```bash
[SIMULATION] Simulator Initialized

[SIMULATION] Running trigger trigger=cron-trigger@1.0.0
[USER LOG] Hello world! Workflow triggered.

Workflow Simulation Result:
 "Hello world!"

[SIMULATION] Execution finished signal received
```

**Felicitaciones!** Acabas de ejecutar tu primer workflow CRE!

## Paso 5: Entender el Código Hello World

Veamos `my-workflow/main.ts`:

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

### El Patrón: Trigger -> Callback

Cada workflow CRE sigue este patrón:

```ts
cre.handler(trigger, callback)
```

- **Trigger**: Lo que inicia el workflow (CRON, HTTP, Log)
- **Callback**: Lo que sucede cuando el trigger se activa

> **Nota**: El Hello World usa un CRON Trigger (basado en tiempo). En este bootcamp, construiremos con **HTTP Trigger** (Día 2) y **Log Trigger** (Día 3) para nuestro mercado de predicción.

## Referencia de Comandos Clave

| Comando | Qué Hace |
|---------|----------|
| `cre init` | Crea un nuevo proyecto CRE |
| `cre workflow simulate <name>` | Simula un workflow localmente |
| `cre workflow simulate <name> --broadcast` | Simula con escrituras reales on-chain |
