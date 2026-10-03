

(function () {
  'use strict';

  // 全局 PM 命名空间（由 pm-state.js 首次定义，后续模块只读不重置）。
  if (typeof window.PM === 'undefined') {
    window.PM = { state: {}, fns: {} };
  }
  // 所有可变状态集中在 PM.state 命名空间下，方便跨模块共享。
  PM.state.zip = null;
  PM.state.fileMap = {};
  PM.state.packMeta = { pack_format: 34, description: '豹猫指示牌模组的自定义资源包' };
  PM.state.packFileName = '';
  PM.state.packImageBlob = null;
  PM.state.currentH1 = 'patterns';
  PM.state.selectedH2 = null;
  PM.state.editingH3 = null;
  PM.state.folderFileCache = {};
  PM.state.patternsCategories = [];
  PM.state.fontsCategories = [];
  PM.state.preExistingUiDefinitionsPaths = new Set();
  PM.state.explorerPath = '';
  PM.state.explorerHistory = [];
  PM.state.explorerFuture = [];
  PM.state.explorerRenderVersion = 0;
  PM.state.explorerViewMode = 'list';
  PM.state.explorerSelection = [];
  PM.state.explorerClipboard = { type: null, paths: [] };
  PM.state.expandedTreeFolders = new Set();
  PM.state.imageUrlCache = new Map();
  PM.state.currentPreviewPath = null;
  PM.state.currentPreviewScale = 1;
  PM.state.currentPreviewOffsetX = 0;
  PM.state.currentPreviewOffsetY = 0;
  PM.state.PREVIEW_MIN_SCALE = 0.05;
  PM.state.PREVIEW_MAX_SCALE = 20;
  PM.state.PREVIEW_STEP_SCALE = 1.25;
  PM.state.previewIsDragging = false;
  PM.state.previewDragStartX = 0;
  PM.state.previewDragStartY = 0;
  PM.state.previewDragStartOffsetX = 0;
  PM.state.previewDragStartOffsetY = 0;
  PM.state.previewDocListenersAttached = false;
  // 灯箱式图片预览：当前文件夹内同级图片列表及当前显示索引，
  // 便于用户用 ◀ / ▶ 浏览目录内所有图片。
  PM.state.previewList = [];
  PM.state.previewIndex = 0;
  PM.state.teCurrentPath = null;
  PM.state.teOriginalText = '';
  PM.state.teDirty = false;
  PM.state.nmState = {
    step: 1, ns: 'minecraft', modelId: '', localizedName: '',
    jsonContent: null, jsonName: '', textures: []
  };
  PM.state.tabH2State = { patterns: null, fonts: null };
  PM.state.tabH3State = { patterns: null, fonts: null };
  PM.state.toastTimeoutId = null;
  PM.state.renameFontState = { sectionIdx: null, stem: null, fontPath: null };
  PM.state.fontJsonState = { path: null, providers: [], onSave: null };
  PM.state._explorerSelectionAnchor = null;
  PM.state._ctxMenuOpenedForPath = null;
  PM.state.imageRenameState = { sectionIdx: null, pending: [] };
  PM.state.fontConfigState = {
    sectionIdx: null,
    sourceFontPath: null,
    advancedEditorOpen: false
  };
  PM.state.pickPathState = { currentPath: '', ns: 'minecraft', rootRelative: '', selectedPath: '' };

  // 把 i18n.js 注册到 window 的全局 t() 桥接进 PM.fns.t。
  // 所有 pm-* 模块按约定统一使用 PM.fns.t(key, vars) 取文案，
  // 而 i18n.js 只负责把 t() 挂到 window 上 (与 components.js、页面其他
  // inline script 共享)。此处确保 PM 命名空间就绪后立即同步一次，
  // 同时处理 i18n.js 仍未执行的极端情况：若 window.t 尚未存在，
  // 把它存到 _pendingT 上，等到 i18n.js 执行完再补挂。
  PM.fns._pendingT = typeof window.t === 'function' ? window.t : null;
  PM.fns.t = PM.fns._pendingT || function (key, vars, lang) {
    // 退路：i18n.js 尚未加载时，至少保证调用不抛错，
    // 返回键名便于调试。
    if (vars && typeof vars === 'object') {
      return key.replace(/\{(\w+)\}/g, function (m, k) {
        return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m;
      });
    }
    return key;
  };

  function snapshotPreExistingUiDefinitions() {
    PM.state.preExistingUiDefinitionsPaths = new Set(
      Object.keys(PM.state.fileMap).filter(p =>
        /\/ui_definitions\/[^/]+\.json$/i.test(p) && !p.endsWith('/')
      )
    );
  }
  PM.fns.snapshotPreExistingUiDefinitions = snapshotPreExistingUiDefinitions;
})();
