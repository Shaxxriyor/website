import { readingPractice } from '../data/readingPractice.js';

// Who may open what. Shared by the server (api/content) and the UI.
//
// Every section is opened per student by the teacher (students.access). A student
// who signed up on the site starts with none of them and may try one item of each
// section (Day 1, one test, Unit 1) until the teacher opens it. Mock tests have no
// trial. Visitors without an account open nothing: they are asked to sign up.

export const SECTIONS = [
  { key: 'reading-marathon', label: 'Reading Marathon', trial: 'Day 1' },
  { key: 'listening-marathon', label: 'Listening Marathon', trial: 'Day 1' },
  { key: 'reading-practice', label: 'Reading Practice', trial: 'one passage' },
  { key: 'listening-practice', label: 'Listening Practice', trial: 'Test 1' },
  { key: 'vocabulary', label: 'Vocabulary', trial: 'Unit 1' },
  { key: 'mock', label: 'Mock Tests', trial: null },
];
export const SECTION_KEYS = SECTIONS.map((s) => s.key);
export const sectionLabel = (key) => SECTIONS.find((s) => s.key === key)?.label ?? key;

/** Only known section keys, each once, in the usual order. */
export const cleanAccess = (list) => SECTION_KEYS.filter((k) => Array.isArray(list) && list.includes(k));

/** The section a content path belongs to (null for anything else). */
export function sectionOf(path) {
  if (path.startsWith('marathon/reading/')) return 'reading-marathon';
  if (path.startsWith('marathon/listening/')) return 'listening-marathon';
  if (path.startsWith('practice/reading/')) return 'reading-practice';
  if (path.startsWith('practice/listening/')) return 'listening-practice';
  if (path.startsWith('vocab/')) return 'vocabulary';
  if (path.startsWith('mock/')) return 'mock';
  return null;
}

// The one item of each section a signed-up student may try before it is opened.
export const TRIAL_PRACTICE_ID = readingPractice.find((p) => p.passage === 1)?.id;
export const TRIAL_LISTENING_ID = 'test-1';
export const TRIAL_DAY = 1;
export const TRIAL_UNIT = 1;

const TRIAL = new Set([
  'marathon/reading/day-01.html',
  'marathon/listening/day-01.html',
  `practice/reading/${TRIAL_PRACTICE_ID}.html`,
  `practice/listening/${TRIAL_LISTENING_ID}.html`,
  'vocab/essential-words-5/unit-01.json',
  'vocab/collocations/unit-01.json',
]);

export const isTrialPath = (path) => TRIAL.has(path);
export const isTrialPractice = (id) => id === TRIAL_PRACTICE_ID || id === TRIAL_LISTENING_ID;

/** A visitor tapped a locked item: the side panel asks them to create an account. */
export function askToSignIn(what, kind = 'marathon') {
  window.dispatchEvent(new CustomEvent('rcdi:need-signin', { detail: { what, kind } }));
}

/** A signed-in student tapped a section the teacher hasn't opened for them yet. */
export function askForAccess(what, section) {
  window.dispatchEvent(new CustomEvent('rcdi:need-access', { detail: { what, section } }));
}
