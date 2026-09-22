function buildRecentlyViewedTrackerScript() {
  return `<script>
(function() {
  var productId = document.body.getAttribute("data-current-product-id") || document.querySelector("[data-current-product-id]")?.getAttribute("data-current-product-id");
  if (!productId) return;
  var key = "recently_viewed_products";
  var stored = JSON.parse(localStorage.getItem(key) || "[]");
  stored = stored.filter(function(id) { return id !== productId; });
  stored.unshift(productId);
  stored = stored.slice(0, 10);
  localStorage.setItem(key, JSON.stringify(stored));
})();
</script>`;
}
module.exports = { buildRecentlyViewedTrackerScript };
