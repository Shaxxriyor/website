/* READING_CDI · phone helpers for the full Listening Practice tests.
   Loaded by track.js on practice/listening/test-N.html (for everyone).
   - the phone stylesheet (listening-phone.css)
   - matching questions: tap a word, then tap a box (dragging across a long
     page is hard on a phone), and the page scrolls while a word is dragged
   - review: tapping the transcript header folds the transcript away */
(function () {
  'use strict';
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('listening-phone.css?v=5', document.currentScript ? document.currentScript.src : location.href).href;
  (document.head || document.documentElement).appendChild(css);

  var body = function () { return document.body; };
  var inReview = function () { return body().classList.contains('review-mode'); };

  // ---- tap a word, then tap a box ----
  var picked = null;
  function unpick() {
    if (picked) picked.classList.remove('rcdi-picked');
    picked = null;
    body().classList.remove('rcdi-picking');
  }
  function dropAt(x, y) {
    var els = document.elementsFromPoint(x, y);
    for (var i = 0; i < els.length; i++) {
      var d = els[i].closest && els[i].closest('.drag-drop');
      if (d) return d;
    }
    return null;
  }
  document.addEventListener('click', function (e) {
    if (inReview() || typeof window.dmPlace !== 'function') return;
    var chip = e.target.closest && e.target.closest('.drag-chip');
    if (chip && !chip.classList.contains('dm-ghost')) {
      var again = picked === chip;
      unpick();
      if (!again) {
        picked = chip;
        chip.classList.add('rcdi-picked');
        body().classList.add('rcdi-picking');
      }
      return;
    }
    if (!picked) return;
    var drop = dropAt(e.clientX, e.clientY);
    if (drop) {
      var c = picked;
      var pool = c.closest('.drag-pool');
      // Pools whose words can be used more than once hand out a copy (as dragging does).
      if (pool && pool.dataset.reuse) {
        c = c.cloneNode(true);
        c.classList.remove('rcdi-picked');
        c.classList.add('dm-reuse-chip');
      }
      window.dmPlace(c, drop);
    }
    unpick();
  });

  // ---- keep scrolling while a word is dragged near the top or bottom ----
  var pointerY = null;
  addEventListener('pointermove', function (e) { pointerY = e.clientY; }, { passive: true });
  addEventListener('pointerup', function () { pointerY = null; }, { passive: true });
  (function loop() {
    if (pointerY != null && body() && body().classList.contains('dm-active')) {
      var area = document.getElementById('listening-area');
      if (area) {
        var r = area.getBoundingClientRect();
        var edge = 70;
        if (pointerY < r.top + edge) area.scrollTop -= Math.ceil((r.top + edge - pointerY) / 6);
        else if (pointerY > r.bottom - edge) area.scrollTop += Math.ceil((pointerY - (r.bottom - edge)) / 6);
      }
    }
    requestAnimationFrame(loop);
  })();

  // ---- review: fold the transcript (phones show it as a panel at the bottom) ----
  function addToggle() {
    var panel = document.getElementById('transcript-panel');
    if (!panel || panel.querySelector('.rcdi-tp-toggle')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rcdi-tp-toggle';
    btn.innerHTML = '<span class="when-open">▾ Hide</span><span class="when-min">▴ Transcript</span>';
    btn.onclick = function () { body().classList.toggle('rcdi-tp-min'); };
    panel.appendChild(btn);
  }
  // The test rebuilds the panel when review opens, so put the button back whenever it goes.
  function watch() {
    addToggle();
    new MutationObserver(addToggle).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
  document.addEventListener('click', function (e) {
    if (innerWidth > 880 || !e.target.closest) return;
    if (e.target.closest('#transcript-panel .tp-hdr')) body().classList.toggle('rcdi-tp-min');
  });
})();
