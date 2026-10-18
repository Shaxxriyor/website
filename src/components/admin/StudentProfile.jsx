import { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { navigate } from '../../lib/router.js';
import { MARATHON_DAYS, formatDate, hours, levelName, marathonTitle, relativeDay } from '../../lib/format.js';
import { ArrowLeft, EditIcon, LessonIcon, MailIcon, PhoneIcon, PlusIcon, TrashIcon } from '../Icons.jsx';
import { Avatar } from '../Avatar.jsx';
import { ConfirmSheet, EmptyState, ErrorNote, Skeleton, StatusPill, useLoad } from './ui.jsx';
import { StudentForm } from './StudentForm.jsx';
import { PracticeForm } from './PracticeForm.jsx';
import { PracticeRows } from './PracticeRows.jsx';

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

  const { student: s, stats, marathon, lessons } = data;
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
            <PlusIcon size={15} /> Record practice
          </button>
        </div>
      </section>

      <div className="stat-grid">
        <Stat tone="lilac" label="Marathon days done" value={stats.marathon_days} />
        <Stat tone="mint" label="Exercises done" value={stats.exercise_count} />
        <Stat tone="rose" label="Study hours" value={hours(stats.total_minutes)} />
        <Stat
          tone="peach"
          label="Average score"
          value={stats.average_score == null ? '—' : `${stats.average_score}%`}
        />
      </div>

      {s.notes && <p className="profile-notes card-white">{s.notes}</p>}

      <section aria-labelledby="marathon-title">
        <div className="section-head">
          <h2 id="marathon-title" className="label">Marathon progress</h2>
          <span className="link-sm">Last active {stats.last_lesson ? relativeDay(stats.last_lesson) : '—'}</span>
        </div>
        <div className="marathon-progress">
          <MarathonGrid skill="reading" label="Reading Marathon" tone="lilac" results={marathon} />
          <MarathonGrid skill="listening" label="Listening Marathon" tone="rose" results={marathon} />
        </div>
      </section>

      <section aria-labelledby="recent-title">
        <div className="section-head">
          <h2 id="recent-title" className="label">
            Recent practice
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
            title="Nothing recorded yet"
            action={
              <button className="btn btn--dark" onClick={() => setRecording(true)}>
                <PlusIcon size={16} /> Record a marathon day or exercise
              </button>
            }
          />
        ) : (
          <PracticeRows
            lessons={shown}
            onDeleted={() => {
              notify('Record deleted');
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
        <PracticeForm
          presetStudentId={s.id}
          onClose={() => setRecording(false)}
          onSaved={(n) => {
            setRecording(false);
            notify(n > 1 ? `Saved for ${n} students` : 'Practice recorded');
            onChanged();
          }}
        />
      )}
      {deleting && (
        <ConfirmSheet
          title={`Delete ${s.full_name}?`}
          message={`This removes the student and all ${stats.lesson_count} of their practice records. This can’t be undone. To keep their history, set them to Inactive instead.`}
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

/** 20 day cells; filled when done, tinted by score, with the best result on hover. */
function MarathonGrid({ skill, label, tone, results }) {
  const byDay = new Map(results.filter((r) => r.skill === skill).map((r) => [r.day, r]));
  return (
    <div className={`mgrid card-white tone-${tone}`}>
      <div className="mgrid__head">
        <span className="mgrid__label">{label}</span>
        <span className="mgrid__count num">
          {byDay.size}
          <small>/{MARATHON_DAYS}</small>
        </span>
      </div>
      <ol className="mgrid__days">
        {Array.from({ length: MARATHON_DAYS }, (_, i) => i + 1).map((day) => {
          const r = byDay.get(day);
          const pct = r?.total ? r.correct / r.total : null;
          const title = marathonTitle(skill, day);
          const tip = r
            ? `Day ${day}${title ? ` · ${title}` : ''} — ${r.correct != null ? `${r.correct}/${r.total}` : 'done'} (${formatDate(r.lesson_date, { short: true })})`
            : `Day ${day}${title ? ` · ${title}` : ''} — not done yet`;
          return (
            <li
              key={day}
              className={`mgrid__day ${r ? 'is-done' : ''} ${pct != null && pct >= 0.8 ? 'is-strong' : ''}`}
              title={tip}
              aria-label={tip}
            >
              {day}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
