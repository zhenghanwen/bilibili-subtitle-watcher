#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const USER_CONFIG_DIR = path.join(os.homedir(), '.bili-sub');
const DEFAULT_CONFIG_PATH = path.join(USER_CONFIG_DIR, 'config.json');
const LOCAL_CONFIG_PATH = path.join(process.cwd(), 'bili-sub.config.json');

function findConfigPath(args) {
  if (args.config) return path.resolve(args.config);
  if (process.env.BILI_SUB_CONFIG) return path.resolve(process.env.BILI_SUB_CONFIG);
  if (fs.existsSync(LOCAL_CONFIG_PATH)) return LOCAL_CONFIG_PATH;
  return DEFAULT_CONFIG_PATH;
}

function detectTabbitCli() {
  if (process.env.TABBIT_CLI) return process.env.TABBIT_CLI;
  const home = os.homedir();
  const candidates = process.platform === 'win32'
    ? [
        path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Tabbit', 'LocalAgent', 'bin', 'tabbit-cli.exe'),
        path.join(home, 'AppData', 'Local', 'Tabbit', 'LocalAgent', 'bin', 'tabbit-cli.exe')
      ]
    : [
        path.join(home, '.local', 'bin', 'tabbit-cli'),
        '/usr/local/bin/tabbit-cli',
        '/opt/tabbit/tabbit-cli'
      ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

const DEFAULT_CONFIG = {
  outputDir: path.join(os.homedir(), 'Bilibili-Subtitles'),
  dataDir: path.join(USER_CONFIG_DIR, 'data'),
  tabbitCli: detectTabbitCli(),
  maxPerRun: 10,
  feedPages: 2,
  favoritesPageSize: 20,
  includeAllPages: true,
  delayMs: 2200,
  timeoutMs: 180000,
  writeSrt: true,
  writeTxt: true,
  writeRawJson: false,
  sources: {
    followingFeed: true,
    favoriteFolders: []
  },
  noSubtitleRetryHours: [24, 72, 168]
};

function resolveProjectPath(value, baseDir) {
  if (!value) return value;
  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}

function log(message) {
  console.log(`[bili-sub] ${message}`);
}

function fail(message) {
  console.error(`[bili-sub] ERROR: ${message}`);
  process.exit(1);
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function deepMerge(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return structuredClone(base);
  const output = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && output[key] && typeof output[key] === 'object' && !Array.isArray(output[key])) {
      output[key] = deepMerge(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function parseArgs(argv) {
  const args = { _: [], folders: [], bvids: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--config') args.config = argv[++i];
    else if (arg === '--output') args.output = argv[++i];
    else if (arg === '--limit') args.limit = Number(argv[++i]);
    else if (arg === '--feed-pages') args.feedPages = Number(argv[++i]);
    else if (arg === '--folder') args.folders.push(argv[++i]);
    else if (arg === '--bvid' || arg === '--bv') args.bvids.push(argv[++i]);
    else if (arg === '--all-pages') args.allPages = true;
    else if (arg === '--no-all-pages') args.allPages = false;
    else if (arg === '--force') args.force = true;
    else if (arg === '--retry-no-subtitle') args.retryNoSubtitle = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (!arg.startsWith('-')) args._.push(arg);
    else fail(`未知参数：${arg}`);
  }
  return args;
}

function loadConfig(args) {
  const configPath = findConfigPath(args);
  const configDir = path.dirname(configPath);
  const fileConfig = readJson(configPath, {});
  const config = deepMerge(DEFAULT_CONFIG, fileConfig);
  if (!config.tabbitCli || process.env.TABBIT_CLI) config.tabbitCli = detectTabbitCli();
  config._configPath = configPath;
  config.dataDir = resolveProjectPath(config.dataDir, configDir);
  config.outputDir = resolveProjectPath(config.outputDir, configDir);
  config.statePath = path.join(config.dataDir, 'state.json');
  config.logPath = path.join(config.dataDir, 'last-run.json');
  if (process.env.BILI_SUB_OUTPUT_DIR) config.outputDir = path.resolve(process.env.BILI_SUB_OUTPUT_DIR);
  if (args.output) config.outputDir = path.resolve(args.output);
  if (args.folders?.length) config.sources.favoriteFolders = args.folders;
  if (typeof args.limit === 'number' && Number.isFinite(args.limit)) config.maxPerRun = args.limit;
  if (typeof args.feedPages === 'number' && Number.isFinite(args.feedPages)) config.feedPages = args.feedPages;
  if (typeof args.allPages === 'boolean') config.includeAllPages = args.allPages;
  if (!fs.existsSync(configPath)) {
    writeJson(configPath, { ...config, _configPath: undefined, dataDir: undefined, statePath: undefined, logPath: undefined });
  }
  return config;
}

function runProcess(file, args, input) {
  const result = spawnSync(file, args, {
    input,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024
  });
  return result;
}

function parseTabbitJson(stdout) {
  const lines = String(stdout || '').split(/\r?\n/).filter((line) => line.trim().startsWith('{'));
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try { return JSON.parse(lines[i]); } catch { /* try previous line */ }
  }
  return null;
}

function tabbitRun(program, config, options = {}) {
  const cli = path.resolve(config.tabbitCli);
  if (!fs.existsSync(cli)) fail(`找不到 Tabbit CLI：${cli}。请在 config.json 设置 tabbitCli。`);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const task = options.task || `bili-sub-${suffix}`;
  const requestId = options.requestId || `req-${suffix}`;
  const timeoutMs = options.timeoutMs || config.timeoutMs || 180000;

  const create = runProcess(cli, ['create', '--task', task]);
  if (create.error) fail(`启动 Tabbit 失败：${create.error.message}`);

  let result = runProcess(cli, ['nodejs', '--task', task, '--request-id', requestId, '--timeout-ms', String(timeoutMs)], program);
  if (result.error) fail(`调用 Tabbit nodejs 失败：${result.error.message}`);
  let payload = parseTabbitJson(result.stdout);

  if (payload?.status === 'queued' || payload?.status === 'running' || result.status === 75) {
    const receipt = runProcess(cli, ['receipt', '--task', task, '--request-id', requestId, '--wait-ms', '60000']);
    payload = parseTabbitJson(receipt.stdout) || payload;
  }

  runProcess(cli, ['finish', '--task', task]);

  if (!payload) {
    console.error(result.stdout);
    console.error(result.stderr);
    fail('Tabbit 没有返回可解析的 JSON。');
  }
  if (payload.status === 'failed' || payload.status === 'interrupted') {
    console.error(JSON.stringify(payload, null, 2));
    fail(`Tabbit 程序执行失败：${payload.result?.error || payload.error || payload.status}`);
  }
  const value = payload.result?.value ?? payload.result?.result?.value ?? payload.value;
  if (!value) {
    console.error(JSON.stringify(payload, null, 2));
    fail('Tabbit 返回中缺少 result.value。');
  }
  return value;
}

const BROWSER_PROGRAM_PATH = path.join(__dirname, 'tabbit-program.js');

function makeProgram(input, config) {
  const payload = {
    ...input,
    delayMs: config.delayMs,
    favoritesPageSize: config.favoritesPageSize,
    candidateLimit: config.maxPerRun,
    includeAllPages: config.includeAllPages
  };
  const template = fs.readFileSync(BROWSER_PROGRAM_PATH, 'utf8');
  return template.replace('__INPUT__', JSON.stringify(payload, null, 2));
}

function tabbitCommand(mode, config, extra = {}) {
  return tabbitRun(makeProgram({ mode, ...extra }, config), config);
}

function loadState(config) {
  return readJson(config.statePath, { version: 1, updatedAt: null, videos: {} });
}

function saveState(config, state) {
  state.updatedAt = new Date().toISOString();
  writeJson(config.statePath, state);
}

function shouldSkipBvid(config, state, bvid, force, retryNoSubtitle) {
  if (force) return false;
  const item = state.videos[bvid];
  if (!item) return false;
  if (item.status === 'done') return true;
  if (item.status === 'no_subtitle_final') return true;
  if (item.status === 'no_subtitle' && !retryNoSubtitle) {
    const intervals = config.noSubtitleRetryHours || [24, 72, 168];
    const attempt = item.noSubtitleRetries || 0;
    if (attempt >= intervals.length) return true;
    const waitHours = intervals[attempt] || intervals[intervals.length - 1];
    const firstAt = new Date(item.firstNoSubtitleAt || item.updatedAt || 0).getTime();
    return Date.now() - firstAt < waitHours * 3600 * 1000;
  }
  return false;
}

function formatDate(ts) {
  const date = new Date(ts || Date.now());
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function safeName(value, fallback = 'bilibili-subtitle') {
  return String(value || fallback).replace(/[\\/:*?"<>|-]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120) || fallback;
}

function quoteYaml(value) {
  return JSON.stringify(String(value ?? ''));
}

function formatStamp(seconds, srt = false) {
  const safe = Math.max(0, Number(seconds) || 0);
  const msTotal = Math.floor(safe * 1000);
  const h = Math.floor(msTotal / 3600000);
  const m = Math.floor((msTotal % 3600000) / 60000);
  const s = Math.floor((msTotal % 60000) / 1000);
  const ms = msTotal % 1000;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  const mmm = String(ms).padStart(3, '0');
  return srt ? `${hh}:${mm}:${ss},${mmm}` : `${hh}:${mm}:${ss}`;
}

function buildNote(result) {
  const meta = result.meta;
  const donePages = result.pageResults.filter((item) => item.status === 'done');
  const first = donePages[0];
  const lines = [];
  lines.push('---');
  lines.push(`title: ${quoteYaml(meta.title)}`);
  lines.push(`bvid: ${quoteYaml(meta.bvid)}`);
  lines.push(`aid: ${quoteYaml(meta.aid)}`);
  lines.push(`url: ${quoteYaml(`https://www.bilibili.com/video/${meta.bvid}`)}`);
  lines.push(`author: ${quoteYaml(meta.author)}`);
  lines.push(`uid: ${quoteYaml(meta.uid)}`);
  lines.push(`upload_date: ${quoteYaml(formatDate(meta.pubdate * 1000))}`);
  lines.push(`subtitle_lang: ${quoteYaml(first?.track?.lanDoc || '')}`);
  lines.push(`created: ${quoteYaml(formatDate(Date.now()))}`);
  lines.push('tags:');
  lines.push('  - bilibili');
  lines.push('  - subtitle');
  lines.push('---');
  lines.push('');
  lines.push(`# ${meta.title}`);
  lines.push('');
  lines.push(`- UP主：${meta.author}`);
  lines.push(`- 视频地址：https://www.bilibili.com/video/${meta.bvid}`);
  lines.push(`- 发布日期：${formatDate(meta.pubdate * 1000)}`);
  lines.push(`- 字幕语言：${first?.track?.lanDoc || '未知'}`);
  lines.push('');
  if (meta.description) {
    lines.push('## 视频简介');
    lines.push('');
    lines.push(meta.description);
    lines.push('');
  }
  lines.push('## 字幕');
  lines.push('');
  for (const pageResult of donePages) {
    const page = pageResult.page;
    const heading = donePages.length > 1 ? `P${page.page} ${page.part}`.trim() : '正文';
    lines.push(`### ${heading}`);
    lines.push('');
    for (const item of pageResult.body) {
      const text = String(item.content || '').trim();
      if (!text) continue;
      lines.push(`#### ${formatStamp(item.from)}`);
      lines.push(text);
      lines.push('');
    }
  }
  return lines.join('\n');
}

function buildText(result) {
  return result.pageResults
    .filter((item) => item.status === 'done')
    .map((item) => {
      const header = item.page.page > 1 || result.meta.pages.length > 1 ? `P${item.page.page} ${item.page.part}`.trim() + '\n\n' : '';
      return header + item.body.map((line) => String(line.content || '').trim()).filter(Boolean).join('\n');
    })
    .join('\n\n');
}

function buildSrt(result) {
  let index = 1;
  const blocks = [];
  for (const item of result.pageResults.filter((page) => page.status === 'done')) {
    if (result.meta.pages.length > 1) blocks.push(`\nP${item.page.page} ${item.page.part}`.trim() + '\n');
    for (const line of item.body) {
      const text = String(line.content || '').trim();
      if (!text) continue;
      blocks.push(`${index}\n${formatStamp(line.from, true)} --> ${formatStamp(line.to, true)}\n${text}\n`);
      index += 1;
    }
  }
  return blocks.join('\n');
}

function uniquePath(filePath) {
  if (!fs.existsSync(filePath)) return filePath;
  const ext = path.extname(filePath);
  const base = filePath.slice(0, filePath.length - ext.length);
  let i = 2;
  while (fs.existsSync(`${base}-${i}${ext}`)) i += 1;
  return `${base}-${i}${ext}`;
}

function persistResult(config, result, source) {
  const meta = result.meta;
  const donePages = result.pageResults.filter((item) => item.status === 'done');
  const noSubtitlePages = result.pageResults.filter((item) => item.status === 'no_subtitle');
  const failedPages = result.pageResults.filter((item) => item.status === 'failed');
  const base = `${formatDate(meta.pubdate * 1000)}-${safeName(meta.title)}`;
  const output = {
    bvid: meta.bvid,
    aid: meta.aid,
    title: meta.title,
    author: meta.author,
    uid: meta.uid,
    pubdate: meta.pubdate,
    source,
    outputDir: config.outputDir,
    pages: Object.fromEntries(result.pageResults.map((item) => [item.page.cid, {
      status: item.status,
      page: item.page.page,
      part: item.page.part,
      subtitleLang: item.track?.lanDoc || '',
      error: item.error || null
    }]))
  };

  if (donePages.length) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    const mdPath = uniquePath(path.join(config.outputDir, `${base}.md`));
    fs.writeFileSync(mdPath, buildNote(result), 'utf8');
    output.notePath = mdPath;
    if (config.writeTxt) {
      const txtPath = uniquePath(path.join(config.outputDir, `${base}.txt`));
      fs.writeFileSync(txtPath, buildText(result), 'utf8');
      output.txtPath = txtPath;
    }
    if (config.writeSrt) {
      const srtPath = uniquePath(path.join(config.outputDir, `${base}.srt`));
      fs.writeFileSync(srtPath, buildSrt(result), 'utf8');
      output.srtPath = srtPath;
    }
    if (config.writeRawJson) {
      const jsonPath = uniquePath(path.join(config.outputDir, `${base}.subtitle.json`));
      writeJson(jsonPath, result);
      output.rawPath = jsonPath;
    }
    output.status = failedPages.length ? 'partial_failed' : 'done';
  } else if (failedPages.length && !noSubtitlePages.length) {
    output.status = 'failed';
  } else if (failedPages.length) {
    output.status = 'partial_failed';
  } else {
    output.status = 'no_subtitle';
  }
  return output;
}

function upsertState(state, persisted) {
  const now = new Date().toISOString();
  const previous = state.videos[persisted.bvid] || {};
  state.videos[persisted.bvid] = {
    ...previous,
    ...persisted,
    firstNoSubtitleAt: persisted.status === 'no_subtitle' ? (previous.firstNoSubtitleAt || now) : null,
    noSubtitleRetries: persisted.status === 'no_subtitle' ? (previous.noSubtitleRetries || 0) + (previous.status === 'no_subtitle' ? 0 : 1) : (previous.noSubtitleRetries || 0),
    updatedAt: now
  };
  if (state.videos[persisted.bvid].noSubtitleRetries >= 3 && persisted.status === 'no_subtitle') {
    state.videos[persisted.bvid].status = 'no_subtitle_final';
  }
}

function collect(config, args, options) {
  const state = loadState(config);
  const explicit = new Set(options.bvids || []);
  const useFeed = Boolean(options.useFeed);
  const folders = options.folders || [];
  const skipBvids = [];
  // Only compute skip list for discovery sources. Explicit BVID is always forced unless global --force is not set; respect existing done unless --force.
  for (const [bvid, item] of Object.entries(state.videos)) {
    if (explicit.has(bvid)) {
      if (!args.force && item.status === 'done') skipBvids.push(bvid);
    } else if (shouldSkipBvid(config, state, bvid, args.force, args.retryNoSubtitle)) {
      skipBvids.push(bvid);
    }
  }
  const result = tabbitCommand('collect', config, {
    explicitVideos: [...explicit],
    useFeed,
    favoriteFolders: folders.map(String),
    feedPages: config.feedPages,
    skipBvids
  });
  if (!result.ok) fail(result.error?.message || '浏览器采集失败');
  const outputs = [];
  for (const item of result.results || []) {
    if (!item.meta) {
      console.warn(`[bili-sub] 处理失败：${item.candidate?.bvid || ''} ${item.error?.message || ''}`);
      continue;
    }
    const persisted = persistResult(config, item, item.candidate?.source || '');
    upsertState(state, persisted);
    outputs.push(persisted);
    if (persisted.status === 'done' || persisted.status === 'partial_failed') log(`已生成：${persisted.title} -> ${persisted.notePath}`);
    else if (persisted.status === 'no_subtitle') log(`无字幕，已跳过：${persisted.title} (${persisted.bvid})`);
    else log(`处理失败：${persisted.title} (${persisted.bvid})`);
  }
  saveState(config, state);
  writeJson(config.logPath, { at: new Date().toISOString(), candidateCount: result.candidateCount, outputs });
  log(`候选 ${result.candidateCount} 个，本次处理 ${outputs.length} 个。状态库：${config.statePath}`);
  return outputs;
}

function commandDoctor(config) {
  const nav = tabbitCommand('nav', config, {}, );
  const folders = nav.ok ? tabbitCommand('folders', config) : { folders: [] };
  const info = {
    node: process.version,
    configPath: config._configPath,
    tabbitCli: config.tabbitCli,
    tabbitCliExists: fs.existsSync(config.tabbitCli),
    outputDir: config.outputDir,
    statePath: config.statePath,
    loggedIn: nav.ok,
    user: nav.ok ? { uid: nav.nav.mid, name: nav.nav.uname } : null,
    error: nav.error || null,
    favoriteFolders: folders.folders || []
  };
  console.log(JSON.stringify(info, null, 2));
  if (!info.tabbitCliExists || !nav.ok) process.exitCode = 1;
}

function commandLogin(config) {
  const program = `
    await page.goto('https://www.bilibili.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    return { url: page.url(), title: await page.title(), hint: '如果页面未登录，请在打开的 Tabbit 浏览器中扫码登录后重新运行 doctor。' };
  `;
  const result = tabbitRun(program, config, { timeoutMs: 60000 });
  console.log(JSON.stringify(result, null, 2));
}

function printHelp() {
  console.log(`bili-sub — B站字幕定时采集 CLI

用法：
  node scripts/bili-sub.mjs doctor
  node scripts/bili-sub.mjs login
  node scripts/bili-sub.mjs video <BVID> [--all-pages]
  node scripts/bili-sub.mjs feed [--limit 10] [--feed-pages 2]
  node scripts/bili-sub.mjs favorites --folder <media_id> [--folder <media_id>]
  node scripts/bili-sub.mjs run
  node scripts/bili-sub.mjs list

常用选项：
  --config <path>          指定 config.json
  --output <dir>           指定 Markdown/SRT/TXT 输出目录
  --limit <n>              单次最多处理视频数
  --all-pages              处理多 P 视频的所有分 P
  --force                  忽略已完成状态重新处理
  --retry-no-subtitle      强制复查无字幕视频
`);
}

function commandList(config) {
  const state = loadState(config);
  const rows = Object.values(state.videos).sort((a, b) => (b.pubdate || 0) - (a.pubdate || 0));
  if (!rows.length) {
    log('状态库中暂无视频。');
    return;
  }
  for (const item of rows.slice(0, 50)) {
    console.log(`${item.status}\t${item.bvid}\t${item.author || ''}\t${item.title || ''}`);
  }
  log(`共 ${rows.length} 条，状态库：${config.statePath}`);
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0] || 'help';
if (args.help || command === 'help') {
  printHelp();
} else {
  const config = loadConfig(args);
  if (command === 'doctor') commandDoctor(config);
  else if (command === 'login') commandLogin(config);
  else if (command === 'video') {
    const bvids = args._.slice(1).concat(args.bvids);
    if (!bvids.length) fail('请提供 BVID，例如：bili-sub video BV1xxxxxxxxxx');
    collect(config, args, { bvids, useFeed: false, folders: [] });
  } else if (command === 'feed') {
    collect(config, args, { bvids: [], useFeed: true, folders: [] });
  } else if (command === 'favorites') {
    const folders = args.folders.length ? args.folders : config.sources.favoriteFolders;
    if (!folders.length) fail('请用 --folder <media_id> 指定收藏夹，或先运行 doctor 查看收藏夹 ID。');
    collect(config, args, { bvids: [], useFeed: false, folders });
  } else if (command === 'run') {
    collect(config, args, {
      bvids: [],
      useFeed: config.sources.followingFeed !== false,
      folders: config.sources.favoriteFolders || []
    });
  } else if (command === 'list') commandList(config);
  else fail(`未知命令：${command}。运行 --help 查看用法。`);
}
