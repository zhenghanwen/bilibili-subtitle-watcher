# 多 Agent 接入

项目包含一个标准 Skill 源目录：

```text
skill/
├── SKILL.md
└── references/
```

只要 Agent 支持基于 `SKILL.md` 的 Skill 机制，就可以把该目录复制到对应 Skill 目录，或在安装脚本中指定自定义目录。

## 豆包 / Doubao Work

Windows：

```powershell
.\install.ps1 -SkillAgent doubao
```

默认目标：

```text
%LOCALAPPDATA%\Doubao\User Data\Default\.doubao\agent_mode\workspace\.user_skills\bilibili-subtitle-watcher
```

## Claude Code

Windows：

```powershell
.\install.ps1 -SkillAgent claude
```

macOS / Linux：

```bash
./install.sh claude
```

默认目标：

```text
~/.claude/skills/bilibili-subtitle-watcher
```

## Workbody / 其他 Agent

如果 Agent 有独立 Skill 目录，使用自定义安装：

```powershell
.\install.ps1 -SkillAgent custom -SkillDir "D:\Agent\skills"
```

macOS / Linux：

```bash
./install.sh custom /path/to/agent/skills
```

安装器会把 `skill/` 内容复制到目标目录下的 `bilibili-subtitle-watcher/`。

## 手动安装

1. 安装 CLI：

   ```bash
   npm install -g .
   ```

2. 复制 Skill：

   ```powershell
   New-Item -ItemType Directory -Path "<skill-root>\bilibili-subtitle-watcher" -Force
   Copy-Item .\skill\* "<skill-root>\bilibili-subtitle-watcher\" -Recurse -Force
   ```

   macOS/Linux：

   ```bash
   mkdir -p ~/.claude/skills/bilibili-subtitle-watcher
   cp -R skill/. ~/.claude/skills/bilibili-subtitle-watcher/
   ```

3. 确认 Agent 能调用命令：

   ```bash
   bili-sub doctor
   ```

## CLI 不在 Agent PATH 中怎么办

某些桌面 Agent 不继承 npm 全局 PATH。可在 Agent 的 Skill 目录中放一个包装脚本，或使用绝对路径：

```bash
node /absolute/path/to/bilibili-subtitle-watcher/scripts/bili-sub.mjs run
```

也可以在系统环境变量中加入 npm 全局 bin 目录后重启 Agent。

## 升级 Skill

更新项目后重新运行安装脚本：

```bash
git pull
npm install -g .
.\install.ps1 -SkillAgent doubao
```

## Agent 调用边界

Skill 指导 Agent 调用 CLI，但不要求 Agent 直接操作 B站 Cookie。遇到登录、扫码、验证码时，应由用户在 Tabbit 浏览器中完成。
