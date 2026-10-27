---
name: bilibili-subtitle-watcher
description: 使用 Tabbit 浏览器登录态批量获取哔哩哔哩/B站视频字幕，并将有字幕的视频导出为 Obsidian 友好的 Markdown、SRT、TXT。用于用户要求抓取 B站字幕、监控关注 UP 主新视频/转发视频、扫描指定收藏夹、定时归档字幕、跳过无字幕视频、按 BVID 导出字幕时。
---

# B站字幕定时采集

通过本机 Tabbit 浏览器复用 B站登录态，不要求用户把 Cookie 写入配置。CLI 负责发现视频、去重、限流、判断是否有字幕、生成 Obsidian Markdown；无字幕视频只记录状态，不生成正文文档。

## 快速流程

优先使用全局命令：

```bash
bili-sub doctor
bili-sub login
bili-sub video BV1xxxxxxxxxx
bili-sub run
```

如果未全局安装，在项目根目录运行：

```bash
node scripts/bili-sub.mjs doctor
node scripts/bili-sub.mjs login
node scripts/bili-sub.mjs video BV1xxxxxxxxxx
node scripts/bili-sub.mjs run
```

1. 运行 `doctor` 检查 Node、Tabbit CLI 和 B站登录态。
2. 未登录时运行 `login`，让用户在 Tabbit 中扫码。
3. 用 `video <BVID>` 做单视频验证。
4. 用 `feed` 扫描关注动态，或用 `favorites --folder <media_id>` 扫描收藏夹。
5. 用 `run` 配合系统定时器执行定时归档。

## 命令

| 命令 | 用途 |
| --- | --- |
| `doctor` | 检查 Node、Tabbit CLI、B站登录态、收藏夹列表。 |
| `login` | 在 Tabbit 打开 B站，保留登录页给用户扫码。 |
| `video <BVID...>` | 抓取指定视频；可重复传多个 BVID，加 `--all-pages` 处理多 P。 |
| `feed` | 扫描关注动态，包含 UP 主投稿和动态中转发的视频。 |
| `favorites --folder <media_id>` | 扫描指定收藏夹，可重复传 `--folder`。 |
| `run` | 按配置扫描关注动态和收藏夹来源。 |
| `list` | 查看本地状态库中的完成、无字幕、失败记录。 |

常用参数：`--config <path>`、`--output <dir>`、`--limit <n>`、`--feed-pages <n>`、`--all-pages`、`--force`、`--retry-no-subtitle`。

## 配置

配置查找顺序：

1. `--config <path>`
2. 环境变量 `BILI_SUB_CONFIG`
3. 当前工作目录的 `bili-sub.config.json`
4. 用户目录 `~/.bili-sub/config.json`

可将仓库中的 `config.example.json` 复制为 `bili-sub.config.json`。关键配置：

- `outputDir`：Markdown/SRT/TXT 输出目录。
- `tabbitCli`：留空时自动探测；也可用 `TABBIT_CLI` 指定。
- `sources.followingFeed`：是否扫描关注动态。
- `sources.favoriteFolders`：要扫描的收藏夹 `media_id` 数组。
- `maxPerRun`：单次最多处理多少个新视频。
- `noSubtitleRetryHours`：无字幕视频的复查时间，避免 UP 主后补 AI 字幕时漏抓。
- `delayMs`：请求间隔，建议保留 2 秒以上。

详细配置、Windows 任务计划和排障见 `references/usage.md`；Tabbit 桥接和接口边界见 `references/tabbit.md`；第三方来源与许可证见 `references/attribution.md`。

## 执行规则

- 优先使用 Tabbit 登录态，不读取、不打印、不落盘用户 Cookie。
- 有字幕才写 Markdown；没有字幕只更新状态库，不生成空文档。
- 每次处理前用状态库去重；失败可以重跑，已完成视频默认不重复下载。
- 不输出登录凭据；不要把状态库、日志或浏览器返回中的 Cookie 发给用户。
- 遇到 401 先引导用户重新登录；403 或限流时降低频率，不要并发冲接口。
- 字幕 CDN 内容必须在 Tabbit Node 层通过 Playwright `context.request` 下载；视频页 `window.fetch` 可能因跨域/扩展拦截返回 `Failed to fetch`。
