# Tabbit 桥接与接口边界

## 架构

```text
bili-sub.mjs
  ├─ 读取 config.json / data/state.json
  ├─ 调用 Tabbit CLI nodejs
  │    ├─ 页面上下文：B站登录态、视频详情、播放器字幕轨
  │    └─ Node 网络层：下载字幕 CDN JSON
  ├─ 去重、限流、状态更新、重试
  └─ 生成 Markdown 文档
```

## Tabbit 职责

- 打开并保持 B站登录态。
- 在浏览器上下文中访问：
  - `https://api.bilibili.com/x/web-interface/nav`
  - `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all`
  - `https://api.bilibili.com/x/v3/fav/folder/created/list-all`
  - `https://api.bilibili.com/x/v3/fav/resource/list`
  - `https://api.bilibili.com/x/web-interface/view`
  - `https://api.bilibili.com/x/player/wbi/v2`
  - 兼容回退：`https://api.bilibili.com/x/player/v2`
- 对每个候选视频先导航到 `https://www.bilibili.com/video/<BVID>`，再读取字幕轨。

## 字幕选择

播放器接口返回的字幕轨按以下优先级选择：

1. `zh-CN` / `zh-Hans`
2. `zh`
3. 其他包含中文标识的语言
4. `ai-zh` 或 `lan_doc` 为“中文”的 AI 字幕
5. 英文字幕
6. 其他语言

没有可用字幕轨时记录 `no_subtitle`。

## 字幕正文下载

`wbi/v2` 返回的 `subtitle_url` 通常带临时 `auth_key`，指向 `aisubtitle.hdslb.com`。在视频页上下文直接 `fetch` 可能被浏览器扩展、CORS 或安全策略拦截并报 `Failed to fetch`。

已验证可行方式：

```js
const response = await context.request.get(track.url, {
  headers: { Referer: 'https://www.bilibili.com/' },
  timeout: 30000
});
const subtitleData = await response.json();
```

`subtitleData.body` 是字幕行数组，常见字段：`from`、`to`、`content`。

## 视频发现

- 关注动态：递归遍历动态 JSON，提取普通投稿、动态卡片、转发/附加内容中的 BVID。
- 收藏夹：按收藏夹 `media_id` 分页读取 `medias`。
- 手动视频：直接接受 BVID。
- 所有候选统一规范化为 HTTPS 视频 URL，避免 `bilibili://` 协议导致 Playwright 导航失败。

## 安全边界

- 不配置 SESSDATA、bili_jct、Cookie 或浏览器 User Data 路径。
- 不在日志、Markdown、状态库中输出 Cookie 或认证头。
- 登录、扫码、验证码由用户在 Tabbit 浏览器中完成。
- 只做读取和本地文档写入，不自动点赞、投币、评论、关注或修改 B站账号数据。

## 已知限制

- 未公开登录态下无法访问关注动态和收藏夹。
- B站接口字段或风控策略可能变化；字幕轨接口失败时应优先读取页面当前返回和 Tabbit 官方 Bilibili playbook。
- AI 字幕可能后补，所以 `no_subtitle` 不是永久结论，需要定时复查。
- 定时任务依赖本机 Tabbit 可启动；不适合无浏览器环境的无头服务器。
