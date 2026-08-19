import type { Bucket } from '../lib/analysis/stats';

export interface BarListProps {
  title: string;
  items: Bucket[];
  empty?: string;
}

export function BarList({ title, items, empty = 'No data' }: BarListProps) {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <section className="report-section">
      <h2>{title}</h2>
      {items.length ? (
        <ul className="report-bars">
          {items.map((item) => (
            <li key={item.label}>
              <span className="report-bar-label">{item.label}</span>
              <span className="report-bar-track">
                <span
                  className="report-bar-fill"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </span>
              <span className="report-bar-count">{item.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="report-muted">{empty}</p>
      )}
    </section>
  );
}
