# 架构说明

## 总览

```text
定时任务 / Agent / 用户
        │
        ▼
bili-sub CLI（Node.js，零运行时依赖）
        │
        ├─ 读取配置
        ├─ 读取本地状态库
        ├─ 调用 Tabbit CLI
        │       ├─ 浏览器上下文：B站登录态和接口访问
        │       ├─ 视频页：读取视频详情和字幕轨
        │       └─ Node 网络层：下载字幕 CDN JSON
        ├─ 去重、限流、失败重试、无字幕复查
        └─ 写出 Markdown 文档
```

## 关键模块

| 文件 | 职责 |
| --- | --- |
| `scripts/bili-sub.mjs` | CLI 主入口、参数解析、配置、状态库、文档生成、任务编排。 |
| `scripts/tabbit-program.js` | 注入 Tabbit 执行的 Playwright 程序。 |
| `bin/bili-sub` | POSIX 命令包装。 |
| `bin/bili-sub.cmd` | Windows 命令包装。 |
| `skill/SKILL.md` | Agent 调用说明。 |
| `install.ps1` / `install.sh` | CLI 与 Skill 安装脚本。 |

## 视频发现

### 手动视频

直接接受 BVID：

```bash
bili-sub video BV1dz4164ELm
```

### 关注动态

调用 B站动态 Feed 接口，递归遍历 JSON：

- 普通视频投稿
- 动态卡片
- 转发中的视频
- 附加内容中的视频

### 收藏夹

按收藏夹 `media_id` 分页读取视频资源。

所有候选都会统一转换为：

```text
https://www.bilibili.com/video/<BVID>
```

避免收藏夹返回的 `bilibili://video/...` 协议导致 Playwright 无法导航。

## 字幕获取

1. 进入视频页。
2. 获取视频详情、`aid`、`cid` 和分 P 信息。
3. 调用播放器接口读取字幕轨。
4. 优先选择中文/AI 中文字幕。
5. 从字幕轨中取带 `auth_key` 的临时 URL。
6. 使用 Playwright Node 层 `context.request` 下载字幕 JSON。

字幕 CDN 与视频页跨域，页面上下文 `window.fetch` 可能被浏览器扩展或 CSP/CORS 拦截。Node 层请求已验证可行。

## 字幕语言优先级

1. `zh-CN` / `zh-Hans`
2. `zh`
3. 其他中文标识
4. `lan_doc` 为“中文”的 AI 字幕
5. 英文字幕
6. 其他语言

## 状态机

```text
新视频
  ├─ 有字幕并下载成功 ── done
  ├─ 无字幕 ────────── no_subtitle ── 延迟复查 ── no_subtitle_final
  └─ 请求/导航失败 ──── failed ──────── 下次重试
```

多 P 视频按分 P 记录；部分成功时整体为 `partial_failed`。

## 输出格式

只输出 Markdown：

- YAML frontmatter
- 视频标题、UP 主、URL、发布日期、字幕语言
- 视频简介
- 按时间戳排列的字幕正文

保存位置由配置项 `outputDir` 或命令行参数 `--output` 决定。

## 安全边界

- 不保存 Cookie。
- 不读取浏览器 User Data 中的敏感数据库。
- 不进行账号写操作。
- 状态库和日志只记录视频元数据、状态和本地输出路径。

## 可移植性设计

- 零第三方 npm 依赖。
- Tabbit CLI 自动探测，也支持环境变量覆盖。
- 配置支持项目本地和用户目录两套位置。
- CLI 提供 POSIX 和 Windows 包装。
- Skill 是标准 `SKILL.md` 目录，可复制到不同 Agent。
