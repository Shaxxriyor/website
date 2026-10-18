import { BellIcon, SettingsIcon, UserCircleIcon, ChevronRight } from './Icons.jsx';
import { Avatar, AvatarStack } from './Avatar.jsx';
import { ActivityChart } from './ActivityChart.jsx';
import { MyCourseCard } from './MyCourseCard.jsx';

export function ProfilePanel({ user, activity, activitySeries, courses }) {
  return (
    <aside className="panel glass" aria-label="Your profile">
      <div className="panel__top">
        <button className="icon-btn icon-btn--ghost" aria-label="Notifications">
          <BellIcon />
          <span className="dot dot--sm" />
        </button>
        <button className="icon-btn icon-btn--ghost" aria-label="Profile settings">
          <SettingsIcon />
        </button>
      </div>

      <div className="profile">
        <span className="profile__halo">
          <Avatar name={user.name} size={64} />
        </span>
        <h2 className="profile__name">{user.name}</h2>
      </div>

      <button className="friends card-white">
        <UserCircleIcon size={20} />
        <span>
          <strong>{user.friends}</strong> Friends
        </span>
        <AvatarStack names={user.friendAvatars} size={24} />
        <ChevronRight size={16} />
      </button>

      <ActivityChart data={activity} series={activitySeries} badge="👍 Great result!" />

      <div className="section-head section-head--panel">
        <h3 className="label">My courses</h3>
        <a className="link-sm" href="#">See all</a>
      </div>
      <div className="my-courses">
        {courses.map((c) => (
          <MyCourseCard key={c.id} course={c} />
        ))}
      </div>
    </aside>
  );
}
