import { PlayIcon, SparkleIcon, ArrowRight } from './Icons.jsx';

export function FeaturedCourse({ course }) {
  return (
    <article className="featured">
      <div className="featured__art" aria-hidden="true">
        <span className="blob blob--a" />
        <span className="blob blob--b" />
        <span className="blob blob--c" />
        <span className="featured__play">
          <PlayIcon size={18} />
        </span>
      </div>
      <div className="featured__content">
        <span className="pill pill--dark">
          <SparkleIcon size={12} /> {course.category}
        </span>
        <h3 className="featured__title">{course.title}</h3>
        <p className="muted-sm">{course.meta}</p>
      </div>
      <button className="btn btn--dark featured__cta">
        Start reading <ArrowRight size={16} />
      </button>
    </article>
  );
}
