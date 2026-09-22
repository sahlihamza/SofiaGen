function buildStorefrontScriptsBundle(options = {}) {
  const parts = [];

  if (options.includeAccordion) {
    parts.push(`
(function(){
  document.addEventListener('click', function(event){
    var header = event.target.closest('.accordion-header');
    if (!header) return;
    var item = header.closest('.accordion-item');
    if (!item) return;
    event.preventDefault();
    var root = item.closest('.accordion-component');
    var multiple = root && root.getAttribute('data-multiple-open') === 'true';
    if (!multiple) {
      root && root.querySelectorAll('.accordion-item.open').forEach(function(openItem){
        if (openItem !== item) {
          openItem.classList.remove('open');
          var openHeader = openItem.querySelector('.accordion-header');
          var openBody = openItem.querySelector('.accordion-body');
          if (openHeader) openHeader.setAttribute('aria-expanded','false');
          if (openBody) openBody.setAttribute('aria-hidden','true');
        }
      });
    }
    var isOpen = item.classList.toggle('open');
    var headerEl = item.querySelector('.accordion-header');
    var bodyEl = item.querySelector('.accordion-body');
    if (headerEl) headerEl.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (bodyEl) bodyEl.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  });
})();`);
  }

  if (options.includeTabs) {
    parts.push(`
(function(){
  document.addEventListener('click', function(event){
    var btn = event.target.closest('.tab-btn');
    if (!btn) return;
    var root = btn.closest('.tabs-component');
    if (!root) return;
    var targetIdx = btn.getAttribute('data-tab-target');
    if (!targetIdx) return;
    var rootId = btn.getAttribute('data-tabs-root');
    var activeBtnSelector = '.tab-btn[data-tabs-root="' + rootId + '"]';
    var activePanelSelector = '.tab-panel[data-tabs-root="' + rootId + '"][data-tab-panel="' + targetIdx + '"]';
    root.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
    root.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
    btn.classList.add('active');
    var panel = root.querySelector(activePanelSelector);
    if (panel) panel.classList.add('active');
  });
})();`);
  }

  if (options.includePopup) {
    parts.push(`
(function(){
  var focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var activeTrap = null;
  function trapFocus(container){
    if (!container) return;
    var focusable = Array.from(container.querySelectorAll(focusableSelector)).filter(function(el){ return !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'; });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    container.addEventListener('keydown', function(event){
      if (event.key !== 'Tab') return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    activeTrap = container;
    first.focus();
  }
  document.addEventListener('click', function(event){
    var trigger = event.target.closest('[data-popup-open]');
    if (!trigger) return;
    var popup = document.querySelector('.popup-container[data-popup-id="' + trigger.getAttribute('data-popup-open') + '"]');
    if (!popup) return;
    popup.style.display='flex';
    popup.setAttribute('role','dialog');
    popup.setAttribute('aria-modal','true');
    trapFocus(popup);
  });
})();`);
  }

  if (options.includeContactForm) {
    parts.push(`
(function(){
  document.addEventListener('submit', function(event){
    var form = event.target.closest('.contact-form');
    if (!form) return;
    event.preventDefault();
    var fields = {};
    form.querySelectorAll('input, textarea, select').forEach(function(field){ if (field.name) fields[field.name] = field.value.trim(); });
    fetch('/api/contact/submit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(fields) }).then(function(res){ if (!res.ok) throw new Error('Submit failed'); return res.json(); }).then(function(){ form.reset(); var message = form.querySelector('.contact-message'); if (message) { message.textContent = 'Message sent successfully!'; message.setAttribute('aria-live','polite'); } }).catch(function(){ var message = form.querySelector('.contact-message'); if (message) { message.textContent = 'Failed to send message. Please try again.'; message.setAttribute('aria-live','assertive'); } });
  });
})();`);
  }

  if (options.includeCookieBanner) {
    parts.push(`
(function(){
  var banner = document.querySelector('.cookie-banner-container');
  if (banner) banner.setAttribute('role','status');
})();`);
  }

  if (options.includeScrollAnimation) {
    parts.push(`
(function(){
  document.querySelectorAll('[data-scroll-animation]').forEach(function(el){
    el.setAttribute('data-animated','true');
  });
})();`);
  }

  const scriptBody = parts.filter(Boolean).join('\n');
  return scriptBody ? `<script>${scriptBody}</script>` : "";
}

module.exports = { buildStorefrontScriptsBundle };
