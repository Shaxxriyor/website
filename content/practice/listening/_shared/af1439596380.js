
/* ═══════════════════════════════════════════════════════════════════════════
   PDFX · one-click vector PDF export for the CDI V3 report sheets
   ───────────────────────────────────────────────────────────────────────────
   ONE implementation, shared verbatim by Writing, Listening and Reading. The
   only thing that differs per test is the config object passed to PDFX.save():
   which element carries the sheets, how to build it, the page box, and what to
   call the file. Nothing in here knows anything about a particular paper.

   Why this and not jsPDF + html2canvas.
     html2canvas screenshots the DOM into a bitmap. The report would stop being
     text: unselectable, unsearchable, fuzzy on a 600dpi printer, and megabytes
     per file. jsPDF alone is ~360KB of library to draw shapes we can draw
     ourselves in a twentieth of that. So PDFX walks the already-typeset report
     DOM and re-emits it as PDF vector operators — real text objects, real
     paths — using the browser's own layout for every position and line break.
     The result is a small PDF whose text is selectable, searchable and
     extractable, produced offline, with no library and no network.

   What is NOT vector: the CDI logo, a 128x128 PNG brand mark, which is a
   picture and is embedded as one (losslessly, Flate-compressed RGB). That is
   the only raster object in the file.

   Type: the report is designed in Bricolage Grotesque and Be Vietnam Pro,
   which are Google-hosted and therefore absent whenever these files are opened
   offline — the sheet already falls back to the system UI face there. Rather
   than embed several hundred KB of webfont into a file that has to run from a
   memory stick, PDFX sets the sheet in Helvetica, one of the 14 fonts every
   PDF reader is required to have built in: zero bytes, universally rendered,
   perfectly extractable. Every line break, every line position and every line
   width is still the browser's own — each line is fitted to the exact box the
   browser laid out for it — so the page geometry is identical either way.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
'use strict';

var PT = 72 / 96;          /* one CSS pixel in PDF points */
var MM = 72 / 25.4;        /* one millimetre in PDF points */
var K  = 0.5522847498;     /* circle-to-bezier constant */

/* ── 1 · WinAnsiEncoding ────────────────────────────────────────────────────
   The single-byte encoding the standard fonts are used with. Latin-1 plus the
   printer's punctuation the report actually uses — the en dash in "1–20", the
   middle dot in the footer, the curly apostrophe in "Teacher's notes".        */
var WIN = (function () {
  var m = {}, i;
  for (i = 32; i < 127; i++) m[String.fromCharCode(i)] = i;
  for (i = 160; i < 256; i++) m[String.fromCharCode(i)] = i;
  var hi = { 0x20AC:0x80, 0x201A:0x82, 0x0192:0x83, 0x201E:0x84, 0x2026:0x85,
             0x2020:0x86, 0x2021:0x87, 0x02C6:0x88, 0x2030:0x89, 0x0160:0x8A,
             0x2039:0x8B, 0x0152:0x8C, 0x017D:0x8E, 0x2018:0x91, 0x2019:0x92,
             0x201C:0x93, 0x201D:0x94, 0x2022:0x95, 0x2013:0x96, 0x2014:0x97,
             0x02DC:0x98, 0x2122:0x99, 0x0161:0x9A, 0x203A:0x9B, 0x0153:0x9C,
             0x017E:0x9E, 0x0178:0x9F };
  for (var k in hi) m[String.fromCharCode(k)] = hi[k];
  m[' '] = 32;        /* nbsp prints as a space */
  m['‑'] = 45;        /* non-breaking hyphen */
  m['​'] = -1;        /* zero-width space: drop */
  return m;
})();

/* The two status marks the Listening answer record uses live in ZapfDingbats,
   which is also built into every reader. '3' is U+2713 and '7' is U+2717; a
   ToUnicode map is written for the font so pdftotext still extracts the real
   characters rather than the digits. */
var DINGBAT = { '✓': 0x33, '✔': 0x34, '✗': 0x37, '✘': 0x38,
                '✕': 0x35, '✖': 0x36 };
var DINGBAT_UNI = { 0x33:0x2713, 0x34:0x2714, 0x35:0x2715, 0x36:0x2716, 0x37:0x2717, 0x38:0x2718 };

var winMisses = 0;
function toWin(s) {
  var out = [], i, ch, c;
  for (i = 0; i < s.length; i++) {
    ch = s[i];
    c = WIN[ch];
    if (c === -1) continue;
    if (c === undefined) {
      /* Strip the accent and try again — "Đặng" sets as "Dang" rather than as
         a row of question marks. Anything still unmappable becomes '?'.      */
      var f = ch.normalize ? ch.normalize('NFD').replace(/[̀-ͯ]/g, '') : ch;
      c = (f.length === 1 && WIN[f] !== undefined) ? WIN[f] : undefined;
      if (c === undefined) { c = 63; winMisses++; }
    }
    out.push(c);
  }
  return out;
}

/* ── 2 · the PDF file ───────────────────────────────────────────────────────
   Objects, one content stream per page, Flate via the browser's own
   CompressionStream (zlib is exactly what /FlateDecode wants). No library.   */
function Doc(wPt, hPt, meta) {
  this.w = wPt; this.h = hPt; this.meta = meta || {};
  this.objs = [];            /* 1-based; each entry is a Uint8Array or string */
  this.pages = [];
  this.fonts = {};           /* psName -> {res:'/Fa', obj:n} */
  this.images = {};          /* key    -> {res:'/Ia', obj:n, w, h} */
  this.buf = null;
}
Doc.prototype.alloc = function () { this.objs.push(null); return this.objs.length; };
Doc.prototype.put = function (n, body) { this.objs[n - 1] = body; return n; };
Doc.prototype.add = function (body) { var n = this.alloc(); return this.put(n, body); };

