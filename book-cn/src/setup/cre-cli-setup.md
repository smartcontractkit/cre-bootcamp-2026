# CRE CLI 快速配置

在开始构建之前，让我们确认你的 CRE 环境已正确搭建。我们将按照 [cre.chain.link](https://cre.chain.link) 上的官方指南进行设置。

## 步骤 1：创建 CRE 账户

1. 访问 [cre.chain.link](https://cre.chain.link)
2. 创建账户或登录
3. 进入 CRE 平台仪表盘

![CRE Signup](../assets/cre-signup.png)

## 步骤 2：安装 CRE CLI

**CRE CLI**是编译和模拟 workflow 的必备工具。它将你的 TypeScript 代码编译为 WebAssembly (WASM) 二进制文件，并允许你在部署前在本地测试 workflow。

### 方式 1：自动安装

最简单的安装方式是使用安装脚本（[参考文档](https://docs.chain.link/cre/getting-started/cli-installation)）：

#### macOS/Linux

```bash
curl -sSL https://cre.chain.link/install.sh | sh
```

#### Windows

```powershell
irm https://cre.chain.link/install.ps1 | iex
```

### 方式 2：手动安装

如果你更倾向于手动安装，或自动安装不适用于你的环境，请参考 Chainlink 官方文档中适用于你平台的安装说明：

- [macOS/Linux](https://docs.chain.link/cre/getting-started/cli-installation/macos-linux#manual-installation)
- [Windows](https://docs.chain.link/cre/getting-started/cli-installation/windows#manual-installation)

### 验证安装

```bash
cre version
```

## 步骤 3：使用 CRE CLI 进行身份验证

将你的 CLI 与 CRE 账户关联：

```bash
cre login
```

这将打开浏览器窗口供你进行身份验证。验证通过后，你的 CLI 就可以使用了。

![CRE Successful Login](../assets/cre-successful-login.png)

查看登录状态和账户信息：

```bash
cre whoami
```

## 故障排除

### 找不到 CRE CLI 命令

如果安装后 `cre` 命令未找到：

```bash
# 添加到你的 shell 配置文件（~/.bashrc、~/.zshrc 等）
export PATH="$HOME/.cre/bin:$PATH"

# 重新加载 shell
source ~/.zshrc  # 或 ~/.bashrc
```

## 现在你可以做什么？

CRE 环境搭建完成后，你可以：

- **创建新的 CRE 项目**：运行 `cre init` 命令开始
- **编译 workflow**：CRE CLI 将你的 TypeScript 代码编译为 WASM 二进制文件
- **模拟 workflow**：使用 `cre workflow simulate` 在本地测试 workflow
- **部署 workflow**：准备好后部署到生产环境（Early Access）
