# Repaso y Preguntas

Bienvenidos de vuelta al Día 2! Repasemos lo que aprendimos ayer y respondamos cualquier pregunta.

## Repaso del Día 1


### Conceptos Clave Cubiertos

| Concepto | Lo Que Aprendimos |
|----------|-------------------|
| **Modelo Mental de CRE** | Workflows, Triggers, Capabilities, DONs |
| **Estructura del Proyecto** | project.yaml, workflow.yaml, config.json |
| **Scaffold CRE** | Creando un modelo de negocio CRE |


## Agenda de Hoy

Hoy completaremos el mercado de predicción con:

1. **PredictionMarket.sol** - Creando el smart contract
2. **HTTP Trigger** - Recibiendo solicitudes HTTP externas
3. **Capacidad EVM Write** - El patrón de dos pasos (report -> writeReport)
4. **Flujo de Creación de Mercados** - Creando una pregunta de mercado de predicción


### Arquitectura

```
+-----------------------------------------------------------------+
|                        Día 2: Creación de Mercados               |
|                                                                  |
|   HTTP Request --> CRE Workflow --> PredictionMarket.sol          |
|   (question)       (HTTP Trigger)   (createMarket)               |
+-----------------------------------------------------------------+

```


## Verificación Rápida del Entorno

Antes de continuar, verifiquemos que todo este configurado:

```bash
# Verificar autenticación CRE
cre whoami
```


## Listos para el Día 2!

Sumerjámonos en el proyecto Prediction Market.
