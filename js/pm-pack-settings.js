

(function () {
  'use strict';

  // 全局 PM 命名空间（由 pm-state.js 首次定义，后续模块只读不重置）。
  if (typeof window.PM === 'undefined') {
    window.PM = { state: {}, fns: {} };
  }
  function enterPackSettingsMode() {
    PM.fns.$('explorerView').style.display = 'none';
    PM.fns.$('modelsView').style.display = 'none';
    PM.fns.$('packSettingsView').style.display = '';
    PM.fns.$('noCategoryOverlay').style.display = 'none';
    PM.fns.$('noPackOverlay').style.display = 'none';
    PM.fns.$('h3MainHeader').style.display = 'none';
    PM.fns.$('h3SectionsArea').style.display = 'none';
    PM.fns.$('h3Empty').style.display = 'none';
    PM.fns.$('h3CardsList').innerHTML = '';
    PM.fns.$('rightPanel').style.display = 'none';
    // 与实际文件不一致。读取是异步的，但 DOM 字段可以先放当前 PM.state.packMeta 的值，
    // 待解析完成后用最新值覆盖（如果用户没修改过的话）。
    const initialDesc = PM.state.packMeta.description || '';
    const initialFmt = PM.state.packMeta.pack_format || 34;
    PM.fns.$('psFormat').value = initialFmt;
    PM.fns.$('psDesc').value = initialDesc;
    PM.fns.$('psFileName').value = PM.state.packFileName || '';
    PM.fns.readPackMetaFromZip().then(() => {
      // 仅在用户尚未修改表单时覆盖（desc 字段未聚焦）
      if (document.activeElement !== PM.fns.$('psDesc') && document.activeElement !== PM.fns.$('psFormat')) {
        PM.fns.$('psFormat').value = PM.state.packMeta.pack_format || 34;
        PM.fns.$('psDesc').value = PM.state.packMeta.description || '';
      }
    });
    renderPackImage();
    PM.fns.pmReplayViewFade(PM.fns.$('packSettingsView'));
  }

  PM.fns.enterPackSettingsMode = enterPackSettingsMode;

  function savePackMetaFromSettings() {
    const fmtRaw = PM.fns.$('psFormat').value;
    const fmt = parseInt(fmtRaw, 10);
    if (!fmtRaw || !Number.isFinite(fmt) || fmt < 1) {
      PM.fns.showToast(PM.fns.t('toast.packFormatInvalid'), 'error'); return;
    }
    PM.state.packMeta.pack_format = fmt;
    PM.state.packMeta.description = PM.fns.$('psDesc').value.trim();
    PM.state.packFileName = PM.fns.$('psFileName').value.trim();
    // 无需等待"生成并下载"。
    if (PM.state.zip) {
      try {
        const mcmeta = { pack: { pack_format: PM.state.packMeta.pack_format, description: PM.state.packMeta.description } };
        PM.state.zip.file('pack.mcmeta', JSON.stringify(mcmeta, null, 2));
        PM.state.fileMap['pack.mcmeta'] = PM.state.zip.file('pack.mcmeta');
      } catch (e) {
        PM.fns.showToast(PM.fns.t('toast.saveFailed', { msg: e.message }), 'error');
        return;
      }
    }
    PM.fns.showToast(PM.fns.t('toast.packMetaUpdated'), 'success');
  }

  PM.fns.savePackMetaFromSettings = savePackMetaFromSettings;

  function renderPackImage() {
    const area = PM.fns.$('psImgArea');
    if (!area) return;
    if (!PM.state.packImageBlob) {
      area.innerHTML = `<div class="ps-img-placeholder">暂无封面图片<br>点击下方「上传封面」添加 pack.png</div>`;
      return;
    }
    const url = URL.createObjectURL(PM.state.packImageBlob);
    const img = new Image();
    img.onload = () => {
      area.innerHTML = `<div class="ps-img-preview-wrap">
          <img class="ps-img-preview" src="${url}" alt="pack.png preview">
          <span class="ps-img-badge">${img.width}×${img.height}</span>
        </div>`;
    };
    img.src = url;
  }

  PM.fns.renderPackImage = renderPackImage;

  function handlePackImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.includes('png')) { PM.fns.showToast(PM.fns.t('toast.coverNotPng'), 'error'); input.value = ''; return; }
    PM.state.packImageBlob = file;
    renderPackImage();
    input.value = '';
  }

  PM.fns.handlePackImageUpload = handlePackImageUpload;

  function removePackImage() {
    if (!PM.state.packImageBlob) return;
    if (!confirm(PM.fns.t('confirm.coverRemove'))) return;
    PM.state.packImageBlob = null;
    renderPackImage();
    PM.fns.showToast(PM.fns.t('toast.coverRemoved'), 'success');
  }

  PM.fns.removePackImage = removePackImage;

})();
