// Static placeholder content for the UI stage. Replaced by real data in step 2.
import {
  ReadingIcon,
  ListeningIcon,
  WritingIcon,
  SpeakingIcon,
  VocabularyIcon,
  MockTestIcon,
} from '../components/Icons.jsx';

export const categories = [
  { id: 'all', label: 'All' },
  { id: 'reading', label: 'Reading', icon: ReadingIcon },
  { id: 'listening', label: 'Listening', icon: ListeningIcon },
  { id: 'writing', label: 'Writing', icon: WritingIcon },
  { id: 'speaking', label: 'Speaking', icon: SpeakingIcon },
  { id: 'vocabulary', label: 'Vocabulary', icon: VocabularyIcon },
  { id: 'mock', label: 'Mock Tests', icon: MockTestIcon },
];

export const popularCourses = [
  {
    id: 1,
    tone: 'rose',
    category: 'Reading',
    icon: ReadingIcon,
    rating: 4.8,
    title: 'Recently Tested Reading: Academic Set 2026',
    students: 9530,
    learners: ['Malika R', 'Jasur T', 'Aziza K'],
  },
  {
    id: 2,
    tone: 'peach',
    category: 'Writing',
    icon: WritingIcon,
    rating: 4.9,
    title: 'Task 2 Essays: How to Write Clearly and Concisely',
    students: 1463,
    learners: ['Dilnoza S', 'Bekzod A'],
  },
  {
    id: 3,
    tone: 'lilac',
    category: 'Listening',
    icon: ListeningIcon,
    rating: 4.9,
    title: 'Listening Sections 1–4: Real Exam Practice',
    students: 6726,
    learners: ['Kamola N', 'Timur U'],
  },
  {
    id: 4,
    tone: 'mint',
    category: 'Speaking',
    icon: SpeakingIcon,
    rating: 5.0,
    badge: 'Top 10',
    title: 'Speaking Part 2 in 10 Easy Steps',
    students: 8735,
    learners: ['Sardor M'],
  },
];

export const featuredCourse = {
  category: 'Daily Article',
  title: 'Why cities are turning to “sponge” design to fight floods',
  meta: 'Band 7+ vocabulary · 8 min read · 13 questions',
  progress: 0,
};

export const user = {
  name: 'Annette Black',
  friends: 274,
  friendAvatars: ['Nodira B', 'Otabek J', 'Lola F'],
};

// Hours of study per skill, per month — drives the stacked activity chart.
export const activitySeries = [
  { key: 'reading', label: 'Reading', color: 'var(--chart-reading)' },
  { key: 'listening', label: 'Listening', color: 'var(--chart-listening)' },
  { key: 'writing', label: 'Writing', color: 'var(--chart-writing)' },
  { key: 'speaking', label: 'Speaking', color: 'var(--chart-speaking)' },
];

export const activity = [
  { month: 'Jun', reading: 1.4, listening: 0.6, writing: 0.5, speaking: 0.4 },
  { month: 'Jul', reading: 1.0, listening: 0.6, writing: 0.5, speaking: 0.5 },
  { month: 'Aug', reading: 0.8, listening: 0.4, writing: 0.4, speaking: 0.2 },
  { month: 'Sep', reading: 1.5, listening: 0.6, writing: 0.5, speaking: 0.5 },
  { month: 'Oct', reading: 0.9, listening: 0.4, writing: 0.4, speaking: 0.3 },
  { month: 'Nov', reading: 0.8, listening: 0.4, writing: 0.3, speaking: 0.3 },
  { month: 'Dec', reading: 1.6, listening: 0.7, writing: 0.6, speaking: 0.6 },
];

export const myCourses = [
  {
    id: 'm1',
    tone: 'rose',
    category: 'Reading',
    icon: ReadingIcon,
    rating: 4.8,
    title: 'Reading Masterclass (True/False/Not Given & More)',
    students: 9530,
    progress: 0.58,
    learners: ['Aziza K', 'Jasur T'],
  },
  {
    id: 'm2',
    tone: 'peach',
    category: 'Writing',
    icon: WritingIcon,
    rating: 4.9,
    title: 'Academic Task 1: Charts, Maps & Processes',
    students: 3214,
    progress: 0.32,
    learners: ['Dilnoza S'],
  },
  {
    id: 'm3',
    tone: 'lilac',
    category: 'Listening',
    icon: ListeningIcon,
    rating: 4.7,
    title: 'Map Labelling & Multiple Choice Drills',
    students: 2087,
    progress: 0.74,
    learners: ['Kamola N', 'Timur U'],
  },
];
