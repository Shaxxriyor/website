import { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { SECTIONS, sectionLabel } from '../../lib/access.js';
import { formatDate, hours, levelName, timeAgo } from '../../lib/format.js';
import { ChevronRight, PlusIcon, SearchIcon, TrashIcon, UsersIcon } from '../Icons.jsx';
import { Avatar } from '../Avatar.jsx';
import { EmptyState, ErrorNote, Sheet, Skeleton, StatusPill, useLoad } from './ui.jsx';
import { StudentForm } from './StudentForm.jsx';
import { CodeSheet } from './CodeSheet.jsx';
import { navigate } from '../../lib/router.js';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

const SHORT = {
  'reading-marathon': 'R. Marathon',
  'listening-marathon': 'L. Marathon',
  'reading-practice': 'R. Practice',
  'listening-practice': 'L. Practice',
  vocabulary: 'Vocab',
  mock: 'Mock',
};
// Signed up on the site and nothing opened yet.
const isWaiting = (s) => s.self_registered && !(s.access ?? []).length;

export function StudentsView({ version, onChanged, notify }) {
  const { data, error, loading, reload } = useLoad(() => api.students(), [version]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [group, setGroup] = useState('');
  const [registering, setRegistering] = useState(false);
  const [highlight, setHighlight] = useState(null);
  const [newStudent, setNewStudent] = useState(null);
  const [clearing, setClearing] = useState(false);

  const students = data?.students ?? [];
  const groups = useMemo(() => [...new Set(students.map((s) => s.group_name).filter(Boolean))].sort(), [students]);
  const counts = {
    all: students.length,
    active: students.filter((s) => s.status === 'active').length,
    inactive: students.filter((s) => s.status === 'inactive').length,
    waiting: students.filter(isWaiting).length,
  };
  const [section, setSection] = useState('');
  const tabs = counts.waiting ? [STATUS_TABS[0], { id: 'waiting', label: 'Waiting for approval' }, ...STATUS_TABS.slice(1)] : STATUS_TABS;
  const matchesTab = (s) =>
    (status === 'all' || (status === 'waiting' ? isWaiting(s) : s.status === status)) &&
    (!section || (section === 'none' ? !(s.access ?? []).length : (s.access ?? []).includes(section)));

  const q = search.trim().toLowerCase();
  const visible = students.filter(
    (s) =>
      matchesTab(s) &&
      (!group || s.group_name === group) &&
      (!q || [s.full_name, s.phone, s.email, s.group_name].some((v) => v?.toLowerCase().includes(q))),
  );

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="hero-title hero-title--page">Students</h1>
          <p className="muted-sm">
            {loading && !data ? 'Loading…' : `${counts.active} active · ${counts.all} registered`}
          </p>
        </div>
        <button className="btn btn--dark" onClick={() => setRegistering(true)}>
          <PlusIcon size={16} /> Register student
        </button>
      </header>

      <div className="toolbar">
        <label className="search">
          <SearchIcon size={16} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email or group"
            aria-label="Search students"
          />
        </label>
        <div className="seg-tabs" role="tablist" aria-label="Status">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={status === t.id}
              className={`chip ${status === t.id ? 'is-active' : ''}`}
              onClick={() => setStatus(t.id)}
            >
              {t.label} <span className="chip__count">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <select className="input input--pill" value={section} onChange={(e) => setSection(e.target.value)} aria-label="Opened section">
          <option value="">Any access</option>
          {SECTIONS.map((x) => (
            <option key={x.key} value={x.key}>
              {x.label} open
            </option>
          ))}
          <option value="none">Nothing open</option>
        </select>
        {groups.length > 0 && (
          <select className="input input--pill" value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Group">
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        )}
      </div>

      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton rows={5} />
      ) : students.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No students yet"
          action={
            <button className="btn btn--dark" onClick={() => setRegistering(true)}>
              <PlusIcon size={16} /> Register your first student
            </button>
          }
        >
          Register a student and they’ll show up here with their marathon progress and study hours.
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState icon={SearchIcon} title="No matches">
          Try a different search or filter.
        </EmptyState>
      ) : (
        <div className="student-table" role="table" aria-label="Students">
          <div className="student-row student-row--head" role="row">
            <span role="columnheader">Student</span>
            <span role="columnheader">Group</span>
            <span role="columnheader">Level</span>
            <span role="columnheader">Done</span>
            <span role="columnheader">Hours</span>
            <span role="columnheader">Status</span>
            <span aria-hidden="true" />
          </div>
          {visible.map((s) => (
            <a
              key={s.id}
              href={`#/students/${s.id}`}
              className={`student-row ${highlight === s.id ? 'is-new' : ''}`}
              role="row"
            >
              <span className="student-row__who" role="cell">
                <Avatar name={s.full_name} size={36} studentId={s.id} v={s.avatar_v} />
                <span>
                  <strong>
                    {s.full_name}
                    {isWaiting(s) ? (
                      <span className="tag tag--warn student-row__access">Waiting for approval</span>
                    ) : (s.access ?? []).length < SECTIONS.length ? (
                      <span className="tag tag--muted student-row__access" title={(s.access ?? []).map(sectionLabel).join(', ') || 'Nothing open'}>
                        {(s.access ?? []).length ? (s.access ?? []).map((k) => SHORT[k]).join(' · ') : 'Nothing open'}
                      </span>
                    ) : null}
                  </strong>
                  <span className="muted-sm">
                    {s.self_registered ? 'Signed up · ' : ''}
                    {s.last_active_at ? `On the site ${timeAgo(s.last_active_at)}` : `Since ${formatDate(s.registered_at)}`}
                  </span>
                </span>
              </span>
              <span role="cell" className="student-row__group">
                {s.group_name ? <span className="tag">{s.group_name}</span> : <span className="muted-sm">—</span>}
              </span>
              <span role="cell" title={levelName(s.level)}>
                {s.level ? <span className="level">{s.level}</span> : <span className="muted-sm">—</span>}
              </span>
              <span role="cell" className="num">{s.lesson_count}</span>
              <span role="cell" className="num">{hours(s.total_minutes)}</span>
              <span role="cell">
                <StatusPill status={s.status} />
              </span>
              <span className="student-row__go" aria-hidden="true">
                <ChevronRight size={16} />
              </span>
            </a>
          ))}
        </div>
      )}

      {students.length > 0 && (
        <button className="danger-link" onClick={() => setClearing(true)}>
          <TrashIcon size={15} /> Delete all students
        </button>
      )}
      {clearing && (
        <DeleteAllSheet
          count={students.length}
          onClose={() => setClearing(false)}
          onDone={(n) => {
            setClearing(false);
            notify(`${n} ${n === 1 ? 'student' : 'students'} deleted`);
            onChanged();
          }}
        />
      )}

      {registering && (
        <StudentForm
          groups={groups}
          onClose={() => setRegistering(false)}
          onSaved={(id, code, name) => {
            setRegistering(false);
            setHighlight(id);
            setNewStudent({ id, code, name });
            setStatus('all');
            setSearch('');
            setGroup('');
            onChanged();
          }}
        />
      )}
      {newStudent && (
        <CodeSheet
          name={newStudent.name}
          code={newStudent.code}
          onClose={() => setNewStudent(null)}
          onOpenProfile={() => navigate(`/students/${newStudent.id}`)}
        />
      )}
    </>
  );
}

/** Remove every student at once; asks for "DELETE ALL" to be typed first. */
function DeleteAllSheet({ count, onClose, onDone }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ok = text.trim() === 'DELETE ALL';
  async function confirm() {
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const { deleted } = await api.deleteAllStudents('DELETE ALL');
      onDone(deleted);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={`Delete all ${count} students?`}
      size="sm"
      onClose={onClose}
      onSubmit={confirm}
      footer={
        <>
          {error && <span className="sheet__error">{error}</span>}
          <button type="button" className="btn btn--glass" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--danger" disabled={!ok || busy}>
            {busy ? 'Deleting…' : 'Delete all students'}
          </button>
        </>
      }
    >
      <p className="sheet__message">
        This removes every student and everything they did: marathon days, practice scores, attempts,
        profile photos and vocabulary progress. Their codes stop working. This can’t be undone.
      </p>
      <label className="field">
        <span className="field__label">Type DELETE ALL to confirm</span>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" placeholder="DELETE ALL" />
      </label>
    </Sheet>
  );
}
