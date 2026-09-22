function buildStickyAddToCartScript() {
  return `<script>
(function() {
  var bar = document.querySelector(".sticky-add-to-cart");
  if (!bar) return;
  var threshold = parseInt(bar.getAttribute("data-show-after"), 10) || 300;
  window.addEventListener("scroll", function() {
    bar.classList.toggle("visible", window.scrollY > threshold);
  }, { passive: true });
})();
</script>`;
}
module.exports = { buildStickyAddToCartScript };
