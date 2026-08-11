/*
 * Registers the offline worker and shows the student when they are working
 * from the saved copy.
 *
 * Deliberately quiet: no prompt, no permission request, nothing to click. The
 * site simply keeps working when the connection stops, and says so.
 *
 * Service workers are unavailable on file:// URLs, so opening the folder
 * directly still works — it just has no offline layer, which it does not need.
 */
(function () {
  const supported = 'serviceWorker' in navigator && location.protocol.indexOf('http') === 0;

  if (supported) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {
        // Offline support is an enhancement; the site works regardless.
      });
    });
  }

  // ---- offline indicator ----

  let badge = null;

  function ensureBadge() {
    if (badge) return badge;
    badge = document.createElement('div');
    badge.className = 'offline-badge';
    badge.setAttribute('role', 'status');
    badge.textContent = 'Offline — using your saved copy';
    document.body.appendChild(badge);
    return badge;
  }

  function update() {
    if (navigator.onLine) {
      if (badge) badge.classList.remove('is-visible');
      return;
    }
    ensureBadge().classList.add('is-visible');
  }

  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  window.addEventListener('load', update);
})();
