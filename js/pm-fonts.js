

(function () {
  'use strict';

  // 全局 PM 命名空间（由 pm-state.js 首次定义，后续模块只读不重置）。
  if (typeof window.PM === 'undefined') {
    window.PM = { state: {}, fns: {} };
  }
  async function listFontsInFolder(folderPath) {
    if (!PM.state.zip) return [];
    const fontExt = /\.(ttf|otf|woff2?)$/i;
    const result = [];
    const prefix = folderPath + '/';
    for (const p of Object.keys(PM.state.fileMap)) {
      if (!p.toLowerCase().startsWith(prefix.toLowerCase())) continue;
      const remainder = p.slice(prefix.length);
      if (remainder.indexOf('/') >= 0) continue;
      if (!fontExt.test(p)) continue;
      // 派生稳定的 stem（去掉扩展名的部分），过滤复选框
      // 可以把它作为切换键，与图片缩略图保持一致。
      const stem = remainder.replace(/\.[^.]+$/, '');
      result.push({ name: remainder, path: p, stem });
    }
    return result;
  }

  PM.fns.listFontsInFolder = listFontsInFolder;

  async function readFontJson(jsonPath) {
    if (!PM.state.zip) return null;
    const entry = PM.state.zip.file(jsonPath);
    if (!entry) return null;
    try {
      const text = await entry.async('string');
      const json = JSON.parse(text);
      if (json && Array.isArray(json.providers)) {
          json.providers = json.providers.filter(p => p.type !== 'legacy_unicode');
      }
      return json;
    } catch (e) {
      return null;
    }
  }

  PM.fns.readFontJson = readFontJson;

  async function deleteFontFile(path) {
    if (!path) return;
    if (!confirm(PM.fns.t('confirm.deleteFile', { path: path }))) return;
    try {
      PM.state.zip.remove(path);
      delete PM.state.fileMap[path];
      const idx = findEditingSectionIndex();
      if (idx >= 0) PM.fns.openFontListInline(idx);
      PM.fns.showToast(PM.fns.t('toast.fontFileDeleted'), 'success');
    } catch (e) {
      PM.fns.showToast(PM.fns.t('toast.deleteFailed', { msg: e.message }), 'error');
    }
  }

  PM.fns.deleteFontFile = deleteFontFile;

  function findFontRegIndexByStem(section, stem) {
    if (!section || !Array.isArray(section.fontList)) return -1;
    return section.fontList.findIndex(rg => {
      const id = (rg.fontId || rg.name || '');
      const rgStem = id.split('/').pop().split(':').pop().replace(/\.[^.]+$/, '');
      return rgStem === stem;
    });
  }

  PM.fns.findFontRegIndexByStem = findFontRegIndexByStem;

  function findFontRegEntry(section, stem) {
    const k = findFontRegIndexByStem(section, stem);
    if (k < 0) return { k: -1, entry: null };
    return { k, entry: section.fontList[k] };
  }

  PM.fns.findFontRegEntry = findFontRegEntry;

  async function deleteFontFromSection(idx, stem) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;

    // 复用 openFontListInline 中的查询逻辑定位合并后的行数据，
    // 这样能给用户展示更有意义的确认信息。
    let displayName = stem;
    let fontPath = '';
    const folderPath = PM.fns.resolveSectionFolder(section, cats[PM.state.selectedH2], section._activeSubFolder || null);
    const folderFonts = await listFontsInFolder(folderPath);
    const match = folderFonts.find(f => f.stem === stem);
    if (match) {
      displayName = match.name;
      fontPath = match.path;
    } else {
      const reg = section.fontList || [];
      for (const rg of reg) {
        const id = rg.fontId || rg.name || '';
        const rgStem = id.split('/').pop().split(':').pop().replace(/\.[^.]+$/, '');
        if (rgStem === stem) { displayName = rg.displayName || id; break; }
      }
    }

    const fileNote = fontPath ? '\n文件：' + fontPath : '\n（仅删除注册表条目，无物理文件）';
    if (!confirm(PM.fns.t('confirm.deleteFont', { name: displayName }) + fileNote)) return;

    // 1) 从 section.fontList 中移除
    const { k } = findFontRegEntry(section, stem);
    if (k >= 0) section.fontList.splice(k, 1);

    // 2) 删除物理 .ttf 文件及其同级 .json，连同同名字体的其他扩展名（.otf/.woff/.woff2）一并清理。
    if (fontPath) {
      try {
        // 撤销 .ttf/.otf/.woff 文件的所有缓存预览 URL。在关闭标签页或显式调用 revokeObjectURL 之前，浏览器不会自动释放 blob URL 关联的数据。
        PM.fns.revokeAndRemoveCache(fontPath);
        PM.state.zip.remove(fontPath);
        delete PM.state.fileMap[fontPath];
      } catch (e) { console.warn('Failed to remove font file', fontPath, e); }
      const dot = fontPath.lastIndexOf('.');
      const base = dot > 0 ? fontPath.slice(0, dot) : fontPath;
      const jsonPath = base + '.json';
      if (PM.state.fileMap[jsonPath] !== undefined) {
        try {
          PM.state.zip.remove(jsonPath);
          delete PM.state.fileMap[jsonPath];
        } catch (e) { console.warn('Failed to remove sibling JSON', jsonPath, e); }
      }
      // 同时清掉分类 filterList 中对应的条目，避免白名单/黑名单引用已经不存在的字体。
      if (Array.isArray(section.filterList)) {
        section.filterList = section.filterList.filter(s => s !== stem);
      }
    } else {
      // 仅注册项：从 fontId 派生 JSON 路径并尝试删除。
      // 由于上文已经移除了 section.fontList 条目，按 stem 重新查找。
      const reg = section.fontList || [];
      let rid = '';
      for (const rg of reg) {
        const id = rg.fontId || rg.name || '';
        const rgStem = id.split('/').pop().split(':').pop().replace(/\.[^.]+$/, '');
        if (rgStem === stem) { rid = id; break; }
      }
      if (rid) {
        const safeName = rid.split(':').pop().replace(/\.[^.]+$/, '');
        const ns = rid.includes(':') ? rid.split(':')[0] : (cats[PM.state.selectedH2].ns || 'minecraft');
        const jsonPath = 'assets/' + ns + '/font/' + safeName + '.json';
        if (PM.state.fileMap[jsonPath] !== undefined) {
          try {
            PM.state.zip.remove(jsonPath);
            delete PM.state.fileMap[jsonPath];
          } catch (e) { console.warn('Failed to remove registry JSON', jsonPath, e); }
        }
      }
    }

    // 3) Refresh the list
    PM.fns.openFontListInline(idx);
    PM.fns.showToast(PM.fns.t('toast.fontDeleted', { name: displayName }), 'success');
  }

  PM.fns.deleteFontFromSection = deleteFontFromSection;

  function openRenameFontModal(sectionIdx, stem) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[sectionIdx];
    if (!section) return;
    const { entry } = findFontRegEntry(section, stem);

    const displayName = (entry && (entry.displayName || entry.name)) || stem;
    const fontId = (entry && (entry.fontId || entry.name)) || stem;
    PM.state.renameFontState.sectionIdx = sectionIdx;
    PM.state.renameFontState.stem = stem;

    // 检测物理字体文件路径，让"同时重命名文件"复选框仅在相关时显示。
    let fontPath = '';
    const row = document.querySelector(`#h3CardsList .font-row[data-font-stem="${cssEscape(stem)}"]`);
    if (row) fontPath = row.getAttribute('data-font-path') || '';
    PM.state.renameFontState.fontPath = fontPath;

    PM.fns.$('renameFontDisplayName').value = displayName;
    PM.fns.$('renameFontId').value = fontId;
    PM.fns.$('renameFontRenameFile').checked = true;
    PM.fns.$('renameFontFileGroup').style.display = fontPath ? '' : 'none';
    PM.fns.$('renameFontModal').classList.add('is-open');
    setTimeout(() => PM.fns.$('renameFontDisplayName').focus(), 0);
  }

  PM.fns.openRenameFontModal = openRenameFontModal;

  function closeRenameFontModal() {
    PM.fns.$('renameFontModal').classList.remove('is-open');
    PM.state.renameFontState.sectionIdx = null;
    PM.state.renameFontState.stem = null;
    PM.state.renameFontState.fontPath = null;
  }

  PM.fns.closeRenameFontModal = closeRenameFontModal;

  function cssEscape(s) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(s);
    return String(s).replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  }

  PM.fns.cssEscape = cssEscape;

  async function confirmRenameFont() {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const idx = PM.state.renameFontState.sectionIdx;
    const stem = PM.state.renameFontState.stem;
    if (idx === null || stem === null) { closeRenameFontModal(); return; }
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) { closeRenameFontModal(); return; }

    const newDisplayName = (PM.fns.$('renameFontDisplayName').value || '').trim();
    const newFontIdRaw = (PM.fns.$('renameFontId').value || '').trim();
    if (!newDisplayName) { PM.fns.showToast(PM.fns.t('toast.enterDisplayName'), 'error'); return; }
    if (!newFontIdRaw) { PM.fns.showToast(PM.fns.t('toast.enterFontId'), 'error'); return; }

    // 规范化 Font ID：先拆分可选的命名空间前缀，再独立校验裸 ID 与命名空间。
    let newNs = '';
    let newBareId = newFontIdRaw;
    const colonIdx = newFontIdRaw.indexOf(':');
    if (colonIdx >= 0) {
      newNs = newFontIdRaw.slice(0, colonIdx);
      newBareId = newFontIdRaw.slice(colonIdx + 1);
    }
    const nsRegex = /^[a-z0-9_.\-]+$/i;
    const idRegex = /^[a-z0-9_.\-]+$/i;
    if (newNs && !nsRegex.test(newNs)) { PM.fns.showToast(PM.fns.t('toast.nsInvalid'), 'error'); return; }
    if (!idRegex.test(newBareId)) { PM.fns.showToast(PM.fns.t('toast.fontIdInvalid'), 'error'); return; }

    const cat = cats[PM.state.selectedH2];
    const defaultNs = cat.ns || 'minecraft';
    const finalNs = newNs || defaultNs;
    const finalFontId = finalNs + ':' + newBareId;

    const renameFile = !!PM.fns.$('renameFontRenameFile').checked && !!PM.state.renameFontState.fontPath;

    // 更新 section.fontList 条目——若尚无条目则新建（例如物理字体已上传但其行从未关联）。
    const { k, entry } = findFontRegEntry(section, stem);
    if (entry) {
      entry.displayName = newDisplayName;
      entry.fontId = finalFontId;
      if (!entry.ns) entry.ns = finalNs;
    } else {
      if (!Array.isArray(section.fontList)) section.fontList = [];
      section.fontList.push({ fontId: finalFontId, displayName: newDisplayName, ns: finalNs });
    }

    // 可选地重命名 PM.state.zip 中的 .ttf + .json 文件，让物理文件名与新的 Font ID 匹配，保持清单一致。
    if (renameFile && PM.state.renameFontState.fontPath) {
      const oldFontPath = PM.state.renameFontState.fontPath;
      const oldDot = oldFontPath.lastIndexOf('.');
      const oldBase = oldDot > 0 ? oldFontPath.slice(0, oldDot) : oldFontPath;
      const oldExt = oldDot > 0 ? oldFontPath.slice(oldDot) : '';
      const oldDir = oldBase.slice(0, oldBase.lastIndexOf('/') + 1);
      const oldJsonPath = oldBase + '.json';

      const newFontPath = oldDir + newBareId + oldExt;
      const newJsonPath = oldDir + newBareId + '.json';

      try {
        if (oldFontPath !== newFontPath) {
          const fontEntry = PM.state.zip.file(oldFontPath);
          if (fontEntry) {
            PM.state.zip.remove(oldFontPath);
            delete PM.state.fileMap[oldFontPath];
            const fontData = await fontEntry.async('uint8array');
            PM.state.zip.file(newFontPath, fontData);
            PM.state.fileMap[newFontPath] = PM.state.zip.file(newFontPath);
          }
        }
        if (oldJsonPath !== newJsonPath) {
          const jsonEntry = PM.state.zip.file(oldJsonPath);
          if (jsonEntry) {
            PM.state.zip.remove(oldJsonPath);
            delete PM.state.fileMap[oldJsonPath];
            // 改写 providers 中的 "file" 字段，使其指向新的 .ttf 路径，让 JSON 引用与重命名后的文件保持同步。
            let jsonText = await jsonEntry.async('string');
            try {
              const json = JSON.parse(jsonText);
              if (Array.isArray(json.providers)) {
                json.providers.forEach(p => {
                  if (p && typeof p.file === 'string' && p.file === oldFontPath) {
                    p.file = newFontPath;
                  }
                });
              }
              PM.state.zip.file(newJsonPath, JSON.stringify(json, null, 2));
            } catch (e) {
              // 如果 JSON 不合法，原样复制即可——之后用户仍可通过可视化编辑器再编辑。
              PM.state.zip.file(newJsonPath, jsonText);
            }
            PM.state.fileMap[newJsonPath] = PM.state.zip.file(newJsonPath);
          }
        }
        // 更新 filterList，让白名单/黑名单与新 stem（现在派生自新文件基本名）保持一致。
        const newStem = newBareId;
        if (Array.isArray(section.filterList)) {
          section.filterList = section.filterList.map(s => s === stem ? newStem : s);
        }
      } catch (e) {
        PM.fns.showToast(PM.fns.t('toast.renameFailed', { msg: e.message }), 'error');
        return;
      }
    }

    closeRenameFontModal();
    PM.fns.openFontListInline(idx);
    PM.fns.showToast(PM.fns.t('toast.fontRenamed', { name: newDisplayName }), 'success');
  }

  PM.fns.confirmRenameFont = confirmRenameFont;

  function findEditingSectionIndex() {
    return (PM.state.editingH3 === null || PM.state.editingH3 === undefined) ? -1 : PM.state.editingH3;
  }

  PM.fns.findEditingSectionIndex = findEditingSectionIndex;

  async function openFontJsonInline(idx, k, fontPath) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const cat = cats[PM.state.selectedH2];
    const section = cat.sections[idx];
    if (!section) return;

    // 派生同级 JSON 路径：例如 assets/ns/font/my.ttf → assets/ns/font/my.json
    const dot = fontPath.lastIndexOf('.');
    const jsonPath = (dot > 0 ? fontPath.slice(0, dot) : fontPath) + '.json';
    const existing = await readFontJson(jsonPath);
    const initial = existing || (() => {
      // 把完整的 PM.state.zip 路径 "assets/<ns>/<rel>" 转换为 MC 的 "<ns>:<rel>" 引用。旧版本模板会自动追加 legacy_unicode provider；这里跳过它的原因是 (a) 用户的 TTF 应当覆盖它，(b) 如果 TTF 引用错误，旧版页面会悄悄回退到默认 ASCII 字体，看起来像乱码。
      const m = (fontPath || '').match(/^assets\/([^/]+)\/(.+)$/);
      const fileRef = m ? (m[1] + ':' + m[2].replace(/^font\//, '')) : (fontPath || '').replace(/^assets\/[^/]+\/font\//, '');
      return {
        providers: [
          { type: 'ttf', file: fileRef, shift: [0, 0], size: 11.0, oversample: 8.0 }
        ]
      };
    })();
    openFontJsonEditor(jsonPath, initial, async (savedJson) => {
      // 把 JSON 持久化到 PM.state.zip 并更新 fontList 映射
      try {
        PM.state.zip.file(jsonPath, JSON.stringify(savedJson, null, 2));
        PM.state.fileMap[jsonPath] = PM.state.zip.file(jsonPath);
        PM.fns.showToast(PM.fns.t('toast.fontJsonSavedAt', { path: jsonPath }), 'success');
        // 刷新内联列表
        PM.fns.openFontListInline(idx);
      } catch (e) {
        PM.fns.showToast(PM.fns.t('toast.fontJsonSaveFailed', { msg: e.message }), 'error');
      }
    });
  }

  PM.fns.openFontJsonInline = openFontJsonInline;

  async function openRegistryFontJsonEditor(idx, fontId) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const cat = cats[PM.state.selectedH2];
    const section = cat.sections[idx];
    if (!section) return;
    if (!fontId) return;
    const safeName = fontId.split(':').pop().replace(/\.[^.]+$/, '');
    const ns = fontId.includes(':')
      ? fontId.split(':')[0]
      : (cat.ns || 'minecraft');
    const jsonPath = 'assets/' + ns + '/font/' + safeName + '.json';
    const expectedExt = PM.fns.detectFontExtensionFor(jsonPath);
    const expectedFontPath = 'assets/' + ns + '/font/' + safeName + '.' + expectedExt;
    const existing = await readFontJson(jsonPath);
    const initial = existing || {
      providers: [
        { type: 'ttf', file: ns + ':' + safeName + '.' + expectedExt, shift: [0, 0], size: 11.0, oversample: 8.0 }
      ]
    };
    openFontJsonEditor(jsonPath, initial, async (savedJson) => {
      try {
        PM.state.zip.file(jsonPath, JSON.stringify(savedJson, null, 2));
        PM.state.fileMap[jsonPath] = PM.state.zip.file(jsonPath);
        PM.fns.showToast(PM.fns.t('toast.fontJsonSavedAt', { path: jsonPath }), 'success');
        PM.fns.openFontListInline(idx);
      } catch (e) {
        PM.fns.showToast(PM.fns.t('toast.fontJsonSaveFailed', { msg: e.message }), 'error');
      }
    });
  }

  PM.fns.openRegistryFontJsonEditor = openRegistryFontJsonEditor;

  function openFontJsonEditor(jsonPath, initial, onSave) {
    PM.state.fontJsonState.path = jsonPath;
    PM.state.fontJsonState.providers = JSON.parse(JSON.stringify(initial.providers || []));
    PM.state.fontJsonState.onSave = onSave || null;
    renderFontJsonEditor();
    PM.fns.$('fontJsonEditorTitle').textContent = PM.fns.t('pm.fje.titleEdit', { path: jsonPath });
    PM.fns.$('fontJsonEditorModal').classList.add('is-open');
  }

  PM.fns.openFontJsonEditor = openFontJsonEditor;

  function closeFontJsonEditor() {
    PM.fns.$('fontJsonEditorModal').classList.remove('is-open');
    PM.state.fontJsonState = { path: null, providers: [], onSave: null };
  }

  PM.fns.closeFontJsonEditor = closeFontJsonEditor;

  function renderFontJsonEditor() {
    const body = PM.fns.$('fontJsonEditorBody');
    if (!body) return;
    if (!PM.state.fontJsonState.providers.length) {
      body.innerHTML = `<div class="font-list-empty">${PM.fns.escapeHtml(PM.fns.t('pm.fontList.emptyProviders'))}</div>`;
      updateFontJsonSummary();
      return;
    }
    body.innerHTML = PM.state.fontJsonState.providers.map((p, i) => renderFontJsonCard(i, p)).join('');
    updateFontJsonSummary();
  }

  PM.fns.renderFontJsonEditor = renderFontJsonEditor;

  function renderFontJsonCard(i, p) {
    // 强制确保后台数据为 ttf
    if (p) p.type = 'ttf';
    const cardHead = `
      <div class="fj-card-head">
        <span class="fj-card-num">#${i + 1}</span>
        <span class="fj-type-label" style="color:#79c0ff;font-weight:bold;margin-left:8px;">${PM.fns.escapeHtml(PM.fns.t('pm.fje.ttfLabel'))}</span>
        <button class="fj-delete-btn" onclick="removeFontJsonProvider(${i})" title="${PM.fns.escapeHtml(PM.fns.t('pm.fje.deleteProvider'))}">🗑</button>
      </div>
    `;

    const shiftArr = Array.isArray(p.shift) ? p.shift : [0, 0];
    const fields = `
      <div class="fj-card-fields">
        <div class="fj-field">
          <label class="fj-label">${PM.fns.escapeHtml(PM.fns.t('pm.fje.fileLabel'))} <span class="fj-hint">${PM.fns.escapeHtml(PM.fns.t('pm.fje.fileHint'))}</span></label>
          <input class="fj-input" value="${escapeAttr(p.file || '')}" oninput="updateFontJsonProvider(${i}, 'file', this.value)" placeholder="minecraft:my_cool_font.ttf">
        </div>
        <div class="fj-row">
          <div class="fj-field">
            <label class="fj-label">shift[0] <span class="fj-hint">— X 偏移</span></label>
            <input class="fj-input" type="number" step="any" value="${escapeAttr(shiftArr[0] != null ? shiftArr[0] : 0)}" oninput="updateFontJsonShift(${i}, 0, Number(this.value))">
          </div>
          <div class="fj-field">
            <label class="fj-label">shift[1] <span class="fj-hint">— Y 偏移</span></label>
            <input class="fj-input" type="number" step="any" value="${escapeAttr(shiftArr[1] != null ? shiftArr[1] : 0)}" oninput="updateFontJsonShift(${i}, 1, Number(this.value))">
          </div>
        </div>
        <div class="fj-row">
          <div class="fj-field">
            <label class="fj-label">size <span class="fj-hint">— 字号</span></label>
            <input class="fj-input" type="number" step="any" value="${escapeAttr(p.size != null ? p.size : 11.0)}" oninput="updateFontJsonProvider(${i}, 'size', Number(this.value))">
          </div>
          <div class="fj-field">
            <label class="fj-label">oversample <span class="fj-hint">— 采样率（可选）</span></label>
            <input class="fj-input" type="number" step="any" value="${escapeAttr(p.oversample != null ? p.oversample : '')}" oninput="updateFontJsonProvider(${i}, 'oversample', this.value === '' ? undefined : Number(this.value))">
          </div>
        </div>
      </div>
    `;
    return `<div class="fj-card">${cardHead}${fields}</div>`;
  }

  PM.fns.renderFontJsonCard = renderFontJsonCard;

  function updateFontJsonProvider(i, key, value) {
    if (!PM.state.fontJsonState.providers[i]) return;
    PM.state.fontJsonState.providers[i][key] = value;
    updateFontJsonSummary();
  }

  PM.fns.updateFontJsonProvider = updateFontJsonProvider;

  function updateFontJsonShift(i, axis, value) {
    if (!PM.state.fontJsonState.providers[i]) return;
    const p = PM.state.fontJsonState.providers[i];
    if (!Array.isArray(p.shift)) p.shift = [0, 0];
    p.shift[axis] = value;
    updateFontJsonSummary();
  }

  PM.fns.updateFontJsonShift = updateFontJsonShift;

  function removeFontJsonProvider(i) {
    PM.state.fontJsonState.providers.splice(i, 1);
    renderFontJsonEditor();
  }

  PM.fns.removeFontJsonProvider = removeFontJsonProvider;

  function addFontJsonProvider() {
    PM.state.fontJsonState.providers.push({ type: 'ttf', file: '', shift: [0, 0], size: 11.0, oversample: 8.0 });
    renderFontJsonEditor();
  }

  PM.fns.addFontJsonProvider = addFontJsonProvider;

  function updateFontJsonSummary() {
    const el = PM.fns.$('fontJsonEditorSummary');
    if (!el) return;
    const n = PM.state.fontJsonState.providers.length;
    const types = PM.state.fontJsonState.providers.map(p => p.type || 'ttf').join(', ');
    el.textContent = n + ' 个 provider · 类型：' + (types || '—');
  }

  PM.fns.updateFontJsonSummary = updateFontJsonSummary;

  function saveFontJsonEditor() {
    const data = { providers: PM.state.fontJsonState.providers };
    if (PM.state.fontJsonState.onSave) PM.state.fontJsonState.onSave(data);
    closeFontJsonEditor();
  }

  PM.fns.saveFontJsonEditor = saveFontJsonEditor;

  function escapeAttr(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#39;')
      .replace(/"/g, '&quot;');
  }

  PM.fns.escapeAttr = escapeAttr;

  function renderFontChips(section, idx) {
    const fonts = Array.isArray(section.fontList) ? section.fontList : [];
    const ns = (function () {
      const cats = PM.fns.getCurrentCategories();
      if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return 'minecraft';
      return (cats[PM.state.selectedH2].ns || 'minecraft');
    })();
    const chips = fonts.map((f, k) => {
      const fontId = (f && f.fontId) || '';
      const displayName = (f && f.displayName) || fontId || ('字体 ' + (k + 1));
      const fNs = (f && f.ns) || ns;
      const nsBadge = `<span class="font-chip-ns-badge" title="命名空间">${PM.fns.escapeHtml(fNs)}</span>`;
      return `<span class="chip font-chip">
        <span class="font-chip-name">${PM.fns.escapeHtml(displayName)}</span>
        ${nsBadge}
        <span class="font-chip-edit" onclick="openFontChipJsonEditor(${idx}, ${k})" title="图形化编辑字体 JSON (${escapeAttr(fontId || fNs)})">✏ JSON</span>
        <span class="x" title="删除" onclick="removeFontFromSection(${idx}, ${k})">×</span>
      </span>`;
    }).join('');
    // 字体只能通过下方的上传区添加。
    return chips;
  }

  PM.fns.renderFontChips = renderFontChips;

  function addFontToSection(idx) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section) return;
    if (!Array.isArray(section.fontList)) section.fontList = [];
    const ns = cats[PM.state.selectedH2].ns || 'minecraft';
    section.fontList.push({ fontId: '', displayName: '', ns });
    refreshFontChipList(idx);
  }

  PM.fns.addFontToSection = addFontToSection;

  async function openFontChipJsonEditor(idx, k) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const cat = cats[PM.state.selectedH2];
    const section = cat.sections[idx];
    if (!section || !section.fontList || !section.fontList[k]) return;
    const font = section.fontList[k];

    const ns = font.ns || cat.ns || 'minecraft';
    const fontId = (font.fontId || '').trim();
    const effectiveId = fontId || ('font_' + (k + 1));
    // JSON 文件位于 .ttf 同级，即 assets/<ns>/font/<id>.json
    const jsonPath = ns + ':font/' + effectiveId + '.json';
    const fullJsonPath = 'assets/' + ns + '/font/' + effectiveId + '.json';

    let initial = null;
    if (PM.state.zip && PM.state.zip.file(fullJsonPath)) {
      try {
        const text = await PM.state.zip.file(fullJsonPath).async('string');
        initial = JSON.parse(text);
      } catch (e) { initial = null; }
    }
    if (!initial) {
      const expectedExt = PM.fns.detectFontExtensionFor(fullJsonPath) || 'ttf';
      initial = {
        providers: [
          { type: 'ttf', file: ns + ':' + effectiveId + '.' + expectedExt, shift: [0, 0], size: 11.0, oversample: 8.0 }
        ]
      };
    }

    openFontJsonEditor(jsonPath, initial, async (savedJson) => {
      try {
        PM.state.zip.file(fullJsonPath, JSON.stringify(savedJson, null, 2));
        PM.state.fileMap[fullJsonPath] = PM.state.zip.file(fullJsonPath);
        PM.fns.showToast(PM.fns.t('toast.fontJsonSavedAt', { path: fullJsonPath }), 'success');
        if (typeof refreshFontChipList === 'function') refreshFontChipList(idx);
      } catch (e) {
        PM.fns.showToast(PM.fns.t('toast.saveFailed', { msg: e.message }), 'error');
      }
    });
  }

  PM.fns.openFontChipJsonEditor = openFontChipJsonEditor;

  function removeFontFromSection(idx, k) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section || !Array.isArray(section.fontList)) return;
    section.fontList.splice(k, 1);
    refreshFontChipList(idx);
  }

  PM.fns.removeFontFromSection = removeFontFromSection;

  function updateFontField(idx, k, field, value) {
    const cats = PM.fns.getCurrentCategories();
    if (PM.state.selectedH2 === null || !cats[PM.state.selectedH2]) return;
    const section = cats[PM.state.selectedH2].sections[idx];
    if (!section || !section.fontList || !section.fontList[k]) return;
    section.fontList[k][field] = value;
    // 如果用户通过下拉框编辑命名空间，也要同步 chip 的显示标签（例如之后编辑 fontId 时 chip 会显示该 ID）。
  }

  PM.fns.updateFontField = updateFontField;

  function refreshFontChipList(idx) {
    // 已废弃，保留空函数以兼容旧调用者。
  }

  PM.fns.refreshFontChipList = refreshFontChipList;

})();
