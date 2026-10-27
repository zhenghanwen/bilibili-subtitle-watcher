const input = __INPUT__;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureBili() {
  const current = page.url();
  if (!current.includes('www.bilibili.com') && !current.includes('passport.bilibili.com')) {
    await page.goto('https://www.bilibili.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
}

async function browserMain(input) {
  await ensureBili();
  return await page.evaluate(async (input) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function bfetch(url) {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json, text/plain, */*' },
        referrer: 'https://www.bilibili.com/'
      });
      const text = await response.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = { code: response.status, message: text.slice(0, 300) };
      }
      return { httpStatus: response.status, json };
    }

    function requireOk(payload, label) {
      if (!payload || payload.code !== 0) {
        const error = new Error(payload?.message || `${label} 请求失败`);
        error.code = payload?.code;
        throw error;
      }
      return payload.data;
    }

    async function api(url, label) {
      const { httpStatus, json } = await bfetch(url);
      if (httpStatus === 401 || json.code === -101) {
        const error = new Error('Bilibili login required');
        error.code = 'AUTH_REQUIRED';
        throw error;
      }
      if (httpStatus === 403 || json.code === -403) {
        const error = new Error('Bilibili request blocked (403)');
        error.code = 'RATE_LIMITED';
        throw error;
      }
      return requireOk(json, label);
    }

    function normalizeUrl(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      return text.startsWith('//') ? `https:${text}` : text;
    }

    function extractBvid(value) {
      const text = String(value || '');
      const direct = text.match(/(BV[0-9A-Za-z]{10})/i);
      return direct ? direct[1] : '';
    }

    function pushCandidate(list, seen, candidate) {
      const bvid = candidate.bvid || extractBvid(candidate.url || candidate.jump_url || candidate.title || '');
      if (!bvid || seen.has(bvid)) return;
      seen.add(bvid);
      list.push({
        bvid,
        source: candidate.source || '',
        author: candidate.author || '',
        title: candidate.title || '',
        url: `https://www.bilibili.com/video/${bvid}`
      });
    }

    function collectFromObject(root, source, list, seen) {
      const walk = (value) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
          value.forEach(walk);
          return;
        }

        const bvid = value.bvid || value.bv_id || extractBvid(value.jump_url || value.url || value.link || '');
        if (bvid) {
          let author = value.author || value.upname || value.upper?.name || value.owner?.name || value.author_name || '';
          if (!author && value.modules?.module_author) author = value.modules.module_author.name || '';
          let title = value.title || value.archive?.title || value.major?.archive?.title || value.additional?.ugc?.title || '';
          if (!title && value.modules?.module_dynamic?.major?.archive) {
            title = value.modules.module_dynamic.major.archive.title;
          }
          pushCandidate(list, seen, {
            bvid,
            title: title || '',
            author,
            url: value.jump_url || value.url || value.link || '',
            source
          });
        }

        for (const child of Object.values(value)) {
          if (child && typeof child === 'object') {
            walk(child);
          } else if (typeof child === 'string') {
            const matched = child.match(/\/video\/(BV[0-9A-Za-z]{10})/i);
            if (matched) {
              pushCandidate(list, seen, {
                bvid: matched[1],
                title: '',
                author: '',
                url: `https://www.bilibili.com/video/${matched[1]}`,
                source
              });
            }
          }
        }
      };
      walk(root);
    }

    async function getFeedCandidates(pages) {
      const list = [];
      const seen = new Set();
      let offset = '';
      for (let pageNo = 1; pageNo <= pages; pageNo += 1) {
        const params = new URLSearchParams({
          type: 'all',
          platform: 'web',
          timezone_offset: '-480',
          features: 'itemOpusStyle,listOnlyfans,opusBigCover,onlyfansVote'
        });
        if (offset) params.set('offset', offset);
        const data = await api('https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all?' + params.toString(), '关注动态');
        collectFromObject(Array.isArray(data.items) ? data.items : [], 'following-feed', list, seen);
        offset = data.offset || '';
        if (!data.has_more || !offset) break;
        await sleep(input.delayMs || 2000);
      }
      return list;
    }

    async function getFavoriteFolders() {
      const nav = await api('https://api.bilibili.com/x/web-interface/nav', '当前用户');
      const url = `https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=${encodeURIComponent(nav.mid)}&type=1`;
      const data = await api(url, '收藏夹列表');
      return (data.list || []).map((item) => ({ id: item.id, title: item.title, media_count: item.media_count }));
    }

    async function getFavoriteCandidates(folderIds) {
      const list = [];
      const seen = new Set();
      for (const folderId of folderIds) {
        for (let pageNo = 1; pageNo <= 5; pageNo += 1) {
          const params = new URLSearchParams({
            media_id: String(folderId),
            pn: String(pageNo),
            ps: String(input.favoritesPageSize || 20),
            keyword: '',
            order: 'mtime',
            type: '0',
            tid: '0',
            platform: 'web'
          });
          const data = await api('https://api.bilibili.com/x/v3/fav/resource/list?' + params.toString(), '收藏夹');
          collectFromObject(Array.isArray(data.medias) ? data.medias : [], `favorite-${folderId}`, list, seen);
          if (!data.has_more || !data.medias?.length) break;
          await sleep(input.delayMs || 2000);
        }
      }
      return list;
    }

    async function getVideoMeta(bvid) {
      const data = await api('https://api.bilibili.com/x/web-interface/view?bvid=' + encodeURIComponent(bvid), '视频详情');
      return {
        aid: String(data.aid || ''),
        bvid: String(data.bvid || bvid),
        cid: String(data.cid || ''),
        title: String(data.title || bvid),
        description: String(data.desc || ''),
        author: String(data.owner?.name || ''),
        uid: String(data.owner?.mid || ''),
        pubdate: Number(data.pubdate || 0),
        duration: Number(data.duration || 0),
        pages: (data.pages || []).map((item) => ({
          cid: String(item.cid),
          page: Number(item.page || 1),
          part: String(item.part || ''),
          duration: Number(item.duration || 0)
        }))
      };
    }

    function subtitlePriority(item) {
      const lan = String(item.lan || '').toLowerCase();
      const label = String(item.lan_doc || '').toLowerCase();
      if (lan === 'zh-cn' || lan === 'zh-hans') return 0;
      if (lan === 'zh') return 1;
      if (lan.includes('zh')) return 2;
      if (label.includes('中文')) return 3;
      if (lan === 'en' || lan === 'en-us' || lan === 'en-gb') return 10;
      if (lan.includes('en') || label.includes('英文') || label.includes('英语')) return 11;
      return 50;
    }

    async function getSubtitleTracks(meta, pageInfo) {
      const urls = [
        `https://api.bilibili.com/x/player/wbi/v2?aid=${encodeURIComponent(meta.aid)}&cid=${encodeURIComponent(pageInfo.cid)}&bvid=${encodeURIComponent(meta.bvid)}`,
        `https://api.bilibili.com/x/player/v2?aid=${encodeURIComponent(meta.aid)}&cid=${encodeURIComponent(pageInfo.cid)}&bvid=${encodeURIComponent(meta.bvid)}`
      ];
      let lastError = null;
      for (const url of urls) {
        try {
          const data = await api(url, '字幕轨');
          const tracks = (data.subtitle?.subtitles || []).filter((item) => normalizeUrl(item.subtitle_url || item.url));
          return tracks.map((item) => ({
            id: String(item.id ?? item.id_str ?? ''),
            lan: item.lan || '',
            lanDoc: item.lan_doc || item.lan || '',
            url: normalizeUrl(item.subtitle_url || item.url)
          })).sort((a, b) => subtitlePriority(a) - subtitlePriority(b));
        } catch (error) {
          lastError = error;
        }
      }
      if (lastError) throw lastError;
      return [];
    }

    async function processVideo(candidate, includeAllPages) {
      const meta = await getVideoMeta(candidate.bvid);
      const requestedPages = includeAllPages ? meta.pages : meta.pages.filter((item) => item.page === 1).slice(0, 1);
      const pageResults = [];
      for (const pageInfo of requestedPages) {
        try {
          const tracks = await getSubtitleTracks(meta, pageInfo);
          if (!tracks.length) {
            pageResults.push({ page: pageInfo, status: 'no_subtitle', tracks: [] });
          } else {
            const track = tracks[0];
            const subtitleData = await api(track.url, '字幕内容');
            pageResults.push({
              page: pageInfo,
              status: 'done',
              track,
              tracks,
              body: Array.isArray(subtitleData.body) ? subtitleData.body : []
            });
          }
        } catch (error) {
          pageResults.push({ page: pageInfo, status: 'failed', error: { code: error.code || '', message: error.message } });
        }
        await sleep(input.delayMs || 2000);
      }
      return { candidate, meta, pageResults };
    }

    async function getNav() {
      return await api('https://api.bilibili.com/x/web-interface/nav', '当前用户');
    }

    if (input.mode === 'nav') {
      try {
        return { ok: true, nav: await getNav() };
      } catch (error) {
        return { ok: false, error: { code: error.code || '', message: error.message } };
      }
    }
    if (input.mode === 'folders') {
      return { ok: true, folders: await getFavoriteFolders() };
    }
    if (input.mode === 'process-video') {
      return await processVideo(input.candidate, input.includeAllPages !== false);
    }

    const candidates = [];
    const seen = new Set();
    for (const bvid of input.explicitVideos || []) {
      pushCandidate(candidates, seen, { bvid, source: 'manual' });
    }
    if (input.useFeed) {
      const feed = await getFeedCandidates(input.feedPages || 1);
      feed.forEach((item) => pushCandidate(candidates, seen, item));
    }
    if (input.favoriteFolders?.length) {
      const favorites = await getFavoriteCandidates(input.favoriteFolders);
      favorites.forEach((item) => pushCandidate(candidates, seen, item));
    }
    return {
      ok: true,
      candidates: candidates.filter((item) => !input.skipBvids?.includes(item.bvid))
    };
  }, input);
}

async function runCollection(input) {
  await ensureBili();
  const discovery = await browserMain(input);
  if (!discovery?.ok) return discovery;
  const selected = (discovery.candidates || []).slice(0, input.candidateLimit || 10);
  const results = [];
  for (const candidate of selected) {
    try {
      await page.goto(candidate.url || `https://www.bilibili.com/video/${candidate.bvid}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await sleep(2500);
      const item = await page.evaluate(async (payload) => {
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        async function bfetch(url) {
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: { Accept: 'application/json, text/plain, */*' },
            referrer: 'https://www.bilibili.com/'
          });
          const text = await response.text();
          let json = null;
          try { json = JSON.parse(text); } catch { json = { code: response.status, message: text.slice(0, 300) }; }
          return { httpStatus: response.status, json };
        }
        function requireOk(payload, label) {
          if (!payload || payload.code !== 0) {
            const error = new Error(payload?.message || `${label} 请求失败`);
            error.code = payload?.code;
            throw error;
          }
          return payload.data;
        }
        async function api(url, label) {
          const { httpStatus, json } = await bfetch(url);
          if (httpStatus === 401 || json.code === -101) {
            const error = new Error('Bilibili login required');
            error.code = 'AUTH_REQUIRED';
            throw error;
          }
          if (httpStatus === 403 || json.code === -403) {
            const error = new Error('Bilibili request blocked (403)');
            error.code = 'RATE_LIMITED';
            throw error;
          }
          return requireOk(json, label);
        }
        function normalizeUrl(value) {
          const text = String(value || '').trim();
          return text.startsWith('//') ? `https:${text}` : text;
        }
        function subtitlePriority(item) {
          const lan = String(item.lan || '').toLowerCase();
          const label = String(item.lan_doc || '').toLowerCase();
          if (lan === 'zh-cn' || lan === 'zh-hans') return 0;
          if (lan === 'zh') return 1;
          if (lan.includes('zh')) return 2;
          if (label.includes('中文')) return 3;
          if (lan === 'en' || lan === 'en-us' || lan === 'en-gb') return 10;
          if (lan.includes('en') || label.includes('英文') || label.includes('英语')) return 11;
          return 50;
        }
        async function getVideoMeta(bvid) {
          const data = await api('https://api.bilibili.com/x/web-interface/view?bvid=' + encodeURIComponent(bvid), '视频详情');
          return {
            aid: String(data.aid || ''),
            bvid: String(data.bvid || bvid),
            cid: String(data.cid || ''),
            title: String(data.title || bvid),
            description: String(data.desc || ''),
            author: String(data.owner?.name || ''),
            uid: String(data.owner?.mid || ''),
            pubdate: Number(data.pubdate || 0),
            duration: Number(data.duration || 0),
            pages: (data.pages || []).map((item) => ({
              cid: String(item.cid),
              page: Number(item.page || 1),
              part: String(item.part || ''),
              duration: Number(item.duration || 0)
            }))
          };
        }
        async function getSubtitleTracks(meta, pageInfo) {
          const urls = [
            `https://api.bilibili.com/x/player/wbi/v2?aid=${encodeURIComponent(meta.aid)}&cid=${encodeURIComponent(pageInfo.cid)}&bvid=${encodeURIComponent(meta.bvid)}`,
            `https://api.bilibili.com/x/player/v2?aid=${encodeURIComponent(meta.aid)}&cid=${encodeURIComponent(pageInfo.cid)}&bvid=${encodeURIComponent(meta.bvid)}`
          ];
          let lastError = null;
          for (const url of urls) {
            try {
              const data = await api(url, '字幕轨');
              const tracks = (data.subtitle?.subtitles || []).filter((item) => normalizeUrl(item.subtitle_url || item.url));
              return tracks.map((item) => ({
                id: String(item.id ?? item.id_str ?? ''),
                lan: item.lan || '',
                lanDoc: item.lan_doc || item.lan || '',
                url: normalizeUrl(item.subtitle_url || item.url)
              })).sort((a, b) => subtitlePriority(a) - subtitlePriority(b));
            } catch (error) {
              lastError = error;
            }
          }
          if (lastError) throw lastError;
          return [];
        }
        const meta = await getVideoMeta(payload.candidate.bvid);
        const requestedPages = payload.includeAllPages ? meta.pages : meta.pages.filter((item) => item.page === 1).slice(0, 1);
        const pageResults = [];
        for (const pageInfo of requestedPages) {
          try {
            const tracks = await getSubtitleTracks(meta, pageInfo);
            if (!tracks.length) {
              pageResults.push({ page: pageInfo, status: 'no_subtitle', tracks: [] });
            } else {
              pageResults.push({
                page: pageInfo,
                status: 'track_ready',
                track: tracks[0],
                tracks,
                body: []
              });
            }
          } catch (error) {
            pageResults.push({ page: pageInfo, status: 'failed', error: { code: error.code || '', message: error.message } });
          }
          await sleep(payload.delayMs || 2000);
        }
        return { candidate: payload.candidate, meta, pageResults };
      }, { ...input, candidate });
      for (const pageResult of item.pageResults || []) {
        if (pageResult.status === 'track_ready' && pageResult.track?.url) {
          const response = await context.request.get(pageResult.track.url, {
            headers: { Referer: 'https://www.bilibili.com/' },
            timeout: 30000
          });
          if (!response.ok()) {
            throw new Error(`字幕内容下载失败 HTTP ${response.status()}`);
          }
          const subtitleData = await response.json();
          pageResult.body = Array.isArray(subtitleData.body) ? subtitleData.body : [];
          pageResult.status = 'done';
        }
      }
      results.push(item);
    } catch (error) {
      results.push({ candidate, status: 'failed', error: { code: error.code || '', message: error.message } });
    }
  }
  return { ok: true, candidateCount: discovery.candidates?.length || 0, processed: selected, results };
}

if (input.mode === 'collect') {
  return runCollection(input);
}
return browserMain(input);
