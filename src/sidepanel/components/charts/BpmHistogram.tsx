import {
  bpmBucketRangeLabel,
  bpmBucketStartLabel,
  formatBpm,
  formatBpmRange,
} from "../../../lib/utils/format";
import type { TrackAnalysis } from "../../hooks/useTrackAnalysis";
import { FilterChips } from "../ui/FilterChips";
import { StatCard } from "../ui/StatCard";
import { ColumnHistogram } from "./ColumnHistogram";

export interface BpmHistogramProps {
  analysis: TrackAnalysis;
}

export function BpmHistogram({ analysis }: BpmHistogramProps) {
  const { stats, filteredStats, filters, toggleFilter, clearFilter } = analysis;

  return (
    <ColumnHistogram
      title="BPM"
      items={stats.bpmHistogram}
      formatLabel={bpmBucketStartLabel}
      selectedLabels={new Set(filters.bpmBuckets)}
      onToggle={(label) => toggleFilter("bpmBuckets", label)}
      headerExtra={
        <FilterChips
          values={filters.bpmBuckets}
          formatValue={bpmBucketRangeLabel}
          onRemove={(label) => toggleFilter("bpmBuckets", label)}
          onReset={() => clearFilter("bpmBuckets")}
        />
      }
      leading={
        <div className="panel-stats">
          <StatCard
            label="p25–p75"
            value={formatBpmRange(filteredStats.bpmP25, filteredStats.bpmP75)}
          />
          <StatCard label="Median" value={formatBpm(filteredStats.bpmMedian)} />
          <StatCard label="Mode" value={formatBpm(filteredStats.bpmMode)} />
        </div>
      }
    />
  );
}
