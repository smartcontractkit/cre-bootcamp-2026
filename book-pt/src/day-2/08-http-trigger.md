# HTTP Trigger no Prediction Market

Estamos usando um HTTP-trigger para criar um Mercado (ou uma pergunta) no projeto Prediction Market, via requisições HTTP.

Vamos construir o workflow de HTTP trigger. 

Trabalharemos no diretório `my-workflow` criado pelo `cre init`.

### Passo 1: Criar httpCallback.ts

- Crie um novo arquivo `my-workflow/httpCallback.ts`
- Copie e cole o código abaixo

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

    // Passo 1: Analisar e validar o payload recebido
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

### Passo 2: Atualizar main.ts

Atualize `my-workflow/main.ts` para registrar o HTTP trigger:

- Abra o arquivo `my-workflow/main.ts`
- Delete o conteúdo (foi gerado pelo CRE init Hello World)
- Copie e cole isto:

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


## Simulando o HTTP Trigger

### 1. Executar a Simulação

- Vá para o diretório `prediction-market` (pai de my-workflow)
- No terminal, execute:

```bash
cre workflow simulate my-workflow
```

Você deve ver:

```bash
Workflow compiled

🔍 HTTP Trigger Configuration
┃ Enter a file path or JSON directly for the HTTP trigger
┃ > {"key": "value"} or ./payload.json

```

Você pode inserir um caminho de arquivo ou JSON diretamente.

### 2. Inserir o Payload JSON

O payload será a pergunta com a qual estamos criando o mercado de previsão.
Vamos testar algo do passado, que já sabemos a resposta, mas como se ainda fosse acontecer:

`A Argentina vai vencer a Copa do Mundo de 2022?`

Usando o formato JSON, copie e cole:

```json
{"question": "Will Argentina win the 2022 World Cup?"}
```

### Saída Esperada

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

> A pergunta do mercado (HTTP Payload) pode vir de qualquer sistema externo.

## Autorização (Produção)

Não precisamos disso agora, pois estamos apenas fazendo simulações, mas lembre-se:
- Para produção, você precisará configurar `authorizedKeys` com chaves públicas reais:

```typescript
http.trigger({
  authorizedKeys: [
    {
      type: "KEY_TYPE_ECDSA_EVM",
      publicKey: "0x04abc123...", // Sua chave pública
    },
  ],
})
```

Isso garante que apenas chamadores autorizados possam acionar seu workflow. Para simulação, usamos uma string vazia.


## Resumo

Você aprendeu:
- ✅ Como HTTP Triggers funcionam
- ✅ Como decodificar payloads JSON
- ✅ Como validar entrada
- ✅ Como simular HTTP triggers

## Próximos Passos

- Agora faremos uma transação no smart contract do prediction market. 
- Vamos completar o workflow escrevendo o mercado na blockchain!
