function buildTabsScript() {
  return `
<script>
(function() {
  document.addEventListener('click', function(event) {
    var btn = event.target.closest('.tab-btn');
    if (!btn) return;

    var root = btn.closest('.tabs-component');
    if (!root) return;

    var targetIdx = btn.getAttribute('data-tab-target');
    if (!targetIdx) return;

    var rootId = btn.getAttribute('data-tabs-root');
    var activeBtnSelector = '.tab-btn[data-tabs-root="' + rootId + '"]';
    var activePanelSelector = '.tab-panel[data-tabs-root="' + rootId + '"][data-tab-panel="' + targetIdx + '"]';

    root.querySelectorAll('.tab-btn').forEach(function(b) {
      b.classList.remove('active');
    });
    root.querySelectorAll('.tab-panel').forEach(function(p) {
      p.classList.remove('active');
    });

    btn.classList.add('active');
    var panel = root.querySelector(activePanelSelector);
    if (panel) panel.classList.add('active');
  });
})();
</script>`;
}

module.exports = { buildTabsScript };
