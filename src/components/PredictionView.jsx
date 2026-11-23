import { useState } from 'react';
import { PracticeLibrary } from './PracticeLibrary.jsx';
import { SparkleIcon } from './Icons.jsx';

const PARTS = [
  { id: 'listening', label: 'Listening' },
  { id: 'reading', label: 'Reading' },
];

/** December Prediction: the tests predicted for this month's exams, Listening and Reading. */
export function PredictionView({ results = [], attempts = [], signedIn = false, unlocked = false }) {
  const [part, setPart] = useState('listening');
  return (
    <>
      <div className="seg-tabs pred-switch" role="tablist" aria-label="Skill">
        {PARTS.map((p) => (
          <button key={p.id} role="tab" aria-selected={part === p.id} className={`chip ${part === p.id ? 'is-active' : ''}`} onClick={() => setPart(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      {part === 'listening' ? (
        <PracticeLibrary key="prediction-listening" skill="prediction-listening" results={results} attempts={attempts} signedIn={signedIn} unlocked={unlocked} />
      ) : (
        <div className="empty card-white">
          <span className="empty__icon">
            <SparkleIcon size={20} />
          </span>
          <h3 className="empty__title">Reading predictions are coming</h3>
          <p className="muted-sm">The December Reading prediction tests will appear here very soon.</p>
        </div>
      )}
    </>
  );
}
