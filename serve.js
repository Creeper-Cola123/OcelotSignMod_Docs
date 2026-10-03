/**
 * serve.js — Zero-dependency static file server for this project.
 *
 * Usage:
 *   node serve.js              # default port 8080
 *   node serve.js 3000        # custom port
 *   node serve.js 8080 /path  # port + root directory
 *
 * Works on Windows (PowerShell/CMD) and Unix (macOS/Linux).
 * Opens http://localhost:<port>/index.html in your browser automatically.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT    = parseInt(process.argv[2] || process.env.PORT || '8080', 10);
const ROOT    = path.resolve(process.argv[3] || __dirname);
const INDEX   = 'index.html';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
  '.zip':  'application/zip',
  '.pdf':  'application/pdf',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
};

function mime(file) {
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function log(status, reqPath, size) {
  const color = status < 300 ? '\x1b[32m' : status < 400 ? '\x1b[33m' : '\x1b[31m';
  const reset = '\x1b[0m';
  const sizeStr = typeof size === 'number' ? ` (${(size / 1024).toFixed(1)} KB)` : '';
  console.log(`${color}${status}${reset} ${reqPath}${sizeStr}`);
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsed.pathname);

  // Prevent path traversal
  if (pathname.includes('..')) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  let filePath = path.join(ROOT, pathname);

  // If the path points to a directory, try index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, INDEX);
    pathname = path.join(pathname, INDEX);
  }

  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // 404
      const notFoundPath = path.join(ROOT, '404.html');
      if (fs.existsSync(notFoundPath) && filePath !== notFoundPath) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(notFoundPath).pipe(res);
        log(404, pathname);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: ' + pathname);
        log(404, pathname);
      }
      return;
    }

    // Set CORS headers so file:// access to assets works in dev
    res.writeHead(200, {
      'Content-Type':  mime(filePath),
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
    log(200, pathname, data.length);
  });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\x1b[33mPort ${PORT} is already in use.\x1b[0m Try: \x1b[36mnode serve.js ${PORT + 1}\x1b[0m`);
  } else {
    console.error('\x1b[31mServer error:\x1b[0m', err.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  const home = `http://localhost:${PORT}/index.html`;
  console.log(`\x1b[36m\x1b[1mOcelot Sign Mod Wiki\x1b[0m`);
  console.log(`Serving \x1b[2m${ROOT}\x1b[0m`);
  console.log(`Local:  \x1b[4m${home}\x1b[0m`);
  console.log(`GitHub Pages compatible: \x1b[2mYES\x1b[0m (all paths are relative, no base path needed)`);
  console.log(`\nPress \x1b[33mCtrl+C\x1b[0m to stop the server.\n`);

  // Auto-open browser
  const start = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  require('child_process').exec(`${start} ${home}`, () => {});
});
