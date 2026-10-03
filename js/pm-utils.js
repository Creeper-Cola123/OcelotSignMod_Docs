

(function () {
  'use strict';

  // 全局 PM 命名空间（由 pm-state.js 首次定义，后续模块只读不重置）。
  if (typeof window.PM === 'undefined') {
    window.PM = { state: {}, fns: {} };
  }

  const TEXT_FILE_EXTS = new Set([
    'mcmeta','json','jsonc','json5','mcfunction','function','lang','properties','snbt','spl',
    'particle','animation','animation_controller','entity','attachable','renderctl','geometry','material',
    'fsh','vsh','glsl','vert','frag','tesc','tese','geom','comp','mesh','task',
    'rgen','rmiss','rchit','rahit','rint','rcall','shader',
    'toml','yml','yaml','xml','csv','tsv','ini','cfg','conf','env','reg','plist',
    'html','htm','css','js','mjs','cjs','ts','tsx','jsx','vue','svelte',
    'scss','sass','less','styl','svg','map',
    'sh','bash','zsh','fish','ps1','bat','cmd','lua','py','rb','java','kt','kts',
    'gradle','groovy','cmake','mk','dockerfile','proto','graphql','gql',
    'txt','text','md','markdown','rst','log','diff','patch'
  ]);
  const TEXT_FILE_NAMES = new Set([
    '.gitignore','.gitattributes','.gitmodules','.gitconfig','.editorconfig','.dockerignore',
    '.npmrc','.yarnrc','.pnpmrc','.babelrc','.eslintrc','.prettierrc','.prettierignore',
    '.npmignore','.htaccess','.env','.env.example','.env.local','.env.development',
    '.env.production','.env.test','Dockerfile','Dockerfile.dev','Dockerfile.prod',
    'Makefile','Gemfile','Rakefile','Procfile','Vagrantfile','Brewfile','CMakeLists.txt',
    'LICENSE','LICENSE.md','NOTICE','CHANGELOG','CHANGELOG.md','CONTRIBUTING',
    'CONTRIBUTING.md','README','README.md'
  ]);
  const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tga']);
  const FONT_EXTS = new Set(['ttf', 'otf', 'woff']);
  const RESOURCE_FILENAME_REGEX = /^[a-z0-9_.\-]+$/;
  const STRICT_RESOURCE_FILENAME_REGEX = /^[a-z0-9_]+$/;

  function isTextFile(name) {
    if (!name) return false;
    const base = name.split('/').pop();
    if (TEXT_FILE_NAMES.has(base)) return true;
    const dot = base.lastIndexOf('.');
    if (dot < 0) return false;
    const ext = base.slice(dot + 1).toLowerCase();
    return TEXT_FILE_EXTS.has(ext);
  }

  PM.fns.isTextFile = isTextFile;

  function isImageFile(name) {
    if (!name) return false;
    const dot = name.lastIndexOf('.');
    if (dot < 0) return false;
    const ext = name.slice(dot + 1).toLowerCase();
    return IMAGE_EXTS.has(ext);
  }

  PM.fns.isImageFile = isImageFile;

  function getFileType(name, path) {
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    if (path) {
      if (path.endsWith('custom_fonts.json')) return 'fontreg';
      if (path.includes('ui_definitions/')) return 'uidf';
    }
    if (['json'].includes(ext)) return 'json';
    if (['png','jpg','jpeg','gif','bmp'].includes(ext)) return 'image';
    if (['ttf','otf','woff','woff2'].includes(ext)) return 'font';
    return 'plain';
  }

  PM.fns.getFileType = getFileType;

  function getTypeIcon(type) {
    const map = { folder:'📁', uidf:'🗂', fontreg:'📑', json:'📄', image:'🖼', font:'🔤', plain:'📄' };
    return map[type] || '📄';
  }

  PM.fns.getTypeIcon = getTypeIcon;

  function detectFontExtensionFor(jsonPath) {
    if (!jsonPath || !PM.state.zip) return 'ttf';
    const slash = jsonPath.lastIndexOf('/');
    const dir = slash >= 0 ? jsonPath.slice(0, slash) : '';
    const base = slash >= 0 ? jsonPath.slice(slash + 1) : jsonPath;
    const stem = base.replace(/\.json$/i, '');
    const prefix = dir ? dir + '/' : '';
    const tryOrder = ['ttf', 'otf', 'woff', 'woff2'];
    for (const ext of tryOrder) {
      const candidate = prefix + stem + '.' + ext;
      if (PM.state.fileMap[candidate] !== undefined && PM.state.fileMap[candidate] !== null) return ext;
    }
    // 同目录无同名：扫描目录内任意字体，取优先级最高的扩展名
    if (dir) {
      let best = null;
      for (const ext of tryOrder) {
        for (const p of Object.keys(PM.state.fileMap)) {
          if (p.startsWith(prefix) && p.toLowerCase().endsWith('.' + ext)) {
            if (p.indexOf('/', prefix.length) === -1) return ext; // 直接子级
          }
        }
      }
    }
    return 'ttf';
  }

  PM.fns.detectFontExtensionFor = detectFontExtensionFor;

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '_').replace(/^_|_$/g, '') || 'category';
  }

  PM.fns.slugify = slugify;

  function escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  PM.fns.escapeHtml = escapeHtml;

  function revokeAndRemoveCache(path) {
    if (PM.state.imageUrlCache.has(path)) {
      try { URL.revokeObjectURL(PM.state.imageUrlCache.get(path)); } catch (_) {}
      PM.state.imageUrlCache.delete(path);
    }
  }

  PM.fns.revokeAndRemoveCache = revokeAndRemoveCache;

  function revokeAndClearAllCache() {
    PM.state.imageUrlCache.forEach(url => { try { URL.revokeObjectURL(url); } catch (_) {} });
    PM.state.imageUrlCache.clear();
  }

  PM.fns.revokeAndClearAllCache = revokeAndClearAllCache;

  function showToast(msg, type = 'success') {
    const t = $('toast');
    $('toastMsg').textContent = msg;
    // 支持 warn 类型（介于错误与成功之间）。
    t.className = 'toast ' + (type === 'error' ? 'error' : (type === 'warn' ? 'warn' : 'success'));
    t.classList.add('show');
    // 取消上一次的自动隐藏计时器，避免连续多个 toast 时
    // 刚弹出的就被立即收回。
    if (PM.state.toastTimeoutId) clearTimeout(PM.state.toastTimeoutId);
    PM.state.toastTimeoutId = setTimeout(() => {
      t.classList.remove('show');
      PM.state.toastTimeoutId = null;
    }, 3000);
  }

  PM.fns.showToast = showToast;

  function $(id) { return document.getElementById(id); }

  PM.fns.$ = $;

  PM.fns.STRICT_RESOURCE_FILENAME_REGEX = STRICT_RESOURCE_FILENAME_REGEX;

})();
