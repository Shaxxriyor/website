import { useState } from 'react';
import { api } from '../../lib/api.js';
import { MockTestIcon, SearchIcon } from '../Icons.jsx';
import { MockResults } from '../MockResults.jsx';
import { EmptyState, ErrorNote, Skeleton, useLoad } from './ui.jsx';

/** Teacher: every full mock result, newest first, each with its PDF for the examiner. */
export function MockResultsView({ version, onChanged, notify }) {
  const [search, setSearch] = useState('');
  const { data, error, loading, reload } = useLoad(() => api.mockResults(), [version]);
  const results = data?.results ?? [];
  const q = search.trim().toLowerCase();
  const visible = q ? results.filter((r) => [r.full_name, r.group_name, r.title].some((v) => v?.toLowerCase().includes(q))) : results;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="hero-title hero-title--page">Mock results</h1>
          <p className="muted-sm">
            Full mock tests your students sat, newest first. The PDF has every answer and both Writing tasks with the task picture, ready for
            the examiner.
          </p>
        </div>
      </header>

      {results.length > 0 && (
        <div className="toolbar">
          <label className="search">
            <SearchIcon size={16} />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by student, group or mock" aria-label="Search results" />
          </label>
        </div>
      )}

      {loading && !data ? (
        <Skeleton rows={4} />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : !visible.length ? (
        <EmptyState icon={MockTestIcon} title={results.length ? 'No matches' : 'No mock results yet'}>
          {results.length ? 'Try another name.' : 'Results appear here as soon as a student finishes the first part of a mock.'}
        </EmptyState>
      ) : (
        <MockResults results={visible} teacher notify={notify} onDeleted={onChanged} />
      )}
    </>
  );
}
