(function () {
  // प्रॉम्प्ट कॉपी
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.prompt button');
    if (!b) return;
    var pre = b.parentNode.querySelector('pre');
    function done(ok) {
      b.textContent = ok ? 'कॉपी हो गया' : 'चुन लिया, अब कॉपी करें';
      setTimeout(function () { b.textContent = 'कॉपी करें'; }, 1800);
    }
    function select() {
      var range = document.createRange();
      range.selectNodeContents(pre);
      var sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      done(false);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pre.textContent).then(function () { done(true); }, select);
    } else select();
  });
})();
