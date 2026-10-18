import { Rating } from './CourseCard.jsx';
import { AvatarStack } from './Avatar.jsx';

const fmt = new Intl.NumberFormat('en-US');

// Course in progress: the deeper tint behind the content is the progress fill.
export function MyCourseCard({ course }) {
  const { tone, category, icon: Icon, rating, title, students, progress, learners } = course;
  const pct = Math.round(progress * 100);
  return (
    <article className={`my-card tone-${tone}`} tabIndex={0}>
      <span
        className="my-card__fill"
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      />
      <div className="my-card__body">
        <header className="course-card__head">
          <span className="chip-cat">
            <span className="chip-cat__icon">
              <Icon size={16} />
            </span>
            {category}
          </span>
          <Rating value={rating} />
        </header>
        <h4 className="my-card__title">{title}</h4>
        <footer className="course-card__foot">
          <span className="muted-sm">
            {fmt.format(students)} students · <strong>{pct}%</strong>
          </span>
          <AvatarStack names={learners} size={24} />
        </footer>
      </div>
    </article>
  );
}
