(function () {
  'use strict';

  // ── 回到顶部 ────────────────────────────────────────────────────────────
  function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    const onScroll = () => btn.classList.toggle('show', window.scrollY > 100);
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ── 灯箱（画廊 + 模组特性） ──────────────────────────────────────────
  function initLightbox() {
    const lightbox       = document.getElementById('lightbox');
    const lightboxImage  = document.getElementById('lightboxImage');
    const lightboxCap    = document.getElementById('lightboxCaption');
    const lightboxCount  = document.getElementById('lightboxCounter');
    const lightboxClose  = document.getElementById('lightboxClose');
    const lightboxPrev   = document.getElementById('lightboxPrev');
    const lightboxNext   = document.getElementById('lightboxNext');

    if (!lightbox || !lightboxImage) return;

    // 画廊项（带 .gallery-item 类的可点击 figure）
    const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
    // 模组特性图片（可点击的 .mod-features-img 元素）
    const modFeatureImages = Array.from(document.querySelectorAll('.mod-features-img'));

    // 所有打开灯箱的可点击项
    const allItems = [...galleryItems, ...modFeatureImages];
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
      const rect = lightboxImage.getBoundingClientRect();
      const maxX = Math.max(0, (rect.width * scale - rect.width) / 2);
      const maxY = Math.max(0, (rect.height * scale - rect.height) / 2);
      translateX = Math.max(-maxX, Math.min(maxX, translateX));
      translateY = Math.max(-maxY, Math.min(maxY, translateY));
    }

    function updateImageTransform() {
      lightboxImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      lightboxImage.style.transformOrigin = 'center center';
      if (scale > 1) {
        lightboxImage.style.cursor = isDragging ? 'grabbing' : 'grab';
      } else {
        lightboxImage.style.cursor = 'zoom-in';
      }
    }

    function showImage(idx) {
      if (!allItems.length) return;
      if (idx < 0) idx = allItems.length - 1;
      if (idx >= allItems.length) idx = 0;
      currentIndex = idx;
      const item = allItems[currentIndex];
      const img = item.querySelector('img');
      const overlay = item.querySelector('.overlay');
      const captionText = overlay ? overlay.textContent.trim() : '';
      lightboxImage.src = img.src;
      lightboxImage.alt = captionText || img.alt || '';
      lightboxCap.textContent = captionText;
      lightboxCount.textContent = (currentIndex + 1) + ' / ' + allItems.length;

      // 根据项数量显示/隐藏上/下一张按钮
      const canNavigate = allItems.length > 1;
      lightboxPrev.style.display = canNavigate ? '' : 'none';
      lightboxNext.style.display = canNavigate ? '' : 'none';

      // 切换图片时重置缩放
      resetZoom();
    }

    function open(idx) {
      resetZoom();
      showImage(idx);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');
    }
    function close() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-open');
      resetZoom();
    }

    // 为画廊项添加点击处理
    galleryItems.forEach((item, idx) => {
      item.addEventListener('click', () => open(idx));
    });

    // 为模组特性图片添加点击处理
    modFeatureImages.forEach((item, idx) => {
      item.addEventListener('click', () => open(galleryItems.length + idx));
      item.style.cursor = 'zoom-in';
    });

    lightboxClose?.addEventListener('click', close);
    lightboxPrev?.addEventListener('click', (e) => { e.stopPropagation(); showImage(currentIndex - 1); });
    lightboxNext?.addEventListener('click', (e) => { e.stopPropagation(); showImage(currentIndex + 1); });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) close();
    });

    // 鼠标滚轮缩放
    lightbox.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_FACTOR : ZOOM_FACTOR;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));

      if (newScale === scale) return;

      // 缩放到鼠标位置
      if (scale > 1) {
        const rect = lightboxImage.getBoundingClientRect();
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
    lightboxImage.addEventListener('mousedown', (e) => {
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
    lightboxImage.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (scale > 1) {
        resetZoom();
      } else {
        // 双击放大
        scale = 2;
        updateImageTransform();
      }
    });

    // 阻止图片拖拽
    lightboxImage.addEventListener('dragstart', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
      else if (e.key === 'ArrowRight') showImage(currentIndex + 1);
      else if (e.key === '0') resetZoom();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initBackToTop();
    initLightbox();
    initHeroScrollCue();
  });

  // ── 首页滚动指示 ──────────────────────────────────────────────────────────
  function initHeroScrollCue() {
    const cue = document.querySelector('.hero-scroll-cue');
    if (!cue) return;
    const onScroll = () => {
      cue.classList.toggle('is-hidden', window.scrollY > 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();