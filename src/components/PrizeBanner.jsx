import { navigate } from '../lib/router.js';

// Monthly prize for the most active student (most study time in the calendar month).
export const PRIZE = { amount: '100 000', currency: "so'm" };

function monthInfo() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysLeft = Math.max(1, Math.ceil((end - now) / 86400000));
  const month = now.toLocaleString('en-US', { month: 'long' });
  return { month, daysLeft };
}

/** Prize announcement. `leader` (optional) is the current #1 of the month. */
export function PrizeBanner({ leader = null, compact = false }) {
  const { month, daysLeft } = monthInfo();
  return (
    <section className={`prize ${compact ? 'prize--compact' : ''}`} aria-label="Monthly prize">
      <span className="prize__trophy" aria-hidden="true">
        🏆
      </span>
      <div className="prize__text">
        <span className="prize__kicker">Monthly prize · {month}</span>
        <strong className="prize__title">
          {PRIZE.amount} {PRIZE.currency} for the most active student
        </strong>
        <span className="prize__meta">
          The student with the most study time this month wins · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
          {leader && (
            <>
              {' '}
              · Leading now: <b>{leader}</b>
            </>
          )}
        </span>
      </div>
      {!compact && (
        <button type="button" className="btn btn--dark prize__cta" onClick={() => navigate('/rating')}>
          See the rating
        </button>
      )}
    </section>
  );
}
