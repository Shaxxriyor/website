import { useState } from 'react';
import { api } from '../../lib/api.js';
import { SKILLS } from '../../lib/format.js';
import { LessonIcon, PlusIcon, SearchIcon } from '../Icons.jsx';
import { EmptyState, ErrorNote, Skeleton, useLoad } from './ui.jsx';
import { LessonForm } from './LessonForm.jsx';
import { LessonRows } from './LessonRows.jsx';

export function LessonsView({ version, onChanged, notify }) {
  const [skill, setSkill] = useState('');
  const [search, setSearch] = useState('');
  const [recording, setRecording] = useState(false);
  const { data, error, loading, reload } = useLoad(() => api.lessons({ skill }), [version, skill]);

  const lessons = data?.lessons ?? [];
  const q = search.trim().toLowerCase();
  const visible = q
    ? lessons.filter((l) => [l.student_name, l.group_name, l.topic].some((v) => v?.toLowerCase().includes(q)))
    : lessons;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="hero-title hero-title--page">Lessons</h1>
          <p className="muted-sm">Every lesson your students complete, newest first.</p>
        </div>
        <button className="btn btn--dark" onClick={() => setRecording(true)}>
          <PlusIcon size={16} /> Record lesson
        </button>
      </header>

      <div className="toolbar">
        <label className="search">
          <SearchIcon size={16} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, group or topic"
            aria-label="Search lessons"
          />
        </label>
        <div className="seg-tabs" role="tablist" aria-label="Skill">
          {[{ key: '', label: 'All' }, ...SKILLS].map((s) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={skill === s.key}
              className={`chip ${skill === s.key ? 'is-active' : ''}`}
              onClick={() => setSkill(s.key)}
            >
              {s.color && <i className="chip__dot" style={{ background: s.color }} />}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton rows={5} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={q ? SearchIcon : LessonIcon}
          title={q || skill ? 'No matching lessons' : 'No lessons recorded yet'}
          action={
            !q &&
            !skill && (
              <button className="btn btn--dark" onClick={() => setRecording(true)}>
                <PlusIcon size={16} /> Record a lesson
              </button>
            )
          }
        >
          {!q && !skill && 'Record lessons for one student or a whole group at once.'}
        </EmptyState>
      ) : (
        <LessonRows
          lessons={visible}
          showStudent
          onDeleted={() => {
            notify('Lesson deleted');
            onChanged();
          }}
        />
      )}

      {recording && (
        <LessonForm
          onClose={() => setRecording(false)}
          onSaved={(n) => {
            setRecording(false);
            notify(n > 1 ? `Lesson recorded for ${n} students` : 'Lesson recorded');
            onChanged();
          }}
        />
      )}
    </>
  );
}
