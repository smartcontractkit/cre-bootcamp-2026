# HTTP Trigger en Prediction Market

Estamos usando un HTTP trigger para crear un Mercado (o una pregunta) en el proyecto Prediction Market, a través de solicitudes HTTP.

Construyamos el flujo de trabajo HTTP trigger. Trabajaremos en el directorio `my-workflow` creado por `cre init`.

### Paso 1: Crear httpCallback.ts

- Crea un nuevo archivo `my-workflow/httpCallback.ts`
- Copia y pega el código a continuación

```typescript
// prediction-market/my-workflow/httpCallback.ts

import {
    cre,
    type Runtime,
    type HTTPPayload,
    decodeJson,
} from "@chainlink/cre-sdk";

// Simple interface for our HTTP payload
interface CreateMarketPayload {
    question: string;
}

type Config = {
    geminiModel: string;
    evms: Array<{
        marketAddress: string;
        chainSelectorName: string;
        gasLimit: string;
    }>;
};

export function onHttpTrigger(runtime: Runtime<Config>, payload: HTTPPayload): string {
    runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    runtime.log("CRE Workflow: HTTP Trigger - Create Market");
    runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Step 1: Parse and validate the incoming payload
    if (!payload.input || payload.input.length === 0) {
        runtime.log("[ERROR] Empty request payload");
        return "Error: Empty request";
    }

    const inputData = decodeJson(payload.input) as CreateMarketPayload;
    runtime.log(`[Step 1] Received market question: "${inputData.question}"`);

    if (!inputData.question || inputData.question.trim().length === 0) {
        runtime.log("[ERROR] Question is required");
        return "Error: Question is required";
    }

    // Steps 2-6: EVM Write (covered in next chapter)
    // We'll complete this in the EVM Write chapter

    return "Success";
}
```

### Paso 2: Actualizar main.ts

Actualiza `my-workflow/main.ts` para registrar el HTTP trigger:

- Abre el archivo `my-workflow/main.ts`
- Borra el contenido (fue generado por CRE init Hello World)
- Copia y pega esto:

```typescript
// prediction-market/my-workflow/main.ts

import { cre, Runner, type Runtime } from "@chainlink/cre-sdk";
import { onHttpTrigger } from "./httpCallback";

type Config = {
  geminiModel: string;
  evms: Array<{
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
};

const initWorkflow = (config: Config) => {
  const httpCapability = new cre.capabilities.HTTPCapability();
  const httpTrigger = httpCapability.trigger({});

  return [
    cre.handler(
      httpTrigger,
      onHttpTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
```


## Simulando el HTTP Trigger

### 1. Ejecutar la Simulación

- Ve al directorio `prediction-market` (directorio padre de my-workflow)
- En la terminal, ejecuta:

```bash
cre workflow simulate my-workflow
```

Deberias ver:

```bash
Workflow compiled

🔍 HTTP Trigger Configuration
┃ Enter a file path or JSON directly for the HTTP trigger
┃ > {"key": "value"} or ./payload.json

```

Puedes ingresar una ruta de archivo o JSON directamente.

### 2. Ingresar el Payload JSON

El payload sera la pregunta con la cual estamos creando el mercado de predicción.
Probemos con algo del pasado, que ya sabemos la respuesta:

`Will Argentina win the 2022 World Cup?`

Usando el formato JSON, pega:

```json
{"question": "Will Argentina win the 2022 World Cup?"}
```

### Salida Esperada

```
✓ Parsed JSON input successfully
✓ Created HTTP trigger payload with 1 fields
[SIMULATION] Simulator Initialized
[SIMULATION] Running trigger trigger=http-trigger@1.0.0-alpha

[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] CRE Workflow: HTTP Trigger - Create Market
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] [Step 1] Received market question: "Will Argentina win the 2022 World Cup?"

✓ Workflow Simulation Result:
"Success"

[SIMULATION] Execution finished signal received
```

> La pregunta del mercado (HTTP Payload) podria venir de cualquier sistema externo.

## Autorización (Producción)

No lo necesitamos ahora, porque solo estamos haciendo simulaciones, pero recuerda:
- Para producción, necesitarás configurar `authorizedKeys` con claves públicas reales:

```typescript
http.trigger({
  authorizedKeys: [
    {
      type: "KEY_TYPE_ECDSA_EVM",
      publicKey: "0x04abc123...", // Your public key
    },
  ],
})
```

Esto asegura que solo los llamadores autorizados puedan activar tu flujo de trabajo. Para simulación, usamos un string vacio.


## Resumen

Has aprendido:
- Cómo funcionan los HTTP Triggers
- Cómo decodificar payloads JSON
- Cómo validar el input
- Cómo simular HTTP triggers

## Siguientes Pasos

- Ahora haremos una transacción en el smart contract del prediction market. 
- Completemos el flujo de trabajo escribiendo el mercado en la blockchain!
