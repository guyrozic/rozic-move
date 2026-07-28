// Shared across every app/*.html page (plain script, not a module, so it can run
// before anything else and doesn't need an import) — one edit here updates the
// notice everywhere instead of touching 8 files individually.
(function () {
  var banner = document.createElement('div');
  banner.className = 'construction-banner';
  banner.textContent = '🚀 האתר בהרצה — הצטרפו לראשונים שמזמינים דרכו!';
  document.body.insertBefore(banner, document.body.firstChild);
  // index.html's nav is position:fixed (unlike app/'s sticky topbar, which
  // already flows naturally below the banner) — without this it would sit
  // pinned at the very top, painted over the banner instead of below it.
  document.documentElement.style.setProperty('--banner-h', banner.offsetHeight + 'px');
})();
