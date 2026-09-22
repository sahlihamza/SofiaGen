function buildSalesCountdownScript() {
  return `<script>
(function() {
  document.querySelectorAll(".sales-countdown[data-target-date]").forEach(function(el) {
    var target = new Date(el.getAttribute("data-target-date")).getTime();
    var onExpire = el.getAttribute("data-on-expire") || "message";
    var expiredMsg = el.getAttribute("data-expired-message") || "Offre terminé";

    function tick() {
      var now = Date.now();
      var diff = target - now;
      if (diff <= 0) {
        if (onExpire === "hide") { el.style.display = "none"; }
        else { el.innerHTML = '<p class="countdown-expired">' + expiredMsg + '</p>'; }
        clearInterval(interval);
        return;
      }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      var values = el.querySelectorAll(".countdown-value");
      if (values[0]) values[0].textContent = String(d).padStart(2, "0");
      if (values[1]) values[1].textContent = String(h).padStart(2, "0");
      if (values[2]) values[2].textContent = String(m).padStart(2, "0");
      if (values[3]) values[3].textContent = String(s).padStart(2, "0");
    }
    tick();
    var interval = setInterval(tick, 1000);
  });
})();
</script>`;
}
module.exports = { buildSalesCountdownScript };
