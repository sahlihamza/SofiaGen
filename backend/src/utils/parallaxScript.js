function buildParallaxScript() {
  return `<script>
(function() {
  var elements = Array.from(document.querySelectorAll("[data-parallax]"));
  if (!elements.length) return;
  var ticking = false;
  function update() {
    var scrollY = window.scrollY;
    elements.forEach(function(el) {
      var intensity = parseInt(el.getAttribute("data-parallax"), 10) || 0;
      var rect = el.getBoundingClientRect();
      var offset = (scrollY - (el.offsetTop - window.innerHeight)) * (intensity / 100) * 0.3;
      el.style.backgroundPositionY = offset + "px";
    });
    ticking = false;
  }
  window.addEventListener("scroll", function() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  update();
})();
</script>`;
}

module.exports = { buildParallaxScript };
