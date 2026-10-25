
/* ════════════════════════════════════════════════════════════════════════
   ENTRY CARD
   The candidate names themselves, the recording is fetched, and only then
   does the paper appear and the clock start. The progress bar tracks the
   real download where the browser reports it and falls back to the audio
   element's own readiness where it does not.
   ════════════════════════════════════════════════════════════════════════ */
(function(){
  var form   = document.getElementById('entry-form');
  var load   = document.getElementById('entry-loading');
  var field  = document.getElementById('entry-field');
  var hint   = document.getElementById('entry-hint');
  var input  = document.getElementById('entry-name');
  var btn    = document.getElementById('entry-start');
  var fill   = document.getElementById('entry-progress-fill');
  var label  = document.getElementById('entry-progress-label');
  var overlay= document.getElementById('entry-overlay');
  if(!btn||!input||!overlay) return;

  function start(){
    var name = input.value.trim();
    if(name.length < 2){
      field.classList.remove('is-invalid'); void field.offsetWidth;
      field.classList.add('is-invalid');
      hint.textContent = name ? 'That looks a little short — please enter your full name.'
                              : 'Enter your name to begin. It appears on your score report.';
      input.focus();
      return;
    }
    field.classList.remove('is-invalid');
    /* Students sit the paper full screen, as in the exam room. The click on
       Start is the user gesture browsers require, so it must happen here. */
    try{
      var _de=document.documentElement;
      var _rq=_de.requestFullscreen||_de.webkitRequestFullscreen||_de.msRequestFullscreen;
      if(_rq && !document.fullscreenElement) _rq.call(_de);
    }catch(e){}
    form.hidden = true;
    load.hidden = false;

    var audio = document.getElementById('exam-audio');
    var pct = 0, ready = false, done = false;

    function finish(){
      if(done) return; done = true;
      fill.style.width = '100%'; label.textContent = '100%';
      setTimeout(function(){
        overlay.style.display = 'none';
        try{ ExamApp.beginTest(name); }catch(e){}
      }, 220);
    }
    function tick(){
      if(done) return;
      pct = Math.min(96, pct + (ready ? 16 : 2.5));
      fill.style.width = pct + '%';
      label.textContent = Math.round(pct) + '%';
      if(pct >= 96 && ready){ finish(); return; }
      setTimeout(tick, 90);
    }
    function markReady(){ ready = true; }

    if(audio){
      audio.addEventListener('canplaythrough', markReady, {once:true});
      audio.addEventListener('canplay',        markReady, {once:true});
      audio.addEventListener('loadeddata',     markReady, {once:true});
      audio.addEventListener('error',          markReady, {once:true});
      audio.preload = 'auto';
      try{ audio.load(); }catch(e){}
      if(audio.readyState >= 2) markReady();
      /* preload="auto" means the fetch may have finished — or failed — before
         the candidate ever clicked Start, in which case no further event is
         coming and the listeners above would wait forever. */
      if(audio.error) markReady();
    } else { markReady(); }

    /* Never hold a candidate on a spinner because a CDN is slow: after ten
       seconds the paper opens anyway and the play gate handles the rest. */
    setTimeout(markReady, 6000);
    tick();
  }

  btn.addEventListener('click', start);
  input.addEventListener('keydown', function(e){ if(e.key === 'Enter') start(); });
  input.addEventListener('input', function(){
    if(input.value.trim().length >= 2){
      field.classList.remove('is-invalid');
      hint.textContent = 'It appears on your score report.';
    }
  });
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ try{ input.focus(); }catch(e){} }, 120); });
  } else { setTimeout(function(){ try{ input.focus(); }catch(e){} }, 120); }
})();