Doc.prototype.font = function (ps) {
  if (this.fonts[ps]) return this.fonts[ps].res;
  var res = '/F' + (Object.keys(this.fonts).length + 1);
  var n = this.alloc();
  var d = '<< /Type /Font /Subtype /Type1 /BaseFont /' + ps;
  if (ps === 'ZapfDingbats') {
    var tu = this.alloc();
    d += ' /ToUnicode ' + tu + ' 0 R >>';
    var lines = '';
    for (var c in DINGBAT_UNI) lines += '<' + (+c).toString(16).padStart(2, '0') + '> <' + DINGBAT_UNI[c].toString(16).padStart(4, '0') + '>\n';
    var cmap = '/CIDInit /ProcSet findresource begin 12 dict begin begincmap\n' +
      '/CMapName /PDFX-Dingbats def /CMapType 2 def\n' +
      '1 begincodespacerange <00> <FF> endcodespacerange\n' +
      Object.keys(DINGBAT_UNI).length + ' beginbfchar\n' + lines + 'endbfchar\n' +
      'endcmap CMapName currentdict /CMap defineresource pop end end';
    this.put(tu, streamObj('<< /Length ' + cmap.length + ' >>', cmap));
  } else {
    d += ' /Encoding /WinAnsiEncoding >>';
  }
  /* No /Widths: for the 14 standard fonts every reader carries exact metrics,
     and omitting the array keeps the file small and the metrics authoritative. */
  this.put(n, d);
  this.fonts[ps] = { res: res, obj: n };
  return res;
};

function streamObj(dict, data) { return { dict: dict, data: data }; }

/* ── content stream builder ────────────────────────────────────────────── */
function Page(doc) { this.doc = doc; this.ops = []; this.res = {}; }
Page.prototype.o = function (s) { this.ops.push(s); return this; };
function f2(v) { return (Math.round(v * 100) / 100).toString(); }
Page.prototype.X = function (x) { return f2(x); };
Page.prototype.Y = function (y) { return f2(this.doc.h - y); };

Page.prototype.q = function () { return this.o('q'); };
Page.prototype.Q = function () { return this.o('Q'); };
Page.prototype.fill = function (c) { return this.o(f2c(c[0]) + ' ' + f2c(c[1]) + ' ' + f2c(c[2]) + ' rg'); };
Page.prototype.strokeCol = function (c) { return this.o(f2c(c[0]) + ' ' + f2c(c[1]) + ' ' + f2c(c[2]) + ' RG'); };
function f2c(v) { return (Math.round(v / 255 * 1000) / 1000).toString(); }

/* A rounded rectangle, given in points with y measured DOWN from the top of
   the sheet. r is [tl, tr, br, bl]; zero radii degenerate to a plain box.    */
Page.prototype.path = function (x, y, w, h, r) {
  if (w <= 0 || h <= 0) return this;
  r = r || [0, 0, 0, 0];
  var mx = Math.min(w, h) / 2, i;
  var q = [];
  for (i = 0; i < 4; i++) q[i] = Math.max(0, Math.min(r[i] || 0, mx));
  var X = this.X.bind(this), Y = this.Y.bind(this);
  if (!q[0] && !q[1] && !q[2] && !q[3]) {
    return this.o(X(x) + ' ' + Y(y + h) + ' ' + f2(w) + ' ' + f2(h) + ' re');
  }
  var x0 = x, x1 = x + w, y0 = y, y1 = y + h;
  this.o(X(x0 + q[0]) + ' ' + Y(y0) + ' m');
  this.o(X(x1 - q[1]) + ' ' + Y(y0) + ' l');
  this.o(X(x1 - q[1] + q[1] * K) + ' ' + Y(y0) + ' ' + X(x1) + ' ' + Y(y0 + q[1] - q[1] * K) + ' ' + X(x1) + ' ' + Y(y0 + q[1]) + ' c');
  this.o(X(x1) + ' ' + Y(y1 - q[2]) + ' l');
  this.o(X(x1) + ' ' + Y(y1 - q[2] + q[2] * K) + ' ' + X(x1 - q[2] + q[2] * K) + ' ' + Y(y1) + ' ' + X(x1 - q[2]) + ' ' + Y(y1) + ' c');
  this.o(X(x0 + q[3]) + ' ' + Y(y1) + ' l');
  this.o(X(x0 + q[3] - q[3] * K) + ' ' + Y(y1) + ' ' + X(x0) + ' ' + Y(y1 - q[3] + q[3] * K) + ' ' + X(x0) + ' ' + Y(y1 - q[3]) + ' c');
  this.o(X(x0) + ' ' + Y(y0 + q[0]) + ' l');
  this.o(X(x0) + ' ' + Y(y0 + q[0] - q[0] * K) + ' ' + X(x0 + q[0] - q[0] * K) + ' ' + Y(y0) + ' ' + X(x0 + q[0]) + ' ' + Y(y0) + ' c');
  return this.o('h');
};
Page.prototype.poly = function (pts) {
  for (var i = 0; i < pts.length; i++) {
    this.o(this.X(pts[i][0]) + ' ' + this.Y(pts[i][1]) + (i ? ' l' : ' m'));
  }
  return this.o('h');
};
Page.prototype.box = function (x, y, w, h, col, r) {
  if (!col || col[3] === 0 || w <= 0 || h <= 0) return this;
  return this.fill(over(col)).path(x, y, w, h, r).o('f');
};
Page.prototype.clip = function (x, y, w, h, r) { return this.path(x, y, w, h, r).o('W n'); };

/* Everything on this sheet sits on white paper, so a translucent colour can be
   composited once, here, instead of costing the file a transparency group. */
function over(c) {
  var a = c.length > 3 ? c[3] : 1;
  if (a >= 0.999) return c;
  return [c[0] * a + 255 * (1 - a), c[1] * a + 255 * (1 - a), c[2] * a + 255 * (1 - a), 1];
}

function pdfStr(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b === 40 || b === 41 || b === 92) s += '\\' + String.fromCharCode(b);
    else if (b < 32 || b > 126) s += '\\' + b.toString(8).padStart(3, '0');
    else s += String.fromCharCode(b);
  }
  return '(' + s + ')';
}

/* One text-showing operation: a whole laid-out line, placed at its baseline,
   with the inter-character space tuned so the line occupies exactly the width
   the browser gave it. */
