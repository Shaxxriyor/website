// IELTS band from a raw score, used by the server and the UI.
// Reading uses the same 40-question table as the READING_CDI test pages (a single
// passage is scaled onto it first); Listening uses the standard listening table.

const READING = [[40, 9], [38, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [20, 5.5], [16, 5], [14, 4.5], [12, 4], [10, 3.5], [8, 3], [1, 2.5]];
const LISTENING = [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [1, 2]];

/** Band (0–9 in halves) for `correct` out of `total`, or null when there is no score. */
export function bandFor(skill, correct, total) {
  if (correct == null || !total) return null;
  const scaled = Math.round((correct / total) * 40);
  const table = skill === 'listening' ? LISTENING : READING;
  for (const [min, band] of table) if (scaled >= min) return band;
  return 0;
}

/** Overall band from several results, rounded to the nearest half band like IELTS does. */
export function averageBand(bands) {
  const list = bands.filter((b) => b != null);
  if (!list.length) return null;
  return Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 2) / 2;
}

export const formatBand = (b) => (b == null ? '—' : Number(b).toFixed(1));
