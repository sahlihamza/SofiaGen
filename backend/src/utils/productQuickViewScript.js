function buildProductQuickViewScript(currency = { isoCode: "USD", decimalDigits: 2, locale: "en-US" }) {
  return `
<script>
(function() {
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function formatMoney(amount, currency) {
    const isoCode = currency?.isoCode || "USD";
    const locale = currency?.locale || "en-US";
    const decimalDigits = currency?.decimalDigits ?? 2;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: isoCode,
      minimumFractionDigits: decimalDigits,
      maximumFractionDigits: decimalDigits,
    }).format(Number(amount) || 0);
  }

  function renderProductModal(productId) {
    if (!productId) return;
    fetch('/api/products/' + encodeURIComponent(productId))
      .then(function(res) { return res.json().catch(function() { return {}; }); })
      .then(function(response) {
        var product = response && response.data ? response.data : response;
        if (!product || !product._id) return;

        var modal = document.getElementById('quick-view-modal-root');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'quick-view-modal-root';
          document.body.appendChild(modal);
        }

        var primaryImg = (product.productGallery && product.productGallery.find(function(g) { return g.isPrimary; }) && product.productGallery.find(function(g) { return g.isPrimary; }).image) || (product.productGallery && product.productGallery[0] && product.productGallery[0].image) || '';
        var price = product.salePrice || product.regularPrice || 0;
        var currency = ${JSON.stringify(currency)};

        modal.innerHTML = '<div class="quick-view-modal open" id="qv-modal">' +
          '<button class="quick-view-close" id="qv-close" type="button">&times;</button>' +
          '<div class="quick-view-content">' +
            '<div class="quick-view-image"><img src="' + primaryImg + '" alt="' + (product.productName || '') + '" /></div>' +
            '<div class="quick-view-details">' +
              '<h2 class="quick-view-title">' + (product.productName || '') + '</h2>' +
              '<div class="quick-view-price">' + formatMoney(price, currency) + '</div>' +
              '<p class="quick-view-desc">' + (product.shortDescription || product.description || '') + '</p>' +
              '<button class="quick-view-add-btn" data-product-id="' + (product._id || productId) + '">Ajouter au panier</button>' +
            '</div>' +
          '</div>' +
        '</div>';

        var qvModal = modal.querySelector('#qv-modal');
        if (qvModal) openModal(qvModal);
      })
      .catch(function() {});
  }

  document.addEventListener('click', function(event) {
    var trigger = event.target.closest('.quick-view-btn');
    if (trigger) {
      var productId = trigger.getAttribute('data-product-id');
      if (productId) renderProductModal(productId);
      return;
    }

    var closeBtn = event.target.closest('.qv-close');
    if (closeBtn) {
      var modal = closeBtn.closest('.quick-view-modal');
      if (modal) closeModal(modal);
      return;
    }

    var overlay = event.target.closest('#qv-modal');
    if (overlay) {
      closeModal(overlay);
    }
  });
})();
</script>`;
}

module.exports = { buildProductQuickViewScript };
