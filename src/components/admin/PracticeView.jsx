import { useState } from 'react';
import { api } from '../../lib/api.js';
import { CATEGORIES, practiceTitle } from '../../lib/format.js';
import { LessonIcon, PlusIcon, SearchIcon } from '../Icons.jsx';
import { EmptyState, ErrorNote, Skeleton, useLoad } from './ui.jsx';
import { PracticeForm } from './PracticeForm.jsx';
import { PracticeRows } from './PracticeRows.jsx';

const FILTERS = [{ key: '', label: 'All' }, ...CATEGORIES];

export function PracticeView({ version, onChanged, notify }) {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [recording, setRecording] = useState(false);
  const cat = CATEGORIES.find((c) => c.key === filter);
  const { data, error, loading, reload } = useLoad(
    () => api.lessons({ kind: cat?.kind, skill: cat?.skill }),
    [version, filter],
  );

  const lessons = data?.lessons ?? [];
  const q = search.trim().toLowerCase();
  const visible = q
    ? lessons.filter((l) => [l.student_name, l.group_name, practiceTitle(l)].some((v) => v?.toLowerCase().includes(q)))
    : lessons;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="hero-title hero-title--page">Practice</h1>
          <p className="muted-sm">Marathon days and exercises your students complete, newest first.</p>
        </div>
        <button className="btn btn--dark" onClick={() => setRecording(true)}>
          <PlusIcon size={16} /> Record practice
        </button>
      </header>

      <div className="toolbar">
        <label className="search">
          <SearchIcon size={16} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, group or exercise"
            aria-label="Search practice"
          />
        </label>
        <div className="seg-tabs" role="tablist" aria-label="Type">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              className={`chip ${filter === f.key ? 'is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.color && <i className="chip__dot" style={{ background: f.color }} />}
              {f.label}
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
          title={q || filter ? 'Nothing matches' : 'Nothing recorded yet'}
          action={
            !q &&
            !filter && (
              <button className="btn btn--dark" onClick={() => setRecording(true)}>
                <PlusIcon size={16} /> Record practice
              </button>
            )
          }
        >
          {!q && !filter && 'Record a marathon day or an exercise for one student or a whole group.'}
        </EmptyState>
      ) : (
        <PracticeRows
          lessons={visible}
          showStudent
          onDeleted={() => {
            notify('Record deleted');
            onChanged();
          }}
        />
      )}

      {recording && (
        <PracticeForm
          onClose={() => setRecording(false)}
          onSaved={(n) => {
            setRecording(false);
            notify(n > 1 ? `Saved for ${n} students` : 'Practice recorded');
            onChanged();
          }}
        />
      )}
    </>
  );
}
