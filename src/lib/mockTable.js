// The mock results table: overall band, ranking, and reading the examiner's speaking list.

/** IELTS overall: the average of the four skills, rounded to the nearest half band (.25 and .75 round up). */
export function overallBand(r) {
  const b = [r.listening_band, r.reading_band, r.writing, r.speaking];
  if (b.some((x) => x == null)) return null;
  return Math.round((b.reduce((s, x) => s + Number(x), 0) / 4) * 2) / 2;
}

/** Complete rows first, best overall first; then everyone still waiting for a mark, by name. */
export function rankRows(rows) {
  const done = rows.filter((r) => overallBand(r) != null);
  const pending = rows.filter((r) => overallBand(r) == null);
  const sum = (r) => r.listening_band + r.reading_band + r.writing + r.speaking;
  done.sort(
    (a, b) =>
      overallBand(b) - overallBand(a) ||
      sum(b) - sum(a) ||
      (b.listening_correct ?? 0) + (b.reading_correct ?? 0) - ((a.listening_correct ?? 0) + (a.reading_correct ?? 0)) ||
      a.full_name.localeCompare(b.full_name),
  );
  pending.sort((a, b) => a.full_name.localeCompare(b.full_name));
  return [...done, ...pending];
}

/**
 * The examiner's list, one candidate a line: "Rustam 7.5 (8/8/7/8)".
 * The band may also come last or be left out (then it is the average of the four parts).
 */
export function parseSpeaking(text) {
  const out = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const partsMatch = line.match(/(\d(?:\.5)?)\s*\/\s*(\d(?:\.5)?)\s*\/\s*(\d(?:\.5)?)\s*\/\s*(\d(?:\.5)?)/);
    const parts = partsMatch ? partsMatch.slice(1, 5).map(Number) : null;
    const rest = partsMatch ? line.replace(partsMatch[0], ' ') : line;
    const bandMatch = rest.match(/(?:^|\s)(\d(?:[.,]5|[.,]0)?)(?=\s|$|[()\-–—:])/);
    let band = bandMatch ? Number(bandMatch[1].replace(',', '.')) : null;
    if (band != null && (band > 9 || band < 0)) band = null;
    if (band == null && parts) band = Math.round((parts.reduce((a, b) => a + b, 0) / 4) * 2) / 2;
    const name = rest
      .replace(bandMatch ? bandMatch[0] : '', ' ')
      .replace(/[()[\]\-–—:;,|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!name) continue;
    out.push({ name, speaking: band, speaking_parts: parts ? parts.join('/') : '', line });
  }
  return out;
}

// Uzbek names are written several ways (Javohir / Javoxir, Sug'diyona / So'g'diyona, Sultanov / Sultonov).
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[ʻʼ’‘`´'"]/g, '')
    .replace(/x/g, 'h')
    .replace(/[^a-zа-яё0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3);

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const close = (a, b) => a === b || (Math.min(a.length, b.length) >= 5 && distance(a, b) <= (Math.min(a.length, b.length) >= 9 ? 2 : 1));

/** How well a written name fits a student's name: the number of its words found there. */
export function nameScore(written, full) {
  const want = norm(written);
  const have = norm(full);
  let n = 0;
  for (const w of want) if (have.some((h) => close(w, h))) n++;
  return n;
}

/** The row a written name most likely means, or null when none (or more than one) fits best. */
export function bestMatch(written, rows) {
  let best = null;
  let top = 0;
  let tie = false;
  for (const r of rows) {
    const s = nameScore(written, r.full_name);
    if (s > top) {
      top = s;
      best = r;
      tie = false;
    } else if (s === top && s > 0) tie = true;
  }
  return top > 0 && !tie ? best : null;
}
