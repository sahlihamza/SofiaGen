function buildAccordionScript() {
  return `
<script>
(function() {
  function updateAccordionState(item) {
    var root = item.closest('.accordion-component');
    if (!root) return;

    var multiple = root.getAttribute('data-multiple-open') === 'true';
    if (!multiple) {
      root.querySelectorAll('.accordion-item.open').forEach(function(openItem) {
        if (openItem !== item) {
          openItem.classList.remove('open');
          var openHeader = openItem.querySelector('.accordion-header');
          var openBody = openItem.querySelector('.accordion-body');
          if (openHeader) openHeader.setAttribute('aria-expanded', 'false');
          if (openBody) openBody.setAttribute('aria-hidden', 'true');
        }
      });
    }

    var isOpen = item.classList.toggle('open');
    var header = item.querySelector('.accordion-header');
    var body = item.querySelector('.accordion-body');
    if (header) header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (body) body.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }

  document.addEventListener('click', function(event) {
    var header = event.target.closest('.accordion-header');
    if (!header) return;

    var item = header.closest('.accordion-item');
    if (!item) return;

    event.preventDefault();
    updateAccordionState(item);
  });
})();
</script>`;
}

module.exports = { buildAccordionScript };