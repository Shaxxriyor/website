import { StarIcon } from './Icons.jsx';
import { AvatarStack } from './Avatar.jsx';

const fmt = new Intl.NumberFormat('en-US');

export function Rating({ value }) {
  return (
    <span className="pill pill--glass">
      <StarIcon /> {value.toFixed(1)}
    </span>
  );
}

export function CourseCard({ course }) {
  const { tone, category, icon: Icon, rating, badge, title, students, learners } = course;
  return (
    <article className={`course-card tone-${tone}`} tabIndex={0}>
      <header className="course-card__head">
        <span className="chip-cat">
          <span className="chip-cat__icon">
            <Icon size={16} />
          </span>
          {category}
        </span>
        <span className="course-card__pills">
          <Rating value={rating} />
          {badge && <span className="pill pill--glass">🏆 {badge}</span>}
        </span>
      </header>

      <h3 className="course-card__title">{title}</h3>

      <footer className="course-card__foot">
        <span className="muted-sm">{fmt.format(students)} students</span>
        <AvatarStack names={learners} />
      </footer>
    </article>
  );
}
