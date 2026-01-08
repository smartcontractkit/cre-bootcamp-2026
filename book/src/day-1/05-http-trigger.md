# HTTP Trigger: Receiving Requests

Now let's build a workflow that creates markets via HTTP requests.

## Familiarize yourself with the capability

The **HTTP Trigger** fires when an HTTP request is made to the workflow's designated endpoint. This allows you to start workflows from external systems, perfect for:
- Creating resources (like our markets)
- API-driven workflows
- Integrating with external systems

### Creating the trigger

```typescript
import { cre } from "@chainlink/cre-sdk";

const http = new cre.capabilities.HTTPCapability();

// Basic trigger (no authorization)
const trigger = http.trigger({});

// Or with authorized keys for signature validation
const trigger = http.trigger({
  authorizedKeys: [
    {
      type: "KEY_TYPE_ECDSA_EVM",
      publicKey: "0x...",
    },
  ],
});
```

### Configuration

The `trigger()` method accepts a configuration object with the following field:

- `authorizedKeys`: `AuthorizedKey[]` - A list of public keys used to validate the signature of incoming requests.

### `AuthorizedKey`

Defines a public key used for request authentication.

- `type`: `string` - The type of the key. Use `"KEY_TYPE_ECDSA_EVM"` for EVM signatures.
- `publicKey`: `string` - The public key as a string.

**Example:**

```typescript
const config = {
  authorizedKeys: [
    {
      type: "KEY_TYPE_ECDSA_EVM",
      publicKey: "0x1234567890abcdef...",
    },
  ],
};
```

### Payload

The payload passed to your callback function contains the HTTP request data.

- `input`: `Uint8Array` - The JSON input from the HTTP request body as raw bytes.
- `method`: `string` - HTTP method (GET, POST, etc.).
- `headers`: `Record<string, string>` - Request headers.

**Working with the `input` field:**

The `input` field is a `Uint8Array` containing the raw bytes of the HTTP request body. The SDK provides a `decodeJson` helper to parse it:

```typescript
import { decodeJson } from "@chainlink/cre-sdk";

// Parse as JSON (recommended)
const inputData = decodeJson(payload.input);

// Or convert to string manually
const inputString = new TextDecoder().decode(payload.input);

// Or parse manually
const inputJson = JSON.parse(new TextDecoder().decode(payload.input));
```

### Callback function

Your callback function for HTTP triggers must conform to this signature:

```typescript
import { type Runtime, type HTTPPayload } from "@chainlink/cre-sdk";

const onHttpTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): YourReturnType => {
  // Your workflow logic here
  return result;
}
```

**Parameters:**

- `runtime`: The runtime object used to invoke capabilities and access configuration
- `payload`: The HTTP payload containing the request input, method, and headers

## Building Our HTTP Trigger

Now let's build our HTTP trigger workflow. We'll work in the `my-workflow` directory created by `cre init`.

### Step 1: Create httpCallback.ts

Create a new file `my-workflow/httpCallback.ts`:

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

### Step 2: Update main.ts

Update `my-workflow/main.ts` to register the HTTP trigger:

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


## Simulating the HTTP Trigger

### 1. Run the Simulation

```bash
# From the prediction-market directory (parent of my-workflow)
cd prediction-market
cre workflow simulate my-workflow
```

You should see:

```bash
Workflow compiled

🔍 HTTP Trigger Configuration:
Please provide JSON input for the HTTP trigger.
You can enter a file path or JSON directly.

Enter your input: 
```

### 2. Enter the JSON Payload

When prompted, paste:

```json
{"question": "Will Argentina win the 2022 World Cup?"}
```

### Expected Output

```
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] CRE Workflow: HTTP Trigger - Create Market
[USER LOG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[USER LOG] [Step 1] Received market question: "Will Argentina win the 2022 World Cup?"

Workflow Simulation Result:
 "Success"

[SIMULATION] Execution finished signal received
```

## Authorization (Production)

For production, you'll need to configure `authorizedKeys` with actual public keys:

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

This ensures only authorized callers can trigger your workflow. For simulation, we use an empty string.


## Summary

You've learned:
- ✅ How HTTP Triggers work
- ✅ How to decode JSON payloads
- ✅ How to validate input
- ✅ How to simulate HTTP triggers

## Next Steps

Now let's complete the workflow by writing the market to the blockchain!