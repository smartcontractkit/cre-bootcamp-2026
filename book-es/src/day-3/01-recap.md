# Repaso y Preguntas

Bienvenidos de vuelta al Día 3! Repasemos lo que aprendimos ayer y respondamos cualquier pregunta.

## Repaso del Día 2

### Lo Que Construimos

Ayer construimos un **workflow de creación de mercados**:

```
HTTP Request --> CRE Workflow --> PredictionMarket.sol
(question)       (HTTP Trigger)   (createMarket)
```

### Conceptos Clave Cubiertos

| Concepto | Lo Que Aprendimos |
|----------|-------------------|
| **PredictionMarket.sol** | La lógica del smart contract |
| **HTTP Trigger** | Recibir solicitudes HTTP externas |
| **EVM Write** | El patrón de dos pasos (report -> writeReport) |
| **Flujo de Creación de Mercados** | Crear una pregunta de mercado de predicción en Blockchain |

### El Patrón de Escritura en Dos Pasos

Este es el patrón más importante del Día 2:

```typescript
// Step 1: Encode and sign the data
const reportResponse = runtime
  .report({
    encodedPayload: hexToBase64(reportData),
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
  })
  .result();

// Step 2: Write to the contract
const writeResult = evmClient
  .writeReport(runtime, {
    receiver: contractAddress,
    report: reportResponse,
    gasConfig: { gasLimit: "500000" },
  })
  .result();
```

## Agenda de Hoy

Hoy completaremos el mercado de predicción con:

1. **Log Trigger** - Reaccionar a eventos on-chain
2. **EVM Read** - Leer estado de los smart contracts
3. **HTTP Capability** - Llamar a Gemini AI
4. **Flujo Completo** - Conectar todo

### Arquitectura

```
+-----------------------------------------------------------------+
|                      Día 3: Liquidación de Mercados              |
|                                                                  |
|   requestSettlement() --> SettlementRequested Event               |
|                                   |                              |
|                                   v                              |
|                           CRE Log Trigger                        |
|                                   |                              |
|                    +--------------+-------------------+          |
|                    v              v                   v          |
|              EVM Read         Gemini AI           EVM Write      |
|           (datos del mercado) (determinar resultado) (liquidar)  |
|                                                                  |
+-----------------------------------------------------------------+
```

## Preguntas Frecuentes

### P: ¿Por qué necesitamos el patrón de escritura en dos pasos?

**R:** El patrón de dos pasos proporciona:
- **Seguridad**: El reporte está firmado criptográficamente por el DON
- **Verificación**: Tu contrato puede verificar que la firma proviene de CRE
- **Consenso**: Múltiples nodos están de acuerdo en los datos antes de firmar

### P: Qué sucede si mi transacción falla?

**R:** Verifica:
1. Tu wallet tiene suficiente ETH para gas
2. La dirección del contrato es correcta
3. El límite de gas es suficiente
4. La función del contrato acepta los datos codificados

### P: Cómo depuro problemas del workflow?

**R:** Usa `runtime.log()` generosamente:

```typescript
runtime.log(`[DEBUG] Value: ${JSON.stringify(data)}`);
```

Todos los logs aparecen en la salida de la simulación.

### P: ¿Puedo tener múltiples triggers en un workflow?

**R:** ¡Sí! Eso es exactamente lo que haremos hoy. Un workflow puede tener hasta 10 triggers.

```typescript
const initWorkflow = (config: Config) => {
  return [
    cre.handler(httpTrigger, onHttpTrigger),
    cre.handler(logTrigger, onLogTrigger),
  ];
};
```

## Verificación Rápida del Entorno

Antes de continuar, verifiquemos que todo esté configurado:

Verifica la autenticación CRE
```bash
cre whoami
```

- En el directorio prediction-market
- Carga las variables de entorno desde el archivo .env.
- En una computadora con Windows, usa `Git Bash` para ejecutar los comandos de esta sección.

```bash
source .env
```

Verifica que tengas mercados creados (salida decodificada)

Configura la variable MARKET_ADDRESS:

```bash
export MARKET_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```

Ejecuta la función `getMarket` del Smart Contract del Prediction Market:


```bash
cast call $MARKET_ADDRESS \
  "getMarket(uint256) returns ((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" \
  0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

El resultado son los datos del mercado para el market ID 0.

## Listos para el Día 3!

Sumerjámonos en los Log Triggers y construyamos el workflow de liquidación.