Page.prototype.text = function (bytes, x, yBaseline, size, fontRes, col, charSpace, tm, hScale) {
  if (!bytes.length) return this;
  this.fill(over(col));
  this.o('BT');
  this.o(fontRes + ' ' + f2(size) + ' Tf');
  if (charSpace) this.o(f2r(charSpace) + ' Tc');
  if (hScale && Math.abs(hScale - 100) > 0.05) this.o(f2r(hScale) + ' Tz');
  if (tm) this.o(f2r(tm[0]) + ' ' + f2r(tm[1]) + ' ' + f2r(tm[2]) + ' ' + f2r(tm[3]) + ' ' + f2(tm[4]) + ' ' + f2(tm[5]) + ' Tm');
  else this.o('1 0 0 1 ' + this.X(x) + ' ' + this.Y(yBaseline) + ' Tm');
  this.o(pdfStr(bytes) + ' Tj');
  this.o('ET');
  if (charSpace) this.o('0 Tc');
  if (hScale && Math.abs(hScale - 100) > 0.05) this.o('100 Tz');
  return this;
};
function f2r(v) { return (Math.round(v * 10000) / 10000).toString(); }

Page.prototype.image = function (res, x, y, w, h) {
  return this.o('q').o(f2(w) + ' 0 0 ' + f2(h) + ' ' + this.X(x) + ' ' + this.Y(y + h) + ' cm')
             .o(res + ' Do').o('Q');
};

/* ── 3 · assembling the file ────────────────────────────────────────────── */
async function deflate(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    var cs = new CompressionStream('deflate');
    var out = new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer();
    return new Uint8Array(await out);
  } catch (e) { return null; }
}
function latin1(s) {
  var a = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xff;
  return a;
}
function pdfDate(d) {
  function p(n) { return String(n).padStart(2, '0'); }
  var off = -d.getTimezoneOffset(), sg = off < 0 ? '-' : '+'; off = Math.abs(off);
  return 'D:' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) +
         p(d.getMinutes()) + p(d.getSeconds()) + sg + p(off / 60 | 0) + "'" + p(off % 60);
}

Doc.prototype.build = async function () {
  var self = this;
  var catalog = this.alloc(), pagesObj = this.alloc();
  var kids = [];
  for (var i = 0; i < this.pages.length; i++) {
    var pg = this.pages[i];
    var content = pg.ops.join('\n');
    var raw = latin1(content);
    var zip = await deflate(raw);
    var body = zip || raw;
    var sObj = this.add(streamObj('<< /Length ' + body.length + (zip ? ' /Filter /FlateDecode' : '') + ' >>', body));
    var resFonts = '', k;
    for (k in this.fonts) resFonts += this.fonts[k].res + ' ' + this.fonts[k].obj + ' 0 R ';
    var resImgs = '';
    for (k in this.images) resImgs += this.images[k].res + ' ' + this.images[k].obj + ' 0 R ';
    var pObj = this.add('<< /Type /Page /Parent ' + pagesObj + ' 0 R /MediaBox [0 0 ' + f2(this.w) + ' ' + f2(this.h) + ']' +
      ' /Resources << /ProcSet [/PDF /Text /ImageC]' +
      (resFonts ? ' /Font << ' + resFonts + '>>' : '') +
      (resImgs ? ' /XObject << ' + resImgs + '>>' : '') + ' >>' +
      ' /Contents ' + sObj + ' 0 R >>');
    kids.push(pObj + ' 0 R');
  }
  this.put(pagesObj, '<< /Type /Pages /Count ' + kids.length + ' /Kids [' + kids.join(' ') + '] >>');
  this.put(catalog, '<< /Type /Catalog /Pages ' + pagesObj + ' 0 R >>');
  var now = new Date();
  var info = this.add('<< /Title ' + pdfStr(toWin(this.meta.title || 'Test Report')) +
    ' /Author ' + pdfStr(toWin(this.meta.author || 'CDI Materials')) +
    ' /Subject ' + pdfStr(toWin(this.meta.subject || 'IELTS practice Test Report Form')) +
    ' /Creator ' + pdfStr(toWin('CDI Materials')) +
    ' /Producer ' + pdfStr(toWin('PDFX vector exporter')) +
    ' /CreationDate ' + pdfStr(toWin(pdfDate(now))) + ' /ModDate ' + pdfStr(toWin(pdfDate(now))) + ' >>');

  /* serialise */
  var chunks = [], len = 0, offsets = [];
  function push(u8) { chunks.push(u8); len += u8.length; }
  push(latin1('%PDF-1.4\n%âãÏÓ\n'));
  for (var n = 1; n <= this.objs.length; n++) {
    offsets[n] = len;
    var b = this.objs[n - 1];
    push(latin1(n + ' 0 obj\n'));
    if (b && b.dict !== undefined) {
      push(latin1(b.dict + '\nstream\n'));
      push(typeof b.data === 'string' ? latin1(b.data) : b.data);
      push(latin1('\nendstream'));
    } else {
      push(latin1(String(b == null ? 'null' : b)));
    }
    push(latin1('\nendobj\n'));
  }
  var xref = len;
  var x = 'xref\n0 ' + (this.objs.length + 1) + '\n0000000000 65535 f \n';
  for (n = 1; n <= this.objs.length; n++) x += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
  x += 'trailer\n<< /Size ' + (this.objs.length + 1) + ' /Root ' + catalog + ' 0 R /Info ' + info + ' 0 R >>\n' +
       'startxref\n' + xref + '\n%%EOF\n';
  push(latin1(x));
  var all = new Uint8Array(len), off = 0;
  for (var c = 0; c < chunks.length; c++) { all.set(chunks[c], off); off += chunks[c].length; }
  return all;
};

/* An <img> becomes a lossless Flate-compressed RGB XObject — the one raster
   object in the document, and the only thing here that genuinely is a picture. */
Doc.prototype.addImage = async function (img) {
  var key = img.currentSrc || img.src;
  if (this.images[key]) return this.images[key];
  var nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
  if (!nw || !nh) return null;
  var cap = 512, sc = Math.min(1, cap / Math.max(nw, nh));
  var cw = Math.max(1, Math.round(nw * sc)), ch = Math.max(1, Math.round(nh * sc));
  var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  var cx = cv.getContext('2d', { willReadFrequently: true });
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, cw, ch);   /* the sheet is white */
  cx.drawImage(img, 0, 0, cw, ch);
  var d;
  try { d = cx.getImageData(0, 0, cw, ch).data; } catch (e) { return null; }
  var rgb = new Uint8Array(cw * ch * 3);
  for (var i = 0, j = 0; i < d.length; i += 4) { rgb[j++] = d[i]; rgb[j++] = d[i + 1]; rgb[j++] = d[i + 2]; }
  var zip = await deflate(rgb), body = zip || rgb;
  var res = '/I' + (Object.keys(this.images).length + 1);
  var n = this.add(streamObj('<< /Type /XObject /Subtype /Image /Width ' + cw + ' /Height ' + ch +
    ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ' + body.length +
    (zip ? ' /Filter /FlateDecode' : '') + ' >>', body));
  var rec = { res: res, obj: n, w: cw, h: ch, bytes: body.length };
  this.images[key] = rec;
  return rec;
};

