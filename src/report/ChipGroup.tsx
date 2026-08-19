import type { Bucket } from '../lib/analysis/stats';
import { formatShare } from '../lib/utils/format';

export type ChipItem = Bucket & { href?: string | null };

export interface ChipGroupProps {
  title: string;
  share?: number | null;
  items: ChipItem[];
}

export function ChipGroup({ title, share, items }: ChipGroupProps) {
  if (!items.length) return null;

  return (
    <div>
      <h3>
        {title}
        {share != null ? <span> {formatShare(share)}</span> : null}
      </h3>
      <ul className="report-chips">
        {items.map((item) => {
          const body = (
            <>
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </>
          );

          return (
            <li key={item.label}>
              {item.href ? (
                <a href={item.href} rel="noopener noreferrer" target="_blank">
                  {body}
                </a>
              ) : (
                <span className="report-chip-body">{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
