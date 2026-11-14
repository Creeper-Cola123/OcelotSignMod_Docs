/**
 * page-toc.js —— 文档页的页内目录（TOC）与宽表格滚动处理。
 */
(function () {
    'use strict';

    // ── 页头高度 ────────────────────────────────────────────────────────────
    // 共享页头是 position: fixed，会浮在内容之上。目录的锚点滚动与
    // 「当前章节」高亮判定都必须避让它，因此两者都要知道页头有多高。
    //
    // --site-header-height 由 js/components.js 在注入页头后测量并发布到
    // 根元素，并在 resize 时重新测量。变量尚未就绪时（JS 失效或页头
    // 片段加载失败）退回 62px —— 即页头在桌面端的常规高度。

    var FALLBACK_HEADER_HEIGHT = 62;

    // 标题与页头下沿之间保留的呼吸空间。取值使页头为 62px 时
    // 总偏移仍为 80px，与旧版硬编码值的行为保持一致。
    var EXTRA_GAP = 18;

    function headerHeight() {
        var raw = getComputedStyle(document.documentElement)
            .getPropertyValue('--site-header-height');
        var h = parseFloat(raw);
        return h > 0 ? h : FALLBACK_HEADER_HEIGHT;
    }

    /** 锚点滚动与高亮判定共用的偏移量 = 页头高度 + 呼吸空间。 */
    function headerOffset() {
        return headerHeight() + EXTRA_GAP;
    }

    // ── 宽表格横向滚动 ──────────────────────────────────────────────────────
    // 为 .content-inner 内的每个表格套上 `.table-scroll` 容器，
    // 使宽表格在窄屏上可以横向滚动，而不会撑宽整个页面。
    // 该操作是幂等的 —— 已经位于此类容器内的表格会被跳过。

    function wrapTables() {
        var tables = document.querySelectorAll('.content-inner > table');
        Array.prototype.forEach.call(tables, function (table) {
            var parent = table.parentNode;
            if (parent && parent.classList && parent.classList.contains('table-scroll')) return;
            var wrapper = document.createElement('div');
            wrapper.className = 'table-scroll';
            parent.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }

    wrapTables();

    // ── 目录 ────────────────────────────────────────────────────────────────

    var nav = document.getElementById('pageTocNav');
    var content = document.querySelector('.content-inner') || document.querySelector('.content');
    if (!nav || !content) return;

    var headings = content.querySelectorAll('h1, h2, h3');
    if (!headings.length) return;

    // 为尚未拥有 id 的标题补上稳定的 id。
    var slugify = function (s) {
        return s.toLowerCase()
            .replace(/[^\p{L}\p{N}\s-]/gu, '')
            .trim()
            .replace(/\s+/g, '-')
            .slice(0, 60) || 'section';
    };

    var usedIds = {};
    Array.prototype.forEach.call(headings, function (h) {
        if (!h.id) {
            var base = slugify(h.textContent);
            var id = base;
            var i = 2;
            while (usedIds[id] || document.getElementById(id)) {
                id = base + '-' + i++;
            }
            h.id = id;
        }
        usedIds[h.id] = true;
    });

    // 构建嵌套列表。栈底的帧始终是根 <ul>；每次 push 都会给新的
    // <li> 追加一个子级 <ul>，使更深的标题嵌套其中。
    var root = document.createElement('ul');
    var stack = [{ level: 0, list: root }];

    Array.prototype.forEach.call(headings, function (h) {
        var level = parseInt(h.tagName.charAt(1), 10);
        // 弹出层级 >= 当前标题层级的栈帧，从而回到正确的祖先节点。
        // 栈底（层级 0）永远不会被弹出，因为 0 小于任何标题层级。
        while (stack[stack.length - 1].level >= level) {
            stack.pop();
        }
        var parentList = stack[stack.length - 1].list;
        var li = document.createElement('li');
        li.className = 'toc-h' + level;
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        a.dataset.targetId = h.id;
        li.appendChild(a);
        parentList.appendChild(li);
        // 每个 li 都拥有自己的子列表，用于容纳嵌套的更深层标题。
        var childList = document.createElement('ul');
        li.appendChild(childList);
        stack.push({ level: level, list: childList });
    });

    nav.appendChild(root);

    var links = nav.querySelectorAll('a');
    var lastHeading = headings[headings.length - 1];
    var linkByHeading = {};
    Array.prototype.forEach.call(headings, function (h) {
        var link = nav.querySelector('a[data-target-id="' + h.id + '"]');
        if (link) linkByHeading[h.id] = { link: link, heading: h };
    });

    // 目录面板自身是滚动容器（.page-toc 带 overflow-y: auto）。
    // 条目数量超过面板高度时，仅切换高亮并不能让选中项进入视口，
    // 底部条目会停留在面板可视区域之外。这里以面板的 padding 边界
    // 为可视范围，只在选中项被裁切时滚动必要距离，避免每次高亮
    // 都把面板拉回顶部。
    var tocPanel = nav.closest('.page-toc') || nav;

    var revealLink = function (link) {
        // 窄屏下页面目录整体隐藏，无需也无可滚动区域。
        if (!tocPanel.clientHeight) return;
        var style = getComputedStyle(tocPanel);
        var panelRect = tocPanel.getBoundingClientRect();
        var viewTop = panelRect.top + (parseFloat(style.paddingTop) || 0);
        var viewBottom = panelRect.bottom - (parseFloat(style.paddingBottom) || 0);
        var linkRect = link.getBoundingClientRect();
        if (linkRect.top < viewTop) {
            tocPanel.scrollTop -= viewTop - linkRect.top;
        } else if (linkRect.bottom > viewBottom) {
            tocPanel.scrollTop += linkRect.bottom - viewBottom;
        }
    };

    var setActive = function (id) {
        var active = (id && linkByHeading[id]) ? linkByHeading[id].link : null;
        Array.prototype.forEach.call(links, function (a) {
            a.classList.toggle('is-active', a === active);
        });
        if (active) revealLink(active);
    };

    // 点击处理——平滑滚动到目标位置，再更新 URL 而不产生跳转。
    //
    // 点击后到滚动结束之间，IntersectionObserver 会按途中经过的标题
    // 反复改写高亮，目录会先跳到别处再回来。这里用 pinnedId 锁定
    // 被点条目，页面抵达预期位置（或文末）后再交还给 observer。
    var pinnedId = null;
    var pinnedTop = 0;

    var isAtBottom = function () {
        var doc = document.documentElement;
        return doc.scrollHeight > window.innerHeight + 2 &&
            window.innerHeight + window.pageYOffset >= doc.scrollHeight - 2;
    };

    Array.prototype.forEach.call(links, function (a) {
        a.addEventListener('click', function (e) {
            var target = document.getElementById(a.dataset.targetId);
            if (!target) return;
            e.preventDefault();
            // 每次点击都重新读取 —— 此时页头高度可能已随窗口变化。
            var offset = headerOffset();
            var maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            // 目标靠近文末时滚动位置只能到 maxTop，按实际可达位置计算，
            // 否则 pinnedId 永远等不到滚动到位，高亮会一直锁死。
            var top = Math.min(
                Math.max(target.getBoundingClientRect().top + window.pageYOffset - offset, 0),
                maxTop
            );
            var willScroll = Math.abs(top - window.pageYOffset) > 1;
            pinnedId = willScroll ? a.dataset.targetId : null;
            pinnedTop = top;
            window.scrollTo({ top: top, behavior: willScroll ? 'smooth' : 'auto' });
            setActive(a.dataset.targetId);
            history.replaceState(null, '', '#' + a.dataset.targetId);
        });
    });

    window.addEventListener('scroll', function () {
        if (pinnedId && (isAtBottom() || Math.abs(window.pageYOffset - pinnedTop) <= 1)) {
            pinnedId = null;
        }
    }, { passive: true });

    // 高亮最接近视口顶部的标题。
    var visibleHeadings = [];

    var onEntries = function (entries) {
        entries.forEach(function (entry) {
            var id = entry.target.id;
            var idx = visibleHeadings.findIndex(function (v) { return v.id === id; });
            if (entry.isIntersecting) {
                if (idx === -1) visibleHeadings.push({ id: id, top: entry.boundingClientRect.top });
                else visibleHeadings[idx].top = entry.boundingClientRect.top;
            } else if (idx !== -1) {
                visibleHeadings.splice(idx, 1);
            }
        });

        // 页面到底部时，最后一个标题往往停在观察区下沿之外
        // （rootMargin 底部为 -55%），observer 永远不会选中它，
        // 底部的目录项因此无法被聚焦。此处直接以最后一个标题为准。
        if (isAtBottom()) {
            pinnedId = null;
            setActive(lastHeading.id);
            return;
        }

        // 点击触发的平滑滚动尚未结束，保留点击项。
        if (pinnedId) return;

        if (!visibleHeadings.length) return;
        visibleHeadings.sort(function (a, b) { return a.top - b.top; });
        // 优先选择仍在页头横线之下的最上方那个。
        var offset = headerOffset();
        var pick = null;
        for (var i = 0; i < visibleHeadings.length; i++) {
            if (visibleHeadings[i].top >= offset) { pick = visibleHeadings[i]; break; }
        }
        if (!pick) pick = visibleHeadings[0];
        setActive(pick.id);
    };

    // IntersectionObserver 的 rootMargin 在创建后不可更改，
    // 而页头高度会随视口宽度变化（导航换行）。因此偏移量改变时
    // 重建 observer —— 否则窄屏下会把「被页头盖住的标题」
    // 误判为当前章节。
    var observer = null;
    var observerOffset = -1;

    var buildObserver = function () {
        var offset = headerOffset();
        if (observerOffset === offset && observer) return;
        observerOffset = offset;

        if (observer) observer.disconnect();
        observer = new IntersectionObserver(onEntries, {
            rootMargin: '-' + offset + 'px 0px -55% 0px',
            threshold: 0
        });
        Array.prototype.forEach.call(headings, function (h) { observer.observe(h); });
    };

    buildObserver();

    // 跟随页头高度变化重建 observer。
    // components.js 在测量到新的页头高度时会派发此事件；
    // resize 兜底覆盖事件派发前就已发生的窗口尺寸变化。
    document.addEventListener('siteheaderheightchange', buildObserver);
    window.addEventListener('resize', buildObserver, { passive: true });
})();
