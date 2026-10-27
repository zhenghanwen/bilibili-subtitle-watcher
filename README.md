# bilibili-subtitle-watcher

通过 [Tabbit Browser](https://www.tabbit.com/) 复用本机 B站登录态，批量发现视频并下载字幕，将有字幕的视频导出为 Markdown 文档。没有字幕的视频会自动跳过，只记录状态。

它同时提供：

- **CLI**：`bili-sub`，可手动运行，也可挂到 Windows 任务计划、cron、launchd。
- **Agent Skill**：标准 `SKILL.md`，可安装到豆包、Claude Code、Workbody 或其他支持 Skill 的 Agent。

## 能力

- 按 BVID 抓取单个或多个视频。
- 扫描 B站关注动态，包括 UP 主投稿和动态中转发的视频。
- 扫描指定收藏夹。
- 自动选择中文字幕轨，兼容 AI 字幕。
- 有字幕才导出 Markdown；无字幕不生成空文档。
- 本地状态库去重、失败重试、无字幕延迟复查。
- 支持多 P 视频。
- 不保存 Cookie；登录态由 Tabbit 浏览器持有。

## 环境要求

- Node.js 18+
- 已安装并可登录的 Tabbit Browser
- Windows、macOS 或 Linux
- Windows 定时任务使用 PowerShell；macOS/Linux 可使用 cron 或 launchd

## 快速开始

克隆后进入项目目录：

```bash
git clone https://github.com/zhenghanwen/bilibili-subtitle-watcher.git
cd bilibili-subtitle-watcher
```

### Windows

```powershell
.\install.ps1 -SkillAgent doubao
bili-sub doctor
bili-sub login
```

安装到 Claude Code：

```powershell
.\install.ps1 -SkillAgent claude
```

安装到自定义 Skill 目录：

```powershell
.\install.ps1 -SkillAgent custom -SkillDir "D:\skills"
```

### macOS / Linux

```bash
chmod +x install.sh bin/bili-sub
./install.sh claude
bili-sub doctor
bili-sub login
```

### 不安装，直接运行

```bash
node scripts/bili-sub.mjs doctor
node scripts/bili-sub.mjs login
```

## 常用命令

```bash
# 检查环境和登录态
bili-sub doctor

# 打开 B站登录页
bili-sub login

# 抓取指定视频
bili-sub video BV1dz4164ELm

# 扫描关注动态
bili-sub feed --limit 3 --feed-pages 1

# 扫描收藏夹
bili-sub favorites --folder 123456789 --limit 5

# 按配置执行，适合定时任务
bili-sub run

# 查看状态
bili-sub list
```

## 配置 Markdown 保存位置

复制示例配置：

```powershell
Copy-Item config.example.json bili-sub.config.json
```

把 `outputDir` 改成你想保存 Markdown 的目录：

```json
{
  "outputDir": "D:/Documents/B站字幕",
  "dataDir": "./data",
  "tabbitCli": "",
  "maxPerRun": 3,
  "feedPages": 1,
  "includeAllPages": true,
  "sources": {
    "followingFeed": true,
    "favoriteFolders": []
  }
}
```

也可以在每次运行时临时指定：

```bash
bili-sub video BV1dz4164ELm --output "D:/Documents/B站字幕"
```

配置查找顺序：

1. `--config <path>`
2. `BILI_SUB_CONFIG` 环境变量
3. 当前目录的 `bili-sub.config.json`
4. `~/.bili-sub/config.json`

`tabbitCli` 留空会自动探测；也可以设置环境变量 `TABBIT_CLI`。

## 输出示例

每个有字幕的视频只生成一个 Markdown 文件：

```text
output/
└── 2026-08-29-视频标题.md
```

Markdown 包含 YAML frontmatter、UP 主、视频链接、发布时间、视频简介和带时间戳的字幕正文。

## 定时运行

Windows 每 2 小时运行一次的示例见 [docs/scheduling.md](docs/scheduling.md)。推荐先手动执行 `bili-sub run` 稳定后，再注册任务计划。

## 文档

- [安装指南](docs/installation.md)
- [快速开始](docs/quick-start.md)
- [CLI 与配置](docs/usage.md)
- [多 Agent 接入](docs/agent-integration.md)
- [定时任务](docs/scheduling.md)
- [架构说明](docs/architecture.md)
- [排障指南](docs/troubleshooting.md)
- [第三方许可](THIRD_PARTY_NOTICES.md)

## 安全说明

- 不要求、不保存、不打印 SESSDATA、bili_jct、Cookie 或浏览器 User Data。
- 登录和扫码由用户在 Tabbit 浏览器中完成。
- 工具只读取视频、字幕、关注动态和收藏夹数据，不执行点赞、评论、关注、投稿等写操作。
- 建议保守设置 `maxPerRun` 和 `delayMs`，避免高频请求。

## 许可

MIT License。字幕链路参考了 [haixiong1997/Bilibili-Obsidian-Clipper](https://github.com/haixiong1997/Bilibili-Obsidian-Clipper)，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
