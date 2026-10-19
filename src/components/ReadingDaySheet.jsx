import { useState } from 'react';
import { els } from '../data/els.js';
import { formatBand } from '../lib/band.js';
import { ArrowRight, CheckIcon } from './Icons.jsx';
import { Sheet } from './admin/ui.jsx';
import { ElsDaySheet } from './ElsView.jsx';

/**
 * Reading Marathon day = two tasks: the reading test, and the ELS Reading exercise
 * for the same day (read, do the exercises, upload the notebook translation).
 * The day is complete only when both are done.
 */
export function ReadingDaySheet({ day, result, elsDone, me, admin, onClose, onChanged }) {
  const [elsOpen, setElsOpen] = useState(false);
  const elsDay = els.days[day.day - 1];
  const tested = result?.correct != null;
  const complete = tested && elsDone;

  if (elsOpen && elsDay) {
    return (
      <ElsDaySheet
        day={elsDay}
        me={me}
        admin={admin}
        onClose={() => setElsOpen(false)}
        onChanged={() => onChanged?.()}
      />
    );
  }

  return (
    <Sheet
      title={`Day ${day.day} · Reading Marathon`}
      subtitle="Do both tasks — the day counts only when the test and the ELS exercise are finished."
      onClose={onClose}
    >
      <div className={`rday__status ${complete ? 'is-done' : ''}`}>
        {complete ? (
          <>
            <CheckIcon size={16} /> Day {day.day} complete
          </>
        ) : (
          <>
            {tested && !elsDone && 'The test is done — now do the ELS exercise to complete the day.'}
            {!tested && elsDone && 'The ELS exercise is done — now take the reading test to complete the day.'}
            {!tested && !elsDone && 'Not started yet.'}
          </>
        )}
      </div>

      <ol className="rday">
        <li className={`rday__task ${tested ? 'is-done' : ''}`}>
          <span className="rday__num">{tested ? <CheckIcon size={16} /> : 1}</span>
          <span className="rday__text">
            <b>Reading test</b>
            <span className="muted-sm">
              {day.title} · passage with Uzbek translation · {day.questions} questions
            </span>
            {tested && (
              <span className="rday__score">
                Best: {result.correct}/{result.total} · band {formatBand(result.band)}
              </span>
            )}
          </span>
          <a className="btn btn--dark btn--sm" href={day.href}>
            {tested ? 'Retake' : 'Start'} <ArrowRight size={14} />
          </a>
        </li>
        <li className={`rday__task ${elsDone ? 'is-done' : ''}`}>
          <span className="rday__num">{elsDone ? <CheckIcon size={16} /> : 2}</span>
          <span className="rday__text">
            <b>ELS Reading exercise</b>
            <span className="muted-sm">
              {elsDay ? `${elsDay.title} · ` : ''}read the text, do the exercises, upload your notebook translation
            </span>
            {elsDone && <span className="rday__score">Translation uploaded</span>}
          </span>
          <button type="button" className="btn btn--dark btn--sm" onClick={() => setElsOpen(true)} disabled={!elsDay}>
            {elsDone ? 'Open' : 'Start'} <ArrowRight size={14} />
          </button>
        </li>
      </ol>
    </Sheet>
  );
}
