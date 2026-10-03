

(function () {
  'use strict';

  // 全局 PM 命名空间（由 pm-state.js 首次定义，后续模块只读不重置）。
  if (typeof window.PM === 'undefined') {
    window.PM = { state: {}, fns: {} };
  }
  function teUpdateDirtyUi() {
    const badge = PM.fns.$('teDirtyBadge');
    const saveBtn = PM.fns.$('teSaveBtn');
    if (badge) badge.classList.toggle('show', PM.state.teDirty);
    if (saveBtn) saveBtn.disabled = false;
    teUpdateFooter();
  }

  PM.fns.teUpdateDirtyUi = teUpdateDirtyUi;

  function teUpdateFooter() {
    const status = PM.fns.$('teStatus');
    if (!status) return;
    const msg = PM.state.teDirty ? '● 内容有修改，记得保存'
      : (PM.state.teOriginalText !== '' ? '✓ 已同步至内存（下载资源包时一起打包）' : '');
    status.textContent = msg;
    status.className = 'te-status ' + (PM.state.teDirty ? 'warn' : 'ok');
  }

  PM.fns.teUpdateFooter = teUpdateFooter;

  async function openTextEditor(path) {
    if (!path) return;
    if (!PM.fns.isTextFile(path)) { PM.fns.showToast(PM.fns.t('toast.unsupportedText'), 'error'); return; }
    if (!PM.state.zip || !PM.state.zip.file(path)) { PM.fns.showToast(PM.fns.t('toast.fileNotInPack'), 'error'); return; }
    if (PM.state.teDirty && PM.state.teCurrentPath && PM.state.teCurrentPath !== path) {
      if (!confirm(`「${PM.state.teCurrentPath.split('/').pop()}」有未保存的修改，是否丢弃？`)) return;
    }
    PM.state.teCurrentPath = path;
    PM.state.teDirty = false;
    const overlay = PM.fns.$('textEditorOverlay');
    PM.fns.$('teFileName').textContent = path.split('/').pop();
    PM.fns.$('teFilePath').textContent = path;
    PM.fns.$('teFileName').title = path.split('/').pop();
    PM.fns.$('teFilePath').title = path;
    const body = PM.fns.$('teBody');
    const status = PM.fns.$('teStatus');
    const meta = PM.fns.$('teMeta');
    PM.fns.$('teDirtyBadge').classList.remove('show');
    status.textContent = '加载中...'; status.className = 'te-status';
    meta.textContent = '';
    body.innerHTML = `<textarea class="text-editor-textarea" id="teTextarea" spellcheck="false" autocomplete="off" wrap="off"></textarea>`;
    overlay.classList.add('is-open');
    const ta = PM.fns.$('teTextarea');
    ta.focus();
    try {
      const text = await PM.state.zip.file(path).async('string');
      PM.state.teOriginalText = text;
      ta.value = text;
      try { ta.setSelectionRange(text.length, text.length); } catch (e) {}
      meta.textContent = `${new TextEncoder().encode(text).length} 字节 · ${text.length} 字符`;
      teUpdateDirtyUi();
      setTimeout(() => teUpdateFooter(), 0);
    } catch (e) {
      status.innerHTML = `<span class="err">读取失败：${PM.fns.escapeHtml(e.message || String(e))}</span>`;
    }
    ta.oninput = () => {
      const v = ta.value;
      const dirty = v !== PM.state.teOriginalText;
      if (dirty !== PM.state.teDirty) { PM.state.teDirty = dirty; teUpdateDirtyUi(); }
      meta.textContent = `${new TextEncoder().encode(v).length} 字节 · ${v.length} 字符`;
      teUpdateFooter();
    };
    ta.onkeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveTextEditor(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = ta.selectionStart, end = ta.selectionEnd;
        const insert = '    ';
        ta.value = ta.value.slice(0, start) + insert + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + insert.length;
        ta.dispatchEvent(new Event('input'));
      }
    };
  }

  PM.fns.openTextEditor = openTextEditor;

  function saveTextEditor() {
    if (!PM.state.teCurrentPath) return;
    const ta = PM.fns.$('teTextarea');
    if (!ta) return;
    const text = ta.value;
    try {
      if (!PM.state.zip) throw new Error(PM.fns.t('pm.textEditor.zipNotLoaded'));
      PM.state.zip.file(PM.state.teCurrentPath, text);
      PM.state.fileMap[PM.state.teCurrentPath] = PM.state.zip.file(PM.state.teCurrentPath);
      PM.state.teOriginalText = text;
      PM.state.teDirty = false;
      const status = PM.fns.$('teStatus');
      const meta = PM.fns.$('teMeta');
      if (status) {
        status.innerHTML = `<span class="ok">${PM.fns.t('pm.te.savedOk')}</span>${PM.fns.t('pm.te.savedHint')}`;
        status.className = 'te-status';
      }
      if (meta) meta.textContent = `${new TextEncoder().encode(text).length} 字节 · ${text.length} 字符`;
      PM.fns.$('teDirtyBadge').classList.remove('show');
      teUpdateFooter();
      PM.fns.showToast(PM.fns.t('toast.teSaved', { name: PM.state.teCurrentPath.split('/').pop() }), 'success');
      PM.fns.renderFileBrowser();
    } catch (e) {
      PM.fns.showToast(PM.fns.t('toast.saveFailed', { msg: e.message || e }), 'error');
    }
  }

  PM.fns.saveTextEditor = saveTextEditor;

  function closeTextEditor(confirmIfDirty) {
    if (PM.state.teDirty && confirmIfDirty) {
      if (!confirm(PM.fns.t('confirm.closeWithEdits'))) return;
    }
    PM.state.teCurrentPath = null; PM.state.teOriginalText = ''; PM.state.teDirty = false;
    PM.fns.$('textEditorOverlay').classList.remove('is-open');
  }

  PM.fns.closeTextEditor = closeTextEditor;

})();
