/* READING_CDI site: attached to every full mock test by scripts/import-mock.mjs.
   1. Keeps the candidate in the test: from login to the last submit, switching
      tab or app, minimising, leaving full screen during a part or pressing Back
      brings up a warning and is recorded (the teacher sees each one).
      Copy, paste, the right-click menu and the developer shortcuts are off.
   2. Fills in the signed-in student's name and saves the result to their
      account after every part, so it appears in Mock results on the site.
   3. The PDF report includes both Writing tasks with their pictures.
   It works with the mock page's own globals (S, save, running, doLogin, ...). */
(function () {
  'use strict';
  var MOCK = window.__MOCK_ID || '';
  var $ = function (id) { return document.getElementById(id); };
  var student = null;     // the signed-in READING_CDI student, if any
  var meChecked = false;
  var syncWanted = false;
  var lastSave = null;    // 'ok' | 'error' | null

  /* ---------- styles ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#mg-warn{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:20px;' +
    'background:rgba(20,10,10,.72);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);font-family:Arial,Helvetica,sans-serif}' +
    '#mg-warn.on{display:flex}' +
    '#mg-warn .mg-card{max-width:460px;width:100%;background:#fff;border-radius:10px;padding:28px 26px 24px;text-align:center;' +
    'box-shadow:0 20px 60px rgba(0,0,0,.4);border-top:6px solid #c8102e}' +
    '#mg-warn.info .mg-card{border-top-color:#1f1b16}' +
    '#mg-warn .mg-ico{width:46px;height:46px;margin:0 auto 12px;border-radius:50%;background:#c8102e;color:#fff;font:700 26px/46px Arial,sans-serif}' +
    '#mg-warn.info .mg-ico{background:#1f1b16}' +
    '#mg-warn h2{margin:0 0 10px;font-size:21px;color:#111}' +
    '#mg-warn p{margin:0 0 12px;font-size:15px;line-height:1.5;color:#333}' +
    '#mg-warn .mg-count{font-weight:700;color:#c8102e}' +
    '#mg-warn button{margin-top:6px;background:#111;color:#fff;border:0;border-radius:6px;padding:13px 24px;font:700 15px Arial,sans-serif;cursor:pointer}' +
    '#mg-saved{margin:10px 0 0;font:14px Arial,sans-serif;color:#2e7d32}#mg-saved.err{color:#c8102e}#mg-saved.muted{color:#666}' +
    '#mg-left{margin:8px 0 0;font:700 14px Arial,sans-serif;color:#c8102e}' +
    '.mg-home{display:inline-flex;align-items:center;gap:6px;text-decoration:none}' +
    'a.tglink,.entry-tg,.channel-promo,.rcx-tglink,a.tgbtn{display:none!important}';
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.id = 'mg-warn';
  box.setAttribute('role', 'alertdialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = '<div class="mg-card"><div class="mg-ico">!</div><h2 id="mg-t"></h2><p id="mg-p"></p>' +
    '<p class="mg-count" id="mg-c"></p><button type="button" id="mg-b"></button></div>';
  document.body.appendChild(box);
  $('mg-b').addEventListener('click', function () {
    box.classList.remove('on');
    try { goFull(); } catch (e) {}
  });

  function active() {
    return !!(S && S.name && !S.finishedAt && $('scLogin') && $('scLogin').classList.contains('hidden'));
  }
  function count() { return (S && S.leaves ? S.leaves.length : 0); }
  function show(kind) {
    var info = kind === 'start';
    box.classList.toggle('info', info);
    $('mg-t').textContent = info ? 'Stay in the mock test' : 'Do not leave the mock test';
    $('mg-p').textContent = info
      ? 'Keep this window open until you finish all three parts. Switching to another tab or app, minimising the window or leaving full screen is recorded and shown to your teacher.'
      : 'You left the test window. Stay on this page until you submit Writing: do not open other tabs, apps or windows.';
    var n = count();
    $('mg-c').textContent = info ? '' : 'Recorded ' + n + ' time' + (n === 1 ? '' : 's') + '. Your teacher will see this.';
    $('mg-b').textContent = info ? 'I understand' : 'Return to the test';
    box.classList.add('on');
  }

  /* ---------- leaving the window ---------- */
  var lastLeave = 0;
  var dialogUntil = 0; // the page's own confirm()/alert() boxes take focus too
  function record(type) {
    if (!active()) return false;
    var now = Date.now();
    if (now < dialogUntil) return false;
    if (now - lastLeave < 1500) return true; // one leave, several events
    lastLeave = now;
    S.leaves = S.leaves || [];
    S.leaves.push({ at: now, type: type, mod: running || '' });
    try { save(); } catch (e) {}
    syncSoon(500);
    return true;
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) record('tab');
    else if (active() && Date.now() - lastLeave < 600000 && lastLeave) show('warn');
  });
  function blurred() {
    setTimeout(function () {
      if (document.hidden || document.hasFocus()) return; // focus only moved into a test frame
      if (record('window')) show('warn');
    }, 300);
  }
  window.addEventListener('blur', blurred);
  function fsChange() {
    var full = !!(document.fullscreenElement || document.webkitFullscreenElement);
    // The page itself leaves full screen between parts; only a part in progress counts.
    if (!full && running && active() && record('fullscreen')) show('warn');
  }
  document.addEventListener('fullscreenchange', fsChange);
  document.addEventListener('webkitfullscreenchange', fsChange);

  // Back button: stay on the page.
  var trapped = false;
  function trapBack() {
    if (trapped) return;
    trapped = true;
    try { history.pushState({ mg: 1 }, '', location.href); } catch (e) {}
  }
  window.addEventListener('popstate', function () {
    if (!active()) return;
    try { history.pushState({ mg: 1 }, '', location.href); } catch (e) {}
    if (record('back')) show('warn');
  });
  window.addEventListener('beforeunload', function (e) {
    if (active()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ---------- no copy, paste, menu or dev tools during the test ---------- */
  function harden(doc, win) {
    if (!doc || doc.__mg) return;
    doc.__mg = 1;
    ['copy', 'cut', 'paste', 'drop', 'contextmenu'].forEach(function (ev) {
      doc.addEventListener(ev, function (e) { if (active()) e.preventDefault(); }, true);
    });
    doc.addEventListener('keydown', function (e) {
      if (!active()) return;
      var k = (e.key || '').toLowerCase();
      var mod = e.ctrlKey || e.metaKey;
      if (k === 'f12' || (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) || (mod && (k === 'u' || k === 's' || k === 'p'))) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    if (win) {
      win.addEventListener('blur', blurred);
      ['alert', 'confirm', 'prompt'].forEach(function (f) {
        var orig = win[f];
        if (typeof orig !== 'function') return;
        win[f] = function () {
          dialogUntil = Date.now() + 60000;
          try { return orig.apply(win, arguments); } finally { dialogUntil = Date.now() + 800; }
        };
      });
    }
  }
  harden(document, window);
  // The Listening and Reading tests open in a frame: guard each one as it appears.
  var host = $('modHost');
  if (host && window.MutationObserver) {
    new MutationObserver(function () {
      var fr = host.querySelector('iframe');
      if (!fr) return;
      var tryIt = function () { try { harden(fr.contentDocument, fr.contentWindow); } catch (e) {} };
      tryIt();
      fr.addEventListener('load', function () { try { fr.contentDocument.__mg = 0; } catch (e) {} tryIt(); });
      setTimeout(tryIt, 400);
      setTimeout(tryIt, 1500);
    }).observe(host, { childList: true });
  }

  /* ---------- the student's account ---------- */
  fetch('/api/me', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; })
    .then(function (d) {
      meChecked = true;
      student = d && d.student ? d.student : null;
      var u = $('lgUser');
      if (student && u) {
        u.value = student.full_name;
        u.readOnly = true;
        u.title = 'Your name on READING_CDI';
        var p = $('lgPass');
        if (p) setTimeout(function () { try { p.focus(); } catch (e) {} }, 0);
      }
      if (syncWanted) send();
      paintSaved();
    });

  function tasks() {
    var t = {};
    [1, 2].forEach(function (n) {
      var img = document.querySelector('#wPrompt' + n + ' img');
      t[n] = { text: (typeof TASK_TEXT !== 'undefined' && TASK_TEXT[n]) || '', image: img ? img.getAttribute('src') : '' };
    });
    return t;
  }
  function result() {
    return {
      mock: MOCK,
      title: typeof MOCK_TITLE !== 'undefined' ? MOCK_TITLE : MOCK,
      name: S.name,
      sitting: S.sitting,
      startedAt: S.startedAt || null,
      finishedAt: S.finishedAt || null,
      lang: S.lang || '',
      done: S.done || {},
      res: S.res || {},
      w: (function () {
        var w = S.w || { t1: '', t2: '' }, a = $('wText1'), b = $('wText2');
        return running === 'writing' && a && b ? { t1: a.value, t2: b.value } : w;
      })(),
      leaves: S.leaves || [],
      tasks: tasks(),
    };
  }

  var syncTimer = null;
  function syncSoon(ms) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(send, ms || 400);
  }
  function send() {
    if (!S || !S.name || !S.sitting) return;
    if (!meChecked) { syncWanted = true; return; }
    syncWanted = false;
    if (!student) return;
    var body = JSON.stringify({ action: 'save', result: result() });
    fetch('/api/mock', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: body.length < 60000,
      headers: { 'content-type': 'application/json', 'x-requested-with': 'fetch' },
      body: body,
    })
      .then(function (r) { lastSave = r.ok ? 'ok' : 'error'; })
      .catch(function () { lastSave = 'error'; })
      .then(paintSaved);
  }
  function paintSaved() {
    var body = $('repBody');
    if (!body || !S || !S.finishedAt) return;
    var row = body.querySelector('.dlrow');
    var el = $('mg-saved');
    if (!el && row) {
      el = document.createElement('p');
      el.id = 'mg-saved';
      row.parentNode.insertBefore(el, row.nextSibling);
    }
    if (!el) return;
    if (!meChecked || (student && !lastSave)) { el.className = 'muted'; el.textContent = 'Saving your result…'; }
    else if (!student) { el.className = 'err'; el.textContent = 'Not saved to an account: sign in on READING_CDI with your code to save mock results.'; }
    else if (lastSave === 'ok') { el.className = ''; el.textContent = '✓ Saved to your READING_CDI account. Your teacher can see it in Mock results.'; }
    else {
      el.className = 'err';
      el.innerHTML = 'Your result could not be saved. Check the internet and <button type="button" id="mg-retry">try again</button>.';
      var b = $('mg-retry');
      if (b) b.onclick = send;
    }
  }

  /* ---------- hooks into the mock page ---------- */
  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  var _doLogin = doLogin;
  doLogin = function (e) {
    var r = _doLogin(e);
    if (S && S.name && $('scLogin').classList.contains('hidden')) {
      if (!S.sitting) { S.sitting = rid(); S.startedAt = Date.now(); }
      S.leaves = S.leaves || [];
      try { save(); } catch (err) {}
      if (!S.finishedAt) { trapBack(); show('start'); syncSoon(800); }
    }
    return r;
  };
  var _done = window.__mockDone;
  window.__mockDone = function (k, res) {
    var r = _done.apply(this, arguments);
    syncSoon(300);
    return r;
  };
  var _submit = submitWriting;
  submitWriting = function (auto) {
    var r = _submit.apply(this, arguments);
    if (S.finishedAt) { box.classList.remove('on'); send(); }
    return r;
  };
  // Writing is saved while it is typed: at most 15 seconds after any change, even if the typing
  // never stops (a timer that restarted on every key only saved after a 20-second pause), and
  // whenever the page is hidden or closed.
  var writeTimer = null;
  ['wText1', 'wText2'].forEach(function (id) {
    var t = $(id);
    if (t) t.addEventListener('input', function () {
      if (running !== 'writing' || writeTimer) return;
      writeTimer = setTimeout(function () { writeTimer = null; send(); }, 15000);
    });
  });
  function flush() {
    if (!S || !S.name || !S.sitting || !student) return;
    if (S.w) { var a = $('wText1'), b = $('wText2'); if (a) S.w.t1 = a.value; if (b) S.w.t2 = b.value; }
    clearTimeout(writeTimer); writeTimer = null;
    send();
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);
  var _report = renderReport;
  renderReport = function () {
    var r = _report.apply(this, arguments);
    var body = $('repBody');
    var n = count();
    if (body) {
      var who = body.querySelector('.who');
      if (who && n) {
        var p = document.createElement('p');
        p.id = 'mg-left';
        p.textContent = 'Left the test window ' + n + ' time' + (n === 1 ? '' : 's') + ' during the test.';
        who.parentNode.insertBefore(p, who.nextSibling);
      }
      var row = body.querySelector('.dlrow');
      if (row && !row.querySelector('.mg-home')) {
        var a = document.createElement('a');
        a.className = 'mg-home';
        a.href = '/#/mock';
        a.innerHTML = '<button type="button" class="ghost">Back to READING_CDI</button>';
        row.appendChild(a);
      }
    }
    paintSaved();
    return r;
  };
  // The PDF report: both Writing tasks with their pictures, for the examiner. A plain script
  // (window.MockReport), because Safari refuses module scripts the host doesn't type as JavaScript.
  function loadReport() {
    if (window.MockReport) return Promise.resolve(window.MockReport);
    return new Promise(function (ok, no) {
      var sc = document.createElement('script');
      sc.src = '/mock-report.js?v=3';
      sc.onload = function () { window.MockReport ? ok(window.MockReport) : no(); };
      sc.onerror = function () { sc.remove(); no(); };
      document.head.appendChild(sc);
    });
  }
  function tapToSave() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function savePdfFile(blob, name) {
    var file = null;
    try { file = new File([blob], name, { type: 'application/pdf' }); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).catch(function (err) {
        if (!err || err.name !== 'AbortError') openBlob(blob, name);
      });
      return;
    }
    openBlob(blob, name);
  }
  function openBlob(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.target = '_blank';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 60000);
  }
  downloadPDF = function () {
    if (!window.jspdf || !window.jspdf.jsPDF) { alert('The PDF maker is not available here. Use Download .txt instead.'); return; }
    loadReport()
      .then(function (m) {
        var r = result();
        return m.buildMockPdf(r, window.jspdf.jsPDF).then(function (doc) {
          var name = m.fileName(r);
          if (!tapToSave()) { doc.save(name); return; }
          // iPhone/iPad: saving must come straight from a tap, so offer a Save button once it is ready.
          var blob = doc.output('blob');
          box.classList.add('info');
          $('mg-t').textContent = 'Your PDF is ready';
          $('mg-p').textContent = 'Tap Save PDF, then choose Save to Files (or send it on Telegram).';
          $('mg-c').textContent = '';
          var btn = $('mg-b');
          btn.textContent = 'Save PDF';
          box.classList.add('on');
          btn.onclick = function () {
            btn.onclick = null;
            box.classList.remove('on');
            savePdfFile(blob, name);
          };
        });
      })
      .catch(function () { alert('The PDF could not be made. Use Download .txt instead.'); });
  };
})();
