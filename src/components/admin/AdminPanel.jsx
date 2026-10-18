import { api } from '../../lib/api.js';
import { CATEGORIES, categoryOf, hours, levelName, practiceTitle, relativeDay } from '../../lib/format.js';
import { LogoMark, LogoutIcon } from '../Icons.jsx';
import { Avatar } from '../Avatar.jsx';
import { ActivityChart } from '../ActivityChart.jsx';
import { Skeleton, useLoad } from './ui.jsx';

function PanelTop({ title, onSignOut }) {
  return (
    <div className="panel__top panel__top--admin">
      <span className="label">{title}</span>
      {onSignOut && (
        <button className="icon-btn icon-btn--ghost" aria-label="Sign out" title="Sign out" onClick={onSignOut}>
          <LogoutIcon size={18} />
        </button>
      )}
    </div>
  );
}

/** Students & Lessons pages: totals, all-student activity and the latest lessons. */
export function OverviewPanel({ version, onSignOut }) {
  const { data } = useLoad(() => api.overview(), [version]);

  return (
    <aside className="panel glass" aria-label="Overview">
      <PanelTop title="Overview" onSignOut={onSignOut} />
      {!data ? (
        <Skeleton rows={3} />
      ) : (
        <>
          <div className="mini-stats">
            <div className="card-white">
              <span className="mini-stats__value">{data.counts.active}</span>
              <span className="muted-sm">Active students</span>
            </div>
            <div className="card-white">
              <span className="mini-stats__value">{data.month.lessons}</span>
              <span className="muted-sm">Practice this month</span>
            </div>
            <div className="card-white">
              <span className="mini-stats__value">{hours(data.month.minutes)}</span>
              <span className="muted-sm">Hours this month</span>
            </div>
            <div className="card-white">
              <span className="mini-stats__value">{data.counts.groups}</span>
              <span className="muted-sm">Groups</span>
            </div>
          </div>

          <ActivityChart data={data.activity} series={CATEGORIES} rangeLabel="Last 7 months" title="All students" />

          <div className="section-head section-head--panel">
            <h3 className="label">Latest practice</h3>
            <a className="link-sm" href="#/practice">
              See all
            </a>
          </div>
          {data.recent.length === 0 ? (
            <p className="muted-sm panel__note">Marathon days and exercises you record will appear here.</p>
          ) : (
            <ul className="mini-lessons">
              {data.recent.map((l) => (
                <li key={l.id}>
                  <a href={`#/students/${l.student_id}`} className="mini-lesson card-white">
                    <Avatar name={l.student_name} size={30} />
                    <span className="mini-lesson__text">
                      <strong>{l.student_name}</strong>
                      <span className="muted-sm">
                        {categoryOf(l).short} · {l.kind === 'marathon' ? `Day ${l.day}` : practiceTitle(l)}
                      </span>
                    </span>
                    <span className="muted-sm">{relativeDay(l.lesson_date)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </aside>
  );
}

/** Student profile page: who they are and their study activity over time. Contact details stay on the profile itself. */
export function StudentPanel({ data, onSignOut }) {
  if (!data) {
    return (
      <aside className="panel glass" aria-label="Student">
        <PanelTop title="Student" onSignOut={onSignOut} />
        <Skeleton rows={3} />
      </aside>
    );
  }
  const { student: s, stats, activity } = data;
  return (
    <aside className="panel glass" aria-label="Student">
      <PanelTop title="Student" onSignOut={onSignOut} />
      <div className="profile">
        <span className="profile__halo">
          <Avatar name={s.full_name} size={64} />
        </span>
        <h2 className="profile__name">{s.full_name}</h2>
        <span className="pill pill--soft">
          {s.group_name || 'No group'} · {s.level} {levelName(s.level)}
        </span>
      </div>

      <div className="friends card-white friends--static">
        <span>
          <strong>{stats.marathon_days}</strong> marathon days
        </span>
        <span>
          <strong>{hours(stats.total_minutes)}</strong> studied
        </span>
      </div>

      <ActivityChart data={activity} series={CATEGORIES} rangeLabel="Last 7 months" title="Study activity" />
    </aside>
  );
}

export function SignedOutPanel() {
  return (
    <aside className="panel glass panel--quiet" aria-label="About">
      <div className="panel__brand">
        <span className="brand__mark brand__mark--lg">
          <LogoMark size={44} />
        </span>
        <p className="muted-sm">Your students, lessons and study hours, all in one place.</p>
      </div>
    </aside>
  );
}
