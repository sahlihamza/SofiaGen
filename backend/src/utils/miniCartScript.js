function buildMiniCartScript() {
  return `<script>
(function() {
  var drawer = document.querySelector('.mini-cart-drawer');
  var overlay = document.querySelector('.mini-cart-overlay');
  var body = document.body;

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    if (body) body.classList.add('mini-cart-open');
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (body) body.classList.remove('mini-cart-open');
  }

  document.addEventListener('click', function(event) {
    if (event.target.closest('.mini-cart-icon')) {
      openDrawer();
      return;
    }

    if (event.target.closest('.mini-cart-close') || event.target.closest('.mini-cart-overlay')) {
      closeDrawer();
    }
  });

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeDrawer();
    }
  });
})();
</script>`;
}

module.exports = { buildMiniCartScript };
