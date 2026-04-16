## Estrutura do Projeto com Smart Contracts

A estrutura completa do projeto agora inclui tanto o workflow CRE quanto os contratos Foundry:

```bash
prediction-market/
├── project.yaml              # Configurações do projeto CRE
├── secrets.yaml              # Mapeamento de variáveis secretas CRE
├── my-workflow/              # Diretório do workflow CRE
│   ├── workflow.yaml         # Configurações específicas do workflow
│   ├── main.ts               # Ponto de entrada do workflow
│   ├── config.staging.json   # Configuração para simulação
│   ├── package.json          # Dependências Node.js
│   └── tsconfig.json         # Configuração TypeScript
└── contracts/                # Projeto Foundry (recém-criado)
    ├── foundry.toml          # Configuração do Foundry
    ├── script/               # Scripts de deploy (não usaremos)
    ├── src/
    │   ├── PredictionMarket.sol
    │   └── interfaces/
    │       ├── IReceiver.sol
    │       └── ReceiverTemplate.sol
    └── test/                 # Testes (opcional)
```

### Compilar o Contrato

```bash
forge build
```

Você deve ver:
```bash
Compiler run successful!
```

Talvez você note algumas `notes` ou `warnings` após a mensagem `Compiler run successful!`, ignore-as.


## Fazendo o Deploy do Contrato

Usaremos o arquivo `.env` que criamos anteriormente. 

- A partir do diretório contracts
- Carregue as variáveis de ambiente:

```bash
# Carregar variáveis de ambiente do arquivo .env
source ../.env
```

> **Nota**: O comando `source ../.env` carrega variáveis do arquivo `.env` no diretório `prediction-market` (pai de `contracts`).


Faça o deploy do smart contract `PredictionMarket` usando o endereço do MockKeystoneForwarder para Sepolia como argumento do construtor:

```bash
forge create src/PredictionMarket.sol:PredictionMarket \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --broadcast \
  --constructor-args 0x15fc6ae953e024d975e77382eeec56a9101f9f88
```

Você verá uma saída como:
```bash
Deployer: 0x...
Deployed to: 0x...   <-- Salve este endereço!
Transaction hash: 0x...
```

## Após o Deploy

**Salve o endereço do contrato!** 

Este é o endereço do `PredictionMarket.sol` implantado durante o passo anterior.
É o endereço **Deployed to**.

Exemplo - Endereço do PredictionMarket implantado por nós: 
[0x3c01d85D7d2b7C505b1317b1e7f418334A7777bd](https://sepolia.etherscan.io/address/0x3c01d85D7d2b7C505b1317b1e7f418334A7777bd)


## Atualizar configuração do workflow CRE

Vá para a pasta do workflow:

```bash
cd ../my-workflow
```

- Abra o arquivo `config.staging.json`
- Delete o conteúdo
- Copie e cole isto:

```json
{
  "geminiModel": "gemini-2.0-flash",
  "evms": [
    {
      "marketAddress": "0xYOUR_CONTRACT_ADDRESS_HERE",
      "chainSelectorName": "ethereum-testnet-sepolia",
      "gasLimit": "500000"
    }
  ]
}
```

Atualize **marketAddress** com o endereço do `PredictionMarket.sol` implantado durante o passo anterior.

Definimos `gasLimit` como `500000` para este exemplo porque é suficiente, mas outros casos de uso podem consumir mais gas.

> **Nota**: Criaremos mercados via o workflow de HTTP trigger nos próximos capítulos. Por enquanto, você só precisa do contrato implantado!

## Resumo

Agora você tem:
- ✅ Um smart contract `PredictionMarket` implantado na Sepolia
- ✅ Um evento (`SettlementRequested`) que o CRE pode escutar
- ✅ Uma função (`onReport`) que o CRE pode chamar com resultados determinados por IA
- ✅ Lógica de pagamento para vencedores após a liquidação
