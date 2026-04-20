# El Modelo Mental de CRE

Antes de empezar a programar, construyamos un modelo mental de qué es CRE y cómo funciona.

## ¿Qué es CRE?

El **Chainlink Runtime Environment (CRE)** es una capa de orquestación que te permite escribir smart contracts de grado institucional y ejecutar tus propios workflows en TypeScript o Golang, impulsados por redes de oráculos descentralizados (DONs) de Chainlink. 

Con CRE, puedes componer diferentes capacidades (por ejemplo, HTTP, lecturas y escrituras on-chain, firma, consenso) en workflows verificables que conectan smart contracts con APIs, servicios en la nube, sistemas de IA, otras blockchains y más. Los workflows luego se ejecutan a través de los DONs con consenso integrado, sirviendo como un runtime seguro, resistente a manipulaciones y de alta disponibilidad.

### El Problema que CRE Resuelve

Los smart contracts tienen una limitación fundamental: **solo pueden ver lo que está en su blockchain**.

- ❌ No pueden verificar el clima actual
- ❌ No pueden obtener datos de APIs externas
- ❌ No pueden llamar modelos de IA
- ❌ No pueden leer de otras blockchains

CRE cierra esta brecha proporcionando un **runtime verificable** donde puedes:

- ✅ Obtener datos de cualquier API
- ✅ Leer de múltiples blockchains
- ✅ Llamar servicios de IA
- ✅ Escribir resultados verificados de vuelta on-chain

Todo con **consenso criptográfico** asegurando que cada operación sea verificada.

## Conceptos Fundamentales

### 1. Workflows

Un **Workflow** es el código offchain que desarrollas, escrito en TypeScript o Go. CRE lo compila a WebAssembly (WASM) y lo ejecuta a través de una Red de Oráculos Descentralizados (DON).

```typescript
// Un workflow es simplemente código en TypeScript o Go!
const initWorkflow = (config: Config) => {
  return [
    cre.handler(trigger, callback),
  ]
}
```

### 2. Triggers

Los **Triggers** son eventos que inician tu workflow. CRE soporta tres tipos:

| Trigger | Cuándo se Activa | Caso de Uso |
|---------|------------------|-------------|
| **CRON** | Según un horario | "Ejecutar workflow cada hora" |
| **HTTP** | Al recibir una solicitud HTTP | "Crear mercado cuando se llama a la API" |
| **Log** | Cuando un smart contract emite un evento | "Liquidar cuando se active SettlementRequested" |

### 3. Capabilities

Las **Capabilities** son lo que tu workflow puede HACER - microservicios que realizan tareas específicas:

| Capability | Qué Hace |
|------------|----------|
| **HTTP** | Realizar solicitudes HTTP a APIs externas |
| **EVM Read** | Leer datos de smart contracts |
| **EVM Write** | Escribir datos en smart contracts |

Cada capability se ejecuta en su propio DON especializado con consenso integrado.

### 4. Decentralized Oracle Networks (DONs)

Un **DON** es una red de nodos independientes que:
1. Ejecutan tu workflow de forma independiente
2. Comparan sus resultados
3. Alcanzan consenso usando protocolos Byzantine Fault Tolerant (BFT)
4. Devuelven un único resultado verificado

## El Patrón Trigger-and-Callback

Esta es la arquitectura estándar principal que utilizará a lo largo de cada workflow de CRE:

```typescript
cre.handler(
  trigger,    // CUÁNDO ejecutar (cron, http, log)
  callback    // QUÉ ejecutar (tu lógica)
)
```

### Ejemplo: Un Workflow Cron Simple

```typescript
// Trigger: cada 10 minutos
const cronCapability = new cre.capabilities.CronCapability()
const cronTrigger = cronCapability.trigger({ schedule: "0 */10 * * * *" })

// Callback: que se ejecuta cuando se activa
function onCronTrigger(runtime: Runtime<Config>): string {
  runtime.log("Hello from CRE!")
  return "Success"
}

// Conectarlos juntos
const initWorkflow = (config: Config) => {
  return [
    cre.handler(
      cronTrigger,
      onCronTrigger
    ),
  ]
}
```

## Flujo de Ejecución

Cuando un trigger se activa, esto es lo que sucede:

```
1. El trigger se activa (horario cron, solicitud HTTP o evento on-chain)
           |
           v
2. El Workflow DON recibe el trigger
           |
           v
3. Cada nodo ejecuta tu callback de forma independiente
           |
           v
4. Cuando el callback invoca una capability (HTTP, EVM Read, etc.):
           |
           v
5. El Capability DON realiza la operación
           |
           v
6. Los nodos comparan resultados via consenso BFT
           |
           v
7. Un único resultado verificado se devuelve a tu callback
           |
           v
8. El callback continua con datos confiables
```

## Conceptos principales

| Concepto | Resumen |
|----------|---------|
| **Workflow** | Tu lógica de automatización, compilada a WASM |
| **Trigger** | Evento que inicia la ejecución (CRON, HTTP, Log) |
| **Callback** | Función que contiene tu lógica de negocio |
| **Capability** | Microservicio que realiza una tarea específica (HTTP, EVM Read/Write) |
| **DON** | Red de nodos que ejecutan con consenso |
| **Consensus** | Protocolo BFT que asegura resultados verificados |


## Siguientes Pasos

Ahora que entiendes el modelo mental, configuremos tu primer proyecto CRE!
