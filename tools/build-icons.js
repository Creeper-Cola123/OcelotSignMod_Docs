/**
 * build-icons.js — 生成 css/icons.css
 *
 * 站点原本用大量 emoji（📁 ✏️ 🎨 …）充当界面图标，视觉上非常"AI 生成"。
 * 这里把每个图标改写成统一风格的线性 SVG（24×24 网格、1.7px 描边、
 * 圆角端点），再以 data-URI + CSS mask 的形式输出：
 *
 *   <span class="ic ic-folder"></span>
 *
 * 好处：
 *   - 颜色跟随 currentColor，不用为深色 / 浅色主题各写一套；
 *   - 尺寸跟随 font-size，一处定义全局通用；
 *   - 无需额外网络请求，不依赖任何第三方图标库。
 *
 * 用法：node tools/build-icons.js
 * 生成结果：css/icons.css（提交进仓库，改图标请改本文件后重新生成）
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * 图标定义。每个条目是一段 SVG 内部结构，
 * 统一使用 24×24 视口、fill:none、stroke:currentColor 的描边风格。
 */
const ICONS = {
  // ---- 文件与目录 ----
  folder: '<path d="M3 7.6A1.6 1.6 0 0 1 4.6 6h4.1a1.6 1.6 0 0 1 1.25.62L11.4 8.9h8A1.6 1.6 0 0 1 21 10.5v7.9A1.6 1.6 0 0 1 19.4 20H4.6A1.6 1.6 0 0 1 3 18.4z"/>',
  'folder-open': '<path d="M3 7.6A1.6 1.6 0 0 1 4.6 6h4.1a1.6 1.6 0 0 1 1.25.62L11.4 8.9h8A1.6 1.6 0 0 1 21 10.5v1.6"/><path d="M3 8.4v9.6a1.6 1.6 0 0 0 1.6 1.6h14.6a1.6 1.6 0 0 0 1.5-1.03l1.9-4.86a.8.8 0 0 0-.73-1.06H6.3L3.6 17.6A1.6 1.6 0 0 1 3 16.8z"/>',
  file: '<path d="M13.6 3.5H7A1.6 1.6 0 0 0 5.4 5.1v13.8A1.6 1.6 0 0 0 7 20.5h10a1.6 1.6 0 0 0 1.6-1.6V8.5z"/><path d="M13.6 3.5v5h5"/>',
  'file-code': '<path d="M13.6 3.5H7A1.6 1.6 0 0 0 5.4 5.1v13.8A1.6 1.6 0 0 0 7 20.5h10a1.6 1.6 0 0 0 1.6-1.6V8.5z"/><path d="M13.6 3.5v5h5"/><path d="m10.5 12-2 2 2 2"/><path d="m14 12 2 2-2 2"/>',
  'file-text': '<path d="M13.6 3.5H7A1.6 1.6 0 0 0 5.4 5.1v13.8A1.6 1.6 0 0 0 7 20.5h10a1.6 1.6 0 0 0 1.6-1.6V8.5z"/><path d="M13.6 3.5v5h5"/><path d="M8.6 13h6.8M8.6 16.4h4.4"/>',
  braces: '<path d="M9.4 3.5H8A2.4 2.4 0 0 0 5.6 5.9v3.3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3.3a2.4 2.4 0 0 0 2.4 2.4h1.4"/><path d="M14.6 3.5H16A2.4 2.4 0 0 1 18.4 5.9v3.3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3.3a2.4 2.4 0 0 1-2.4 2.4h-1.4"/>',
  image: '<path d="M5.4 3.5h13.2A1.6 1.6 0 0 1 20.2 5.1v13.8a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6V5.1A1.6 1.6 0 0 1 5.4 3.5z"/><circle cx="8.8" cy="8.8" r="1.6"/><path d="m4 17 4.8-4.4 3.4 3 3.1-2.7 4.5 4.1"/>',
  type: '<path d="M5 19 12 5.2 19 19"/><path d="M8.3 14h7.4"/>',
  archive: '<path d="M3 4.5h18v4.2H3z"/><path d="M4.8 8.7v10.8h14.4V8.7"/><path d="M10 12.6h4"/>',
  cube: '<path d="m12 2.8 8.5 4.9v9.8L12 22.4 3.5 17.5V7.7z"/><path d="m3.5 7.7 8.5 4.9 8.5-4.9"/><path d="M12 12.6v9.8"/>',
  book: '<path d="M6 3.5h11.4A1.6 1.6 0 0 1 19 5.1v13.8H7.6A2.6 2.6 0 0 0 5 21.5V5.1A1.6 1.6 0 0 1 6.6 3.5z"/><path d="M19 18.9H7.6A2.6 2.6 0 0 0 5 21.5"/>',

  // ---- 操作 ----
  upload: '<path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/><path d="M12 3.6v11"/><path d="m7.6 8 4.4-4.4L16.4 8"/>',
  download: '<path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/><path d="M12 14.6v-11"/><path d="m7.6 10.2 4.4 4.4 4.4-4.4"/>',
  save: '<path d="M5.5 3.5h10.6L20 7.4v12.1a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-14A1.6 1.6 0 0 1 5.5 3.5z"/><path d="M8 3.5v5h6.6v-5"/><path d="M8 20.5v-6h8v6"/>',
  trash: '<path d="M4 6.5h16"/><path d="M9.5 6.5V4.9A1.4 1.4 0 0 1 10.9 3.5h2.2a1.4 1.4 0 0 1 1.4 1.4v1.6"/><path d="m6.4 6.5.9 12.6a1.6 1.6 0 0 0 1.6 1.4h6.2a1.6 1.6 0 0 0 1.6-1.4l.9-12.6"/><path d="M10 10.6v6M14 10.6v6"/>',
  pencil: '<path d="M4 20.4h4.2L19.4 9.2a2.53 2.53 0 0 0-3.58-3.58L4.6 16.8z"/><path d="m14.6 6.6 3.58 3.58"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="1.6"/><path d="M15 9V5.6A1.6 1.6 0 0 0 13.4 4H5.6A1.6 1.6 0 0 0 4 5.6v7.8A1.6 1.6 0 0 0 5.6 15H9"/>',
  paste: '<path d="M9 4.5H7.6A1.6 1.6 0 0 0 6 6.1v13.3A1.6 1.6 0 0 0 7.6 21h8.8a1.6 1.6 0 0 0 1.6-1.6V6.1a1.6 1.6 0 0 0-1.6-1.6H15"/><rect x="9" y="2.6" width="6" height="4" rx="1.3"/>',
  scissors: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M20 4 8.7 15.3"/><path d="m14.4 14.4 5.6 5.6"/><path d="m8.6 8.6 1.9 1.9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  'plus-circle': '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.2v7.6M8.2 12h7.6"/>',
  close: '<path d="m6.2 6.2 11.6 11.6M17.8 6.2 6.2 17.8"/>',
  'x-circle': '<circle cx="12" cy="12" r="8.5"/><path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6"/>',
  check: '<path d="m5 12.6 4.6 4.6L19 7.4"/>',
  'check-circle': '<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.2 2.7 2.7 5.1-5.4"/>',
  refresh: '<path d="M3.4 12a8.6 8.6 0 0 1 14.7-6L20.6 8.4"/><path d="M20.6 3.6v4.8h-4.8"/><path d="M20.6 12a8.6 8.6 0 0 1-14.7 6L3.4 15.6"/><path d="M3.4 20.4v-4.8h4.8"/>',
  'arrow-left': '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  'arrow-up': '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  'arrow-down': '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
  'chevron-right': '<path d="m9.5 5.5 7 6.5-7 6.5"/>',
  'trash-simple': '<path d="M6 7h12v12.4a1.6 1.6 0 0 1-1.6 1.6H7.6A1.6 1.6 0 0 1 6 19.4z"/><path d="M9.5 7V4.6h5V7"/>',

  // ---- 提示与状态 ----
  alert: '<path d="M10.6 4.2 2.6 18.3a1.6 1.6 0 0 0 1.39 2.4h16.02a1.6 1.6 0 0 0 1.39-2.4L13.4 4.2a1.6 1.6 0 0 0-2.8 0z"/><path d="M12 9.6v4.4"/><path d="M12 17.6h.01"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11.2v5.4"/><path d="M12 7.8h.01"/>',
  bulb: '<path d="M9.2 17.4h5.6"/><path d="M10 20.5h4"/><path d="M12 2.8a6.2 6.2 0 0 0-3.6 11.2c.6.5 1 1.2 1 2v1.4h5.2V16c0-.8.4-1.5 1-2A6.2 6.2 0 0 0 12 2.8z"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="m5.6 5.6 12.8 12.8"/>',
  link: '<path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.5 1.5"/><path d="M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.5-1.5"/>',
  'external-link': '<path d="M13.5 4.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h12a1.5 1.5 0 0 0 1.5-1.5v-7.4"/><path d="M15 3.5h5.5V9"/><path d="M10 14 20.5 3.5"/>',
  eye: '<path d="M2.6 12S6.2 5.6 12 5.6 21.4 12 21.4 12 17.8 18.4 12 18.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.9"/>',
  'map-pin': '<path d="M12 21.4s6.9-5.5 6.9-11A6.9 6.9 0 0 0 5.1 10.4c0 5.5 6.9 11 6.9 11z"/><circle cx="12" cy="10.2" r="2.5"/>',
  inbox: '<path d="M21 12.4h-4.9l-1.6 2.4h-5L8 12.4H3"/><path d="M5.6 5.2 3 12.4v5.1a1.5 1.5 0 0 0 1.5 1.5h15a1.5 1.5 0 0 0 1.5-1.5v-5.1l-2.6-7.2a1.5 1.5 0 0 0-1.4-1H7a1.5 1.5 0 0 0-1.4 1z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="1.6"/><path d="m3.7 6.6 8.3 5.9 8.3-5.9"/>',
  tag: '<path d="M20.4 13.2 13.2 20.4a1.7 1.7 0 0 1-2.4 0L3.4 13V3.6h9.4l7.6 7.6a1.7 1.7 0 0 1 0 2z"/><path d="M7.6 7.6h.01"/>',
  layers: '<path d="m12 2.9 9 4.6-9 4.6-9-4.6z"/><path d="m3 12.2 9 4.6 9-4.6"/><path d="m3 16.8 9 4.6 9-4.6"/>',

  // ---- 界面结构 ----
  menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
  grid: '<rect x="3.6" y="3.6" width="7" height="7" rx="1.3"/><rect x="13.4" y="3.6" width="7" height="7" rx="1.3"/><rect x="3.6" y="13.4" width="7" height="7" rx="1.3"/><rect x="13.4" y="13.4" width="7" height="7" rx="1.3"/>',
  list: '<path d="M8.4 6.2h11.4M8.4 12h11.4M8.4 17.8h11.4"/><path d="M4.2 6.2h.01M4.2 12h.01M4.2 17.8h.01"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v3.2M12 18.2v3.2M21.4 12h-3.2M5.8 12H2.6M18.6 5.4l-2.3 2.3M7.7 16.3l-2.3 2.3M18.6 18.6l-2.3-2.3M7.7 7.7 5.4 5.4"/>',
  palette: '<path d="M12 21a9 9 0 1 1 0-18c4.97 0 9 3.6 9 8 0 2.2-1.8 4-4 4h-1.8a1.9 1.9 0 0 0-1.4 3.2 1.9 1.9 0 0 1-1.4.8H12z"/><circle cx="7.6" cy="12.4" r="1.1"/><circle cx="10" cy="8.2" r="1.1"/><circle cx="15.2" cy="9.4" r="1.1"/>',
  sparkles: '<path d="m12 3.2 1.7 4.5 4.5 1.7-4.5 1.7L12 15.6l-1.7-4.5L5.8 9.4l4.5-1.7z"/><path d="m18.6 14.4.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"/>',
  train: '<path d="M5.6 3.5h12.8A1.6 1.6 0 0 1 20 5.1v9.4a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 14.5V5.1A1.6 1.6 0 0 1 5.6 3.5z"/><path d="M4 9.6h16"/><path d="m8.4 20.4-2 1.6M15.6 20.4l2 1.6"/><circle cx="8.6" cy="13" r="1"/><circle cx="15.4" cy="13" r="1"/>',
  ship: '<path d="M3 17.4h18l-1.7 3.1a1.6 1.6 0 0 1-1.4.8H6.1a1.6 1.6 0 0 1-1.4-.8z"/><path d="M5.6 14 4.2 9.6h15.6L18.4 14"/><path d="M9.2 9.6V5h5.6v4.6"/>',
  plane: '<path d="M12 2.5a2 2 0 0 1 2 2v6.2l7.5 4.3v2.3L14 14.8v4.1l2.5 1.6v1.6L12 20.6l-4.5 1.5v-1.6L10 18.9v-4.1L2.5 17.3V15L10 10.7V4.5a2 2 0 0 1 2-2z"/>'
};

