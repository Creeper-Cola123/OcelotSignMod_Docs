

(function () {
  'use strict';

  // 全局 PM 命名空间（由 pm-state.js 首次定义，后续模块只读不重置）。
  if (typeof window.PM === 'undefined') {
    window.PM = { state: {}, fns: {} };
  }
  function enterModelsMode() {
    PM.fns.$('explorerView').style.display = 'none';
    PM.fns.$('modelsView').style.display = '';
    PM.fns.$('packSettingsView').style.display = 'none';
    PM.fns.$('noCategoryOverlay').style.display = 'none';
    PM.fns.$('noPackOverlay').style.display = 'none';
    PM.fns.$('h3MainHeader').style.display = 'none';
    PM.fns.$('h3SectionsArea').style.display = 'none';
    PM.fns.$('h3Empty').style.display = 'none';
    PM.fns.$('h3CardsList').innerHTML = '';
    renderModelsList();
    PM.fns.pmReplayViewFade(PM.fns.$('modelsView'));
  }

  PM.fns.enterModelsMode = enterModelsMode;

  function renderModelsList() {
    const area = PM.fns.$('modelsListArea');
    if (!area) return;
    const modelCards = [];
    Object.keys(PM.state.fileMap).forEach(path => {
      const match = path.match(/^assets\/([^/]+)\/models\/custom_models\/(.+)\.json$/);
      if (!match) return;
      modelCards.push({ path, ns: match[1], modelId: match[2] });
    });
    if (modelCards.length === 0) {
      area.innerHTML = `<div class="models-empty-state">
          <div class="models-empty-icon">🎲</div>
          <div class="models-empty-title">暂未注册任何自定义模型</div>
          <div class="models-empty-desc">
            在 <code>assets/&lt;命名空间&gt;/models/custom_models/</code> 目录下放置 BlockBench 导出的 JSON 模型文件。
          </div>
        </div>`;
      return;
    }
    
    area.innerHTML = `<table class="models-list-table">
        <thead><tr><th style="width: 80px;">缩略图</th><th>名称</th><th>命名空间</th><th>模型路径</th><th style="text-align:right">操作</th></tr></thead>
        <tbody>
          ${modelCards.map((m, i) => `<tr>
            <td style="padding: 4px;">
              <div id="ml-thumb-${i}" style="width: 64px; height: 64px; background: #0d1117; border: 1px solid #30363d; border-radius: 4px; overflow: hidden; position: relative; margin: 0 auto;"></div>
            </td>
            <td>${PM.fns.escapeHtml(m.modelId)}</td>
            <td><span class="ml-ns">${PM.fns.escapeHtml(m.ns)}</span></td>
            <td class="ml-path"><code>${PM.fns.escapeHtml(m.path)}</code></td>
            <td class="ml-actions">
                <button class="btn btn-secondary btn-xs ml-edit-btn" onclick="editModelInList('${PM.fns.escapeAttr(m.path)}')">✏️ 编辑</button>
                <button class="btn btn-secondary btn-xs ml-edit-btn danger" style="color:#f85149;border-color:rgba(248,81,73,0.4);" onclick="deleteModelInList('${PM.fns.escapeAttr(m.path)}')">🗑 删除</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    area.classList.remove('items-anim-in');
    void area.offsetWidth;
    area.classList.add('items-anim-in');

    // 将模型注入到静态缩略图槽位中
    modelCards.forEach(async (m, i) => {
        const thumbContainer = PM.fns.$('ml-thumb-' + i);
        if (!thumbContainer) return;
        try {
            const text = await PM.state.zip.file(m.path).async('string');
            const json = JSON.parse(text);
            renderMinecraftModel(thumbContainer, json, true); // 第二个参数为 true 表示静态不可交互
        } catch (e) {
            thumbContainer.innerHTML = '<div style="color:#f85149;text-align:center;line-height:64px;font-size:10px;">读取失败</div>';
        }
    });
  }

  PM.fns.renderModelsList = renderModelsList;

  async function editModelInList(path) {
      try {
          const text = await PM.state.zip.file(path).async('string');
          const json = JSON.parse(text);
          const match = path.match(/^assets\/([^/]+)\/models\/custom_models\/(.+)\.json$/);
          if (!match) throw new Error("无法解析该路径的模型");
          
          openNewModelDialog({
              path: path,
              ns: match[1],
              modelId: match[2],
              jsonContent: json
          });
      } catch(e) {
          PM.fns.showToast(PM.fns.t('toast.cannotEditModel', { msg: e.message }), 'error');
      }
  }

  PM.fns.editModelInList = editModelInList;

  async function deleteModelInList(path) {
      if (!confirm(PM.fns.t('confirm.deleteModel'))) return;
      try {
          PM.state.zip.remove(path);
          delete PM.state.fileMap[path];
          refreshModelsList();
          PM.fns.showToast(PM.fns.t('toast.modelDeleted'), 'success');
      } catch(e) {
          PM.fns.showToast(PM.fns.t('toast.modelDeleteFailed', { msg: e.message }), 'error');
      }
  }

  PM.fns.deleteModelInList = deleteModelInList;

  function renderMinecraftModel(container, json, isStatic = false) {
      container.innerHTML = '';
      container.style.position = 'relative';
      container.style.perspective = '1000px';
      container.style.overflow = 'hidden';
      container.style.background = 'transparent';

      if (!json || (!json.elements && json.parent)) {
          container.innerHTML = '<div style="text-align:center;color:#8b949e;height:100%;display:flex;align-items:center;justify-content:center;font-size:10px;">含 parent 无法预览</div>';
          return;
      }
      if (!json || !json.elements || json.elements.length === 0) {
          container.innerHTML = '<div style="text-align:center;color:#8b949e;height:100%;display:flex;align-items:center;justify-content:center;font-size:10px;">无 elements</div>';
          return;
      }

      // 缩放基准：Minecraft 1 格(unit) = 10px
      const S = 10; 
      
      const scene = document.createElement('div');
      scene.style.position = 'absolute';
      scene.style.left = '50%';
      scene.style.top = '50%';
      scene.style.transformStyle = 'preserve-3d';
      container.appendChild(scene);

      let rotX = -25;
      let rotY = 45;
      
      const containerWidth = container.clientWidth || (isStatic ? 64 : 300);
      const containerHeight = container.clientHeight || (isStatic ? 64 : 300);
      let zoom = isStatic ? Math.min(containerWidth, containerHeight) / 250 : 1.2;

      function updateTransform() {
          scene.style.transform = `scale(${zoom}) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      }
      updateTransform();

      const pendingTextures = [];

      json.elements.forEach(el => {
          const cx = (el.from[0] + el.to[0]) / 2;
          const cy = (el.from[1] + el.to[1]) / 2;
          const cz = (el.from[2] + el.to[2]) / 2;
          
          const w = el.to[0] - el.from[0];
          const h = el.to[1] - el.from[1];
          const d = el.to[2] - el.from[2];

          const elDiv = document.createElement('div');
          elDiv.style.position = 'absolute';
          elDiv.style.transformStyle = 'preserve-3d';
          
          let targetDiv = elDiv; 

          // 处理模型单轴旋转
          if (el.rotation) {
              const ro = el.rotation.origin || [8, 8, 8];
              const rtx = ro[0] - 8;
              const rty = 8 - ro[1]; 
              const rtz = ro[2] - 8;
              
              elDiv.style.transform = `translate3d(${rtx * S}px, ${rty * S}px, ${rtz * S}px)`;
              
              const axis = el.rotation.axis;
              const angle = el.rotation.angle || 0;
              if (axis === 'x') elDiv.style.transform += ` rotateX(${-angle}deg)`;
              if (axis === 'y') elDiv.style.transform += ` rotateY(${-angle}deg)`;
              if (axis === 'z') elDiv.style.transform += ` rotateZ(${-angle}deg)`;
              
              const innerDiv = document.createElement('div');
              innerDiv.style.position = 'absolute';
              innerDiv.style.transformStyle = 'preserve-3d';
              innerDiv.style.transform = `translate3d(${(cx - ro[0]) * S}px, ${(ro[1] - cy) * S}px, ${(cz - ro[2]) * S}px)`;
              
              elDiv.appendChild(innerDiv);
              targetDiv = innerDiv;
          } else {
              const tx = cx - 8;
              const ty = 8 - cy;
              const tz = cz - 8;
              elDiv.style.transform = `translate3d(${tx * S}px, ${ty * S}px, ${tz * S}px)`;
          }

          scene.appendChild(elDiv);
          if (!el.faces) return;
          
          // 构建6个面
          const faceDefs = [
              { dir: 'up',    fw: w, fh: d, t: `rotateX(90deg) translateZ(${h/2 * S}px)`,   shade: 1.0 },
              { dir: 'down',  fw: w, fh: d, t: `rotateX(-90deg) translateZ(${h/2 * S}px)`,  shade: 0.5 },
              { dir: 'north', fw: w, fh: h, t: `rotateY(180deg) translateZ(${d/2 * S}px)`, shade: 0.8 },
              { dir: 'south', fw: w, fh: h, t: `rotateY(0deg) translateZ(${d/2 * S}px)`,   shade: 0.8 },
              { dir: 'east',  fw: d, fh: h, t: `rotateY(90deg) translateZ(${w/2 * S}px)`,   shade: 0.6 },
              { dir: 'west',  fw: d, fh: h, t: `rotateY(-90deg) translateZ(${w/2 * S}px)`,  shade: 0.6 }
          ];

          faceDefs.forEach(fdef => {
              const faceData = el.faces[fdef.dir];
              if (!faceData) return;
              
              const faceDiv = document.createElement('div');
              faceDiv.style.position = 'absolute';
              faceDiv.style.transformStyle = 'preserve-3d';
              faceDiv.style.width = `${fdef.fw * S}px`;
              faceDiv.style.height = `${fdef.fh * S}px`;
              faceDiv.style.marginLeft = `${-fdef.fw * S / 2}px`;
              faceDiv.style.marginTop = `${-fdef.fh * S / 2}px`;
              faceDiv.style.transform = fdef.t;
              
              const texDiv = document.createElement('div');
              texDiv.style.width = '100%';
              texDiv.style.height = '100%';
              texDiv.style.imageRendering = 'pixelated'; // 保持 Minecraft 像素风
              texDiv.style.filter = `brightness(${fdef.shade})`;
              
              // 1. 解析贴图变量映射
              let current = faceData.texture;
              let loopDepth = 0;
              while (current && current.startsWith('#') && loopDepth < 10) {
                  current = (json.textures || {})[current.substring(1)];
                  loopDepth++;
              }
              
              if (current) {
                  let ns = 'minecraft';
                  let path = current;
                  if (current.includes(':')) {
                      const parts = current.split(':');
                      ns = parts[0];
                      path = parts[1];
                  }
                  if (path.endsWith('.png')) path = path.slice(0, -4);
                  const zipPath = `assets/${ns}/textures/${path}.png`;
                  pendingTextures.push({ div: texDiv, path: zipPath });
              } else {
                  texDiv.style.backgroundColor = '#f0f'; 
              }

              // 2. 解析贴图 UV 坐标
              let uv = faceData.uv;
              if (!uv) {
                  if (fdef.dir === 'up' || fdef.dir === 'down') uv = [el.from[0], el.from[2], el.to[0], el.to[2]];
                  else if (fdef.dir === 'north' || fdef.dir === 'south') uv = [el.from[0], 16 - el.to[1], el.to[0], 16 - el.from[1]];
                  else uv = [el.from[2], 16 - el.to[1], el.to[2], 16 - el.from[1]];
              }
              
              const uw = Math.abs(uv[2] - uv[0]);
              const uh = Math.abs(uv[3] - uv[1]);
              const flipX = uv[2] < uv[0] ? -1 : 1;
              const flipY = uv[3] < uv[1] ? -1 : 1;
              
              if (uw !== 0 && uh !== 0) {
                  const bgWidth = (16 / uw) * (fdef.fw * S);
                  const bgHeight = (16 / uh) * (fdef.fh * S);
                  
                  const minU = Math.min(uv[0], uv[2]);
                  const minV = Math.min(uv[1], uv[3]);
                  const bgPosX = -(minU / 16) * bgWidth;
                  const bgPosY = -(minV / 16) * bgHeight;
                  
                  texDiv.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
                  texDiv.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
              }

              let transformStr = `scale(${flipX}, ${flipY})`;
              if (faceData.rotation) transformStr += ` rotate(${faceData.rotation}deg)`;
              texDiv.style.transform = transformStr;

              faceDiv.appendChild(texDiv);
              targetDiv.appendChild(faceDiv);
          });
      });

      // 异步读取 PM.state.zip 中的贴图
      pendingTextures.forEach(async (pt) => {
          let url = PM.state.imageUrlCache.get(pt.path);
          if (!url && PM.state.zip && PM.state.zip.file(pt.path)) {
              try {
                  const blob = await PM.state.zip.file(pt.path).async('blob');
                  url = URL.createObjectURL(blob);
                  PM.state.imageUrlCache.set(pt.path, url);
              } catch (e) {}
          }
          if (url) {
              pt.div.style.backgroundImage = `url(${url})`;
              pt.div.style.backgroundColor = 'transparent';
              pt.div.style.border = 'none';
          } else {
              pt.div.style.backgroundImage = 'none';
              pt.div.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              pt.div.style.border = '1px solid rgba(255, 255, 255, 0.1)';
              pt.div.style.boxSizing = 'border-box';
          }
      });

      // --- 添加鼠标互动支持（拖拽旋转，滚轮缩放）---
      if (!isStatic) {
          let isDragging = false;
          let lastX, lastY;

          const onMouseDown = (e) => {
              isDragging = true;
              lastX = e.clientX;
              lastY = e.clientY;
              container.style.cursor = 'grabbing';
          };

          const onMouseMove = (e) => {
              if (!isDragging) return;
              if (!document.body.contains(container)) {
                  window.removeEventListener('mousemove', onMouseMove);
                  window.removeEventListener('mouseup', onMouseUp);
                  return;
              }
              const dx = e.clientX - lastX;
              const dy = e.clientY - lastY;
              lastX = e.clientX;
              lastY = e.clientY;
              
              rotY += dx * 0.5;
              rotX -= dy * 0.5;
              rotX = Math.max(-90, Math.min(90, rotX)); // 锁定俯仰角
              updateTransform();
          };

          const onMouseUp = () => {
              isDragging = false;
              if (document.body.contains(container)) {
                  container.style.cursor = 'grab';
              }
          };

          container.addEventListener('mousedown', onMouseDown);
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);

          container.addEventListener('wheel', (e) => {
              e.preventDefault();
              zoom *= (e.deltaY > 0 ? 0.9 : 1.1);
              zoom = Math.max(0.2, Math.min(5, zoom));
              updateTransform();
          });
      }
  }

  PM.fns.renderMinecraftModel = renderMinecraftModel;

  async function previewModelInList(path) {
      try {
          const text = await PM.state.zip.file(path).async('string');
          const json = JSON.parse(text);
          const overlay = document.createElement('div');
          overlay.className = 'modal-overlay is-open';
          overlay.style.zIndex = '3000';
          overlay.innerHTML = `
              <div class="modal" style="width:400px">
                  <div class="modal-header">
                      <span class="modal-title">👀 3D 模型预览 (拖拽旋转/滚轮缩放)</span>
                      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                  </div>
                  <div class="modal-body" style="text-align:center; padding: 20px;">
                      <div id="quickModelPreviewContainer" style="width:360px;height:260px;background:#0d1117;border-radius:6px;border:1px solid #30363d;cursor:grab;margin:0 auto;"></div>
                      <div style="font-size:11px;color:#8b949e;margin-top:8px;">${path.split('/').pop()}</div>
                  </div>
              </div>
          `;
          document.body.appendChild(overlay);
          const container = document.getElementById('quickModelPreviewContainer');
          renderMinecraftModel(container, json);
      } catch (e) {
          PM.fns.showToast(PM.fns.t('toast.previewFailed', { msg: e.message }), 'error');
      }
  }

  PM.fns.previewModelInList = previewModelInList;

  function refreshModelsList() {
    renderModelsList();
    PM.fns.showToast(PM.fns.t('toast.modelsRefreshed'), 'success');
  }

  PM.fns.refreshModelsList = refreshModelsList;

  function navigateToModelsFolder() {
    PM.fns.switchH1Tab('explorer', document.querySelector('[data-tab="explorer"]'));
    setTimeout(() => PM.fns.navigateExplorer('assets'), 50);
  }

  PM.fns.navigateToModelsFolder = navigateToModelsFolder;

  function openNewModelDialog(editParams = null) {
    const isEdit = editParams && typeof editParams === 'object' && editParams.path;
    if (isEdit) {
        PM.state.nmState = { 
            step: 2, 
            ns: editParams.ns, 
            modelId: editParams.modelId, 
            localizedName: '', 
            jsonContent: editParams.jsonContent, 
            jsonName: editParams.modelId + '.json', 
            textures: [],
            editOriginalPath: editParams.path 
        };
    } else {
        PM.state.nmState = { step: 1, ns: 'minecraft', modelId: '', localizedName: '', jsonContent: null, jsonName: '', textures: [] };
    }

    const body2 = PM.fns.$('nmBody2');
    if (body2 && !body2.dataset.upgraded) {
        body2.dataset.upgraded = "1";
        body2.innerHTML = `
            <div style="display:flex; flex-direction:row; gap:16px; width:100%; height:100%;">
                <div style="flex:1; border:1px solid #30363d; border-radius:6px; background:#0d1117; display:flex; flex-direction:column;">
                    <div style="padding:8px; border-bottom:1px solid #30363d; font-size:12px; color:#8b949e; text-align:center; background:#161b22; border-radius:6px 6px 0 0;">
                        模型预览 (拖拽旋转/滚轮缩放)
                    </div>
                    <div id="nmPreview2" style="flex:1; min-height:260px; cursor:grab; position:relative; overflow:hidden;"></div>
                </div>
                <div style="flex:1.2; display:flex; flex-direction:column; overflow:hidden;">
                    <div style="font-size:12px; color:#c9d1d9; margin-bottom:12px; font-weight:500;">
                        检测到以下贴图，请确认路径并上传文件：
                    </div>
                    <div id="nmTexList" style="overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:8px; padding-right:6px;"></div>
                </div>
            </div>
        `;
    }

    const body3 = PM.fns.$('nmBody3');
    if (body3 && !body3.dataset.upgraded) {
        body3.dataset.upgraded = "1";
        const oldContent = body3.innerHTML;
        body3.innerHTML = `
            <div style="display:flex; flex-direction:row; gap:16px; width:100%; height:100%;">
                <div style="flex:1; border:1px solid #30363d; border-radius:6px; background:#0d1117; display:flex; flex-direction:column;">
                    <div style="padding:8px; border-bottom:1px solid #30363d; font-size:12px; color:#8b949e; text-align:center; background:#161b22; border-radius:6px 6px 0 0;">
                        模型预览 (拖拽旋转/滚轮缩放)
                    </div>
                    <div id="nmPreview3" style="flex:1; min-height:260px; cursor:grab; position:relative; overflow:hidden;"></div>
                </div>
                <div style="flex:1.2; display:flex; flex-direction:column; gap:12px; overflow-y:auto; padding-right:6px;">
                    ${oldContent}
                </div>
            </div>
        `;
    }

    // 初始化重置
    if (!isEdit) {
        PM.fns.$('nmJsonInput').value = '';
        if (PM.fns.$('nmModelId')) { PM.fns.$('nmModelId').value = ''; PM.fns.$('nmModelId').disabled = true; }
        if (PM.fns.$('nmLocalizedName')) PM.fns.$('nmLocalizedName').value = '';
        if (PM.fns.$('nmNamespace')) PM.fns.$('nmNamespace').value = 'minecraft';
    } else {
        if (PM.fns.$('nmModelId')) { PM.fns.$('nmModelId').value = PM.state.nmState.modelId; PM.fns.$('nmModelId').disabled = false; }
        if (PM.fns.$('nmNamespace')) PM.fns.$('nmNamespace').value = PM.state.nmState.ns;
        
        // 自动解析当前 JSON 填充材质
        PM.state.nmState.textures = [];
        if (PM.state.nmState.jsonContent.textures) {
            for (const [key, val] of Object.entries(PM.state.nmState.jsonContent.textures)) {
                PM.state.nmState.textures.push({ key, rawVal: val });
            }
        }
        renderNmTexList();
    }

    const headerTitle = PM.fns.$('newModelDialog').querySelector('.nm-header-title');
    if (headerTitle) {
        headerTitle.textContent = isEdit ? '✏️ 编辑模型及贴图 - ' + PM.state.nmState.modelId : '🎲 新建自定义模型';
    }

    updateNmStepsVisibility();
    PM.fns.$('newModelDialog').classList.add('is-open');

    if (isEdit) setTimeout(refreshNmPreview, 50);
  }

  PM.fns.openNewModelDialog = openNewModelDialog;

  function handleNmJsonDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const zone = e.currentTarget;
    if (zone && zone.classList) zone.classList.remove('drag-over');
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || files.length === 0) return;
    // 构建一个最小化对象，模拟 <input> 传给 handleNmJsonUpload 的数据
    const mockInput = { files: files, value: '' };
    handleNmJsonUpload(mockInput);
  }

  PM.fns.handleNmJsonDrop = handleNmJsonDrop;

  function handleNmJsonUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const json = JSON.parse(e.target.result);
        PM.state.nmState.jsonContent = json;
        PM.state.nmState.jsonName = file.name;
        
        let rawStem = file.name.replace(/\.json$/i, '');
        const needsCorrection = !PM.fns.STRICT_RESOURCE_FILENAME_REGEX.test(rawStem);
        const safeStem = (rawStem || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'unnamed';
        if (needsCorrection) {
          PM.fns.showToast(PM.fns.t('toast.modelNameFixed', { raw: rawStem, safe: safeStem }), 'warn');
        }
        PM.state.nmState.modelId = safeStem;
        if (PM.fns.$('nmModelId')) {
            PM.fns.$('nmModelId').value = PM.state.nmState.modelId;
            PM.fns.$('nmModelId').disabled = false;
        }

        // 解析并收集 JSON 里的所有的 Texture 引用
        PM.state.nmState.textures = [];
        if (json.textures) {
            for (const [key, val] of Object.entries(json.textures)) {
                PM.state.nmState.textures.push({ key, rawVal: val });
            }
        }

        // 渲染贴图列表
        renderNmTexList();
        
        // 【自动跳转】解析成功直接跳到第2步贴图列表
        nmGoNext();
        input.value = ''; 
      } catch(err) {
        PM.fns.showToast(PM.fns.t('toast.jsonParseFailed', { msg: err.message }), 'error');
        input.value = '';
      }
    };
    reader.readAsText(file);
  }

  PM.fns.handleNmJsonUpload = handleNmJsonUpload;

  function renderNmTexList() {
    const list = PM.fns.$('nmTexList');
    if (!list) return;
    if (PM.state.nmState.textures.length === 0) {
        list.innerHTML = '<div style="color:#8b949e;font-size:12px;padding:10px;text-align:center;">此模型没有检测到任何贴图引用。</div>';
        return;
    }
    
    list.innerHTML = PM.state.nmState.textures.map((tex, i) => {
        let ns = 'minecraft';
        let path = tex.rawVal;
        if (path.includes(':')) {
            const parts = path.split(':');
            ns = parts[0];
            path = parts[1];
        }
        
        return `
        <div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:10px;display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:11px;color:#8b949e;background:#21262d;padding:2px 6px;border-radius:4px;white-space:nowrap;font-weight:bold;">#${PM.fns.escapeHtml(tex.key)}</span>
                <div style="display:flex;align-items:center;gap:4px;flex:1;">
                    <input type="text" value="${PM.fns.escapeAttr(ns)}" onchange="updateNmTexPath(${i}, 'ns', this.value)" style="width:75px;background:#0d1117;border:1px solid #30363d;color:#79c0ff;font-size:11px;padding:5px;border-radius:4px;outline:none;" placeholder="命名空间">
                    <span style="color:#484f58;">:</span>
                    <input type="text" value="${PM.fns.escapeAttr(path)}" onchange="updateNmTexPath(${i}, 'path', this.value)" style="flex:1;background:#0d1117;border:1px solid #30363d;color:#79c0ff;font-size:11px;padding:5px;border-radius:4px;outline:none;" placeholder="路径 (如 block/stone)">
                </div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <span id="nmTexStatus_${i}" style="font-size:11px;color:#8b949e;">检查中...</span>
                <button class="btn btn-primary btn-xs" onclick="document.getElementById('nmTexFile_${i}').click()">📤 上传文件</button>
                <input type="file" id="nmTexFile_${i}" accept="image/png" style="display:none;" onchange="uploadNmTexFile(${i}, this)">
            </div>
        </div>
        `;
    }).join('');
    
    PM.state.nmState.textures.forEach((tex, i) => checkNmTexStatus(i));
  }

  PM.fns.renderNmTexList = renderNmTexList;

  function nmAddExtraTex() {
    // 自动寻找不冲突的键名 (extra_0, extra_1...)
    let k = 0;
    while(PM.state.nmState.textures.some(t => t.key === `extra_${k}`)) k++;
    const newKey = `extra_${k}`;
    
    // 向状态和 JSON 结构中注入新贴图项
    PM.state.nmState.textures.push({ key: newKey, rawVal: 'minecraft:block/unknown' });
    if (!PM.state.nmState.jsonContent.textures) PM.state.nmState.jsonContent.textures = {};
    PM.state.nmState.jsonContent.textures[newKey] = 'minecraft:block/unknown';
    
    // 重新渲染列表
    renderNmTexList();
    
    // 滚动到底部
    setTimeout(() => {
        const list = document.getElementById('nmTexList');
        if (list) list.scrollTop = list.scrollHeight;
    }, 10);
  }

  PM.fns.nmAddExtraTex = nmAddExtraTex;

  function updateNmTexPath(i, field, value) {
    const tex = PM.state.nmState.textures[i];
    let ns = 'minecraft';
    let path = tex.rawVal;
    if (path.includes(':')) {
        const parts = path.split(':');
        ns = parts[0];
        path = parts[1];
    }
    if (field === 'ns') ns = value.trim() || 'minecraft';
    if (field === 'path') path = value.trim();
    
    tex.rawVal = ns + ':' + path;
    PM.state.nmState.jsonContent.textures[tex.key] = tex.rawVal;
    
    checkNmTexStatus(i);
    refreshNmPreview(); // 立刻刷新左侧渲染！
  }

  PM.fns.updateNmTexPath = updateNmTexPath;

  async function uploadNmTexFile(i, input) {
    const file = input.files[0];
    if (!file) return;
    
    const tex = PM.state.nmState.textures[i];
    let ns = 'minecraft';
    let path = tex.rawVal;
    if (path.includes(':')) {
        const parts = path.split(':');
        ns = parts[0];
        path = parts[1];
    }
    
    if (path.endsWith('.png')) path = path.slice(0, -4);
    const zipPath = `assets/${ns}/textures/${path}.png`;
    
    try {
        const buf = await file.arrayBuffer();
        PM.state.zip.file(zipPath, buf);
        PM.state.fileMap[zipPath] = PM.state.zip.file(zipPath);
        
        const blob = new Blob([buf], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        if (PM.state.imageUrlCache.has(zipPath)) {
            URL.revokeObjectURL(PM.state.imageUrlCache.get(zipPath));
        }
        PM.state.imageUrlCache.set(zipPath, url);
        
        checkNmTexStatus(i);
        refreshNmPreview(); // 上传完毕立刻显示贴图效果！
        input.value = '';
    } catch (e) {
        PM.fns.showToast(PM.fns.t('toast.texUploadFailed', { msg: e.message }), 'error');
    }
  }

  PM.fns.uploadNmTexFile = uploadNmTexFile;

  function checkNmTexStatus(i) {
    const tex = PM.state.nmState.textures[i];
    let ns = 'minecraft';
    let path = tex.rawVal;
    if (path.includes(':')) {
        const parts = path.split(':');
        ns = parts[0];
        path = parts[1];
    }
    if (path.endsWith('.png')) path = path.slice(0, -4);
    const zipPath = `assets/${ns}/textures/${path}.png`;
    
    const statusEl = PM.fns.$('nmTexStatus_' + i);
    if (!statusEl) return;
    
    if (PM.state.fileMap[zipPath] || PM.state.imageUrlCache.has(zipPath)) {
        statusEl.textContent = '✅ 已就绪 (内存中)';
        statusEl.style.color = '#3fb950';
    } else {
        statusEl.textContent = '❌ 未上传/路径缺失';
        statusEl.style.color = '#f85149';
    }
  }

  PM.fns.checkNmTexStatus = checkNmTexStatus;

  function refreshNmPreview() {
    if (PM.state.nmState.step === 2) {
        const container = PM.fns.$('nmPreview2');
        if (container && PM.state.nmState.jsonContent) renderMinecraftModel(container, PM.state.nmState.jsonContent);
    } else if (PM.state.nmState.step === 3) {
        const container = PM.fns.$('nmPreview3');
        if (container && PM.state.nmState.jsonContent) renderMinecraftModel(container, PM.state.nmState.jsonContent);
    }
  }

  PM.fns.refreshNmPreview = refreshNmPreview;

  function updateNmStepsVisibility() {
    PM.fns.$('nmBody1').style.display = PM.state.nmState.step === 1 ? '' : 'none';
    PM.fns.$('nmBody2').style.display = PM.state.nmState.step === 2 ? '' : 'none';
    PM.fns.$('nmBody3').style.display = PM.state.nmState.step === 3 ? '' : 'none';
    
    // 如果处于编辑模式下被引导直接进入第2步，不允许返回第1步(上传JSON)
    let hideBack = PM.state.nmState.step === 1 || (PM.state.nmState.editOriginalPath && PM.state.nmState.step === 2);
    PM.fns.$('nmBackBtn').style.display = hideBack ? 'none' : '';

    const nextBtn = PM.fns.$('nmNextBtn');
    if (nextBtn) {
        nextBtn.textContent = PM.state.nmState.step === 3 ? '保存并完成 ✓' : '下一步 →';
        nextBtn.disabled = PM.state.nmState.step === 1; // 只有新建向导第1步必须强制等待 JSON
    }
    
    if (PM.state.nmState.step === 2) PM.fns.$('nmHint').textContent = '请确认左侧预览，并上传所有缺失的贴图';
    else if (PM.state.nmState.step === 3) PM.fns.$('nmHint').textContent = '请确认模型标识符、命名空间等最终注册信息';
    else PM.fns.$('nmHint').textContent = '请先上传模型 JSON 文件';
    
    for (let i = 1; i <= 3; i++) {
        const el = PM.fns.$('nmStep' + i);
        if (!el) continue;
        el.classList.remove('active', 'done');
        if (i < PM.state.nmState.step) el.classList.add('done');
        else if (i === PM.state.nmState.step) el.classList.add('active');
    }
    refreshNmPreview();
  }

  PM.fns.updateNmStepsVisibility = updateNmStepsVisibility;

  function nmGoBack() {
    if (PM.state.nmState.editOriginalPath && PM.state.nmState.step === 2) return;
    if (PM.state.nmState.step > 1) {
        PM.state.nmState.step--;
        updateNmStepsVisibility();
    }
  }

  PM.fns.nmGoBack = nmGoBack;

  function nmGoNext() {
    if (PM.state.nmState.step < 3) {
        PM.state.nmState.step++;
        updateNmStepsVisibility();
    } else {
        saveNewModelToZip();
    }
  }

  PM.fns.nmGoNext = nmGoNext;

  async function saveNewModelToZip() {
    const ns = PM.fns.$('nmNamespace').value.trim() || 'minecraft';
    const modelId = PM.fns.$('nmModelId').value.trim() || PM.state.nmState.modelId;
    
    const localizedName = PM.fns.$('nmLocalizedName') ? PM.fns.$('nmLocalizedName').value.trim() : '';
    
    const jsonPath = `assets/${ns}/models/custom_models/${modelId}.json`;
    const defPath = `assets/ocelotsignmod/model_definitions/${modelId}.json`;
    
    try {
        // 如果是在"编辑模式"下且修改了标识符/命名空间导致了路径改变，删除老文件
        if (PM.state.nmState.editOriginalPath && PM.state.nmState.editOriginalPath !== jsonPath) {
            PM.state.zip.remove(PM.state.nmState.editOriginalPath);
            delete PM.state.fileMap[PM.state.nmState.editOriginalPath];
        }

        const jsonStr = JSON.stringify(PM.state.nmState.jsonContent, null, 2);
        PM.state.zip.file(jsonPath, jsonStr);
        PM.state.fileMap[jsonPath] = PM.state.zip.file(jsonPath);
        
        const defJson = {
            model_id: `${ns}:${modelId}`,
            name: localizedName || modelId
        };
        PM.state.zip.file(defPath, JSON.stringify(defJson, null, 2));
        PM.state.fileMap[defPath] = PM.state.zip.file(defPath);
        
        PM.fns.$('newModelDialog').classList.remove('is-open');
        refreshModelsList();
        PM.fns.showToast(PM.fns.t('toast.modelSaved', { id: modelId }), 'success');
    } catch (e) {
        PM.fns.showToast(PM.fns.t('toast.modelSaveFailed', { msg: e.message }), 'error');
    }
  }

  PM.fns.saveNewModelToZip = saveNewModelToZip;

  function closeNewModelDialog() { PM.fns.$('newModelDialog').classList.remove('is-open'); }

  PM.fns.closeNewModelDialog = closeNewModelDialog;

  function openEditModelDialog() { PM.fns.showToast(PM.fns.t('toast.editModelTodo'), 'info'); }

  PM.fns.openEditModelDialog = openEditModelDialog;

  function closeEditModelDialog() { PM.fns.$('editModelDialog').classList.remove('is-open'); }

  PM.fns.closeEditModelDialog = closeEditModelDialog;

  function saveEditModel() { closeEditModelDialog(); PM.fns.showToast(PM.fns.t('toast.modelSavedSimple'), 'success'); }

  PM.fns.saveEditModel = saveEditModel;

})();
