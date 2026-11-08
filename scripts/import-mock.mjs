// Imports a full mock test (one self-contained HTML file) into the site:
//   node scripts/import-mock.mjs "<path to FULL_MOCK.html>" full-mock-06-11-2026
//
// - The big embedded audio, videos and pictures are written to public/mock-media/
//   (a Vercel function can only return 4.5 MB, the file is ~22 MB) and the page
//   points at them instead.
// - Every link (the Telegram channel buttons, footers and the link watchdog) and
//   the background watermarks are taken out. The test password is left as it is.
// - public/mock-guard.js is attached: it keeps the candidate in the test window,
//   fills in the student's name and saves every result to their account.
// The page is written to content/mock/<slug>.html (students only, like the marathons).
// Then add the mock to src/data/mocks.js.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const [src, slug] = process.argv.slice(2);
if (!src || !/^[a-z0-9-]+$/.test(slug || '')) {
  console.error('Usage: node scripts/import-mock.mjs <file.html> <slug>');
  process.exit(1);
}
let html = readFileSync(src, 'utf8');

// ---- 1. media out of the page ----
const EXT = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'video/mp4': 'mp4', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
mkdirSync('public/mock-media', { recursive: true });
const media = [];
{
  // A plain scan: a regex over a 17 MB data URI overflows the stack.
  const B64 = /[A-Za-z0-9+/=]/;
  const head = /data:([a-z0-9/+.-]+);base64,/g;
  let out = '';
  let from = 0;
  for (let m; (m = head.exec(html)); ) {
    let end = head.lastIndex;
    while (end < html.length && B64.test(html[end])) end++;
    const ext = EXT[m[1]];
    if (!ext || end - head.lastIndex < 40000) continue;
    const bytes = Buffer.from(html.slice(head.lastIndex, end), 'base64');
    const name = `${slug}-${createHash('sha256').update(bytes).digest('hex').slice(0, 10)}.${ext}`;
    writeFileSync(`public/mock-media/${name}`, bytes);
    media.push(`${name} (${(bytes.length / 1048576).toFixed(1)} MB)`);
    out += html.slice(from, m.index) + `/mock-media/${name}`;
    from = end;
    head.lastIndex = end;
  }
  html = out + html.slice(from);
}

// ---- 2. links and watermarks out ----
let missing = 0;
function cut(label, find, replace = '', { all = false, optional = false } = {}) {
  const before = html;
  html = all ? html.replaceAll(find, replace) : html.replace(find, replace);
  if (html === before && !optional) {
    missing++;
    console.warn(`  not found: ${label}`);
  }
}
const anchor = (cls) => new RegExp(`<a class="${cls}"[^>]*>[\\s\\S]*?</a>`, 'g');
cut('Telegram buttons in the headers', anchor('tglink'));
cut('Telegram card on the listening start screen', anchor('entry-tg'));
cut('Telegram card on the reading start screen', anchor('channel-promo'), '', { optional: true });
cut('Telegram icon in the reading header', anchor('rcx-tglink'), '', { optional: true });
cut('"More tests on Telegram" button', /'<a class="tgbtn"[^']*?<\/a>' \+/g, "'' +", { optional: true });
// The shell re-creates the channel link every 1.5 s; switch that off and empty the link.
cut('link watchdog', /brandGuard\(\); setInterval\(brandGuard, 1500\);/, '/* READING_CDI site: no channel link */');
cut('channel link', /const TG_URL = _d\('[^']*'\), TG_LABEL = _d\('[^']*'\), TG_SHORT = _d\('[^']*'\);/, "const TG_URL = '', TG_LABEL = '', TG_SHORT = '';");
cut('"More mock tests" link on the report', /\s*<p class="foot">More mock tests: <a href="\$\{TG_URL\}"[^<]*<\/a><\/p>/g, '', { all: true });
cut('"More mock tests" line in the .txt', /,\s*thin, 'More mock tests: ' \+ TG_URL\)/, ')');
cut('channel name in the PDF footer', "doc.text(TG_SHORT + '   ' + i + ' / ' + n,", "doc.text(i + ' / ' + n,");
cut('channel handle in the score sheet footers', / · @READING_CDI/g, '', { all: true, optional: true });
// Watermarks: the logo / grain layer painted behind the start and result screens.
cut('background watermark layers', /(:is\([^{]*\)::before\{content:"";position:absolute;inset:0;pointer-events:none;z-index:0;opacity:\.5;mix-blend-mode:multiply;)background-image:url\("data:image\/svg\+xml;utf8,[^"]*"\);?/g, '$1', { all: true, optional: true });

// Nothing a candidate can click out to may be left (library comments don't count).
const links = [...new Set(html.match(/t\.me\/[\w]+|href="https?:[^"]+"/gi) || [])];
if (links.length) console.warn('  links still in the page:', links.join(', '));

// ---- 3. open the parts as soon as they are ready ----
// The page waited for each part's full load (every picture, font and the audio) and gave
// up after 10 seconds. With the media in separate files that is too slow on a phone, a slow
// connection or with a content blocker. The parts start on DOMContentLoaded, so wait for
// that instead, and for up to a minute.
cut('wait for the part to load', /fr\.contentDocument && fr\.contentDocument\.readyState === 'complete' && typeof/g, "fr.contentDocument && fr.contentDocument.readyState !== 'loading' && typeof", { all: true });
cut('give the part a minute to start', /\} else if\(tries > 200\)\{ clearInterval\(t\); alert\('The (test|review) could not be opened/g, "} else if(tries > 1200){ clearInterval(t); alert('The $1 could not be opened", { all: true });

// ---- 4. the site's guard: stay in the window, save results ----
const guard = `<script>window.__MOCK_ID = ${JSON.stringify(slug)};</script>\n<script src="/mock-guard.js"></script>\n`;
const end = html.lastIndexOf('</body>');
html = html.slice(0, end) + guard + html.slice(end);

mkdirSync('content/mock', { recursive: true });
writeFileSync(`content/mock/${slug}.html`, html);
console.log(`content/mock/${slug}.html: ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB`);
console.log('media:', media.join(', ') || 'none');
if (missing) console.warn(`${missing} expected part(s) not found; check the page.`);
