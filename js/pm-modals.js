

(function () {
  'use strict';

  // 全局 PM 命名空间（由 pm-state.js 首次定义，后续模块只读不重置）。
  if (typeof window.PM === 'undefined') {
    window.PM = { state: {}, fns: {} };
  }
  function openCatModal(editIdx) {
    PM.fns.$('catModalTitle').textContent = editIdx !== undefined ? '✏️ 编辑分类' : '🗂 新建分类';
    PM.fns.$('catModalConfirmBtn').textContent = editIdx !== undefined ? '保存' : '创建分类';
    PM.fns.$('catModal').dataset.editIdx = editIdx !== undefined ? editIdx : '';
    const basePathGroup = PM.fns.$('catBasePathGroup');
    if (basePathGroup) basePathGroup.style.display = (PM.state.currentH1 === 'fonts') ? 'none' : '';
    if (editIdx !== undefined) {
      const cats = PM.fns.getCurrentCategories();
      const c = cats[editIdx] || {};
      PM.fns.$('catName').value = c.name || '';
      PM.fns.$('catId').value = c.id || '';
      PM.fns.$('catNs').value = c.ns || 'my_pack';
      if (PM.state.currentH1 === 'fonts') {
        // 字体分类保留字段但不可见；强制写入默认的 'font'
        PM.fns.$('catBasePath').value = c.basePath || 'font';
      } else {
        PM.fns.$('catBasePath').value = c.basePath || 'textures/signs';
      }
    } else {
      PM.fns.$('catName').value = '';
      PM.fns.$('catId').value = '';
      PM.fns.$('catNs').value = 'my_pack';
      PM.fns.$('catBasePath').value = (PM.state.currentH1 === 'fonts') ? 'font' : 'textures/signs';
    }
    PM.fns.$('catModal').classList.add('is-open');
    setTimeout(() => PM.fns.$('catName').focus(), 30);
  }

  PM.fns.openCatModal = openCatModal;

  function closeCatModal() {
    PM.fns.$('catModal').classList.remove('is-open');
  }

  PM.fns.closeCatModal = closeCatModal;

  function confirmCatModal() {
    const name = PM.fns.$('catName').value.trim();
    if (!name) { PM.fns.showToast(PM.fns.t('toast.enterCategoryName'), 'error'); PM.fns.$('catName').focus(); return; }
    let id = PM.fns.$('catId').value.trim();
    if (!id) id = PM.fns.slugify(name);
    const ns = PM.fns.$('catNs').value.trim() || 'my_pack';
    const basePath = (PM.state.currentH1 === 'fonts')
      ? 'font'
      : (PM.fns.$('catBasePath').value.trim() || 'textures/signs');
    const editIdx = PM.fns.$('catModal').dataset.editIdx;
    const cats = PM.fns.getCurrentCategories();
    const entry = { id, name, ns, basePath, sections: [] };
    if (editIdx) {
      cats[parseInt(editIdx, 10)] = { ...cats[parseInt(editIdx, 10)], name, ns, basePath };
    } else {
      cats.push(entry);
      PM.state.selectedH2 = cats.length - 1;
    }
    closeCatModal();
    PM.fns.renderH2List();
    PM.fns.renderH3Area();
    PM.fns.showToast(PM.fns.t('toast.categorySaved'), 'success');
  }

  PM.fns.confirmCatModal = confirmCatModal;

  function openAddSFModal(idx) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    const modal = PM.fns.$('addSFModal');
    modal.dataset.sectionIdx = idx;
    modal.dataset.editK = '';
    modal.classList.add('is-open');
    PM.fns.$('addSFModalTitle').textContent = '📁 添加子文件夹标签';
    PM.fns.$('addSFConfirmBtn').textContent = '添加';
    // 显示候选文件夹列表和"输入新文件夹"提示——这两项只在
    // 新增子文件夹时才有意义。
    const foldersGroup = PM.fns.$('addSFFoldersListGroup');
    if (foldersGroup) foldersGroup.style.display = '';
    PM.fns.$('addSFNewDirLabel').textContent = '或输入新子文件夹名（不存在则自动新建）';
    PM.fns.$('addSFNewDirHint').textContent = '只能使用小写字母、数字、下划线。';
    PM.fns.$('addSFNewDir').readOnly = false;
    PM.fns.$('addSFNewDir').value = '';
    PM.fns.$('addSFDisplayName').value = '';
    populateAddSFFoldersList(idx);
    setTimeout(() => PM.fns.$('addSFNewDir').focus(), 0);
  }

  PM.fns.openAddSFModal = openAddSFModal;

  function openEditSFModal(idx, k) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section || !Array.isArray(section.subFolders)) return;
    const sf = section.subFolders[k];
    if (!sf) return;

    const modal = PM.fns.$('addSFModal');
    modal.dataset.sectionIdx = idx;
    modal.dataset.editK = String(k);
    modal.classList.add('is-open');
    PM.fns.$('addSFModalTitle').textContent = '✏ 编辑子文件夹标签';
    PM.fns.$('addSFConfirmBtn').textContent = '保存';
    // 隐藏"从现有文件夹选择"列表——这个选择器只在新增时有用。
    // 编辑模式下用户只是重命名条目。
    const foldersGroup = PM.fns.$('addSFFoldersListGroup');
    if (foldersGroup) foldersGroup.style.display = 'none';
    // 把 dirName 字段保留为只读，让用户看清哪个目录名对应
    // 资源包里的实际文件夹。
    PM.fns.$('addSFNewDirLabel').textContent = '子文件夹名（不可修改）';
    PM.fns.$('addSFNewDirHint').textContent = '子文件夹名对应资源包内的物理目录，修改它会断开现有引用。如需更换目录，请先移除该标签再添加新标签。';
    PM.fns.$('addSFNewDir').readOnly = true;
    PM.fns.$('addSFNewDir').value = sf.dirName || '';
    PM.fns.$('addSFDisplayName').value = sf.displayName || sf.dirName || '';
    setTimeout(() => PM.fns.$('addSFDisplayName').focus(), 0);
  }

  PM.fns.openEditSFModal = openEditSFModal;

  function closeAddSFModal() {
    const modal = PM.fns.$('addSFModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.dataset.editK = '';
    // 把 dirName 字段还原为新增模式下的默认值，下次打开（不论新增还是编辑）
    // 都从已知状态开始。
    const dirInput = PM.fns.$('addSFNewDir');
    if (dirInput) {
      dirInput.readOnly = false;
      dirInput.value = '';
    }
    PM.fns.$('addSFNewDirLabel').textContent = '或输入新子文件夹名（不存在则自动新建）';
    PM.fns.$('addSFNewDirHint').textContent = '只能使用小写字母、数字、下划线。';
    const foldersGroup = PM.fns.$('addSFFoldersListGroup');
    if (foldersGroup) foldersGroup.style.display = '';
  }

  PM.fns.closeAddSFModal = closeAddSFModal;

  function populateAddSFFoldersList(idx) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    const folderPath = PM.fns.resolveSectionFolder(section, cats[PM.state.selectedH2], null);
    const tree = PM.fns.buildFileTree();
    // 在树里下钻到 folderPath。
    let node = tree;
    folderPath.split('/').forEach(seg => {
      if (node && node._children[seg]) node = node._children[seg];
    });
    const existingFolders = (section.subFolders || []).map(sf => sf.dirName);
    const candidates = (node && node._children)
      ? Object.keys(node._children).filter(name => !existingFolders.includes(name)).sort()
      : [];
    const list = PM.fns.$('addSFFoldersList');
    if (!list) return;
    if (candidates.length === 0) {
      list.innerHTML = `<span style="color:#8b949e;font-size:12px">暂无未添加的子文件夹</span>`;
      return;
    }
    list.innerHTML = candidates.map(name => {
      return `<span class="add-sf-chip" onclick="pickAddSFFolder(this, '${PM.fns.escapeAttr(name)}')">📁 ${PM.fns.escapeHtml(name)}</span>`;
    }).join('');
  }

  PM.fns.populateAddSFFoldersList = populateAddSFFoldersList;

  function pickAddSFFolder(el, name) {
    PM.fns.$('addSFNewDir').value = name;
    PM.fns.$('addSFDisplayName').value = name;
    // 高亮被选中的标签。
    document.querySelectorAll('#addSFFoldersList .add-sf-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  }

  PM.fns.pickAddSFFolder = pickAddSFFolder;

  function confirmAddSFFromTab() {
    const modal = PM.fns.$('addSFModal');
    const idx = parseInt(modal.dataset.sectionIdx, 10);
    const cats = PM.fns.getCurrentCategories();
    if (isNaN(idx) || PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;

    const editKRaw = modal.dataset.editK;
    const isEdit = editKRaw !== undefined && editKRaw !== '';
    const editK = isEdit ? parseInt(editKRaw, 10) : -1;

    const dirName = PM.fns.$('addSFNewDir').value.trim();
    const displayName = PM.fns.$('addSFDisplayName').value.trim() || dirName;

    if (isEdit) {
      // 编辑模式：只允许修改显示名称（dirName 为只读）。
      if (!displayName) { PM.fns.showToast(PM.fns.t('toast.enterDisplayBtn'), 'error'); return; }
      if (!Array.isArray(section.subFolders) || !section.subFolders[editK]) {
        closeAddSFModal();
        return;
      }
      section.subFolders[editK].displayName = displayName;
      closeAddSFModal();
      PM.fns.renderH3Area();
      PM.fns.showToast(PM.fns.t('toast.subfolderUpdated', { name: displayName }), 'success');
      return;
    }

    // 新增模式：dirName 为必填且经过校验。
    if (!dirName) { PM.fns.showToast(PM.fns.t('toast.enterSubfolderName'), 'error'); return; }
    if (!/^[a-z0-9_]+$/.test(dirName)) {
      PM.fns.showToast(PM.fns.t('toast.subfolderNameInvalid'), 'error');
      return;
    }
    if (!Array.isArray(section.subFolders)) section.subFolders = [];
    if (section.subFolders.some(sf => sf.dirName === dirName)) {
      PM.fns.showToast(PM.fns.t('toast.subfolderExists'), 'error');
      return;
    }
    section.subFolders.push({ dirName, displayName });
    closeAddSFModal();
    PM.fns.renderH3Area();
    PM.fns.showToast(PM.fns.t('toast.subfolderAdded', { name: displayName }), 'success');
  }

  PM.fns.confirmAddSFFromTab = confirmAddSFFromTab;

  function openPickPathModal(idx) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) { PM.fns.showToast(PM.fns.t('toast.selectCategory'), 'error'); return; }
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    const cat = cats[PM.state.selectedH2];
    const ns = cat.ns || 'minecraft';

    // 优先尝试用 section 的当前 basePath 初始化选择器，
    // 让用户一进来就在他已选定的文件夹内。
    // 先去掉前缀 "<ns>:" 和前导 "/" 再拼接 assets/<ns> 前缀。
    let bp = (section.basePath || cat.basePath || (cat.isFontMode ? 'font' : 'textures/signs'));
    const colonIdx = bp.indexOf(':');
    if (colonIdx >= 0) bp = bp.slice(colonIdx + 1);
    bp = bp.replace(/^\/+|\/+$/g, '');

    const preferred = 'assets/' + ns + (bp ? '/' + bp : '');
    // 只在资源包树内确实存在的路径上默认落点；
    // 否则回退到 assets/<ns>（让用户从这里再往下展开）。
    const tree = PM.fns.buildFileTree();
    let node = tree;
    let valid = true;
    const parts = preferred.split('/').filter(Boolean);
    for (const seg of parts) {
      if (node && node._children && node._children[seg]) node = node._children[seg];
      else { valid = false; break; }
    }
    PM.state.pickPathState.currentPath = valid ? preferred : ('assets/' + ns);
    // 把选中默认到与当前视图同一目录，让"✓ 选择此文件夹"按钮
    // 一开始就是可用状态，预览也展示合理的值。
    // 把选中默认到与当前视图同一目录，让"✓ 选择此文件夹"按钮一开始就是可用状态，预览也展示合理的值。
    PM.state.pickPathState.selectedPath = PM.state.pickPathState.currentPath;
    PM.state.pickPathState.ns = ns;

    const modal = PM.fns.$('pickPathModal');
    if (!modal) return;
    modal.dataset.sectionIdx = idx;
    modal.classList.add('is-open');
    renderPickPathTree();
  }

  PM.fns.openPickPathModal = openPickPathModal;

  function closePickPathModal() {
    const modal = PM.fns.$('pickPathModal');
    if (modal) modal.classList.remove('is-open');
  }

  PM.fns.closePickPathModal = closePickPathModal;

  function renderPickPathTree() {
    const modal = PM.fns.$('pickPathModal');
    if (!modal) return;
    const tree = PM.fns.buildFileTree();
    const cur = PM.state.pickPathState.currentPath;
    const ns = PM.state.pickPathState.ns;

    // 面包屑：📦 assets / <ns> / foo / bar …
    const bcEl = PM.fns.$('pickPathBreadcrumb');
    const crumbs = cur.split('/').filter(Boolean);
    let bcHtml = `<span class="pick-path-crumb" data-path="" style="cursor:pointer;color:#79c0ff" onclick="pickPathGoto('')">📦 资源包根目录</span>`;
    let acc = '';
    crumbs.forEach((seg, i) => {
      acc = acc ? acc + '/' + seg : seg;
      const targetPath = acc;
      const isLast = i === crumbs.length - 1;
      bcHtml += ` <span style="color:#484f58">/</span> <span class="pick-path-crumb" data-path="${PM.fns.escapeHtml(targetPath)}" style="cursor:pointer;color:${isLast ? '#e6edf3' : '#79c0ff'}" onclick="pickPathGoto('${PM.fns.escapeAttr(targetPath)}')">${PM.fns.escapeHtml(seg)}</span>`;
    });
    if (bcEl) bcEl.innerHTML = bcHtml;

    // 当前文件夹标签。
    const curEl = PM.fns.$('pickPathCurrent');
    if (curEl) curEl.textContent = cur || '资源包根目录';

    // 在树里下钻到当前路径，列出其第一级子项。
    let node = tree;
    if (cur) {
      for (const seg of cur.split('/')) {
        if (node && node._children && node._children[seg]) node = node._children[seg];
        else { node = null; break; }
      }
    }
    const listEl = PM.fns.$('pickPathTree');
    if (!listEl) return;
    if (!node) {
      listEl.innerHTML = `<div style="padding:16px;color:#8b949e;font-size:12px;text-align:center">该文件夹不存在于当前资源包中</div>`;
      updatePickPathPreview();
      return;
    }
    const folders = Object.keys(node._children || {}).sort();
    if (folders.length === 0) {
      listEl.innerHTML = `<div style="padding:16px;color:#8b949e;font-size:12px;text-align:center">此文件夹下没有子文件夹<br><br><span style="color:#484f58;font-size:11px">点击下方「✓ 选择此文件夹」确认使用</span></div>`;
      updatePickPathPreview();
      return;
    }
    listEl.innerHTML = folders.map(name => {
      const childPath = cur ? (cur + '/' + name) : name;
      const isSelected = (PM.state.pickPathState.selectedPath === childPath);
      // 行点击：仅选中（高亮 + 更新预览）。按钮点击：
      // 进入（往下一级，并把选中切到该目录）。
      return `<div class="tree-item${isSelected ? ' active' : ''}" onclick="pickPathSelect('${PM.fns.escapeAttr(childPath)}')" title="${PM.fns.escapeHtml(childPath)}">
        <span class="tree-icon folder">📁</span>
        <span class="tree-label">${PM.fns.escapeHtml(name)}</span>
        <button type="button" class="btn btn-secondary btn-xs" style="margin:0 2px" onclick="event.stopPropagation(); pickPathGoto('${PM.fns.escapeAttr(childPath)}')">进入 ❯</button>
      </div>`;
    }).join('');
    updatePickPathPreview();
  }

  PM.fns.renderPickPathTree = renderPickPathTree;

  function pickPathGoto(path) {
    PM.state.pickPathState.currentPath = path || '';
    PM.state.pickPathState.selectedPath = path || '';
    renderPickPathTree();
  }

  PM.fns.pickPathGoto = pickPathGoto;

  function pickPathSelect(path) {
    PM.state.pickPathState.selectedPath = path || '';
    renderPickPathTree();
  }

  PM.fns.pickPathSelect = pickPathSelect;

  function updatePickPathPreview() {
    const previewEl = PM.fns.$('pickPathPreview');
    const confirmBtn = PM.fns.$('pickPathConfirmBtn');
    if (!previewEl) return;
    const sel = PM.state.pickPathState.selectedPath;
    const ns = PM.state.pickPathState.ns;
    const prefix = 'assets/' + ns + '/';
    let relative = '';
    if (sel && sel.indexOf(prefix) === 0) relative = sel.slice(prefix.length);
    else if (sel === 'assets/' + ns) relative = '';
    else if (sel && sel.indexOf('assets/') !== 0) {
      // 用户导航到了 assets/<ns> 之外——仍然允许选中任意文件夹，
      // 但通过预览标签来给出警告。
      relative = sel;
    }
    const value = ns + ':' + relative;
    previewEl.innerHTML = sel
      ? (sel.indexOf('assets/' + ns) === 0
          ? '将填入：<code style="color:#79c0ff">' + PM.fns.escapeHtml(value) + '</code>'
          : '将填入：<code style="color:#f0883e">' + PM.fns.escapeHtml(value) + '</code> （不在 assets/' + PM.fns.escapeHtml(ns) + '/ 下，可能无法被解析）')
      : '将填入：<code style="color:#f0883e">' + PM.fns.escapeHtml(ns + ':') + '</code> （根目录，通常无效）';
    if (confirmBtn) confirmBtn.disabled = !sel;
  }

  PM.fns.updatePickPathPreview = updatePickPathPreview;

  function confirmPickPath() {
    const modal = PM.fns.$('pickPathModal');
    if (!modal) return;
    const idx = parseInt(modal.dataset.sectionIdx, 10);
    if (isNaN(idx)) { closePickPathModal(); return; }
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) { closePickPathModal(); return; }
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) { closePickPathModal(); return; }
    const sel = PM.state.pickPathState.selectedPath;
    if (!sel) { PM.fns.showToast(PM.fns.t('toast.selectFolder'), 'error'); return; }
    const ns = PM.state.pickPathState.ns;
    const prefix = 'assets/' + ns + '/';
    let relative = '';
    if (sel.indexOf(prefix) === 0) relative = sel.slice(prefix.length);
    else if (sel === 'assets/' + ns) relative = '';
    else { PM.fns.showToast(PM.fns.t('toast.folderNotUnderAssets', { ns: ns }), 'error'); return; }
    const value = ns + ':' + relative;

    section.basePath = value;
    // 更新内联输入框的值（如果仍在 DOM 中），并触发
    // 重渲染，使 openSectionImageBrowser / openFontListInline
    // 面板立即反映新的文件夹。
    const inputEl = PM.fns.$('basePathInput-' + idx);
    if (inputEl) inputEl.value = value;
    PM.fns.updateH3Field(idx, 'basePath', value);
    closePickPathModal();
    PM.fns.showToast(PM.fns.t('toast.pathFilled', { value: value }), 'success');
  }

  PM.fns.confirmPickPath = confirmPickPath;

  function openImgUploadModal(targetDir) {
    PM.fns.$('imgUploadTarget').textContent = targetDir || '';
    PM.fns.$('imgUploadModal').classList.add('is-open');
  }

  PM.fns.openImgUploadModal = openImgUploadModal;

  function closeImgUploadModal() { PM.fns.$('imgUploadModal').classList.remove('is-open'); }

  PM.fns.closeImgUploadModal = closeImgUploadModal;

  function clearImgUploadResults() { PM.fns.$('imgUploadList').innerHTML = ''; }

  PM.fns.clearImgUploadResults = clearImgUploadResults;

  function startImgUpload() { PM.fns.showToast(PM.fns.t('toast.imgUploadPlaceholder'), 'info'); closeImgUploadModal(); }

  PM.fns.startImgUpload = startImgUpload;

  function openImageRenameModal(sectionIdx, uploaded) {
    if (!Array.isArray(uploaded) || uploaded.length === 0) return;
    PM.state.imageRenameState.sectionIdx = sectionIdx;
    PM.state.imageRenameState.pending = uploaded.slice();
    const listEl = PM.fns.$('imageRenameList');
    if (!listEl) return;
    listEl.innerHTML = uploaded.map((u, k) => {
      const url = PM.state.imageUrlCache.get(u.targetPath);
      const thumbStyle = url ? `background-image:url('${url}');background-size:contain;background-position:center;background-repeat:no-repeat;background-color:#0d1117`
                            : `background-color:#0d1117`;
      return `<div class="image-rename-row" data-rename-k="${k}">
        <div class="image-rename-thumb" style="${thumbStyle}"></div>
        <div class="image-rename-fields">
          <input type="text" class="form-input image-rename-original" value="${PM.fns.escapeHtml(u.originalName)}" readonly title="原始文件名（不可修改）">
          <input type="text" class="form-input image-rename-stem" data-original="${PM.fns.escapeAttr(u.stem)}" value="${PM.fns.escapeAttr(u.stem)}" placeholder="输入新名称（不含扩展名）">
        </div>
      </div>`;
    }).join('');
    PM.fns.$('imageRenameModal').classList.add('is-open');
    setTimeout(() => {
      const first = document.querySelector('.image-rename-stem');
      if (first) { first.focus(); first.select(); }
    }, 0);
  }

  PM.fns.openImageRenameModal = openImageRenameModal;

  function closeImageRenameModal() {
    PM.fns.$('imageRenameModal').classList.remove('is-open');
    PM.state.imageRenameState.sectionIdx = null;
    PM.state.imageRenameState.pending = [];
  }

  PM.fns.closeImageRenameModal = closeImageRenameModal;

  async function renameZipEntry(oldPath, newPath) {
    if (!PM.state.zip || oldPath === newPath) return false;
    const entry = PM.state.zip.file(oldPath);
    if (!entry) return false;
    try {
      const data = await entry.async('uint8array');
      PM.state.zip.file(newPath, data);
      PM.state.zip.remove(oldPath);
      delete PM.state.fileMap[oldPath];
      PM.state.fileMap[newPath] = PM.state.zip.file(newPath);
      // 转移缓存的 blob URL，使图片缩略图预览在重命名后依然有效。
      if (typeof PM.state.imageUrlCache !== 'undefined' && PM.state.imageUrlCache.has(oldPath)) {
        PM.state.imageUrlCache.set(newPath, PM.state.imageUrlCache.get(oldPath));
        PM.state.imageUrlCache.delete(oldPath);
      }
      return true;
    } catch (e) {
      console.warn('renameZipEntry failed:', oldPath, '->', newPath, e);
      return false;
    }
  }

  PM.fns.renameZipEntry = renameZipEntry;

  async function confirmImageRename() {
    const idx = PM.state.imageRenameState.sectionIdx;
    if (idx === null) { closeImageRenameModal(); return; }
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) { closeImageRenameModal(); return; }
    const cat = cats[PM.state.selectedH2];
    const section = cat.sections[idx];
    if (!section) { closeImageRenameModal(); return; }

    const inputs = document.querySelectorAll('.image-rename-stem');
    const renameMap = [];
    let renamedCount = 0;

    for (const inp of inputs) {
      const k = parseInt(inp.closest('.image-rename-row').getAttribute('data-rename-k'), 10);
      const u = PM.state.imageRenameState.pending[k];
      if (!u) continue;

      const newStemRaw = (inp.value || '').trim();
      const oldStem = u.stem;
      if (!newStemRaw || newStemRaw === oldStem) continue;

      // 按上传路径的规则校验新 stem：仅允许小写字母、数字和下划线。
      if (!PM.fns.STRICT_RESOURCE_FILENAME_REGEX.test(newStemRaw)) {
        PM.fns.showToast(PM.fns.t('toast.fileNameInvalid', { name: newStemRaw }), 'error');
        continue;
      }

      const dot = u.targetPath.lastIndexOf('.');
      const oldBase = dot > 0 ? u.targetPath.slice(0, dot) : u.targetPath;
      const ext = dot > 0 ? u.targetPath.slice(dot) : '';
      const dir = oldBase.slice(0, oldBase.lastIndexOf('/') + 1);
      const newTarget = dir + newStemRaw + ext;

      if (PM.state.fileMap[newTarget] && newTarget !== u.targetPath) {
        PM.fns.showToast(PM.fns.t('toast.fileExistsSkipped', { name: newStemRaw + ext }), 'error');
        continue;
      }

      // 这里现在可以安全地使用 await
      const ok = await renameZipEntry(u.targetPath, newTarget);
      if (ok) {
        // 若该图片在 filterList 中，也同步更新 key。
        if (Array.isArray(section.filterList)) {
          section.filterList = section.filterList.map(s => s === oldStem ? newStemRaw : s);
        }
        renamedCount++;
        renameMap.push({ from: u.targetPath, to: newTarget, stem: newStemRaw });
      }
    }

    if (renamedCount > 0) {
      // 使文件夹缓存失效，下次 listImagesInFolder 调用会
      // 重新读取 PM.state.fileMap 并获取重命名后的文件，更新缩略图标签。
      const folderPath = PM.fns.resolveSectionFolder(section, cat, section._activeSubFolder || null);
      if (PM.state.folderFileCache[folderPath] !== undefined) PM.state.folderFileCache[folderPath] = undefined;
      PM.fns.showToast(PM.fns.t('toast.imagesRenamed', { count: renamedCount }), 'success');
    }
    closeImageRenameModal();
    PM.fns.openSectionImageBrowserInline(idx, section._activeSubFolder || null);
    PM.fns.renderFileBrowser();
  }

  PM.fns.confirmImageRename = confirmImageRename;

  async function uploadImagesToSection(idx, files) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const cat = cats[PM.state.selectedH2];
    const section = cat.sections[idx];
    if (!section) return;
    const folderPath = PM.fns.resolveSectionFolder(section, cat, section._activeSubFolder || null);

    // 写入前先校验文件名——若有不合法的，询问用户是否自动修正
    // （最常见的情况是用户从 Windows 拖入名为 "My Image.PNG" 的文件）。
    const v = validateResourceFilenames(files);
    if (!v.ok) {
      const msg = formatCorrectionList(
        v.corrected.filter(c => c.needsFix),
        v.needsFix.length
      );
      if (!confirm(msg)) {
        PM.fns.showToast(PM.fns.t('toast.cancelUpload'), 'info');
        return;
      }
    }

    const uploaded = [];
    const skippedNames = [];
    for (const item of v.corrected) {
      const file = item.file;
      const targetPath = folderPath + '/' + item.fixedName;
      // 若需要自动修正文件名，但目标文件夹中已存在同名文件，则跳过而非静默覆盖。
      if (item.needsFix && PM.state.fileMap[targetPath] !== undefined) {
        skippedNames.push(item.fixedName);
        continue;
      }
      try {
        const buf = await file.arrayBuffer();
        PM.state.zip.file(targetPath, buf);
        PM.state.fileMap[targetPath] = PM.state.zip.file(targetPath);
        // 使缓存失效，重渲染时能取到新的文件内容。
        if (PM.state.imageUrlCache.has(targetPath)) {
          URL.revokeObjectURL(PM.state.imageUrlCache.get(targetPath));
          PM.state.imageUrlCache.delete(targetPath);
        }
        uploaded.push({
          originalName: item.originalName,
          targetPath,
          stem: item.fixedName.replace(/\.[^.]+$/, '')
        });
      } catch (err) {
        console.warn('Image upload failed:', targetPath, err);
      }
    }
    if (skippedNames.length > 0) {
      PM.fns.showToast(PM.fns.t('toast.skippedN', { count: skippedNames.length }), 'info');
    }
    if (uploaded.length === 0) {
      PM.fns.showToast(PM.fns.t('toast.noImagesFound'), 'error');
      return;
    }
    // 关键：使文件夹级缓存失效，下次 listImagesInFolder
    // 调用会重新读取 PM.state.fileMap，获取刚上传的图片。
    if (PM.state.folderFileCache[folderPath] !== undefined) {
      PM.state.folderFileCache[folderPath] = undefined;
    }
    const fixedNote = v.needsFix && v.needsFix.length > 0 ? `（已自动修正 ${v.needsFix.length} 个文件名）` : '';
    PM.fns.showToast(PM.fns.t('toast.uploadedToFolder', { count: uploaded.length, folder: folderPath, note: fixedNote }), 'success');
    PM.fns.openSectionImageBrowserInline(idx, section._activeSubFolder || null);
    // 同时刷新文件浏览器/右侧面板树。
    PM.fns.renderFileBrowser();
    // 打开重命名弹窗，让用户在认为上传"完成"之前调整显示的文件名（缩略图条中显示的名称派生自文件 stem）。
    openImageRenameModal(idx, uploaded);
  }

  PM.fns.uploadImagesToSection = uploadImagesToSection;

  function openFontUploadModal(targetDir) {
    PM.fns.$('fontUploadTarget').textContent = targetDir || '';
    PM.fns.$('fontUploadModal').classList.add('is-open');
  }

  PM.fns.openFontUploadModal = openFontUploadModal;

  function closeFontUploadModal() { PM.fns.$('fontUploadModal').classList.remove('is-open'); }

  PM.fns.closeFontUploadModal = closeFontUploadModal;

  function clearFontUploadResults() { PM.fns.$('fontUploadList').innerHTML = ''; }

  PM.fns.clearFontUploadResults = clearFontUploadResults;

  function startFontUpload() { PM.fns.showToast(PM.fns.t('toast.fontUploadPlaceholder'), 'info'); closeFontUploadModal(); }

  PM.fns.startFontUpload = startFontUpload;

  function handleDropZoneDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    const zone = e.currentTarget;
    if (zone && zone.classList) zone.classList.add('drag-over');
  }

  PM.fns.handleDropZoneDragOver = handleDropZoneDragOver;

  function handleDropZoneDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const zone = e.currentTarget;
    if (zone && zone.classList) zone.classList.remove('drag-over');
  }

  PM.fns.handleDropZoneDragLeave = handleDropZoneDragLeave;

  async function handleImgDrop(e, idx) {
    e.preventDefault();
    e.stopPropagation();
    const zone = e.currentTarget;
    if (zone && zone.classList) zone.classList.remove('drag-over');
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await uploadImagesToSection(idx, files);
  }

  PM.fns.handleImgDrop = handleImgDrop;

  function handleImgDropInput(e, idx) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadImagesToSection(idx, files);
    e.target.value = '';
  }

  PM.fns.handleImgDropInput = handleImgDropInput;

  function sanitizeResourceStem(stem) {
    return (stem || '')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'unnamed';
  }

  PM.fns.sanitizeResourceStem = sanitizeResourceStem;

  function validateResourceFilenames(files) {
    const corrected = [];
    const skipped = [];
    for (const file of files) {
      const dot = file.name.lastIndexOf('.');
      const stem = dot > 0 ? file.name.slice(0, dot) : file.name;
      if (PM.fns.STRICT_RESOURCE_FILENAME_REGEX.test(stem)) {
        corrected.push({ file, originalName: file.name, fixedName: file.name });
      } else {
        const ext = dot > 0 ? file.name.slice(dot).toLowerCase() : '';
        const fixed = sanitizeResourceStem(stem) + ext;
        corrected.push({ file, originalName: file.name, fixedName: fixed, needsFix: true });
      }
    }
    const needsFix = corrected.filter(c => c.needsFix);
    if (needsFix.length === 0) {
      return { ok: true, corrected, skipped };
    }
    return { ok: false, corrected, skipped, needsFix };
  }

  PM.fns.validateResourceFilenames = validateResourceFilenames;

  function formatCorrectionList(corrections, totalCount) {
    const lines = corrections.slice(0, 8).map(c => `  • ${c.originalName}  →  ${c.fixedName}`);
    const more = corrections.length > 8 ? `\n  … 以及其他 ${corrections.length - 8} 个` : '';
    return `检测到 ${totalCount} 个文件名中包含非法字符（仅允许小写字母、数字、下划线）。\n\n` +
           `是否自动修正后继续上传？\n\n` + lines.join('\n') + more;
  }

  PM.fns.formatCorrectionList = formatCorrectionList;

  async function handleFontDrop(e, idx) {
    e.preventDefault();
    e.stopPropagation();
    const zone = e.currentTarget;
    if (zone && zone.classList) zone.classList.remove('drag-over');
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await uploadFontsToSection(idx, files);
  }

  PM.fns.handleFontDrop = handleFontDrop;

  function handleFontDropInput(e, idx) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadFontsToSection(idx, files);
    e.target.value = '';
  }

  PM.fns.handleFontDropInput = handleFontDropInput;

  async function uploadFontsToSection(idx, files) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const cat = cats[PM.state.selectedH2];
    const section = cat.sections[idx];
    if (!section) return;
    const folderPath = PM.fns.resolveSectionFolder(section, cat, section._activeSubFolder || null);

    // 先丢弃那些根本没有字体扩展名的文件。
    const fontExt = /\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/;
    const fontFiles = Array.from(files).filter(f => fontExt.test(f.name));
    if (fontFiles.length === 0) {
      PM.fns.showToast(PM.fns.t('toast.noFontFiles'), 'error');
      return;
    }

    // 校验文件名；如有不符合资源包命名规则的，询问是否自动修正。
    const v = validateResourceFilenames(fontFiles);
    if (!v.ok) {
      const msg = formatCorrectionList(
        v.corrected.filter(c => c.needsFix),
        v.needsFix.length
      );
      if (!confirm(msg)) {
        PM.fns.showToast(PM.fns.t('toast.cancelUpload'), 'info');
        return;
      }
    }

    const savedPaths = [];
    const skippedNames = [];
    for (const item of v.corrected) {
      const targetPath = folderPath + '/' + item.fixedName;
      if (item.needsFix && PM.state.fileMap[targetPath] !== undefined) {
        skippedNames.push(item.fixedName);
        continue;
      }
      try {
        const buf = await item.file.arrayBuffer();
        PM.state.zip.file(targetPath, buf);
        PM.state.fileMap[targetPath] = PM.state.zip.file(targetPath);
        savedPaths.push(targetPath);
      } catch (err) {
        console.warn('Font upload failed:', targetPath, err);
      }
    }
    if (skippedNames.length > 0) {
      PM.fns.showToast(PM.fns.t('toast.skippedN', { count: skippedNames.length }), 'info');
    }
    if (savedPaths.length === 0) {
      PM.fns.showToast(PM.fns.t('toast.noFontFiles'), 'error');
      return;
    }
    const fixedNote = v.needsFix && v.needsFix.length > 0 ? `（已自动修正 ${v.needsFix.length} 个文件名）` : '';
    PM.fns.showToast(PM.fns.t('toast.uploadedFonts', { count: savedPaths.length, note: fixedNote }), 'success');
    PM.fns.openFontListInline(idx, section._activeSubFolder || null);
    PM.fns.renderFileBrowser();
    // 为第一个上传的字体打开字体配置弹窗，让用户在字体块加入列表前选择显示名、Font ID、命名空间，以及（可选）编辑 JSON providers。
    openFontConfigModal(idx, savedPaths[0]);
  }

  PM.fns.uploadFontsToSection = uploadFontsToSection;

  function defaultFontIdFromPath(fontPath) {
    const base = (fontPath || '').split('/').pop() || 'font';
    const stem = base.replace(/\.(ttf|otf|woff2?)$/i, '');
    const slug = stem.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, '');
    return slug || 'font_' + Date.now();
  }

  PM.fns.defaultFontIdFromPath = defaultFontIdFromPath;

  function openFontConfigModal(sectionIdx, sourceFontPath) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const cat = cats[PM.state.selectedH2];
    const section = cat.sections[sectionIdx];
    if (!section || !sourceFontPath) return;
    PM.state.fontConfigState.sectionIdx = sectionIdx;
    PM.state.fontConfigState.sourceFontPath = sourceFontPath;
    PM.state.fontConfigState.advancedEditorOpen = false;

    const ns = cat.ns || 'minecraft';
    const fontId = defaultFontIdFromPath(sourceFontPath);
    const displayName = sourceFontPath.split('/').pop().replace(/\.(ttf|otf|woff2?)$/i, '');

    PM.fns.$('fcDisplayName').value = displayName;
    PM.fns.$('fcFontId').value = fontId;
    PM.fns.$('fcNs').value = ns;
    PM.fns.$('fcFontPath').value = sourceFontPath;

    PM.fns.$('fontConfigModalTitle').textContent = '🔤 配置字体 — ' + sourceFontPath.split('/').pop();
    PM.fns.$('fontConfigModal').classList.add('is-open');
  }

  PM.fns.openFontConfigModal = openFontConfigModal;

  function closeFontConfigModal() {
    PM.fns.$('fontConfigModal').classList.remove('is-open');
    PM.state.fontConfigState.sectionIdx = null;
    PM.state.fontConfigState.sourceFontPath = null;
    PM.state.fontConfigState.advancedEditorOpen = false;
  }

  PM.fns.closeFontConfigModal = closeFontConfigModal;

  async function confirmFontConfigModal() {
    const idx = PM.state.fontConfigState.sectionIdx;
    const sourceFontPath = PM.state.fontConfigState.sourceFontPath;
    if (idx === null || !sourceFontPath) { closeFontConfigModal(); return; }
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) { closeFontConfigModal(); return; }
    const cat = cats[PM.state.selectedH2];
    const section = cat.sections[idx];
    if (!section) { closeFontConfigModal(); return; }

    const displayName = (PM.fns.$('fcDisplayName').value || '').trim();
    const fontIdRaw = (PM.fns.$('fcFontId').value || '').trim();
    const nsRaw = (PM.fns.$('fcNs').value || '').trim();

    if (!displayName) { PM.fns.showToast(PM.fns.t('toast.enterFontDisplayName'), 'error'); PM.fns.$('fcDisplayName').focus(); return; }
    if (!fontIdRaw) { PM.fns.showToast(PM.fns.t('toast.enterFontId'), 'error'); PM.fns.$('fcFontId').focus(); return; }
    if (!/^[a-z0-9_]+$/.test(fontIdRaw)) {
      PM.fns.showToast(PM.fns.t('toast.fontIdLowercase'), 'error'); PM.fns.$('fcFontId').focus(); return;
    }
    const ns = nsRaw || (cat.ns || 'minecraft');

    // 如有需要，把上传的字体文件移动到 assets/<ns>/font/<id>.ttf。
    const ext = (sourceFontPath.split('.').pop() || 'ttf').toLowerCase();
    const targetFontPath = 'assets/' + ns + '/font/' + fontIdRaw + '.' + ext;
    if (sourceFontPath !== targetFontPath && PM.state.zip && PM.state.zip.file(sourceFontPath)) {
      try {
        const data = await PM.state.zip.file(sourceFontPath).async('uint8array');
        PM.state.zip.file(targetFontPath, data);
        PM.state.zip.remove(sourceFontPath);
        delete PM.state.fileMap[sourceFontPath];
        PM.state.fileMap[targetFontPath] = PM.state.zip.file(targetFontPath);
      } catch (e) {
        console.warn('Font rename failed:', e);
      }
    }

    // 确保对应的 JSON 存在（默认 providers）。如果用户已经在高级编辑器中保存过，就不动它。
    const jsonPath = 'assets/' + ns + '/font/' + fontIdRaw + '.json';
    if (!PM.state.zip || !PM.state.zip.file(jsonPath)) {
      const defaultJson = {
        providers: [
          { type: 'ttf', file: ns + ':' + fontIdRaw + '.' + ext, shift: [0, 0], size: 11.0, oversample: 8.0 }
        ]
      };
      try {
        PM.state.zip.file(jsonPath, JSON.stringify(defaultJson, null, 2));
        PM.state.fileMap[jsonPath] = PM.state.zip.file(jsonPath);
      } catch (e) {
        PM.fns.showToast(PM.fns.t('toast.fontJsonSaveFailed', { msg: e.message }), 'error');
      }
    }

    // 在该分类的 fontList 中加入一个 chip（或更新已有的）。
    if (!Array.isArray(section.fontList)) section.fontList = [];
    let existing = section.fontList.findIndex(f => f && f.fontId === fontIdRaw && (f.ns || ns) === ns);
    if (existing >= 0) {
      section.fontList[existing].displayName = displayName;
      section.fontList[existing].ns = ns;
    } else {
      section.fontList.push({ fontId: fontIdRaw, displayName, ns });
    }

    closeFontConfigModal();
    PM.fns.refreshFontChipList(idx);
    PM.fns.openFontListInline(idx);
    PM.fns.showToast(PM.fns.t('toast.fontAdded', { name: displayName }), 'success');
  }

  PM.fns.confirmFontConfigModal = confirmFontConfigModal;

  function openFontConfigAdvancedEditor() {
    if (PM.state.fontConfigState.sectionIdx === null || !PM.state.fontConfigState.sourceFontPath) {
      PM.fns.showToast(PM.fns.t('toast.selectSourceFont'), 'error');
      return;
    }
    const ns = (PM.fns.$('fcNs').value.trim() || 'minecraft');
    const fontId = (PM.fns.$('fcFontId').value.trim() || defaultFontIdFromPath(PM.state.fontConfigState.sourceFontPath));
    const extMatch = (PM.state.fontConfigState.sourceFontPath || '').match(/\.(ttf|otf|woff2?)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'ttf';
    const jsonPath = 'assets/' + ns + '/font/' + fontId + '.json';
    const displayPath = ns + ':font/' + fontId + '.json';
    const initial = {
      providers: [
        { type: 'ttf', file: ns + ':' + fontId + '.' + ext, shift: [0, 0], size: 11.0, oversample: 8.0 }
      ]
    };
    PM.state.fontConfigState.advancedEditorOpen = true;
    PM.fns.openFontJsonEditor(displayPath, initial, async (savedJson) => {
      try {
        PM.state.zip.file(jsonPath, JSON.stringify(savedJson, null, 2));
        PM.state.fileMap[jsonPath] = PM.state.zip.file(jsonPath);
        PM.fns.showToast(PM.fns.t('toast.fontJsonSaved', { path: jsonPath }), 'success');
      } catch (e) {
        PM.fns.showToast(PM.fns.t('toast.saveFailed', { msg: e.message }), 'error');
      }
    });
  }

  PM.fns.openFontConfigAdvancedEditor = openFontConfigAdvancedEditor;

  function openFontJsonEditorModal() {
    // 打开当前编辑分类中第一个字体的编辑器。
    const idx = PM.fns.findEditingSectionIndex();
    if (idx < 0) { PM.fns.showToast(PM.fns.t('toast.expandFontBlock'), 'error'); return; }
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    const folderPath = PM.fns.resolveSectionFolder(section, cats[PM.state.selectedH2], section._activeSubFolder || null);
    PM.fns.listFontsInFolder(folderPath).then(fonts => {
      if (!fonts.length) { PM.fns.showToast(PM.fns.t('toast.noFontInFolder'), 'info'); return; }
      PM.fns.openFontJsonInline(idx, 0, fonts[0].path);
    });
  }

  PM.fns.openFontJsonEditorModal = openFontJsonEditorModal;

})();
