(function () {
  "use strict";

  // 合并所有分域字典。
  var I18N = window.I18N = { zh: {}, en: {} };
  [
    window.I18N_core,
    window.I18N_landing,
    window.I18N_packmaker,
    window.I18N_modals,
    window.I18N_plaza
  ].forEach(function (src) {
    if (!src) return;
    Object.keys(src.zh || {}).forEach(function (k) { I18N.zh[k] = src.zh[k]; });
    Object.keys(src.en || {}).forEach(function (k) { I18N.en[k] = src.en[k]; });
  });

  // 当前语言状态。
  var currentLang = 'zh';

  // 根据 URL 路径自动检测语言。
  function detectLangFromPath() {
    var path = window.location.pathname;
    return path.startsWith('/en/') || path.indexOf('/en/') >= 0 ? 'en' : 'zh';
  }
  currentLang = detectLangFromPath();

  // 查询翻译。参数可选并以 {name} 占位符替换。
  function t(key, vars, lang) {
    var langCode;
    if (typeof vars === 'string' && lang === undefined) {
      langCode = vars;
      vars = null;
    } else {
      langCode = lang || currentLang;
    }
    var strings = I18N[langCode] || I18N.zh;
    var str = strings[key];
    if (str === undefined) str = I18N.zh[key] !== undefined ? I18N.zh[key] : key;
    if (vars && typeof vars === 'object') {
      str = str.replace(/\{(\w+)\}/g, function (m, k) {
        return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m;
      });
    }
    return str;
  }

  function setLang(lang) {
    if (I18N[lang]) {
      currentLang = lang;
      window.dispatchEvent(new CustomEvent('langChange', { detail: { lang: lang } }));
    }
  }

  function getLang() { return currentLang; }

  // 当 i18n.js 在 pm-state.js 之后才被加载（典型 head/body 双脚本块场景），
  // 这里的 setter 会补上对 PM.fns.t 的挂载。多次重复执行幂等。
  Object.defineProperty(window, 't', {
    configurable: true,
    enumerable: true,
    get: function () { return window._realT; },
    set: function (fn) {
      window._realT = fn;
      if (window.PM && window.PM.fns) {
        window.PM.fns.t = fn;
        window.PM.fns._pendingT = fn;
      }
    }
  });
  // 如果 i18n.js 已经在我们之前运行过 window.t = t，把现成的值同步过来。
  if (window._realT && window.PM && window.PM.fns) {
    window.PM.fns.t = window._realT;
    window.PM.fns._pendingT = window._realT;
  }

  // 暴露给全局，以便 inline onclick 、components.js 、其他脚本能调用。
  window.t = t;
  window.setLang = setLang;
  window.getLang = getLang;
  window.detectLangFromPath = detectLangFromPath;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { t: t, setLang: setLang, getLang: getLang, I18N: I18N, currentLang: currentLang };
  }
})();
