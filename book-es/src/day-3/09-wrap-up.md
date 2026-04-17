# Cierre: Flujo Completo y Próximos Pasos

Has construido un mercado de predicción impulsado por IA. 

Ahora recorramos el flujo completo de principio a fin.

## Flujo Completo de Extremo a Extremo

Aquí está el viaje completo desde la creación del mercado hasta reclamar las ganancias:

```
+-----------------------------------------------------------------+
|                    FLUJO COMPLETO                                |
+-----------------------------------------------------------------+
|                                                                  |
|  0. DESPLEGAR CONTRATO (Foundry)                                 |
|     +-> forge create -> PredictionMarket desplegado en Sepolia   |
|                                                                  |
|  1. CREAR MERCADO (HTTP Trigger)                                 |
|     +-> HTTP Request -> CRE Workflow -> EVM Write -> Mercado Activo|
|                                                                  |
|  2. HACER PREDICCIONES (Llamadas Directas al Contrato)           |
|     +-> Los usuarios llaman predict() con apuestas en ETH       |
|                                                                  |
|  3. SOLICITAR LIQUIDACION (Llamada Directa al Contrato)          |
|     +-> Cualquiera llama requestSettlement() -> Emite Evento     |
|                                                                  |
|  4. LIQUIDAR MERCADO (Log Trigger)                               |
|     +-> Evento -> CRE Workflow -> Consulta IA -> EVM Write -> Liquidado|
|                                                                  |
|  5. RECLAMAR GANANCIAS (Llamada Directa al Contrato)            |
|     +-> Los ganadores llaman claim() -> Reciben pago en ETH     |
|                                                                  |
+-----------------------------------------------------------------+
```

### Paso 0: Desplegar el Contrato

```bash
source .env
cd prediction-market/contracts

forge create src/PredictionMarket.sol:PredictionMarket \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --broadcast \
  --constructor-args 0x15fc6ae953e024d975e77382eeec56a9101f9f88
```

Guarda la dirección desplegada y actualiza `config.staging.json`:

```bash
export MARKET_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
```

### Paso 1: Crear un Mercado

```bash
cd .. # asegurate de estar en el directorio prediction-market
cre workflow simulate my-workflow --broadcast
```

Selecciona HTTP trigger (opción 1), luego ingresa:

```json
{"question": "Will Argentina win the 2022 World Cup?"}
```

### Paso 2: Hacer Predicciones

```bash
# Predict YES on market #0 with 0.01 ETH
cast send $MARKET_ADDRESS \
  "predict(uint256,uint8)" 0 0 \
  --value 0.01ether \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

### Paso 3: Solicitar Liquidación

```bash
cast send $MARKET_ADDRESS \
  "requestSettlement(uint256)" 0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

Guarda el hash de la transacción!

### Paso 4: Liquidar via CRE

```bash
cre workflow simulate my-workflow --broadcast
```

Selecciona Log trigger (opción 2), ingresa el hash de la transacción e indice del evento 0.

### Paso 5: Reclamar Ganancias

```bash
cast send $MARKET_ADDRESS \
  "claim(uint256)" 0 \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY
```

> En una computadora con Windows, usa `Git Bash` para ejecutar todos los comandos de foundry, como **forge**, **cast**, u otros comandos basados en Unix, como **export**.

---


## Que Sigue?

### Explorar Casos de Uso

Consulta [5 Ways to Build with CRE](https://blog.chain.link/5-ways-to-build-with-cre/):

1. **Emisión de Stablecoins** - Verificación automatizada de reservas
2. **Servicio de Activos Tokenizados** - Gestion de activos del mundo real
3. **Mercados de Predicción Impulsados por IA** - Acabas de construir esto!
4. **Agentes de IA con Pagos x402** - Agentes autonomos
5. **Proof of Reserve Personalizado** - Infraestructura de transparencia


### Explorar Convergence: Un Hackathon de Chainlink

![cre-hackathon-2026](../assets/cre-hackathon-2026.png)

Este Hackathon de Chainlink reunio a desarrolladores de todo el mundo para construir aplicaciones avanzadas aprovechando la plataforma Chainlink.

[Anunciando los Ganadores](https://blog.chain.link/convergence-hackathon-winners/)
[Explorar los proyectos ganadores](https://chain.link/hackathon/winners)


### Enlaces Utiles de CRE

- [Consensus Computing](https://docs.chain.link/cre/concepts/consensus-computing)
- [Finality and Confidence Levels](https://docs.chain.link/cre/concepts/finality-ts)
- [Secrets Management](https://docs.chain.link/cre/guides/workflow/secrets)
- [Deploying Workflows](https://docs.chain.link/cre/guides/operations/deploying-workflows)
- [Monitoring & Debugging Workflows](https://docs.chain.link/cre/guides/operations/monitoring-workflows)

### Desplegar en Producción

Listo para salir en vivo? Solicita Early Access:
- [cre.chain.link/request-access](https://cre.chain.link/request-access)

### Unete a la Comunidad

- [Discord](https://discord.gg/chainlink) - Obtener ayuda y compartir tus proyectos
- [Developer Docs](https://docs.chain.link/cre) - Profundizar en CRE
- [GitHub](https://github.com/smartcontractkit) - Explorar ejemplos

---

## Gracias!
