function buildWishlistButtonScript() {
  return `
<script>
(function() {
  document.addEventListener('click', function(event) {
    var btn = event.target.closest('.wishlist-button-component');
    if (!btn) return;

    var isActive = btn.classList.toggle('active');
    if (isActive) {
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.setAttribute('aria-pressed', 'false');
    }
  });
})();
</script>`;
}

module.exports = { buildWishlistButtonScript };
