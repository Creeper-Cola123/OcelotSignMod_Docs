/**
 * tools/add-favicon.js —— 为所有完整页面注入 favicon 链接。
 *
 * 职责：
 *   1. 遍历站点内所有带 <head> 的完整 HTML 页面。
 *   2. 若页面尚未声明 favicon，则按页面所在深度计算站点根相对路径，
 *      注入 <link rel="icon"> 标签。
 *   3. 已经是 .svg 的图标不再追加 .ico 兜底，避免多余请求。
 *
 * 用法：
 *   node tools/add-favicon.js          # 写入改动
 *   node tools/add-favicon.js --dry    # 只预览
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const isDry = process.argv.includes('--dry');

// 站点根目录之外不需要注入（components/ 下的片段没有 <head>）
const SKIP_DIRS = ['node_modules', '.git', 'tools', 'components'];

function findHtmlFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.includes(entry.name)) files.push(...findHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

// 依据文件相对站点根的层级深度，计算回到根目录的相对路径前缀
function rootPrefix(file) {
  const rel = path.relative(ROOT, file);
  const depth = rel.split(path.sep).length - 1;
  return depth === 0 ? './' : '../'.repeat(depth);
}

function processHtml(content, file) {
  if (/<link[^>]+rel=["']icon["']/i.test(content)) return null;

  const link = '<link rel="icon" href="' + rootPrefix(file) + 'favicon.svg" type="image/svg+xml">';
  const headMatch = content.match(/<head[^>]*>/i);
  if (!headMatch) return null;

  // 紧跟在 <head> 之后，保证在 charset / viewport 声明之前
  return content.replace(headMatch[0], headMatch[0] + '\n    ' + link);
}

let changed = 0;
let total = 0;

for (const file of findHtmlFiles(ROOT)) {
  total++;
  const content = fs.readFileSync(file, 'utf8');
  if (!/<head[^>]*>/i.test(content)) continue;

  const result = processHtml(content, file);
  if (result === null) continue;

  changed++;
  console.log('  ' + path.relative(ROOT, file));
  if (!isDry) fs.writeFileSync(file, result, 'utf8');
}

console.log('\n' + (isDry ? '[DRY RUN] Would update' : 'Updated') + ' ' + changed + ' of ' + total + ' HTML files');
if (isDry) console.log('Run without --dry to apply changes:\n  node tools/add-favicon.js\n');
