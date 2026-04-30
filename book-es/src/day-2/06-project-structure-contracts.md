## Estructura del Proyecto con Smart Contracts

La estructura completa del proyecto ahora incluye tanto el workflow CRE como los contratos Foundry:

```bash
prediction-market/
├── project.yaml              # Configuraciones a nivel de proyecto CRE
├── secrets.yaml              # Mapeo de variables secretas CRE
├── my-workflow/              # Directorio del workflow CRE
│   ├── workflow.yaml         # Configuraciones específicas del workflow
│   ├── main.ts               # Punto de entrada del workflow
│   ├── config.staging.json   # Configuración para simulación
│   ├── package.json          # Dependencias de Node.js
│   └── tsconfig.json         # Configuración de TypeScript
└── contracts/                # Proyecto Foundry (recién creado)
    ├── foundry.toml          # Configuración de Foundry
    ├── script/               # Scripts de despliegue (no los usaremos)
    ├── src/
    │   ├── PredictionMarket.sol
    │   └── interfaces/
    │       ├── IReceiver.sol
    │       └── ReceiverTemplate.sol
    └── test/                 # Tests (opcional)
```

### Compilar el Contrato

```bash
forge build
```

Deberías ver:
```bash
Compiler run successful!
```

Quizás puedas notar algunas `notes` o `warnings` después del mensaje `Compiler run successful!`, ignóralos.


## Desplegando el Contrato

Usaremos el archivo `.env` que creamos anteriormente. 

- Desde el directorio contracts
- Carga las variables de entorno:

```bash
# Cargar variables de entorno desde el archivo .env
source ../.env
```

> **Nota**: El comando `source ../.env` carga las variables del archivo `.env` en el directorio `prediction-market` (directorio padre de `contracts`).


Despliega el smart contract `PredictionMarket` usando la dirección del MockKeystoneForwarder para Sepolia como argumento del constructor:

```bash
forge create src/PredictionMarket.sol:PredictionMarket \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --broadcast \
  --constructor-args 0x15fc6ae953e024d975e77382eeec56a9101f9f88
```

Verás una salida como:
```bash
Deployer: 0x...
Deployed to: 0x...   <-- Guarda esta dirección!
Transaction hash: 0x...
```

## Después del Despliegue

**Guarda la dirección del contrato!** 

Esta es la dirección de `PredictionMarket.sol` desplegada durante el paso anterior.
Es la dirección **Deployed to**.

Ejemplo - Dirección de PredictionMarket desplegada por nosotros: 
[0x3c01d85D7d2b7C505b1317b1e7f418334A7777bd](https://sepolia.etherscan.io/address/0x3c01d85D7d2b7C505b1317b1e7f418334A7777bd)


## Actualizar la configuración del workflow CRE

Ve a la carpeta del workflow:

```bash
cd ../my-workflow
```

- Abre el archivo `config.staging.json`
- Borra el contenido
- Copia y pega esto:

```json
{
  "geminiModel": "gemini-2.5-flash",
  "evms": [
    {
      "marketAddress": "0xYOUR_CONTRACT_ADDRESS_HERE",
      "chainSelectorName": "ethereum-testnet-sepolia",
      "gasLimit": "500000"
    }
  ]
}
```

Actualiza **marketAddress** con la dirección de `PredictionMarket.sol` desplegada durante el paso anterior.

Configuramos `gasLimit` en `500000` para este ejemplo porque es suficiente, pero otros casos de uso pueden consumir más gas.

> **Nota**: Crearemos mercados a través del workflow HTTP trigger en los próximos capítulos. Por ahora, solo necesitas el contrato desplegado!

## Resumen

Ahora tienes:
- Un smart contract `PredictionMarket` desplegado en Sepolia
- Un evento (`SettlementRequested`) que CRE puede escuchar
- Una función (`onReport`) que CRE puede llamar con resultados determinados por IA
- Lógica de pago a ganadores después de la liquidación
