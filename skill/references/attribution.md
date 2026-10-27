# 来源与许可证

本 Skill 的字幕链路参考并复用了 GitHub 项目 `haixiong1997/Bilibili-Obsidian-Clipper` 的核心思路：通过 BVID 获取视频详情和分 P，通过播放器接口读取字幕轨，选择字幕轨后下载字幕 JSON，并转换为 Markdown 文档。

源仓库：<https://github.com/haixiong1997/Bilibili-Obsidian-Clipper>

源仓库许可证：MIT License

MIT License

Copyright (c) 2026 haixiong1997

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 本实现的差异

- 不直接依赖 Chrome 扩展后台页面运行。
- 改为本地零依赖 Node CLI，并通过 Tabbit CLI 驱动浏览器。
- 增加关注动态、收藏夹、状态库、去重、限流、无字幕复查、多 P 和文档生成。
- 不复制或保存用户 Cookie；登录态由 Tabbit 浏览器持有。
