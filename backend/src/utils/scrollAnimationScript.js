function buildScrollAnimationScript() {
  return `<script>
(function() {
  function animateCounter(el) {
    const target = parseFloat(el.getAttribute("data-counter-target")) || 0;
    const duration = parseInt(el.getAttribute("data-counter-duration"), 10) || 2000;
    const suffix = el.getAttribute("data-counter-suffix") || "";
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.getAttribute("data-scroll-delay");
        if (delay) {
          setTimeout(() => entry.target.classList.add("in-view"), parseInt(delay, 10));
        } else {
          entry.target.classList.add("in-view");
        }
        if (entry.target.hasAttribute("data-counter-target")) {
          animateCounter(entry.target);
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll("[data-scroll-animation]").forEach(el => observer.observe(el));
  document.querySelectorAll("[data-counter-target]").forEach(el => observer.observe(el));
})();
</script>`;
}

module.exports = { buildScrollAnimationScript };