/* ── 4 · CSS helpers ────────────────────────────────────────────────────── */
function col(s) {
  if (!s || s === 'none' || s === 'transparent') return null;
  var m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  var p = m[1].split(/[,\s/]+/).filter(function (t) { return t !== ''; }).map(parseFloat);
  var a = p.length > 3 ? p[3] : 1;
  if (!(a > 0.004)) return null;
  return [p[0], p[1], p[2], a];
}
function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
function radii(cs) {
  return [num(cs.borderTopLeftRadius), num(cs.borderTopRightRadius),
          num(cs.borderBottomRightRadius), num(cs.borderBottomLeftRadius)];
}

/* Which of the 14 built-in faces stands in for this element's type. */
function psFont(cs) {
  var w = parseInt(cs.fontWeight, 10) || 400;
  var it = /italic|oblique/.test(cs.fontStyle);
  var bold = w >= 600;
  var fam = (cs.fontFamily || '').toLowerCase();
  if (/courier|mono/.test(fam)) return 'Courier' + (bold && it ? '-BoldOblique' : bold ? '-Bold' : it ? '-Oblique' : '');
  if (/times|georgia|serif/.test(fam) && !/sans-serif/.test(fam)) return 'Times' + (bold && it ? '-BoldItalic' : bold ? '-Bold' : it ? '-Italic' : '-Roman');
  return 'Helvetica' + (bold && it ? '-BoldOblique' : bold ? '-Bold' : it ? '-Oblique' : '');
}

/* Measurement is done in the very metrics the reader will use: Helvetica on a
   Mac, Arial on Windows, and the two are metric-compatible by design. */
var mctx = null, mcache = {};
function measure(str, ps, sizePx) {
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  var bold = /Bold/.test(ps), it = /Oblique|Italic/.test(ps);
  var stack = /Courier/.test(ps) ? 'Courier, monospace' : /Times/.test(ps) ? '"Times New Roman", Times, serif' : 'Helvetica, Arial, sans-serif';
  var f = (it ? 'italic ' : '') + (bold ? 'bold ' : '') + sizePx + 'px ' + stack;
  if (mctx.font !== f) mctx.font = f;
  return mctx.measureText(str).width;
}
var fmcache = {};
function fontMetrics(cs) {
  var key = cs.fontStyle + '|' + cs.fontWeight + '|' + cs.fontSize + '|' + cs.fontFamily;
  if (fmcache[key]) return fmcache[key];
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  mctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  var m = mctx.measureText('Hxg');
  var r = { asc: m.fontBoundingBoxAscent || num(cs.fontSize) * 0.9,
            desc: m.fontBoundingBoxDescent || num(cs.fontSize) * 0.22 };
  fmcache[key] = r;
  return r;
}

function transformText(s, cs) {
  var t = cs.textTransform;
  if (t === 'uppercase') return s.toUpperCase();
  if (t === 'lowercase') return s.toLowerCase();
  if (t === 'capitalize') return s.replace(/(^|\s)(\S)/g, function (a, b, c) { return b + c.toUpperCase(); });
  return s;
}

/* linear-gradient / repeating-linear-gradient, drawn as vector bands. The
   report uses exactly two: the tricolour rule at the head of page 1 and the
   ruled writing lines in the teacher's-notes box. */
