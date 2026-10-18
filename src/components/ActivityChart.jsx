import { useState } from 'react';
import { ChevronDown } from './Icons.jsx';

const sum = (d, series) => series.reduce((t, s) => t + d[s.key], 0);
const fmtH = (h) => `${h.toFixed(1)}h`;

export function ActivityChart({ data, series }) {
  const [selected, setSelected] = useState(data.length - 1);
  const [hovered, setHovered] = useState(null);

  const totals = data.map((d) => sum(d, series));
  const max = Math.max(...totals) * 1.08;
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  const focus = hovered ?? selected;

  return (
    <section className="activity card-white" aria-labelledby="activity-title">
      <header className="activity__head">
        <span id="activity-title" className="label">Activity</span>
        <button className="select" aria-label="Range: Year">
          Year <ChevronDown size={14} />
        </button>
      </header>

      <div className="activity__kpi">
        <span className="activity__value">{fmtH(totals[selected])}</span>
        <span className="pill pill--soft">👍 Great result!</span>
      </div>

      <div className="chart" role="group" aria-label="Study hours per month by skill">
        <span
          className="chart__avg"
          style={{ bottom: `${(avg / max) * 100}%` }}
          aria-hidden="true"
        />
        {data.map((d, i) => {
          const total = totals[i];
          return (
            <button
              key={d.month}
              className={`chart__col ${i === selected ? 'is-selected' : ''} ${
                focus === i ? 'is-focus' : ''
              }`}
              onClick={() => setSelected(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              aria-label={`${d.month}: ${fmtH(total)} total`}
            >
              <span className="chart__bar" style={{ height: `${(total / max) * 100}%` }}>
                {[...series].reverse().map((s) => (
                  <span
                    key={s.key}
                    className="chart__seg"
                    style={{ flexGrow: d[s.key], background: s.color }}
                  />
                ))}
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
                      <b>{fmtH(d[s.key])}</b>
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
