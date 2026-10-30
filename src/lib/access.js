import { readingPractice } from '../data/readingPractice.js';

// What visitors (not signed in) may open: Day 1 of ELS Reading, unit 1 of each vocabulary book, the first
// passage of each Passage group. Students registered by the teacher: every marathon and ELS day;
// Reading Practice only once the teacher opens it for the student. Shared by the server (api/content) and the UI.
export const FREE_PRACTICE_IDS = [1, 2, 3].map((n) => readingPractice.find((p) => p.passage === n)?.id).filter(Boolean);

const FREE = new Set([
  'els/day-01-1.webp',
  'els/day-01-2.webp',
  'els/day-01.pdf',
  ...FREE_PRACTICE_IDS.map((id) => `practice/reading/${id}.html`),
  'practice/listening/test-1.html',
  'vocab/essential-words-5/unit-01.json',
  'vocab/collocations/unit-01.json',
]);

export const isFreePath = (path) => FREE.has(path);
export const isFreeDay = (day) => day === 1;
export const isFreePractice = (id) => FREE_PRACTICE_IDS.includes(id) || id === 'test-1';

/** Ask the sign-in panel to show itself (used when a visitor taps a locked item). */
export function askToSignIn(what, kind = 'marathon') {
  window.dispatchEvent(new CustomEvent('rcdi:need-signin', { detail: { what, kind } }));
}