function parseGradient(bg, w, h, pxPerMm) {
  var m = bg.match(/^(repeating-)?linear-gradient\((.*)\)$/);
  if (!m) return null;
  var rep = !!m[1], body = m[2];
  /* split on top-level commas */
  var parts = [], depth = 0, cur = '';
  for (var i = 0; i < body.length; i++) {
    var c = body[i];
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += c;
  }
  parts.push(cur.trim());
  var angle = 180;
  if (/^-?[\d.]+deg$/.test(parts[0]) || /^to /.test(parts[0])) {
    var a0 = parts.shift();
    if (/deg/.test(a0)) angle = parseFloat(a0);
    else angle = /right/.test(a0) ? 90 : /left/.test(a0) ? 270 : /top/.test(a0) ? 0 : 180;
  }
  var horiz = Math.abs(((angle % 360) + 360) % 360 - 90) < 45 || Math.abs(((angle % 360) + 360) % 360 - 270) < 45;
  var span = horiz ? w : h;
  var stops = [];
  for (i = 0; i < parts.length; i++) {
    var p = parts[i];
    var cm = p.match(/^(rgba?\([^)]*\)|#[0-9a-f]+|[a-z]+)\s*(.*)$/i);
    if (!cm) return null;
    var c2 = col(cm[1]);
    var pos = null, ps = cm[2].trim();
    if (ps) {
      if (/%$/.test(ps)) pos = parseFloat(ps) / 100 * span;
      else if (/mm$/.test(ps)) pos = parseFloat(ps) * pxPerMm;
      else if (/px$/.test(ps)) pos = parseFloat(ps);
      else pos = parseFloat(ps);
    }
    stops.push({ c: c2, pos: pos });
  }
  if (stops.length < 2) return null;
  if (stops[0].pos == null) stops[0].pos = 0;
  if (stops[stops.length - 1].pos == null) stops[stops.length - 1].pos = rep ? stops[0].pos + span : span;
  for (i = 1; i < stops.length - 1; i++) {
    if (stops[i].pos != null) continue;
    var a = i - 1; while (stops[a].pos == null) a--;
    var b = i + 1; while (stops[b].pos == null) b++;
    for (var j = a + 1; j < b; j++) stops[j].pos = stops[a].pos + (stops[b].pos - stops[a].pos) * (j - a) / (b - a);
  }
  return { horiz: horiz, rep: rep, stops: stops, period: stops[stops.length - 1].pos - stops[0].pos, reversed: angle > 180 };
}

function paintGradient(pg, g, x, y, w, h) {
  var span = g.horiz ? w : h;
  var period = g.rep ? Math.max(0.2, g.period) : span;
  /* A repeating gradient tiles in BOTH directions from its origin, so the
     repetition that ends just above the top edge is on screen too — that is
     the first ruled line in the teacher's-notes box. */
  var first = 0, last = 0;
  if (g.rep) {
    first = Math.floor((0 - g.stops[g.stops.length - 1].pos) / period) - 1;
    last = Math.ceil((span - g.stops[0].pos) / period) + 1;
  }
  for (var r = first; r <= last; r++) {
    var base = r * period;
    for (var s = 0; s < g.stops.length - 1; s++) {
      var a = g.stops[s], b = g.stops[s + 1];
      if (!a.c && !b.c) continue;
      var p0 = base + a.pos, p1 = base + b.pos;
      if (p0 >= span || p1 <= 0) continue;
      var solid = a.c && b.c && a.c[0] === b.c[0] && a.c[1] === b.c[1] && a.c[2] === b.c[2] && a.c[3] === b.c[3];
      var steps = solid ? 1 : Math.max(1, Math.min(220, Math.round((p1 - p0) * 2)));
      for (var k = 0; k < steps; k++) {
        var q0 = p0 + (p1 - p0) * k / steps, q1 = p0 + (p1 - p0) * (k + 1) / steps;
        var t = steps === 1 ? 0 : (k + 0.5) / steps;
        var c0 = a.c || b.c, c1 = b.c || a.c;
        var c = [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t,
                 (c0[3] === undefined ? 1 : c0[3]) + ((c1[3] === undefined ? 1 : c1[3]) - (c0[3] === undefined ? 1 : c0[3])) * t];
        if (!(c[3] > 0.004)) continue;
        var s0 = Math.max(0, q0), s1 = Math.min(span, q1);
        if (s1 - s0 <= 0.001) continue;
        if (g.horiz) pg.box(x + s0, y, (s1 - s0) + 0.05, h, c);
        else pg.box(x, y + s0, w, (s1 - s0) + 0.05, c);
      }
    }
  }
}

/* ── 5 · walking the sheet ──────────────────────────────────────────────── */
function Painter(doc, pg, origin, scale) {
  this.doc = doc; this.pg = pg;
  this.ox = origin.x; this.oy = origin.y;      /* client px of the sheet's top-left */
  this.px = origin.px; this.py = origin.py;    /* points of the page content origin */
  this.s = scale * PT;                          /* client px -> pt, incl. any fit scale */
  this.pxPerMm = origin.pxPerMm;
  this.imgs = [];
  this.stats = { text: 0, chars: 0, boxes: 0, images: 0 };
}
Painter.prototype.tx = function (clientX) { return this.px + (clientX - this.ox) * this.s; };
Painter.prototype.ty = function (clientY) { return this.py + (clientY - this.oy) * this.s; };
Painter.prototype.d = function (v) { return v * this.s; };

Painter.prototype.decorate = function (el, cs, r) {
  var pg = this.pg;
  var x = this.tx(r.left), y = this.ty(r.top), w = this.d(r.width), h = this.d(r.height);
  if (w <= 0 || h <= 0) return;
  var rad = radii(cs).map(this.d, this);
  var bg = col(cs.backgroundColor);
  var bi = cs.backgroundImage;
  var bw = [num(cs.borderTopWidth), num(cs.borderRightWidth), num(cs.borderBottomWidth), num(cs.borderLeftWidth)];
  var bc = [col(cs.borderTopColor), col(cs.borderRightColor), col(cs.borderBottomColor), col(cs.borderLeftColor)];
  var bs = [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle];
  for (var i = 0; i < 4; i++) if (bs[i] === 'none' || bs[i] === 'hidden') { bw[i] = 0; }

  if (bg) { pg.box(x, y, w, h, bg, rad); this.stats.boxes++; }
  if (bi && bi !== 'none' && bi.indexOf('gradient') > -1) {
    var g = parseGradient(bi, r.width, r.height, this.pxPerMm);
    if (g) {
      var sc = this.s;                       /* client px -> points */
      g.period *= sc;
      for (var gi = 0; gi < g.stops.length; gi++) g.stops[gi].pos *= sc;
      pg.q(); pg.clip(x, y, w, h, rad);
      paintGradient(pg, g, x, y, w, h);   /* gradient stops are in client px */
      pg.Q();
      this.stats.boxes++;
    }
  }
  if (bw[0] || bw[1] || bw[2] || bw[3]) { this.border(x, y, w, h, rad, bw.map(this.d, this), bc); }
};

/* A CSS border is the ring between the padding box and the border box, cut
   into four mitred pieces. Drawing it that way — rather than as four straight
   strips — is what keeps a rounded corner a rounded corner. */
Painter.prototype.border = function (x, y, w, h, rad, t, bc) {
  var pg = this.pg;
  var ix = x + t[3], iy = y + t[0], iw = w - t[3] - t[1], ih = h - t[0] - t[2];
  if (iw < 0) { iw = 0; } if (ih < 0) { ih = 0; }
  var ir = [Math.max(0, rad[0] - Math.max(t[0], t[3])), Math.max(0, rad[1] - Math.max(t[0], t[1])),
            Math.max(0, rad[2] - Math.max(t[2], t[1])), Math.max(0, rad[3] - Math.max(t[2], t[3]))];
  function ring() { pg.path(x, y, w, h, rad); pg.path(ix, iy, iw, ih, ir); }
  function same(a, b) { return !!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && (a[3] || 1) === (b[3] || 1); }
  var uniform = t[0] > 0 && t[0] === t[1] && t[1] === t[2] && t[2] === t[3] &&
                same(bc[0], bc[1]) && same(bc[1], bc[2]) && same(bc[2], bc[3]);
  if (uniform) {
    pg.fill(over(bc[0])); ring(); pg.o('f*');
    this.stats.boxes++;
    return;
  }
  var wedge = [
    [[x, y], [x + w, y], [x + w - t[1], y + t[0]], [x + t[3], y + t[0]]],
    [[x + w, y], [x + w, y + h], [x + w - t[1], y + h - t[2]], [x + w - t[1], y + t[0]]],
    [[x, y + h], [x + w, y + h], [x + w - t[1], y + h - t[2]], [x + t[3], y + h - t[2]]],
    [[x, y], [x, y + h], [x + t[3], y + h - t[2]], [x + t[3], y + t[0]]]
  ];
  for (var i = 0; i < 4; i++) {
    if (!t[i] || !bc[i]) continue;
    pg.q();
    ring(); pg.o('W* n');
    pg.poly(wedge[i]); pg.o('W n');
    pg.fill(over(bc[i]));
    pg.path(x, y, w, h, [0, 0, 0, 0]); pg.o('f');
    pg.Q();
    this.stats.boxes++;
  }
};

/* The lines of one text node, taken from the browser's own line boxes. */
function lineRuns(node) {
  var data = node.data, len = data.length, out = [], rg = document.createRange();
  function sameLine(s, e) {
    rg.setStart(node, s); rg.setEnd(node, e);
    var rs = rg.getClientRects();
    if (!rs.length) return true;
    var t = rs[0].top;
    for (var i = 1; i < rs.length; i++) if (Math.abs(rs[i].top - t) > 0.6) return false;
    return true;
  }
  var start = 0, guard = 0;
  while (start < len && guard++ < 4000) {
    var lo = start + 1, hi = len, best = start + 1;
    if (sameLine(start, len)) { best = len; }
    else {
      while (lo <= hi) {
        var mid = (lo + hi) >> 1;
        if (sameLine(start, mid)) { best = mid; lo = mid + 1; } else hi = mid - 1;
      }
    }
    out.push([start, best]);
    start = best;
  }
  return out;
}

Painter.prototype.textNode = function (node, cs) {
  var raw = node.data;
  if (!raw || !/\S/.test(raw)) return;
  var ps = psFont(cs);
  var size = num(cs.fontSize);
  if (size <= 0) return;
  var color = col(cs.color) || [0, 0, 0, 1];
  var fm = fontMetrics(cs);
  var ls = cs.letterSpacing === 'normal' ? 0 : num(cs.letterSpacing);
  var runs = lineRuns(node);
  var rg = document.createRange();
  for (var i = 0; i < runs.length; i++) {
    var s = runs[i][0], e = runs[i][1];
    /* drop the whitespace the line break consumed, at both ends */
    var a = s, b = e;
    while (a < b && /\s/.test(raw[a]) && cs.whiteSpace.indexOf('pre') !== 0) a++;
    while (b > a && /\s/.test(raw[b - 1])) b--;
    if (b <= a) continue;
    rg.setStart(node, a); rg.setEnd(node, b);
    var rect = rg.getBoundingClientRect();
    if (!rect.width && !rect.height) continue;
    var str = transformText(raw.slice(a, b), cs);
    this.drawLine(str, rect, ps, size, color, fm, ls);
  }
};

/* A line has to end up exactly as wide as the box the browser measured for it,
   or the rules, cells and right-aligned columns stop lining up. The CSS
   letter-spacing is reproduced literally, and whatever is left over — the
   difference in width between the design's webfont and Helvetica, about 9% —
   is taken up by a horizontal scale on the glyphs rather than by pouring it
   all into the tracking, which would visibly space the text out. */
Painter.prototype.fitLine = function (str, n, ps, size, target, tracking) {
  var szPt = this.d(size);
  var tc = this.d(tracking || 0);
  var natural = this.d(measure(str, ps, size)) + tc * Math.max(0, n - 1);
  if (n < 2 || target <= 0 || natural <= 0) return { tc: tc, tz: 100 };
  var tz = target / natural * 100;
  var lo = 84, hi = 122;
  if (tz < lo || tz > hi) {
    var clamped = Math.max(lo, Math.min(hi, tz));
    /* residual goes to the tracking, which is where an extreme case belongs */
    var after = natural * clamped / 100;
    tc += (target - after) / (n - 1) / (clamped / 100);
    tz = clamped;
  }
  return { tc: tc, tz: tz };
};

Painter.prototype.drawLine = function (str, rect, ps, size, color, fm, tracking) {
  var pg = this.pg;
  var baseline = rect.bottom - fm.desc;
  var y = this.ty(baseline);
  var x = this.tx(rect.left);
  var target = this.d(rect.width);
  var szPt = this.d(size);
  /* Dingbats are drawn as their own runs so the rest of the line stays in
     Helvetica and the status marks still extract as the real characters. */
  var runs = [], cur = null, i;
  for (i = 0; i < str.length; i++) {
    var isD = DINGBAT[str[i]] !== undefined;
    if (!cur || cur.d !== isD) { cur = { d: isD, s: '' }; runs.push(cur); }
    cur.s += str[i];
  }
  if (runs.length === 1 && !runs[0].d) {
    var bytes = toWin(str);
    var fit = this.fitLine(str, bytes.length, ps, size, target, tracking);
    pg.text(bytes, x, y, szPt, this.doc.font(ps), color, fit.tc, null, fit.tz);
    this.stats.text++; this.stats.chars += bytes.length;
    return;
  }
  /* mixed run: place each piece at its own measured offset */
  var cx = x, natTotal = 0;
  for (i = 0; i < runs.length; i++) natTotal += this.d(runs[i].d ? runs[i].s.length * size * 0.79 : measure(runs[i].s, ps, size));
  var k = (natTotal > 0 && target > 0) ? target / natTotal : 1;
  if (k < 0.7 || k > 1.4) k = 1;
  for (i = 0; i < runs.length; i++) {
    var r = runs[i];
    if (r.d) {
      var db = [];
      for (var j = 0; j < r.s.length; j++) db.push(DINGBAT[r.s[j]]);
      pg.text(db, cx, y, szPt, this.doc.font('ZapfDingbats'), color, 0, null);
      cx += this.d(r.s.length * size * 0.79) * k;
    } else {
      pg.text(toWin(r.s), cx, y, szPt, this.doc.font(ps), color, 0, null);
      cx += this.d(measure(r.s, ps, size)) * k;
    }
    this.stats.text++; this.stats.chars += r.s.length;
  }
};

/* An inline <svg> is re-emitted as vectors too — the Task 1 bar chart is
   rectangles, rules and Arial labels, all of which the PDF can draw natively,
   so the chart in the file is real vector and stays crisp at any zoom. */
Painter.prototype.svg = function (root) {
  var self = this, pg = this.pg;
  var rootRect = root.getBoundingClientRect();
  if (!rootRect.width || !rootRect.height) return;
  var M0 = root.getScreenCTM();
  if (!M0) return;
  function pt(m, x, y) { return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }; }
  function walk(el) {
    var i;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    var tag = el.tagName.toLowerCase();
    var m = el.getScreenCTM ? el.getScreenCTM() : null;
    if (m) {
      var fill = col(cs.fill === 'none' ? null : cs.fill);
      var strokeC = col(cs.stroke === 'none' ? null : cs.stroke);
      var sw = num(cs.strokeWidth);
      if (tag === 'rect') {
        var x = num(el.getAttribute('x')), y = num(el.getAttribute('y'));
        var w = num(el.getAttribute('width')), h = num(el.getAttribute('height'));
        var p0 = pt(m, x, y), p1 = pt(m, x + w, y + h);
        if (fill) pg.box(self.tx(Math.min(p0.x, p1.x)), self.ty(Math.min(p0.y, p1.y)),
                          Math.abs(self.d(p1.x - p0.x)), Math.abs(self.d(p1.y - p0.y)), fill);
      } else if (tag === 'line') {
        var q0 = pt(m, num(el.getAttribute('x1')), num(el.getAttribute('y1')));
        var q1 = pt(m, num(el.getAttribute('x2')), num(el.getAttribute('y2')));
        var lw = self.d(sw * Math.hypot(m.a, m.b)) || 0.4;
        if (strokeC) {
          pg.strokeCol(over(strokeC));
          pg.o(f2(lw) + ' w');
          pg.o(pg.X(self.tx(q0.x)) + ' ' + pg.Y(self.ty(q0.y)) + ' m ' +
               pg.X(self.tx(q1.x)) + ' ' + pg.Y(self.ty(q1.y)) + ' l S');
        }
      } else if (tag === 'text') {
        self.svgText(el, cs, m);
        return;   /* its character data is consumed here */
      } else if (tag === 'path' || tag === 'polyline' || tag === 'polygon' || tag === 'circle' || tag === 'ellipse') {
        /* not used by the report's chart; skipped rather than mis-drawn */
      }
    }
    for (i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 1) walk(el.childNodes[i]);
    }
  }
  for (var i = 0; i < root.childNodes.length; i++) if (root.childNodes[i].nodeType === 1) walk(root.childNodes[i]);
};

