# 快速开始

## 1. 检查环境

```bash
bili-sub doctor
```

如果提示找不到命令，在项目根目录运行：

```bash
node scripts/bili-sub.mjs doctor
```

## 2. 登录 B站

```bash
bili-sub login
```

在 Tabbit 浏览器中扫码登录，然后重新运行：

```bash
bili-sub doctor
```

输出中应包含：

```json
"loggedIn": true
```

`doctor` 还会列出收藏夹 ID，可用于配置 `favoriteFolders`。

## 3. 抓取一个视频

```bash
bili-sub video BV1dz4164ELm
```

成功后会在输出目录生成一个 Markdown 文件。

## 4. 扫描关注动态

```bash
bili-sub feed --limit 3 --feed-pages 1
```

- `--limit`：本次最多处理几个视频。
- `--feed-pages`：读取几页关注动态。
- 无字幕视频只记录状态，不生成文档。

## 5. 扫描收藏夹

```bash
bili-sub favorites --folder 123456789 --limit 5
```

多个收藏夹可以重复传入：

```bash
bili-sub favorites --folder 123456789 --folder 987654321
```

## 6. 配置定时扫描

复制配置：

```powershell
Copy-Item config.example.json bili-sub.config.json
```

编辑 `bili-sub.config.json`，把 `outputDir` 改成 Markdown 保存目录，并确认关注动态和收藏夹设置，然后手动运行：

```bash
bili-sub run
```

稳定后再注册系统定时任务，参见 [scheduling.md](scheduling.md)。

## 7. 查看状态

```bash
bili-sub list
```

常见状态：

- `done`：已成功导出。
- `no_subtitle`：无字幕，等待后续复查。
- `failed`：失败，下次运行会重试。

## 8. 强制重抓

```bash
bili-sub video BV1dz4164ELm --force
```

立即复查无字幕视频：

```bash
bili-sub feed --retry-no-subtitle
```
