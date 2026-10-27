# CLI 与配置

## 命令

### doctor

检查 Node、Tabbit CLI、B站登录态和收藏夹。

```bash
bili-sub doctor
```

### login

打开 B站首页供用户扫码登录。

```bash
bili-sub login
```

### video

抓取一个或多个指定 BVID。

```bash
bili-sub video BV1dz4164ELm
bili-sub video BV1dz4164ELm BV1xxxxxxxxxx
bili-sub video BV1dz4164ELm --all-pages
```

### feed

扫描关注动态。

```bash
bili-sub feed
bili-sub feed --limit 5 --feed-pages 2
```

### favorites

扫描收藏夹。

```bash
bili-sub favorites --folder 123456789
bili-sub favorites --folder 123456789 --folder 987654321 --limit 10
```

### run

按配置扫描关注动态和收藏夹，用于定时任务。

```bash
bili-sub run
```

### list

列出最近状态。

```bash
bili-sub list
```

## 参数

| 参数 | 说明 |
| --- | --- |
| `--config <path>` | 指定配置文件。 |
| `--output <dir>` | 指定输出目录。 |
| `--limit <n>` | 本次最多处理视频数。 |
| `--feed-pages <n>` | 关注动态页数。 |
| `--folder <id>` | 指定收藏夹，可重复。 |
| `--all-pages` | 处理多 P 视频的全部分 P。 |
| `--no-all-pages` | 只处理第一 P。 |
| `--force` | 忽略已完成状态重新处理。 |
| `--retry-no-subtitle` | 立即复查无字幕视频。 |
| `-h, --help` | 查看帮助。 |

## 配置文件查找顺序

1. `--config`
2. `BILI_SUB_CONFIG`
3. 当前目录的 `bili-sub.config.json`
4. `~/.bili-sub/config.json`

## 配置项

```json
{
  "outputDir": "./output",
  "dataDir": "./data",
  "tabbitCli": "",
  "maxPerRun": 3,
  "feedPages": 1,
  "favoritesPageSize": 20,
  "includeAllPages": true,
  "delayMs": 2200,
  "timeoutMs": 180000,
  "sources": {
    "followingFeed": true,
    "favoriteFolders": []
  },
  "noSubtitleRetryHours": [24, 72, 168]
}
```

| 字段 | 说明 |
| --- | --- |
| `outputDir` | Markdown 保存目录。 |
| `dataDir` | 状态库和最后一次运行结果目录。 |
| `tabbitCli` | Tabbit CLI 路径；留空自动探测。 |
| `maxPerRun` | 单次处理上限。 |
| `feedPages` | 关注动态翻页数量。 |
| `favoritesPageSize` | 收藏夹每页数量。 |
| `includeAllPages` | 是否处理多 P。 |
| `delayMs` | 浏览器请求间隔。 |
| `timeoutMs` | Tabbit 单次程序超时。 |
| `sources.followingFeed` | `run` 是否扫描关注动态。 |
| `sources.favoriteFolders` | `run` 要扫描的收藏夹 ID。 |
| `noSubtitleRetryHours` | 无字幕视频的复查间隔。 |

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `TABBIT_CLI` | Tabbit CLI 可执行文件路径。 |
| `BILI_SUB_CONFIG` | 配置文件路径。 |
| `BILI_SUB_OUTPUT_DIR` | 输出目录，优先级高于配置文件。 |

## 状态库

`state.json` 记录视频状态、分 P、字幕语言、输出路径和错误。

- `done`：至少一个分 P 已生成字幕。
- `no_subtitle`：当前没有字幕。
- `no_subtitle_final`：已完成全部复查轮次，仍无字幕。
- `failed`：导航、接口或下载失败。
- `partial_failed`：多 P 视频中部分成功、部分失败。

## 文件名

输出文件以发布日期和视频标题命名：

```text
YYYY-MM-DD-标题.md
```

文件名会替换 Windows/macOS 不允许的字符，并限制长度。重名文件会自动追加序号，避免覆盖。
