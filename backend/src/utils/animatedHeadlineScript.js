function buildAnimatedHeadlineScript() {
  return `
<script>
(function() {
  document.querySelectorAll('.animated-headline-component').forEach(function(root) {
    var wordsWrap = root.querySelector('.animated-headline-words');
    if (!wordsWrap) return;

    var words = Array.from(wordsWrap.querySelectorAll('.animated-headline-word'));
    if (words.length <= 1) return;

    var interval = parseInt(root.getAttribute('data-headline-interval'), 10) || 3000;
    var current = 0;

    words.forEach(function(w) { w.classList.remove('active'); });
    if (words[0]) words[0].classList.add('active');

    setInterval(function() {
      words[current].classList.remove('active');
      current = (current + 1) % words.length;
      words[current].classList.add('active');
    }, interval);
  });
})();
</script>`;
}

module.exports = { buildAnimatedHeadlineScript };
