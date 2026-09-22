function buildClickEffectScript() {
  return `<script>
(function() {
  document.querySelectorAll("[data-click-effect]").forEach(function(el) {
    var effect = el.getAttribute("data-click-effect");
    el.addEventListener("click", function(e) {
      if (effect === "pulse") {
        el.classList.remove("click-pulse-active");
        void el.offsetWidth;
        el.classList.add("click-pulse-active");
      } else if (effect === "shake") {
        el.classList.remove("click-shake-active");
        void el.offsetWidth;
        el.classList.add("click-shake-active");
      } else if (effect === "ripple") {
        el.classList.add("click-ripple");
        var rect = el.getBoundingClientRect();
        var ripple = document.createElement("span");
        ripple.className = "click-ripple-effect";
        ripple.style.left = (e.clientX - rect.left) + "px";
        ripple.style.top = (e.clientY - rect.top) + "px";
        ripple.style.width = ripple.style.height = Math.max(rect.width, rect.height) + "px";
        el.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 600);
      }
    });
  });
})();
</script>`;
}

module.exports = { buildClickEffectScript };
