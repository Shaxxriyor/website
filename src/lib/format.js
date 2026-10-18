// Shared labels and formatting for the student management pages.

export const LEVELS = [
  { id: 'A1', label: 'A1', name: 'Beginner' },
  { id: 'A2', label: 'A2', name: 'Elementary' },
  { id: 'B1', label: 'B1', name: 'Intermediate' },
  { id: 'B2', label: 'B2', name: 'Upper-Intermediate' },
  { id: 'C1', label: 'C1', name: 'Advanced' },
  { id: 'C2', label: 'C2', name: 'Proficiency' },
];
export const levelName = (id) => LEVELS.find((l) => l.id === id)?.name ?? id;

// Fixed order: colour follows the skill everywhere (chart, chips, bars).
export const SKILLS = [
  { key: 'reading', label: 'Reading', color: 'var(--chart-reading)', tone: 'lilac' },
  { key: 'listening', label: 'Listening', color: 'var(--chart-listening)', tone: 'rose' },
  { key: 'vocabulary', label: 'Vocabulary', color: 'var(--chart-vocabulary)', tone: 'peach' },
  { key: 'mock', label: 'Mock test', color: 'var(--chart-mock)', tone: 'mint' },
  { key: 'other', label: 'Other', color: 'var(--chart-other)', tone: 'sand' },
];
export const skillMeta = (key) => SKILLS.find((s) => s.key === key) ?? SKILLS.at(-1);

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export function formatDate(iso, { short = false } = {}) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return (short ? shortFmt : dateFmt).format(d);
}

/** "Today", "Yesterday", or a date — for lesson list section headers. */
export function relativeDay(iso) {
  const today = todayISO();
  if (iso === today) return 'Today';
  const y = new Date(`${today}T00:00:00`);
  y.setDate(y.getDate() - 1);
  if (iso === new Date(y.getTime() - y.getTimezoneOffset() * 60000).toISOString().slice(0, 10)) return 'Yesterday';
  return formatDate(iso, { short: iso.slice(0, 4) === today.slice(0, 4) });
}

export function hours(minutes) {
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

export function duration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export const band = (b) => (b == null ? '—' : Number(b).toFixed(1));
