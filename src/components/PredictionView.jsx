import { useState } from 'react';
import { PracticeLibrary } from './PracticeLibrary.jsx';
import { DownloadIcon } from './Icons.jsx';
import { predictionTable } from '../data/predictionReading.js';

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
        <>
          {predictionTable && unlocked && (
            <a className="btn btn--glass btn--sm pred-table" href={`${import.meta.env.BASE_URL}prediction/reading/table.pdf`} target="_blank" rel="noopener">
              <DownloadIcon size={15} /> The prediction table: every passage, when and where it appeared (PDF)
            </a>
          )}
          <PracticeLibrary key="prediction-reading" skill="prediction-reading" results={results} attempts={attempts} signedIn={signedIn} unlocked={unlocked} />
        </>
      )}
    </>
  );
}
