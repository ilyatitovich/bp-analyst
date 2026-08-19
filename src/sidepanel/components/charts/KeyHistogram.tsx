import { useMemo } from "react";
import { formatTrackKey, scaleToCamelot } from "../../../lib/analysis/camelot";
import type { KeyNotation } from "../../../lib/messaging/protocol";
import type { TrackAnalysis } from "../../hooks/useTrackAnalysis";
import { FilterChips } from "../ui/FilterChips";
import { StatCard } from "../ui/StatCard";
import { ColumnHistogram } from "./ColumnHistogram";

export interface KeyHistogramProps {
  analysis: TrackAnalysis;
  notation: KeyNotation;
  onNotationChange: (notation: KeyNotation) => void;
}

export function KeyHistogram({
  analysis,
  notation,
  onNotationChange,
}: KeyHistogramProps) {
  const { stats, filteredStats, filters, toggleFilter, clearFilter } = analysis;
  const selectedKeys = filters.camelotKeys;
  const selectedLabels = useMemo(() => {
    if (notation === "camelot") return new Set(selectedKeys);
    return new Set(
      selectedKeys.map((key) => formatTrackKey(key, null, "scale") ?? key),
    );
  }, [notation, selectedKeys]);

  return (
    <ColumnHistogram
      title="Keys"
      dense
      items={notation === "camelot" ? stats.camelotHistogram : stats.scaleHistogram}
      selectedLabels={selectedLabels}
      onToggle={(label) => {
        const camelot = notation === "camelot" ? label : scaleToCamelot(label);
        if (camelot) toggleFilter("camelotKeys", camelot);
      }}
      leading={
        <div className="panel-stats">
          <StatCard
            label="Median"
            value={formatTrackKey(filteredStats.camelotMedian, null, notation) ?? "-"}
          />
          <StatCard
            label="Mode"
            value={formatTrackKey(filteredStats.camelotMode, null, notation) ?? "-"}
          />
        </div>
      }
      headerExtra={
        <>
          <FilterChips
            values={selectedKeys}
            formatValue={(key) => formatTrackKey(key, null, notation) ?? key}
            onRemove={(key) => toggleFilter("camelotKeys", key)}
            onReset={() => clearFilter("camelotKeys")}
          />
          <div className="segmented" role="group" aria-label="Key notation">
            <button
              className={notation === "scale" ? "active" : undefined}
              onClick={() => onNotationChange("scale")}
              type="button"
            >
              Scale
            </button>
            <button
              className={notation === "camelot" ? "active" : undefined}
              onClick={() => onNotationChange("camelot")}
              type="button"
            >
              Camelot
            </button>
          </div>
        </>
      }
    />
  );
}
