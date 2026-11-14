/**
 * check-comments.js —— 注释风格与代码健康度巡检
 *
 * 用法：node tools/check-comments.js
 *
 * 检查项：
 *   语法   JS 能否被解析、CSS 花括号是否平衡
 *   排版   块注释定界符与文字之间是否留空格
 *   层级   同一文件内横幅 / 小节标题的分隔符风格是否统一
 *   定性   注释中是否残留日志式措辞、英文正文、TODO 标记
 *   泄漏   注释内容是否渗入 HTML 可见文本
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = ['node_modules', '.git', 'tools'];

/* ---------------------------------------------------------------- 采集文件 */

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|css|html)$/.test(entry.name)) files.push(full);
  }
})(ROOT);

const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');

/* ------------------------------------------------------------ 注释提取工具 */

/** 词法扫描 JS，跳过字符串、模板字面量与正则字面量，返回注释块。 */
function jsComments(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  // 记录上一个有效字符，用于判断 "/" 是除号还是正则起始
  let prev = '';

  const isRegexStart = () => {
    if (prev === '') return true;
    return !/[)\]}]/.test(prev) && !/[A-Za-z0-9_$]/.test(prev);
  };

  while (i < n) {
    const c2 = src.slice(i, i + 2);
    if (c2 === '//') {
      const start = i;
      while (i < n && src[i] !== '\n') i++;
      out.push({ kind: 'line', text: src.slice(start + 2, i), line: src.slice(0, start).split('\n').length });
      prev = '/';
      continue;
    }
    if (c2 === '/*') {
      const start = i;
      const end = src.indexOf('*/', i + 2);
      out.push({
        kind: 'block',
        raw: src.slice(start, end === -1 ? n : end + 2),
        text: src.slice(i + 2, end === -1 ? n : end),
        line: src.slice(0, start).split('\n').length
      });
      i = end === -1 ? n : end + 2;
      prev = '/';
      continue;
    }
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (q === '`' && src[i] === '$' && src[i + 1] === '{') {
          let d = 1; i += 2;
          while (i < n && d > 0) { if (src[i] === '{') d++; else if (src[i] === '}') d--; i++; }
          continue;
        }
        if (src[i] === q) { i++; break; }
        i++;
      }
      prev = q;
      continue;
    }
    // 正则字面量：跳过，避免其中的 // 与 /* 被误判为注释
    if (c === '/' && isRegexStart()) {
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < n) {
        const ch = src[j];
        if (ch === '\\') { j += 2; continue; }
        if (ch === '\n') break;
        if (ch === '[') inClass = true;
        else if (ch === ']') inClass = false;
        else if (ch === '/' && !inClass) { j++; closed = true; break; }
        j++;
      }
      if (closed) {
        while (j < n && /[a-z]/.test(src[j])) j++;
        i = j;
        prev = '/';
        continue;
      }
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}

/** 提取 HTML 中的注释块。 */
function htmlComments(src) {
  const out = [];
  const re = /<!--([\s\S]*?)-->/g;
  let m;
  while ((m = re.exec(src))) {
    out.push({
      kind: 'block',
      raw: m[0],
      text: m[1],
      line: src.slice(0, m.index).split('\n').length
    });
  }
  return out;
}

/** 提取 CSS 中的注释块。 */
function cssComments(src) {
  const out = [];
  const re = /\/\*([\s\S]*?)\*\//g;
  let m;
  while ((m = re.exec(src))) {
    out.push({
      kind: 'block',
      raw: m[0],
      text: m[1],
      line: src.slice(0, m.index).split('\n').length
    });
  }
  return out;
}

/* -------------------------------------------------------------- 问题收集 */

const problems = [];
const add = (kind, file, line, detail) => problems.push({ kind, file, line, detail });

const CJK = /[\u4e00-\u9fff]/;

