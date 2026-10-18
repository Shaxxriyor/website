import { Sidebar } from './components/Sidebar.jsx';
import { CategoryTabs } from './components/CategoryTabs.jsx';
import { CourseCard } from './components/CourseCard.jsx';
import { FeaturedCourse } from './components/FeaturedCourse.jsx';
import { ProfilePanel } from './components/ProfilePanel.jsx';
import {
  categories,
  popularCourses,
  featuredCourse,
  user,
  activity,
  activitySeries,
  myCourses,
} from './data/mock.js';

export default function App() {
  return (
    <div className="stage">
      <div className="backdrop" aria-hidden="true">
        <span className="orb orb--1" />
        <span className="orb orb--2" />
        <span className="orb orb--3" />
      </div>

      <div className="shell">
        <Sidebar />

        <main className="main">
          <h1 className="hero-title">
            Invest in your
            <br />
            education
          </h1>

          <CategoryTabs items={categories} />

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
        </main>

        <ProfilePanel
          user={user}
          activity={activity}
          activitySeries={activitySeries}
          courses={myCourses}
        />
      </div>
    </div>
  );
}