/** 把一段 SVG 内部结构包装成可直接用作 mask 的 data-URI。 */
function toDataUri(inner) {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' " +
    "stroke='%23000' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'>" +
    inner +
    '</svg>';
  return (
    "url(\"data:image/svg+xml," +
    svg
      .replace(/</g, '%3C')
      .replace(/>/g, '%3E')
      .replace(/"/g, "'")
      .replace(/#/g, '%23')
      .replace(/\s+/g, ' ')
      .trim() +
    "\")"
  );
}

const lines = [];
lines.push('/* ============================================================');
lines.push('   统一图标系统');
lines.push('   ------------------------------------------------------------');
lines.push('   取代原先铺满界面的 emoji：所有图标都是同一套线性 SVG，');
lines.push('   颜色跟随 currentColor，尺寸跟随 font-size。');
lines.push('');
lines.push('   用法：<span class="ic ic-folder"></span>');
lines.push('');
lines.push('   本文件由 tools/build-icons.js 生成，修改图标请改那个脚本后重新生成。');
lines.push('   ============================================================ */');
lines.push('');
lines.push('.ic {');
lines.push('  display: inline-block;');
lines.push('  width: 1em;');
lines.push('  height: 1em;');
lines.push('  flex: none;');
lines.push('  vertical-align: -0.14em;');
lines.push('  background-color: currentColor;');
lines.push('  -webkit-mask-repeat: no-repeat;');
lines.push('          mask-repeat: no-repeat;');
lines.push('  -webkit-mask-position: center;');
lines.push('          mask-position: center;');
lines.push('  -webkit-mask-size: 100% 100%;');
lines.push('          mask-size: 100% 100%;');
lines.push('}');
lines.push('');

Object.keys(ICONS).forEach((name) => {
  const uri = toDataUri(ICONS[name]);
  lines.push('.ic-' + name + ' {');
  lines.push('  -webkit-mask-image: ' + uri + ';');
  lines.push('          mask-image: ' + uri + ';');
  lines.push('}');
  lines.push('');
});

const outPath = path.join(__dirname, '..', 'css', 'icons.css');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('wrote ' + path.relative(path.join(__dirname, '..'), outPath) + ' (' + Object.keys(ICONS).length + ' icons)');
