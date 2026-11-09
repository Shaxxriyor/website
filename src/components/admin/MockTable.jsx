import { useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { MOCKS, mockById } from '../../lib/mocks.js';
import { bestMatch, overallBand, parseSpeaking, rankRows } from '../../lib/mockTable.js';
import { needsTapToSave, savePdf } from '../../lib/mockPdf.js';
import { DownloadIcon, EditIcon, LogoMark, PlusIcon, TrashIcon } from '../Icons.jsx';
import { ErrorNote, Sheet, Skeleton, useLoad } from './ui.jsx';

const keyOf = (r) => (r.id ? `r${r.id}` : `m${r.mark_id}`);
const fmt = (b) => (b == null ? '–' : Number(b).toFixed(1));
const longDate = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return {
    day: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    weekday: d.toLocaleDateString('en-GB', { weekday: 'long' }),
  };
};
const tone = (b) => (b >= 8 ? 'top' : b >= 7 ? 'good' : 'ok');

/** Mock results table like the one sent to students: every candidate ranked, with all four skills. */
export function MockTable({ notify }) {
  const [mock, setMock] = useState(MOCKS[0].id);
  const { data, error, loading, reload } = useLoad(() => api.mockTable(mock), [mock]);
  const [editing, setEditing] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState('');
  const [ready, setReady] = useState(null);
  const sheet = useRef(null);
  const rows = data?.rows ?? [];
  // Rows with no score at all (an empty sitting, a test account) stay out of the table.
  const hasAny = (r) => [r.listening_band, r.reading_band, r.writing, r.speaking].some((x) => x != null);
  const shown = useMemo(() => rankRows(rows.filter((r) => !r.hidden && hasAny(r))), [rows]);
  const info = mockById(mock);
  const when = longDate(info.date);

  async function save(marks, message) {
    try {
      await api.saveMockMarks(mock, marks);
      notify?.(message);
      reload();
    } catch (err) {
      notify?.(err.message);
      throw err;
    }
  }
  const markOf = (r, change) => ({
    ...(r.id ? { result_id: r.id } : { mark_id: r.mark_id }),
    writing: r.writing,
    speaking: r.speaking,
    speaking_parts: r.speaking_parts,
    hidden: r.hidden,
    ...change,
  });

  async function picture() {
    const { default: html2canvas } = await import('html2canvas');
    await document.fonts?.ready;
    return html2canvas(sheet.current, { scale: 2, backgroundColor: '#ffffff', windowWidth: 1400 });
  }
  async function download(kind) {
    setBusy(kind);
    try {
      const canvas = await picture();
      const base = `${info.title} - results`;
      let file;
      if (kind === 'png') {
        const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
        file = { blob, name: `${base}.png` };
      } else {
        const { jsPDF } = await import('jspdf');
        const w = canvas.width / 2;
        const h = canvas.height / 2;
        const doc = new jsPDF({ unit: 'px', format: [w, h], orientation: w > h ? 'landscape' : 'portrait', hotfixes: ['px_scaling'] });
        doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, w, h);
        file = { blob: doc.output('blob'), name: `${base}.pdf` };
      }
      if (needsTapToSave()) setReady(file);
      else await savePdf(file);
    } catch (err) {
      notify?.(err?.message || 'The table could not be saved.');
    }
    setBusy('');
  }

  return (
    <>
      <div className="toolbar mt-toolbar">
        {MOCKS.length > 1 && (
          <select className="input input--pill" value={mock} onChange={(e) => setMock(e.target.value)} aria-label="Mock test">
            {MOCKS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        )}
        <button className="btn btn--dark btn--sm" onClick={() => setPasting(true)}>
          <PlusIcon size={15} /> Paste speaking results
        </button>
        <button className={`btn btn--sm ${editing ? 'btn--dark' : 'btn--glass'}`} onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
          <EditIcon size={15} /> {editing ? 'Done editing' : 'Edit marks'}
        </button>
        <span className="mt-toolbar__gap" />
        <button className="btn btn--glass btn--sm" disabled={!!busy || !shown.length} onClick={() => download('png')}>
          <DownloadIcon size={15} /> {busy === 'png' ? 'Making…' : 'Image'}
        </button>
        <button className="btn btn--glass btn--sm" disabled={!!busy || !shown.length} onClick={() => download('pdf')}>
          <DownloadIcon size={15} /> {busy === 'pdf' ? 'Making…' : 'PDF'}
        </button>
      </div>
      {editing && (
        <p className="muted-sm mt-hint">
          Type the Writing band and Speaking (F/L/G/P and band) for each candidate; each change is saved when you leave the box. Untick
          a row to leave it out of the table (rows with no score yet are left out anyway).{' '}
          <button className="link-btn" onClick={() => setAdding(true)}>
            Add a candidate without a mock sitting
          </button>
        </p>
      )}

      {loading && !data ? (
        <Skeleton rows={6} />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <div className="mt-scroll">
          {editing ? (
            <EditTable rows={rows} onSave={(r, change) => save([markOf(r, change)], 'Saved')} onRemove={async (r) => {
              await api.deleteMockMark(r.mark_id);
              notify?.('Removed');
              reload();
            }} />
          ) : (
            <div className="mt-sheet" ref={sheet}>
              <div className="mt-brand">
                <LogoMark size={54} />
                <span>READING_CDI</span>
              </div>
              <h2 className="mt-title">
                Mock test results on the{' '}
                <em>
                  {when.day}, ({when.weekday})
                </em>
              </h2>
              <p className="mt-sub">
                {info.title} — Academic · Listening / Reading from the mock platform, Writing and Speaking marked by the examiners
              </p>
              <table className="mt-table">
                <thead>
                  <tr>
                    <th rowSpan={2}>Rank</th>
                    <th rowSpan={2} className="mt-name">
                      Candidate Name
                    </th>
                    <th rowSpan={2}>Mock Date</th>
                    <th colSpan={2}>Listening</th>
                    <th colSpan={2}>Reading</th>
                    <th>Writing</th>
                    <th colSpan={2}>Speaking</th>
                    <th rowSpan={2}>Overall</th>
                  </tr>
                  <tr>
                    <th>Count</th>
                    <th>Score</th>
                    <th>Count</th>
                    <th>Score</th>
                    <th>Score</th>
                    <th>F / L / G / P</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r, i) => {
                    const ov = overallBand(r);
                    return (
                      <tr key={keyOf(r)} className={ov == null ? 'is-pending' : ''}>
                        <td>{i + 1}</td>
                        <td className="mt-name">
                          <b>{r.full_name}</b>
                        </td>
                        <td>{r.date || info.date}</td>
                        <td>{r.listening_correct ?? '–'}</td>
                        <td>
                          <b>{fmt(r.listening_band)}</b>
                        </td>
                        <td>{r.reading_correct ?? '–'}</td>
                        <td>
                          <b>{fmt(r.reading_band)}</b>
                        </td>
                        <td>
                          <b>{fmt(r.writing)}</b>
                        </td>
                        <td className="mt-parts">{r.speaking_parts || '–'}</td>
                        <td>
                          <b>{fmt(r.speaking)}</b>
                        </td>
                        <td>{ov == null ? <span className="mt-pill is-pending">pending</span> : <span className={`mt-pill is-${tone(ov)}`}>{ov.toFixed(1)}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-foot">Overall band = average of the four skills, rounded to the nearest half band.</p>
            </div>
          )}
        </div>
      )}

      {pasting && <PasteSheet rows={rows} onClose={() => setPasting(false)} onSave={async (marks) => {
        await save(marks, `Speaking saved for ${marks.length} candidate${marks.length === 1 ? '' : 's'}`);
        setPasting(false);
      }} />}
      {adding && <AddSheet onClose={() => setAdding(false)} onSave={async (mark) => {
        await save([mark], 'Candidate added');
        setAdding(false);
      }} />}
      {ready && (
        <Sheet
          title="The table is ready"
          size="sm"
          onClose={() => setReady(null)}
          footer={
            <>
              <button type="button" className="btn btn--glass" onClick={() => setReady(null)}>
                Close
              </button>
              <button type="button" className="btn btn--dark" onClick={() => { savePdf(ready); setReady(null); }}>
                <DownloadIcon size={15} /> Save
              </button>
            </>
          }
        >
          <p className="sheet__message">
            <b>{ready.name}</b>
            <br />
            Tap Save, then choose Save to Files or send it on Telegram.
          </p>
        </Sheet>
      )}
    </>
  );
}

/** One line per candidate with inputs for the examiners' marks. */
function EditTable({ rows, onSave, onRemove }) {
  const sorted = useMemo(() => [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name)), [rows]);
  return (
    <table className="mt-table mt-table--edit">
      <thead>
        <tr>
          <th>In table</th>
          <th className="mt-name">Candidate</th>
          <th>Listening</th>
          <th>Reading</th>
          <th>Writing band</th>
          <th>Speaking F/L/G/P</th>
          <th>Speaking band</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <EditRow key={keyOf(r)} r={r} onSave={onSave} onRemove={onRemove} />
        ))}
      </tbody>
    </table>
  );
}

