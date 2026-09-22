function buildPopupTriggerScript() {
  return `
<script>
(function() {
  var popups = document.querySelectorAll('.popup-container[data-popup-id]');
  popups.forEach(function(popup) {
    var id = popup.getAttribute('data-popup-id');
    var trigger = popup.getAttribute('data-trigger') || 'page-load';
    var triggerValue = parseFloat(popup.getAttribute('data-trigger-value') || '0');
    var frequency = popup.getAttribute('data-frequency') || 'once-per-session';

    var storageKey = 'popup_shown_' + id;
    var alreadyShown = frequency === 'once-per-session'
      ? sessionStorage.getItem(storageKey)
      : frequency === 'once-per-visitor'
        ? localStorage.getItem(storageKey)
        : null;

    if (alreadyShown) return;

    function showPopup() {
      popup.style.display = 'flex';
      if (frequency === 'once-per-session') sessionStorage.setItem(storageKey, '1');
      if (frequency === 'once-per-visitor') localStorage.setItem(storageKey, '1');
    }

    var closeBtn = popup.querySelector('[data-popup-close]');
    if (closeBtn) closeBtn.addEventListener('click', function() {
      popup.style.display = 'none';
    });

    if (trigger === 'page-load') {
      showPopup();
    } else if (trigger === 'delay') {
      setTimeout(showPopup, Math.max(0, triggerValue));
    } else if (trigger === 'scroll-percentage') {
      var triggered = false;
      window.addEventListener('scroll', function() {
        if (triggered) return;
        var scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        if (scrolled >= triggerValue) {
          triggered = true;
          showPopup();
        }
      });
    } else if (trigger === 'exit-intent') {
      var triggered = false;
      document.addEventListener('mouseleave', function(e) {
        if (triggered) return;
        if (e.clientY <= 0) {
          triggered = true;
          showPopup();
        }
      });
    }

  });

  window.__openPopup = function(id) {
    var el = document.querySelector('.popup-container[data-popup-id="' + id + '"]');
    if (el) el.style.display = 'flex';
  };
})();
</script>`;
}

module.exports = { buildPopupTriggerScript };