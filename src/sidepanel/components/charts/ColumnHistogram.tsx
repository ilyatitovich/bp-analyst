import type { ReactNode } from "react";
import type { Bucket } from "../../../lib/analysis/stats";
import { cx, selectionClassName } from "../../../lib/utils/cx";
import { CollapsiblePanel } from "../ui/CollapsiblePanel";

export interface ColumnHistogramProps {
  title: string;
  items: Bucket[];
  dense?: boolean;
  formatLabel?: (label: string) => string;
  headerExtra?: ReactNode;
  selectedLabels?: Set<string>;
  onToggle?: (label: string) => void;
  leading?: ReactNode;
}

export function ColumnHistogram({
  title,
  items,
  dense = false,
  formatLabel,
  headerExtra,
  selectedLabels,
  onToggle,
  leading,
}: ColumnHistogramProps) {
  const max = Math.max(1, ...items.map((item) => item.count));
  const hasSelection = Boolean(selectedLabels?.size);

  return (
    <CollapsiblePanel title={title} headerExtra={headerExtra}>
      {leading}
      {items.length ? (
        <div
          className={`column-histogram${dense ? " column-histogram-dense" : ""}`}
        >
          {items.map((item) => {
            const selected = selectedLabels?.has(item.label) ?? false;
            const label = formatLabel ? formatLabel(item.label) : item.label;

            return (
              <button
                className={cx("hist-col", selectionClassName(selected, hasSelection))}
                disabled={!item.count || !onToggle}
                key={item.label}
                onClick={() => onToggle?.(item.label)}
                aria-pressed={selected}
                aria-label={
                  selected ? `Remove ${label} filter` : `Filter ${label}`
                }
                type="button"
              >
                <span className="hist-count">{item.count || ""}</span>
                <div className="hist-track">
                  <span className="hist-popup" aria-hidden="true">
                    {item.label.replace("-", "–")}
                  </span>
                  <div
                    className="hist-fill"
                    style={{ height: `${(item.count / max) * 100}%` }}
                  />
                </div>
                <span className="hist-label">{label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="muted">No data</p>
      )}
    </CollapsiblePanel>
  );
}
