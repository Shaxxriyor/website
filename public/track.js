/* READING_CDI progress tracker for the marathon, Reading and Listening Practice pages.
   Signed-in students only: counts time while the page is visible and the
   student is active (or audio is playing), and saves the score as soon as the
   page shows one. Loaded by a <script> tag at the end of each marathon page. */
(function () {
  'use strict';
  // Marathon day pages and Reading Practice passages.
  var m = location.pathname.match(/marathon\/(reading|listening)\/day-(\d+)\.html$/);
  var pm = location.pathname.match(/practice\/reading\/(p([1-3])-[a-z0-9-]+)\.html$/);
  var lm = location.pathname.match(/practice\/listening\/(test-(\d{1,3}))\.html$/);
  if ((!m && !pm && !lm) || !window.fetch) return;
  var kind = m ? 'marathon' : 'exercise';
  var skill = m ? m[1] : lm ? 'listening' : 'reading';
  var day = m ? parseInt(m[2], 10) : null;
  var item = pm ? pm[1] : lm ? lm[1] : null;
  var passageNo = pm ? pm[2] : null;
  var base = new URL('../../', location.href).href;

  // ---- "back to the site" button, for everyone ----
  var backTab = lm ? 'listening-practice' : item ? 'reading-practice' : skill === 'reading' ? 'reading-marathon' : 'listening-marathon';
  function addBackButton() {
    if (document.getElementById('rcdi-back')) return;
    var a = document.createElement('a');
    a.id = 'rcdi-back';
    a.href = base + '#/' + backTab;
    a.setAttribute('aria-label', 'Back to READING_CDI');
    a.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>' +
      '<span>READING_CDI</span>';
    a.style.cssText =
      'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483000;display:inline-flex;' +
      'align-items:center;gap:7px;height:36px;padding:0 15px 0 12px;border-radius:999px;text-decoration:none;' +
      'font:600 12.5px/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.06em;color:#fff;' +
      'background:rgba(29,27,26,.86);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 10px 24px -10px rgba(0,0,0,.5);' +
      'transition:transform .35s cubic-bezier(.34,1.56,.64,1),background-color .2s';
    // Listening tests have the candidate's name in the middle of their header:
    // the button goes to the top-left corner there instead.
    var shift = lm ? '' : 'translateX(-50%) ';
    if (lm) {
      a.style.left = '10px';
      a.style.top = '10px';
      a.style.transform = 'none';
    }
    a.onmouseenter = function () { a.style.transform = shift + 'translateY(-1px)'; a.style.background = 'rgba(29,27,26,.96)'; };
    a.onmouseleave = function () { a.style.transform = shift || 'none'; a.style.background = 'rgba(29,27,26,.86)'; };
    a.onmousedown = function () { a.style.transform = shift + 'scale(.95)'; };
    // Phones (and listening tests): a small round arrow so it doesn't cover the page header.
    if (lm || window.matchMedia('(max-width: 600px)').matches) {
      a.querySelector('span').style.display = 'none';
      a.style.width = a.style.height = '34px';
      a.style.padding = '0';
      a.style.justifyContent = 'center';
      a.style.top = lm ? '11px' : '8px';
    }
    document.body.appendChild(a);
  }
  if (document.body) addBackButton();
  else document.addEventListener('DOMContentLoaded', addBackButton);

  // ---- copy protection (deterrents: anything on screen can still be photographed) ----
  // Students may still select text (the reading tests use it for highlighting) and
  // copy what they typed themselves; copying the material, right-click, dragging,
  // saving, printing and view-source shortcuts are blocked.
  function inField(t) {
    return t && t.closest && t.closest('input, textarea, [contenteditable="true"]');
  }
  // Reading pages (marathon + practice passages): text can be selected and copied.
  var allowCopy = skill === 'reading';
  ['copy', 'cut'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (!allowCopy && !inField(e.target)) e.preventDefault();
    }, true);
  });
  document.addEventListener('contextmenu', function (e) {
    if (!allowCopy && !inField(e.target)) e.preventDefault();
  }, true);
  document.addEventListener('dragstart', function (e) {
    if (!inField(e.target)) e.preventDefault();
  }, true);
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    var mod = e.ctrlKey || e.metaKey;
    if ((mod && (k === 's' || k === 'p' || k === 'u')) || (!allowCopy && mod && !inField(e.target) && (k === 'c' || k === 'x'))) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
  var guard = document.createElement('style');
  guard.textContent =
    '@media print{html,body{display:none!important}}' +
    // Printing is blocked, so hide the pages' own print buttons.
    'button[onclick*="print("]{display:none!important}' +
    'img{-webkit-user-drag:none;user-drag:none;-webkit-touch-callout:none}' +
    // No logo watermark behind the text (the marathon pages draw one on the page background).
    'body,#stage-article{background-image:none!important}';
  if (lm) {
    // Listening tests: header clear of the back button, plus the phone layout and helpers.
    guard.textContent += '#hdr-left{padding-left:46px}';
    var phone = document.createElement('script');
    phone.src = base + 'listening-phone.js?v=5';
    (document.head || document.documentElement).appendChild(phone);
  }
  (document.head || document.documentElement).appendChild(guard);

  var IDLE_MS = 2 * 60 * 1000; // no input for 2 minutes = not studying (unless audio plays)
  var FIRST_SAVE = 60; // a day counts once the student has spent a minute on it
  var active = 0; // seconds counted on this page
  var pending = 0; // seconds not yet sent
  var started = false; // a record exists for today
  var lastInput = Date.now();
  var lastTick = Date.now();
  var lastScore = null;
  // This visit to the page = one attempt.
  var sitting = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  var who = null;

  function today() {
    var d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function topic() {
    if (lm) return 'Listening Test ' + lm[2];
    if (item) {
      // "Passage 2: Coral Reefs" → "Passage 2 · Coral Reefs"
      var pt = (document.title || '').replace(/^\s*Passage\s*\d+\s*[:\-–—]\s*/i, '').trim();
      return 'Passage ' + passageNo + ' · ' + pt;
    }
    var t = (document.title || '').split('—').slice(1).join('—').split('|')[0].trim();
    return skill === 'reading' ? t : 'Sections 2 & 3';
  }

  function send(extra, keepalive) {
    var seconds = Math.round(pending);
    pending -= seconds;
    var body = { kind: kind, skill: skill, seconds: seconds, date: today(), topic: topic() };
    if (day) body.day = day;
    if (item) body.item = item;
    for (var k in extra) body[k] = extra[k];
    return fetch(base + 'api/track', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: !!keepalive,
      headers: { 'content-type': 'application/json', 'x-requested-with': 'fetch' },
      body: JSON.stringify(body),
    })
      .then(function (r) {
        if (r.ok) started = true;
        else if (r.status === 401) who = null; // signed out elsewhere: stop tracking
        else pending += seconds;
        return r.ok;
      })
      .catch(function () {
        pending += seconds;
        return false;
      });
  }

  function audioPlaying() {
    var media = document.querySelectorAll('audio, video');
    for (var i = 0; i < media.length; i++) if (!media[i].paused && !media[i].ended) return true;
    return false;
  }

  function tick() {
    var now = Date.now();
    var dt = Math.min((now - lastTick) / 1000, 5);
    lastTick = now;
    if (!who || document.visibilityState !== 'visible') return;
    if (now - lastInput < IDLE_MS || audioPlaying()) {
      active += dt;
      pending += dt;
    }
  }

  function flush(keepalive) {
    if (!who) return;
    if (started ? pending >= 1 : active >= FIRST_SAVE) send({}, keepalive);
  }

  // ---- scores ----
  // Returns { correct, total } once the page shows a result, else null.
  function readScore() {
    if (skill === 'reading') {
      // The results card: first box is "Correct", second is "Questions".
      var nums = document.querySelectorAll('#stage-results .rcx-scorerow .rcx-sbox .num');
      if (nums.length >= 2) return { correct: parseInt(nums[0].textContent, 10), total: parseInt(nums[1].textContent, 10) };
    } else if (lm) {
      // Full listening test: "Your result" card, "26 / 40".
      var rs = document.querySelector('#results-content .rs-score .n');
      var lmm = rs && rs.textContent.match(/(\d+)\s*\/\s*(\d+)/);
      if (lmm) return { correct: parseInt(lmm[1], 10), total: parseInt(lmm[2], 10) };
    } else {
      var sc = document.querySelector('#result .sc');
      var mm = sc && sc.textContent.match(/(\d+)\s*\/\s*(\d+)/);
      if (mm) return { correct: parseInt(mm[1], 10), total: parseInt(mm[2], 10) };
    }
    return null;
  }

  var scoreTimer = null;
  // Throttled, not debounced: some pages (the listening tests' clock and audio bar)
  // change every few hundred ms, which would postpone a debounced check forever.
  function checkScore() {
    if (scoreTimer) return;
    scoreTimer = setTimeout(function () {
      scoreTimer = null;
      var r = readScore();
      if (!who || !r || isNaN(r.correct) || isNaN(r.total)) return;
      var key = r.correct + '/' + r.total;
      if (key === lastScore) return;
      lastScore = key;
      var extra = { correct: r.correct, sitting: sitting };
      if (kind === 'exercise') extra.total = r.total;
      send(extra).then(function (ok) {
        if (!ok) return;
        if (kind === 'marathon' && skill === 'reading') {
          toast('Score saved · ' + r.correct + '/13 — now do the Day ' + day + ' ELS exercise to complete the day');
        } else {
          toast('Score saved · ' + (kind === 'marathon' ? r.correct + '/20' : key));
        }
      });
    }, 400);
  }

  // ---- a small, unobtrusive status pill ----
  var pill;
  function toast(text) {
    if (!pill) {
      pill = document.createElement('div');
      pill.setAttribute('role', 'status');
      pill.style.cssText =
        'position:fixed;left:14px;bottom:14px;z-index:2147483000;padding:8px 14px;border-radius:999px;' +
        'font:500 12px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;background:rgba(29,27,26,.86);' +
        'box-shadow:0 10px 24px -10px rgba(0,0,0,.45);pointer-events:none;opacity:0;transform:translateY(6px);' +
        'transition:opacity .3s ease,transform .3s ease';
      // Phones: show it at the top (below the back button) so it never covers the page's buttons.
      if (window.matchMedia('(max-width: 600px)').matches) {
        pill.style.left = '50%';
        pill.style.bottom = 'auto';
        pill.style.top = '50px';
        pill.style.maxWidth = 'calc(100vw - 32px)';
        pill.style.textAlign = 'center';
        pill.style.transform = 'translateX(-50%) translateY(-6px)';
        pill.dataset.top = '1';
      }
      document.body.appendChild(pill);
    }
    pill.textContent = text;
    pill.style.opacity = '1';
    pill.style.transform = pill.dataset.top ? 'translateX(-50%)' : 'none';
    clearTimeout(pill._t);
    pill._t = setTimeout(function () {
      pill.style.opacity = '0';
      pill.style.transform = pill.dataset.top ? 'translateX(-50%) translateY(-6px)' : 'translateY(6px)';
    }, 4000);
  }

  // ---- start (only for a signed-in student) ----
  fetch(base + 'api/me', { credentials: 'same-origin' })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (!data || !data.student) return;
      who = data.student;
      toast('✓ Progress saving for ' + who.full_name.split(' ')[0]);
      // Listening tests ask for the candidate's name first: fill it in.
      var nameField = document.getElementById('entry-name');
      if (nameField && !nameField.value) {
        nameField.value = who.full_name;
        nameField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      ['mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'input', 'wheel'].forEach(function (ev) {
        addEventListener(ev, function () { lastInput = Date.now(); }, { passive: true, capture: true });
      });
      setInterval(tick, 1000);
      setInterval(function () { flush(false); }, 30000);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') flush(true);
        lastTick = Date.now();
      });
      addEventListener('pagehide', function () { flush(true); });
      new MutationObserver(checkScore).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    })
    .catch(function () {});
})();
