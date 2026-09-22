function buildCookieBannerScript() {
  return `
<script>
(function() {
  try {
    var banner = document.querySelector('.cookie-banner-container');
    if (!banner) return;
    if (localStorage.getItem('cookie_consent')) return;
    banner.style.display = 'flex';
    var acceptBtn = banner.querySelector('[data-cookie-accept]');
    var declineBtn = banner.querySelector('[data-cookie-decline]');
    if (acceptBtn) acceptBtn.addEventListener('click', function() {
      localStorage.setItem('cookie_consent', 'accepted');
      banner.style.display = 'none';
    });
    if (declineBtn) declineBtn.addEventListener('click', function() {
      localStorage.setItem('cookie_consent', 'declined');
      banner.style.display = 'none';
    });
  } catch (e) {
    console.debug('cookieBannerScript error', e);
  }
})();
</script>`;
}

module.exports = { buildCookieBannerScript };