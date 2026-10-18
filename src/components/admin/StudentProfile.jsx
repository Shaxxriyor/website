import { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { navigate } from '../../lib/router.js';
import { SKILLS, band, formatDate, hours, levelName, relativeDay } from '../../lib/format.js';
import { ArrowLeft, EditIcon, LessonIcon, MailIcon, PhoneIcon, PlusIcon, TrashIcon } from '../Icons.jsx';
import { Avatar } from '../Avatar.jsx';
import { ConfirmSheet, EmptyState, ErrorNote, Skeleton, StatusPill, useLoad } from './ui.jsx';
import { StudentForm } from './StudentForm.jsx';
import { LessonForm } from './LessonForm.jsx';
import { LessonRows } from './LessonRows.jsx';

const RECENT = 8;

export function StudentProfile({ id, version, onChanged, notify, onLoaded }) {
  const { data, error, loading, reload } = useLoad(async () => {
    const d = await api.student(id);
    onLoaded?.(d);
    return d;
  }, [id, version]);
  const groupsQuery = useLoad(() => api.students(), [version]);
  const groups = useMemo(
    () => [...new Set((groupsQuery.data?.students ?? []).map((s) => s.group_name).filter(Boolean))].sort(),
    [groupsQuery.data],
  );

  const [editing, setEditing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (error) {
    return (
      <>
        <BackLink />
        <ErrorNote error={error} onRetry={error.status === 404 ? undefined : reload} />
      </>
    );
  }
  if (loading && !data) {
    return (
      <>
        <BackLink />
        <Skeleton rows={4} />
      </>
    );
  }

  const { student: s, stats, skills, lessons } = data;
  const skillMinutes = Object.fromEntries(skills.map((k) => [k.skill, k.minutes]));
  const maxSkill = Math.max(1, ...skills.map((k) => k.minutes));
  const shown = showAll ? lessons : lessons.slice(0, RECENT);

  return (
    <>
      <BackLink />

      <section className="profile-hero">
        <Avatar name={s.full_name} size={72} />
        <div className="profile-hero__main">
          <div className="profile-hero__title">
            <h1 className="profile-hero__name">{s.full_name}</h1>
            <StatusPill status={s.status} />
          </div>
          <div className="profile-hero__meta">
            <span className="pill pill--glass">{s.group_name || 'No group'}</span>
            <span className="pill pill--glass" title={levelName(s.level)}>
              {s.level} · {levelName(s.level)}
            </span>
            <span className="pill pill--glass">Registered {formatDate(s.registered_at)}</span>
          </div>
          <div className="profile-hero__contact">
            {s.phone && (
              <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>
                <PhoneIcon size={15} /> {s.phone}
              </a>
            )}
            {s.email && (
              <a href={`mailto:${s.email}`}>
                <MailIcon size={15} /> {s.email}
              </a>
            )}
          </div>
        </div>
        <div className="profile-hero__actions">
          <button className="btn btn--glass" onClick={() => setEditing(true)}>
            <EditIcon size={15} /> Edit
          </button>
          <button className="btn btn--dark" onClick={() => setRecording(true)}>
            <PlusIcon size={15} /> Record lesson
          </button>
        </div>
      </section>

      <div className="stat-grid">
        <Stat tone="lilac" label="Total lessons" value={stats.lesson_count} />
        <Stat tone="rose" label="Study hours" value={hours(stats.total_minutes)} />
        <Stat tone="peach" label="Average band" value={band(stats.average_band)} />
        <Stat tone="mint" label="Last lesson" value={stats.last_lesson ? relativeDay(stats.last_lesson) : '—'} small />
      </div>

      {s.notes && <p className="profile-notes card-white">{s.notes}</p>}

      <section aria-labelledby="skills-title">
        <div className="section-head">
          <h2 id="skills-title" className="label">Study time by skill</h2>
        </div>
        <ul className="skill-bars card-white">
          {SKILLS.map((k) => {
            const m = skillMinutes[k.key] || 0;
            return (
              <li key={k.key}>
                <span className="skill-bars__label">{k.label}</span>
                <span className="skill-bars__track">
                  <span style={{ width: `${(m / maxSkill) * 100}%`, background: k.color }} />
                </span>
                <span className="skill-bars__value num">{hours(m)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="recent-title">
        <div className="section-head">
          <h2 id="recent-title" className="label">
            Recent lessons
          </h2>
          {lessons.length > RECENT && (
            <button className="link-sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show fewer' : `See all ${lessons.length}`}
            </button>
          )}
        </div>
        {lessons.length === 0 ? (
          <EmptyState
            icon={LessonIcon}
            title="No lessons yet"
            action={
              <button className="btn btn--dark" onClick={() => setRecording(true)}>
                <PlusIcon size={16} /> Record the first lesson
              </button>
            }
          />
        ) : (
          <LessonRows
            lessons={shown}
            onDeleted={() => {
              notify('Lesson deleted');
              onChanged();
            }}
          />
        )}
      </section>

      <button className="danger-link" onClick={() => setDeleting(true)}>
        <TrashIcon size={15} /> Delete student
      </button>

      {editing && (
        <StudentForm
          student={s}
          groups={groups}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            notify('Changes saved');
            onChanged();
          }}
        />
      )}
      {recording && (
        <LessonForm
          presetStudentId={s.id}
          onClose={() => setRecording(false)}
          onSaved={(n) => {
            setRecording(false);
            notify(n > 1 ? `Lesson recorded for ${n} students` : 'Lesson recorded');
            onChanged();
          }}
        />
      )}
      {deleting && (
        <ConfirmSheet
          title={`Delete ${s.full_name}?`}
          message={`This removes the student and all ${stats.lesson_count} of their lessons. This can’t be undone. To keep their history, set them to Inactive instead.`}
          confirmLabel="Delete student"
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await api.deleteStudent(s.id);
            notify('Student deleted');
            onChanged();
            navigate('/students');
          }}
        />
      )}
    </>
  );
}

function BackLink() {
  return (
    <a className="back-link" href="#/students">
      <ArrowLeft size={16} /> Students
    </a>
  );
}

function Stat({ tone, label, value, small }) {
  return (
    <div className={`stat tone-${tone}`}>
      <span className="stat__label">{label}</span>
      <span className={`stat__value ${small ? 'stat__value--sm' : ''}`}>{value}</span>
    </div>
  );
}
