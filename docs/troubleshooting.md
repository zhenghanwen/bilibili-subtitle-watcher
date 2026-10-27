# 排障指南

## 找不到 Tabbit CLI

表现：`找不到 Tabbit CLI`。

先确认 Tabbit 已安装。默认路径：

- Windows：`%LOCALAPPDATA%\Tabbit\LocalAgent\bin\tabbit-cli.exe`
- macOS/Linux：`~/.local/bin/tabbit-cli`

指定路径：

```bash
TABBIT_CLI=/path/to/tabbit-cli bili-sub doctor
```

或在配置中设置 `tabbitCli`。

## 未登录

表现：`AUTH_REQUIRED` 或 `loggedIn: false`。

运行：

```bash
bili-sub login
```

在 Tabbit 中完成扫码，再运行：

```bash
bili-sub doctor
```

## 字幕轨存在但正文 Failed to fetch

这是字幕 CDN 跨域或浏览器扩展拦截导致。不要在页面上下文用 `window.fetch` 下载字幕正文。应使用：

```js
const response = await context.request.get(track.url, {
  headers: { Referer: 'https://www.bilibili.com/' },
  timeout: 30000
});
```

## 页面导航到 bilibili:// 协议失败

收藏夹中的 `jump_url` 可能是 `bilibili://video/...`。发现候选时必须使用 BVID 生成 HTTPS 地址：

```text
https://www.bilibili.com/video/<BVID>
```

## 403 或被限流

处理方式：

1. 降低 `maxPerRun`。
2. 增大 `delayMs`，建议 2200–5000。
3. 减少 `feedPages` 和收藏夹分页。
4. 暂停任务，等待一段时间。
5. 不要并发运行多个 `bili-sub` 任务。

## 多 P 视频只处理了第一 P

检查配置：

```json
"includeAllPages": true
```

或命令行加：

```bash
--all-pages
```

## 重复下载视频

检查状态库是否被更换。不同配置文件会使用不同 `dataDir`。定时任务应固定 `--config` 或固定工作目录。

## 已经生成但想重新下载

```bash
bili-sub video BV1dz4164ELm --force
```

## 无字幕视频一直复查

默认复查时间为 24、72、168 小时。完成后状态会变成 `no_subtitle_final`。也可以调整：

```json
"noSubtitleRetryHours": [24, 72]
```

## Windows 任务计划运行失败

常见原因：

- 任务计划找不到全局命令。
- Tabbit 没有可用桌面会话。
- B站登录态过期。
- 工作目录不是预期目录，导致找不到本地配置。

建议任务计划直接使用 `node.exe` 和绝对脚本路径，并通过 `--config` 指定配置。

## 输出文件标题不符合预期

文件名来自 B站视频标题，会替换非法文件名字符并截断长度。Markdown 内仍保留原始标题。

## 查看调试输出

开启原始字幕 JSON：

```json
"writeRawJson": true
```

或运行单视频：

```bash
bili-sub video BV1xxxxxxxxxx --force
```

正常后关闭 `writeRawJson`，避免堆积文件。

## 仍无法解决

提交 issue 时请附上：

- `bili-sub doctor` 中不包含 Cookie 的输出
- 操作系统和 Node 版本
- Tabbit CLI 路径
- 失败命令
- 状态库中对应视频的错误信息

不要粘贴 Cookie、SESSDATA、bili_jct、auth_key 或完整临时字幕 URL。
