function buildAlertScript() {
  return `
<script>
(function() {
  document.addEventListener('click', function(event) {
    var closeBtn = event.target.closest('.alert-close');
    if (!closeBtn) return;

    var alert = closeBtn.closest('.alert-component');
    if (!alert) return;

    alert.style.display = 'none';
  });
})();
</script>`;
}

module.exports = { buildAlertScript };
