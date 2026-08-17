/**
 * 昔涟 (Cyrene) pearl-white skin — Browser half.
 *
 * Maps Cyrene-Agent's white + pink palette onto the DSH web GUI design tokens.
 * Uses the proven dsh-web-ui skin pattern (whale-mom etc.): a body-scoped
 * stylesheet that overrides the --dsw-* design tokens directly, so the skin
 * works regardless of the theme presenter. The palette comes from
 * Cyrene-Agent's src/renderer/ui/theme.css `[data-ui-theme="pearl-white"]`.
 *
 *   Surfaces:  #ffffff / #f5f5f7 / #fafafc
 *   Text:      #1d1d1f (strong) / #2c2c2e (default) / #4f4a57 (muted)
 *   Borders:   #e5e5ea / #d2d2d7
 *   Pink:      #ff5b8a (500) / #ff7da8 (300) / #e84a78 (600) / #ffd6e4 (100)
 *
 * The dark scheme keeps the pink accent on a deep plum-navy base so the skin
 * stays legible in both palettes.
 *
 * Plain JS ONLY: no import, no JSX. Registers via window.__ModuleLoader__.
 */
window.__ModuleLoader__.load({
  id: '@dsh-local/cyrene-skin',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    // ── Cyrene pearl-white palette ──────────────────────────────────────
    // The stylesheet is scoped on body[data-cyrene-skin] and overrides the
    // DSH design tokens directly. Light scheme = pure white + pink accent;
    // dark scheme = deep plum-navy + brighter pink.
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
    ].join('\n')

    function apply(ctx) {
      // Set the body scope attribute so the stylesheet applies.
      ctx.effect(function () {
        if (typeof document === 'undefined') return function () {}
        document.body.dataset.cyreneSkin = ''
        return function () { delete document.body.dataset.cyreneSkin }
      }, 'cyrene-skin: body scope')

      // Inject the stylesheet (deduped by data-plugin-css; removed on unload).
      ctx.effect(function () {
        if (typeof document === 'undefined') return function () {}
        var tagId = '@dsh-local/cyrene-skin/theme.css'
        if (document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']')) return function () {}
        var tag = document.createElement('style')
        tag.dataset.plugin = '@dsh-local/cyrene-skin'
        tag.dataset.pluginCss = tagId
        tag.textContent = CSS
        document.head.appendChild(tag)
        return function () { tag.remove() }
      }, 'cyrene-skin: stylesheet')

      // Also try the theme service override layer (best-effort; the CSS above
      // is the reliable path).
      var theme = ctx.get('theme')
      if (theme !== undefined) {
        ctx.effect(function () {
          return theme.overrideTokens('cyrene-skin', {
            '--dsw-alias-brand-primary': { light: '#ff5b8a', dark: '#ff7da8' },
            '--dsw-alias-bg-base': { light: '#ffffff', dark: '#14121c' },
            '--dsw-alias-label-primary': { light: '#1d1d1f', dark: '#fef7ff' },
            '--dsw-alias-label-secondary': { light: '#4f4a57', dark: '#a094c1' },
          })
        }, 'cyrene-skin: tokens')
      }
    }

    exports.apply = apply
    return module.exports
  },
})
