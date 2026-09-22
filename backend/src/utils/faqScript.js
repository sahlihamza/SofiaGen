function buildFaqScript() {
  return `
<script>
(function() {
  document.addEventListener('click', function(event) {
    var question = event.target.closest('.faq-question');
    if (!question) return;

    var item = question.closest('.faq-item');
    if (!item) return;

    item.classList.toggle('open');
  });
})();
</script>`;
}

module.exports = { buildFaqScript };
