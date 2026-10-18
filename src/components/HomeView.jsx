import { useState } from 'react';
import { CategoryTabs } from './CategoryTabs.jsx';
import { CourseCard } from './CourseCard.jsx';
import { FeaturedCourse } from './FeaturedCourse.jsx';
import { MarathonView } from './MarathonView.jsx';
import { ReadingMarathonIcon, ListeningMarathonIcon, LogoMark, Wordmark } from './Icons.jsx';
import { categories, popularCourses, featuredCourse, listeningMarathon, readingMarathon } from '../data/mock.js';

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
      ) : (
        <>
          <section aria-labelledby="popular-title">
            <div className="section-head">
              <h2 id="popular-title" className="label">Most popular</h2>
              <a className="link-sm" href="#">See all</a>
            </div>
            <div className="course-grid">
              {popularCourses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </section>

          <section aria-labelledby="featured-title">
            <div className="section-head">
              <h2 id="featured-title" className="label">Featured course</h2>
            </div>
            <FeaturedCourse course={featuredCourse} />
          </section>
        </>
      )}
    </>
  );
}
