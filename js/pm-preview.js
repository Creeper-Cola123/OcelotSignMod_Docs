

(function () {
  'use strict';

  // 全局 PM 命名空间（由 pm-state.js 首次定义，后续模块只读不重置）。
  if (typeof window.PM === 'undefined') {
    window.PM = { state: {}, fns: {} };
  }

  // 扩展名白名单——和原版一致。
  const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];

  function isImagePath(path) {
    if (!path || path.endsWith('/')) return false;
    const dot = path.lastIndexOf('.');
    if (dot < 0) return false;
    const ext = path.slice(dot + 1).toLowerCase();
    return IMAGE_EXTS.indexOf(ext) >= 0;
  }

  // 收集与给定图片同目录的所有图片，供 ◀ / ▶ 在文件夹内翻页。
  // 优先使用 explorer 当前目录；若 explorer 路径与该图片不匹配
  // （比如从字体/模型列表中点开），就回退到该图片所在的目录。
  function buildPreviewList(path) {
    if (!path) return [];
    const lastSlash = path.lastIndexOf('/');
    const dir = lastSlash >= 0 ? path.slice(0, lastSlash) : '';
    // 兜底：explorer 路径在跨视图打开时可能不准确——如果图片本身不
    // 处于 explorer 当前目录，则使用图片所在目录。
    let useDir = dir;
    if (PM.state.explorerPath !== undefined && PM.state.explorerPath !== null) {
      if (dir === PM.state.explorerPath) {
        useDir = PM.state.explorerPath;
      } else if (PM.state.explorerPath && dir.indexOf(PM.state.explorerPath + '/') === 0) {
        // 子目录也以子目录为范围，避免和 explorer 当前目录不匹配。
        useDir = dir;
      } else {
        useDir = dir;
      }
    }
    const prefix = useDir ? useDir + '/' : '';
    const list = Object.keys(PM.state.fileMap)
      .filter(p => !p.endsWith('/'))
      .filter(p => isImagePath(p))
      .filter(p => useDir === '' ? p.indexOf('/') < 0 : p.indexOf(prefix) === 0)
      .sort();
    return list;
  }

  PM.fns.buildPreviewList = buildPreviewList;

  function showImageInLightbox(path) {
    const img = PM.fns.$('imgPreviewImg');
    const counter = PM.fns.$('imgPreviewCounter');
    const prev = PM.fns.$('imgPreviewPrev');
    const next = PM.fns.$('imgPreviewNext');
    if (!img) return;
    PM.state.currentPreviewPath = path;
    // 重置缩放/平移——切到下一张时不要保留上一张的拖动偏移。
    PM.state.currentPreviewScale = 1;
    PM.state.currentPreviewOffsetX = 0;
    PM.state.currentPreviewOffsetY = 0;
    PM.state.previewIsDragging = false;
    img.classList.remove('dragging');

    // 更新索引 / 计数。
    const list = PM.state.previewList || [];
    const idx = list.indexOf(path);
    PM.state.previewIndex = idx >= 0 ? idx : 0;
    if (counter) counter.textContent = (PM.state.previewIndex + 1) + ' / ' + Math.max(1, list.length);
    if (prev) prev.style.display = list.length > 1 ? '' : 'none';
    if (next) next.style.display = list.length > 1 ? '' : 'none';

    // 显隐状态：显示 loading 态，等 image.onload 切到 ready 态。
    const loading = PM.fns.$('imgPreviewLoading');
    const error = PM.fns.$('imgPreviewError');
    if (loading) loading.style.display = '';
    if (error) error.style.display = 'none';
    if (img) img.style.visibility = 'hidden';

    // 准备图片源。
    let url = PM.state.imageUrlCache.get(path);
    if (!url) {
      const entry = PM.state.zip && PM.state.zip.file(path);
      if (!entry) {
        if (loading) loading.style.display = 'none';
        if (error) {
          error.style.display = '';
          const et = PM.fns.$('imgPreviewErrorText');
          if (et) et.textContent = '文件不存在：' + path;
        }
        return;
      }
      entry.async('blob').then(blob => {
        const u = URL.createObjectURL(blob);
        PM.state.imageUrlCache.set(path, u);
        // 重新校验：用户可能已经切到下一张了。
        if (PM.state.currentPreviewPath !== path) return;
        loadImageIntoLightbox(path, u);
      }).catch(err => {
        if (PM.state.currentPreviewPath !== path) return;
        if (loading) loading.style.display = 'none';
        if (error) {
          error.style.display = '';
          const et = PM.fns.$('imgPreviewErrorText');
          if (et) et.textContent = '无法加载图片：' + (err && err.message ? err.message : '');
        }
      });
      return;
    }
    loadImageIntoLightbox(path, url);
  }

  function loadImageIntoLightbox(path, url) {
    const img = PM.fns.$('imgPreviewImg');
    if (!img) return;
    const onLoad = () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      if (PM.state.currentPreviewPath !== path) return; // 用户已经翻走
      const loading = PM.fns.$('imgPreviewLoading');
      const error = PM.fns.$('imgPreviewError');
      if (loading) loading.style.display = 'none';
      if (error) error.style.display = 'none';
      img.style.visibility = '';
      // 新图默认自适应窗口。
      fitImageToWindow();
    };
    const onError = () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      if (PM.state.currentPreviewPath !== path) return;
      const loading = PM.fns.$('imgPreviewLoading');
      const error = PM.fns.$('imgPreviewError');
      if (loading) loading.style.display = 'none';
      if (error) {
        error.style.display = '';
        const et = PM.fns.$('imgPreviewErrorText');
        if (et) et.textContent = '图片加载失败：' + path;
      }
    };
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    img.src = url;
    img.alt = path;
  }

  async function openImagePreview(path) {
    if (!path) return;
    if (!isImagePath(path)) {
      PM.fns.showToast(PM.fns.t('toast.notImage'), 'error');
      return;
    }
    PM.state.previewList = buildPreviewList(path);
    PM.state.previewIndex = Math.max(0, PM.state.previewList.indexOf(path));
    const overlay = PM.fns.$('imgPreviewOverlay');
    if (!overlay) return;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    // 首次打开时挂上 wheel / mousedown / dblclick 交互。
    attachPreviewInteraction();
    showImageInLightbox(path);
  }

  PM.fns.openImagePreview = openImagePreview;

  function closeImagePreview() {
    const overlay = PM.fns.$('imgPreviewOverlay');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    PM.state.currentPreviewPath = null;
    PM.state.currentPreviewScale = 1;
    PM.state.currentPreviewOffsetX = 0;
    PM.state.currentPreviewOffsetY = 0;
    PM.state.previewIsDragging = false;
    if (PM.state.previewDocListenersAttached) {
      document.removeEventListener('mousemove', previewOnMouseMove);
      document.removeEventListener('mouseup', previewOnMouseUp);
      PM.state.previewDocListenersAttached = false;
    }
  }

  PM.fns.closeImagePreview = closeImagePreview;

  function dirOf(path) {
    const i = path.lastIndexOf('/');
    return i >= 0 ? path.slice(0, i) : '';
  }

  function previewPrevImage() {
    const list = PM.state.previewList || [];
    if (list.length < 2) return;
    let i = (PM.state.previewIndex - 1 + list.length) % list.length;
    let newPath = list[i];
    // 如果当前列表里没这个（极端情况），重建列表再取。
    if (!newPath) return;
    if (dirOf(newPath) !== dirOf(PM.state.currentPreviewPath || '')) {
      PM.state.previewList = buildPreviewList(newPath);
      i = PM.state.previewList.indexOf(newPath);
      if (i < 0) i = 0;
    }
    PM.state.previewIndex = i;
    showImageInLightbox(PM.state.previewList[i]);
  }

  PM.fns.previewPrevImage = previewPrevImage;

  function previewNextImage() {
    const list = PM.state.previewList || [];
    if (list.length < 2) return;
    let i = (PM.state.previewIndex + 1) % list.length;
    let newPath = list[i];
    if (!newPath) return;
    if (dirOf(newPath) !== dirOf(PM.state.currentPreviewPath || '')) {
      PM.state.previewList = buildPreviewList(newPath);
      i = PM.state.previewList.indexOf(newPath);
      if (i < 0) i = 0;
    }
    PM.state.previewIndex = i;
    showImageInLightbox(PM.state.previewList[i]);
  }

  PM.fns.previewNextImage = previewNextImage;

  function applyPreviewTransform() {
    const img = PM.fns.$('imgPreviewImg');
    if (!img || !img.naturalWidth) return;
    img.style.transform = `translate(${PM.state.currentPreviewOffsetX}px, ${PM.state.currentPreviewOffsetY}px) scale(${PM.state.currentPreviewScale})`;
    updateZoomDisplay();
  }

  PM.fns.applyPreviewTransform = applyPreviewTransform;

  function updateZoomDisplay() {
    const el = PM.fns.$('imgPreviewZoomLevel');
    if (el) el.textContent = Math.round(PM.state.currentPreviewScale * 100) + '%';
  }

  PM.fns.updateZoomDisplay = updateZoomDisplay;

  function scalePreviewAround(newScale, focalX, focalY) {
    const img = PM.fns.$('imgPreviewImg');
    if (!img || !img.naturalWidth) return;
    const oldScale = PM.state.currentPreviewScale;
    newScale = Math.max(PM.state.PREVIEW_MIN_SCALE, Math.min(PM.state.PREVIEW_MAX_SCALE, newScale));
    if (Math.abs(newScale - oldScale) < 1e-6) return;
    const w = PM.fns.$('imgPreviewOverlay') ? PM.fns.$('imgPreviewOverlay').getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    const oldW = img.naturalWidth * oldScale;
    const oldH = img.naturalHeight * oldScale;
    const oldCenterX = w.width / 2 + PM.state.currentPreviewOffsetX;
    const oldCenterY = w.height / 2 + PM.state.currentPreviewOffsetY;
    const oldLeft = oldCenterX - oldW / 2;
    const oldTop = oldCenterY - oldH / 2;
    const newW = img.naturalWidth * newScale;
    const newH = img.naturalHeight * newScale;
    const newLeft = focalX - (focalX - oldLeft) * newScale / oldScale;
    const newTop = focalY - (focalY - oldTop) * newScale / oldScale;
    const newCenterX = newLeft + newW / 2;
    const newCenterY = newTop + newH / 2;
    PM.state.currentPreviewScale = newScale;
    PM.state.currentPreviewOffsetX = newCenterX - w.width / 2;
    PM.state.currentPreviewOffsetY = newCenterY - w.height / 2;
    applyPreviewTransform();
  }

  PM.fns.scalePreviewAround = scalePreviewAround;

  function zoomInPreview(focalX, focalY) {
    const overlay = PM.fns.$('imgPreviewOverlay');
    if (!overlay) return;
    if (focalX === undefined) { const r = overlay.getBoundingClientRect(); focalX = r.width / 2; focalY = r.height / 2; }
    scalePreviewAround(PM.state.currentPreviewScale * PM.state.PREVIEW_STEP_SCALE, focalX, focalY);
  }

  PM.fns.zoomInPreview = zoomInPreview;

  function zoomOutPreview(focalX, focalY) {
    const overlay = PM.fns.$('imgPreviewOverlay');
    if (!overlay) return;
    if (focalX === undefined) { const r = overlay.getBoundingClientRect(); focalX = r.width / 2; focalY = r.height / 2; }
    scalePreviewAround(PM.state.currentPreviewScale / PM.state.PREVIEW_STEP_SCALE, focalX, focalY);
  }

  PM.fns.zoomOutPreview = zoomOutPreview;

  function resetPreviewZoom() {
    PM.state.currentPreviewScale = 1;
    PM.state.currentPreviewOffsetX = 0;
    PM.state.currentPreviewOffsetY = 0;
    applyPreviewTransform();
  }

  PM.fns.resetPreviewZoom = resetPreviewZoom;

  function fitImageToWindow() {
    const img = PM.fns.$('imgPreviewImg');
    const overlay = PM.fns.$('imgPreviewOverlay');
    if (!img || !overlay || !img.naturalWidth) return;
    const rect = overlay.getBoundingClientRect();
    const padding = 80;
    const availW = Math.max(1, rect.width - padding * 2);
    const availH = Math.max(1, rect.height - padding * 2 - 100); // 标题栏 + 底部工具栏
    const fitScale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
    PM.state.currentPreviewScale = Math.min(Math.max(PM.state.PREVIEW_MIN_SCALE, fitScale), 1);
    PM.state.currentPreviewOffsetX = 0;
    PM.state.currentPreviewOffsetY = 0;
    applyPreviewTransform();
  }

  PM.fns.fitImageToWindow = fitImageToWindow;

  function attachPreviewInteraction() {
    const img = PM.fns.$('imgPreviewImg');
    const overlay = PM.fns.$('imgPreviewOverlay');
    if (!img || !overlay) return;
    if (img.dataset.bound === '1') return;
    img.dataset.bound = '1';

    img.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = overlay.getBoundingClientRect();
      const focalX = e.clientX - rect.left;
      const focalY = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      scalePreviewAround(PM.state.currentPreviewScale * factor, focalX, focalY);
    }, { passive: false });

    img.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      PM.state.previewIsDragging = true;
      PM.state.previewDragStartX = e.clientX;
      PM.state.previewDragStartY = e.clientY;
      PM.state.previewDragStartOffsetX = PM.state.currentPreviewOffsetX;
      PM.state.previewDragStartOffsetY = PM.state.currentPreviewOffsetY;
      img.classList.add('dragging');
    });

    // 阻止浏览器原生图片拖拽，否则 mousedown→mousemove 后浏览器接管
    // 会让自定义拖拽事件失效（参见 landing.js 画廊灯箱的实现）。
    img.addEventListener('dragstart', (e) => e.preventDefault());
    img.addEventListener('selectstart', (e) => e.preventDefault());

    img.addEventListener('dblclick', (e) => {
      e.preventDefault();
      // 双击切换 fit / 100%。
      if (PM.state.currentPreviewScale > 1.05) {
        fitImageToWindow();
      } else {
        resetPreviewZoom();
      }
    });

    if (!PM.state.previewDocListenersAttached) {
      document.addEventListener('mousemove', previewOnMouseMove);
      document.addEventListener('mouseup', previewOnMouseUp);
      PM.state.previewDocListenersAttached = true;
    }
  }

  // 暴露给 boot 时一次性绑定；openImagePreview 每次都会确保调用一次。
  PM.fns.attachPreviewInteraction = attachPreviewInteraction;

  function previewOnMouseMove(e) {
    if (!PM.state.previewIsDragging) return;
    PM.state.currentPreviewOffsetX = PM.state.previewDragStartOffsetX + (e.clientX - PM.state.previewDragStartX);
    PM.state.currentPreviewOffsetY = PM.state.previewDragStartOffsetY + (e.clientY - PM.state.previewDragStartY);
    applyPreviewTransform();
  }

  PM.fns.previewOnMouseMove = previewOnMouseMove;

  function previewOnMouseUp() {
    if (!PM.state.previewIsDragging) return;
    PM.state.previewIsDragging = false;
    const img = PM.fns.$('imgPreviewImg');
    if (img) img.classList.remove('dragging');
  }

  PM.fns.previewOnMouseUp = previewOnMouseUp;

  async function downloadPreviewImage() {
    if (!PM.state.currentPreviewPath) return;
    try {
      const blob = await PM.state.zip.file(PM.state.currentPreviewPath).async('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = PM.state.currentPreviewPath.split('/').pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      PM.fns.showToast(PM.fns.t('toast.fileDownloaded', { name: PM.state.currentPreviewPath.split('/').pop() }), 'success');
    } catch (e) {
      PM.fns.showToast(PM.fns.t('toast.downloadFailed', { msg: e.message }), 'error');
    }
  }

  PM.fns.downloadPreviewImage = downloadPreviewImage;

  function toggleRightPanel() {
    PM.fns.$('rightPanel').classList.toggle('collapsed');
  }

  PM.fns.toggleRightPanel = toggleRightPanel;

  // 一次性挂全局键盘快捷键（在 PM.bootstrap 时调用）。
  function bindLightboxKeys() {
    if (PM.state._lightboxKeysBound) return;
    PM.state._lightboxKeysBound = true;
    document.addEventListener('keydown', (e) => {
      const overlay = PM.fns.$('imgPreviewOverlay');
      if (!overlay || !overlay.classList.contains('is-open')) return;
      // 输入框 / 文本框正在编辑时不要拦截键盘。
      const tag = document.activeElement && document.activeElement.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); previewPrevImage(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); previewNextImage(); }
    });
  }

  PM.fns.bindLightboxKeys = bindLightboxKeys;

})();
