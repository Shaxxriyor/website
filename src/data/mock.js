// Home page content: categories, course cards and the marathon day lists.
import {
  ReadingIcon,
  ListeningIcon,
  ReadingMarathonIcon,
  ListeningMarathonIcon,
  VocabularyIcon,
  MockTestIcon,
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
    figure: '20',
    unit: 'days',
    title: 'Reading Marathon',
    meta: 'One CDI-format passage a day with its Uzbek translation, 20 questions',
    tab: 'reading-marathon',
  },
  {
    id: 'listening-marathon',
    tone: 'peach',
    category: 'Listening Marathon',
    skill: 'listening',
    icon: ListeningMarathonIcon,
    figure: '20',
    unit: 'days',
    title: 'Listening Marathon',
    meta: 'Four parts a day in CDI format, with the audio',
    tab: 'listening-marathon',
  },
  {
    id: 'reading-practice',
    tone: 'rose',
    category: 'Reading Practice',
    skill: 'reading',
    icon: ReadingIcon,
    figure: '137',
    unit: 'passages',
    title: 'Reading Practice',
    meta: 'Real exam passages 1, 2 and 3, 13 to 14 questions each',
    tab: 'reading-practice',
  },
  {
    id: 'listening-practice',
    tone: 'peach',
    category: 'Listening Practice',
    skill: 'listening',
    icon: ListeningIcon,
    figure: '101',
    unit: 'tests',
    title: 'Listening Practice',
    meta: 'Full IELTS Listening tests with audio and transcripts',
    tab: 'listening-practice',
  },
  {
    id: 'vocabulary',
    tone: 'mint',
    category: 'Vocabulary',
    skill: 'reading',
    icon: VocabularyIcon,
    figure: '2,952',
    unit: 'cards',
    title: 'Vocabulary',
    meta: '4000 Essential Words and Collocations in Use, with Uzbek translations',
    tab: 'vocabulary',
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
// to Passage 3 (Days 15–20).
export const readingMarathon = {
  title: 'Reading Marathon',
  subtitle: '20 days in CDI format · one passage a day with Uzbek translation · 20 questions',
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
