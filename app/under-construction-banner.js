// Shared across every app/*.html page (plain script, not a module, so it can run
// before anything else and doesn't need an import) — one edit here updates the
// notice everywhere instead of touching 8 files individually.
(function () {
  var banner = document.createElement('div');
  banner.className = 'construction-banner';
  banner.textContent = '🚧 אתר זה בבנייה — עדיין לא ניתן לבצע הזמנות';
  document.body.insertBefore(banner, document.body.firstChild);
})();
