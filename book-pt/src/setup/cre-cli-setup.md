# Sprint de Configuração do CRE CLI

Antes de começarmos a construir, vamos garantir que seu ambiente CRE esteja configurado corretamente. Seguiremos as instruções oficiais de configuração em [cre.chain.link](https://cre.chain.link).

## Passo 1: Criar uma Conta CRE

1. Acesse [cre.chain.link](https://cre.chain.link)
2. Crie uma conta ou faça login
3. Acesse o painel da plataforma CRE

![CRE Signup](../assets/cre-signup.png)

## Passo 2: Instalar o CRE CLI

O **CRE CLI** é essencial para compilar e simular workflows. Ele compila seu código TypeScript em binários WebAssembly (WASM) e permite que você teste workflows localmente antes do deploy.

### Opção 1: Instalação Automática

A maneira mais fácil de instalar o CRE CLI é usando o script de instalação ([documentação de referência](https://docs.chain.link/cre/getting-started/cli-installation)):

#### macOS/Linux

```bash
curl -sSL https://cre.chain.link/install.sh | sh
```

#### Windows

```powershell
irm https://cre.chain.link/install.ps1 | iex
```

### Opção 2: Instalação Manual

Se você preferir instalar manualmente ou a instalação automática não funcionar para o seu ambiente, siga as instruções de instalação da Documentação Oficial da Chainlink para sua plataforma:

- [macOS/Linux](https://docs.chain.link/cre/getting-started/cli-installation/macos-linux#manual-installation)
- [Windows](https://docs.chain.link/cre/getting-started/cli-installation/windows#manual-installation)

### Verificar Instalação

```bash
cre version
```

## Passo 3: Autenticar com o CRE CLI

Autentique seu CLI com sua conta CRE:

```bash
cre login
```

Isso abrirá uma janela do navegador para você se autenticar. Uma vez autenticado, seu CLI está pronto para uso.

![CRE Successful Login](../assets/cre-successful-login.png)

Verifique seu status de login e detalhes da conta com:

```bash
cre whoami
```

## Resolução de Problemas

### CRE CLI Não Encontrado

Se o comando `cre` não for encontrado após a instalação:

```bash
# Adicione ao seu perfil de shell (~/.bashrc, ~/.zshrc, etc.)
export PATH="$HOME/.cre/bin:$PATH"

# Recarregue seu shell
source ~/.zshrc  # ou ~/.bashrc
```

## O Que é Possível Agora?

Agora que seu ambiente CRE está configurado, você pode:

- **Criar novos projetos CRE**: Comece executando o comando `cre init`
- **Compilar workflows**: O CRE CLI compila seu código TypeScript em binários WASM
- **Simular workflows**: Teste seus workflows localmente com `cre workflow simulate`
- **Fazer deploy de workflows**: Quando estiver pronto, faça o deploy em produção (Acesso Antecipado)
