import { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { navigate } from '../../lib/router.js';
import { formatCode, formatDate, hours, levelName, relativeDay, timeAgo } from '../../lib/format.js';
import { MarathonGrid } from '../MarathonGrid.jsx';
import { PracticeSummary } from '../PracticeSummary.jsx';
import { ArrowLeft, CheckIcon, EditIcon, LessonIcon, MailIcon, PhoneIcon, PlusIcon, TrashIcon } from '../Icons.jsx';
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

  const { student: s, stats, marathon, practice, lessons } = data;
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
        <Stat tone="mint" label="Practice done" value={stats.exercise_count} />
        <Stat tone="rose" label="Study hours" value={hours(stats.total_minutes)} />
        <Stat
          tone="peach"
          label="Average score"
          value={stats.average_score == null ? '—' : `${stats.average_score}%`}
        />
      </div>

      <AccessCard student={s} notify={notify} onChanged={onChanged} />

      {s.notes && <p className="profile-notes card-white">{s.notes}</p>}

      <section aria-labelledby="marathon-title">
        <div className="section-head">
          <h2 id="marathon-title" className="label">Progress</h2>
          <span className="link-sm">
            {s.last_active_at
              ? `On the site ${timeAgo(s.last_active_at)}`
              : `Last practice ${stats.last_lesson ? relativeDay(stats.last_lesson) : '—'}`}
          </span>
        </div>
        <div className="marathon-progress">
          <MarathonGrid skill="reading" label="Reading Marathon" tone="lilac" results={marathon} />
          <MarathonGrid skill="listening" label="Listening Marathon" tone="rose" results={marathon} />
          <PracticeSummary results={practice} />
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


/** The code a student types on the home page to sign in and have their progress saved. */
function AccessCard({ student, notify, onChanged }) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const code = formatCode(student.access_code);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('Copy failed — select the code instead');
    }
  }

  return (
    <section className="access card-white" aria-label="Student sign-in code">
      <div className="access__text">
        <span className="label">Student sign-in code</span>
        <p className="muted-sm">
          {student.status === 'active'
            ? 'Give this to the student. They enter it once on the home page, then every marathon day and practice passage they open is saved here automatically.'
            : 'Inactive students can’t sign in. Set them to Active to let them use their code.'}
        </p>
      </div>
      <code className="access__code" aria-label={`Code ${code}`}>
        {code}
      </code>
      <div className="access__actions">
        <button className="btn btn--glass btn--sm" onClick={copy}>
          {copied ? (
            <>
              <CheckIcon size={14} /> Copied
            </>
          ) : (
            'Copy'
          )}
        </button>
        <button className="btn btn--glass btn--sm" onClick={() => setConfirming(true)}>
          New code
        </button>
      </div>
      {confirming && (
        <ConfirmSheet
          title="Make a new code?"
          message={`${student.full_name}’s current code (${code}) will stop working for new sign-ins. Devices that are already signed in stay signed in.`}
          confirmLabel="Make new code"
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await api.newCode(student.id);
            setConfirming(false);
            notify('New code created');
            onChanged();
          }}
        />
      )}
    </section>
  );
}