// 日志式 / 变更记录式措辞
const LOG_PATTERNS = [
  /^\s*\[\d{4}[-/年]\d{1,2}[-/月]\d{1,2}/,
  /^\s*\[[A-Z]{2,6}\]\s*[:：]/,
  /\b(Bug|Fix|Issue|Ref|Ticket)\s*#?\s*\d+/i,
  /^\s*(TODO|FIXME|XXX|HACK|NOTE)\s*[:：]/,
  /^\s*(已修复|已添加|已更新|已删除|已移除|已重构|已优化)\s*[:：]/,
  /^\s*(本次|此次|这次|上一版|前一版)\s*(修改|改动|变更|更新|修复)/,
  /(更新日志|变更记录|修改记录|修订记录|changelog)/i
];

/* ------------------------------------------------------------ 逐文件检查 */

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const name = rel(file);

  /* --- 语法 --- */
  if (file.endsWith('.js')) {
    try {
      new vm.Script(src, { filename: name });
    } catch (e) {
      add('语法', name, 0, `JS 解析失败：${e.message}`);
    }
  } else if (file.endsWith('.css')) {
    const bare = src.replace(/\/\*[\s\S]*?\*\//g, '');
    let depth = 0;
    let negative = 0;
    for (const ch of bare) {
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth < 0) negative++; }
    }
    if (depth !== 0) add('语法', name, 0, `CSS 花括号不平衡，收尾深度 ${depth}`);
    if (negative > 0) add('语法', name, 0, `CSS 出现 ${negative} 处多余右花括号`);
  }

  /* --- 注释检查 --- */
  const comments = file.endsWith('.js')
    ? jsComments(src)
    : file.endsWith('.css')
      ? cssComments(src)
      : htmlComments(src);

  for (const cm of comments) {
    // 单行块注释：定界符与文字之间需留空格
    if (cm.kind === 'block' && !cm.raw.includes('\n')) {
      const body = cm.text;
      const isDelim = /^[-=─━]{2,}/.test(body.trim());
      const isJsDoc = cm.raw.startsWith('/**');
      if (!isDelim && !isJsDoc && body.trim() && !/^\s/.test(body)) {
        add('排版', name, cm.line, `定界符紧贴文字：${cm.raw.trim().slice(0, 70)}`);
      }
      if (!isDelim && !isJsDoc && body.trim() && !/\s$/.test(body)) {
        add('排版', name, cm.line, `定界符紧贴文字：${cm.raw.trim().slice(0, 70)}`);
      }
    }

    // 行注释：定界符后需有一个空格
    if (cm.kind === 'line' && cm.text.trim() && !/^\s/.test(cm.text)) {
      add('排版', name, cm.line, `定界符后缺少空格：${('//' + cm.text).trim().slice(0, 70)}`);
    }

    // 逐行检查文字内容
    const lines = cm.kind === 'block' ? cm.text.split(/\r?\n/) : [cm.text];
    lines.forEach((raw, idx) => {
      const t = raw.replace(/^\s*\*\s?/, '').trim();
      if (!t) return;

      for (const re of LOG_PATTERNS) {
        if (re.test(t)) {
          add('定性', name, cm.line + idx, `日志式措辞：${t.slice(0, 80)}`);
          break;
        }
      }

      if (/\b(TODO|FIXME|XXX|HACK)\b/.test(t)) {
        add('定性', name, cm.line + idx, `遗留任务标记：${t.slice(0, 80)}`);
      }

      if (!CJK.test(t)) {
        const words = t.replace(/[`'"()[\]{}<>|]/g, ' ').split(/\s+/).filter((w) => /[A-Za-z]{3,}/.test(w));
        const codeish = (t.match(/[A-Za-z0-9_.\-/#()]/g) || []).length / Math.max(t.length, 1);
        if (words.length >= 4 && codeish < 0.55) {
          add('定性', name, cm.line + idx, `英文注释：${t.slice(0, 80)}`);
        }
      }
    });
  }

  /* --- 层级一致性 --- */
  const banner = [];
  const section = [];
  for (const cm of comments) {
    const body = cm.text.trim();
    if (cm.kind === 'block' && cm.raw.includes('\n')) {
      const m = body.split('\n')[0].trim().match(/^([-=─━]{2,})/);
      if (m) banner.push(m[1][0] + m[1].length);
      continue;
    }
    const m = body.match(/^([-=─━]{2,})/);
    if (m) section.push(m[1][0] + m[1].length);
  }
  const levelIssues = (list, label) => {
    if (list.length < 2) return;
    const cnt = {};
    list.forEach((s) => { cnt[s] = (cnt[s] || 0) + 1; });
    if (Object.keys(cnt).length > 1) {
      add('层级', name, 0, `${label}分隔符风格不统一：${Object.entries(cnt).map(([k, v]) => k + '×' + v).join(', ')}`);
    }
  };
  levelIssues(banner, '横幅');
  levelIssues(section, '小节标题');

  /* --- 泄漏 --- */
  if (file.endsWith('.html')) {
    const visible = src
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ');
    if (/\/\*|\*\/|<!--/.test(visible)) {
      add('泄漏', name, 0, '注释标记出现在可见文本中');
    }
  }
}

/* -------------------------------------------------------------- 输出结果 */

const kinds = ['语法', '排版', '层级', '定性', '泄漏'];
let total = 0;

for (const kind of kinds) {
  const list = problems.filter((p) => p.kind === kind);
  if (!list.length) continue;
  total += list.length;
  console.log(`\n===== ${kind}（${list.length}） =====`);
  list.slice(0, 40).forEach((p) => {
    console.log(`  ${p.file}${p.line ? ':' + p.line : ''}  ${p.detail}`);
  });
  if (list.length > 40) console.log(`  …… 其余 ${list.length - 40} 条略`);
}

console.log(total === 0 ? '\n全部检查通过 ✓' : `\n共发现 ${total} 处问题`);
process.exit(total === 0 ? 0 : 1);