Painter.prototype.svgText = function (el, cs, m) {
  var str = (el.textContent || '').trim();
  if (!str) return;
  var size = num(cs.fontSize);          /* px in the *user* space of the element */
  if (!size) return;
  var ps = psFont(cs);
  var color = col(cs.fill) || [0, 0, 0, 1];
  var x = num(el.getAttribute('x')), y = num(el.getAttribute('y'));
  var len = 0;
  try { len = el.getComputedTextLength(); } catch (e) { len = measure(str, ps, size); }
  var anchor = cs.textAnchor || 'start';
  var dx = anchor === 'middle' ? -len / 2 : anchor === 'end' ? -len : 0;
  /* Compose: user space -> client px -> page points, with y flipped for PDF. */
  var s = this.s, H = this.pg.doc.h;
  var A =  s * m.a,               B = -s * m.b;
  var C = -s * m.c,               D =  s * m.d;
  var E = this.tx(m.a * (x + dx) + m.c * y + m.e);
  var F = H - this.ty(m.b * (x + dx) + m.d * y + m.f);
  var natural = measure(str, ps, size);
  var bytes = toWin(str);
  var tz = (bytes.length > 1 && len > 0 && natural > 0) ? len / natural * 100 : 100;
  if (tz < 84 || tz > 122) tz = 100;
  this.pg.text(bytes, 0, 0, size, this.doc.font(ps), color, 0, [A, B, C, D, E, F], tz);
  this.stats.text++; this.stats.chars += bytes.length;
};

