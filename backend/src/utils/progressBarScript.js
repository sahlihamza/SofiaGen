function buildProgressBarScript() {
  return `
<script>
(function() {
  function animateBar(el) {
    var targetWidth = el.getAttribute('data-progress-width');
    if (!targetWidth) return;

    el.style.width = targetWidth;
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        animateBar(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.progress-bar-component').forEach(function(el) {
    observer.observe(el);
  });
})();
</script>`;
}

module.exports = { buildProgressBarScript };
