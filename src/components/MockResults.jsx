import { useState } from 'react';
import { api } from '../lib/api.js';
import { makeMockPdf, needsTapToSave, savePdf } from '../lib/mockPdf.js';
import { DownloadIcon, TrashIcon } from './Icons.jsx';
import { Avatar } from './Avatar.jsx';
import { ConfirmSheet, Sheet } from './admin/ui.jsx';

const band = (b) => (b == null ? '—' : Number(b).toFixed(1));
const overall = (r) =>
  r.listening_band == null || r.reading_band == null ? null : (Math.round(((r.listening_band + r.reading_band) / 2) * 2) / 2).toFixed(1);
const when = (t) =>
  t
    ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

/** Full mock results: one row per sitting, each with its PDF for the examiner. */
export function MockResults({ results, teacher = false, onDeleted, notify }) {
  const [busy, setBusy] = useState(null);
  const [deleting, setDeleting] = useState(null);
  // iPhone: the finished PDF waits here for a tap on "Save PDF".
  const [ready, setReady] = useState(null);

  async function download(r) {
    setBusy(r.id);
    try {
      const pdf = await makeMockPdf(r.id);
      if (needsTapToSave()) setReady(pdf);
      else await savePdf(pdf);
    } catch (e) {
      notify?.(e?.message || 'The PDF could not be made.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <ul className="mock-results card-white">
        {results.map((r) => {
          const ov = overall(r);
          const [w1, w2] = r.writing_words ?? [0, 0];
          return (
            <li key={r.id} className={`mock-row ${teacher ? 'mock-row--teacher' : ''}`}>
              {teacher && (
                <a className="lesson-row__who" href={`#/students/${r.student_id}`}>
                  <Avatar name={r.full_name} size={30} studentId={r.student_id} />
                  <span>
                    <strong>{r.full_name}</strong>
                    {r.group_name && <span className="muted-sm">{r.group_name}</span>}
                  </span>
                </a>
              )}
              <span className="mock-row__what">
                <strong>{r.title}</strong>
                <span className="muted-sm">
                  {r.finished_at ? `Finished ${when(r.finished_at)}` : `In progress · last saved ${when(r.updated_at)}`}
                </span>
              </span>
              <span className="mock-row__scores">
                <span title={r.listening_correct != null ? `${r.listening_correct}/40` : 'Not taken yet'}>
                  <small>Listening</small>
                  {band(r.listening_band)}
                </span>
                <span title={r.reading_correct != null ? `${r.reading_correct}/40` : 'Not taken yet'}>
                  <small>Reading</small>
                  {band(r.reading_band)}
                </span>
                <span className="is-main">
                  <small>Overall</small>
                  {ov ?? '—'}
                </span>
                <span title="Words written in Task 1 and Task 2">
                  <small>Writing</small>
                  {w1 + w2 ? `${w1} + ${w2}` : '—'}
                </span>
              </span>
              <span className={`mock-row__left ${r.leaves ? 'is-bad' : ''}`} title="Times the student left the test window">
                {r.leaves ? `Left ${r.leaves}×` : 'Stayed in'}
              </span>
              <span className="mock-row__act">
                <button type="button" className="btn btn--dark btn--sm" disabled={busy === r.id} onClick={() => download(r)}>
                  <DownloadIcon size={15} /> {busy === r.id ? 'Making PDF…' : 'PDF'}
                </button>
                {teacher && (
                  <button type="button" className="icon-btn icon-btn--ghost icon-btn--sm" aria-label="Delete result" onClick={() => setDeleting(r)}>
                    <TrashIcon size={16} />
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {ready && (
        <Sheet
          title="The PDF is ready"
          size="sm"
          onClose={() => setReady(null)}
          footer={
            <>
              <button type="button" className="btn btn--glass" onClick={() => setReady(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn--dark"
                onClick={() => {
                  savePdf(ready);
                  setReady(null);
                }}
              >
                <DownloadIcon size={15} /> Save PDF
              </button>
            </>
          }
        >
          <p className="sheet__message">
            <b>{ready.name}</b>
            <br />
            Tap Save PDF, then choose Save to Files (or send it on Telegram).
          </p>
        </Sheet>
      )}
      {deleting && (
        <ConfirmSheet
          title="Delete this result?"
          message={`${deleting.full_name} · ${deleting.title}. The answers and writing are deleted for good.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api.deleteMockResult(deleting.id);
            setDeleting(null);
            notify?.('Result deleted');
            onDeleted?.();
          }}
        />
      )}
    </>
  );
}
