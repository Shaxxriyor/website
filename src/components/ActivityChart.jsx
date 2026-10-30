import { useEffect, useState } from 'react';
import { ChevronDown } from './Icons.jsx';

const sum = (d, series) => series.reduce((t, s) => t + (d[s.key] || 0), 0);
const fmtH = (h) => (h > 0 && h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)}h`);

function trendBadge(totals, i) {
  const prev = totals[i - 1];
  if (!totals[i]) return null;
  if (!prev) return 'First month';
  const change = Math.round(((totals[i] - prev) / prev) * 100);
  if (change >= 10) return `+${change}% vs last month`;
  if (change <= -10) return `${change}% vs last month`;
  return 'Same as last month';
}

/**
 * Stacked monthly bars. `badge`: a fixed string, or omit to show the
 * month-over-month trend; `rangeLabel` replaces the decorative Year select.
 */
export function ActivityChart({ data, series, badge, rangeLabel, title = 'Activity' }) {
  const [selected, setSelected] = useState(data.length - 1);
  const [hovered, setHovered] = useState(null);
  useEffect(() => setSelected(data.length - 1), [data]);

  const totals = data.map((d) => sum(d, series));
  const peak = Math.max(...totals, 0);
  const max = peak > 0 ? peak * 1.08 : 1;
  const avg = totals.reduce((a, b) => a + b, 0) / (totals.length || 1);
  const focus = hovered ?? selected;
  const pill = badge ?? trendBadge(totals, selected);

  return (
    <section className="activity card-white" aria-labelledby="activity-title">
      <header className="activity__head">
        <span id="activity-title" className="label">{title}</span>
        {rangeLabel ? (
          <span className="select select--static">{rangeLabel}</span>
        ) : (
          <button className="select" aria-label="Range: Year">
            Year <ChevronDown size={14} />
          </button>
        )}
      </header>

      <div className="activity__kpi">
        <span className="activity__value">{fmtH(totals[selected] || 0)}</span>
        {pill && <span className="pill pill--soft">{pill}</span>}
      </div>

      <div className="chart" role="group" aria-label="Study hours per month by skill">
        {peak > 0 && (
          <span className="chart__avg" style={{ bottom: `${(avg / max) * 100}%` }} aria-hidden="true" />
        )}
        {peak === 0 && <span className="chart__empty">No lessons recorded yet</span>}
        {data.map((d, i) => {
          const total = totals[i];
          return (
            <button
              key={d.key || d.month}
              className={`chart__col ${i === selected ? 'is-selected' : ''} ${focus === i ? 'is-focus' : ''}`}
              onClick={() => setSelected(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              aria-label={`${d.month}: ${fmtH(total)} total`}
            >
              <span className="chart__bar" style={{ height: `${(total / max) * 100}%` }}>
                {[...series].reverse().map(
                  (s) =>
                    d[s.key] > 0 && (
                      <span key={s.key} className="chart__seg" style={{ flexGrow: d[s.key], background: s.color }} />
                    ),
                )}
              </span>
              <span className="chart__month">{d.month}</span>

              {hovered === i && (
                <span className="chart__tip" role="tooltip">
                  <strong>
                    {d.month} · {fmtH(total)}
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
