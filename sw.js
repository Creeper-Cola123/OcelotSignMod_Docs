// sw.js — Service Worker for Ocelot Sign Mod Wiki
// 本文件由 build.js 自动生成，不要手动修改下面这行 VERSION。
// 当 build.js 替换 VERSION 时，浏览器检测到字节变化 → install 新 SW。
const VERSION = '23f63ec1';

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
        const html = '<!DOCTYPE html>\n<html lang="' + (isEn ? 'en' : 'zh-CN') + '">\n<head>\n' +
          '<meta charset="UTF-8">\n' +
          '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
          '<title>' + copy.title + '</title>\n' +
          '<style>\n' +
          'body { font-family: "Microsoft YaHei", sans-serif; background: #1a1a2e; color: #ccc;\n' +
          '       display: flex; flex-direction: column; align-items: center; justify-content: center;\n' +
          '       min-height: 100vh; margin: 0; text-align: center; padding: 20px; }\n' +
          'h1 { font-size: 48px; color: #f0a500; margin: 0 0 16px; }\n' +
          'p { font-size: 16px; margin: 0 0 24px; }\n' +
          'button { background: #4a90d9; border: 0; padding: 12px 24px; color: #fff;\n' +
          '        border-radius: 4px; cursor: pointer; font-size: 16px; }\n' +
          'button:hover { background: #5aa0e9; }\n' +
          '</style>\n</head>\n<body>\n' +
          '<h1>' + copy.heading + '</h1>\n' +
          '<p>' + copy.body + '</p>\n' +
          '<button onclick="location.reload()">' + copy.button + '</button>\n' +
          '</body>\n</html>';
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
