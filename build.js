/**
 * build.js —— 用于 GitHub Pages 部署的缓存破坏构建脚本。
 *
 * 职责：
 *   1. 为所有本地资源（CSS / JS / 图片等）追加版本号查询参数，
 *      浏览器看到 URL 变化就会拉新内容。
 *   2. 注入 Service Worker 注册脚本到每个 HTML 页面。
 *   3. 生成 sw.js（VERSION 由本次 build 决定），浏览器发现字节变化
 *      会自动 install 新 SW，清掉旧缓存。
 *
 * 不做 location.replace 强加重定向——那种做法污染 URL、干扰导航、
 * 且对 GitHub Pages 静态文件的缓存行为没有实质帮助。改由 SW 统一接管。
 *
 * 用法：
 *   node build.js              # 追加基于日期的版本号
 *   node build.js --hash       # 使用静态资源内容哈希（推荐）
 *   node build.js --git        # 使用 git 提交短哈希（需要已安装 git）
 *   node build.js --dry        # 只预览改动，不写入文件
 *   node build.js --fresh      # 强制刷新（追加时间戳）
 *
 * 运行结束后，将更新过的 HTML 文件与 sw.js 一并提交并推送。
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 解析命令行参数
const isDry    = process.argv.includes('--dry');
const useGit   = process.argv.includes('--git');
const forceFresh = process.argv.includes('--fresh');
const useHash  = process.argv.includes('--hash');

// 参与哈希计算的静态资源目录
const HASH_DIRS = ['css', 'js', 'images', 'pic', 'components'];

// 生成版本号字符串
let version;
if (useHash) {
  version = computeAssetHash();
  console.log(`Using content-based asset hash: ${version}`);
} else if (forceFresh) {
  version = Date.now().toString();
  console.log('Using timestamp-based version for forced refresh');
} else if (useGit) {
  try {
    version = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    console.log(`Using git commit hash: ${version}`);
  } catch (e) {
    console.warn('Git not available, falling back to date-based version');
    version = getDateVersion();
  }
} else {
  version = getDateVersion();
  console.log(`Using date-based version: ${version}`);
}

function getDateVersion() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// ============================================================
// 内容哈希版本号
//
// 为什么要按内容而不是按日期：
//   日期版本（20261106）在同一天内多次构建时是相同的。若上午改了
//   css/layout.css、下午又改了 js/components.js，两次构建产出的
//   URL 完全相同 —— 浏览器会继续用第一次缓存下来的旧文件，
//   改动看起来"没生效"。用户必须手动强制刷新才能看到更新。
//
//   内容哈希把"所有被引用的静态资源的内容"折叠成一个短摘要。
//   只要任意一个资源的内容变了，哈希就变，所有 URL 随之更新；
//   资源没变时哈希保持不变，不会无谓地让用户的缓存全部失效。
// ============================================================

// 计算所有静态资源的内容哈希（8 位十六进制）
function computeAssetHash() {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  const files = [];

  for (const dir of HASH_DIRS) {
    const full = path.join(__dirname, dir);
    if (!fs.existsSync(full)) continue;
    collectFiles(full, files);
  }

  // 站点根目录下被直接引用的静态资源
  for (const name of ['favicon.svg']) {
    const p = path.join(__dirname, name);
    if (fs.existsSync(p)) files.push(p);
  }

  // 按路径排序，保证结果与文件系统返回顺序无关
  files.sort();

  for (const file of files) {
    hash.update(path.relative(__dirname, file));
    hash.update(fs.readFileSync(file));
  }

  return hash.digest('hex').slice(0, 8);
}

// 递归收集目录下的所有文件
function collectFiles(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
}

// build.js 会在处理 HTML 时清除带 location.replace 强制刷新的内联脚本。
// 下面的常量描述该脚本的文本特征，供 processHtml() 精确匹配并清除。
const LEGACY_FORCE_FRESH_MARKER = '__pageLoaded';
const LEGACY_FORCE_FRESH_PATTERN = new RegExp(
  '<script>\\s*\\(function\\(\\) \\{[^<]*?__pageLoaded[\\s\\S]*?location\\.replace[\\s\\S]*?\\}\\)\\(\\);\\s*<\\/script>\\s*',
  'g'
);

// 需要追加缓存破坏参数的文件扩展名
const RESOURCE_EXTENSIONS = ['.css', '.js', '.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];

// 需要扫描 HTML 文件的目录
const HTML_DIRS = [
  path.join(__dirname),
  path.join(__dirname, 'en'),
  path.join(__dirname, 'guide'),
  path.join(__dirname, 'components'),
];

// ===== Service Worker 模板 =====
// 策略：纯网络模式（network-only）。
// - 所有同源 GET 请求一律先打网络，**不读缓存**也**不写缓存**。
// - 网络不可达时直接返回 503，由浏览器渲染错误页或标记资源加载失败。
// - 任何 HTML / CSS / JS / 图片更新后，用户下次访问必看到最新版。
const SW_TEMPLATE = `// sw.js — Service Worker for Ocelot Sign Mod Wiki
// 本文件由 build.js 自动生成，不要手动修改下面这行 VERSION。
// 当 build.js 替换 VERSION 时，浏览器检测到字节变化 → install 新 SW。
const VERSION = '__SW_VERSION__';

self.addEventListener('install', (event) => {
  // 新 SW 立即激活，不等旧 tab 关闭
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 清理本项目命名空间下的全部缓存条目
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith('ocelot-wiki-'))
        .map((k) => {
          console.log('[SW] delete old cache:', k);
          return caches.delete(k);
        })
    );
    // 立即接管所有已打开的 tab
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源 GET 请求
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // 跳过 SW 自身，避免循环
  if (url.pathname.endsWith('/sw.js')) return;

  // 纯网络模式：永远先打网络，不读缓存也不写缓存
  event.respondWith(
    fetch(request).catch(() => {
      const accept = request.headers.get('accept') || '';
      const isHTML = request.mode === 'navigate' || accept.includes('text/html');

      if (isHTML) {
        // HTML 返回一个友好的离线错误页（让用户知道发生了什么）
        const isEn = url.pathname.indexOf('/en/') !== -1;
        const copy = isEn
          ? { title: 'Network unavailable | Ocelot Sign Mod', heading: 'Network connection failed',
              body: 'Could not reach GitHub Pages. Check your connection and try again.',
              button: 'Reload page' }
          : { title: '网络不可用 | 豹猫指示牌模组', heading: '网络连接失败',
              body: '无法连接到 GitHub Pages。请检查网络后重试。',
              button: '刷新页面' };
        const html = '<!DOCTYPE html>\\n<html lang="' + (isEn ? 'en' : 'zh-CN') + '">\\n<head>\\n' +
          '<meta charset="UTF-8">\\n' +
          '<meta name="viewport" content="width=device-width, initial-scale=1.0">\\n' +
          '<title>' + copy.title + '</title>\\n' +
          '<style>\\n' +
          'body { font-family: "Microsoft YaHei", sans-serif; background: #1a1a2e; color: #ccc;\\n' +
          '       display: flex; flex-direction: column; align-items: center; justify-content: center;\\n' +
          '       min-height: 100vh; margin: 0; text-align: center; padding: 20px; }\\n' +
          'h1 { font-size: 48px; color: #f0a500; margin: 0 0 16px; }\\n' +
          'p { font-size: 16px; margin: 0 0 24px; }\\n' +
          'button { background: #4a90d9; border: 0; padding: 12px 24px; color: #fff;\\n' +
          '        border-radius: 4px; cursor: pointer; font-size: 16px; }\\n' +
          'button:hover { background: #5aa0e9; }\\n' +
          '</style>\\n</head>\\n<body>\\n' +
          '<h1>' + copy.heading + '</h1>\\n' +
          '<p>' + copy.body + '</p>\\n' +
          '<button onclick="location.reload()">' + copy.button + '</button>\\n' +
          '</body>\\n</html>';
        return new Response(html, {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      // 静态资源（CSS / JS / 图片）失败：返回 503 文本
      return new Response('Network unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })
  );
});
`;

// ===== SW 注册脚本（注入到每个 HTML 的 </body> 之前） =====
// 不写死相对路径——而是先找到 components.js 算出站点根，再拼 sw.js 路径。
// 这样在 GitHub Pages (/OcelotSignMod_Docs/) 和本地 (/) 都能正确注册。
const SW_REGISTRATION_SCRIPT = `(function() {
  if (!('serviceWorker' in navigator)) return;

  function detectSwPath() {
    // 通过 components.js 的脚本地址推导站点根路径。
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('components.js') !== -1) {
        try {
          var u = new URL(src);
          var segs = u.pathname.split('/').filter(Boolean);
          segs.pop(); // components.js
          segs.pop(); // js
          return (segs.length === 0 ? '/' : '/' + segs.join('/') + '/') + 'sw.js';
        } catch (e) { /* 忽略异常，继续走下一条分支 */ }
      }
    }
    return 'sw.js';
  }

  function register() {
    navigator.serviceWorker.register(detectSwPath()).then(function(reg) {
      // 每 30 分钟轮询一次更新，使长时间停留的标签页也能获取新版本。
      setInterval(function() { reg.update().catch(function() {}); }, 30 * 60 * 1000);
      // 标签页重新可见时再检查一次。
      document.addEventListener('visibilitychange', function() {
        if (!document.hidden) reg.update().catch(function() {});
      });
    }).catch(function(err) {
      console.warn('[SW] registration failed:', err);
    });
  }

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register);
  }
})();`;

// 递归查找所有 HTML 文件
function findHtmlFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // 跳过 node_modules、.git、dist、build 目录
      if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
        files.push(...findHtmlFiles(fullPath));
      }
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.htm')) {
      files.push(fullPath);
    }
  }
  return files;
}

// 判断某个 URL 是否需要追加缓存破坏参数
function needsCacheBust(url) {
  // 跳过外部 URL 与纯锚点链接
  if (!url || url.startsWith('http://') || url.startsWith('https://') ||
      url.startsWith('//') || url.startsWith('mailto:') || url.startsWith('#')) {
    return false;
  }

  // 判断它是否引用了需要缓存破坏的本地资源
  const ext = path.extname(url.split('?')[0]).toLowerCase();
  return RESOURCE_EXTENSIONS.includes(ext);
}

// 为 URL 追加版本查询参数
function addVersion(url) {
  const [pathPart, queryPart] = url.split('?');
  const separator = queryPart ? '&' : '?';
  return `${pathPart}${separator}v=${version}`;
}

// 处理 HTML 文件内容
function processHtml(content) {
  let result = content;

  // 1. 清除历史版本遗留的强制刷新内联脚本。
  if (result.includes(LEGACY_FORCE_FRESH_MARKER)) {
    result = result.replace(LEGACY_FORCE_FRESH_PATTERN, '');
  }

  // 2. 为本地资源（CSS / JS / 图片）追加或更新 ?v=<version> 参数。
  const attrPattern = /(href|src)="([^"]+)"/gi;
  result = result.replace(attrPattern, (match, attr, url) => {
    if (!needsCacheBust(url)) return match;
    const [pathPart, queryPart = ''] = url.split('?');
    const params = new URLSearchParams(queryPart);
    params.set('v', version);
    const newQuery = params.toString();
    return `${attr}="${pathPart}?${newQuery}"`;
  });

  // 3. 注入 SW 注册脚本到 </body> 之前（仅注入一次）。
  if (!result.includes("'serviceWorker' in navigator")) {
    const bodyClosePattern = /<\/body>/i;
    if (bodyClosePattern.test(result)) {
      const inject = `<script>\n${SW_REGISTRATION_SCRIPT}\n</script>\n</body>`;
      result = result.replace(bodyClosePattern, inject);
    }
  }

  return result;
}

// 生成 sw.js 文件
function writeServiceWorker() {
  const swContent = SW_TEMPLATE.replace('__SW_VERSION__', version);
  const swPath = path.join(__dirname, 'sw.js');
  if (isDry) {
    console.log(`  (would write) sw.js  (?v=${version})`);
    return;
  }
  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log(`  sw.js  (VERSION=${version})`);
}

// 查找所有 HTML 文件
const htmlFiles = [];
for (const dir of HTML_DIRS) {
  htmlFiles.push(...findHtmlFiles(dir));
}

// 去重
const uniqueFiles = [...new Set(htmlFiles)];

console.log(`\nFound ${uniqueFiles.length} HTML files to process\n`);

let processed = 0;
let changed = 0;
let legacyCleaned = 0;
let swInjected = 0;

for (const file of uniqueFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const hadLegacy = content.includes(LEGACY_FORCE_FRESH_MARKER);
  const hadSw    = content.includes("'serviceWorker' in navigator");
  const processedContent = processHtml(content);

  if (content !== processedContent) {
    changed++;
    if (hadLegacy && !processedContent.includes(LEGACY_FORCE_FRESH_MARKER)) {
      legacyCleaned++;
    }
    if (!hadSw && processedContent.includes("'serviceWorker' in navigator")) {
      swInjected++;
    }
    console.log(`  ${path.relative(__dirname, file)}`);

    if (!isDry) {
      fs.writeFileSync(file, processedContent, 'utf8');
    }
  }
  processed++;
}

// 写 sw.js（要么新写，要么 VERSION 变了就覆盖）
const swPath = path.join(__dirname, 'sw.js');
let swWillChange = true;
if (fs.existsSync(swPath)) {
  const existing = fs.readFileSync(swPath, 'utf8');
  const expected = SW_TEMPLATE.replace('__SW_VERSION__', version);
  swWillChange = existing !== expected;
}
if (swWillChange) {
  writeServiceWorker();
} else {
  console.log(`  sw.js  (unchanged, VERSION=${version})`);
}

console.log(`\n${isDry ? '[DRY RUN] Would change' : 'Changed'} ${changed} of ${processed} HTML files`);
console.log(`Version parameter: ?v=${version}`);
if (legacyCleaned) console.log(`Cleaned legacy cache-buster script from ${legacyCleaned} file(s).`);
if (swInjected)     console.log(`Injected Service Worker registration in ${swInjected} file(s).`);
console.log();

if (isDry) {
  console.log('Run without --dry to apply changes:\n  node build.js\n');
}
