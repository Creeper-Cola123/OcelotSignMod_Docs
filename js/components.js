(function () {
  'use strict';

  // ── 工具方法 ────────────────────────────────────────────────────────────────

  /**
   * 从本脚本自身的位置推断站点对应的 URL 前缀。
   *   本地开发：脚本位于 /js/components.js            → 返回 "/"
   *   Pages 子路径：脚本位于 /<repo>/js/components.js → 返回 "/<repo>/"
   *   自定义域名 / 用户页：行为与本地相同            → 返回 "/"
   * 有了这个前缀，就可以把 window.location.pathname 还原为"相对站点根"
   * 的路径，下游的 currentDir()、componentsBase()、langPathMap() 等
   * 才能在 GitHub Pages 子路径托管下也输出正确结果。
   */
  function detectSiteBase() {
    var script = document.currentScript;
    if (!script) {
      // 兜底：反向查找带 components.js 的 <script>
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        var s = scripts[i];
        if (s.src && s.src.indexOf('components.js') !== -1) {
          script = s;
          break;
        }
      }
    }
    if (!script || !script.src) return '/';
    try {
      var url = new URL(script.src);
      var segs = url.pathname.split('/').filter(Boolean);
      // 去掉末尾的 "components.js" 与 "js"
      segs.pop();
      segs.pop();
      if (segs.length === 0) return '/';
      return '/' + segs.join('/') + '/';
    } catch (e) {
      return '/';
    }
  }

  var SITE_BASE = detectSiteBase();

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** 去除首尾斜杠，解析 '..' 段。 */
  function normalisePath(raw) {
    if (!raw) return '';
    const segs = raw.replace(/^\//, '').replace(/\/$/, '').split('/').filter(Boolean);
    const out = [];
    for (const s of segs) {
      if (s === '..') { out.pop(); continue; }
      if (s !== '.') out.push(s);
    }
    return out.join('/');
  }

  /**
   * 返回当前页面相对站点根的路径（不带前导斜杠）。
   *   本地 /guide/sign-usage.html                  → "guide/sign-usage.html"
   *   Pages /<repo>/guide/sign-usage.html          → "guide/sign-usage.html"
   * 这样下游 currentDir() / componentsBase() 等不必再关心 repo 名前缀。
   */
  function getCurrentPath() {
    var fullPath = window.location.pathname;
    var relPath = fullPath;
    if (SITE_BASE !== '/' && fullPath.indexOf(SITE_BASE) === 0) {
      relPath = fullPath.substring(SITE_BASE.length);
    }
    return normalisePath(relPath);
  }

  function detectLang() {
    const p = getCurrentPath();
    return p === 'en' || p.startsWith('en/') ? 'en' : 'zh';
  }

  // ── 页面目录 ──────────────────────────────────────────────────────────────
  // 列出站内每个页面的中英文 URL。语言切换器读取该映射，将中英文链接
  // 改写为当前页面对应的等价路径（或合理的回退）。

  const PAGE_CATALOGUE = [
    // 站点根级别的页面
    { zh: 'index.html',                          en: 'en/index.html' },
    { zh: 'tool-packmaker.html',                 en: 'en/tool-packmaker.html' },
    // 文档页
    { zh: 'guide/sign-usage.html',               en: 'en/guide/sign-usage.html' },
    { zh: 'guide/resource-pack.html',            en: 'en/guide/resource-pack.html' },
    { zh: 'guide/rare-traffic-signs.html',       en: 'en/guide/rare-traffic-signs.html' },
    { zh: 'guide/credits-license.html',          en: 'en/guide/credits-license.html' },
    { zh: 'guide/disclaimer-faq.html',           en: 'en/guide/disclaimer-faq.html' },
    { zh: 'guide/friends-links.html',            en: 'en/guide/friends-links.html' },
    // 创意广场
    { zh: 'guide/plaza/creative-plaza.html',     en: 'en/guide/plaza/creative-plaza.html' },
    { zh: 'guide/plaza/plaza-submit.html',       en: 'en/guide/plaza/plaza-submit.html' },
    { zh: 'guide/plaza/plaza-report.html',       en: 'en/guide/plaza/plaza-report.html' },
    { zh: 'guide/plaza/plaza-terms.html',        en: 'en/guide/plaza/plaza-terms.html' },
    { zh: 'guide/plaza/road/1.html',             en: 'en/guide/plaza/road/1.html' },
    { zh: 'guide/plaza/road/2.html',             en: 'en/guide/plaza/road/2.html' },
    { zh: 'guide/plaza/mod_optimization/1.html', en: 'en/guide/plaza/mod_optimization/1.html' },
  ];

  // 切换语言时需要保留的 hash 锚点（#downloads、#feedback、#faq），
  // 确保用户落地到同一区域。
  const ANCHOR_TARGETS = new Set(['downloads', 'feedback', 'faq']);

  /** 将规范化后的路径段映射为 { zh, en } 路径，若未知则返回 null。 */
  function langPathMap(path) {
    if (!path) return null;
    // 去掉 hash 片段，便于 /guide/disclaimer-faq.html#faq 也能匹配
    const cleanPath = path.split('#')[0];
    // 先按精确路径匹配，再去掉前导 "en/" 后尝试一次
    const candidates = [cleanPath, cleanPath.replace(/^en\//, '')];
    for (const candidate of candidates) {
      const hit = PAGE_CATALOGUE.find(p => p.zh === candidate || p.en === candidate);
      if (hit) return { zh: hit.zh, en: hit.en, hash: path.includes('#') ? path.split('#')[1] : null };
    }
    return null;
  }

  // 给定当前页面所在目录（在 guide/sign-usage.html 时是 'guide/'，在
  // en/guide/sign-usage.html 时是 'en/guide/'，在 index.html 时是 ''），
  // 将目标页面解析为可用的 href。
  function resolvePageHref(targetRelativePath, currentDir) {
    if (!targetRelativePath) return '#';
    const curSegs = currentDir.split('/').filter(Boolean);
    const tgtSegs = targetRelativePath.split('/').filter(Boolean);

    let i = 0;
    while (i < curSegs.length && i < tgtSegs.length && curSegs[i] === tgtSegs[i]) i++;

    const ups = curSegs.length - i;
    const downs = tgtSegs.slice(i);

    const parts = [];
    for (let k = 0; k < ups; k++) parts.push('..');
    parts.push(...downs);
    return parts.join('/') || '.';
  }

  /** 通过 fetch 注入 HTML 片段，完成后调用 onInjected(elt)。
   *  失败时不再只是 console.warn，而是直接暴露在 target 上，
   *  并保留 onInjected 钩子的调用，让调用方可以做降级处理。 */
  function loadFragment(src, targetSel, onInjected) {
    const target = document.querySelector(targetSel);
    if (!target) return;
    fetch(src, { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(src + ' HTTP ' + r.status); return r.text(); })
      .then(html => {
        target.innerHTML = html;
        if (typeof onInjected === 'function') onInjected(target, null);
      })
      .catch(err => {
        // 把错误信息暴露在容器里，方便用户反馈
        console.error('[components.js] failed to load', src, err);
        target.classList.add('site-header-load-error');
        target.innerHTML =
          '<div class="site-header-error" role="alert">' +
          '顶部菜单加载失败 (' + (err && err.message ? err.message : '未知错误') + ')。' +
          '请刷新页面或检查网络。</div>';
        if (typeof onInjected === 'function') onInjected(target, err);
      });
  }

  // ── 组件链接改写 ──────────────────────────────────────────────────────────
  // 组件存放在 <root>/components/*.html，但会被注入到不同层级的页面中
  // （index.html、guide/sign-usage.html、en/index.html、en/guide/sign-usage.html 等）。
  // 组件 HTML 内部书写的链接（如 guide/sign-usage.html、download.html#download）
  // 是相对于站点根的。如果不处理，浏览器会按当前页面目录解析这些链接，
  // 在深度 ≥1 的页面上就会失效。
  //
  // rewriteComponentLinks 遍历注入元素内的每个 <a href>，先把 href 规范化
  // （折叠前导 ../ 段），再依据当前页面重新派生出相对路径。
  // 哈希片段会保留。
  //
  // 语言切换链接（.lang-switcher a）会被跳过——它们由 initLangSwitcher()
  // 通过 PAGE_CATALOGUE 单独处理。

  function rewriteComponentLinks(container) {
    if (!container) return;
    const dir = currentDir();                              // '', 'guide/', 'en/', 'en/guide/'
    const curSegs = dir.split('/').filter(Boolean);

    container.querySelectorAll('a[href]').forEach(a => {
      // 跳过语言切换器——由 PAGE_CATALOGUE 单独管理
      if (a.closest('.lang-switcher')) return;

      const raw = a.getAttribute('href');
      if (!raw) return;
      // 跳过片段、外部链接与协议类型
      if (raw.startsWith('#')) return;
      if (/^(https?:|mailto:|tel:|javascript:)/i.test(raw)) return;

      // 分离 hash 片段以便后续重新拼接
      let hash = '';
      let body = raw;
      const hashIdx = raw.indexOf('#');
      if (hashIdx !== -1) {
        body = raw.substring(0, hashIdx);
        hash = raw.substring(hashIdx);                     // 保留 '#'
      }
      // 解析步骤先剥离查询字符串（结果里再拼回）
      let query = '';
      const qIdx = body.indexOf('?');
      if (qIdx !== -1) {
        query = body.substring(qIdx);
        body = body.substring(0, qIdx);
      }
      // 剥离后 body 为空 → 同目录片段，无需改写
      if (body === '') return;

      // 去掉前导 '/'，将根路径（如 /guide/sign-usage.html）视作
      // 相对于项目根的路径，与 rewriteComponentLinks 文档约定一致。
      // 没有这一步时，前导 '/' 会在 split('/') 后变成空字符串段，
      // 导致下面的 curSegs[i] === normSegs[i] 比较出错
      // （normSegs[0] 会变成 '' 而不是真实的段名）。
      if (body.startsWith('/')) body = body.substring(1);

      // 规范化 `..` 与 `.` 段，把 ../guide/sign-usage.html（英文组件中
      // 这样写）折叠为 guide/sign-usage.html（相对于根的目标）。
      const segs = body.split('/');
      const normSegs = [];
      for (const s of segs) {
        if (s === '' || s === '.') continue;
        if (s === '..') normSegs.pop();
        else normSegs.push(s);
      }

      // 计算从 dir 到规范化后根相对目标的路径
      let i = 0;
      while (i < curSegs.length && i < normSegs.length && curSegs[i] === normSegs[i]) i++;
      const ups   = curSegs.length - i;
      const downs = normSegs.slice(i);
      const parts = [];
      for (let k = 0; k < ups; k++) parts.push('..');
      parts.push(...downs);
      const resolved = parts.join('/') || '.';

      a.setAttribute('href', resolved + query + hash);
    });
  }

  // ── 语言切换器 ───────────────────────────────────────────────────────────

  function currentDir() {
    const p = getCurrentPath();
    const idx = p.lastIndexOf('/');
    return idx === -1 ? '' : p.slice(0, idx + 1);
  }

  /**
   * 计算当前页面到项目根下 components/ 目录的相对路径。
   * 本脚本固定位于 <root>/js/components.js，组件目录固定位于
   * <root>/components/，唯一的变量就是当前页面的深度。
   *
   * 示例：
   *   page = 'index.html'                   → 'components/'
   *   page = 'guide/sign-usage.html'       → '../components/'
   *   page = 'en/index.html'               → '../components/'
   *   page = 'en/guide/sign-usage.html'    → '../../components/'
   */
  function componentsBase() {
    const dir = currentDir();                              // '', 'guide/', 'en/', 'en/guide/'
    const depth = dir.split('/').filter(Boolean).length;
    return '../'.repeat(depth) + 'components/';
  }

  /**
   * 解析单个语言切换链接的 href。
   * 总是返回某个 href（若 PAGE_CATALOGUE 中没有记录则回退到现有 href）。
   */
  function langLinkHref(link, curMap, cur, curLang, dir) {
    const isZh = link.dataset.lang === 'zh';
    let targetRelative;
    if (curMap) {
      targetRelative = isZh ? curMap.zh : curMap.en;
    } else {
      // 未识别的页面——通过去掉或加上 /en/ 前缀回退到根
      if (isZh) {
        targetRelative = cur.replace(/^en\//, '') || 'index.html';
      } else {
        targetRelative = cur.startsWith('en/') ? cur : 'en/' + cur;
      }
    }
    const resolved = resolvePageHref(targetRelative, dir);
    // 若当前 URL 带有 hash 锚点且属于白名单，保留锚点
    if (curMap && curMap.hash && ANCHOR_TARGETS.has(curMap.hash)) {
      return resolved + '#' + curMap.hash;
    }
    return resolved;
  }

  function initLangSwitcher() {
    const cur = getCurrentPath();
    const curLang = detectLang();
    // 当前页面的 hash 片段需要参与匹配，才能在切换语言时保留锚点。
    const curWithHash = cur + (window.location.hash || '');
    const curMap = langPathMap(curWithHash);
    const dir = currentDir();

    document.querySelectorAll('.lang-switcher .lang').forEach(link => {
      const isZh = link.dataset.lang === 'zh';
      link.href = langLinkHref(link, curMap, cur, curLang, dir);
      if (isZh === (curLang === 'zh')) link.classList.add('active');
      else link.classList.remove('active');
    });
  }

  // ── 导航高亮 ────────────────────────────────────────────────────────────────

  /** 拉高导航中链接 href（相对当前目录）解析为当前路径的项。 */
  function initNavActive() {
    const cur = getCurrentPath();
    const dir = currentDir();
    const siteNav = document.querySelector('.site-nav, .nav');
    if (!siteNav) return;
    siteNav.querySelectorAll('a[data-key]').forEach(link => {
      const hrefRaw = link.getAttribute('href');
      if (!hrefRaw || hrefRaw.startsWith('#') || hrefRaw.startsWith('http')) return;

      let hrefAbs;
      if (hrefRaw.startsWith('/')) {
        // 站点根相对路径：去掉前导斜杠后即"相对站点根"的路径，
        // 与 getCurrentPath() 语义一致，可直接比较。
        hrefAbs = normalisePath(hrefRaw);
      } else {
        // 深度相对路径：相对当前目录解析
        hrefAbs = normalisePath(((dir ? dir + '/' : '') + hrefRaw).replace(/^\//, ''));
      }
      if (hrefAbs === cur) link.classList.add('active');
    });
  }

  // ── 汉堡按钮 / 导航抽屉（共享） ────────────────────────────────────────────

  function initHamburger() {
    const toggle = document.querySelector('.nav-toggle');
    const nav    = document.querySelector('.site-nav, .nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      nav.classList.toggle('open');
    });

    // 点击普通导航链接时关闭抽屉。
    // 下拉项也会关闭抽屉，方便用户看到新页面。
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        nav.classList.remove('open');
        // 同时收起所有打开的下拉组
        nav.querySelectorAll('.nav-group.open').forEach(g => g.classList.remove('open'));
      });
    });

    // 下拉组切换（如"下载与反馈"）
    const groups = nav.querySelectorAll('.nav-group');
    groups.forEach(group => {
      const trigger = group.querySelector('.nav-group-trigger');
      if (!trigger) return;
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const wasOpen = group.classList.contains('open');
        groups.forEach(g => g.classList.remove('open'));
        if (!wasOpen) group.classList.add('open');
        trigger.setAttribute('aria-expanded', (!wasOpen).toString());
      });
    });

    // 点击导航外区域时关闭打开的下拉
    document.addEventListener('click', (ev) => {
      if (!nav.contains(ev.target)) {
        groups.forEach(g => g.classList.remove('open'));
      }
    });

    // 按 Esc 关闭所有打开的下拉
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        groups.forEach(g => g.classList.remove('open'));
        toggle.classList.remove('active');
        nav.classList.remove('open');
      }
    });
  }

  // ── 页头高度 ────────────────────────────────────────────────────────────
  // 测量共享页头的实际渲染高度，并以 --site-header-height CSS 变量
  // 发布到根元素。需要填满"视口减去页头"空间的布局（如 .hero）会读取该变量。

  function syncHeaderHeightVar() {
    const header = document.querySelector('.site-header, .header');
    if (!header) return;
    let last = null;
    const apply = () => {
      // 向上取整而非四舍五入：预留空间必须始终 ≥ 页头实际高度，
      // 否则亚像素误差（如 83.4px 被舍成 83px）会让页头边缘压住内容。
      const h = Math.ceil(header.getBoundingClientRect().height);
      const value = h + 'px';
      document.documentElement.style.setProperty('--site-header-height', value);
      // 高度变化时派发事件，让依赖该值的 JS（如 js/page-toc.js
      // 的锚点滚动与章节高亮）能立即按新高度重新计算。
      // 仅在值真正变化时派发，避免 resize 期间的事件风暴。
      if (value !== last) {
        last = value;
        document.dispatchEvent(new CustomEvent('siteheaderheightchange', {
          detail: { height: h }
        }));
      }
    };
    apply();
    window.addEventListener('resize', apply, { passive: true });
  }

  // ── 回到顶部 ────────────────────────────────────────────────────────────

  function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    const onScroll = () => {
      btn.classList.toggle('show', window.scrollY > 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ── 桌面侧栏视口布局 ──────────────────────────────────────────────────────

  function initFixedSidebar() {
    const container = document.getElementById('site-sidebar');
    const main = container?.closest('.main-container');
    if (!container || !main) return;

    const apply = () => {
      const shouldFix = window.innerWidth > 768;

      if (shouldFix) {
        // 固定定位会脱离 Flex 文档流，按当前断点的实际宽度为正文保留空间。
        main.style.setProperty('--site-sidebar-width', container.getBoundingClientRect().width + 'px');
      } else {
        main.style.removeProperty('--site-sidebar-width');
      }
      container.classList.toggle('is-viewport-fixed', shouldFix);
      main.classList.toggle('has-fixed-sidebar', shouldFix);
    };

    apply();
    window.addEventListener('resize', apply, { passive: true });
  }

  // ── 移动端侧边栏抽屉（文档页） ────────────────────────────────────────────

  function initMobileSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar    = document.querySelector('.site-sidebar, .sidebar');
    const overlay    = document.getElementById('overlay');

    if (!sidebar) return;

    function openSidebar() {
      sidebar.classList.add('open');
      overlay?.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay?.classList.remove('show');
      document.body.style.overflow = '';
    }

    menuToggle?.addEventListener('click', () => {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    overlay?.addEventListener('click', closeSidebar);

    // 按当前路径高亮活动侧边栏项
    const cur = getCurrentPath();
    const dir = currentDir();
    sidebar.querySelectorAll('.sidebar-item, a[data-key]').forEach(item => {
      const hrefRaw = item.getAttribute('href');
      if (!hrefRaw || hrefRaw.startsWith('#') || hrefRaw.startsWith('http')) return;

      let hrefAbs;
      if (hrefRaw.startsWith('/')) {
        // 站点根相对路径：与 getCurrentPath() 语义一致
        hrefAbs = normalisePath(hrefRaw);
      } else {
        // 深度相对路径：相对当前目录解析
        hrefAbs = normalisePath(((dir ? dir + '/' : '') + hrefRaw).replace(/^\//, ''));
      }
      if (hrefAbs === cur) item.classList.add('active');
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeSidebar();
      });
    });
  }

  // ── matchMedia 变化钩子（移动端 ↔ 桌面端导航状态） ─────────────────────────

  window.MatchMedia = {
    listeners: [],
    init() {
      const mq = window.matchMedia('(max-width: 768px)');
      const fire = (e) => this.listeners.forEach(fn => fn(e.matches));
      mq.addEventListener('change', fire);
      fire(mq.matches); // 初始化
    },
    onChange(fn) { this.listeners.push(fn); }
  };

  window.MatchMedia.init();

  // ── 代码块复制按钮 ──────────────────────────────────────────────────────

  // 组件脚本在多数页面上独立加载（不引入 i18n.js），
  // 因此这里按当前页面的语言提供本地文案。
  const COPY_LABELS = {
    zh: { copy: '复制', copied: '已复制', copyCode: '复制代码' },
    en: { copy: 'Copy', copied: 'Copied', copyCode: 'Copy code' }
  };

  // 灯箱控件的无障碍文案。英文页面必须使用英文标注，
  // 否则读屏软件会在英文站点上朗读中文按钮名。
  const LIGHTBOX_LABELS = {
    zh: { close: '关闭', prev: '上一张', next: '下一张' },
    en: { close: 'Close', prev: 'Previous image', next: 'Next image' }
  };

  function initCopyButtons() {
    const labels = COPY_LABELS[detectLang()] || COPY_LABELS.zh;

    document.querySelectorAll('.content pre').forEach(pre => {
      // 幂等保护：页头片段加载完成时可能再次触发初始化，
      // 已附加复制按钮的代码块不再重复添加。
      if (pre.dataset.copyBtnReady) return;
      pre.dataset.copyBtnReady = '1';

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = labels.copy;
      btn.setAttribute('aria-label', labels.copyCode);

      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code');
        const text = code ? code.innerText : pre.innerText;

        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = labels.copied;
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = labels.copy;
            btn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.warn('[components.js] 复制失败:', err);
        }
      });

      pre.appendChild(btn);
    });
  }

  // ── 图片画廊灯箱 ────────────────────────────────────────────────────────────

  function initLightbox() {
    if (document.querySelector('.lightbox')) return;

    // 只有页面中存在图片画廊时才需要灯箱。没有画廊的页面不应注入
    // 这套 DOM 与全局监听器。
    if (!document.querySelector('.image-gallery figure')) return;

    const labels = LIGHTBOX_LABELS[detectLang()] || LIGHTBOX_LABELS.zh;

    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <span class="lightbox-counter"></span>
      <button class="lightbox-close" aria-label="${escapeHtml(labels.close)}">×</button>
      <button class="lightbox-prev" aria-label="${escapeHtml(labels.prev)}">‹</button>
      <div class="lightbox-content">
        <img class="lightbox-img" alt="">
        <p class="lightbox-caption"></p>
      </div>
      <button class="lightbox-next" aria-label="${escapeHtml(labels.next)}">›</button>
    `;
    document.body.appendChild(lightbox);

    const img = lightbox.querySelector('.lightbox-img');
    const caption = lightbox.querySelector('.lightbox-caption');
    const counter = lightbox.querySelector('.lightbox-counter');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    let currentImages = [];
    let currentIndex = 0;

    // 缩放状态
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    const MIN_SCALE = 1;
    const MAX_SCALE = 5;
    const ZOOM_FACTOR = 0.15;

    function resetZoom() {
      scale = 1;
      translateX = 0;
      translateY = 0;
      updateImageTransform();
    }

    function clampTranslate() {
      if (scale <= 1) {
        translateX = 0;
        translateY = 0;
        return;
      }
      const rect = img.getBoundingClientRect();
      const maxX = Math.max(0, (rect.width * scale - rect.width) / 2);
      const maxY = Math.max(0, (rect.height * scale - rect.height) / 2);
      translateX = Math.max(-maxX, Math.min(maxX, translateX));
      translateY = Math.max(-maxY, Math.min(maxY, translateY));
    }

    function updateImageTransform() {
      img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      img.style.transformOrigin = 'center center';
      if (scale > 1) {
        img.style.cursor = isDragging ? 'grabbing' : 'grab';
      } else {
        img.style.cursor = 'zoom-in';
      }
    }

    function showImage(index) {
      if (index < 0) index = currentImages.length - 1;
      if (index >= currentImages.length) index = 0;
      currentIndex = index;

      const figure = currentImages[index];
      img.src = figure.dataset.fullSrc || figure.querySelector('img').src;
      img.alt = figure.querySelector('img').alt;
      caption.textContent = figure.querySelector('figcaption')?.textContent || '';
      counter.textContent = `${currentIndex + 1} / ${currentImages.length}`;

      prevBtn.style.display = currentImages.length > 1 ? 'block' : 'none';
      nextBtn.style.display = currentImages.length > 1 ? 'block' : 'none';

      // 切换图片时重置缩放
      resetZoom();
    }

    function openLightbox(galleryEl, figureEl) {
      currentImages = Array.from(galleryEl.querySelectorAll('figure'));
      currentIndex = currentImages.indexOf(figureEl);
      showImage(currentIndex);
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      resetZoom();
    }

    // 点击 figure 打开灯箱
    document.querySelectorAll('.image-gallery figure').forEach(figure => {
      figure.addEventListener('click', () => {
        const gallery = figure.closest('.image-gallery');
        openLightbox(gallery, figure);
      });
    });

    // 关闭按钮
    closeBtn.addEventListener('click', closeLightbox);

    // 上下张导航
    prevBtn.addEventListener('click', () => showImage(currentIndex - 1));
    nextBtn.addEventListener('click', () => showImage(currentIndex + 1));

    // 点击图片外区域关闭
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    // 鼠标滚轮缩放
    lightbox.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_FACTOR : ZOOM_FACTOR;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));

      if (newScale === scale) return;

      // 缩放到鼠标位置
      if (scale > 1) {
        const rect = img.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        translateX -= mouseX * (newScale / scale - 1);
        translateY -= mouseY * (newScale / scale - 1);
      }

      scale = newScale;
      clampTranslate();
      updateImageTransform();
    }, { passive: false });

    // 缩放后可鼠标拖动平移
    img.addEventListener('mousedown', (e) => {
      if (scale > 1) {
        isDragging = true;
        dragStartX = e.clientX - translateX;
        dragStartY = e.clientY - translateY;
        updateImageTransform();
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        translateX = e.clientX - dragStartX;
        translateY = e.clientY - dragStartY;
        clampTranslate();
        updateImageTransform();
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      updateImageTransform();
    });

    // 双击切换缩放
    img.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (scale > 1) {
        resetZoom();
      } else {
        scale = 2;
        updateImageTransform();
      }
    });

    // 阻止图片拖拽
    img.addEventListener('dragstart', (e) => e.preventDefault());

    // 键盘导航
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
      if (e.key === 'ArrowRight') showImage(currentIndex + 1);
      if (e.key === '0') resetZoom();
    });
  }

  // ── 启动 ──────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    const hasHeader  = !!document.querySelector('#site-header');
    const hasSidebar = !!document.querySelector('#site-sidebar');

    if (hasHeader) {
      // 确定主题与语言组合。
      // 解析顺序：先主题（light → 无后缀，dark → "-dark"），
      // 再语言（zh → 无前缀，en → "-en"）。两者合并成一个页头文件：
      //   header.html / header-dark.html / header-en.html / header-en-dark.html（中文文件）
      const theme = document.body.dataset.theme || 'light';
      const lang  = detectLang();
      const themeSuffix = theme !== 'light' ? '-' + theme : '';
      const langPrefix  = lang === 'en' ? '-' + lang : '';
      const base = componentsBase();
      const headerSrc = `${base}header${langPrefix}${themeSuffix}.html`;
      loadFragment(headerSrc, '#site-header', (target) => {
        rewriteComponentLinks(target);
        initLangSwitcher();
        initNavActive();
        initHamburger();
        // 发布真实的页头高度，让 .hero（或未来其它"全屏减去页头"布局）
        // 能精确计算自身尺寸。
        syncHeaderHeightVar();
      });
    }

    if (hasSidebar) {
      // 根据当前语言加载对应的侧边栏
      const lang = detectLang();
      const base = componentsBase();
      const src = `${base}${lang === 'en' ? 'sidebar-en.html' : 'sidebar.html'}`;
      loadFragment(src, '#site-sidebar', (target) => {
        rewriteComponentLinks(target);
        initMobileSidebar();
        initFixedSidebar();
      });
    }

    // 直接在 HTML 中嵌入页头的页面（无片段加载）仍需要发布高度变量。
    if (!hasHeader && document.querySelector('.site-header, .header')) {
      syncHeaderHeightVar();
    }

    initBackToTop();
    initCopyButtons();
    initLightbox();
  });
})();
