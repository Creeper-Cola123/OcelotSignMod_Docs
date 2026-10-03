

(function () {
  'use strict';

  // 全局 PM 命名空间（由 pm-state.js 首次定义，后续模块只读不重置）。
  if (typeof window.PM === 'undefined') {
    window.PM = { state: {}, fns: {} };
  }
  function closeWarningBanner() {
    PM.fns.$('warningBanner').classList.add('hidden');
  }

  PM.fns.closeWarningBanner = closeWarningBanner;

  function initPackMaker() {
    showWelcome();
    document.body.classList.add('mode-welcome');
    // 资源包未加载时不显示右侧面板。
    const rightPanel = PM.fns.$('rightPanel');
    if (rightPanel) rightPanel.style.display = 'none';

    // 屏蔽整个窗口上浏览器默认的拖放行为。
    // 否则用户把文件拖到任何非交互区域时，
    // 浏览器都会提示"打开"该文件；
    // 若用户不小心松手，浏览器会跳转走，
    // 所有未保存的工作都会丢失。具体的 drop zone 内仍用
    // 阻止冒泡，保持那些区域的拖放功能。
    window.addEventListener('dragover', e => e.preventDefault(), false);
    window.addEventListener('drop', e => e.preventDefault(), false);

    // 点击模态框背景（遮罩层）时关闭最顶层模态框。
    // 使用事件委托，让运行时动态添加 / 移除的模态框
    // 也能正确响应背景点击。
    document.addEventListener('mousedown', e => {
      const overlay = e.target.closest('.modal-overlay.is-open');
      if (!overlay) return;
      // 仅当点击命中遮罩层本身（不是它的子元素）时才触发。
      if (e.target !== overlay) return;
      const closeBtn = overlay.querySelector('.modal-close');
      if (closeBtn) closeBtn.click();
    });
  }

  PM.fns.initPackMaker = initPackMaker;

  function showWelcome() {
    document.body.classList.add('mode-welcome');
    PM.fns.$('welcomeScreen').classList.add('is-open');
    const dz = PM.fns.$('welcomeDropzone');
    if (dz && !dz.dataset.bound) {
      dz.dataset.bound = '1';
      dz.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover'); });
      dz.addEventListener('drop', e => {
        e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.zip')) loadZip(file);
        else PM.fns.showToast(PM.fns.t('toast.zipNotLoaded'), 'error');
      });
    }
  }

  PM.fns.showWelcome = showWelcome;

  function hideWelcome() {
    document.body.classList.remove('mode-welcome');
    PM.fns.$('welcomeScreen').classList.remove('is-open');
  }

  PM.fns.hideWelcome = hideWelcome;

  async function loadZip(file) {
    if (typeof JSZip === 'undefined') {
      PM.fns.showToast(PM.fns.t('toast.jszipMissing'), 'error');
      return;
    }
    try {
      // 释放上一个资源包的所有缓存 blob URL，让浏览器在解码新包前能释放底层图片缓冲区。
      PM.fns.revokeAndClearAllCache();
      const newZip = new JSZip();
      const data = await file.arrayBuffer();
      const loaded = await newZip.loadAsync(data);
      PM.state.zip = loaded;
      PM.state.fileMap = {};
      PM.state.zip.forEach((path, entry) => { PM.state.fileMap[path] = entry; });
      PM.state.packMeta = { pack_format: 34, description: '豹猫指示牌模组的自定义资源包' };
      PM.state.packFileName = '';
      PM.fns.snapshotPreExistingUiDefinitions();
      // 字符串/对象/数组 description）
      await readPackMetaFromZip();
      // 尝试读取 pack.png
      const pngFile = PM.state.zip.file('pack.png');
      if (pngFile) {
        try { PM.state.packImageBlob = await pngFile.async('blob'); } catch (_) {}
      }
      hideWelcome();
      updatePackBadge(true);
      PM.fns.$('noPackOverlay').style.display = 'none';
      PM.fns.$('noCategoryOverlay').style.display = '';
      try { 
          await loadPatternsAndFonts(); 
          await saveAllToZip(true);
      } catch (e) { console.warn(e); }
      PM.fns.switchH1Tab('patterns', document.querySelector('.h1-tab[data-tab="patterns"]'));
      PM.fns.showToast(PM.fns.t('toast.zipLoaded', { name: file.name }), 'success');
    } catch (e) {
      PM.fns.showToast(PM.fns.t('toast.loadFailed', { msg: e.message }), 'error');
    }
  }

  PM.fns.loadZip = loadZip;

  async function handleZipUpload(event) {
    const file = event.target.files[0];
    if (file) await loadZip(file);
  }

  PM.fns.handleZipUpload = handleZipUpload;

  async function createNewPack() {
    if (typeof JSZip === 'undefined') { PM.fns.showToast(PM.fns.t('toast.jszipMissing'), 'error'); return; }
    // 与 loadZip 同样的内存清理逻辑——上一资源包的预览 URL
    // 必须释放，否则会在多次会话间累积。
    PM.fns.revokeAndClearAllCache();
    PM.state.zip = new JSZip();
    PM.state.fileMap = {};
    PM.state.packMeta = { pack_format: 34, description: '豹猫指示牌模组的自定义资源包' };
    PM.state.packFileName = '';
    PM.state.packImageBlob = null;
    PM.fns.snapshotPreExistingUiDefinitions();
    hideWelcome();
    updatePackBadge(true);
    PM.fns.$('noPackOverlay').style.display = 'none';
    PM.fns.$('noCategoryOverlay').style.display = '';
    try { await loadPatternsAndFonts(); } catch (e) { console.warn(e); }
    PM.fns.switchH1Tab('patterns', document.querySelector('.h1-tab[data-tab="patterns"]'));
    PM.fns.showToast(PM.fns.t('toast.blankCreated'), 'success');
  }

  PM.fns.createNewPack = createNewPack;

  function updatePackBadge(loaded) {
    const badge = PM.fns.$('packBadge');
    const text = PM.fns.$('packBadgeText');
    if (!badge || !text) return;
    if (loaded) {
      badge.classList.add('loaded');
      const fileCount = Object.keys(PM.state.fileMap).length;
      text.textContent = PM.fns.t('packmaker.badge.loaded').replace('{count}', fileCount);
    } else {
      badge.classList.remove('loaded');
      text.textContent = PM.fns.t('packmaker.noPack');
    }
  }

  PM.fns.updatePackBadge = updatePackBadge;

  async function loadPatternsAndFonts() {
    if (!PM.state.zip) return;
    PM.state.patternsCategories = [];
    PM.state.fontsCategories = [];

    // 这里识别三种来源类型。每个分类通过 _sourceKind + _sourcePath 记住来源，使保存时能正确路由输出：
    //   'ui_definitions' → 已经是新格式，保存时写回同一路径（无需冲突后缀）
    //   'custom_patterns' → 旧格式，保存时转换为 ui_definitions 并删除原文件
    //   'custom_fonts' → 旧格式，保存时转换为 ui_definitions 并删除原文件

    // 辅助函数：从 "assets/<ns>/ui_definitions/<file>.json" 这类路径派生命名空间。
    function nsFromPath(filePath) {
      const m = filePath.match(/^assets\/([^/]+)\/ui_definitions\//);
      return m ? m[1] : 'minecraft';
    }

    // 辅助函数：从第一个区块的 basePath 派生默认 basePath。
    // 去掉前导的 "<ns>:" 前缀和末尾斜杠，让模态框的"资源基础路径"字段拿到干净的值。
    function sectionBasePath(section, fallbackNs) {
      if (!section || typeof section.basePath !== 'string') return 'textures/signs';
      let bp = section.basePath;
      const colonIdx = bp.indexOf(':');
      if (colonIdx >= 0) bp = bp.slice(colonIdx + 1);
      bp = bp.replace(/^\/+/, '').replace(/\/+$/, '');
      return bp || 'textures/signs';
    }

    // 辅助函数：把 JSON 中的区块配置转换为编辑器内部结构。
    // 保留后续区块卡片可能需要编辑的所有字段。
    function mapSection(s) {
      if (!s || typeof s !== 'object') return null;
      return {
        name: s.title || s.name || '',
        description: s.description || '',
        title: s.title || s.name || '',
        basePath: s.basePath || '',
        useSubfolders: !!s.useSubfolders,
        subFolders: Array.isArray(s.subFolders) ? s.subFolders.map(sf => ({
          dirName: sf.dirName || '',
          displayName: sf.displayName || sf.dirName || ''
        })) : [],
        filterMode: s.filterMode || 'NONE',
        filterList: Array.isArray(s.filterList) ? s.filterList.slice() : [],
        isFontMode: !!s.isFontMode,
        fontList: Array.isArray(s.fontList) ? s.fontList.map(f => ({
          fontId: f.fontId || '',
          displayName: f.displayName || ''
        })) : [],
        entries: Array.isArray(s.entries) ? s.entries.slice() : []
      };
    }

    // 辅助函数：在目标数组中查找或创建匹配 id 的分类。
    function upsertCategory(target, id, name, ns, basePath, hint, hintEnabled) {
      let cat = target.find(c => c.id === id);
      if (!cat) {
        cat = { id, name, ns, basePath, sections: [], hint: hint || '', hintEnabled: hintEnabled !== false };
        target.push(cat);
      } else {
        if (name && !cat.name) cat.name = name;
        if (ns && !cat.ns) cat.ns = ns;
        if (basePath && !cat.basePath) cat.basePath = basePath;
        if (hint && !cat.hint) cat.hint = hint;
      }
      return cat;
    }

    // 1) 读取所有 ui_definitions/*.json 文件（任意命名空间）。
    //    这些是用户直接管理的"新格式"文件。读取到编辑器中，使其与转换得到的分类并列显示。
    //    保存时把每个分类写回其原始 ui_definitions 路径，让用户编辑往返一致，无需重命名文件。
    const uidfPaths = Object.keys(PM.state.fileMap)
      .filter(p => /\/ui_definitions\/[^/]+\.json$/i.test(p));
    for (const p of uidfPaths) {
      try {
        const txt = await PM.state.zip.file(p).async('string');
        const data = JSON.parse(txt);
        const tab = (data.tab === 'fonts') ? 'fonts' : 'patterns';
        const target = tab === 'fonts' ? PM.state.fontsCategories : PM.state.patternsCategories;
        const ns = nsFromPath(p);
        const id = data.category_name ? PM.fns.slugify(data.category_name) : ('cat_' + p.replace(/[^a-z0-9]+/gi, '_'));
        const firstSection = Array.isArray(data.sections) && data.sections.length ? data.sections[0] : null;
        const basePath = sectionBasePath(firstSection, ns);
        const cat = upsertCategory(
          target,
          id,
          data.category_name || id,
          ns,
          basePath,
          data.header_text || '',
          data.header_text_enabled !== false
        );
        // 标记来源，使保存时把该分类写回原文件（无需冲突后缀）。
        cat._sourceKind = 'ui_definitions';
        cat._sourcePath = p;
        // 合并区块（按 title 去重）
        if (Array.isArray(data.sections)) {
          for (const s of data.sections) {
            const mapped = mapSection(s);
            if (!mapped) continue;
            if (!cat.sections.some(existing => existing.name === mapped.name && mapped.name)) {
              cat.sections.push(mapped);
            }
          }
        }
      } catch (e) { console.warn('Failed to load ui_definitions file', p, e); }
    }

    // 2) custom_patterns.json → 转换为内部编辑器区块（旧 → ui_definitions）。
    //    范围：仅匹配 /assets/<ns>/patterns/custom_patterns.json 的文件。
    //    按（命名空间 + 文件夹）分组条目：
    //      同一文件夹 = 一个分类、一个区块，WHITELIST 仅含所有文件
    //      不同文件夹 = 不同分类
    const customPatternsPaths = Object.keys(PM.state.fileMap)
      .filter(p => /\/patterns\/custom_patterns\.json$/i.test(p));
    for (const p of customPatternsPaths) {
      try {
        const txt = await PM.state.zip.file(p).async('string');
        const data = JSON.parse(txt);
        if (!data || !Array.isArray(data)) continue;
        const nsMatch = p.match(/^assets\/([^/]+)\/patterns\//);
        const packNs = nsMatch ? nsMatch[1] : 'ocelotsignmod';
        // 按 basePath（命名空间:文件夹/）分组条目
        const groups = {}; // key = basePath → { texNs, folder, fileNames: [], inserts: {} }
        for (const entry of data) {
          const tex = entry.texture || '';
          const colonIdx = tex.indexOf(':');
          const texNs = colonIdx >= 0 ? tex.slice(0, colonIdx) : packNs;
          const relPath = colonIdx >= 0 ? tex.slice(colonIdx + 1) : tex;
          const slashIdx = relPath.lastIndexOf('/');
          const folder = slashIdx >= 0 ? relPath.slice(0, slashIdx + 1) : '';
          const fileName = slashIdx >= 0 ? relPath.slice(slashIdx + 1) : relPath;
          const basePath = texNs + ':' + folder;
          if (!groups[basePath]) groups[basePath] = {
            texNs, folder, fileNames: [], entries: [], firstName: ''
          };
          groups[basePath].entries.push({ entry, fileName });
          if (fileName) {
            const fullFileName = fileName.includes('.') ? fileName : fileName + '.png';
            groups[basePath].fileNames.push(fullFileName);
          }
          if (!groups[basePath].firstName) groups[basePath].firstName = entry.name || tex;
        }
        // 每个文件夹组 → 一个 ui_definitions 分类、一个合并区块
        for (const basePath of Object.keys(groups)) {
          const grp = groups[basePath];
          const catId = PM.fns.slugify('cp_' + basePath.replace(/[^a-z0-9]+/gi, '_'));
          const folderName = grp.folder ? grp.folder.replace(/\/+$/, '').split('/').pop() : 'patterns';
          const catName = grp.texNs === packNs ? folderName : (grp.texNs + '/' + folderName);
          const cat = upsertCategory(
            PM.state.patternsCategories,
            catId,
            catName,
            grp.texNs,
            grp.folder.replace(/\/+$/, '') || 'textures',
            '',
            false
          );
          cat._isDefault = true;
          // 标记来源为旧格式，使保存时把转换输出写到 ui_definitions 文件（必要时加冲突后缀），然后删除原 custom_patterns.json。
          cat._sourceKind = 'custom_patterns';
          cat._sourcePath = p;
          // 构建一个区块：description 列出每个条目的名称，WHITELIST 过滤到恰好这些文件。
          const entries = grp.entries;
          const sectionTitle = entries.length === 1
            ? (entries[0].entry.name || entries[0].entry.texture || catName)
            : catName;
          const sectionDesc = entries.map(e => e.entry.name || e.entry.texture).join(' / ');
          const mapped = mapSection({
            title: sectionTitle,
            description: sectionDesc,
            basePath: basePath,
            useSubfolders: false,
            filterMode: grp.fileNames.length > 0 ? 'WHITELIST' : 'NONE',
            filterList: grp.fileNames,
            isFontMode: false,
            entries: []
          });
          if (mapped && !cat.sections.some(existing => existing.name === mapped.name && mapped.name)) {
            cat.sections.push(mapped);
          }
        }
      } catch (e) { console.warn('Failed to load custom_patterns file', p, e); }
    }

    // 3) custom_fonts.json → 转换为内部编辑器区块（旧 → isFontMode fontList）。
    //    范围：仅匹配 /assets/<ns>/fonts/custom_fonts.json 的文件。
    //    格式：[{ "font_id": "ns:font_id", "name": "..." }]
    const customFontsPaths = Object.keys(PM.state.fileMap)
      .filter(p => /\/fonts\/custom_fonts\.json$/i.test(p));
    for (const p of customFontsPaths) {
      try {
        const txt = await PM.state.zip.file(p).async('string');
        const data = JSON.parse(txt);
        if (!data || !Array.isArray(data)) continue;
        const nsMatch = p.match(/^assets\/([^/]+)\/fonts\//);
        const ns = nsMatch ? nsMatch[1] : 'ocelotsignmod';
        const catName = data.category_name || (ns === 'ocelotsignmod' ? '自定义字体' : (ns + ' 字体'));
        const catId = PM.fns.slugify('cf_' + ns);
        const cat = upsertCategory(
          PM.state.fontsCategories,
          catId,
          catName,
          ns,
          'font',
          data.header_text || '',
          data.header_text_enabled !== false
        );
        cat._isDefault = true;
        // 标记来源为旧格式，使保存时把转换输出写到 ui_definitions 文件（必要时加冲突后缀），然后删除原 custom_fonts.json。
        cat._sourceKind = 'custom_fonts';
        cat._sourcePath = p;
        const fontList = data.map(f => ({
          fontId: f.font_id || f.fontId || '',
          displayName: f.name || f.font_id || f.fontId || ''
        })).filter(f => f.fontId);
        // 若有第一个 font_id，从其命名空间派生 basePath，因为字体文件通常位于字体自身的命名空间下（如 my_pack:title_style → assets/my_pack/font/）。
        let basePath = data.basePath;
        if (!basePath && fontList.length > 0) {
          const firstId = fontList[0].fontId;
          const colonIdx = firstId.indexOf(':');
          const fontNs = colonIdx >= 0 ? firstId.slice(0, colonIdx) : ns;
          basePath = fontNs + ':font/';
        }
        if (!basePath) basePath = ns + ':font/';

        const filterList = fontList.map(f => {
          const stem = f.fontId.split('/').pop().split(':').pop().replace(/\.[^.]+$/, '');
          return stem + '.ttf';
        });

        const mapped = mapSection({
          title: catName,
          description: data.description || '',
          basePath: basePath,
          useSubfolders: false,
          // 根据是否有字体自动开启白名单模式
          filterMode: fontList.length > 0 ? 'WHITELIST' : 'NONE',
          filterList: filterList,
          isFontMode: true,
          fontList: fontList
        });
        if (mapped && !cat.sections.some(existing => existing.name === mapped.name && mapped.name)) {
          cat.sections.push(mapped);
        }
      } catch (e) { console.warn('Failed to load custom_fonts file', p, e); }
    }
  }

  PM.fns.loadPatternsAndFonts = loadPatternsAndFonts;

  async function readPackMetaFromZip() {
    if (!PM.state.zip) return;
    const metaFile = PM.state.zip.file('pack.mcmeta');
    if (!metaFile) return;
    try {
      const txt = await metaFile.async('string');
      const m = JSON.parse(txt);
      if (m && m.pack) {
        // pack_format：接受数字或字符串数字，拒绝 0/负数
        if (typeof m.pack.pack_format === 'number' && m.pack.pack_format > 0) {
          PM.state.packMeta.pack_format = m.pack.pack_format;
        } else if (typeof m.pack.pack_format === 'string' && /^\d+$/.test(m.pack.pack_format.trim())) {
          const parsed = parseInt(m.pack.pack_format, 10);
          if (parsed > 0) PM.state.packMeta.pack_format = parsed;
        }
        // description：字符串直接用；对象取 text；数组取首项的 text；否则保持原值
        const d = m.pack.description;
        if (typeof d === 'string' && d.length > 0) {
          PM.state.packMeta.description = d;
        } else if (d && typeof d === 'object') {
          if (typeof d.text === 'string') PM.state.packMeta.description = d.text;
          else if (Array.isArray(d) && d[0] && typeof d[0].text === 'string') PM.state.packMeta.description = d[0].text;
        }
      }
    } catch (e) {
      console.warn('pack.mcmeta parse failed', e);
    }
  }

  PM.fns.readPackMetaFromZip = readPackMetaFromZip;

  function ensureDirEntry(dirPath) {
    // 目录以末尾斜杠存储，方便 buildFileTree() 区分文件与目录（它把 path.endsWith('/') 的条目视为目录标记，遍历文件时会跳过）。
    if (!dirPath.endsWith('/')) dirPath = dirPath + '/';
    if (!PM.state.fileMap[dirPath]) {
      PM.state.fileMap[dirPath] = null;
    }
    return dirPath;
  }

  PM.fns.ensureDirEntry = ensureDirEntry;

  async function generateAndDownload() {
    if (!PM.state.zip) { PM.fns.showToast(PM.fns.t('toast.packNotLoaded'), 'error'); return; }
    // 生成期间锁定按钮，避免重复点击导致队列里出现多个 zip 生成任务，并提供明显的进行中反馈（PM.state.zip.generateAsync 在大型资源包上需要 3-10s）。
    const btn = document.querySelector('button[onclick="generateAndDownload()"]');
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;vertical-align:middle;margin-right:4px"></span>${PM.fns.escapeHtml(PM.fns.t('toast.generating'))}`;
    }
    try {
      // 先把未保存的编辑全部落盘（写 ui_definitions/*.json 并删除遗留的旧目录 'assets/ocelotsignmod/patterns/' 与 'assets/ocelotsignmod/fonts/'），再写 pack.mcmeta / pack.png 并导出，这样直接点击"生成并下载"得到的 PM.state.zip 与点击"保存到资源包"后得到的 zip 一致。
      await saveAllToZip();
      // 写入 pack.mcmeta
      const mcmeta = { pack: { pack_format: PM.state.packMeta.pack_format, description: PM.state.packMeta.description } };
      PM.state.zip.file('pack.mcmeta', JSON.stringify(mcmeta, null, 2));
      // 写入 pack.png
      if (PM.state.packImageBlob) {
        PM.state.zip.file('pack.png', PM.state.packImageBlob);
      }
      const blob = await PM.state.zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (PM.state.packFileName || PM.state.packMeta.description || 'resource-pack') + '.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      PM.fns.showToast(PM.fns.t('toast.generatedAndDownloaded'), 'success');
    } catch (e) {
      PM.fns.showToast(PM.fns.t('toast.generateFailed', { msg: e.message }), 'error');
    } finally {
      // 始终恢复按钮状态，即使 catch 捕获到了异常。
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }
  }

  PM.fns.generateAndDownload = generateAndDownload;

  async function saveAllToZip(silent = false) {
    if (!PM.state.zip) { PM.fns.showToast(PM.fns.t('toast.packNotLoaded'), 'error'); return; }
    try {
      // 跟踪本次保存中接触到的所有 ui_definitions 路径，
      // 这样冲突检测同时针对原包内容与本次写入过程中产生的文件。
      // 这样冲突检测同时针对原包内容与本次写入过程中产生的文件。
      const claimedPaths = new Set(PM.state.preExistingUiDefinitionsPaths);

      // 挑选一个未被占用的 ui_definitions 路径。如果 targetPath 已经被占用，
      // 就依次尝试 <stem>_1.<ext>、<stem>_2.<ext>，
      // 直到找到空位。stem / ext 的拆分保证后缀在扩展名之前。
      // 比如 <id>_1.json 仍然是 .json 扩展名。
      function pickFreeUiDefinitionsPath(targetPath) {
        if (!claimedPaths.has(targetPath)) return targetPath;
        const slash = targetPath.lastIndexOf('/');
        const dir = targetPath.slice(0, slash + 1);
        const file = targetPath.slice(slash + 1);
        const dot = file.lastIndexOf('.');
        const stem = dot > 0 ? file.slice(0, dot) : file;
        const ext = dot > 0 ? file.slice(dot) : '';
        for (let i = 1; i < 100000; i++) {
          const candidate = `${dir}${stem}_${i}${ext}`;
          if (!claimedPaths.has(candidate)) return candidate;
        }
        throw new Error('找不到可用的 ui_definitions 文件名：' + targetPath);
      }

      // 根据内部分类构造 ui_definitions 格式的 JSON 文档。
      // 下面 patterns 和 fonts 的保存流程都会用到。
      function buildUiDefinitionsJson(cat, tab) {
        const catTitle = cat.name || cat.id || (tab === 'fonts' ? 'fonts_category' : 'pattern_category');
        const sections = (cat.sections || []).map(s => ({
          title: s.name || s.title || '',
          description: s.description || '',
          basePath: s.isFontMode ? ((s.basePath ? s.basePath.split(':')[0] : (cat.ns || 'minecraft')) + ':font') : (s.basePath || ''),
          useSubfolders: !!s.useSubfolders,
          subFolders: Array.isArray(s.subFolders) ? s.subFolders.map(sf => ({
            dirName: sf.dirName || '',
            displayName: sf.displayName || sf.dirName || ''
          })) : [],
          filterMode: s.filterMode || 'NONE',
          filterList: Array.isArray(s.filterList) ? s.filterList : [],
          isFontMode: !!s.isFontMode,
          fontList: Array.isArray(s.fontList) ? s.fontList.map(f => {
            const rawId = f.fontId || '';
            const hasColon = rawId.indexOf(':') >= 0;
            const ns = hasColon ? rawId.split(':')[0] : (f.ns || cat.ns || 'minecraft');
            const id = hasColon ? rawId.split(':')[1] : rawId;
            return { fontId: ns + ':' + id, displayName: f.displayName || '' };
          }) : [],
        }));
        return {
          tab,
          category_name: catTitle,
          header_text: cat.hint || '',
          header_text_enabled: cat.hintEnabled !== false,
          sections
        };
      }

      // ── 1) Save PM.state.patternsCategories as ui_definitions JSON files ──
      // _sourceKind === 'ui_definitions' 的分类是用户直接管理的，保存时写回原路径，使编辑可往返。
      // 保存时写回原路径，使编辑可往返。
      // 其他分类（旧 custom_patterns.json 转换的，或用户在编辑器中新增的）
      // 分配到一个新的 ui_definitions 路径，
      // 与已有文件冲突时追加 _1 / _2 / _3 后缀。
      for (const cat of PM.state.patternsCategories) {
        const ns = cat.ns || 'ocelotsignmod';
        const json = JSON.stringify(buildUiDefinitionsJson(cat, 'patterns'), null, 2);
        let filePath;
        if (cat._sourceKind === 'ui_definitions' && cat._sourcePath) {
          // 写回用户原始的文件路径。
          filePath = cat._sourcePath;
        } else {
          const jsonFileName = (cat.id || PM.fns.slugify(cat.name || cat.id || 'pattern_category')) + '.json';
          filePath = pickFreeUiDefinitionsPath(`assets/${ns}/ui_definitions/${jsonFileName}`);
        }

        if (cat._sourcePath && cat._sourcePath !== filePath) {
          PM.state.zip.remove(cat._sourcePath);
          delete PM.state.fileMap[cat._sourcePath];
        }

        PM.state.zip.file(filePath, json);
        claimedPaths.add(filePath);

        PM.state.fileMap[filePath] = PM.state.zip.file(filePath);
        cat._sourceKind = 'ui_definitions';
        cat._sourcePath = filePath;
      }

      // ── 2) Save PM.state.fontsCategories as ui_definitions JSON files (tab=fonts) ──
      // 与 patterns 同样的路由规则：ui_definitions 来源的分类
      // 写回原路径；旧 custom_fonts.json 转换或新增的分类
      // 分配到一个新的路径并带后缀。
      for (const cat of PM.state.fontsCategories) {
        const ns = cat.ns || 'ocelotsignmod';
        const json = JSON.stringify(buildUiDefinitionsJson(cat, 'fonts'), null, 2);
        let filePath;
        if (cat._sourceKind === 'ui_definitions' && cat._sourcePath) {
          filePath = cat._sourcePath;
        } else {
          const jsonFileName = (cat.id || PM.fns.slugify(cat.name || cat.id || 'fonts_category')) + '.json';
          filePath = pickFreeUiDefinitionsPath(`assets/${ns}/ui_definitions/${jsonFileName}`);
        }

        if (cat._sourcePath && cat._sourcePath !== filePath) {
          PM.state.zip.remove(cat._sourcePath);
          delete PM.state.fileMap[cat._sourcePath];
        }

        PM.state.zip.file(filePath, json);
        claimedPaths.add(filePath);

        PM.state.fileMap[filePath] = PM.state.zip.file(filePath);
        cat._sourceKind = 'ui_definitions';
        cat._sourcePath = filePath;
      }

      // ── 3) Delete legacy ocelotsignmod/patterns/ and ocelotsignmod/fonts/ folders ──
      // JSON 配置文件（custom_patterns.json / custom_fonts.json）
      // 已经在上面转成了 ui_definitions 文件，但
      // 旧文件夹本身——以及里面残留的素材——
      // 都不再需要：ui_definitions 通过 `assets/<ns>/textures/` 引用贴图，
      // 通过 `assets/<ns>/font/` 引用字体，
      // 所以还留在下面这两个旧文件夹下的任何东西
      // 都是死代码，会在这里被删除。
      // JSZip 的 remove() 是精确路径匹配，所以我们枚举所有路径以
      // `assets/ocelotsignmod/patterns/` 或
      // `assets/ocelotsignmod/fonts/` 开头的条目（包括带尾斜杠的目录标记），
      // 逐个删除。
      const legacyFolderPaths = Object.keys(PM.state.fileMap).filter(p =>
        p.startsWith('assets/ocelotsignmod/patterns/') ||
        p.startsWith('assets/ocelotsignmod/fonts/')
      );
      for (const p of legacyFolderPaths) {
        try {
          PM.state.zip.remove(p);
          delete PM.state.fileMap[p];
        } catch (_) { /* ignore individual removal errors */ }
      }

      // 刷新右侧面板的文件浏览器，让用户立刻看到 patterns / fonts
      // 目录在保存后立刻消失。
      try { PM.fns.renderFileBrowser(); } catch (_) {}

      if (typeof PM.fns.refreshExplorer === 'function') {
          try { PM.fns.refreshExplorer(); } catch (_) {}
      }

      // 对 ui_definitions 路径重新快照，现在 PM.state.zip 已反映我们的变更。
      // 否则第二次"保存到资源包"会认为同样的路径仍属于"旧"，
      // 每次都会给同一个分类继续追加 _N 后缀，
      // 产生 my_cat_1.json、my_cat_2.json … 这种幽灵文件。
      PM.fns.snapshotPreExistingUiDefinitions();

      // 如果 silent 为真，则不弹出提示
      if (!silent) PM.fns.showToast(PM.fns.t('toast.savedToPack'), 'success');
    } catch (e) {
      PM.fns.showToast(PM.fns.t('toast.saveFailed', { msg: e.message }), 'error');
    }
  }

  PM.fns.saveAllToZip = saveAllToZip;

})();
