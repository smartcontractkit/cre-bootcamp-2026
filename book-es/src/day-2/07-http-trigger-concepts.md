# Conceptos de HTTP Trigger: Recibiendo Solicitudes

## Familiarizate con la capacidad HTTP Trigger

El **HTTP Trigger** se activa cuando se realiza una solicitud HTTP al endpoint designado del workflow. Esto te permite iniciar flujos de trabajo desde sistemas externos, perfecto para:
- Crear recursos (como nuestros mercados)
- Flujos de trabajo impulsados por API
- Integración con sistemas externos

### El código del HTTP trigger

```typescript
import { cre } from "@chainlink/cre-sdk";

const http = new cre.capabilities.HTTPCapability();

// Trigger básico (sin autorización)
const trigger = http.trigger({});

// O con claves autorizadas para validación de firma
const trigger = http.trigger({
  authorizedKeys: [
    {
      type: "KEY_TYPE_ECDSA_EVM",
      publicKey: "0x...",
    },
  ],
});
```

### Configuración

El método `trigger()` acepta un objeto de configuración con el siguiente campo:

- `authorizedKeys`: `AuthorizedKey[]` - Una lista de claves públicas usadas para validar la firma de las solicitudes entrantes.

### `AuthorizedKey`

Define una clave pública usada para la autenticación de solicitudes.

- `type`: `string` - El tipo de la clave. Usa `"KEY_TYPE_ECDSA_EVM"` para firmas EVM.
- `publicKey`: `string` - La clave pública como string.

**Ejemplo:**

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
> Durante la simulación local estamos usando el trigger básico (sin autorización) para simplificar las pruebas.

### Payload del HTTP Trigger

El payload pasado a tu función callback contiene los datos de la solicitud HTTP.

- `input`: `Uint8Array` - El input JSON del cuerpo de la solicitud HTTP como bytes crudos.
- `method`: `string` - Método HTTP (GET, POST, etc.).
- `headers`: `Record<string, string>` - Headers de la solicitud.

**Trabajando con el campo `input`:**

El campo `input` es un `Uint8Array` que contiene los bytes crudos del cuerpo de la solicitud HTTP. El SDK proporciona un helper `decodeJson` para parsearlo:

```typescript
import { decodeJson } from "@chainlink/cre-sdk";

// Parsear como JSON (recomendado)
const inputData = decodeJson(payload.input);

// O convertir a string manualmente
const inputString = new TextDecoder().decode(payload.input);

// O parsear manualmente
const inputJson = JSON.parse(new TextDecoder().decode(payload.input));
```

### Función callback

Tu función callback para HTTP triggers debe seguir esta firma:

```typescript
import { type Runtime, type HTTPPayload } from "@chainlink/cre-sdk";

const onHttpTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): YourReturnType => {
  // Tu lógica del workflow aquí
  return result;
}
```

**Parámetros:**

- `runtime`: El objeto runtime usado para invocar capabilities y acceder a la configuración
- `payload`: El payload HTTP que contiene el input de la solicitud, método y headers
