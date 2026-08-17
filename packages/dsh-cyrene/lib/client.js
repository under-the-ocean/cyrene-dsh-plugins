/**
 * 昔涟 (Cyrene) pet companion — Browser half.
 *
 * Renders the REAL Cyrene Live2D model as a floating desktop pet in the DSH
 * web GUI. Loads the model from the plugin's own /cyrene/model/* route,
 * the Cubism Core from /cyrene/live2dcubismcore.min.js, and PIXI +
 * pixi-live2d-display from unpkg CDN (verified reachable).
 *
 * Features:
 *   - Full Live2D model rendering (WebGL canvas, breathing/blinking physics)
 *   - Status bubble with the current activity line/phrase (polled from host)
 *   - Activity-driven motion: thinking/tool/review/done/failed animations
 *   - Click to interact (play a random motion/expression)
 *   - Drag to reposition (persisted via host API)
 *   - Hide/summon via a small control
 *
 * Plain JS ONLY (no import/JSX). React arrives via require('react').
 */
window.__ModuleLoader__.load({
  id: 'cyrene-dsh',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var React = require('react')
    var createRoot = require('react-dom/client').createRoot

    var POLL_MS = 2000
    var API_STATE = '/api/cyrene/state'
    var API_INFO = '/api/cyrene/info'
    var API_CONFIG = '/api/cyrene/set-config'
    var MODEL_URL = '/cyrene/model/Cyrene.model3.json'
    var CUBISM_CORE_URL = '/cyrene/live2dcubismcore.min.js'
    // PIXI 7 full bundle (all @pixi/* submodules attached to global PIXI)
    var PIXI_URL = 'https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.js'
    // pixi-live2d-display cubism4 CDN build — attaches PIXI.live2d.Live2DModel
    var LIVE2D_URL = 'https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/cubism4.min.js'

    // Zoom range: 0.5x ~ 2.0x, step 0.1
    var ZOOM_MIN = 0.5
    var ZOOM_MAX = 2.0
    var ZOOM_STEP = 0.1

    // Status bubble copy per phase (fallback when host sends none)
    var PHASE_LABEL = {
      idle: '',
      waiting: '等你指示…',
      thinking: '思考中…',
      tool: '正在操作…',
      review: '整理回复…',
      done: '完成啦！',
      failed: '出了点问题…',
    }

    // Motion to play per phase (Live2D motion group + index into that group)
    // Indexes from Cyrene.model3.json: 动作#6[0]=回正, [1]=Wink~, [2]=我可爱吧~, [3]=笑一笑吧~
    var PHASE_MOTION = {
      thinking: { group: '动作#6', index: 1 },   // Wink~ (thinking face)
      tool: { group: '动作#6', index: 2 },        // 我可爱吧~ (busy)
      review: { group: '动作#6', index: 3 },      // 笑一笑吧~ (reviewing)
      done: { group: '动作#6', index: 2 },         // 我可爱吧~ (celebration)
      failed: { group: '动作#6', index: 0 },       // 动作回正 (reset)
    }

    // Idle motion pool: random Tick3 idle motions
    var IDLE_MOTIONS = [
      { group: 'Tick3', index: 0 },  // Wink（待机）
      { group: 'Tick3', index: 1 },  // 可爱（待机）
      { group: 'Tick3', index: 2 },  // 微笑（待机）
      { group: 'Tick3', index: 3 },  // 荡秋千（待机）
    ]

    // Random expressions pool for click interaction
    var RANDOM_EXPRESSIONS = [
      '墨镜', '问号', '闪耀', '星星眼', '圈圈眼', '开心眼', '拽秋千1', '拽秋千2',
    ]

    // Global stylesheet (deduped by data-plugin-css; removed on unload)
    var CSS = [

      // Body scope marker
      'body[data-cyrene-skin] { --cyrene-active: 1; }',

      // ── Light scheme (default) ──
      'body[data-cyrene-skin] {',
      '  --dsw-alias-bg-base: #ffffff;',
      '  --dsw-alias-bg-layer-1: #f5f5f7;',
      '  --dsw-alias-bg-layer-2: #fafafc;',
      '  --dsw-alias-bg-layer-3: #ffffff;',
      '  --dsw-alias-bg-overlay: #ffffff;',
      '  --dsw-alias-bg-module-platform: #f5f5f7;',
      '  --dsw-alias-bg-multi-select: #fafafc;',
      '  --dsw-alias-bg-skeleton: rgba(0, 0, 0, 0.04);',
      '  --dsw-alias-border-l1: #e5e5ea;',
      '  --dsw-alias-border-l2: #d2d2d7;',
      '  --dsw-alias-border-l2-darkmode-thin: #e5e5ea;',
      '  --dsw-alias-border-l3: #c7c7cc;',
      '  --dsw-alias-border-l4: #aeaeb2;',
      '  --dsw-alias-border-inverted: rgba(0, 0, 0, 0.06);',
      '  --dsw-alias-border-inverted2: rgba(0, 0, 0, 0.08);',
      '  --dsw-alias-brand-primary: #ff5b8a;',
      '  --dsw-alias-brand-primary-invert: #ffffff;',
      '  --dsw-alias-brand-text: #c43a64;',
      '  --dsw-alias-brand-primary-new-colorprimary-new-color: #ff5b8a;',
      '  --dsw-alias-button-primary-fill: #ff5b8a;',
      '  --dsw-alias-button-primary-hover: #e84a78;',
      '  --dsw-alias-button-primary-dimmed: #ffd6e4;',
      '  --dsw-alias-button-contrast-fill: #ffffff;',
      '  --dsw-alias-button-elevated-fill: #ffffff;',
      '  --dsw-alias-button-floating-fill: #ffffff;',
      '  --dsw-alias-button-floating-hover: #fafafc;',
      '  --dsw-alias-button-ghost-active-border: #ffb1cb;',
      '  --dsw-alias-button-ghost-active-fill: #fff1f6;',
      '  --dsw-alias-button-ghost-active-hover: #ffd6e4;',
      '  --dsw-alias-button-info-fill: #ff5b8a;',
      '  --dsw-alias-button-info-hover: #e84a78;',
      '  --dsw-alias-interactive-bg-hover: rgba(0, 0, 0, 0.04);',
      '  --dsw-alias-interactive-bg-hover-accent: rgba(255, 91, 138, 0.08);',
      '  --dsw-alias-interactive-bg-active: rgba(0, 0, 0, 0.08);',
      '  --dsw-alias-interactive-bg-hover-solid: #f5f5f7;',
      '  --dsw-alias-interactive-bg-hover-danger: rgba(255, 59, 48, 0.05);',
      '  --dsw-alias-label-primary: #1d1d1f;',
      '  --dsw-alias-label-primary-bluish: #2c2c2e;',
      '  --dsw-alias-label-primary-dimmed: #2c2c2e;',
      '  --dsw-alias-label-primary-foreground: #ffffff;',
      '  --dsw-alias-label-primary-inverted: #ffffff;',
      '  --dsw-alias-label-secondary: #4f4a57;',
      '  --dsw-alias-label-tertiary: #6f6876;',
      '  --dsw-alias-label-caption: #6f6876;',
      '  --dsw-alias-label-dimmed: #8e8895;',
      '  --dsw-alias-state-error-primary: #e5484d;',
      '  --dsw-alias-state-error-secondary: #f2555a;',
      '  --dsw-alias-state-success-primary: #30a46c;',
      '  --dsw-alias-state-success-secondary: #3dd68c;',
      '  --dsw-alias-state-success-tertiary: #e6f6ef;',
      '  --dsw-alias-state-warn-primary: #f5a524;',
      '  --dsw-alias-state-warn-secondary: #ffb224;',
      '  --dsw-alias-state-warn-label: #b7791f;',
      '  --dsw-alias-state-warn-tertiary: #fef3e2;',
      '  --dsw-alias-state-business-primary: #ff5b8a;',
      '  --dsw-alias-state-business-tertiary: #ffd6e4;',
      '  --dsw-alias-markdown-code-block: #f5f5f7;',
      '  --dsw-alias-markdown-code-block-banner: #fafafc;',
      '  --dsw-alias-markdown-inline-code: #fff1f6;',
      '  --dsw-alias-markdown-citation: #fafafc;',
      '  --dsw-alias-markdown-placeholder: #8e8895;',
      '  --dsw-alias-markdown-tag: #ffd6e4;',
      '  --dsw-alias-markdown-code-segment-selected: #ffffff;',
      '  --dsw-alias-markdown-code-segment-unselected: #f5f5f7;',
      '  --dsw-alias-scrollbar-bg-l1: #e5e5ea;',
      '  --dsw-alias-scrollbar-bg-l2: #d2d2d7;',
      '  --dsw-alias-scrollbar-hover-l1: #c7c7cc;',
      '  --dsw-alias-scrollbar-hover-l2: #aeaeb2;',
      '  --dsw-specific-sidebar-fill: #fafafc;',
      '  --dsw-specific-sidebar-nav-item-active: #fff1f6;',
      '  --dsw-specific-sidebar-nav-item-active-accent: #ff5b8a;',
      '  --dsw-specific-sidebar-nav-item-hover: #f5f5f7;',
      '  --dsw-specific-bubble: #ffffff;',
      '  --dsw-specific-bubble-highlight: #ffd6e4;',
      '  --dsw-specific-input-major: #ffffff;',
      '  --dsw-specific-login-input: #fafafc;',
      '  --dsw-specific-menu: #ffffff;',
      '  --dsw-specific-selector: #fafafc;',
      '  --dsw-specific-tip: #f5f5f7;',
      '  --dsw-alias-toast-bg: #2c2c2e;',
      '  --dsw-alias-tooltip-bg: #2c2c2e;',
      '  --dsw-alias-tooltip-fg: #ffffff;',
      '}',

      // ── Dark scheme (deep plum-navy + pink) ──
      'body[data-cyrene-skin][data-ds-dark-theme] {',
      '  --dsw-alias-bg-base: #14121c;',
      '  --dsw-alias-bg-layer-1: #1a1726;',
      '  --dsw-alias-bg-layer-2: #201c30;',
      '  --dsw-alias-bg-layer-3: #262140;',
      '  --dsw-alias-bg-overlay: #2a2350;',
      '  --dsw-alias-bg-module-platform: #1a1726;',
      '  --dsw-alias-bg-multi-select: #201c30;',
      '  --dsw-alias-bg-skeleton: rgba(255, 255, 255, 0.08);',
      '  --dsw-alias-border-l1: rgba(255, 255, 255, 0.08);',
      '  --dsw-alias-border-l2: rgba(255, 255, 255, 0.14);',
      '  --dsw-alias-border-l2-darkmode-thin: rgba(255, 255, 255, 0.08);',
      '  --dsw-alias-border-l3: rgba(255, 255, 255, 0.18);',
      '  --dsw-alias-border-l4: rgba(255, 255, 255, 0.24);',
      '  --dsw-alias-border-inverted: rgba(255, 255, 255, 0.06);',
      '  --dsw-alias-border-inverted2: rgba(255, 255, 255, 0.08);',
      '  --dsw-alias-brand-primary: #ff7da8;',
      '  --dsw-alias-brand-primary-invert: #14121c;',
      '  --dsw-alias-brand-text: #ffb1cb;',
      '  --dsw-alias-brand-primary-new-colorprimary-new-color: #ff7da8;',
      '  --dsw-alias-button-primary-fill: #ff7da8;',
      '  --dsw-alias-button-primary-hover: #ff6b97;',
      '  --dsw-alias-button-primary-dimmed: #3a2a3f;',
      '  --dsw-alias-button-contrast-fill: #14121c;',
      '  --dsw-alias-button-elevated-fill: #1a1726;',
      '  --dsw-alias-button-floating-fill: #201c30;',
      '  --dsw-alias-button-floating-hover: #262140;',
      '  --dsw-alias-button-ghost-active-border: #ff7da8;',
      '  --dsw-alias-button-ghost-active-fill: rgba(255, 125, 168, 0.16);',
      '  --dsw-alias-button-ghost-active-hover: rgba(255, 125, 168, 0.24);',
      '  --dsw-alias-button-info-fill: #e84a78;',
      '  --dsw-alias-button-info-hover: #c43a64;',
      '  --dsw-alias-interactive-bg-hover: rgba(255, 255, 255, 0.06);',
      '  --dsw-alias-interactive-bg-hover-accent: rgba(255, 125, 168, 0.12);',
      '  --dsw-alias-interactive-bg-active: rgba(255, 255, 255, 0.10);',
      '  --dsw-alias-interactive-bg-hover-solid: #262140;',
      '  --dsw-alias-interactive-bg-hover-danger: rgba(255, 59, 48, 0.15);',
      '  --dsw-alias-label-primary: #fef7ff;',
      '  --dsw-alias-label-primary-bluish: #ebe5f5;',
      '  --dsw-alias-label-primary-dimmed: #a094c1;',
      '  --dsw-alias-label-primary-foreground: #14121c;',
      '  --dsw-alias-label-primary-inverted: #14121c;',
      '  --dsw-alias-label-secondary: #a094c1;',
      '  --dsw-alias-label-tertiary: #6b6388;',
      '  --dsw-alias-label-caption: #6b6388;',
      '  --dsw-alias-label-dimmed: #4a4460;',
      '  --dsw-alias-state-error-primary: #f2555a;',
      '  --dsw-alias-state-error-secondary: #e5484d;',
      '  --dsw-alias-state-success-primary: #3dd68c;',
      '  --dsw-alias-state-success-secondary: #30a46c;',
      '  --dsw-alias-state-success-tertiary: #1f3d2f;',
      '  --dsw-alias-state-warn-primary: #ffb224;',
      '  --dsw-alias-state-warn-secondary: #f5a524;',
      '  --dsw-alias-state-warn-label: #ffca4d;',
      '  --dsw-alias-state-warn-tertiary: #3d2f1f;',
      '  --dsw-alias-state-business-primary: #ff7da8;',
      '  --dsw-alias-state-business-tertiary: #3a2a3f;',
      '  --dsw-alias-markdown-code-block: #1a1726;',
      '  --dsw-alias-markdown-code-block-banner: #201c30;',
      '  --dsw-alias-markdown-inline-code: #2a2350;',
      '  --dsw-alias-markdown-citation: #201c30;',
      '  --dsw-alias-markdown-placeholder: #4a4460;',
      '  --dsw-alias-markdown-tag: #3a2a3f;',
      '  --dsw-alias-markdown-code-segment-selected: #262140;',
      '  --dsw-alias-markdown-code-segment-unselected: #1a1726;',
      '  --dsw-alias-scrollbar-bg-l1: #2a2350;',
      '  --dsw-alias-scrollbar-bg-l2: #3a2a3f;',
      '  --dsw-alias-scrollbar-hover-l1: #ff7da8;',
      '  --dsw-alias-scrollbar-hover-l2: #ff6b97;',
      '  --dsw-specific-sidebar-fill: #14121c;',
      '  --dsw-specific-sidebar-nav-item-active: #2a2350;',
      '  --dsw-specific-sidebar-nav-item-active-accent: #ff7da8;',
      '  --dsw-specific-sidebar-nav-item-hover: #201c30;',
      '  --dsw-specific-bubble: #1a1726;',
      '  --dsw-specific-bubble-highlight: #3a2a3f;',
      '  --dsw-specific-input-major: #1a1726;',
      '  --dsw-specific-login-input: #201c30;',
      '  --dsw-specific-menu: #201c30;',
      '  --dsw-specific-selector: #1a1726;',
      '  --dsw-specific-tip: #1a1726;',
      '  --dsw-alias-toast-bg: #2a2350;',
      '  --dsw-alias-tooltip-bg: #2a2350;',
      '  --dsw-alias-tooltip-fg: #fef7ff;',
      '}',

      // ── Extra polish: pink selection, focus ring, links ──
      'body[data-cyrene-skin] ::selection { background: rgba(255, 91, 138, 0.28); }',
      'body[data-cyrene-skin][data-ds-dark-theme] ::selection { background: rgba(255, 125, 168, 0.35); }',
      'body[data-cyrene-skin] :focus-visible { outline: 2px solid #ff5b8a; outline-offset: 1px; }',
      'body[data-cyrene-skin][data-ds-dark-theme] :focus-visible { outline-color: #ff7da8; }',
      'body[data-cyrene-skin] a { color: #e84a78; }',
      'body[data-cyrene-skin][data-ds-dark-theme] a { color: #ff7da8; }',
      'body[data-cyrene-skin] a:hover { color: #c43a64; }',
      'body[data-cyrene-skin][data-ds-dark-theme] a:hover { color: #ffb1cb; }',
    

      // Full-page background gradient — controlled by body[data-cy-grad]
      'body[data-cy-grad] { background: linear-gradient(135deg, #f5f5f7 0%, #ffffff 50%, #fafafc 100%) !important; background-attachment: fixed !important; }',
      'body[data-cy-grad][data-ds-dark-theme] { background: linear-gradient(160deg, #0f0d1f 0%, #181432 40%, #221c46 100%) !important; }',
      'body[data-cy-grad] [id=root] { background: transparent !important; }',
      'body[data-cy-grad][data-ds-dark-theme] [id=root] { background: transparent !important; }',
      // Full-page particle canvas — controlled by body[data-cy-particles]
      'body[data-cy-particles] .cyrene-bg-particles { display: block; }',
      'body:not([data-cy-particles]) .cyrene-bg-particles { display: none; }',
      '.cyrene-bg-particles { position: fixed; inset: 0; z-index: 1; pointer-events: none; }',
      // Pet root (above particles)
      '.cyrene-pet-root { position: fixed; right: 24px; bottom: 20px; z-index: 2147483000; display: flex; flex-direction: column; align-items: center; pointer-events: none; }',
      '.cyrene-pet-canvas-wrap { position: relative; width: 220px; height: 280px; pointer-events: auto; }',
      '.cyrene-pet-canvas { width: 100%; height: 100%; display: block; cursor: grab; }',
      '.cyrene-pet-canvas:active { cursor: grabbing; }',
      // Resize handles — hidden by default, show on wrap hover
      '.cyrene-pet-rz { position: absolute; z-index: 10; pointer-events: auto; opacity: 0; transition: opacity 0.15s; }',
      '.cyrene-pet-canvas-wrap:hover .cyrene-pet-rz, .cyrene-pet-canvas-wrap:active .cyrene-pet-rz { opacity: 1; }',
      '.cyrene-pet-rz-t  { left: 6px; top: -4px; right: 6px; height: 8px; cursor: n-resize; }',
      '.cyrene-pet-rz-b  { left: 6px; bottom: -4px; right: 6px; height: 8px; cursor: s-resize; }',
      '.cyrene-pet-rz-l  { top: 6px; left: -4px; bottom: 6px; width: 8px; cursor: w-resize; }',
      '.cyrene-pet-rz-r  { top: 6px; right: -4px; bottom: 6px; width: 8px; cursor: e-resize; }',
      '.cyrene-pet-rz-tl { top: -5px; left: -5px; width: 12px; height: 12px; cursor: nw-resize; }',
      '.cyrene-pet-rz-tr { top: -5px; right: -5px; width: 12px; height: 12px; cursor: ne-resize; }',
      '.cyrene-pet-rz-bl { bottom: -5px; left: -5px; width: 12px; height: 12px; cursor: sw-resize; }',
      '.cyrene-pet-rz-br { bottom: -5px; right: -5px; width: 12px; height: 12px; cursor: nwse-resize; }',
      '.cyrene-pet-rz-br::after, .cyrene-pet-rz-bl::after, .cyrene-pet-rz-tr::after, .cyrene-pet-rz-tl::after { content: ""; position: absolute; width: 8px; height: 8px; border-color: rgba(255, 125, 168, 0.45); border-style: solid; }',
      '.cyrene-pet-rz-br::after { right: 3px; bottom: 3px; border-width: 0 2px 2px 0; border-radius: 0 0 2px 0; }',
      '.cyrene-pet-rz-bl::after { left: 3px; bottom: 3px; border-width: 0 0 2px 2px; border-radius: 0 0 0 2px; }',
      '.cyrene-pet-rz-tr::after { right: 3px; top: 3px; border-width: 2px 2px 0 0; border-radius: 0 2px 0 0; }',
      '.cyrene-pet-rz-tl::after { left: 3px; top: 3px; border-width: 2px 0 0 2px; border-radius: 2px 0 0 0; }',
      '.cyrene-pet-bubble { background: rgba(255, 255, 255, 0.95); border: 1px solid rgba(255, 91, 138, 0.3); color: #2c2c2e; border-radius: 14px; padding: 6px 12px; font-size: 12px; line-height: 1.4; margin-bottom: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); max-width: 180px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      'body[data-ds-dark-theme] .cyrene-pet-bubble { background: rgba(32, 28, 48, 0.95); color: #fef7ff; border-color: rgba(255, 125, 168, 0.35); }',
      '.cyrene-pet-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: rgba(255, 125, 168, 0.8); font-size: 12px; }',
      '.cyrene-pet-error { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #e5484d; font-size: 11px; padding: 8px; text-align: center; }',
    ].join('\n')

    // ── Script loader ───────────────────────────────────────────────────
    function loadScript(src) {
      return new Promise(function (resolve, reject) {
        var existing = document.querySelector('script[data-cyrene-src="' + src + '"]')
        if (existing) {
          if (existing.dataset.loaded === '1') resolve()
          else existing.addEventListener('load', function () { resolve() })
          return
        }
        var s = document.createElement('script')
        s.src = src
        s.dataset.cyreneSrc = src
        s.onload = function () { s.dataset.loaded = '1'; resolve() }
        s.onerror = function () { reject(new Error('failed to load ' + src)) }
        document.head.appendChild(s)
      })
    }

    // ── Live2D engine ───────────────────────────────────────────────────
    var engine = null // { app, model, pixi, live2d }

    async function initEngine() {
      if (engine) return engine
      // 1. PIXI.js full bundle (CDN) — attaches all @pixi/* to global PIXI
      await loadScript(PIXI_URL)
      // 2. Cubism Core (from plugin assets)
      await loadScript(CUBISM_CORE_URL)
      // 3. pixi-live2d-display cubism4 build (CDN) — attaches PIXI.live2d.Live2DModel
      await loadScript(LIVE2D_URL)
      var pixi = window.PIXI
      if (!pixi) throw new Error('PIXI not available')
      if (!pixi.live2d || !pixi.live2d.Live2DModel) throw new Error('pixi-live2d-display cubism4 not available (PIXI.live2d.Live2DModel missing)')
      return { pixi, live2d: pixi.live2d }
    }

    function apply(ctx) {
      // Inject stylesheet
      ctx.effect(function () {
        if (typeof document === 'undefined') return function () {}
        var tagId = 'cyrene-dsh/pet.css'
        if (document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']')) return function () {}
        var tag = document.createElement('style')
        tag.dataset.plugin = 'cyrene-dsh'
        tag.dataset.pluginCss = tagId
        tag.textContent = CSS
        document.head.appendChild(tag)
        return function () { tag.remove() }
      }, 'cyrene-pet: stylesheet')

      // ── Full-page background particles (Cyrene style) ────────────────
      ctx.effect(function () {
        if (typeof document === 'undefined') return function () {}
        var particleCanvas = document.createElement('canvas')
        particleCanvas.className = 'cyrene-bg-particles'
        particleCanvas.setAttribute('aria-hidden', 'true')
        document.body.appendChild(particleCanvas)
        var ctx2d = particleCanvas.getContext('2d')
        if (!ctx2d) { particleCanvas.remove(); return function () {} }

        var W = 0, H = 0
        var PARTICLE_COUNT = 40
        var particles = []

        function spawnParticle() {
          return {
            x: Math.random() * W, y: Math.random() * H,
            size: 0.6 + Math.random() * 2.4,
            vx: (Math.random() - 0.5) * 0.18,
            vy: -0.05 - Math.random() * 0.22,
            hue: 305 + Math.random() * 40,
            alpha: 0.25 + Math.random() * 0.5,
            twinkle: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.005 + Math.random() * 0.012,
          }
        }

        function resize() {
          var dpr = window.devicePixelRatio || 1
          W = window.innerWidth
          H = window.innerHeight
          particleCanvas.width = W * dpr
          particleCanvas.height = H * dpr
          particleCanvas.style.width = W + 'px'
          particleCanvas.style.height = H + 'px'
          ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
          // Re-spawn particles to fill the new size
          particles = []
          for (var i = 0; i < PARTICLE_COUNT; i++) particles.push(spawnParticle())
        }

        function draw() {
          ctx2d.clearRect(0, 0, W, H)
          for (var i = 0; i < particles.length; i++) {
            var p = particles[i]
            p.x += p.vx; p.y += p.vy; p.twinkle += p.twinkleSpeed
            if (p.y < -10) p.y = H + 10
            if (p.x < -10) p.x = W + 10
            if (p.x > W + 10) p.x = -10
            var flicker = 0.65 + Math.sin(p.twinkle) * 0.35
            var a = p.alpha * flicker
            var r = p.size * 3
            var grad = ctx2d.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
            grad.addColorStop(0, 'hsla(' + p.hue + ', 90%, 80%, ' + a + ')')
            grad.addColorStop(0.5, 'hsla(' + p.hue + ', 90%, 70%, ' + (a * 0.4) + ')')
            grad.addColorStop(1, 'hsla(' + p.hue + ', 90%, 70%, 0)')
            ctx2d.fillStyle = grad
            ctx2d.beginPath()
            ctx2d.arc(p.x, p.y, r, 0, Math.PI * 2)
            ctx2d.fill()
          }
          raf = requestAnimationFrame(draw)
        }

        var raf = 0
        resize()
        window.addEventListener('resize', resize)
        raf = requestAnimationFrame(draw)

        return function () {
          cancelAnimationFrame(raf)
          window.removeEventListener('resize', resize)
          particleCanvas.remove()
        }
      }, 'cyrene-pet: background particles')

      // Load settings and apply body attributes for gradient/particles
      fetch('/api/cyrene/settings').then(function (r) { return r.json() }).then(function (s) {
        if (disposed) return
        petSettings = s
        if (s.gradient) document.body.dataset.cyGrad = ''
        else delete document.body.dataset.cyGrad
        if (s.particles) document.body.dataset.cyParticles = ''
        else delete document.body.dataset.cyParticles
      }).catch(function () {})

      // Mount the pet root onto document.body
      var container = document.createElement('div')
      container.dataset.dshCyrenePet = ''
      document.body.appendChild(container)
      var root = createRoot(container)

      var state = { phase: 'idle', line: undefined, phrase: undefined, sessionActive: false }
      var disposed = false
      var live2dApp = null // { app, model, canvas }
      var lastPhase = 'idle'
      var zoom = 1.0
      var baseScale = 1.0
      var petPos = { right: 24, bottom: 20 }
      var pendingConfig = null
      var petSettings = { particles: true, gradient: true, idleAnim: true, phaseMotions: true, petVisible: true }

      // Load persisted config (position + zoom) on startup.
      function loadConfig() {
        fetch('/api/cyrene/config').then(function (res) {
          if (!res.ok) throw new Error('config ' + res.status)
          return res.json()
        }).then(function (cfg) {
          if (disposed) return
          if (typeof cfg.right === 'number') petPos.right = cfg.right
          if (typeof cfg.bottom === 'number') petPos.bottom = cfg.bottom
          if (typeof cfg.zoom === 'number') {
            if (live2dApp) {
              resizeModel(cfg.zoom)
              render()
            } else {
              pendingConfig = cfg
            }
          } else {
            render()
          }
        }).catch(function () {})
      }

      function poll() {
        if (disposed) return
        fetch(API_STATE).then(function (res) {
          if (!res.ok) throw new Error('state ' + res.status)
          return res.json()
        }).then(function (snapshot) {
          if (disposed) return
          state = snapshot
          render()
          // Play a motion when the phase changes
          if (snapshot.phase !== lastPhase) {
            lastPhase = snapshot.phase
            playPhaseMotion(snapshot.phase)
          }
        }).catch(function () {
          // keep last state on transport error
        })
      }

      // ── Live2D model lifecycle ────────────────────────────────────────
      var modelReady = false
      var modelError = null

      async function setupLive2D(canvas) {
        try {
          var eng = await initEngine()
          var app = new eng.pixi.Application({
            view: canvas,
            width: canvas.clientWidth || 220,
            height: canvas.clientHeight || 280,
            transparent: true,
            backgroundAlpha: 0,
            antialias: true,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
            autoDensity: true,
          })
          var model = await eng.live2d.Live2DModel.from(MODEL_URL, {
            ticker: app.ticker,
            autoHitTest: false,
            autoFocus: false,
          })
          app.stage.addChild(model)
          model.anchor.set(0.5, 0.5)
          var scaleX = (canvas.clientWidth || 220) / model.width
          var scaleY = (canvas.clientHeight || 280) / model.height
          baseScale = Math.min(scaleX, scaleY, 1.0)
          model.scale.set(baseScale * zoom)
          model.x = (canvas.clientWidth || 220) / 2
          model.y = (canvas.clientHeight || 280) / 2
          live2dApp = { app, model, canvas }
          modelReady = true
          modelError = null
          // Apply any pending config from loadConfig
          if (pendingConfig && typeof pendingConfig.zoom === 'number') {
            resizeModel(pendingConfig.zoom)
            pendingConfig = null
          }
          render()
          // Start a random idle motion every 10s via a single setTimeout chain
          function scheduleIdle() {
            if (!live2dApp || !live2dApp.model) return
            playRandomIdle()
            if (!disposed) window.setTimeout(scheduleIdle, 10000 + Math.random() * 5000)
          }
          window.setTimeout(scheduleIdle, 3000)
        } catch (err) {
          console.error('[cyrene-pet] Live2D init failed:', err)
          modelReady = false
          modelError = err instanceof Error ? err.message : String(err)
          render()
        }
      }

      function playPhaseMotion(phase) {
        if (!live2dApp || !live2dApp.model) return
        if (!petSettings.phaseMotions) return
        var motion = PHASE_MOTION[phase]
        if (motion && motion.index >= 0) {
          try {
            // Use FORCE priority to interrupt any current motion immediately
            live2dApp.model.motion(motion.group, motion.index, 3)
          } catch (e) {}
        }
      }

      // ── Idle motion: play a random Tick3 motion at a long interval ─────
      function playRandomIdle() {
        if (!live2dApp || !live2dApp.model) return
        if (!petSettings.idleAnim) return
        var idx = Math.floor(Math.random() * IDLE_MOTIONS.length)
        var m = IDLE_MOTIONS[idx]
        try { live2dApp.model.motion(m.group, m.index, 1) } catch (e) {}
      }

      // ── Drag to reposition + resize from edges ────────────────────────
      var dragState = null
      function onPointerDown(e) {
        if (!live2dApp) return
        var handle = e.currentTarget.dataset.rz
        var rect = e.currentTarget.closest('.cyrene-pet-canvas-wrap').getBoundingClientRect()
        dragState = {
          startX: e.clientX, startY: e.clientY,
          right: petPos.right, bottom: petPos.bottom,
          zoom: zoom, rect: rect,
          handle: handle || null,
          moved: false, startTime: Date.now(),
        }
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      function onPointerMove(e) {
        if (!dragState) return
        var dx = e.clientX - dragState.startX
        var dy = e.clientY - dragState.startY
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.moved = true

        if (dragState.handle) {
          // Resize from edge/corner → adjust zoom
          var h = dragState.handle
          var ddx = 0, ddy = 0
          if (h.indexOf('r') >= 0) ddx = dx
          if (h.indexOf('l') >= 0) ddx = -dx
          if (h.indexOf('b') >= 0) ddy = dy
          if (h.indexOf('t') >= 0) ddy = -dy
          var dist = Math.max(Math.abs(ddx), Math.abs(ddy)) * (h.length === 1 ? 1 : 1.2)
          var sign = (ddx + ddy) >= 0 ? 1 : -1
          var newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, dragState.zoom + sign * dist / 200))
          newZoom = Math.round(newZoom * 10) / 10
          if (newZoom !== zoom) resizeModel(newZoom)
        } else {
          // Body drag → reposition
          petPos.right = Math.max(0, dragState.right - dx)
          petPos.bottom = Math.max(0, dragState.bottom - dy)
          var root = document.querySelector('.cyrene-pet-root')
          if (root) {
            root.style.right = petPos.right + 'px'
            root.style.bottom = petPos.bottom + 'px'
          }
        }
      }
      function onPointerUp(e) {
        if (!dragState) return
        var wasClick = !dragState.moved && (Date.now() - dragState.startTime < 500)
        if (wasClick && !dragState.handle && live2dApp && live2dApp.model) {
          // Click on canvas → random expression
          var expr = RANDOM_EXPRESSIONS[Math.floor(Math.random() * RANDOM_EXPRESSIONS.length)]
          try { live2dApp.model.expression(expr) } catch (e) {}
          clearTimeout(window._cyreneExprTimer)
          window._cyreneExprTimer = setTimeout(function () {
            if (live2dApp && live2dApp.model) try { live2dApp.model.expression('表情回正') } catch (e) {}
          }, 4000)
        } else if (dragState.moved && !dragState.handle) {
          // Drag ended → persist position
          fetch(API_CONFIG, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ right: Math.max(0, petPos.right), bottom: Math.max(0, petPos.bottom) }),
          }).catch(function () {})
        } else if (dragState.moved && dragState.handle) {
          // Resize ended → persist zoom
          commitZoom()
        }
        dragState = null
      }

      // ── Zoom (lightweight drag + commit on pointer up) ────────────────
      function resizeModel(newZoom) {
        // Only update the model and canvas — no React re-render, no persist
        zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom))
        zoom = Math.round(zoom * 10) / 10
        if (live2dApp && live2dApp.model) {
          live2dApp.model.scale.set(baseScale * zoom)
          live2dApp.model.x = Math.round(220 * zoom) / 2
          live2dApp.model.y = Math.round(280 * zoom) / 2
        }
        if (live2dApp && live2dApp.app) {
          live2dApp.app.renderer.resize(Math.round(220 * zoom), Math.round(280 * zoom))
        }
        var wrap = document.querySelector('.cyrene-pet-canvas-wrap')
        if (wrap) {
          wrap.style.width = Math.round(220 * zoom) + 'px'
          wrap.style.height = Math.round(280 * zoom) + 'px'
        }
      }
      function commitZoom() {
        // Persist zoom after drag ends
        fetch(API_CONFIG, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ zoom: zoom }),
        }).catch(function () {})
      }

      var RZ_HANDLES = ['t','b','l','r','tl','tr','bl','br']
      function rzHandle(dir) {
        return React.createElement('div', {
          className: 'cyrene-pet-rz cyrene-pet-rz-' + dir,
          'data-rz': dir,
          onPointerDown: onPointerDown,
          onPointerMove: onPointerMove,
          onPointerUp: onPointerUp,
          onPointerCancel: onPointerUp,
        })
      }

      function render() {
        var phase = state.phase || 'idle'
        var bubbleText = state.phrase || state.line || PHASE_LABEL[phase] || ''
        var bubble = null
        if (bubbleText && phase !== 'idle') {
          bubble = React.createElement('div', { className: 'cyrene-pet-bubble' }, bubbleText)
        }

        var wrapStyle = {
          width: Math.round(220 * zoom) + 'px',
          height: Math.round(280 * zoom) + 'px',
        }

        var canvasWrap
        if (modelError) {
          canvasWrap = React.createElement('div', { className: 'cyrene-pet-canvas-wrap', style: wrapStyle },
            React.createElement('div', { className: 'cyrene-pet-error' }, 'Live2D 加载失败: ' + modelError)
          )
        } else if (!modelReady) {
          canvasWrap = React.createElement('div', { className: 'cyrene-pet-canvas-wrap', style: wrapStyle },
            React.createElement('canvas', { className: 'cyrene-pet-canvas', ref: function (el) { if (el && !live2dApp) setupLive2D(el) } }),
            React.createElement('div', { className: 'cyrene-pet-loading' }, '加载昔涟中…')
          )
        } else {
          canvasWrap = React.createElement('div', {
            className: 'cyrene-pet-canvas-wrap',
            style: wrapStyle,
          },
            // Canvas (with body drag + click)
            React.createElement('canvas', {
              className: 'cyrene-pet-canvas',
              onPointerDown: onPointerDown,
              onPointerMove: onPointerMove,
              onPointerUp: onPointerUp,
              onPointerCancel: onPointerUp,
              ref: function (el) { if (el && live2dApp && live2dApp.canvas !== el) { live2dApp.canvas = el; live2dApp.app.view = el } },
            }),
            // 8 resize handles
            rzHandle('t'), rzHandle('b'), rzHandle('l'), rzHandle('r'),
            rzHandle('tl'), rzHandle('tr'), rzHandle('bl'), rzHandle('br'),
          )
        }

        if (!petSettings.petVisible) {
          root.render(null)
        } else {
          root.render(React.createElement('div', {
            className: 'cyrene-pet-root',
            style: { right: petPos.right + 'px', bottom: petPos.bottom + 'px' },
          }, bubble, canvasWrap))
        }
      }

      // Poll while visible
      var timer = null
      function start() {
        if (timer === null && document.visibilityState === 'visible') {
          timer = window.setInterval(poll, POLL_MS)
        }
      }
      function stop() {
        if (timer !== null) {
          window.clearInterval(timer)
          timer = null
        }
      }
      function onVisibility() {
        if (document.visibilityState === 'visible') { poll(); start() } else { stop() }
      }
      ctx.effect(function () {
        start()
        document.addEventListener('visibilitychange', onVisibility)
        poll()
        loadConfig()

        // Clamp pet position on window resize so it stays within viewport
        function onResize() {
          var wrap = document.querySelector('.cyrene-pet-canvas-wrap')
          if (!wrap) return
          var wrapW = parseFloat(wrap.style.width) || 220
          var wrapH = parseFloat(wrap.style.height) || 280
          var maxRight = Math.max(0, window.innerWidth - wrapW - 10)
          var maxBottom = Math.max(0, window.innerHeight - wrapH - 10)
          petPos.right = Math.min(petPos.right, maxRight)
          petPos.bottom = Math.min(petPos.bottom, maxBottom)
          var root = document.querySelector('.cyrene-pet-root')
          if (root) {
            root.style.right = petPos.right + 'px'
            root.style.bottom = petPos.bottom + 'px'
          }
        }
        window.addEventListener('resize', onResize)

        return function () {
          stop()
          document.removeEventListener('visibilitychange', onVisibility)
          window.removeEventListener('resize', onResize)
        }
      }, 'cyrene-pet: poll')

      // ── Settings card in WebUI plugin config section (collapsible) ────
      ctx.effect(function () {
        var slots = ctx.get('slots')
        if (!slots) return function () {}

        var settingsState = { particles: true, gradient: true, idleAnim: true, phaseMotions: true, petVisible: true }
        var dirty = false
        var fontName = null
        var fileInputRef = null

        function applyFont(font) {
          if (!font || !font.fileName) return
          var styleId = 'cyrene-custom-font'
          var existing = document.getElementById(styleId)
          if (existing) existing.remove()
          var ext = font.fileName.split('.').pop().toLowerCase()
          var format = ext === 'otf' ? 'opentype' : 'truetype'
          var style = document.createElement('style')
          style.id = styleId
          style.textContent = "@font-face { font-family: 'CyreneCustom'; src: url('/cyrene/" + font.fileName + "') format('" + format + "'); font-display: swap; }"
          document.head.appendChild(style)
          document.documentElement.style.setProperty('--dsw-font-family', "'CyreneCustom', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif")
        }

        function resetFont() {
          var existing = document.getElementById('cyrene-custom-font')
          if (existing) existing.remove()
          document.documentElement.style.removeProperty('--dsw-font-family')
        }

        // Load current font on startup
        fetch('/api/cyrene/font').then(function (r) { return r.json() }).then(function (f) {
          if (f && f.fileName) { applyFont(f); fontName = f.displayName }
        }).catch(function () {})

        function applySettings(s) {
          settingsState = s
          petSettings = s
          if (typeof document === 'undefined') return
          if (s.gradient) document.body.dataset.cyGrad = ''
          else delete document.body.dataset.cyGrad
          if (s.particles) document.body.dataset.cyParticles = ''
          else delete document.body.dataset.cyParticles
        }

        function loadSettings() {
          fetch('/api/cyrene/settings').then(function (r) { return r.json() }).then(function (s) {
            applySettings(s)
          }).catch(function () {})
        }
        loadSettings()

        function saveAll() {
          fetch('/api/cyrene/settings', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(settingsState),
          }).then(function (r) { return r.json() }).then(function (res) {
            if (res.ok) { applySettings(res.settings); dirty = false }
          }).catch(function () {})
        }

        function setField(key, value) {
          settingsState[key] = value
          dirty = true
        }

        // Toggle row (staged edit, not immediate save)
        function Toggle(props) {
          return React.createElement('label', {
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--dsw-alias-border-l2)', cursor: 'pointer' },
          },
            React.createElement('span', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-primary)' } }, props.label),
            React.createElement('input', {
              type: 'checkbox',
              checked: settingsState[props.keyName],
              onChange: function (e) { setField(props.keyName, e.target.checked) },
              style: { accentColor: 'var(--dsw-alias-brand-primary, #ff5b8a)' },
            })
          )
        }

        // Settings page (rendered in the settings sidebar nav)
        function CyrenePetCard() {
          return React.createElement('div', { style: { padding: '20px 24px' } },
            React.createElement('h2', { style: { fontSize: '18px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)', margin: '0 0 4px' } }, '昔涟'),
            React.createElement('p', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-tertiary)', margin: '0 0 16px' } }, '主题、粒子、桌宠与字体设置'),
            React.createElement('div', { style: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: '12px', padding: '0 16px' } },
              React.createElement(Toggle, { keyName: 'particles', label: '粒子效果' }),
              React.createElement(Toggle, { keyName: 'gradient', label: '背景渐变' }),
              React.createElement(Toggle, { keyName: 'idleAnim', label: '待机动画' }),
              React.createElement(Toggle, { keyName: 'phaseMotions', label: '阶段动作' }),
              React.createElement(Toggle, { keyName: 'petVisible', label: '显示桌宠' }),
              // Font section
              React.createElement('div', { style: { borderTop: '1px solid var(--dsw-alias-border-l2)', margin: '10px 0', padding: '10px 0' } },
                React.createElement('div', { style: { fontSize: '13px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)', marginBottom: '6px' } }, '自定义字体'),
                React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)', marginBottom: '8px' } }, '当前: ' + (fontName || '系统默认')),
                React.createElement('input', {
                  type: 'file', accept: '.ttf,.otf',
                  ref: function (el) { fileInputRef = el },
                  style: { display: 'none' },
                  onChange: function (e) {
                    var file = e.target.files && e.target.files[0]
                    if (!file) return
                    var reader = new FileReader()
                    reader.onload = function () {
                      var base64 = reader.result.split(',')[1]
                      fetch('/api/cyrene/font', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ name: file.name, data: base64, displayName: file.name.replace(/\.(ttf|otf)$/i, '') }),
                      }).then(function (r) { return r.json() }).then(function (res) {
                        if (res.ok) { applyFont(res.font); fontName = res.font.displayName }
                      }).catch(function () {})
                    }
                    reader.readAsDataURL(file)
                  },
                }),
                React.createElement('div', { style: { display: 'flex', gap: '6px' } },
                  React.createElement('button', {
                    type: 'button',
                    onClick: function () { if (fileInputRef) fileInputRef.click() },
                    style: { border: '1px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-primary)', background: 'transparent', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' },
                  }, '导入字体'),
                  React.createElement('button', {
                    type: 'button',
                    onClick: function () {
                      fetch('/api/cyrene/font/reset', { method: 'POST' }).then(function () {
                        resetFont(); fontName = null
                      }).catch(function () {})
                    },
                    style: { border: '1px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-secondary)', background: 'transparent', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' },
                  }, '恢复默认'),
                ),
              ),
            ),
            React.createElement('div', {
              style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' },
            },
              React.createElement('button', {
                type: 'button',
                onClick: function () { loadSettings(); dirty = false },
                disabled: !dirty,
                style: { border: '1px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-secondary)', background: 'transparent', borderRadius: '8px', padding: '5px 14px', fontSize: '13px', cursor: 'pointer' },
              }, '放弃'),
              React.createElement('button', {
                type: 'button',
                onClick: saveAll,
                disabled: !dirty,
                style: { border: 'none', background: 'var(--dsw-alias-label-primary)', color: 'var(--dsw-alias-bg-layer-3)', borderRadius: '8px', padding: '5px 14px', fontSize: '13px', cursor: 'pointer' },
              }, '保存'),
            ),
          )
        }

        var unregister = slots.register({
          name: 'settings.section',
          id: 'cyrene-pet',
          order: 140,
          label: '昔涟',
        }, CyrenePetCard)

        return function () { unregister() }
      }, 'cyrene-pet: settings card')

      // Cleanup on plugin stop
      ctx.effect(function () {
        return function () {
          disposed = true
          stop()
          if (live2dApp && live2dApp.app) {
            try { live2dApp.app.destroy(true, { children: true, texture: true }) } catch (e) {}
          }
          root.unmount()
          container.remove()
        }
      }, 'cyrene-pet: dispose')
    }

    exports.apply = apply
    return module.exports
  },
})
