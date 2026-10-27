# 安装指南

## 1. 安装依赖

需要：

- Node.js 18 或更高版本
- Tabbit Browser
- Git（可选，用于克隆和更新）

检查 Node：

```bash
node --version
npm --version
```

## 2. 获取项目

```bash
git clone https://github.com/<your-name>/bilibili-subtitle-watcher.git
cd bilibili-subtitle-watcher
```

也可以下载 ZIP 后解压进入项目目录。

## 3. Windows 安装

默认安装 CLI，并把 Skill 安装到豆包：

```powershell
.\install.ps1 -SkillAgent doubao
```

安装到 Claude Code：

```powershell
.\install.ps1 -SkillAgent claude
```

安装到自定义 Agent 的 Skill 目录：

```powershell
.\install.ps1 -SkillAgent custom -SkillDir "C:\path\to\skills"
```

只安装 CLI，不安装 Skill：

```powershell
.\install.ps1 -SkillAgent none
```

不使用 npm 全局安装，只复制 Skill：

```powershell
.\install.ps1 -SkillAgent doubao -NoGlobalInstall
```

## 4. macOS / Linux 安装

Claude Code：

```bash
chmod +x install.sh bin/bili-sub
./install.sh claude
```

自定义 Skill 目录：

```bash
./install.sh custom /path/to/skills
```

只安装 CLI：

```bash
npm install -g .
```

## 5. 登录 B站

```bash
bili-sub doctor
bili-sub login
```

`login` 会在 Tabbit 中打开 B站。完成扫码后再次运行：

```bash
bili-sub doctor
```

看到 `loggedIn: true` 和账号信息即成功。

## 6. Tabbit CLI 路径

默认自动探测：

- Windows：`%LOCALAPPDATA%\Tabbit\LocalAgent\bin\tabbit-cli.exe`
- macOS/Linux：`~/.local/bin/tabbit-cli`

如果自动探测失败，可复制配置文件并设置 `tabbitCli`，或设置环境变量：

```powershell
$env:TABBIT_CLI = "C:\path\to\tabbit-cli.exe"
```

也可以使用 CLI 参数：

```bash
bili-sub doctor --config /path/to/config.json
```

## 升级

```bash
git pull
npm install -g .
```

如果 Agent 的 Skill 目录是复制安装，重新运行安装脚本即可。

## 卸载

```bash
npm uninstall -g bilibili-subtitle-watcher
```

删除 Agent 的 Skill 目录：

- 豆包：`.doubao/agent_mode/workspace/.user_skills/bilibili-subtitle-watcher`
- Claude Code：`~/.claude/skills/bilibili-subtitle-watcher`

本地配置和状态默认位于 `~/.bili-sub/`，删除前请确认不再需要状态库。
