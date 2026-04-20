# Lo Que Vamos a Construir

## El Caso de Uso: Mercados de Predicción Impulsados por IA

Estamos construyendo un **Mercado de Predicción On-chain Impulsado por IA** - un sistema completo donde:

1. **Se crean mercados on-chain** a través de workflows CRE activados por HTTP
2. **Los usuarios hacen predicciones** apostando ETH en Sí o No
3. **Los usuarios pueden solicitar la liquidación** de cualquier mercado
4. **CRE detecta automáticamente** las solicitudes de liquidación a través de Log Triggers
5. **Google Gemini AI** determina el resultado del mercado
6. **CRE escribe** el resultado verificado on-chain
7. **Los ganadores reclaman** su parte del pool total -> `Tu apuesta * (Pool Total / Pool Ganador)`


## Visión General de la Arquitectura

```
+-----------------------------------------------------------------+
|                        Día 2: Creación de Mercados               |
|                                                                  |
|   HTTP Request --> CRE Workflow --> PredictionMarket.sol          |
|   (question)       (HTTP Trigger)   (createMarket)               |
+-----------------------------------------------------------------+

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

## Objetivos de Aprendizaje

Al completar este bootcamp, serás capaz de:

- **Explicar** qué es CRE y cuándo usarlo
- **Crear un modelo de negocio** usando CRE
- **Desarrollar y simular** workflows CRE en TypeScript
- **Usar** todos los triggers de CRE (CRON, HTTP, Log) y capacidades (HTTP, EVM Read, EVM Write)
- **Conectar** servicios de IA a smart contracts a través de workflows verificables
- **Construir** smart contracts compatibles con la capacidad de escritura en cadena de CRE


## Lo Que Aprenderás

### Día 1: Prerequisitos, Fundamentos y Mentalidad de Negocio CRE

| Tema | Lo Que Aprenderás |
|------|-------------------|
| Configuración del CRE CLI | Instalar herramientas, crear cuenta, verificar configuración |
| Modelo Mental de CRE | Qué es CRE, Workflows, Capabilities, DONs |
| Creando un Proyecto CRE | `cre init`, estructura del proyecto, primera simulación |
| Scaffold CRE | Planifica tu aplicación antes de desarrollarla |

**Fin del Día 1**: Estás listo para crear un proyecto CRE! 


### Día 2: Smart Contracts + Creación de Mercados

| Tema | Lo Que Aprenderás |
|------|-------------------|
| Smart Contract | Desarrollar PredictionMarket.sol  |
| Interfaces | Construir un Contrato Inteligente Compatible con CRE |
| HTTP Trigger | Recibir solicitudes HTTP externas |
| Capacidad EVM Write | Escribir datos en blockchain |
| Flujo de Creación de Mercados | Crear y Simular la Creación de Mercados |

**Fin del Día 2**: Crearás mercados on-chain a través de solicitudes HTTP!


### Día 3: Flujo Completo de Liquidación

| Tema | Lo Que Aprenderás |
|------|-------------------|
| Log Trigger | Reaccionar a eventos on-chain |
| EVM Read | Leer esdatos en contratos inteligentes |
| HTTP Capability | Realizar solicitudes HTTP |
| Integración con IA | Llamar a la API de Gemini con consenso |
| Haciendo Predicciones | Realizar apuestas en mercados con ETH |
| Flujo Completo | Conectar todo, liquidar, reclamar ganancias |

**Fin del Día 3**: Liquidación completa impulsada por IA funcionando de extremo a extremo!


## Demo!

Antes de sumergirnos en el desarrollo, veamos cómo será el proyecto final.