Painter.prototype.walk = function (el) {
  var cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return;
  if (parseFloat(cs.opacity) === 0) return;
  var tag = el.tagName.toLowerCase();
  if (tag === 'style' || tag === 'script' || tag === 'br') return;
  var r = el.getBoundingClientRect();

  if (tag === 'svg') { this.decorate(el, cs, r); this.svg(el); return; }
  this.decorate(el, cs, r);
  if (tag === 'img') {
    var rec = this.imgLookup(el);
    if (rec) {
      var rad = radii(cs).map(this.d, this);
      this.pg.q();
      this.pg.clip(this.tx(r.left), this.ty(r.top), this.d(r.width), this.d(r.height), rad);
      this.pg.image(rec.res, this.tx(r.left), this.ty(r.top), this.d(r.width), this.d(r.height));
      this.pg.Q();
      this.stats.images++;
    }
    return;
  }
  var clipped = cs.overflow !== 'visible' && cs.overflow !== '';
  if (clipped) { this.pg.q(); this.pg.clip(this.tx(r.left), this.ty(r.top), this.d(r.width), this.d(r.height), radii(cs).map(this.d, this)); }
  for (var i = 0; i < el.childNodes.length; i++) {
    var n = el.childNodes[i];
    if (n.nodeType === 1) this.walk(n);
    else if (n.nodeType === 3) this.textNode(n, cs);
  }
  if (clipped) this.pg.Q();
};
Painter.prototype.imgLookup = function (img) { return this.doc.images[img.currentSrc || img.src] || null; };

/* ── 6 · pseudo-elements ────────────────────────────────────────────────────
   getComputedStyle can read a ::before, but nothing can give you its box. The
   section rules in this report are ::before/::after flex children, so before a
   sheet is walked each one is briefly turned into a real element carrying the
   same computed style, and turned back afterwards. The report DOM is rebuilt
   from scratch on every export, so nothing outlives the call.               */
function materialisePseudo(host) {
  var made = [];
  var els = [].slice.call(host.querySelectorAll('*'));
  els.forEach(function (el) {
    ['::before', '::after'].forEach(function (which) {
      var cs;
      try { cs = getComputedStyle(el, which); } catch (e) { return; }
      if (!cs || !cs.content || cs.content === 'none' || cs.content === 'normal') return;
      var txt = '';
      var m = cs.content.match(/^"([\s\S]*)"$/);
      if (m) txt = m[1].replace(/\\([0-9a-f]{1,6})\s?/gi, function (a, h) { return String.fromCodePoint(parseInt(h, 16)); });
      else if (cs.content !== '""') return;    /* counters, attr(), images: left alone */
      var d = document.createElement('span');
      d.setAttribute('data-pdfx-pseudo', which);
      for (var pi = 0; pi < cs.length; pi++) {
        var prop = cs.item(pi);
        if (prop === 'content') continue;
        try { d.style.setProperty(prop, cs.getPropertyValue(prop)); } catch (e) {}
      }
      d.style.setProperty('content', 'normal');
      if (txt) d.textContent = txt;
      if (which === '::before') el.insertBefore(d, el.firstChild); else el.appendChild(d);
      made.push(d);
    });
  });
  return made;
}

