import type { Bucket } from "../../lib/analysis/stats";
import { formatShare } from "../../lib/utils/format";

export interface ConcentrationGroupProps {
  title: string;
  share: number | null;
  items: Bucket[];
}

export function ConcentrationGroup({
  title,
  share,
  items,
}: ConcentrationGroupProps) {
  if (!items.length) return null;

  return (
    <div>
      <p className="brief-group-label brief-group-heading">
        <span>{title}</span>
        <strong className="brief-group-share">{formatShare(share)}</strong>
      </p>
      <div className="brief-chips">
        {items.map((item) => (
          <span className="brief-chip brief-chip-static" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
