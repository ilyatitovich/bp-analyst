import type { FilterListKey } from "../../../lib/analysis/filters";
import type { Bucket } from "../../../lib/analysis/stats";
import { cx, selectionClassName } from "../../../lib/utils/cx";
import type { TrackAnalysis } from "../../hooks/useTrackAnalysis";
import { CollapsiblePanel } from "../ui/CollapsiblePanel";
import { FilterChips } from "../ui/FilterChips";

export interface CountTableProps {
  title: string;
  nameHeader: string;
  items: Bucket[];
  analysis: TrackAnalysis;
  filterKey: FilterListKey;
}

export function CountTable({
  title,
  nameHeader,
  items,
  analysis,
  filterKey,
}: CountTableProps) {
  if (items.length <= 1) return null;
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
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{nameHeader}</th>
              <th className="count-cell">Count</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isSelected = selected.has(item.label);
              return (
                <tr
                  className={cx(
                    "filter-row",
                    selectionClassName(isSelected, hasSelection),
                  )}
                  key={item.label}
                  onClick={() => analysis.toggleFilter(filterKey, item.label)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      analysis.toggleFilter(filterKey, item.label);
                    }
                  }}
                  aria-pressed={isSelected}
                  role="button"
                  tabIndex={0}
                  title={
                    isSelected
                      ? `Remove ${item.label} filter`
                      : `Filter ${item.label}`
                  }
                >
                  <td>{item.label}</td>
                  <td className="count-cell">{item.count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CollapsiblePanel>
  );
}
