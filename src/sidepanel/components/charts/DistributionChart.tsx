import type { FilterListKey } from "../../../lib/analysis/filters";
import type { Bucket } from "../../../lib/analysis/stats";
import { cx, selectionClassName } from "../../../lib/utils/cx";
import type { TrackAnalysis } from "../../hooks/useTrackAnalysis";
import { CollapsiblePanel } from "../ui/CollapsiblePanel";
import { FilterChips } from "../ui/FilterChips";

export interface DistributionChartProps {
  title: string;
  items: Bucket[];
  analysis: TrackAnalysis;
  filterKey: FilterListKey;
}

export function DistributionChart({
  title,
  items,
  analysis,
  filterKey,
}: DistributionChartProps) {
  if (items.length <= 1) return null;
  const max = Math.max(1, ...items.map((item) => item.count));
  const selectedLabels = analysis.filters[filterKey];
  const selected = new Set(selectedLabels);
  const hasSelection = selected.size > 0;

  return (
    <CollapsiblePanel
      title={title}
      defaultOpen={false}
      headerExtra={
        <FilterChips
          values={selectedLabels}
          onRemove={(label) => analysis.toggleFilter(filterKey, label)}
          onReset={() => analysis.clearFilter(filterKey)}
        />
      }
    >
      <div className="bars">
        {items.map((item) => {
          const isSelected = selected.has(item.label);
          return (
            <button
              className={cx("bar-row", selectionClassName(isSelected, hasSelection))}
              key={item.label}
              onClick={() => analysis.toggleFilter(filterKey, item.label)}
              aria-pressed={isSelected}
              title={
                isSelected
                  ? `Remove ${item.label} filter`
                  : `Filter ${item.label}`
              }
              type="button"
            >
              <div className="bar-meta">
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </CollapsiblePanel>
  );
}
