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

import { readingMarathon } from '../data/mock.js';

export const MARATHON_DAYS = 20;
export const MARATHON_TOTAL = { reading: 13, listening: 20 };

// Practice categories in fixed order: colour follows the category everywhere
// (chart, chips, rows). Keys match the API's `${kind}_${skill}`.
export const CATEGORIES = [
  { key: 'marathon_reading', kind: 'marathon', skill: 'reading', label: 'Reading Marathon', short: 'Reading Marathon', color: 'var(--chart-reading)', tone: 'lilac' },
  { key: 'marathon_listening', kind: 'marathon', skill: 'listening', label: 'Listening Marathon', short: 'Listening Marathon', color: 'var(--chart-listening)', tone: 'rose' },
  { key: 'exercise_reading', kind: 'exercise', skill: 'reading', label: 'Reading exercise', short: 'Reading ex.', color: 'var(--chart-vocabulary)', tone: 'peach' },
  { key: 'exercise_listening', kind: 'exercise', skill: 'listening', label: 'Listening exercise', short: 'Listening ex.', color: 'var(--chart-mock)', tone: 'mint' },
];
export const categoryOf = (l) => CATEGORIES.find((c) => c.kind === l.kind && c.skill === l.skill) ?? CATEGORIES[2];

const readingTitles = Object.fromEntries(readingMarathon.days.map((d) => [d.day, d.title]));

/** Passage / section title for a marathon day, when we know it. */
export function marathonTitle(skill, day) {
  if (skill === 'reading') return readingTitles[day] ?? null;
  return 'Sections 2 & 3';
}

/** "Day 7 · The internal body clock" for marathon records, the exercise name otherwise. */
export function practiceTitle(l) {
  if (l.kind === 'marathon') {
    const t = l.topic || marathonTitle(l.skill, l.day);
    return `Day ${l.day}${t ? ` · ${t}` : ''}`;
  }
  return l.topic;
}

export const score = (l) => (l.correct == null ? null : `${l.correct}/${l.total}`);
export const scorePct = (l) => (l.correct == null || !l.total ? null : Math.round((l.correct / l.total) * 100));

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

