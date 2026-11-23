
/* ════════════════════════════════════════════════════════════════════════════
   CDI COSMIC SHELL — boot orchestration (no dependencies).
   Runs whether or not WebGL / Three.js is available, so the entrance screens
   can never be left blocked by a failed particle layer.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  var body = document.body;
  var RM = false;
  try { RM = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  window.__cdiReduced = RM;
  window.__cdiBootStart = (window.performance && performance.now) ? performance.now() : Date.now();

  var revealed = false;
  window.__cdiReveal = function () {
    if (revealed) return;
    revealed = true;
    body.classList.remove('cdi-booting');
    body.classList.add('cdi-reveal');
    var el = document.getElementById('start-name');
    var reg = document.getElementById('stage-registration');
    var sheet = document.getElementById('ch-resume');
    var blocked = sheet && sheet.classList.contains('show');
    if (el && reg && reg.classList.contains('active') && !RM && !blocked) {
      setTimeout(function () { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }, 780);
    }
  };
  window.__cdiRevealed = function () { return revealed; };

  var reg = document.getElementById('stage-registration');
  /* COSMOS: no prelude — the card arrives on a sky that is already moving. */
  var booting = false;
  if (!booting || RM) {
    /* resumed test, or motion-sensitive user: no prelude at all */
    window.__cdiReveal();
  } else {
    /* THE PRELUDE BUDGET.
       The particle layer needs a WebGL context, two shader compiles and a first
       frame; on a software renderer that can be most of a second — long enough
       that a prelude started on module-load would play *after* the card had
       already been forced on screen. So the prelude gets a hard audition
       window: if the atmosphere has not signalled ready inside the budget, the
       card performs its own entrance and the particle layer fades in behind it
       whenever it finally arrives. The entrance is never hostage to the GPU. */
    var since = window.__cdiBootStart;          // ms since navigation started
    setTimeout(function () {
      if (!window.__cdiAtmoReady) window.__cdiReveal();
    }, Math.max(150, 940 - since));
    /* absolute ceiling, in case the layer starts but then throws mid-prelude */
    setTimeout(window.__cdiReveal, Math.max(320, 2050 - since));
  }

  /* skip the prelude on any deliberate interaction */
  ['pointerdown', 'keydown', 'wheel'].forEach(function (ev) {
    window.addEventListener(ev, function () {
      if (window.CDIAtmosphere && window.CDIAtmosphere.skip) window.CDIAtmosphere.skip();
      window.__cdiReveal();
    }, { once: true, passive: true });
  });

  /* ── registration micro-interactions ─────────────────────────────────── */
  function wireRegistration() {
    var input = document.getElementById('start-name');
    var field = document.getElementById('start-field');
    var btn = document.getElementById('start-btn');
    if (!input || !btn) return;
    var wasOk = null;
    var sync = function () {
      var ok = input.value.trim().length >= 2;
      btn.classList.toggle('is-dormant', !ok);
      if (ok && wasOk === false && !RM) {
        btn.classList.remove('is-live'); void btn.offsetWidth; btn.classList.add('is-live');
      }
      if (!ok) btn.classList.remove('is-live');
      wasOk = ok;
      if (ok && field) field.classList.remove('is-invalid');
    };
    input.addEventListener('input', sync);
    input.addEventListener('blur', sync);
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireRegistration);
  else wireRegistration();

  /* ── completion: the "sealing" sequence ──────────────────────────────────
     Listening is marked the instant the tape stops — there is no examiner to
     wait for. The seal is therefore not a progress bar pretending to work; it
     is the two and a half seconds in which a candidate stops being a candidate,
     given a shape. It runs once, on the way past. */
  var STEP_AT = [0.20, 0.50, 0.80];
  var STATUS = [
    [0.00, 'Sealing your answer sheet…'],
    [0.22, 'Checking spellings and accepted alternatives…'],
    [0.52, 'Applying the official band conversion…'],
    [0.82, 'Preparing your report and transcript…']
  ];
  var compRun = false;
  function runCompletion() {
    if (compRun) return;
    compRun = true;
    var stage = document.getElementById('stage-completion');
    var arc = document.getElementById('ch-seal-arc');
    var pct = document.getElementById('ch-seal-pct');
    var status = document.getElementById('ch-status');
    var steps = document.querySelectorAll('#ch-steps li');
    var CIRC = 175.93;

    function paint(e) {
      if (arc) arc.style.strokeDashoffset = String(CIRC * (1 - e));
      if (pct) pct.textContent = Math.round(e * 100) + '%';
      var nowIdx = -1;
      for (var i = 0; i < steps.length; i++) {
        var done = e >= STEP_AT[i];
        steps[i].classList.toggle('on', done);
        if (!done && nowIdx < 0) nowIdx = i;
      }
      for (var n = 0; n < steps.length; n++) steps[n].classList.toggle('now', n === nowIdx);
      if (status) {
        var txt = STATUS[0][1];
        for (var j = 0; j < STATUS.length; j++) if (e >= STATUS[j][0]) txt = STATUS[j][1];
        if (status.textContent !== txt) status.textContent = txt;
      }
      if (window.CDIAtmosphere && window.CDIAtmosphere.progress) window.CDIAtmosphere.progress(e);
    }
    function seal() {
      paint(1);
      for (var i = 0; i < steps.length; i++) steps[i].classList.remove('now');
      if (status) status.textContent = 'Sealed · your answers are marked and ready.';
      if (stage) stage.classList.add('is-sealed');
      if (window.CDIAtmosphere && window.CDIAtmosphere.sealed) window.CDIAtmosphere.sealed();
    }
    if (RM) { seal(); return; }

    var t0 = performance.now();
    var HOLD = 260, DUR = 2280;
    (function step(now) {
      var p = Math.min(Math.max((now - t0 - HOLD) / DUR, 0), 1);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      paint(e);
      if (p < 1) requestAnimationFrame(step);
      else seal();
    })(performance.now());
  }
  function watchCompletion() {
    var stage = document.getElementById('stage-completion');
    if (!stage) return;
    if (stage.classList.contains('active')) runCompletion();
    try {
      new MutationObserver(function () {
        if (stage.classList.contains('active')) runCompletion();
      }).observe(stage, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchCompletion);
  else watchCompletion();
})();
