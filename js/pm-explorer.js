

(function () {
  'use strict';

  // 全局 PM 命名空间（由 pm-state.js 首次定义，后续模块只读不重置）。
  if (typeof window.PM === 'undefined') {
    window.PM = { state: {}, fns: {} };
  }
  function enterExplorerMode() {
    PM.fns.$('explorerView').style.display = '';
    PM.fns.$('noCategoryOverlay').style.display = 'none';
    PM.fns.$('h3MainHeader').style.display = 'none';
    PM.fns.$('h3CardsList').style.display = 'none';
    PM.fns.$('noPackOverlay').style.display = 'none';
    PM.fns.$('h3Empty').style.display = 'none';
    renderExplorerTree();
    PM.state.explorerHistory = [];
    PM.state.explorerFuture = [];
    PM.state.explorerSelection = [];
    PM.state.explorerClipboard = { type: null, paths: [] };
    navigateExplorer('');
    updateExplorerToolbar();
    PM.fns.pmReplayViewFade(PM.fns.$('explorerView'));
  }

  PM.fns.enterExplorerMode = enterExplorerMode;

  function renderExplorerTree() {
    const tree = buildFileTree();
    const list = PM.fns.$('h2List');
    const folders = Object.keys(tree._children).sort();
    let html = `<ul style="list-style:none;padding:6px 0">
      <li>
        <div class="tree-item" onclick="navigateExplorer('')" style="${!PM.state.explorerPath ? 'background:#1f6feb22' : ''}">
          <span class="tree-icon folder">📦</span>
          <span class="tree-label">资源包根目录</span>
        </div>
      </li>`;
    if (folders.length) {
      html += `<ul class="tree-children" style="list-style:none;padding-left:14px">`;
      folders.forEach(name => {
        const childPath = PM.state.explorerPath ? PM.state.explorerPath + '/' + name : name;
        const isActive = PM.state.explorerPath === childPath;
        html += `<li>
          <div class="tree-item" onclick="navigateExplorer('${PM.fns.escapeHtml(childPath)}')" style="${isActive ? 'background:#1f6feb22' : ''}">
            <span class="tree-icon folder">📁</span>
            <span class="tree-label">${PM.fns.escapeHtml(name)}</span>
          </div>
        </li>`;
      });
      html += `</ul>`;
    }
    html += `</ul>`;
    list.innerHTML = html;
  }

  PM.fns.renderExplorerTree = renderExplorerTree;

  function navigateExplorer(path) {
    path = path || '';
    if (path !== PM.state.explorerPath) {
      PM.state.explorerHistory.push(PM.state.explorerPath);
      PM.state.explorerFuture = [];
    }
    PM.state.explorerPath = path;
    renderExplorerTree();
    renderExplorerContent();
    PM.state.explorerSelection = [];
    updateExplorerToolbar();
  }

  PM.fns.navigateExplorer = navigateExplorer;

  function explorerGoBack() {
    if (PM.state.explorerHistory.length === 0) return;
    PM.state.explorerFuture.push(PM.state.explorerPath);
    PM.state.explorerPath = PM.state.explorerHistory.pop();
    renderExplorerTree();
    renderExplorerContent();
    PM.state.explorerSelection = [];
    updateExplorerToolbar();
  }

  PM.fns.explorerGoBack = explorerGoBack;

  function explorerGoForward() {
    if (PM.state.explorerFuture.length === 0) return;
    PM.state.explorerHistory.push(PM.state.explorerPath);
    PM.state.explorerPath = PM.state.explorerFuture.pop();
    renderExplorerTree();
    renderExplorerContent();
    PM.state.explorerSelection = [];
    updateExplorerToolbar();
  }

  PM.fns.explorerGoForward = explorerGoForward;

  function explorerGoUp() {
    if (!PM.state.explorerPath) return;
    const parts = PM.state.explorerPath.split('/');
    parts.pop();
    navigateExplorer(parts.join('/'));
  }

  PM.fns.explorerGoUp = explorerGoUp;

  function explorerReload() {
    renderExplorerTree();
    renderExplorerContent();
    PM.fns.showToast(PM.fns.t('toast.refreshed'), 'info');
  }

  PM.fns.explorerReload = explorerReload;

  function setExplorerView(mode) {
    PM.state.explorerViewMode = mode;
    PM.fns.$('expViewList').classList.toggle('active', mode === 'list');
    PM.fns.$('expViewGrid').classList.toggle('active', mode === 'grid');
    renderExplorerContent();
  }

  PM.fns.setExplorerView = setExplorerView;

  function buildFileTree() {
    const root = { _children: {}, _files: [] };
    // 第一遍：注册所有目录标记（以 '/' 结尾的条目），让"新建文件夹"创建的
    // 空文件夹也能在树状图里显示。
    Object.keys(PM.state.fileMap).forEach(path => {
      if (!path.endsWith('/')) return;
      const cleanPath = path.slice(0, -1);
      if (!cleanPath) return; // 裸 '/' 根标记，无需注册
      const parts = cleanPath.split('/');
      let node = root;
      for (const part of parts) {
        if (!node._children[part]) node._children[part] = { _children: {}, _files: [] };
        node = node._children[part];
      }
    });
    // 第二遍：把文件放到它们所属目录的 _files 数组里。
    Object.keys(PM.state.fileMap).sort().forEach(path => {
      if (path.endsWith('/')) return;
      const parts = path.split('/');
      let node = root;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!node._children[parts[i]]) node._children[parts[i]] = { _children: {}, _files: [] };
        node = node._children[parts[i]];
      }
      node._files.push(parts[parts.length - 1]);
    });
    return root;
  }

  PM.fns.buildFileTree = buildFileTree;

  function getEntriesAt(path) {
    const tree = buildFileTree();
    if (!path) return { folders: Object.keys(tree._children).sort(), files: tree._files.sort() };
    let node = tree;
    path.split('/').forEach(seg => {
      if (node._children[seg]) node = node._children[seg];
    });
    return { folders: Object.keys(node._children).sort(), files: node._files.sort() };
  }

  PM.fns.getEntriesAt = getEntriesAt;

  function renderExplorerContent() {
    const bcEl = PM.fns.$('expAddressPath');
    // 把地址栏做成可点击的面包屑导航，用户可以直接跳到任意上级目录，
    // 不必反复点击 ◀ 一层层往上爬。
    let bcHtml = `<span style="cursor:pointer;color:#79c0ff" onclick="navigateExplorer('')" title="返回根目录">📦 资源包</span>`;
    if (PM.state.explorerPath) {
      const crumbs = PM.state.explorerPath.split('/').filter(Boolean);
      let acc = '';
      crumbs.forEach((seg, i) => {
        acc = acc ? acc + '/' + seg : seg;
        const isLast = i === crumbs.length - 1;
        bcHtml += ` <span style="color:#484f58">/</span> <span style="cursor:pointer;color:${isLast ? '#e6edf3' : '#79c0ff'}" onclick="navigateExplorer('${PM.fns.escapeAttr(acc)}')">${PM.fns.escapeHtml(seg)}</span>`;
      });
    }
    if (bcEl) bcEl.innerHTML = bcHtml;
    const { folders, files } = getEntriesAt(PM.state.explorerPath);
    const container = PM.fns.$('explorerContent');
    if (folders.length === 0 && files.length === 0) {
      container.innerHTML = `<div style="text-align:center;color:#484f58;padding:40px;font-size:13px">
        📭 此文件夹为空<br><br>
        <button class="btn btn-secondary btn-sm" onclick="explorerNewFolder()">📁 新建文件夹</button>
      </div>`;
      PM.fns.$('explorerStatus').textContent = '0 个项目';
      bindExplorerContentEvents(container);
      return;
    }

    const folderHtml = folders.map(name => {
      const childPath = PM.state.explorerPath ? PM.state.explorerPath + '/' + name : name;
      const sel = PM.state.explorerSelection.includes(childPath);
      return `<div class="explorer-item folder-item${sel ? ' selected-item' : ''}"
          data-full-path="${PM.fns.escapeHtml(childPath)}"
          onclick="explorerItemClick('${PM.fns.escapeHtml(childPath)}', event, 'folder')"
          ondblclick="explorerItemDblClick('${PM.fns.escapeHtml(childPath)}', 'folder')"
          oncontextmenu="event.preventDefault(); if(!PM.state.explorerSelection.includes('${PM.fns.escapeHtml(childPath)}')){PM.state.explorerSelection=['${PM.fns.escapeHtml(childPath)}']; PM.state._explorerSelectionAnchor=null; renderExplorerContent(); updateExplorerToolbar();} showExplorerContextMenu(event.clientX, event.clientY, '${PM.fns.escapeHtml(childPath)}');">
          <input type="checkbox" class="explorer-item-check"${sel ? ' checked' : ''} onclick="event.stopPropagation(); toggleExplorerCheck(this, '${PM.fns.escapeHtml(childPath)}', event)">
          <div class="explorer-item-icon">📁</div>
          <div class="explorer-item-name">${PM.fns.escapeHtml(name)}</div>
        </div>`;
    }).join('');

    // 构建文件条目。图片文件渲染为 <img class="explorer-thumb">，
    // 使用 PM.state.zip 中缓存的 blob URL 生成真实缩略图，而非仅显示 emoji 图标。
    const uncachedImages = [];
    const fileHtml = files.map(name => {
      const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
      const isImage = PM.fns.isImageFile(name);
      const isText = !isImage && PM.fns.isTextFile(name);
      const fullPath = (PM.state.explorerPath ? PM.state.explorerPath + '/' : '') + name;
      let icon = isImage ? '🖼' : ext === 'json' ? '📋' :
                 ['ttf','otf','woff','woff2'].includes(ext) ? '🔤' :
                 ext === 'mcmeta' ? '⚙' : isText ? '📝' : '📄';
      const kind = isImage ? 'image' : isText ? 'text' : 'null';
      const sel = PM.state.explorerSelection.includes(fullPath);

      // 图片文件优先使用真实缩略图。
      // 若 blob URL 已在缓存中则立即渲染 <img>，
      // 否则保留 emoji 并将条目排队等待异步加载缩略图。
      //
      // <img> 自带 onclick 事件直接调用 explorerItemOpen。
      // 完全依赖事件冒泡到父 <div> 的点击事件不可靠：
      // 懒加载图片时部分浏览器会触发 'load' 但
      // 在加载完成前不会派发点击事件，导致父元素的
      // 点击事件永远不会被触发。这里直接调用 explorerItemOpen
      // 让预览打开更加稳定。
      // 用 preventDefault 防止父元素重复触发 explorerItemOpen。
      let thumbHtml = '';
      let thumbClass = '';
      if (isImage) {
        const cached = PM.state.imageUrlCache.get(fullPath);
        if (cached) {
          thumbHtml = `<img class="explorer-thumb" src="${cached}" alt="${PM.fns.escapeHtml(name)}" onclick="event.stopPropagation(); explorerItemDblClick('${PM.fns.escapeHtml(fullPath)}', '${kind}')" ondblclick="event.stopPropagation(); explorerItemDblClick('${PM.fns.escapeHtml(fullPath)}', '${kind}')" onerror="this.remove(); this.parentElement.classList.remove('has-thumb')">`;
          thumbClass = ' has-thumb';
          icon = ''; // 通过 has-thumb CSS 隐藏 emoji
        } else {
          uncachedImages.push({ fullPath, name });
        }
      }
      return `<div class="explorer-item${sel ? ' selected-item' : ''}${thumbClass}" data-full-path="${PM.fns.escapeHtml(fullPath)}"
          onclick="explorerItemClick('${PM.fns.escapeHtml(fullPath)}', event, '${kind}')"
          ondblclick="explorerItemDblClick('${PM.fns.escapeHtml(fullPath)}', '${kind}')"
          oncontextmenu="event.preventDefault(); if(!PM.state.explorerSelection.includes('${PM.fns.escapeHtml(fullPath)}')){PM.state.explorerSelection=['${PM.fns.escapeHtml(fullPath)}']; PM.state._explorerSelectionAnchor=null; renderExplorerContent(); updateExplorerToolbar();} showExplorerContextMenu(event.clientX, event.clientY, '${PM.fns.escapeHtml(fullPath)}');">
          <input type="checkbox" class="explorer-item-check"${sel ? ' checked' : ''} onclick="event.stopPropagation(); toggleExplorerCheck(this, '${PM.fns.escapeHtml(fullPath)}', event)">
          <div class="explorer-item-icon">${icon}</div>
          ${thumbHtml}
          <div class="explorer-item-name">${PM.fns.escapeHtml(name)}</div>
        </div>`;
    }).join('');

    container.innerHTML = `<div class="explorer-grid">${folderHtml}${fileHtml}</div>`;
    bindExplorerContentEvents(container);
    // 每次进入新文件夹都重放交错淡入动画，
    // 通过 class 移除 + 强制重排 + 重新添加的方式触发，
    // 确保即使重新渲染同一文件夹也能播放动画。
    container.classList.remove('items-anim-in');
    void container.offsetWidth;
    container.classList.add('items-anim-in');
    const total = folders.length + files.length;
    let statusText = `${folders.length} 个文件夹, ${files.length} 个文件 (共 ${total} 项)`;
    if (PM.state.explorerSelection.length > 0) statusText += ` · 已选中 ${PM.state.explorerSelection.length} 项`;
    if (PM.state.explorerClipboard.type) {
      const clipType = PM.state.explorerClipboard.type === 'cut' ? '已剪切' : '已复制';
      statusText += ` · ${clipType} ${PM.state.explorerClipboard.paths.length} 个项目`;
    }
    PM.fns.$('explorerStatus').textContent = statusText;

    // 异步阶段：并行解码未缓存的图片 blob，
    // 解码完成后把 <img> 注入已经渲染好的 DOM，
    // 让初始渲染在含大量图片的文件夹下也保持流畅。
    if (PM.state.zip && uncachedImages.length > 0) {
      // 记录当前渲染代次。若用户在这些图片解码完成之前就跳转走了，
      // loadExplorerThumb 会检测到代次不匹配，直接放弃结果，
      // 避免把过期缩略图插入当前已经属于其他文件的格子。
      const version = ++PM.state.explorerRenderVersion;
      uncachedImages.forEach(entry => loadExplorerThumb(entry, version));
    }
  }

  PM.fns.renderExplorerContent = renderExplorerContent;

  function cssEscapeAttr(s) {
    return String(s).replace(/(["\\])/g, '\\$1');
  }

  PM.fns.cssEscapeAttr = cssEscapeAttr;

  async function loadExplorerThumb(entry, version) {
    try {
      const blob = await PM.state.zip.file(entry.fullPath).async('blob');
      // 若在等待过程中触发了更新一次的渲染，直接放弃这次结果。
      if (version !== PM.state.explorerRenderVersion) {
        // 注意：这里不要缓存也不要撤销 URL——文件还是有效的，
        // 只是用户在解码完成之前就跳走了。
        return;
      }
      const url = URL.createObjectURL(blob);
      PM.state.imageUrlCache.set(entry.fullPath, url);
      // 找到该文件对应的格子，把缩略图注入进去。
      const cell = document.querySelector(
        '.explorer-item[data-full-path="' + cssEscapeAttr(entry.fullPath) + '"]'
      );
      if (!cell) return;
      const img = document.createElement('img');
      img.className = 'explorer-thumb';
      img.src = url;
      img.alt = entry.name;
      // 直接绑定 onclick + stopPropagation，让缩略图可靠地打开预览，
      // 与缓存缩略图的内联处理方式一致。
      // 父级 <div> 的 onclick 并不可靠，这里直接绑定到 img 上。
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        PM.fns.openImagePreview(entry.fullPath);
      });
      img.onerror = () => { img.remove(); cell.classList.remove('has-thumb'); };
      // 把 img 插入到 .explorer-item-name 之前，保证布局（复选框在左上、
      // 缩略图居中、文件名在下方）与缓存项保持一致。
      const nameEl = cell.querySelector('.explorer-item-name');
      if (nameEl) cell.insertBefore(img, nameEl);
      else cell.appendChild(img);
      cell.classList.add('has-thumb');
    } catch (_) { /* 保留 emoji 降级图标 */ }
  }

  PM.fns.loadExplorerThumb = loadExplorerThumb;

  function explorerItemClick(path, event, kind) {
    if (!event) event = window.event;
    const ctrl = event.ctrlKey || event.metaKey;
    const shift = event.shiftKey && !ctrl;
    if (ctrl) {
      if (PM.state.explorerSelection.includes(path)) {
        PM.state.explorerSelection = PM.state.explorerSelection.filter(p => p !== path);
      } else {
        PM.state.explorerSelection = [...PM.state.explorerSelection, path];
      }
      PM.state._explorerSelectionAnchor = path;
    } else if (shift && PM.state._explorerSelectionAnchor) {
      // 框选：从锚点到点击位置，仅在当前视图中生效。
      const allVisible = collectVisibleItems();
      const anchorIdx = allVisible.indexOf(PM.state._explorerSelectionAnchor);
      const targetIdx = allVisible.indexOf(path);
      if (anchorIdx >= 0 && targetIdx >= 0) {
        const [lo, hi] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
        PM.state.explorerSelection = allVisible.slice(lo, hi + 1);
      } else {
        PM.state.explorerSelection = [path];
        PM.state._explorerSelectionAnchor = path;
      }
    } else {
      // 单击 = 直接打开：文件夹进入、图片预览、文本进入编辑器。
      // 这一点和 index.html 画廊的"点击即看"行为一致。
      // 多选 / 框选请用 Ctrl+Click / Shift+Click / 复选框。
      PM.state.explorerSelection = [path];
      PM.state._explorerSelectionAnchor = path;
      explorerItemOpen(path, kind);
      // 只更新工具栏，selection 已经在 explorerItemOpen 触发后
      // 自然反映在 DOM 上（下一帧导航/打开预览时会重渲染），无需整页重渲染。
      updateExplorerToolbar();
      return;
    }
    renderExplorerContent();
    updateExplorerToolbar();
  }

  PM.fns.explorerItemClick = explorerItemClick;

  function explorerItemOpen(path, kind) {
    if (kind === 'folder') navigateExplorer(path);
    else if (kind === 'image') PM.fns.openImagePreview(path);
    else PM.fns.openTextEditor(path);
  }

  PM.fns.explorerItemOpen = explorerItemOpen;

  function explorerItemDblClick(path, kind) {
    if (kind === 'folder') navigateExplorer(path);
    else if (kind === 'image') PM.fns.openImagePreview(path);
    else if (kind === 'text') PM.fns.openTextEditor(path);
    else PM.fns.openTextEditor(path);
  }

  PM.fns.explorerItemDblClick = explorerItemDblClick;

  function showExplorerContextMenu(x, y, path) {
    const menu = PM.fns.$('explorerContextMenu');
    if (!menu) return;
    PM.state._ctxMenuOpenedForPath = path || null;
    const selCount = PM.state.explorerSelection.length;
    const hasClip = PM.state.explorerClipboard.type !== null;
    const hasSingle = selCount === 1;
    const items = [
      { label: '✂ 剪切',        key: 'cut',     disabled: selCount === 0, run: () => explorerCut() },
      { label: '📋 复制',        key: 'copy',    disabled: selCount === 0, run: () => explorerCopy() },
      { label: '📥 粘贴',        key: 'paste',   disabled: !hasClip,       run: () => explorerPaste() },
      { sep: true },
      { label: '🗑 删除',        key: 'delete',  disabled: selCount === 0, run: () => explorerDelete() },
      { label: '✏ 重命名',      key: 'rename',  disabled: !hasSingle,     run: () => explorerRename() },
      { label: '⬇ 下载',         key: 'download',disabled: !hasSingle,     run: () => explorerDownload() },
      { sep: true },
      { label: '📄 新建文件',    key: 'newfile',                 run: () => explorerNewFile() },
      { label: '📁 新建文件夹',  key: 'newfolder',               run: () => explorerNewFolder() },
      { label: '⬆ 上传文件',     key: 'upload',                  run: () => PM.fns.$('expUploadInput').click() },
    ];
    menu.innerHTML = items.map(it => {
      if (it.sep) return '<div class="explorer-ctx-sep"></div>';
      return `<div class="explorer-ctx-item${it.disabled ? ' disabled' : ''}" data-ctx-key="${it.key}">${PM.fns.escapeHtml(it.label)}</div>`;
    }).join('');
    // 绑定点击
    menu.querySelectorAll('.explorer-ctx-item').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (el.classList.contains('disabled')) return;
        const key = el.getAttribute('data-ctx-key');
        const it = items.find(i => i.key === key);
        if (it && typeof it.run === 'function') {
          try { it.run(); } catch (e) { console.warn(e); }
        }
        hideExplorerContextMenu();
      });
    });
    // 定位：先临时显示才能拿尺寸
    menu.style.display = '';
    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top = '0px';
    const rect = menu.getBoundingClientRect();
    const px = Math.min(x, window.innerWidth - rect.width - 4);
    const py = Math.min(y, window.innerHeight - rect.height - 4);
    menu.style.left = px + 'px';
    menu.style.top = py + 'px';
    menu.style.visibility = 'visible';
  }

  PM.fns.showExplorerContextMenu = showExplorerContextMenu;

  function hideExplorerContextMenu() {
    const menu = PM.fns.$('explorerContextMenu');
    if (!menu) return;
    menu.style.display = 'none';
    menu.innerHTML = '';
    PM.state._ctxMenuOpenedForPath = null;
  }

  PM.fns.hideExplorerContextMenu = hideExplorerContextMenu;

  function bindExplorerContentEvents(container) {
    if (!container || container.dataset.boundRubber) return;
    container.dataset.boundRubber = '1';
    container.addEventListener('mousedown', startExplorerRubberBand);
    container.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.explorer-item')) return;
      e.preventDefault();
      showExplorerContextMenu(e.clientX, e.clientY, null);
    });
  }

  PM.fns.bindExplorerContentEvents = bindExplorerContentEvents;

  function startExplorerRubberBand(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.explorer-item')) return;
    if (e.target.closest('button')) return;
    if (e.target.closest('.exp-btn')) return;
    if (e.target.closest('.explorer-toolbar')) return;
    if (e.target.closest('.explorer-ops-toolbar')) return;
    // 阻止默认文本选中
    e.preventDefault();
    const rect = document.createElement('div');
    rect.className = 'selection-rect';
    document.body.appendChild(rect);
    const startX = e.clientX, startY = e.clientY;
    const additive = e.ctrlKey || e.metaKey || e.shiftKey;
    const move = (ev) => {
      const x = Math.min(startX, ev.clientX);
      const y = Math.min(startY, ev.clientY);
      const w = Math.abs(ev.clientX - startX);
      const h = Math.abs(ev.clientY - startY);
      Object.assign(rect.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      if (w < 3 && h < 3) rect.style.display = 'none';
      else rect.style.display = '';
    };
    const up = (ev) => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      const r = rect.getBoundingClientRect();
      rect.remove();
      if (r.width < 3 && r.height < 3) return; // 视为普通空白点击
      // 命中所有 .explorer-item（无论是 folder 还是 file）。
      // 所有 item 都有 data-full-path，所以可以直接读取。
      const baseSet = additive ? new Set(PM.state.explorerSelection) : new Set();
      document.querySelectorAll('.explorer-item').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.right >= r.left && b.left <= r.right && b.bottom >= r.top && b.top <= r.bottom) {
          const dataPath = el.getAttribute('data-full-path');
          if (dataPath) baseSet.add(dataPath);
        }
      });
      PM.state.explorerSelection = Array.from(baseSet);
      PM.state._explorerSelectionAnchor = null;
      renderExplorerContent();
      updateExplorerToolbar();
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  PM.fns.startExplorerRubberBand = startExplorerRubberBand;

  function toggleExplorerCheck(checkboxEl, path, event) {
    if (!event) event = window.event;
    if (event.shiftKey && PM.state._explorerSelectionAnchor) {
      // Shift+click：从锚点到该行之间的范围选中/取消选中。
      const allVisible = collectVisibleItems();
      const anchorIdx = allVisible.indexOf(PM.state._explorerSelectionAnchor);
      const targetIdx = allVisible.indexOf(path);
      if (anchorIdx >= 0 && targetIdx >= 0) {
        const [lo, hi] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
        const range = allVisible.slice(lo, hi + 1);
        if (checkboxEl.checked) {
          // 合并：把范围内尚未选中的项加入选中。
          const merged = new Set(PM.state.explorerSelection);
          range.forEach(p => merged.add(p));
          PM.state.explorerSelection = Array.from(merged);
        } else {
          // 范围取消：把范围内的已选项移除。
          const drop = new Set(range);
          PM.state.explorerSelection = PM.state.explorerSelection.filter(p => !drop.has(p));
        }
      } else {
        // 锚点已不可见——回退到普通切换。
        if (checkboxEl.checked) {
          if (!PM.state.explorerSelection.includes(path)) PM.state.explorerSelection = [...PM.state.explorerSelection, path];
        } else {
          PM.state.explorerSelection = PM.state.explorerSelection.filter(p => p !== path);
        }
        PM.state._explorerSelectionAnchor = path;
      }
    } else {
      // 普通点击（含或不含 Ctrl）：仅切换当前项，其余保持不变，多选操作直接生效。
      if (checkboxEl.checked) {
        if (!PM.state.explorerSelection.includes(path)) PM.state.explorerSelection = [...PM.state.explorerSelection, path];
      } else {
        PM.state.explorerSelection = PM.state.explorerSelection.filter(p => p !== path);
      }
      PM.state._explorerSelectionAnchor = path;
    }
    // 同步其余复选框的视觉状态，仅更新高亮行（不整页重渲染，
    // 否则用户尚未完成的点击会被丢弃）。
    document.querySelectorAll('.explorer-item-check').forEach(cb => {
      // 从复选框自身的 onclick 属性中解析路径，例如：
      // onclick="event.stopPropagation(); toggleExplorerCheck(this, 'assets/foo.png', event)"
      const m = (cb.getAttribute('onclick') || '').match(/toggleExplorerCheck\(this,\s*'((?:\\'|[^'])*)'/);
      if (!m) return;
      const p = m[1];
      const want = PM.state.explorerSelection.includes(p);
      if (cb.checked !== want) cb.checked = want;
      const item = cb.closest('.explorer-item');
      if (item) item.classList.toggle('selected-item', want);
    });
    updateExplorerToolbar();
  }

  PM.fns.toggleExplorerCheck = toggleExplorerCheck;

  function collectVisibleItems() {
    const { folders, files } = getEntriesAt(PM.state.explorerPath);
    const out = [];
    folders.forEach(name => {
      out.push(PM.state.explorerPath ? PM.state.explorerPath + '/' + name : name);
    });
    files.forEach(name => {
      out.push((PM.state.explorerPath ? PM.state.explorerPath + '/' : '') + name);
    });
    return out;
  }

  PM.fns.collectVisibleItems = collectVisibleItems;

  function updateExplorerToolbar() {
    const sel = PM.state.explorerSelection.length;
    const hasClip = PM.state.explorerClipboard.type !== null;
    const ids = ['expBtnCut','expBtnCopy','expBtnDelete','expBtnPaste','expBtnRename','expBtnDownload'];
    ids.forEach(id => { const el = PM.fns.$(id); if (!el) return; });
    if (PM.fns.$('expBtnCut')) PM.fns.$('expBtnCut').disabled = sel === 0;
    if (PM.fns.$('expBtnCopy')) PM.fns.$('expBtnCopy').disabled = sel === 0;
    if (PM.fns.$('expBtnDelete')) PM.fns.$('expBtnDelete').disabled = sel === 0;
    if (PM.fns.$('expBtnRename')) PM.fns.$('expBtnRename').disabled = sel !== 1;
    if (PM.fns.$('expBtnDownload')) PM.fns.$('expBtnDownload').disabled = sel !== 1;
    if (PM.fns.$('expBtnPaste')) {
      PM.fns.$('expBtnPaste').disabled = !hasClip;
      if (hasClip) {
        const clipType = PM.state.explorerClipboard.type === 'cut' ? '剪切' : '复制';
        PM.fns.$('expBtnPaste').title = `粘贴 ${clipType}的 ${PM.state.explorerClipboard.paths.length} 个项目 (Ctrl+V)`;
      } else {
        PM.fns.$('expBtnPaste').title = '粘贴 (Ctrl+V)';
      }
    }
  }

  PM.fns.updateExplorerToolbar = updateExplorerToolbar;

  function expBasename(path) { return path.split('/').pop() || ''; }

  PM.fns.expBasename = expBasename;

  function expDirname(path) { const parts = path.split('/'); parts.pop(); return parts.join('/'); }

  PM.fns.expDirname = expDirname;

  function expIsFolder(path) {
    const tree = buildFileTree();
    let node = tree;
    const parts = path.split('/');
    for (let i = 0; i < parts.length - 1; i++) {
      if (node._children[parts[i]]) node = node._children[parts[i]];
      else return false;
    }
    return !!node._children[parts[parts.length - 1]];
  }

  PM.fns.expIsFolder = expIsFolder;

  function expListAll(pathPrefix) {
    const prefix = pathPrefix + '/';
    return Object.keys(PM.state.fileMap).filter(p => p.startsWith(prefix));
  }

  PM.fns.expListAll = expListAll;

  function expUniqueName(targetDir, baseName) {
    const prefix = targetDir ? targetDir + '/' : '';
    // 当目标路径上已经存在同名文件，或同名目录标记（带尾斜杠），
    // 都视为冲突。
    // 判断时用键是否存在，而不是值的真值，因为目录标记
    // 存的就是 null，`!null === true`。
    const hasFile = (prefix + baseName) in PM.state.fileMap;
    const hasFolder = (prefix + baseName + '/') in PM.state.fileMap;
    if (!hasFile && !hasFolder) return baseName;
    const ext = baseName.includes('.') ? '.' + baseName.split('.').pop() : '';
    const name = ext ? baseName.slice(0, -ext.length) : baseName;
    for (let i = 1; i < 1000; i++) {
      const candidate = name + ' (' + i + ')' + ext;
      const cFile = (prefix + candidate) in PM.state.fileMap;
      const cFolder = (prefix + candidate + '/') in PM.state.fileMap;
      if (!cFile && !cFolder) return candidate;
    }
    return baseName + '_copy';
  }

  PM.fns.expUniqueName = expUniqueName;

  async function explorerCopy() {
    if (PM.state.explorerSelection.length === 0) {
      PM.fns.showToast(PM.fns.t('toast.copyNothing'), 'warn');
      return;
    }
    PM.state.explorerClipboard = { type: 'copy', paths: [...PM.state.explorerSelection] };
    PM.fns.showToast(PM.fns.t('toast.copied', { count: PM.state.explorerSelection.length }), 'info');
    updateExplorerToolbar();
  }

  PM.fns.explorerCopy = explorerCopy;

  async function explorerCut() {
    if (PM.state.explorerSelection.length === 0) {
      PM.fns.showToast(PM.fns.t('toast.copyNothing'), 'warn');
      return;
    }
    PM.state.explorerClipboard = { type: 'cut', paths: [...PM.state.explorerSelection] };
    PM.fns.showToast(PM.fns.t('toast.cut', { count: PM.state.explorerSelection.length }), 'info');
    updateExplorerToolbar();
  }

  PM.fns.explorerCut = explorerCut;

  async function explorerPaste() {
    if (!PM.state.explorerClipboard.type || PM.state.explorerClipboard.paths.length === 0) {
      PM.fns.showToast(PM.fns.t('toast.pasteNothing'), 'warn');
      return;
    }
    const targetDir = PM.state.explorerPath;
    const isCut = PM.state.explorerClipboard.type === 'cut';
    let count = 0;

    // 先规划好重命名，避免一个文件夹和它里面的文件各自都试图占用同一个目标名。
    // 目标名冲突由 expUniqueName 处理。
    // 目标目录里已经存在的项都视为冲突。
    const plan = [];
    for (const srcPath of PM.state.explorerClipboard.paths) {
      // 选中路径不会带尾斜杠——根据 fileMap 自行判断是不是目录。
      const srcIsFolder = srcPath.endsWith('/') || expIsFolder(srcPath);
      const srcAsFile = srcIsFolder && srcPath.endsWith('/') ? srcPath.slice(0, -1) : srcPath;
      // 跳过已经消失的源（应对连续剪切-粘贴的场景）。
      if (isCut && !(srcAsFile in PM.state.fileMap) && !(srcAsFile + '/' in PM.state.fileMap)) continue;
      const name = expBasename(srcAsFile);
      const newName = expUniqueName(targetDir, name);
      const newPath = targetDir ? targetDir + '/' + newName : newName;
      plan.push({ srcPath, srcIsFolder, srcAsFile, newPath });
    }

    for (const { srcPath, srcIsFolder, srcAsFile, newPath } of plan) {
      try {
        if (srcIsFolder) {
          // 把文件夹内每个条目按 oldPrefix → newPrefix 重写。
          // 选中路径是裸路径（如 'assets/foo'），但
          // PM.state.fileMap 用尾斜杠保存目录标记（'assets/foo/'）。
          const oldPrefix = srcAsFile + '/';
          const newPrefix = newPath + '/';
          const inside = expListAll(srcAsFile); // 含嵌套文件夹标记
          for (const oldEntry of inside) {
            if (oldEntry === oldPrefix) continue; // 跳过文件夹自身的标记
            const tail = oldEntry.slice(oldPrefix.length);
            const newEntry = newPrefix + tail;
            if (oldEntry.endsWith('/')) {
              // 嵌套文件夹标记——仅在 PM.state.fileMap 中移动键。
              if (isCut && PM.state.imageUrlCache.has(oldEntry)) {
                PM.state.imageUrlCache.set(newEntry, PM.state.imageUrlCache.get(oldEntry));
                PM.state.imageUrlCache.delete(oldEntry);
              }
              PM.state.fileMap[newEntry] = PM.state.fileMap[oldEntry];
              delete PM.state.fileMap[oldEntry];
            } else {
              const entry = PM.state.zip.file(oldEntry);
              if (!entry) continue;
              const data = await entry.async('uint8array');
              PM.state.zip.file(newEntry, data);
              PM.state.fileMap[newEntry] = PM.state.zip.file(newEntry);
              if (isCut) {
                // 把缓存的 blob URL 一起搬过去，保持图片预览在新的路径下有效。
                // 撤销并丢弃旧 URL，避免浏览器累积失效的 blob 引用。
                if (PM.state.imageUrlCache.has(oldEntry)) {
                  PM.state.imageUrlCache.set(newEntry, PM.state.imageUrlCache.get(oldEntry));
                  PM.state.imageUrlCache.delete(oldEntry);
                }
                PM.state.zip.remove(oldEntry);
                delete PM.state.fileMap[oldEntry];
              }
            }
          }
          // （剪切时）删除源目录标记，并在目标处创建新标记。
          if (isCut) delete PM.state.fileMap[oldPrefix];
          PM.fns.ensureDirEntry(newPath);
        } else {
          // 单文件复制 / 移动。
          const entry = PM.state.zip.file(srcPath);
          if (!entry) continue;
          const data = await entry.async('uint8array');
          PM.state.zip.file(newPath, data);
          PM.state.fileMap[newPath] = PM.state.zip.file(newPath);
          if (isCut) {
            // 把缓存的 blob URL 一起搬过去，保持图片预览在新的路径下有效。
            // 若不搬，旧 URL 永远不会撤销，
            // 每次移动都会为同一个 blob 累积一个新的 URL。
            if (PM.state.imageUrlCache.has(srcPath)) {
              PM.state.imageUrlCache.set(newPath, PM.state.imageUrlCache.get(srcPath));
              PM.state.imageUrlCache.delete(srcPath);
            }
            PM.state.zip.remove(srcPath);
            delete PM.state.fileMap[srcPath];
          }
        }
        count++;
      } catch (e) { console.warn('Paste error for', srcPath, e); }
    }
    if (isCut) PM.state.explorerClipboard = { type: null, paths: [] };
    PM.fns.showToast(PM.fns.t('toast.pasted', { count }), 'success');
    PM.state.explorerSelection = [];
    refreshExplorer();
    updateExplorerToolbar();
  }

  PM.fns.explorerPaste = explorerPaste;

  async function explorerDelete() {
    if (PM.state.explorerSelection.length === 0) return;
    const n = PM.state.explorerSelection.length;
    if (!confirm(`确定要删除这 ${n} 个项目吗？\n此操作不可撤销。`)) return;
    for (const p of PM.state.explorerSelection) {
      if (expIsFolder(p)) {
        // 删除文件夹内的所有文件。
        expListAll(p).forEach(f => {
          PM.fns.revokeAndRemoveCache(f);
          PM.state.zip.remove(f);
          delete PM.state.fileMap[f];
        });
        // 删除文件夹自身标记（带尾斜杠的键）。
        const folderMarker = p.endsWith('/') ? p : p + '/';
        delete PM.state.fileMap[folderMarker];
      } else {
        PM.fns.revokeAndRemoveCache(p);
        PM.state.zip.remove(p);
        delete PM.state.fileMap[p];
      }
    }
    PM.fns.showToast(PM.fns.t('toast.deletedN', { count: n }), 'success');
    PM.state.explorerSelection = [];
    refreshExplorer();
    updateExplorerToolbar();
  }

  PM.fns.explorerDelete = explorerDelete;

  async function explorerRename() {
    if (PM.state.explorerSelection.length !== 1) return;
    const oldPath = PM.state.explorerSelection[0];
    const oldName = expBasename(oldPath);
    const newName = prompt('重命名为：', oldName);
    if (!newName || newName === oldName || !newName.trim()) return;
    const dir = expDirname(oldPath);
    const newPath = dir ? dir + '/' + newName.trim() : newName.trim();
    // 冲突检测：目标路径已存在同名文件或同名文件夹标记。
    if ((newPath in PM.state.fileMap) || (newPath + '/' in PM.state.fileMap)) {
      PM.fns.showToast(PM.fns.t('toast.nameTaken'), 'error');
      return;
    }
    const isFolder = expIsFolder(oldPath);

    if (isFolder) {
      // 重命名文件夹：将所有子条目前缀从旧路径改为新路径，删除旧标记，创建新标记。
      // 文件夹本身在 PM.state.zip 中没有条目，所以不能直接调用 PM.state.zip.file(oldPath)。
      const oldPrefix = oldPath + '/';
      const newPrefix = newPath + '/';
      const inside = expListAll(oldPath); // 含嵌套文件夹标记
      for (const oldEntry of inside) {
        if (oldEntry === oldPrefix) continue; // 跳过文件夹自身的标记
        const tail = oldEntry.slice(oldPrefix.length);
        const newEntry = newPrefix + tail;
        if (oldEntry.endsWith('/')) {
          // 嵌套文件夹标记——仅在 PM.state.fileMap 中移动键。
          // 同时转移缓存的 blob URL，使重命名后缩略图依然有效。
          if (PM.state.imageUrlCache.has(oldEntry)) {
            PM.state.imageUrlCache.set(newEntry, PM.state.imageUrlCache.get(oldEntry));
            PM.state.imageUrlCache.delete(oldEntry);
          }
          PM.state.fileMap[newEntry] = PM.state.fileMap[oldEntry];
          delete PM.state.fileMap[oldEntry];
        } else {
          const entry = PM.state.zip.file(oldEntry);
          if (!entry) continue;
          const data = await entry.async('uint8array');
          PM.state.zip.file(newEntry, data);
          PM.state.fileMap[newEntry] = PM.state.zip.file(newEntry);
          PM.state.zip.remove(oldEntry);
          delete PM.state.fileMap[oldEntry];
          // 为图片文件转移 blob URL，使预览在重命名后依然有效。
          if (PM.state.imageUrlCache.has(oldEntry)) {
            PM.state.imageUrlCache.set(newEntry, PM.state.imageUrlCache.get(oldEntry));
            PM.state.imageUrlCache.delete(oldEntry);
          }
        }
      }
      delete PM.state.fileMap[oldPrefix];
      PM.fns.ensureDirEntry(newPath);
    } else {
      // 重命名单个文件。
      const data = await PM.state.zip.file(oldPath).async('uint8array');
      PM.state.zip.file(newPath, data);
      PM.state.fileMap[newPath] = PM.state.zip.file(newPath);
      PM.state.zip.remove(oldPath);
      delete PM.state.fileMap[oldPath];
      // 为图片文件转移 blob URL，使预览在重命名后依然有效。
      if (PM.state.imageUrlCache.has(oldPath)) {
        PM.state.imageUrlCache.set(newPath, PM.state.imageUrlCache.get(oldPath));
        PM.state.imageUrlCache.delete(oldPath);
      }
    }

    PM.fns.showToast(PM.fns.t('toast.renamedTo', { name: newName }), 'success');
    PM.state.explorerSelection = [newPath];
    refreshExplorer();
  }

  PM.fns.explorerRename = explorerRename;

  async function explorerDownload() {
    if (PM.state.explorerSelection.length !== 1) return;
    const path = PM.state.explorerSelection[0];
    try {
      const data = await PM.state.zip.file(path).async('blob');
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = expBasename(path);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      PM.fns.showToast(PM.fns.t('toast.downloading', { name: expBasename(path) }), 'success');
    } catch(e) { PM.fns.showToast(PM.fns.t('toast.downloadFailed', { msg: e.message }), 'error'); }
  }

  PM.fns.explorerDownload = explorerDownload;

  function explorerNewFolder() {
    const base = '新建文件夹';
    const name = expUniqueName(PM.state.explorerPath, base);
    const folderPath = PM.state.explorerPath ? PM.state.explorerPath + '/' + name : name;
    PM.fns.ensureDirEntry(folderPath);
    PM.fns.showToast(PM.fns.t('toast.folderCreated', { name }), 'success');
    refreshExplorer();
  }

  PM.fns.explorerNewFolder = explorerNewFolder;

  function explorerNewFile() {
    openNewFileModal();
  }

  PM.fns.explorerNewFile = explorerNewFile;

  function openNewFileModal() {
    const nameInput = PM.fns.$('newFileName');
    const extInput = PM.fns.$('newFileExt');
    if (nameInput && !nameInput.dataset.bound) {
      nameInput.dataset.bound = '1';
      nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); confirmNewFile(); } });
    }
    if (extInput) extInput.value = 'txt';
    if (nameInput) nameInput.value = '';
    PM.fns.$('newFileModal').classList.add('is-open');
    setTimeout(() => { if (nameInput) { nameInput.focus(); nameInput.select(); } }, 30);
  }

  PM.fns.openNewFileModal = openNewFileModal;

  function closeNewFileModal() { PM.fns.$('newFileModal').classList.remove('is-open'); }

  PM.fns.closeNewFileModal = closeNewFileModal;

  function confirmNewFile() {
    const nameInput = PM.fns.$('newFileName');
    const rawName = nameInput ? nameInput.value.trim() : '';
    const rawExt = PM.fns.$('newFileExt') ? PM.fns.$('newFileExt').value.trim() : '';
    if (!rawName) { PM.fns.showToast(PM.fns.t('toast.enterFileName'), 'error'); if (nameInput) nameInput.focus(); return; }
    const ext = rawExt.replace(/^\./, '').toLowerCase();
    const fullName = ext ? rawName + '.' + ext : rawName;
    const finalName = expUniqueName(PM.state.explorerPath, fullName);
    const fullPath = PM.state.explorerPath ? PM.state.explorerPath + '/' + finalName : finalName;
    if (PM.fns.isTextFile(finalName)) PM.state.zip.file(fullPath, '');
    else PM.state.zip.file(fullPath, new Uint8Array(0));
    PM.state.fileMap[fullPath] = PM.state.zip.file(fullPath);
    closeNewFileModal();
    PM.fns.showToast(PM.fns.t('toast.fileCreated', { name: finalName }), 'success');
    PM.state.explorerSelection = [fullPath];
    refreshExplorer();
    if (PM.fns.isTextFile(finalName)) PM.fns.openTextEditor(fullPath);
  }

  PM.fns.confirmNewFile = confirmNewFile;

  function handleExplorerUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    let count = 0;
    for (const file of files) {
      const targetPath = (PM.state.explorerPath ? PM.state.explorerPath + '/' : '') + file.name;
      
      if (PM.state.imageUrlCache.has(targetPath)) {
        URL.revokeObjectURL(PM.state.imageUrlCache.get(targetPath));
        PM.state.imageUrlCache.delete(targetPath);
      }
      
      const reader = new FileReader();
      reader.onload = (function(path) {
        return function(e) {
          PM.state.zip.file(path, e.target.result);
          PM.state.fileMap[path] = PM.state.zip.file(path);
          count++;
          if (count === files.length) {
            PM.fns.showToast(PM.fns.t('toast.uploadedN', { count: count }), 'success');
            refreshExplorer();
          }
        };
      })(targetPath);
      reader.readAsArrayBuffer(file);
    }
    event.target.value = '';
  }

  PM.fns.handleExplorerUpload = handleExplorerUpload;

  function refreshExplorer() {
    Object.keys(PM.state.folderFileCache).forEach(k => delete PM.state.folderFileCache[k]);
    
    PM.fns.renderFileBrowser();
    renderExplorerTree();
    renderExplorerContent();
    updateExplorerToolbar();
  }

  PM.fns.refreshExplorer = refreshExplorer;

  function getThumbUrl(path) {
    const apply = (url) => {
      document.querySelectorAll('img[data-thumb-path]').forEach(img => {
        if (img.getAttribute('data-thumb-path') === path && img.src !== url) img.src = url;
      });
    };
    if (PM.state.imageUrlCache.has(path)) {
      const cached = PM.state.imageUrlCache.get(path);
      apply(cached);
      return cached;
    }
    const ext = path.includes('.') ? path.split('.').pop().toLowerCase() : '';
    if (!['png','jpg','jpeg','gif','bmp'].includes(ext)) return '';
    const entry = PM.state.zip && PM.state.zip.file(path);
    if (!entry) return '';
    entry.async('blob').then(blob => {
      const url = URL.createObjectURL(blob);
      const old = PM.state.imageUrlCache.get(path);
      if (old) URL.revokeObjectURL(old);
      PM.state.imageUrlCache.set(path, url);
      apply(url);
    }).catch(() => {});
    return '';
  }

  PM.fns.getThumbUrl = getThumbUrl;

})();
