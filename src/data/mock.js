// Home page content: categories, course cards and the marathon day lists.
import {
  ReadingIcon,
  ListeningIcon,
  ReadingMarathonIcon,
  ListeningMarathonIcon,
  VocabularyIcon,
  MockTestIcon,
  BookIcon,
} from '../components/Icons.jsx';
import { LISTENING_QUESTIONS, READING_QUESTIONS } from '../lib/marathons.js';

// Static files in /public are served next to index.html, wherever it lives.
const asset = (path) => `${import.meta.env.BASE_URL}${path}`;

export const categories = [
  { id: 'all', label: 'All' },
  { id: 'reading-practice', label: 'Reading Practice', icon: ReadingIcon },
  { id: 'listening-practice', label: 'Listening Practice', icon: ListeningIcon },
  { id: 'reading-marathon', label: 'Reading Marathon', icon: ReadingMarathonIcon },
  { id: 'listening-marathon', label: 'Listening Marathon', icon: ListeningMarathonIcon },
  { id: 'els', label: 'ELS Reading', icon: BookIcon },
  { id: 'vocabulary', label: 'Vocabulary', icon: VocabularyIcon },
  { id: 'mock', label: 'Mock Tests', icon: MockTestIcon },
];

// Home page cards. `tab` opens that tab; cards without one are announced as coming soon.
export const popularCourses = [
  {
    id: 'reading-marathon',
    tone: 'mint',
    category: 'Reading Marathon',
    skill: 'reading',
    icon: ReadingMarathonIcon,
    badge: 'New',
    title: 'Reading Marathon: 20 Days, 20 Questions a Day',
    meta: 'Each day: 20-question passage + ELS exercise & translation',
    tab: 'reading-marathon',
  },
  {
    id: 'listening-marathon',
    tone: 'peach',
    category: 'Listening Marathon',
    skill: 'listening',
    icon: ListeningMarathonIcon,
    badge: 'New',
    title: 'Listening Marathon: 20 Days of Full CDI Practice',
    meta: '20 days · 4 parts a day · audio included',
    tab: 'listening-marathon',
  },
  {
    id: 'reading-practice',
    tone: 'rose',
    category: 'Reading Practice',
    skill: 'reading',
    icon: ReadingIcon,
    badge: 'New',
    title: 'Reading Practice: 137 Real Exam Passages',
    meta: 'Passage 1, 2 and 3 · 13–14 questions each',
    tab: 'reading-practice',
  },
  {
    id: 'listening-practice',
    tone: 'peach',
    category: 'Listening Practice',
    skill: 'listening',
    icon: ListeningIcon,
    badge: 'New',
    title: 'Listening Practice: 101 Full IELTS Tests',
    meta: '4 parts · 40 questions · audio & transcripts',
    tab: 'listening-practice',
  },
  {
    id: 'vocabulary',
    tone: 'mint',
    category: 'Vocabulary',
    skill: 'reading',
    icon: VocabularyIcon,
    badge: 'New',
    title: 'Vocabulary: 4000 Essential Words & Collocations in Use',
    meta: 'Flashcards · 600 words · 2,352 collocations · Uzbek translations',
    tab: 'vocabulary',
  },
  {
    id: 'els',
    tone: 'lilac',
    category: 'ELS Reading',
    skill: 'reading',
    icon: BookIcon,
    badge: 'New',
    title: 'ELS Reading: 20 Days of Reading & Translation',
    meta: 'Read · do the exercises · upload your notebook translation',
    tab: 'els',
  },
];

// Listening Marathon: 20 days, 4 parts each.
export const listeningMarathon = {
  title: 'Listening Marathon',
  subtitle: '20 days in CDI format · 4 parts a day · audio included',
  days: LISTENING_QUESTIONS.map((questions, i) => {
    const n = String(i + 1).padStart(2, '0');
    return { day: i + 1, title: 'Parts 1–4', questions, href: asset(`marathon/listening/day-${n}.html`) };
  }),
};

// Reading Marathon: 20 passages with 20 questions each, from Passage 1 (Days 1–7)
// to Passage 3 (Days 15–20). Each day also has its ELS Reading exercise.
export const readingMarathon = {
  title: 'Reading Marathon',
  subtitle: 'Each day: a 20-question reading passage in CDI format + the ELS Reading exercise with your notebook translation',
  days: [
    [1, "A survivor's story", 1],
    [2, "Ahead of its Time", 1],
    [3, "Sleep Study on Modern-Day Hunter-Gatherers Dispels Popular Notions", 1],
    [4, "The Baobabs of Madagascar", 1],
    [5, "The History of the Chicken", 1],
    [6, "The History of the Pencil (version 2)", 1],
    [7, "The Importance of Business Cards", 1],
    [8, "Coins – the first form of money", 2],
    [9, "Coral Reefs", 2],
    [10, "Dark Chocolate's Health-giving Benefits", 2],
    [11, "Growing more for less", 2],
    [12, "Is Graffiti Art or Crime?", 2],
    [13, "Nanotechnology: the Science of the Very Small", 2],
    [14, "Roller coaster: the great fairground attraction", 2],
    [15, "Elephant Communication", 3],
    [16, "Flower Power", 3],
    [17, "Living Dunes", 3],
    [18, "Robert Louis Stevenson", 3],
    [19, "Science and filmmaking", 3],
    [20, "Whale Culture", 3],
  ].map(([day, title, passage]) => ({
    day,
    title,
    passage,
    questions: READING_QUESTIONS,
    href: asset(`marathon/reading/day-${String(day).padStart(2, '0')}.html`),
  })),
};
