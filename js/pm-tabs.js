

(function () {
  'use strict';

  // 全局 PM 命名空间（由 pm-state.js 首次定义，后续模块只读不重置）。
  if (typeof window.PM === 'undefined') {
    window.PM = { state: {}, fns: {} };
  }
  function switchH1Tab(tab, el) {
    // 切走前先保存当前 patterns / fonts 视图的选中状态。
    if (PM.state.currentH1 === 'patterns' || PM.state.currentH1 === 'fonts') {
      PM.state.tabH2State[PM.state.currentH1] = PM.state.selectedH2;
      PM.state.tabH3State[PM.state.currentH1] = PM.state.editingH3;
    }

    PM.state.currentH1 = tab;

    // 再次回到 patterns / fonts 时还原之前保存的视图。
    if (tab === 'patterns' || tab === 'fonts') {
      PM.state.selectedH2 = PM.state.tabH2State[tab];
      PM.state.editingH3 = PM.state.tabH3State[tab];
    } else {
      PM.state.selectedH2 = null;
      PM.state.editingH3 = null;
    }

    document.querySelectorAll('.h1-tab').forEach(t => {
      t.classList.remove('active');
      t.classList.remove('just-activated');
    });
    if (el) {
      el.classList.add('active');
      // 每次切换一级标签时都重新播放标签高亮动画。
      // 动画播放结束后立即移除该类，以便下次点击可以重新播放。
      // 动画播放结束后立即移除该类，以便下次点击可以重新播放。
      void el.offsetWidth;
      el.classList.add('just-activated');
      setTimeout(function () { el.classList.remove('just-activated'); }, 650);
    }
    document.body.classList.toggle('mode-welcome', false);
    document.body.classList.toggle('mode-explorer', tab === 'explorer');
    document.body.classList.toggle('mode-models', tab === 'models');
    document.body.classList.toggle('mode-pack-settings', tab === 'pack-settings');
    // 切换标签时确保隐藏欢迎屏。
    PM.fns.hideWelcome();

    PM.fns.$('h2SidebarTitle').textContent =
      tab === 'patterns' ? PM.fns.t('pm.h2.patterns') :
      tab === 'fonts' ? PM.fns.t('pm.h2.fonts') :
      tab === 'models' ? PM.fns.t('pm.h2.models') :
      tab === 'pack-settings' ? PM.fns.t('pm.h2.settings') : PM.fns.t('pm.h2.explorer');

    if (tab === 'explorer') {
      PM.state.editingH3 = null;
      PM.fns.enterExplorerMode();
      return;
    }
    if (tab === 'models') {
      PM.state.editingH3 = null;
      PM.fns.enterModelsMode();
      return;
    }
    if (tab === 'pack-settings') {
      PM.state.editingH3 = null;
      PM.fns.enterPackSettingsMode();
      return;
    }
    PM.fns.$('explorerView').style.display = 'none';
    PM.fns.$('modelsView').style.display = 'none';
    PM.fns.$('packSettingsView').style.display = 'none';
    PM.fns.$('h3SectionsArea').style.display = '';
    PM.fns.$('rightPanel').style.display = '';
    PM.fns.$('rightPanel').classList.remove('collapsed');
    renderFileBrowser();
    renderH2List();
    const cats = getCurrentCategories();
    if (cats.length > 0 && (PM.state.selectedH2 === null || PM.state.selectedH2 >= cats.length)) {
      PM.state.selectedH2 = 0;
      renderH2List();
      renderH3Area();
    } else if (PM.state.selectedH2 !== null) renderH3Area();
    else showNoCategory();
    // 重放 patterns / fonts 主面板的淡入上移动画。
    pmReplayViewFade(PM.fns.$('h3SectionsArea'));
  }

  PM.fns.switchH1Tab = switchH1Tab;

  function pmReplayViewFade(el) {
    if (!el) return;
    el.classList.remove('view-fade-in');
    void el.offsetWidth;
    el.classList.add('view-fade-in');
  }

  PM.fns.pmReplayViewFade = pmReplayViewFade;

  function showNoCategory() {
    PM.fns.$('h3MainHeader').style.display = 'none';
    PM.fns.$('noCategoryOverlay').style.display = '';
  }

  PM.fns.showNoCategory = showNoCategory;

  function renderFileBrowser() {
    const cont = PM.fns.$('fileBrowser');
    if (!cont) return;
    if (Object.keys(PM.state.fileMap).length === 0) {
      const emptyText = PM.fns.t('status.noFiles');
      cont.innerHTML = `<div style="padding:12px;text-align:center;color:#484f58;font-size:12px">${emptyText}</div>`;
      return;
    }
    const tree = PM.fns.buildFileTree();
    cont.innerHTML = `<ul class="file-tree" style="padding:6px 0;margin:0">${renderFileBrowserNode(tree, '')}</ul>`;
  }

  PM.fns.renderFileBrowser = renderFileBrowser;

  function renderFileBrowserNode(node, basePath) {
    const folderNames = Object.keys(node._children).sort();
    const files = node._files.slice().sort();
    let html = '';
    folderNames.forEach(name => {
      const childPath = basePath ? basePath + '/' + name : name;
      const subHtml = renderFileBrowserNode(node._children[name], childPath);
      const isExpanded = PM.state.expandedTreeFolders.has(childPath);
      html += `<li class="tree-folder${isExpanded ? '' : ' collapsed'}">
        <div class="tree-item" data-tree-path="${PM.fns.escapeAttr(childPath)}" onclick="toggleFileBrowserFolder(this)">
          <span class="tree-toggle">▾</span>
          <span class="tree-icon folder">📁</span>
          <span class="tree-label">${PM.fns.escapeHtml(name)}</span>
        </div>
        <ul class="tree-children" style="list-style:none;padding-left:14px;margin:0">${subHtml}</ul>
      </li>`;
    });
    files.forEach(name => {
      const fullPath = basePath ? basePath + '/' + name : name;
      const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
      let iconCls = 'plain', iconChar = '📄';
      if (['png','jpg','jpeg','gif','bmp','webp'].includes(ext)) { iconCls = 'image'; iconChar = '🖼'; }
      else if (ext === 'json') { iconCls = 'json'; iconChar = '📋'; }
      else if (['ttf','otf','woff','woff2'].includes(ext)) { iconCls = 'font'; iconChar = '🔤'; }
      else if (ext === 'mcmeta') { iconCls = 'plain'; iconChar = '⚙'; }
      html += `<li>
        <div class="tree-item" title="${PM.fns.escapeHtml(fullPath)}">
          <span class="tree-toggle" style="visibility:hidden">·</span>
          <span class="tree-icon ${iconCls}">${iconChar}</span>
          <span class="tree-label">${PM.fns.escapeHtml(name)}</span>
        </div>
      </li>`;
    });
    return html;
  }

  PM.fns.renderFileBrowserNode = renderFileBrowserNode;

  function toggleFileBrowserFolder(item) {
    const folder = item.parentElement;
    if (!folder || !folder.classList.contains('tree-folder')) return;
    const isCollapsed = folder.classList.toggle('collapsed');
    // 保存路径，使再次渲染时恢复展开状态。
    const path = item.getAttribute('data-tree-path');
    if (path) {
      if (isCollapsed) PM.state.expandedTreeFolders.delete(path);
      else PM.state.expandedTreeFolders.add(path);
    }
  }

  PM.fns.toggleFileBrowserFolder = toggleFileBrowserFolder;

  function renderH2List() {
    const cats = getCurrentCategories();
    const list = PM.fns.$('h2List');
    if (!list) return;
    if (cats.length === 0) {
      list.innerHTML = `<div style="padding:16px;color:#484f58;font-size:12px;text-align:center">${PM.fns.escapeHtml(PM.fns.t('status.noFolders'))}</div>`;
      return;
    }
    list.innerHTML = cats.map((c, i) => `
      <div class="h2-item ${i === PM.state.selectedH2 ? 'active' : ''}" onclick="selectH2(${i})">
        <span class="h2-icon">🗂</span>
        <span class="h2-name">${PM.fns.escapeHtml(c.name || c.id)}</span>
        <span class="h2-count">${(c.sections || []).length}</span>
        <div class="h2-actions">
          <button class="h2-act-btn" onclick="event.stopPropagation();editH2(${i})" title="${PM.fns.escapeHtml(PM.fns.t('pm.h2.action.editTitle'))}">✏</button>
          <button class="h2-act-btn danger" onclick="event.stopPropagation();deleteH2(${i})" title="${PM.fns.escapeHtml(PM.fns.t('pm.h2.action.deleteTitle'))}">🗑</button>
        </div>
      </div>`).join('');
  }

  PM.fns.renderH2List = renderH2List;

  function selectH2(idx) {
    PM.state.selectedH2 = idx;
    renderH2List();
    renderH3Area();
    // 内联视图刷新，确保切回分类能看到最新的文件/字体列表（避免缓存陈旧数据）。
    // 这里只渲染网格/列表内容，不修改 PM.state.editingH3，避免用户看到卡片闪烁展开。
    const cat = getCurrentCategories()[PM.state.selectedH2];
    if (cat && Array.isArray(cat.sections) && cat.sections.length > 0) {
      const targetIdx = (PM.state.editingH3 !== null && cat.sections[PM.state.editingH3]) ? PM.state.editingH3 : 0;
      const activeSub = cat.sections[targetIdx]._activeSubFolder;
      setTimeout(() => {
        const c2 = getCurrentCategories()[PM.state.selectedH2];
        if (!c2 || !c2.sections[targetIdx]) return;
        const s0 = c2.sections[targetIdx];
        if (s0.isFontMode) openFontListInline(targetIdx, activeSub === undefined ? undefined : (activeSub || null));
        else openSectionImageBrowserInline(targetIdx, activeSub === undefined ? undefined : (activeSub || null));
      }, 0);
    }
  }

  PM.fns.selectH2 = selectH2;

  function renderH3Area() {
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || PM.state.selectedH2 >= cats.length) { showNoCategory(); return; }
    const cat = cats[PM.state.selectedH2];
    PM.fns.$('noCategoryOverlay').style.display = 'none';
    PM.fns.$('h3MainHeader').style.display = '';
    PM.fns.$('h3MainTitle').textContent = cat.name || cat.id;
    PM.fns.$('h3MainSubtitle').textContent = `Namespace: ${cat.ns || 'minecraft'} · Path: ${cat.basePath || ''}`;
    PM.fns.$('h3SectionsArea').style.display = '';

    // 从已保存数据渲染提示 UI
    PM.fns.$('h3HintInput').value = cat.hint || '';
    const hintEnabled = cat.hintEnabled !== false;
    PM.fns.$('h3MainHint').classList.toggle('collapsed', !hintEnabled);
    PM.fns.$('h3HintToggle').classList.toggle('expanded', hintEnabled);

    // ── 普通 ui_definitions 分类（区块） ────────────────────

    // 把所有已保存的区块渲染成 H3 卡片。
    const sections = cat.sections || [];
    const empty = PM.fns.$('h3Empty');
    const list = PM.fns.$('h3CardsList');
    if (empty) empty.style.display = sections.length === 0 ? '' : 'none';
    // 始终清掉 enterExplorerMode / enterModelsMode / enterPackSettingsMode
    // 设置的行内 display，让卡片在切回本视图后正常显示。
    // 切换标签时确保隐藏欢迎屏。
    if (list) list.style.display = '';
    list.innerHTML = sections.map((s, i) => `
      <div class="h3-card ${i === PM.state.editingH3 ? 'editing' : ''}">
        <div class="h3-card-header" onclick="toggleH3Editing(${i})" title="点击展开/收起编辑面板">
          <span class="h3-card-num">${i + 1}</span>
          <span class="h3-card-title">${PM.fns.escapeHtml(s.name || PM.fns.t('pm.h3.sectionDefault', { idx: i + 1 }))}</span>
          <span class="h3-card-meta">${(s.isFontMode ? (s.fontList || []).length : (s.entries || []).length) + (s.isFontMode ? ' ' + PM.fns.t('pm.mode.fontCount') : ' entries')}</span>
          <div class="h3-card-actions">
            <button class="h2-act-btn" onclick="event.stopPropagation();moveH3(${i}, -1)" title="${PM.fns.escapeHtml(PM.fns.t('pm.card.moveUp'))}" ${i === 0 ? 'disabled' : ''}>▲</button>
            <button class="h2-act-btn" onclick="event.stopPropagation();moveH3(${i}, 1)" title="${PM.fns.escapeHtml(PM.fns.t('pm.card.moveDown'))}" ${i === sections.length - 1 ? 'disabled' : ''}>▼</button>
            <button class="h2-act-btn danger" onclick="event.stopPropagation();deleteH3(${i})" title="${PM.fns.escapeHtml(PM.fns.t('action.delete'))}">🗑</button>
          </div>
        </div>
        <div class="h3-card-body">
          <div class="card-form-row">
            <label>${PM.fns.escapeHtml(PM.fns.t('pm.card.blockTitle'))}</label>
            <input type="text" value="${PM.fns.escapeHtml(s.name || '')}" oninput="updateH3Field(${i}, 'name', this.value)" placeholder="${PM.fns.escapeHtml(PM.fns.t('pm.h3.block.namePlaceholder'))}">
          </div>
          <div class="card-form-row">
            <label>${PM.fns.escapeHtml(PM.fns.t('pm.card.blockDesc'))}</label>
            <input type="text" value="${PM.fns.escapeHtml(s.description || '')}" oninput="updateH3Field(${i}, 'description', this.value)" placeholder="${PM.fns.escapeHtml(PM.fns.t('pm.h3.block.descPlaceholder'))}">
          </div>
          <div class="card-form-row card-form-row-with-btn">
            <label>${PM.fns.escapeHtml(s.isFontMode ? PM.fns.t('pm.h3.block.nsLabel') : PM.fns.t('pm.h3.block.pathLabel'))}</label>
            <div style="display:flex;gap:6px;flex:1">
              <input type="text" value="${PM.fns.escapeHtml(s.isFontMode ? (s.basePath ? s.basePath.split(':')[0] : '') : (s.basePath || ''))}" oninput="updateH3Field(${i}, 'basePath', this.value)" placeholder="${PM.fns.escapeHtml(s.isFontMode ? PM.fns.t('pm.h3.block.basePathPlaceholderFonts') : PM.fns.t('pm.h3.block.basePathPlaceholderPatterns'))}" id="basePathInput-${i}">
              <button type="button" class="btn btn-secondary btn-sm" onclick="openSectionImageBrowser(${i})" title="${PM.fns.escapeHtml(PM.fns.t('pm.card.openInExplorer'))}">📁 ${PM.fns.escapeHtml(PM.fns.t('action.openFolder'))}</button>
              ${!s.isFontMode ? `<button type="button" class="btn btn-secondary btn-sm" onclick="openPickPathModal(${i})" title="${PM.fns.escapeHtml(PM.fns.t('pm.card.pickPathTitle'))}">📂 ${PM.fns.escapeHtml(PM.fns.t('pm.card.pickPathBtn'))}</button>` : ''}
            </div>
          </div>

          ${s.isFontMode ? `
          <div class="card-form-hint-full">
            <strong>${PM.fns.escapeHtml(PM.fns.t('pm.card.fontListHint'))}</strong>${PM.fns.escapeHtml(PM.fns.t('pm.card.fontListHintBody'))}
          </div>
          <label class="toggle-row" style="margin-left:120px">
            <span class="toggle-label-text">${PM.fns.escapeHtml(PM.fns.t('pm.card.useSubfolders'))}</span>
            <span class="toggle-switch">
              <input type="checkbox" ${s.useSubfolders ? 'checked' : ''} onchange="updateH3Field(${i}, 'useSubfolders', this.checked)">
              <span class="toggle-slider"></span>
            </span>
          </label>
          <div class="card-form-row">
            <label>${PM.fns.escapeHtml(PM.fns.t('pm.card.filterMode'))}</label>
            <select onchange="updateH3Field(${i}, 'filterMode', this.value)">
              <option value="NONE" ${(s.filterMode || 'NONE') === 'NONE' ? 'selected' : ''}>${PM.fns.escapeHtml(PM.fns.t('pm.filterOption.NONE'))}</option>
              <option value="WHITELIST" ${s.filterMode === 'WHITELIST' ? 'selected' : ''}>${PM.fns.escapeHtml(PM.fns.t('pm.filterOption.WHITELIST'))}</option>
              <option value="BLACKLIST" ${s.filterMode === 'BLACKLIST' ? 'selected' : ''}>${PM.fns.escapeHtml(PM.fns.t('pm.filterOption.BLACKLIST'))}</option>
            </select>
          </div>
          <div class="expanded-images-tabs" id="subFolderTabs-${i}"></div>
          <div class="image-browser-wrap" id="imageBrowserWrap-${i}">
            <div class="font-list-vertical" id="fontList-${i}">
              <div class="font-list-empty">${PM.fns.escapeHtml(PM.fns.t('pm.card.fontEmpty'))}</div>
            </div>
            <div class="drop-zone" id="fontDropZone-${i}" data-section-idx="${i}"
                 ondragover="handleDropZoneDragOver(event)" ondragleave="handleDropZoneDragLeave(event)" ondrop="handleFontDrop(event, ${i})">
              <input type="file" class="drop-zone-input" id="fontDropInput-${i}" multiple
                     accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf"
                     onchange="handleFontDropInput(event, ${i})">
              <div class="drop-zone-icon">🔤</div>
              <div class="drop-zone-text"><strong>${PM.fns.escapeHtml(PM.fns.t('pm.card.dropzoneClick'))}</strong>${PM.fns.escapeHtml(PM.fns.t('pm.card.fontDropzone'))}</div>
              <div class="drop-zone-hint">${PM.fns.escapeHtml(PM.fns.t('pm.card.fontDropzoneHint'))}</div>
            </div>
          </div>
          ` : `
          <div class="card-form-hint-full">
            <strong>${PM.fns.escapeHtml(PM.fns.t('pm.card.patternListHint'))}</strong>${PM.fns.escapeHtml(PM.fns.t('pm.card.patternListHintBody'))}
          </div>
          <label class="toggle-row" style="margin-left:120px">
            <span class="toggle-label-text">${PM.fns.escapeHtml(PM.fns.t('pm.card.useSubfolders'))}</span>
            <span class="toggle-switch">
              <input type="checkbox" ${s.useSubfolders ? 'checked' : ''} onchange="updateH3Field(${i}, 'useSubfolders', this.checked)">
              <span class="toggle-slider"></span>
            </span>
          </label>
          <div class="card-form-row">
            <label>${PM.fns.escapeHtml(PM.fns.t('pm.card.filterMode'))}</label>
            <select onchange="updateH3Field(${i}, 'filterMode', this.value)">
              <option value="NONE" ${(s.filterMode || 'NONE') === 'NONE' ? 'selected' : ''}>${PM.fns.escapeHtml(PM.fns.t('pm.filterOption.NONE'))}</option>
              <option value="WHITELIST" ${s.filterMode === 'WHITELIST' ? 'selected' : ''}>${PM.fns.escapeHtml(PM.fns.t('pm.filterOption.WHITELIST'))}</option>
              <option value="BLACKLIST" ${s.filterMode === 'BLACKLIST' ? 'selected' : ''}>${PM.fns.escapeHtml(PM.fns.t('pm.filterOption.BLACKLIST'))}</option>
            </select>
          </div>
          <div class="image-browser-wrap" id="imageBrowserWrap-${i}">
            <div class="expanded-images-tabs" id="subFolderTabs-${i}"></div>
            <div class="image-grid" id="imageGrid-${i}"></div>
            <div class="drop-zone" id="imgDropZone-${i}" data-section-idx="${i}"
                 ondragover="handleDropZoneDragOver(event)" ondragleave="handleDropZoneDragLeave(event)" ondrop="handleImgDrop(event, ${i})">
              <input type="file" class="drop-zone-input" id="imgDropInput-${i}" multiple
                     accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,.png,.jpg,.jpeg,.gif,.webp"
                     onchange="handleImgDropInput(event, ${i})">
              <div class="drop-zone-icon">🖼</div>
              <div class="drop-zone-text"><strong>${PM.fns.escapeHtml(PM.fns.t('pm.card.dropzoneClick'))}</strong>${PM.fns.escapeHtml(PM.fns.t('pm.card.imgDropzone'))}</div>
              <div class="drop-zone-hint">${PM.fns.escapeHtml(PM.fns.t('pm.card.imgDropzoneHint'))}</div>
            </div>
          </div>
          `}
        </div>
      </div>
    `).join('');

    // 重放卡片入场动画。class 移除后强制重排再重新添加，无论用户切换分类、新增区块还是重新加载资源包，都会重新播放同一动画。
    if (list) {
      list.classList.remove('cards-anim-in');
      void list.offsetWidth;
      list.classList.add('cards-anim-in');
    }

    // 重新渲染后，如果卡片刚展开，触发内联浏览器，让用户立刻看到所选子文件夹中的图片 / 字体（若没有子文件夹则显示默认目录）。
    // 否则 H3 卡片渲染出空白图片网格，用户必须重新展开才能看到内容。
    // 展开后还得手动展开或切换过滤模式才能看到内容，体验很差。
    if (PM.state.editingH3 !== null && cats[PM.state.selectedH2] && cats[PM.state.selectedH2].sections[PM.state.editingH3]) {
      const activeIdx = PM.state.editingH3;
      setTimeout(() => {
        if (PM.state.editingH3 !== activeIdx) return;
        const c2 = getCurrentCategories();
        if (!c2[PM.state.selectedH2] || !c2[PM.state.selectedH2].sections[activeIdx]) return;
        const s2 = c2[PM.state.selectedH2].sections[activeIdx];
        if (s2.isFontMode) openFontListInline(activeIdx);
        else openSectionImageBrowserInline(activeIdx);
      }, 0);
    }
  }

  PM.fns.renderH3Area = renderH3Area;

  function resolveSectionFolder(section, cat, subFolderName) {
    const ns = (cat && cat.ns) || 'minecraft';

    if (section && section.isFontMode) {
      let fontNs = (section.basePath ? section.basePath.split(':')[0] : ns) || 'minecraft';
      const parts = ['assets', fontNs, 'font'];
      if (subFolderName) parts.push(subFolderName);
      return parts.join('/');
    }

    let bp = (section && section.basePath) || (cat && cat.basePath) || 'textures/signs';
    // 如果存在，去掉前导的 "<ns>:" 命名空间前缀
    const colon = bp.indexOf(':');
    if (colon >= 0) bp = bp.slice(colon + 1);
    bp = bp.replace(/^\/+|\/+$/g, '');
    const parts = ['assets', ns, bp];
    if (subFolderName) parts.push(subFolderName);
    return parts.join('/');
  }

  PM.fns.resolveSectionFolder = resolveSectionFolder;

  async function listImagesInFolder(folderPath) {
    if (PM.state.folderFileCache[folderPath] !== undefined) return PM.state.folderFileCache[folderPath];
    if (!PM.state.zip) return [];
    const imageExt = /\.(png|jpg|jpeg|gif|bmp|webp)$/i;
    const result = [];
    const seen = new Set();
    const prefix = folderPath + '/';
    for (const p of Object.keys(PM.state.fileMap)) {
      if (!p.toLowerCase().startsWith(prefix.toLowerCase())) continue;
      const remainder = p.slice(prefix.length);
      if (remainder.indexOf('/') >= 0) continue; // 仅直接子级
      if (!imageExt.test(p)) continue;
      const baseName = remainder;
      const stem = baseName.replace(/\.[^.]+$/, '');
      if (seen.has(stem)) continue;
      seen.add(stem);
      let url = PM.state.imageUrlCache.get(p);
      if (!url) {
        try {
          const blob = await PM.state.zip.file(p).async('blob');
          url = URL.createObjectURL(blob);
          PM.state.imageUrlCache.set(p, url);
        } catch (_) { continue; }
      }
      result.push({ name: baseName, path: p, url, stem });
    }
    PM.state.folderFileCache[folderPath] = result;
    return result;
  }

  PM.fns.listImagesInFolder = listImagesInFolder;

  async function openSectionImageBrowser(idx, subFolderName) {
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    const cat = cats[PM.state.selectedH2];

    // 在资源包 PM.state.zip 中解析出绝对的文件夹路径。
    let targetFolder = subFolderName;
    if (targetFolder === undefined) {
      targetFolder = (section.subFolders && section.subFolders.length)
        ? section.subFolders[0].dirName
        : null;
    }
    const folderPath = resolveSectionFolder(section, cat, targetFolder || null);

    // 跳转到资源包浏览标签页并导航到对应文件夹，方便用户直接浏览、上传或重命名文件。
    switchH1Tab('explorer', document.querySelector('.h1-tab[data-tab="explorer"]'));
    // 用 setTimeout 确保浏览器视图先挂载好再触发导航，否则首次点击分类的"打开"按钮会跳转到陈旧的 PM.state.explorerPath。
    setTimeout(() => PM.fns.navigateExplorer(folderPath), 0);
  }

  PM.fns.openSectionImageBrowser = openSectionImageBrowser;

  async function openSectionImageBrowserInline(idx, subFolderName) {
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    const cat = cats[PM.state.selectedH2];

    // 只有当参数完全未提供时（undefined）才走默认值。
    let targetFolder;
    if (subFolderName === undefined) {
      targetFolder = (section.subFolders && section.subFolders.length)
        ? section.subFolders[0].dirName
        : null;
    } else {
      targetFolder = subFolderName || null;
    }

    const folderPath = resolveSectionFolder(section, cat, targetFolder || null);
    const grid = PM.fns.$('imageGrid-' + idx);
    const wrap = PM.fns.$('imageBrowserWrap-' + idx);
    if (!grid) return;
    if (wrap) wrap.style.display = '';
    grid.innerHTML = `<div class="image-grid-empty">${PM.fns.escapeHtml(PM.fns.t('pm.grid.loading'))}</div>`;

    const images = await listImagesInFolder(folderPath);
    // 记住当前激活的子文件夹，方便标签高亮。
    section._activeSubFolder = targetFolder || null;

    if (images.length === 0) {
      grid.innerHTML = `<div class="image-grid-empty">${PM.fns.t('pm.grid.emptyAtPath', { path: PM.fns.escapeHtml(folderPath) })}</div>`;
      renderSubFolderTabs(idx);
      return;
    }
    const filterList = section.filterList || [];
    const filterMode = section.filterMode || 'NONE';
    grid.innerHTML = images.map(img => {
      // WHITELIST / BLACKLIST 中存的是带扩展名的完整文件名（例如 "logo.png"），
      // 因为这是 mod 期望的格式。
      // 比较时用 img.name（带扩展名），让预加载的白名单项首次打开时
      // 就显示为已选中。
      const selected = filterList.indexOf(img.name) >= 0;
      // 过滤模式 NONE：仅预览，不显示复选框 / 不绑定点击。
      if (filterMode === 'NONE') {
        return `<div class="image-thumb filter-mode" title="${PM.fns.escapeHtml(img.path)}">
          <img src="${img.url}" alt="${PM.fns.escapeHtml(img.name)}" loading="lazy">
          <div class="image-thumb-name">${PM.fns.escapeHtml(img.stem)}</div>
        </div>`;
      }
      // 白名单 / 黑名单：显示与模式对应的复选框按钮。
      const modeLabel = filterMode === 'WHITELIST' ? PM.fns.t('pm.mode.whitelist') : PM.fns.t('pm.mode.blacklist');
      const actionLabel = selected ? PM.fns.t('pm.mode.removeFrom', { label: modeLabel }) : PM.fns.t('pm.mode.addTo', { label: modeLabel });
      const cls = 'image-thumb filter-mode filter-' + filterMode.toLowerCase() + (selected ? ' selected' : '');
      return `<div class="${cls}" title="${PM.fns.escapeHtml(img.path)}">
        <img src="${img.url}" alt="${PM.fns.escapeHtml(img.name)}" loading="lazy">
        <div class="image-thumb-name">${PM.fns.escapeHtml(img.stem)}</div>
        <button type="button" class="img-filter-btn ${selected ? 'active' : ''}"
                onclick="toggleImageFilter(${idx}, '${PM.fns.escapeAttr(img.name)}')"
                title="${actionLabel}">${selected ? '✓ ' + actionLabel : '+ ' + actionLabel}</button>
      </div>`;
    }).join('');
    renderSubFolderTabs(idx);
  }

  PM.fns.openSectionImageBrowserInline = openSectionImageBrowserInline;

  function renderSubFolderTabs(idx) {
    const tabsEl = PM.fns.$('subFolderTabs-' + idx);
    if (!tabsEl) return;
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    const subs = section.subFolders || [];
    const isFontMode = !!section.isFontMode;
    const active = section._activeSubFolder || null;

    if (!section.useSubfolders) {
      tabsEl.classList.remove('expanded-images-tabs');
      tabsEl.innerHTML = '';
      return;
    }

    if (subs.length === 0) {
      tabsEl.classList.add('expanded-images-tabs');
      tabsEl.innerHTML = `
        <div class="expanded-images-tab active" title="${PM.fns.escapeHtml(PM.fns.t('pm.subfolder.defaultFolder'))}">
          <span class="expanded-images-tab-label">📁 ${PM.fns.escapeHtml(PM.fns.t('pm.subfolder.default'))}</span>
        </div>
        <button type="button" class="expanded-images-tab-add" onclick="openAddSFModal(${idx})" title="${PM.fns.escapeHtml(PM.fns.t('pm.subfolder.addTab'))}">+</button>
      `;
      return;
    }

    tabsEl.classList.add('expanded-images-tabs');
    const tabsHtml = subs.map((sf, k) => {
      const dirName = (sf && sf.dirName) || '';
      const display = (sf && sf.displayName) || dirName || PM.fns.t('pm.folderDefault', { idx: k + 1 });
      const isActive = active === dirName || (!active && k === 0);
      const clickFn = isFontMode
        ? `openFontListInline(${idx}, '${PM.fns.escapeAttr(dirName)}')`
        : `openSectionImageBrowserInline(${idx}, '${PM.fns.escapeAttr(dirName)}')`;
      return `<div class="expanded-images-tab ${isActive ? 'active' : ''}" data-dir="${PM.fns.escapeAttr(dirName)}">
        <span class="expanded-images-tab-label" onclick="${clickFn}" title="${PM.fns.escapeHtml(dirName)}">📁 ${PM.fns.escapeHtml(display)}</span>
        <span class="expanded-images-tab-edit" onclick="openEditSFModal(${idx}, ${k})" title="${PM.fns.escapeHtml(PM.fns.t('pm.subfolder.editTab'))}">✏</span>
        <span class="expanded-images-tab-close" onclick="removeSubFolderTab(${idx}, ${k})" title="${PM.fns.escapeHtml(PM.fns.t('pm.subfolder.removeTab'))}">×</span>
      </div>`;
    }).join('');
    const addBtn = `<button type="button" class="expanded-images-tab-add" onclick="openAddSFModal(${idx})" title="${PM.fns.escapeHtml(PM.fns.t('pm.subfolder.addTab'))}">+</button>`;
    tabsEl.innerHTML = tabsHtml + addBtn;
  }

  PM.fns.renderSubFolderTabs = renderSubFolderTabs;

  function removeSubFolderTab(idx, k) {
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section || !Array.isArray(section.subFolders)) return;
    // 如果正在删除当前激活的标签，清除激活标记，下次渲染会回退到第一个剩余的标签。
    const removed = section.subFolders[k];
    if (removed && removed.dirName === section._activeSubFolder) {
      section._activeSubFolder = null;
    }
    section.subFolders.splice(k, 1);
    renderSubFolderTabs(idx);
    // 刷新底层网格/列表，让用户看到新的默认文件夹。
    if (section.isFontMode) openFontListInline(idx);
    else openSectionImageBrowserInline(idx);
  }

  PM.fns.removeSubFolderTab = removeSubFolderTab;

  function buildFontRowHTML(f, idx, filterList, filterMode) {
    // 白名单 / 黑名单 存的是带扩展名的完整文件名（例如 "logo.png" 或 "my_font.ttf"），因为这是 mod 期望的格式。比较时用 f.name（带扩展名），让预加载的白名单项首次打开时实际显示为已选中。
    const selected = filterList.indexOf(f.name) >= 0;
    const rowCls = 'font-row' +
      (filterMode !== 'NONE' ? ' filter-mode filter-' + filterMode.toLowerCase() : '') +
      (selected ? ' selected' : '') +
      (!f.hasFile ? ' font-row-registry' : '');
    const filterBtn = (filterMode === 'WHITELIST' || filterMode === 'BLACKLIST')
      ? (() => {
          const modeLabel = filterMode === 'WHITELIST' ? PM.fns.t('pm.mode.whitelist') : PM.fns.t('pm.mode.blacklist');
          const actionLabel = selected ? PM.fns.t('pm.mode.removeFrom', { label: modeLabel }) : PM.fns.t('pm.mode.addTo', { label: modeLabel });
          return `<button type="button" class="font-filter-btn ${selected ? 'active' : ''}"
                  onclick="toggleFontFilter(${idx}, '${PM.fns.escapeAttr(f.name)}')"
                  title="${actionLabel}">${selected ? '✓ ' + actionLabel : '+ ' + actionLabel}</button>`;
        })()
      : '';

    // stem 是 section.fontList 查询时使用的稳定键，传给重命名 / 删除处理函数，
    // 以便它们能定位到对应的 fontList 条目。
    const stemAttr = PM.fns.escapeAttr(f.stem);

    // 物理字体与仅注册项共用的三个红色操作按钮。
    const jsonBtn = f.hasFile
      ? `<button type="button" class="font-row-btn font-row-btn-red" onclick="openFontJsonInline(${idx}, ${f._k}, '${PM.fns.escapeAttr(f.path)}')" title="编辑字体 JSON 配置">JSON</button>`
      : `<button type="button" class="font-row-btn font-row-btn-red" onclick="openRegistryFontJsonEditor(${idx}, '${PM.fns.escapeAttr(f.fontId || f.stem)}')" title="${PM.fns.escapeHtml(PM.fns.t('pm.card.editFontJson'))}">JSON</button>`;
    const renameBtn = `<button type="button" class="font-row-btn font-row-btn-red" onclick="openRenameFontModal(${idx}, '${stemAttr}')" title="${PM.fns.escapeHtml(PM.fns.t('pm.card.renameFont'))}">${PM.fns.escapeHtml(PM.fns.t('pm.card.renameBtn'))}</button>`;
    const deleteTitle = f.hasFile ? PM.fns.t('pm.card.deleteFontFile') : PM.fns.t('pm.card.removeFontFromBlock');
    const deleteBtn = `<button type="button" class="font-row-btn font-row-btn-red" onclick="deleteFontFromSection(${idx}, '${stemAttr}')" title="${deleteTitle}">${PM.fns.escapeHtml(PM.fns.t('action.delete'))}</button>`;
    const actionsHtml = `<div class="font-row-actions">${jsonBtn}${renameBtn}${deleteBtn}</div>`;

    if (f.hasFile) {
      return `<div class="${rowCls}" data-font-stem="${stemAttr}" data-font-path="${PM.fns.escapeAttr(f.path)}">
        <div class="font-row-line">
          <span class="font-row-label">${PM.fns.escapeHtml(PM.fns.t('pm.fontRow.label'))}</span>
          <span class="font-row-input" style="cursor:default;background:transparent;border:none;color:#e6edf3" data-role="display-name">${PM.fns.escapeHtml(f.displayName || f.name)}</span>
          ${actionsHtml}
        </div>
        <div class="font-row-line">
          <span class="font-row-label">路径</span>
          <span class="font-row-input" style="cursor:default;background:transparent;border:none;color:#79c0ff;font-family:monospace">${PM.fns.escapeHtml(f.path)}</span>
        </div>
        ${filterBtn}
      </div>`;
    } else {
      // 仅注册项（该文件夹内没有物理文件）——根据 fontId 派生 JSON 路径，
      // 这样用户依然可以编辑它的 providers。
      // 格式："ns:fontName" -> "assets/ns/font/fontName.json"
      const jsonPathForRegistry = f._jsonPath || '';
      return `<div class="${rowCls}" data-font-stem="${stemAttr}" data-font-path="" data-font-json="${PM.fns.escapeAttr(jsonPathForRegistry)}">
        <div class="font-row-line">
          <span class="font-row-label">${PM.fns.escapeHtml(PM.fns.t('pm.fontRow.label'))}</span>
          <span class="font-row-input" style="cursor:default;background:transparent;border:none;color:#e6edf3" data-role="display-name">${PM.fns.escapeHtml(f.displayName || f.name)}</span>
          ${actionsHtml}
        </div>
        <div class="font-row-line">
          <span class="font-row-label">Font ID</span>
          <span class="font-row-input" style="cursor:default;background:transparent;border:none;color:#79c0ff;font-family:monospace" data-role="font-id">${PM.fns.escapeHtml(f.fontId || f.stem)}</span>
        </div>
        ${filterBtn}
      </div>`;
    }
  }

  PM.fns.buildFontRowHTML = buildFontRowHTML;

  async function openFontListInline(idx, subFolderName) {
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    const cat = cats[PM.state.selectedH2];

    let targetFolder;
    if (subFolderName === undefined) {
      targetFolder = (section.subFolders && section.subFolders.length)
        ? section.subFolders[0].dirName
        : null;
    } else {
      targetFolder = subFolderName || null;
    }
    const folderPath = resolveSectionFolder(section, cat, targetFolder || null);
    const listEl = PM.fns.$('fontList-' + idx);
    const wrap = PM.fns.$('imageBrowserWrap-' + idx);
    if (wrap) wrap.style.display = '';
    section._activeSubFolder = targetFolder || null;

    if (listEl) listEl.innerHTML = `<div class="font-list-empty">${PM.fns.escapeHtml(PM.fns.t('pm.fontList.loading'))}</div>`;

    // 1) 加载文件夹中的物理字体文件。
    const folderFonts = await PM.fns.listFontsInFolder(folderPath);
    renderSubFolderTabs(idx);

    // 2) 构造一个由文件夹文件派生出的 stem 集合，避免重复。
    const folderStems = new Set(folderFonts.map(f => f.stem));

    // 3) 收集所有要展示的条目：文件夹字体 + section.fontList 中尚未被任何文件覆盖的条目。
    const sectionFontList = Array.isArray(section.fontList) ? section.fontList : [];
    const mergedFonts = [];

    // 先加入文件夹字体，如果 section.fontList 中有对应记录则补上 displayName。
    folderFonts.forEach((f, k) => {
      const regEntry = sectionFontList.find(rg => {
        const rgStem = (rg.fontId || rg.name || '').split('/').pop().split(':').pop().replace(/\.[^.]+$/, '');
        return rgStem === f.stem;
      });
      mergedFonts.push(Object.assign({}, f, {
        displayName: regEntry ? (regEntry.displayName || regEntry.name) : f.name,
        hasFile: true,
        _k: k
      }));
    });

    // 加入 section.fontList 中没有匹配文件夹文件的条目。
    sectionFontList.forEach(rg => {
      const fontId = rg.fontId || rg.name || '';
      const rgStem = fontId.split('/').pop().split(':').pop().replace(/\.[^.]+$/, '');
      if (!folderStems.has(rgStem)) {
        // 派生该字体应有的 JSON 路径："ns:fontName" → "assets/ns/font/fontName.json"。
        // 对于仅含名称的条目，回退使用分类的命名空间。
        let derivedJson = '';
        if (fontId.includes(':')) {
          const [ns, nameOnly] = fontId.split(':');
          const safeName = (nameOnly || rgStem).replace(/\.[^.]+$/, '');
          derivedJson = 'assets/' + ns + '/font/' + safeName + '.json';
        } else if (fontId) {
          const nsFallback = cat.ns || 'minecraft';
          const safeName = fontId.replace(/\.[^.]+$/, '');
          derivedJson = 'assets/' + nsFallback + '/font/' + safeName + '.json';
        }
        mergedFonts.push({
          name: rg.displayName || rg.name || fontId,
          displayName: rg.displayName || rg.name || fontId,
          fontId: fontId,
          stem: rgStem,
          path: '',
          _jsonPath: derivedJson,
          hasFile: false,
          _k: -1
        });
      }
    });

    if (!listEl) return;
    if (mergedFonts.length === 0) {
      // 完全没有字体——保持区域为空；下方的拖放区仍然允许用户上传新字体。
      listEl.innerHTML = '';
      return;
    }

    const filterList = section.filterList || [];
    const filterMode = section.filterMode || 'NONE';
    // 注意：filterMode 只控制每行的加入/移除筛选按钮。所有已发现的字体（文件夹文件 + section.fontList 条目）无论模式如何都保持可见，方便用户随时查看和编辑。
    listEl.innerHTML = mergedFonts.map(f => buildFontRowHTML(f, idx, filterList, filterMode)).join('');
  }

  PM.fns.openFontListInline = openFontListInline;

  function toggleH3Editing(idx) {
    if (PM.state.editingH3 === idx) {
      PM.state.editingH3 = null;
    } else {
      PM.state.editingH3 = idx;
    }
    renderH3Area();
    // 重新渲染后，如果卡片刚展开，触发内联浏览器，让用户立刻看到所选子文件夹中的图片 / 字体（若没有子文件夹则显示默认目录）。
    if (PM.state.editingH3 !== null) {
      // 延迟到下一帧再执行，确保新构建的 DOM 节点（imageGrid-idx
      // / fontList-idx / imageBrowserWrap-idx）已经挂载好再查询。如果没有这次延迟，首次展开白名单 / 黑名单分类时可能什么也渲染不出来，用户不得不切换筛选模式下拉来刷新。
      const trigger = () => {
        if (PM.state.editingH3 !== idx) return;
        const cats = getCurrentCategories();
        if (cats[PM.state.selectedH2] && cats[PM.state.selectedH2].sections[idx]) {
          const section = cats[PM.state.selectedH2].sections[idx];
          if (section.isFontMode) openFontListInline(idx);
          else openSectionImageBrowserInline(idx);
        }
      };
      trigger();
      // 延迟到下一帧再执行，确保新构建的 DOM 节点（imageGrid-idx
      // / fontList-idx / imageBrowserWrap-idx）已经挂载好再查询。
      // 这里用 requestAnimationFrame 代替 setTimeout(_, 0)，因为 rAF 在布局之后触发，
      // 正好是新节点真正可查询的最早时机；而 setTimeout 可能在慢设备上在布局完成前就执行了。
      requestAnimationFrame(trigger);
    }
  }

  PM.fns.toggleH3Editing = toggleH3Editing;

  function deleteH3(idx) {
    if (!confirm(PM.fns.t('confirm.deleteSection'))) return;
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    cats[PM.state.selectedH2].sections.splice(idx, 1);
    if (PM.state.editingH3 === idx) PM.state.editingH3 = null;
    if (PM.state.editingH3 !== null && PM.state.editingH3 > idx) PM.state.editingH3 -= 1;
    renderH3Area();
    renderH2List();
  }

  PM.fns.deleteH3 = deleteH3;

  function moveH3(idx, dir) {
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const arr = cats[PM.state.selectedH2].sections;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    const tmp = arr[idx];
    arr[idx] = arr[newIdx];
    arr[newIdx] = tmp;
    if (PM.state.editingH3 === idx) PM.state.editingH3 = newIdx;
    else if (PM.state.editingH3 === newIdx) PM.state.editingH3 = idx;
    renderH3Area();
  }

  PM.fns.moveH3 = moveH3;

  function updateH3Field(idx, field, value) {
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    section[field] = value;
    // 如果 name 字段变更，在原地更新卡片标题，保持卡片展开状态
    if (field === 'name') {
      const card = document.querySelector('.h3-cards-list .h3-card:nth-child(' + (idx + 1) + ') .h3-card-title')
                || document.querySelector('#h3CardsList .h3-card:nth-child(' + (idx + 1) + ') .h3-card-title');
      if (card) card.textContent = value || ('Section ' + (idx + 1));
    }
    if (field === 'basePath') {
      try { Object.keys(PM.state.folderFileCache).forEach(k => { delete PM.state.folderFileCache[k]; }); } catch (_) {}
    }
    // 当 useSubfolders 切换时立即重新渲染标签，使标签条显示或隐藏，避免整体重渲染卡片。
    // 同时重新触发内联浏览器，使底层网格/列表反映新的 useSubfolders 状态（否则要等用户再次展开卡片或切换标签才生效）。
    if (field === 'useSubfolders' || field === 'filterMode' || field === 'basePath') {
      renderSubFolderTabs(idx);
      const activeSub = section._activeSubFolder;
      if (section.isFontMode) openFontListInline(idx, activeSub === undefined ? undefined : (activeSub || null));
      else openSectionImageBrowserInline(idx, activeSub === undefined ? undefined : (activeSub || null));
    }
  }

  PM.fns.updateH3Field = updateH3Field;

  function updateH3SubFolders(idx, value) {
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    const names = value.split(',').map(s => s.trim()).filter(Boolean);
    section.subFolders = names.map(n => ({ dirName: n, displayName: n }));
  }

  PM.fns.updateH3SubFolders = updateH3SubFolders;

  function updateH3FilterList(idx, value) {
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    section.filterList = value.split(',').map(s => s.trim()).filter(Boolean);
  }

  PM.fns.updateH3FilterList = updateH3FilterList;

  function addH2() {
    PM.fns.openCatModal();
  }

  PM.fns.addH2 = addH2;

  function editH2(idx) {
    PM.fns.openCatModal(idx);
  }

  PM.fns.editH2 = editH2;

  function deleteH2(idx) {
    if (!confirm(PM.fns.t('confirm.deleteCategory'))) return;
    const cats = getCurrentCategories();

    const cat = cats[idx];
    if (cat && cat._sourcePath && PM.state.zip) {
      try {
        PM.state.zip.remove(cat._sourcePath);
        delete PM.state.fileMap[cat._sourcePath];
      } catch (e) {}
    }

    cats.splice(idx, 1);
    if (PM.state.selectedH2 === idx) PM.state.selectedH2 = null;
    if (PM.state.selectedH2 !== null && PM.state.selectedH2 > idx) PM.state.selectedH2 -= 1;
    renderH2List();
    renderH3Area();
  }

  PM.fns.deleteH2 = deleteH2;

  function addH3() {
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) {
      PM.fns.showToast(PM.fns.t('toast.selectCategory'), 'error');
      return;
    }
    const cat = cats[PM.state.selectedH2];
    if (!Array.isArray(cat.sections)) cat.sections = [];
    const isFontMode = PM.state.currentH1 === 'fonts';
    const ns = cat.ns || (isFontMode ? 'minecraft' : 'minecraft');
    const basePath = isFontMode
      ? ns
      : ((cat.basePath && cat.basePath.indexOf(':') < 0 ? (ns + ':' + cat.basePath) : cat.basePath) || 'textures/signs');
    const newSection = {
      name: '',
      description: '',
      title: '',
      basePath,
      useSubfolders: false,
      subFolders: [],
      filterMode: 'NONE',
      filterList: [],
      isFontMode,
      fontList: [],
      entries: []
    };
    cat.sections.push(newSection);
    // 自动展开新增的区块，方便用户填写
    PM.state.editingH3 = cat.sections.length - 1;
    renderH3Area();
    renderH2List();
    // 如果有滚动容器，把新卡片滚动到视野内
    setTimeout(() => {
      const list = PM.fns.$('h3CardsList');
      if (list && list.lastElementChild) {
        list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 0);
    // 触发内联浏览器，让用户立即看到新卡片内的图片 / 字体。
    if (newSection.isFontMode) openFontListInline(PM.state.editingH3);
    else openSectionImageBrowserInline(PM.state.editingH3);
    PM.fns.showToast(PM.fns.t('toast.blockAdded'), 'success');
  }

  PM.fns.addH3 = addH3;

  function toggleH3Hint() {
    const hint = PM.fns.$('h3MainHint');
    const toggle = PM.fns.$('h3HintToggle');
    if (!hint || !toggle) return;
    hint.classList.toggle('collapsed');
    toggle.classList.toggle('expanded');
  }

  PM.fns.toggleH3Hint = toggleH3Hint;

  function updateH3Hint(value) {
    // 保存提示文本到当前分类
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    cats[PM.state.selectedH2].hint = value;
  }

  PM.fns.updateH3Hint = updateH3Hint;

  function toggleImageFilter(idx, name) {
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    if (!Array.isArray(section.filterList)) section.filterList = [];
    const i = section.filterList.indexOf(name);
    if (i >= 0) section.filterList.splice(i, 1);
    else section.filterList.push(name);
    // 切换后，当条目出现在 filterList 中时即为选中状态。
    const nowSelected = section.filterList.indexOf(name) >= 0;
    const filterMode = section.filterMode || 'NONE';
    // 只重渲染对应的那张缩略图，不要重建整个区域，
    // 否则用户正在编辑的输入框会失去焦点。
    const cards = document.querySelectorAll('#imageGrid-' + idx + ' .image-thumb');
    cards.forEach(card => {
      const titleAttr = card.getAttribute('title') || '';
      const fileName = titleAttr.split('/').pop();
      if (fileName !== name) return;
      card.classList.toggle('selected', nowSelected);
      // 过滤模式下还要更新内联按钮的文字，让用户
      // 立即看到"添加 / 移除"的切换。
      if (filterMode === 'WHITELIST' || filterMode === 'BLACKLIST') {
        const btn = card.querySelector('.img-filter-btn');
        if (btn) {
          const modeLabel = filterMode === 'WHITELIST' ? '白名单' : '黑名单';
          const label = nowSelected ? ('从' + modeLabel + '移除') : ('添加到' + modeLabel);
          btn.textContent = nowSelected ? ('✓ ' + label) : ('+ ' + label);
          btn.title = label;
          btn.classList.toggle('active', nowSelected);
        }
      }
    });
  }

  PM.fns.toggleImageFilter = toggleImageFilter;

  function toggleFontFilter(idx, name) {
    const cats = getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    if (!Array.isArray(section.filterList)) section.filterList = [];
    const i = section.filterList.indexOf(name);
    if (i >= 0) section.filterList.splice(i, 1);
    else section.filterList.push(name);
    const nowSelected = section.filterList.indexOf(name) >= 0;
    const filterMode = section.filterMode || 'NONE';
    const rows = document.querySelectorAll('#fontList-' + idx + ' .font-row');
    rows.forEach(row => {
      // 根据 data-font-path 中存储的文件名（仅 basename）进行匹配。
      const rowPath = row.getAttribute('data-font-path') || '';
      const rowName = rowPath.split('/').pop();
      if (rowName !== name) return;
      row.classList.toggle('selected', nowSelected);
      if (filterMode === 'WHITELIST' || filterMode === 'BLACKLIST') {
        const btn = row.querySelector('.font-filter-btn');
        if (btn) {
          const modeLabel = filterMode === 'WHITELIST' ? '白名单' : '黑名单';
          const label = nowSelected ? ('从' + modeLabel + '移除') : ('添加到' + modeLabel);
          btn.textContent = nowSelected ? ('✓ ' + label) : ('+ ' + label);
          btn.title = label;
          btn.classList.toggle('active', nowSelected);
        }
      }
    });
  }

  PM.fns.toggleFontFilter = toggleFontFilter;

  function getCurrentCategories() {
    return PM.state.currentH1 === 'fonts' ? PM.state.fontsCategories : PM.state.patternsCategories;
  }

  PM.fns.getCurrentCategories = getCurrentCategories;

})();