/* ── 7 · the export ─────────────────────────────────────────────────────── */
var DEFAULT_PAGE = { w: 210, h: 297, mt: 14, mr: 15, mb: 12, ml: 15 };

async function render(cfg) {
  var host = document.getElementById(cfg.hostId || 'print-report');
  if (!host) throw new Error('report host not found');
  if (cfg.build) cfg.build();
  if (!host.querySelector('.print-page')) throw new Error('report has no pages');

  var box = Object.assign({}, DEFAULT_PAGE, cfg.page || {});
  var colW = box.w - box.ml - box.mr;              /* mm */
  var colH = box.h - box.mt - box.mb;              /* mm */

  /* stage the sheet off-screen at exactly the printed column width */
  ensureStageCss('#' + (cfg.hostId || 'print-report'), colW, colH);
  host.classList.add('pdfx-stage');
  var pseudo = [];
  var doc = new Doc(box.w * MM, box.h * MM, cfg.meta || {});
  var report = { pages: [], scaled: [], stats: null, winMisses: 0 };
  winMisses = 0;
  try {
    /* force layout, then let one frame settle so webfonts/reflow are done */
    host.getBoundingClientRect();
    await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
    pseudo = materialisePseudo(host);

    var probe = document.createElement('div');
    probe.style.cssText = 'height:100mm;width:1mm;position:absolute;visibility:hidden';
    host.appendChild(probe);
    var pxPerMm = probe.getBoundingClientRect().height / 100;
    probe.remove();
    if (!pxPerMm) pxPerMm = 96 / 25.4;

    /* pull every <img> into the file once */
    var imgs = [].slice.call(host.querySelectorAll('img'));
    for (var ii = 0; ii < imgs.length; ii++) {
      if (!imgs[ii].complete) { try { await imgs[ii].decode(); } catch (e) {} }
      await doc.addImage(imgs[ii]);
    }

    var sheets = [].slice.call(host.querySelectorAll('.print-page'));
    var totalStats = { text: 0, chars: 0, boxes: 0, images: 0 };
    for (var i = 0; i < sheets.length; i++) {
      var el = sheets[i];
      var r = el.getBoundingClientRect();
      /* Never let a sheet spill off its page: if the browser laid out more
         than the content box holds, the whole sheet is scaled to fit rather
         than cropped. This is a backstop — the report fitter keeps it at 1. */
      var maxH = colH * pxPerMm;
      var scale = r.height > maxH + 0.5 ? maxH / r.height : 1;
      if (scale < 1) report.scaled.push({ page: i + 1, scale: +scale.toFixed(4), height_mm: +(r.height / pxPerMm).toFixed(2) });
      var pg = new Page(doc);
      doc.pages.push(pg);
      var painter = new Painter(doc, pg, {
        x: r.left, y: r.top, px: box.ml * MM, py: box.mt * MM, pxPerMm: pxPerMm
      }, scale);
      painter.walk(el);
      report.pages.push({ page: i + 1, width_mm: +(r.width / pxPerMm).toFixed(2), height_mm: +(r.height / pxPerMm).toFixed(2), scale: +scale.toFixed(4) });
      totalStats.text += painter.stats.text; totalStats.chars += painter.stats.chars;
      totalStats.boxes += painter.stats.boxes; totalStats.images += painter.stats.images;
    }
    report.stats = totalStats;
    report.winMisses = winMisses;
    var bytes = await doc.build();
    report.bytes = bytes.length;
    report.imageBytes = Object.keys(doc.images).reduce(function (a, k) { return a + doc.images[k].bytes; }, 0);
    report.fonts = Object.keys(doc.fonts);
    return { bytes: bytes, report: report };
  } finally {
    pseudo.forEach(function (d) { if (d.parentNode) d.parentNode.removeChild(d); });
    host.classList.remove('pdfx-stage');
  }
}

var stageEl = null;
function ensureStageCss(sel, colW, colH) {
  var css =
    sel + '.pdfx-stage{display:block!important;position:fixed!important;left:-30000px!important;top:0!important;' +
      'width:' + colW + 'mm!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;' +
      'z-index:-2147483647!important;background:#fff!important;transform:none!important;filter:none!important}' +
    /* height is deliberately NOT touched: the sheet must lay out at exactly the
       height its own print stylesheet gives it, or the export stops matching
       what the print route produces. */
    sel + '.pdfx-stage .print-page{break-after:auto!important;page-break-after:auto!important;' +
      'background:#fff!important;box-shadow:none!important;margin:0!important}' +
    sel + '.pdfx-stage *{box-shadow:none!important;text-shadow:none!important;filter:none!important;' +
      'animation:none!important;transition:none!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}' +
    sel + '.pdfx-stage [data-pdfx-pseudo]{content:normal!important}';
  if (!stageEl) { stageEl = document.createElement('style'); stageEl.id = 'pdfx-stage-css'; document.head.appendChild(stageEl); }
  if (stageEl.textContent !== css) stageEl.textContent = css;
}

function saveBlob(bytes, name) {
  var blob = new Blob([bytes], { type: 'application/pdf' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  a.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    if (a.parentNode) a.parentNode.removeChild(a);
    URL.revokeObjectURL(url);
  }, 4000);
}

/* The one entry point. Resolves with a small report about what it produced,
   which the verification harness reads and the app ignores. */
async function save(cfg) {
  cfg = cfg || {};
  var out = await render(cfg);
  var name = (typeof cfg.fileName === 'function' ? cfg.fileName() : cfg.fileName) || 'Test-Report';
  if (!/\.pdf$/i.test(name)) name += '.pdf';
  saveBlob(out.bytes, name);
  out.report.fileName = name;
  global.__PDFX_LAST = out.report;
  return out.report;
}

global.PDFX = { save: save, render: render, version: '1.0' };
})(window);

