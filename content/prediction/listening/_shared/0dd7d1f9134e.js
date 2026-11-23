
/* ── full-screen at the door ────────────────────────────────────────────────
   A browser will not hand out full-screen on page load: the API requires a
   transient user gesture, and a load-time request is refused by every engine.
   So the FIRST gesture on the registration screen is armed instead — the click
   into the name field, or the first key pressed. In practice that is
   indistinguishable from automatic, because typing a name is the first thing
   anyone does on this screen; by the time they reach Begin they are already
   full-screen. (For genuinely automatic, the page has to be launched that way:
   Chrome's --start-fullscreen / --kiosk, or F11 · ctrl-cmd-F.)

   It deliberately does NOT call the engine's enterFullscreen(). That sets
   state.fsGranted, which is what arms the strike counter — so a candidate who
   opens the paper, goes full-screen, then leaves before starting would be
   charged a violation for it. Leaving the flag alone means the engine arms the
   counter itself, at the point the exam actually begins. */
(function () {
  var EV = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  function active() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement ||
              document.mozFullScreenElement || document.msFullscreenElement);
  }
  function disarm() {
    EV.forEach(function (e) { window.removeEventListener(e, go, true); });
  }
  function go() {
    disarm();
    if (active()) return;
    var el = document.documentElement;
    var req = el.requestFullscreen || el.webkitRequestFullscreen ||
              el.mozRequestFullScreen || el.msRequestFullscreen;
    if (!req) return;
    try {
      var p = req.call(el, { navigationUI: 'hide' });
      /* A refusal is a normal outcome here, not an error: an iframe without the
         permission, or a browser configured to deny it. The screen simply stays
         windowed, exactly as it does today. */
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {}
    /* the transition can take focus off the field the candidate just clicked */
    var n = document.getElementById('start-name');
    if (n) setTimeout(function () {
      try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); }
    }, 280);
  }
  function arm() {
    var reg = document.getElementById('stage-registration');
    if (!reg || !reg.classList.contains('active') || active()) return;
    EV.forEach(function (e) {
      window.addEventListener(e, go, { capture: true, passive: true });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm);
  else arm();
})();