function EditRow({ r, onSave, onRemove }) {
  const [v, setV] = useState({ writing: r.writing ?? '', speaking_parts: r.speaking_parts ?? '', speaking: r.speaking ?? '' });
  const commit = (key) => {
    const value = String(v[key]).trim().replace(',', '.');
    const before = String(r[key] ?? '');
    if (value === before) return;
    const change = { [key]: value === '' ? null : key === 'speaking_parts' ? value : Number(value) };
    // Parts typed without a band: the band is their average.
    if (key === 'speaking_parts' && value && String(v.speaking).trim() === '') {
      const p = value.split('/').map(Number);
      if (p.length === 4 && p.every((x) => !Number.isNaN(x))) {
        const band = Math.round((p.reduce((a, b) => a + b, 0) / 4) * 2) / 2;
        change.speaking = band;
        setV((x) => ({ ...x, speaking: band }));
      }
    }
    onSave(r, change).catch(() => {});
  };
  const input = (key, props) => (
    <input
      className="input mt-input"
      value={v[key]}
      onChange={(e) => setV((x) => ({ ...x, [key]: e.target.value }))}
      onBlur={() => commit(key)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      {...props}
    />
  );
  return (
    <tr className={r.hidden ? 'is-pending' : ''}>
      <td>
        <input type="checkbox" checked={!r.hidden} onChange={(e) => onSave(r, { hidden: !e.target.checked }).catch(() => {})} aria-label="Show in the table" />
      </td>
      <td className="mt-name">
        <b>{r.full_name}</b>
        {!r.id && <small className="muted-sm"> · speaking only</small>}
      </td>
      <td>{r.listening_band != null ? `${r.listening_correct} · ${fmt(r.listening_band)}` : '–'}</td>
      <td>{r.reading_band != null ? `${r.reading_correct} · ${fmt(r.reading_band)}` : '–'}</td>
      <td>{input('writing', { inputMode: 'decimal', placeholder: '6.5', 'aria-label': 'Writing band', maxLength: 3 })}</td>
      <td>{input('speaking_parts', { placeholder: '6/7/7/7', 'aria-label': 'Speaking F/L/G/P', maxLength: 15 })}</td>
      <td>{input('speaking', { inputMode: 'decimal', placeholder: '7.0', 'aria-label': 'Speaking band', maxLength: 3 })}</td>
      <td>
        {!r.id && (
          <button className="icon-btn icon-btn--ghost icon-btn--sm" aria-label="Remove candidate" onClick={() => onRemove(r)}>
            <TrashIcon size={15} />
          </button>
        )}
      </td>
    </tr>
  );
}

/** Paste the speaking examiner's list; each line is matched to a candidate, which can be changed before saving. */
function PasteSheet({ rows, onClose, onSave }) {
  const [text, setText] = useState('');
  const [picks, setPicks] = useState(null);
  const [busy, setBusy] = useState(false);
  const candidates = useMemo(() => [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name)), [rows]);

  function read() {
    setPicks(
      parseSpeaking(text).map((p) => {
        const m = bestMatch(p.name, candidates);
        return { ...p, target: m ? keyOf(m) : 'new' };
      }),
    );
  }
  async function submit() {
    setBusy(true);
    const marks = picks
      .filter((p) => p.target !== 'skip' && p.speaking != null)
      .map((p) => {
        const r = candidates.find((c) => keyOf(c) === p.target);
        if (!r) return { name: p.name, speaking: p.speaking, speaking_parts: p.speaking_parts };
        return {
          ...(r.id ? { result_id: r.id } : { mark_id: r.mark_id }),
          writing: r.writing,
          hidden: r.hidden,
          speaking: p.speaking,
          speaking_parts: p.speaking_parts,
        };
      });
    try {
      await onSave(marks);
    } catch {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Paste speaking results"
      subtitle="One candidate a line, as the examiner sends them: Rustam 7.5 (8/8/7/8)"
      size="lg"
      onClose={onClose}
      footer={
        picks ? (
          <>
            <button type="button" className="btn btn--glass" onClick={() => setPicks(null)}>
              Back
            </button>
            <button type="button" className="btn btn--dark" disabled={busy || !picks.length} onClick={submit}>
              {busy ? 'Saving…' : `Save ${picks.filter((p) => p.target !== 'skip').length}`}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--dark" disabled={!text.trim()} onClick={read}>
            Match the names
          </button>
        )
      }
    >
      {!picks ? (
        <textarea
          className="input input--area mt-paste"
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Iffatoy 6.5 (6/7/7/7)\nRustam 7.5 (8/8/7/8)\nNilufar 8 (8/9/8/8)'}
          autoFocus
        />
      ) : (
        <ul className="mt-picks">
          {picks.map((p, i) => (
            <li key={i}>
              <span className="mt-picks__line">
                <b>{p.name}</b> · {p.speaking ?? '?'} {p.speaking_parts && `(${p.speaking_parts})`}
              </span>
              <select
                className={`input input--pill ${p.target === 'new' ? 'is-new' : ''}`}
                value={p.target}
                onChange={(e) => setPicks((all) => all.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))}
                aria-label={`Who is ${p.name}`}
              >
                {candidates.map((c) => (
                  <option key={keyOf(c)} value={keyOf(c)}>
                    {c.full_name}
                    {c.id ? '' : ' (speaking only)'}
                  </option>
                ))}
                <option value="new">New: {p.name} (no mock sitting)</option>
                <option value="skip">Skip this line</option>
              </select>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function AddSheet({ onClose, onSave }) {
  const [v, setV] = useState({ name: '', writing: '', speaking_parts: '', speaking: '' });
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Sheet
      title="Add a candidate"
      subtitle="For someone who sat Speaking (or Writing) but has no mock sitting on the site"
      size="sm"
      onClose={onClose}
      onSubmit={() => onSave({ name: v.name, writing: v.writing || null, speaking_parts: v.speaking_parts, speaking: v.speaking || null }).catch(() => {})}
      footer={
        <button type="submit" className="btn btn--dark" disabled={!v.name.trim()}>
          Add
        </button>
      }
    >
      <label className="field">
        <span className="field__label">Full name</span>
        <input className="input" value={v.name} onChange={set('name')} maxLength={120} />
      </label>
      <label className="field">
        <span className="field__label">Writing band (optional)</span>
        <input className="input" value={v.writing} onChange={set('writing')} inputMode="decimal" placeholder="6.5" />
      </label>
      <label className="field">
        <span className="field__label">Speaking F/L/G/P and band</span>
        <span className="mt-two">
          <input className="input" value={v.speaking_parts} onChange={set('speaking_parts')} placeholder="6/7/7/7" />
          <input className="input" value={v.speaking} onChange={set('speaking')} inputMode="decimal" placeholder="7.0" />
        </span>
      </label>
    </Sheet>
  );
}
