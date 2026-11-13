// CoAuthor agent kit page: copy buttons. No dependencies.
(function () {
  var toast = document.querySelector('[data-toast]');
  function say(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(say.t); say.t = setTimeout(function () { toast.classList.remove('show'); }, 2000);
  }
  function fallback(text) {
    var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); say('Copied'); } catch (e) { say('Select the text to copy it'); }
    document.body.removeChild(ta);
  }
  document.querySelectorAll('[data-copy-from]').forEach(function (b) {
    b.addEventListener('click', function () {
      var el = document.getElementById(b.getAttribute('data-copy-from'));
      var text = el ? el.textContent : '';
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { say('Copied'); }, function () { fallback(text); });
      else fallback(text);
    });
  });
})();
