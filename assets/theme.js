// Theme: follows the device (prefers-color-scheme) until the visitor picks one with the sun/moon button;
// the pick is kept in localStorage. Loaded in <head> without defer so the right theme is set before first paint.
(function () {
  var KEY = 'theme', root = document.documentElement, mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function stored() { try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null; } catch (e) { return null; } }
  function current() { return stored() || (mq && mq.matches ? 'light' : 'dark'); }
  function apply() {
    var s = stored(), t = current();
    if (s) root.setAttribute('data-theme', s); else root.removeAttribute('data-theme');
    root.style.colorScheme = t;
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) { if (s) { metas[i].setAttribute('content', t === 'light' ? '#FAFAFA' : '#111113'); metas[i].removeAttribute('media'); } }
    var label = t === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var j = 0; j < btns.length; j++) { btns[j].setAttribute('aria-label', label); btns[j].setAttribute('title', label); }
  }
  apply();
  document.addEventListener('DOMContentLoaded', apply);
  if (mq) { var on = function () { if (!stored()) apply(); }; if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on); }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-theme-toggle]') : null;
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var next = current() === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, next); } catch (err) { root.setAttribute('data-theme', next); }
    apply(); if (!stored()) { root.setAttribute('data-theme', next); root.style.colorScheme = next; }
  }, true);
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(); });
  // the editor redraws its page; label any toggle it adds
  if (window.MutationObserver) document.addEventListener('DOMContentLoaded', function () { var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { var bs = document.querySelectorAll('[data-theme-toggle][aria-label="Light or dark mode"]'); if (bs.length) apply(); }, 50); }).observe(document.body, { childList: true, subtree: true }); });
})();
