

(function () {
  'use strict';

  // 全局 PM 命名空间（由 pm-state.js 首次定义，后续模块只读不重置）。
  if (typeof window.PM === 'undefined') {
    window.PM = { state: {}, fns: {} };
  }
  // 把所有 PM.fns.* 映射到 window.* 以兼容 HTML 中的内联 onclick 调用。
  window.showToast = PM.fns.showToast || (typeof showToast === 'function' ? showToast : PM.fns.showToast);
  window.closeWarningBanner = PM.fns.closeWarningBanner || (typeof closeWarningBanner === 'function' ? closeWarningBanner : PM.fns.closeWarningBanner);
  window.handleZipUpload = PM.fns.handleZipUpload || (typeof handleZipUpload === 'function' ? handleZipUpload : PM.fns.handleZipUpload);
  window.createNewPack = PM.fns.createNewPack || (typeof createNewPack === 'function' ? createNewPack : PM.fns.createNewPack);
  window.generateAndDownload = PM.fns.generateAndDownload || (typeof generateAndDownload === 'function' ? generateAndDownload : PM.fns.generateAndDownload);
  window.saveAllToZip = PM.fns.saveAllToZip || (typeof saveAllToZip === 'function' ? saveAllToZip : PM.fns.saveAllToZip);
  window.switchH1Tab = PM.fns.switchH1Tab || (typeof switchH1Tab === 'function' ? switchH1Tab : PM.fns.switchH1Tab);
  window.selectH2 = PM.fns.selectH2 || (typeof selectH2 === 'function' ? selectH2 : PM.fns.selectH2);
  window.editH2 = PM.fns.editH2 || (typeof editH2 === 'function' ? editH2 : PM.fns.editH2);
  window.deleteH2 = PM.fns.deleteH2 || (typeof deleteH2 === 'function' ? deleteH2 : PM.fns.deleteH2);
  window.addH2 = PM.fns.addH2 || (typeof addH2 === 'function' ? addH2 : PM.fns.addH2);
  window.addH3 = PM.fns.addH3 || (typeof addH3 === 'function' ? addH3 : PM.fns.addH3);
  window.toggleH3Editing = PM.fns.toggleH3Editing || (typeof toggleH3Editing === 'function' ? toggleH3Editing : PM.fns.toggleH3Editing);
  window.deleteH3 = PM.fns.deleteH3 || (typeof deleteH3 === 'function' ? deleteH3 : PM.fns.deleteH3);
  window.moveH3 = PM.fns.moveH3 || (typeof moveH3 === 'function' ? moveH3 : PM.fns.moveH3);
  window.updateH3Field = PM.fns.updateH3Field || (typeof updateH3Field === 'function' ? updateH3Field : PM.fns.updateH3Field);
  window.updateH3SubFolders = PM.fns.updateH3SubFolders || (typeof updateH3SubFolders === 'function' ? updateH3SubFolders : PM.fns.updateH3SubFolders);
  window.updateH3FilterList = PM.fns.updateH3FilterList || (typeof updateH3FilterList === 'function' ? updateH3FilterList : PM.fns.updateH3FilterList);
  window.openSectionImageBrowser = PM.fns.openSectionImageBrowser || (typeof openSectionImageBrowser === 'function' ? openSectionImageBrowser : PM.fns.openSectionImageBrowser);
  window.openSectionImageBrowserInline = PM.fns.openSectionImageBrowserInline || (typeof openSectionImageBrowserInline === 'function' ? openSectionImageBrowserInline : PM.fns.openSectionImageBrowserInline);
  window.openFontListInline = PM.fns.openFontListInline || (typeof openFontListInline === 'function' ? openFontListInline : PM.fns.openFontListInline);
  window.toggleImageFilter = PM.fns.toggleImageFilter || (typeof toggleImageFilter === 'function' ? toggleImageFilter : PM.fns.toggleImageFilter);
  window.toggleFontFilter = PM.fns.toggleFontFilter || (typeof toggleFontFilter === 'function' ? toggleFontFilter : PM.fns.toggleFontFilter);
  window.renderSubFolderTabs = PM.fns.renderSubFolderTabs || (typeof renderSubFolderTabs === 'function' ? renderSubFolderTabs : PM.fns.renderSubFolderTabs);
  window.removeSubFolderTab = PM.fns.removeSubFolderTab || (typeof removeSubFolderTab === 'function' ? removeSubFolderTab : PM.fns.removeSubFolderTab);
  window.deleteFontFile = PM.fns.deleteFontFile || (typeof deleteFontFile === 'function' ? deleteFontFile : PM.fns.deleteFontFile);
  window.openFontJsonInline = PM.fns.openFontJsonInline || (typeof openFontJsonInline === 'function' ? openFontJsonInline : PM.fns.openFontJsonInline);
  window.openRegistryFontJsonEditor = PM.fns.openRegistryFontJsonEditor || (typeof openRegistryFontJsonEditor === 'function' ? openRegistryFontJsonEditor : PM.fns.openRegistryFontJsonEditor);
  window.addFontToSection = PM.fns.addFontToSection || (typeof addFontToSection === 'function' ? addFontToSection : PM.fns.addFontToSection);
  window.removeFontFromSection = PM.fns.removeFontFromSection || (typeof removeFontFromSection === 'function' ? removeFontFromSection : PM.fns.removeFontFromSection);
  window.updateFontField = PM.fns.updateFontField || (typeof updateFontField === 'function' ? updateFontField : PM.fns.updateFontField);
  window.refreshFontChipList = PM.fns.refreshFontChipList || (typeof refreshFontChipList === 'function' ? refreshFontChipList : PM.fns.refreshFontChipList);
  window.listImagesInFolder = PM.fns.listImagesInFolder || (typeof listImagesInFolder === 'function' ? listImagesInFolder : PM.fns.listImagesInFolder);
  window.resolveSectionFolder = PM.fns.resolveSectionFolder || (typeof resolveSectionFolder === 'function' ? resolveSectionFolder : PM.fns.resolveSectionFolder);
  window.toggleH3Hint = PM.fns.toggleH3Hint || (typeof toggleH3Hint === 'function' ? toggleH3Hint : PM.fns.toggleH3Hint);
  window.updateH3Hint = PM.fns.updateH3Hint || (typeof updateH3Hint === 'function' ? updateH3Hint : PM.fns.updateH3Hint);
  window.openCatModal = PM.fns.openCatModal || (typeof openCatModal === 'function' ? openCatModal : PM.fns.openCatModal);
  window.closeCatModal = PM.fns.closeCatModal || (typeof closeCatModal === 'function' ? closeCatModal : PM.fns.closeCatModal);
  window.confirmCatModal = PM.fns.confirmCatModal || (typeof confirmCatModal === 'function' ? confirmCatModal : PM.fns.confirmCatModal);
  window.navigateExplorer = PM.fns.navigateExplorer || (typeof navigateExplorer === 'function' ? navigateExplorer : PM.fns.navigateExplorer);
  window.explorerGoBack = PM.fns.explorerGoBack || (typeof explorerGoBack === 'function' ? explorerGoBack : PM.fns.explorerGoBack);
  window.explorerGoForward = PM.fns.explorerGoForward || (typeof explorerGoForward === 'function' ? explorerGoForward : PM.fns.explorerGoForward);
  window.explorerGoUp = PM.fns.explorerGoUp || (typeof explorerGoUp === 'function' ? explorerGoUp : PM.fns.explorerGoUp);
  window.explorerReload = PM.fns.explorerReload || (typeof explorerReload === 'function' ? explorerReload : PM.fns.explorerReload);
  window.setExplorerView = PM.fns.setExplorerView || (typeof setExplorerView === 'function' ? setExplorerView : PM.fns.setExplorerView);
  window.explorerItemClick = PM.fns.explorerItemClick || (typeof explorerItemClick === 'function' ? explorerItemClick : PM.fns.explorerItemClick);
  window.explorerItemOpen = PM.fns.explorerItemOpen || (typeof explorerItemOpen === 'function' ? explorerItemOpen : PM.fns.explorerItemOpen);
  window.explorerItemDblClick = PM.fns.explorerItemDblClick || (typeof explorerItemDblClick === 'function' ? explorerItemDblClick : PM.fns.explorerItemDblClick);
  window.showExplorerContextMenu = PM.fns.showExplorerContextMenu || (typeof showExplorerContextMenu === 'function' ? showExplorerContextMenu : PM.fns.showExplorerContextMenu);
  window.hideExplorerContextMenu = PM.fns.hideExplorerContextMenu || (typeof hideExplorerContextMenu === 'function' ? hideExplorerContextMenu : PM.fns.hideExplorerContextMenu);
  window.renderExplorerContent = PM.fns.renderExplorerContent || (typeof renderExplorerContent === 'function' ? renderExplorerContent : PM.fns.renderExplorerContent);
  window.updateExplorerToolbar = PM.fns.updateExplorerToolbar || (typeof updateExplorerToolbar === 'function' ? updateExplorerToolbar : PM.fns.updateExplorerToolbar);
  window.toggleExplorerCheck = PM.fns.toggleExplorerCheck || (typeof toggleExplorerCheck === 'function' ? toggleExplorerCheck : PM.fns.toggleExplorerCheck);
  window.explorerCopy = PM.fns.explorerCopy || (typeof explorerCopy === 'function' ? explorerCopy : PM.fns.explorerCopy);
  window.explorerCut = PM.fns.explorerCut || (typeof explorerCut === 'function' ? explorerCut : PM.fns.explorerCut);
  window.explorerPaste = PM.fns.explorerPaste || (typeof explorerPaste === 'function' ? explorerPaste : PM.fns.explorerPaste);
  window.explorerDelete = PM.fns.explorerDelete || (typeof explorerDelete === 'function' ? explorerDelete : PM.fns.explorerDelete);
  window.explorerRename = PM.fns.explorerRename || (typeof explorerRename === 'function' ? explorerRename : PM.fns.explorerRename);
  window.explorerDownload = PM.fns.explorerDownload || (typeof explorerDownload === 'function' ? explorerDownload : PM.fns.explorerDownload);
  window.explorerNewFolder = PM.fns.explorerNewFolder || (typeof explorerNewFolder === 'function' ? explorerNewFolder : PM.fns.explorerNewFolder);
  window.explorerNewFile = PM.fns.explorerNewFile || (typeof explorerNewFile === 'function' ? explorerNewFile : PM.fns.explorerNewFile);
  window.handleExplorerUpload = PM.fns.handleExplorerUpload || (typeof handleExplorerUpload === 'function' ? handleExplorerUpload : PM.fns.handleExplorerUpload);
  window.openImagePreview = PM.fns.openImagePreview || (typeof openImagePreview === 'function' ? openImagePreview : PM.fns.openImagePreview);
  window.closeImagePreview = PM.fns.closeImagePreview || (typeof closeImagePreview === 'function' ? closeImagePreview : PM.fns.closeImagePreview);
  window.zoomInPreview = PM.fns.zoomInPreview || (typeof zoomInPreview === 'function' ? zoomInPreview : PM.fns.zoomInPreview);
  window.zoomOutPreview = PM.fns.zoomOutPreview || (typeof zoomOutPreview === 'function' ? zoomOutPreview : PM.fns.zoomOutPreview);
  window.resetPreviewZoom = PM.fns.resetPreviewZoom || (typeof resetPreviewZoom === 'function' ? resetPreviewZoom : PM.fns.resetPreviewZoom);
  window.fitImageToWindow = PM.fns.fitImageToWindow || (typeof fitImageToWindow === 'function' ? fitImageToWindow : PM.fns.fitImageToWindow);
  window.downloadPreviewImage = PM.fns.downloadPreviewImage || (typeof downloadPreviewImage === 'function' ? downloadPreviewImage : PM.fns.downloadPreviewImage);
  window.previewPrevImage = PM.fns.previewPrevImage || (typeof previewPrevImage === 'function' ? previewPrevImage : PM.fns.previewPrevImage);
  window.previewNextImage = PM.fns.previewNextImage || (typeof previewNextImage === 'function' ? previewNextImage : PM.fns.previewNextImage);
  window.toggleRightPanel = PM.fns.toggleRightPanel || (typeof toggleRightPanel === 'function' ? toggleRightPanel : PM.fns.toggleRightPanel);
  window.toggleFileBrowserFolder = PM.fns.toggleFileBrowserFolder || (typeof toggleFileBrowserFolder === 'function' ? toggleFileBrowserFolder : PM.fns.toggleFileBrowserFolder);
  window.openTextEditor = PM.fns.openTextEditor || (typeof openTextEditor === 'function' ? openTextEditor : PM.fns.openTextEditor);
  window.saveTextEditor = PM.fns.saveTextEditor || (typeof saveTextEditor === 'function' ? saveTextEditor : PM.fns.saveTextEditor);
  window.closeTextEditor = PM.fns.closeTextEditor || (typeof closeTextEditor === 'function' ? closeTextEditor : PM.fns.closeTextEditor);
  window.openImgUploadModal = PM.fns.openImgUploadModal || (typeof openImgUploadModal === 'function' ? openImgUploadModal : PM.fns.openImgUploadModal);
  window.closeImgUploadModal = PM.fns.closeImgUploadModal || (typeof closeImgUploadModal === 'function' ? closeImgUploadModal : PM.fns.closeImgUploadModal);
  window.clearImgUploadResults = PM.fns.clearImgUploadResults || (typeof clearImgUploadResults === 'function' ? clearImgUploadResults : PM.fns.clearImgUploadResults);
  window.startImgUpload = PM.fns.startImgUpload || (typeof startImgUpload === 'function' ? startImgUpload : PM.fns.startImgUpload);
  window.openImageRenameModal = PM.fns.openImageRenameModal || (typeof openImageRenameModal === 'function' ? openImageRenameModal : PM.fns.openImageRenameModal);
  window.closeImageRenameModal = PM.fns.closeImageRenameModal || (typeof closeImageRenameModal === 'function' ? closeImageRenameModal : PM.fns.closeImageRenameModal);
  window.confirmImageRename = PM.fns.confirmImageRename || (typeof confirmImageRename === 'function' ? confirmImageRename : PM.fns.confirmImageRename);
  window.openFontUploadModal = PM.fns.openFontUploadModal || (typeof openFontUploadModal === 'function' ? openFontUploadModal : PM.fns.openFontUploadModal);
  window.closeFontUploadModal = PM.fns.closeFontUploadModal || (typeof closeFontUploadModal === 'function' ? closeFontUploadModal : PM.fns.closeFontUploadModal);
  window.clearFontUploadResults = PM.fns.clearFontUploadResults || (typeof clearFontUploadResults === 'function' ? clearFontUploadResults : PM.fns.clearFontUploadResults);
  window.startFontUpload = PM.fns.startFontUpload || (typeof startFontUpload === 'function' ? startFontUpload : PM.fns.startFontUpload);
  window.openFontJsonEditor = PM.fns.openFontJsonEditor || (typeof openFontJsonEditor === 'function' ? openFontJsonEditor : PM.fns.openFontJsonEditor);
  window.closeFontJsonEditor = PM.fns.closeFontJsonEditor || (typeof closeFontJsonEditor === 'function' ? closeFontJsonEditor : PM.fns.closeFontJsonEditor);
  window.openFontJsonEditorModal = PM.fns.openFontJsonEditorModal || (typeof openFontJsonEditorModal === 'function' ? openFontJsonEditorModal : PM.fns.openFontJsonEditorModal);
  window.renderFontJsonEditor = PM.fns.renderFontJsonEditor || (typeof renderFontJsonEditor === 'function' ? renderFontJsonEditor : PM.fns.renderFontJsonEditor);
  window.updateFontJsonProvider = PM.fns.updateFontJsonProvider || (typeof updateFontJsonProvider === 'function' ? updateFontJsonProvider : PM.fns.updateFontJsonProvider);
  window.updateFontJsonShift = PM.fns.updateFontJsonShift || (typeof updateFontJsonShift === 'function' ? updateFontJsonShift : PM.fns.updateFontJsonShift);
  window.removeFontJsonProvider = PM.fns.removeFontJsonProvider || (typeof removeFontJsonProvider === 'function' ? removeFontJsonProvider : PM.fns.removeFontJsonProvider);
  window.addFontJsonProvider = PM.fns.addFontJsonProvider || (typeof addFontJsonProvider === 'function' ? addFontJsonProvider : PM.fns.addFontJsonProvider);
  window.saveFontJsonEditor = PM.fns.saveFontJsonEditor || (typeof saveFontJsonEditor === 'function' ? saveFontJsonEditor : PM.fns.saveFontJsonEditor);
  window.openAddSFModal = PM.fns.openAddSFModal || (typeof openAddSFModal === 'function' ? openAddSFModal : PM.fns.openAddSFModal);
  window.openEditSFModal = PM.fns.openEditSFModal || (typeof openEditSFModal === 'function' ? openEditSFModal : PM.fns.openEditSFModal);
  window.closeAddSFModal = PM.fns.closeAddSFModal || (typeof closeAddSFModal === 'function' ? closeAddSFModal : PM.fns.closeAddSFModal);
  window.confirmAddSFFromTab = PM.fns.confirmAddSFFromTab || (typeof confirmAddSFFromTab === 'function' ? confirmAddSFFromTab : PM.fns.confirmAddSFFromTab);
  window.openFontConfigModal = PM.fns.openFontConfigModal || (typeof openFontConfigModal === 'function' ? openFontConfigModal : PM.fns.openFontConfigModal);
  window.closeFontConfigModal = PM.fns.closeFontConfigModal || (typeof closeFontConfigModal === 'function' ? closeFontConfigModal : PM.fns.closeFontConfigModal);
  window.confirmFontConfigModal = PM.fns.confirmFontConfigModal || (typeof confirmFontConfigModal === 'function' ? confirmFontConfigModal : PM.fns.confirmFontConfigModal);
  window.openFontConfigAdvancedEditor = PM.fns.openFontConfigAdvancedEditor || (typeof openFontConfigAdvancedEditor === 'function' ? openFontConfigAdvancedEditor : PM.fns.openFontConfigAdvancedEditor);
  window.openFontChipJsonEditor = PM.fns.openFontChipJsonEditor || (typeof openFontChipJsonEditor === 'function' ? openFontChipJsonEditor : PM.fns.openFontChipJsonEditor);
  window.pickAddSFFolder = PM.fns.pickAddSFFolder || (typeof pickAddSFFolder === 'function' ? pickAddSFFolder : PM.fns.pickAddSFFolder);
  window.openPickPathModal = PM.fns.openPickPathModal || (typeof openPickPathModal === 'function' ? openPickPathModal : PM.fns.openPickPathModal);
  window.closePickPathModal = PM.fns.closePickPathModal || (typeof closePickPathModal === 'function' ? closePickPathModal : PM.fns.closePickPathModal);
  window.pickPathGoto = PM.fns.pickPathGoto || (typeof pickPathGoto === 'function' ? pickPathGoto : PM.fns.pickPathGoto);
  window.pickPathSelect = PM.fns.pickPathSelect || (typeof pickPathSelect === 'function' ? pickPathSelect : PM.fns.pickPathSelect);
  window.confirmPickPath = PM.fns.confirmPickPath || (typeof confirmPickPath === 'function' ? confirmPickPath : PM.fns.confirmPickPath);
  window.openRenameFontModal = PM.fns.openRenameFontModal || (typeof openRenameFontModal === 'function' ? openRenameFontModal : PM.fns.openRenameFontModal);
  window.closeRenameFontModal = PM.fns.closeRenameFontModal || (typeof closeRenameFontModal === 'function' ? closeRenameFontModal : PM.fns.closeRenameFontModal);
  window.confirmRenameFont = PM.fns.confirmRenameFont || (typeof confirmRenameFont === 'function' ? confirmRenameFont : PM.fns.confirmRenameFont);
  window.deleteFontFromSection = PM.fns.deleteFontFromSection || (typeof deleteFontFromSection === 'function' ? deleteFontFromSection : PM.fns.deleteFontFromSection);
  window.handleDropZoneDragOver = PM.fns.handleDropZoneDragOver || (typeof handleDropZoneDragOver === 'function' ? handleDropZoneDragOver : PM.fns.handleDropZoneDragOver);
  window.handleDropZoneDragLeave = PM.fns.handleDropZoneDragLeave || (typeof handleDropZoneDragLeave === 'function' ? handleDropZoneDragLeave : PM.fns.handleDropZoneDragLeave);
  window.handleImgDrop = PM.fns.handleImgDrop || (typeof handleImgDrop === 'function' ? handleImgDrop : PM.fns.handleImgDrop);
  window.handleFontDrop = PM.fns.handleFontDrop || (typeof handleFontDrop === 'function' ? handleFontDrop : PM.fns.handleFontDrop);
  window.handleImgDropInput = PM.fns.handleImgDropInput || (typeof handleImgDropInput === 'function' ? handleImgDropInput : PM.fns.handleImgDropInput);
  window.handleFontDropInput = PM.fns.handleFontDropInput || (typeof handleFontDropInput === 'function' ? handleFontDropInput : PM.fns.handleFontDropInput);
  window.openNewFileModal = PM.fns.openNewFileModal || (typeof openNewFileModal === 'function' ? openNewFileModal : PM.fns.openNewFileModal);
  window.closeNewFileModal = PM.fns.closeNewFileModal || (typeof closeNewFileModal === 'function' ? closeNewFileModal : PM.fns.closeNewFileModal);
  window.confirmNewFile = PM.fns.confirmNewFile || (typeof confirmNewFile === 'function' ? confirmNewFile : PM.fns.confirmNewFile);
  window.refreshModelsList = PM.fns.refreshModelsList || (typeof refreshModelsList === 'function' ? refreshModelsList : PM.fns.refreshModelsList);
  window.navigateToModelsFolder = PM.fns.navigateToModelsFolder || (typeof navigateToModelsFolder === 'function' ? navigateToModelsFolder : PM.fns.navigateToModelsFolder);
  window.openNewModelDialog = PM.fns.openNewModelDialog || (typeof openNewModelDialog === 'function' ? openNewModelDialog : PM.fns.openNewModelDialog);
  window.closeNewModelDialog = PM.fns.closeNewModelDialog || (typeof closeNewModelDialog === 'function' ? closeNewModelDialog : PM.fns.closeNewModelDialog);
  window.previewModelInList = PM.fns.previewModelInList || (typeof previewModelInList === 'function' ? previewModelInList : PM.fns.previewModelInList);
  window.editModelInList = PM.fns.editModelInList || (typeof editModelInList === 'function' ? editModelInList : PM.fns.editModelInList);
  window.deleteModelInList = PM.fns.deleteModelInList || (typeof deleteModelInList === 'function' ? deleteModelInList : PM.fns.deleteModelInList);
  window.handleNmJsonDrop = PM.fns.handleNmJsonDrop || (typeof handleNmJsonDrop === 'function' ? handleNmJsonDrop : PM.fns.handleNmJsonDrop);
  window.nmAddExtraTex = PM.fns.nmAddExtraTex || (typeof nmAddExtraTex === 'function' ? nmAddExtraTex : PM.fns.nmAddExtraTex);
  window.handleNmJsonUpload = PM.fns.handleNmJsonUpload || (typeof handleNmJsonUpload === 'function' ? handleNmJsonUpload : PM.fns.handleNmJsonUpload);
  window.nmGoBack = PM.fns.nmGoBack || (typeof nmGoBack === 'function' ? nmGoBack : PM.fns.nmGoBack);
  window.nmGoNext = PM.fns.nmGoNext || (typeof nmGoNext === 'function' ? nmGoNext : PM.fns.nmGoNext);
  window.updateNmTexPath = PM.fns.updateNmTexPath || (typeof updateNmTexPath === 'function' ? updateNmTexPath : PM.fns.updateNmTexPath);
  window.uploadNmTexFile = PM.fns.uploadNmTexFile || (typeof uploadNmTexFile === 'function' ? uploadNmTexFile : PM.fns.uploadNmTexFile);
  window.openEditModelDialog = PM.fns.openEditModelDialog || (typeof openEditModelDialog === 'function' ? openEditModelDialog : PM.fns.openEditModelDialog);
  window.closeEditModelDialog = PM.fns.closeEditModelDialog || (typeof closeEditModelDialog === 'function' ? closeEditModelDialog : PM.fns.closeEditModelDialog);
  window.saveEditModel = PM.fns.saveEditModel || (typeof saveEditModel === 'function' ? saveEditModel : PM.fns.saveEditModel);
  window.savePackMetaFromSettings = PM.fns.savePackMetaFromSettings || (typeof savePackMetaFromSettings === 'function' ? savePackMetaFromSettings : PM.fns.savePackMetaFromSettings);
  window.handlePackImageUpload = PM.fns.handlePackImageUpload || (typeof handlePackImageUpload === 'function' ? handlePackImageUpload : PM.fns.handlePackImageUpload);
  window.removePackImage = PM.fns.removePackImage || (typeof removePackImage === 'function' ? removePackImage : PM.fns.removePackImage);
  window.isTextFile = PM.fns.isTextFile || (typeof isTextFile === 'function' ? isTextFile : PM.fns.isTextFile);
  window.toggleExplorerItemCheck = function() {};
  window.toggleSelectAll = function() {};
  window.clearExplorerSelection = function() {};
  window.openSectionPath = function() {};

  // ================================================================
  // 启动项
  // ================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', PM.fns.initPackMaker);
  } else {
    PM.fns.initPackMaker();
  }

  // 全局键盘快捷键。
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const openModals = Array.from(document.querySelectorAll('.modal-overlay.is-open'));
      if (openModals.length > 0) {
        e.preventDefault();
        const topModal = openModals[openModals.length - 1];
        const closeBtn = topModal.querySelector('.modal-close');
        if (closeBtn) closeBtn.click();
        return;
      }
    }
    const teOverlay = document.getElementById('textEditorOverlay');
    if (teOverlay && teOverlay.classList.contains('is-open')) {
      if (e.key === 'Escape') { e.preventDefault(); PM.fns.closeTextEditor(true); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); PM.fns.saveTextEditor(); return; }
      return;
    }
    const ipOverlay = document.getElementById('imgPreviewOverlay');
    if (ipOverlay && ipOverlay.classList.contains('is-open')) {
      if (e.key === 'Escape') { e.preventDefault(); PM.fns.closeImagePreview(); return; }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); PM.fns.zoomInPreview(); return; }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); PM.fns.zoomOutPreview(); return; }
      if (e.key === '0') { e.preventDefault(); PM.fns.resetPreviewZoom(); return; }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); PM.fns.fitImageToWindow(); return; }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); PM.fns.previewPrevImage(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); PM.fns.previewNextImage(); return; }
      return;
    }
    if (PM.state.currentH1 !== 'explorer') return;
    const tag = document.activeElement && document.activeElement.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === 'Delete' || e.key === 'Del') { e.preventDefault(); PM.fns.explorerDelete(); }
    if (e.key === 'F2') { e.preventDefault(); PM.fns.explorerRename(); }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); PM.fns.explorerCopy(); }
      if (e.key === 'x' || e.key === 'X') { e.preventDefault(); PM.fns.explorerCut(); }
      if (e.key === 'v' || e.key === 'V') { e.preventDefault(); PM.fns.explorerPaste(); }
    }
    if (e.key === 'Backspace') { e.preventDefault(); PM.fns.explorerGoUp(); }
  });
})();
