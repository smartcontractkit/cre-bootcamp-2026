# Conceptos de HTTP Capability

La **HTTP Capability** (`HTTPClient`) permite que tu flujo de trabajo obtenga datos de cualquier API externa. Todas las solicitudes HTTP se envuelven en un mecanismo de consenso para proporcionar un resultado unico y confiable a través de multiples nodos del DON.

## Entendiendo el cliente HTTP

```typescript
import { cre, consensusIdenticalAggregation } from "@chainlink/cre-sdk";

const httpClient = new cre.capabilities.HTTPClient();

// Send a request with consensus
const result = httpClient
  .sendRequest(
    runtime,
    fetchFunction,  // Function that makes the request
    consensusIdenticalAggregation<ResponseType>()  // Aggregation strategy
  )(runtime.config)
  .result();
```

## Opciones de agregación por consenso

**Funciones de agregación integradas:**

| Método | Descripción | Tipos Soportados |
|--------|-------------|------------------|
| `consensusIdenticalAggregation<T>()` | Todos los nodos deben devolver resultados identicos | Primitivos, objetos |
| `consensusMedianAggregation<T>()` | Calcula la mediana entre nodos | `number`, `bigint`, `Date` |
| `consensusCommonPrefixAggregation<T>()` | Prefijo común más largo de arrays | `string[]`, `number[]` |
| `consensusCommonSuffixAggregation<T>()` | Sufijo común más largo de arrays | `string[]`, `number[]` |

**Funciones de agregación por campo** (usadas con `ConsensusAggregationByFields`):

| Función | Descripción | Tipos Compatibles |
|---------|-------------|-------------------|
| `median` | Calcula la mediana | `number`, `bigint`, `Date` |
| `identical` | Debe ser identico entre nodos | Primitivos, objetos |
| `commonPrefix` | Prefijo común más largo | Arrays |
| `commonSuffix` | Sufijo común más largo | Arrays |
| `ignore` | Ignorado durante el consenso | Cualquiera |

## Formato de solicitud

```typescript
const req = {
  url: "https://api.example.com/endpoint",
  method: "POST" as const,
  body: Buffer.from(JSON.stringify(data)).toString("base64"), // Base64 encoded
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + apiKey,
  },
  cacheSettings: {
    store: true,
    maxAge: '60s',
  },
};
```

> **Nota**: El `body` debe estar codificado en base64.

## Entendiendo la configuración de cache

Por defecto, **todos los nodos en el DON ejecutan solicitudes HTTP**. Para solicitudes POST, esto causaria llamadas API duplicadas.

La solución es `cacheSettings`:

```typescript
cacheSettings: {
  store: true,   // Store response in shared cache
  maxAge: '60s', // Cache duration (e.g., '60s', '5m', '1h')
}
```

**Como funciona:**

```
+-----------------------------------------------------------------+
|                    DON con 5 nodos                               |
+-----------------------------------------------------------------+
|                                                                  |
|   Nodo 1 --> Hace solicitud HTTP --> Almacena en cache compartida|
|                                           |                      |
|   Nodo 2 --> Verifica cache --> Usa respuesta en cache <---------+
|   Nodo 3 --> Verifica cache --> Usa respuesta en cache <---------+
|   Nodo 4 --> Verifica cache --> Usa respuesta en cache <---------+
|   Nodo 5 --> Verifica cache --> Usa respuesta en cache <---------+
|                                                                  |
|   Los 5 nodos participan en consenso BFT con los mismos datos   |
|                                                                  |
+-----------------------------------------------------------------+
```

**Resultado**: Solo se hace **una** llamada HTTP real, mientras todos los nodos participan en el consenso.

> **Buena Practica**: Usa `cacheSettings` para todas las solicitudes POST, PUT, PATCH y DELETE para prevenir duplicados.

## Secrets

Los secrets son credenciales gestionadas de forma segura (claves API, tokens, etc.) disponibles para tu flujo de trabajo en tiempo de ejecución. En CRE:

- **En simulación**: Los secrets se mapean en `secrets.yaml` a variables de entorno de tu archivo `.env`
- **En producción**: Los secrets se almacenan en el **Vault DON** descentralizado

Para obtener un secret en tu flujo de trabajo:

```typescript
const secret = runtime.getSecret({ id: "MY_SECRET_NAME" }).result();
const value = secret.value; // The actual secret string
```
