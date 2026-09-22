function buildProductTabsScript() {
  return `<script>
(function() {
  document.addEventListener('click', function(event) {
    var tabBtn = event.target.closest('.product-tab-btn');
    if (!tabBtn) return;

    var root = tabBtn.closest('.product-tabs-component');
    if (!root) return;

    var tabId = tabBtn.getAttribute('data-tab');
    if (!tabId) return;

    root.querySelectorAll('.product-tab-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn === tabBtn);
      btn.setAttribute('aria-selected', btn === tabBtn ? 'true' : 'false');
    });

    root.querySelectorAll('.product-tab-panel').forEach(function(panel) {
      var isActive = panel.getAttribute('data-panel') === tabId;
      panel.classList.toggle('active', isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
  });
})();
</script>`;
}

module.exports = { buildProductTabsScript };
