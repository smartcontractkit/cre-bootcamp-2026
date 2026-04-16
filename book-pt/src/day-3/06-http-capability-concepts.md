# Conceitos de HTTP Capability

A **HTTP Capability** (`HTTPClient`) permite que seu workflow busque dados de qualquer API externa. Todas as requisições HTTP são envolvidas em um mecanismo de consenso para fornecer um único resultado confiável entre múltiplos nós da DON.

## Entendendo o cliente HTTP

```typescript
import { cre, consensusIdenticalAggregation } from "@chainlink/cre-sdk";

const httpClient = new cre.capabilities.HTTPClient();

// Enviar uma requisição com consenso
const result = httpClient
  .sendRequest(
    runtime,
    fetchFunction,  // Função que faz a requisição
    consensusIdenticalAggregation<ResponseType>()  // Estratégia de agregação
  )(runtime.config)
  .result();
```

## Opções de agregação por consenso

**Funções de agregação integradas:**

| Método | Descrição | Tipos Suportados |
|--------|-----------|------------------|
| `consensusIdenticalAggregation<T>()` | Todos os nós devem retornar resultados idênticos | Primitivos, objetos |
| `consensusMedianAggregation<T>()` | Calcula mediana entre nós | `number`, `bigint`, `Date` |
| `consensusCommonPrefixAggregation<T>()` | Maior prefixo comum de arrays | `string[]`, `number[]` |
| `consensusCommonSuffixAggregation<T>()` | Maior sufixo comum de arrays | `string[]`, `number[]` |

**Funções de agregação por campo** (usadas com `ConsensusAggregationByFields`):

| Função | Descrição | Tipos Compatíveis |
|--------|-----------|-------------------|
| `median` | Calcula mediana | `number`, `bigint`, `Date` |
| `identical` | Deve ser idêntico entre nós | Primitivos, objetos |
| `commonPrefix` | Maior prefixo comum | Arrays |
| `commonSuffix` | Maior sufixo comum | Arrays |
| `ignore` | Ignorado durante consenso | Qualquer |

## Formato da requisição

```typescript
const req = {
  url: "https://api.example.com/endpoint",
  method: "POST" as const,
  body: Buffer.from(JSON.stringify(data)).toString("base64"), // Codificado em Base64
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

> **Nota**: O `body` deve ser codificado em base64.

## Entendendo as configurações de cache

Por padrão, **todos os nós na DON executam requisições HTTP**. Para requisições POST, isso causaria chamadas de API duplicadas.

A solução é `cacheSettings`:

```typescript
cacheSettings: {
  store: true,   // Armazenar resposta no cache compartilhado
  maxAge: '60s', // Duração do cache (ex.: '60s', '5m', '1h')
}
```

**Como funciona:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    DON com 5 nós                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Nó 1 ──► Faz requisição HTTP ──► Armazena no cache compartilhado │
│                                           │                     │
│   Nó 2 ──► Verifica cache ──► Usa resposta em cache ◄───────────┤
│   Nó 3 ──► Verifica cache ──► Usa resposta em cache ◄───────────┤
│   Nó 4 ──► Verifica cache ──► Usa resposta em cache ◄───────────┤
│   Nó 5 ──► Verifica cache ──► Usa resposta em cache ◄───────────┘
│                                                                 │
│   Todos os 5 nós participam do consenso BFT com os mesmos dados │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Resultado**: Apenas **uma** chamada HTTP real é feita, enquanto todos os nós participam do consenso.

> **Boa Prática**: Use `cacheSettings` para todas as requisições POST, PUT, PATCH e DELETE para evitar duplicatas.

## Secrets

Secrets são credenciais gerenciadas de forma segura (chaves de API, tokens, etc.) disponibilizadas para seu workflow em tempo de execução. No CRE:

- **Em simulação**: Secrets são mapeados em `secrets.yaml` para variáveis de ambiente do seu arquivo `.env`
- **Em produção**: Secrets são armazenados na **Vault DON** descentralizada

Para recuperar um secret no seu workflow:

```typescript
const secret = runtime.getSecret({ id: "MY_SECRET_NAME" }).result();
const value = secret.value; // A string do secret real
```
