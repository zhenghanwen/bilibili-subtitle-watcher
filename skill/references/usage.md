# 使用与定时运行

## 输出内容

有字幕的视频只生成一个 Markdown 文件：

- `YYYY-MM-DD-视频标题.md`：含 YAML frontmatter、视频信息、简介、带时间戳字幕。

没有字幕的视频不生成文件，只记录状态。

## 初始化

```bash
bili-sub doctor
bili-sub login
```

如果未全局安装，将 `bili-sub` 替换为 `node scripts/bili-sub.mjs`。

## 配置

推荐在项目根目录创建本地配置：

```bash
cp config.example.json bili-sub.config.json
```

Windows PowerShell：

```powershell
Copy-Item config.example.json bili-sub.config.json
```

常用字段：

- `outputDir`：Markdown 文件保存目录。
- `dataDir`：状态库目录。
- `tabbitCli`：留空自动探测；也可设置 `TABBIT_CLI`。
- `sources.followingFeed`：扫描关注动态。
- `sources.favoriteFolders`：收藏夹 ID 数组。
- `maxPerRun`：单次处理上限。
- `includeAllPages`：是否处理多 P。
- `noSubtitleRetryHours`：无字幕复查时间。

## 常用命令

```bash
bili-sub video BV1dz4164ELm
bili-sub feed --limit 3 --feed-pages 1
bili-sub favorites --folder 123456789 --limit 5
bili-sub run
bili-sub list
bili-sub video BV1dz4164ELm --force
```

## Windows 定时任务

先手动运行稳定后再注册。每 2 小时运行一次的示例：

```powershell
$action = New-ScheduledTaskAction -Execute "bili-sub.cmd" -Argument "run"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddHours(9) -RepetitionInterval (New-TimeSpan -Hours 2)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "B站字幕定时采集" -Action $action -Trigger $trigger -Settings $settings -Description "通过 Tabbit 登录态扫描 B站关注动态并归档有字幕视频"
```

如果全局命令不在任务计划 PATH 中，将 `-Execute` 改为 `node.exe`，并用 `-Argument` 指向项目中的 `scripts/bili-sub.mjs run`。

## 状态

状态库默认位于 `~/.bili-sub/data/state.json`；如果使用项目本地配置，则位于配置中的 `dataDir`。

- `done`：已生成字幕。
- `no_subtitle`：确认无字幕，等待后补复查。
- `failed`：处理失败，下次自动重试。

## 排障

- `AUTH_REQUIRED`：运行 `bili-sub login` 重新扫码。
- 403/限流：降低 `maxPerRun`，增大 `delayMs`。
- `Failed to fetch`：确认字幕 CDN 下载仍使用 Playwright Node 层 `context.request`。
- 收藏夹出现 `bilibili://video/...`：必须把 BVID 规范化为 `https://www.bilibili.com/video/<BVID>`。
