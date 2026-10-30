// Questions per marathon day, shared by the site and the server (scores are
// checked against them). Listening: 26 questions on Days 1–12, 32 on Days 13–20.
export const LISTENING_QUESTIONS = [26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 32, 32, 32, 32, 32, 32, 32, 32];
export const READING_QUESTIONS = 20;

/** Number of questions on a marathon day (null for an unknown day). */
export function marathonTotal(skill, day) {
  if (skill === 'reading') return READING_QUESTIONS;
  return LISTENING_QUESTIONS[day - 1] ?? null;
}
