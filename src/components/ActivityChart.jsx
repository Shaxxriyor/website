import { useEffect, useState } from 'react';

const sum = (d, series) => series.reduce((t, s) => t + (d[s.key] || 0), 0);
const fmtH = (h) => (h > 0 && h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)}h`);

// The month the chart shows, from its first day ("November 2026").
const monthName = (data) => {
  const key = data[0]?.key;
  if (!key || key.length < 10) return '';
  return new Date(`${key}T12:00:00Z`).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};
// Day numbers under the bars: the 1st, every 5th, the last day and today.
const showLabel = (d, i, n) => i === 0 || i === n - 1 || d.today || (i + 1) % 5 === 0;

/**
 * Stacked bars, one per day of the current month (data from the server's
 * monthlyActivity). The headline is the selected day; the pill the month's total.
 */
export function ActivityChart({ data, series, badge, title = 'Activity' }) {
  const todayIndex = () => Math.max(0, data.findIndex((d) => d.today));
  const [selected, setSelected] = useState(todayIndex);
  const [hovered, setHovered] = useState(null);
  useEffect(() => setSelected(todayIndex()), [data]);

  const totals = data.map((d) => sum(d, series));
  const peak = Math.max(...totals, 0);
  const max = peak > 0 ? peak * 1.08 : 1;
  const avg = totals.reduce((a, b) => a + b, 0) / (totals.length || 1);
  const focus = hovered ?? selected;
  const monthTotal = totals.reduce((a, b) => a + b, 0);
  const pill = badge ?? (monthTotal > 0 ? `${fmtH(monthTotal)} this month` : null);
  const label = (d) => d.title || d.label || d.month;

  return (
    <section className="activity card-white" aria-labelledby="activity-title">
      <header className="activity__head">
        <span id="activity-title" className="label">{title}</span>
        <span className="select select--static">{monthName(data)}</span>
      </header>

      <div className="activity__kpi">
        <span className="activity__value">{fmtH(totals[selected] || 0)}</span>
        <span className="muted-sm activity__day">{data[selected]?.today ? 'today' : data[selected] ? label(data[selected]) : ''}</span>
        {pill && <span className="pill pill--soft">{pill}</span>}
      </div>

      <div className="chart chart--days" style={{ '--cols': data.length }} role="group" aria-label="Study hours per day by skill">
        {peak > 0 && (
          <span className="chart__avg" style={{ bottom: `${(avg / max) * 100}%` }} aria-hidden="true" />
        )}
        {peak === 0 && <span className="chart__empty">No study time this month yet</span>}
        {data.map((d, i) => {
          const total = totals[i];
          return (
            <button
              key={d.key || d.month}
              className={`chart__col ${i === selected ? 'is-selected' : ''} ${focus === i ? 'is-focus' : ''} ${d.future ? 'is-future' : ''} ${d.today ? 'is-today' : ''}`}
              onClick={() => setSelected(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              aria-label={`${label(d)}: ${fmtH(total)} total`}
            >
              <span className="chart__bar" style={{ height: `${(total / max) * 100}%` }}>
                {[...series].reverse().map(
                  (s) =>
                    d[s.key] > 0 && (
                      <span key={s.key} className="chart__seg" style={{ flexGrow: d[s.key], background: s.color }} />
                    ),
                )}
              </span>
              <span className="chart__month">{showLabel(d, i, data.length) || i === selected ? d.label ?? d.month : ''}</span>

              {hovered === i && (
                <span className="chart__tip" role="tooltip">
                  <strong>
                    {label(d)} · {fmtH(total)}
                  </strong>
                  {series.map((s) => (
                    <span key={s.key} className="chart__tip-row">
                      <i style={{ background: s.color }} />
                      {s.label}
                      <b>{fmtH(d[s.key] || 0)}</b>
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ul className="legend" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
