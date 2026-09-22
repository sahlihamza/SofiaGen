function buildWishlistPageScript() {
  return `<script>
(function() {
  document.addEventListener('click', function(event) {
    var btn = event.target.closest('.wishlist-remove-btn');
    if (!btn) return;

    var root = btn.closest('.wishlist-page-component');
    if (!root) return;

    var itemId = btn.getAttribute('data-item-id');
    if (!itemId) return;

    event.preventDefault();

    fetch('/api/wishlist/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: itemId })
    }).then(function(res) {
      if (!res.ok) throw new Error('Failed to remove item');
      return res.json();
    }).then(function() {
      var item = btn.closest('.wishlist-item');
      if (item) item.remove();
    }).catch(function() {
      // Optionally show error state
    });
  });
})();
</script>`;
}

module.exports = { buildWishlistPageScript };
