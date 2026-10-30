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
    title: 'Reading Marathon: New Season Coming Soon',
    meta: 'A new marathon is starting soon',
    tab: 'reading-marathon',
  },
  {
    id: 'listening-marathon',
    tone: 'peach',
    category: 'Listening Marathon',
    skill: 'listening',
    icon: ListeningMarathonIcon,
    badge: 'New',
    title: 'Listening Marathon: New Season Coming Soon',
    meta: 'A new marathon is starting soon',
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

// The marathons are being replaced: new days are added here when the new files arrive.
export const listeningMarathon = {
  title: 'Listening Marathon',
  subtitle: 'A new Listening Marathon is starting soon',
  days: [],
};

export const readingMarathon = {
  title: 'Reading Marathon',
  subtitle: 'A new Reading Marathon is starting soon',
  days: [],
};
