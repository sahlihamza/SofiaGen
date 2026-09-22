function buildCartPageScript() {
  return `<script>
(function() {
  document.addEventListener('click', function(event) {
    var removeBtn = event.target.closest('.cart-remove-btn');
    if (!removeBtn) return;

    var root = removeBtn.closest('.cart-page-component');
    if (!root) return;

    var itemId = removeBtn.getAttribute('data-item-id');
    if (!itemId) return;

    event.preventDefault();

    fetch('/api/cart/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: itemId })
    }).then(function(res) {
      if (!res.ok) throw new Error('Failed to remove item');
      return res.json();
    }).then(function() {
      var item = removeBtn.closest('.cart-item');
      if (item) item.remove();
    }).catch(function() {
      // Optionally show error state
    });
  });

  document.addEventListener('change', function(event) {
    var input = event.target.closest('.cart-qty-input');
    if (!input) return;

    var root = input.closest('.cart-page-component');
    if (!root) return;

    var itemId = input.getAttribute('data-item-id');
    if (!itemId) return;

    var qty = parseInt(input.value, 10);
    if (isNaN(qty) || qty < 1) return;

    fetch('/api/cart/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: itemId, quantity: qty })
    }).catch(function() {
      // Optionally show error state
    });
  });
})();
</script>`;
}

module.exports = { buildCartPageScript };
