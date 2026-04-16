# Conceitos de HTTP Trigger: Recebendo Requisições

## Familiarize-se com a capability HTTP Trigger

O **HTTP Trigger** dispara quando uma requisição HTTP é feita ao endpoint designado do workflow. Isso permite que você inicie workflows a partir de sistemas externos, perfeito para:
- Criar recursos (como nossos mercados)
- Workflows orientados por API
- Integração com sistemas externos

### O código do HTTP trigger

```typescript
import { cre } from "@chainlink/cre-sdk";

const http = new cre.capabilities.HTTPCapability();

// Trigger básico (sem autorização)
const trigger = http.trigger({});

// Ou com chaves autorizadas para validação de assinatura
const trigger = http.trigger({
  authorizedKeys: [
    {
      type: "KEY_TYPE_ECDSA_EVM",
      publicKey: "0x...",
    },
  ],
});
```

### Configuração

O método `trigger()` aceita um objeto de configuração com o seguinte campo:

- `authorizedKeys`: `AuthorizedKey[]` - Uma lista de chaves públicas usadas para validar a assinatura das requisições recebidas.

### `AuthorizedKey`

Define uma chave pública usada para autenticação de requisições.

- `type`: `string` - O tipo da chave. Use `"KEY_TYPE_ECDSA_EVM"` para assinaturas EVM.
- `publicKey`: `string` - A chave pública como string.

**Exemplo:**

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
> Durante a simulação local estamos usando o trigger básico (sem autorização) para simplificar os testes.

### Payload do HTTP Trigger

O payload passado para sua função callback contém os dados da requisição HTTP.

- `input`: `Uint8Array` - A entrada JSON do corpo da requisição HTTP como bytes brutos.
- `method`: `string` - Método HTTP (GET, POST, etc.).
- `headers`: `Record<string, string>` - Cabeçalhos da requisição.

**Trabalhando com o campo `input`:**

O campo `input` é um `Uint8Array` contendo os bytes brutos do corpo da requisição HTTP. O SDK fornece um helper `decodeJson` para analisá-lo:

```typescript
import { decodeJson } from "@chainlink/cre-sdk";

// Analisar como JSON (recomendado)
const inputData = decodeJson(payload.input);

// Ou converter para string manualmente
const inputString = new TextDecoder().decode(payload.input);

// Ou analisar manualmente
const inputJson = JSON.parse(new TextDecoder().decode(payload.input));
```

### Função callback

Sua função callback para HTTP triggers deve seguir esta assinatura:

```typescript
import { type Runtime, type HTTPPayload } from "@chainlink/cre-sdk";

const onHttpTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): YourReturnType => {
  // Sua lógica de workflow aqui
  return result;
}
```

**Parâmetros:**

- `runtime`: O objeto runtime usado para invocar capabilities e acessar configuração
- `payload`: O payload HTTP contendo a entrada da requisição, método e cabeçalhos
