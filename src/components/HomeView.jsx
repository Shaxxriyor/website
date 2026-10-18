import { useState } from 'react';
import { CategoryTabs } from './CategoryTabs.jsx';
import { CourseCard } from './CourseCard.jsx';
import { FeaturedCourse } from './FeaturedCourse.jsx';
import { MarathonView } from './MarathonView.jsx';
import { ReadingMarathonIcon, ListeningMarathonIcon, LogoMark, Wordmark, SparkleIcon } from './Icons.jsx';
import { categories, popularCourses, listeningMarathon, readingMarathon } from '../data/mock.js';

const SOON = {
  vocabulary: 'Vocabulary lists from the marathon passages are on the way.',
  mock: 'Full mock tests in CDI format are on the way.',
};

/** The public student-facing dashboard (marathons and courses). */
export function HomeView({ results = [] }) {
  const [tab, setTab] = useState('all');

  return (
    <>
      <a className="brand" href="https://t.me/READING_CDI" target="_blank" rel="noopener">
        <span className="brand__mark">
          <LogoMark size={30} />
        </span>
        <Wordmark />
        <span className="brand__tag">IELTS Reading & Listening</span>
      </a>

      <h1 className="hero-title">
        Invest in your
        <br />
        education
      </h1>

      <CategoryTabs items={categories} active={tab} onChange={setTab} />

      {tab === 'listening-marathon' ? (
        <MarathonView marathon={listeningMarathon} icon={ListeningMarathonIcon} skill="listening" results={results} />
      ) : tab === 'reading-marathon' ? (
        <MarathonView marathon={readingMarathon} icon={ReadingMarathonIcon} skill="reading" results={results} />
      ) : SOON[tab] ? (
        <div className="empty card-white">
          <span className="empty__icon">
            <SparkleIcon size={20} />
          </span>
          <h3 className="empty__title">Coming soon</h3>
          <p className="muted-sm">{SOON[tab]}</p>
          <button type="button" className="btn btn--dark" onClick={() => setTab('reading-marathon')}>
            Try the Reading Marathon
          </button>
        </div>
      ) : (
        <>
          <section aria-labelledby="popular-title">
            <div className="section-head">
              <h2 id="popular-title" className="label">
                {tab === 'reading' ? 'Reading' : tab === 'listening' ? 'Listening' : 'Most popular'}
              </h2>
            </div>
            <div className="course-grid">
              {popularCourses
                .filter((c) => tab === 'all' || c.skill === tab)
                .map((c) => (
                  <CourseCard key={c.id} course={c} onOpen={setTab} />
                ))}
            </div>
          </section>

          {tab !== 'listening' && (
            <section aria-labelledby="featured-title">
              <div className="section-head">
                <h2 id="featured-title" className="label">Featured</h2>
              </div>
              <FeaturedCourse results={results} />
            </section>
          )}
        </>
      )}
    </>
  );
}
