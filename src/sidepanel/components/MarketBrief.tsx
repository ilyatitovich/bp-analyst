import { formatTrackKey } from "../../lib/analysis/camelot";
import { BRIEF_STAT_HINTS } from "../../lib/constants/briefStatHints";
import type { KeyNotation } from "../../lib/messaging/protocol";
import type { ExtractionSnapshot } from "../../lib/types/track";
import { cx } from "../../lib/utils/cx";
import {
  coverageLabel,
  formatBpm,
  formatBpmRange,
  formatShare,
} from "../../lib/utils/format";
import type { BeatportScopedFacet } from "../../lib/utils/page";
import type { TrackAnalysis } from "../hooks/useTrackAnalysis";
import { BriefStat } from "./BriefStat";
import { ConcentrationGroup } from "./ConcentrationGroup";

export interface MarketBriefProps {
  analysis: TrackAnalysis;
  snapshot: ExtractionSnapshot | null;
  keyNotation: KeyNotation;
  scopedFacet: BeatportScopedFacet | null;
}

export function MarketBrief({
  analysis,
  snapshot,
  keyNotation,
  scopedFacet,
}: MarketBriefProps) {
  const { stats, tracks, filters, toggleExclusive, toggleHype, toggleFilter, toggleFreshness } =
    analysis;
  const coverage = coverageLabel(tracks.length, snapshot?.listCount, snapshot?.complete);
  const selectedMixTypes = new Set(filters.mixTypes);

  return (
    <section className="panel-card">
      <div className="chart-header">
        <h3>Market Brief</h3>
        {coverage ? <span className="muted">{coverage}</span> : null}
      </div>

      <div className="brief-grid">
        <BriefStat
          label="Exclusive"
          value={formatShare(stats.exclusiveShare)}
          hint={BRIEF_STAT_HINTS.exclusive}
          pressed={filters.includeExclusiveOnly}
          disabled={stats.exclusiveCount === 0 && !filters.includeExclusiveOnly}
          onClick={toggleExclusive}
        />
        <BriefStat
          label="Hype"
          value={formatShare(stats.hypeShare)}
          hint={BRIEF_STAT_HINTS.hype}
          pressed={filters.includeHypeOnly}
          disabled={stats.hypeCount === 0 && !filters.includeHypeOnly}
          onClick={toggleHype}
        />
        <BriefStat
          label="Last 7 days"
          value={formatShare(stats.freshness7Share)}
          hint={BRIEF_STAT_HINTS.freshness7}
          pressed={filters.publishedWithinDays === 7}
          disabled={stats.freshness7Count === 0 && filters.publishedWithinDays !== 7}
          onClick={() => toggleFreshness(7)}
        />
        <BriefStat
          label="Last 30 days"
          value={formatShare(stats.freshness30Share)}
          hint={BRIEF_STAT_HINTS.freshness30}
          pressed={filters.publishedWithinDays === 30}
          disabled={stats.freshness30Count === 0 && filters.publishedWithinDays !== 30}
          onClick={() => toggleFreshness(30)}
        />
        <BriefStat
          label="BPM median"
          value={formatBpm(stats.bpmMedian)}
          hint={BRIEF_STAT_HINTS.bpmMedian}
        />
        <BriefStat
          label="BPM p25–p75"
          value={formatBpmRange(stats.bpmP25, stats.bpmP75)}
          hint={BRIEF_STAT_HINTS.bpmIqr}
        />
      </div>

      <div className="brief-groups">
        <ConcentrationGroup
          title="Top 3 keys"
          share={stats.keyConcentrationShare}
          items={stats.keyConcentration.map((item) => ({
            ...item,
            label: formatTrackKey(item.label, null, keyNotation) ?? item.label,
          }))}
        />
        {scopedFacet === "label" ? null : (
          <ConcentrationGroup
            title="Top 5 labels"
            share={stats.labelConcentrationShare}
            items={stats.labelConcentration}
          />
        )}
        {scopedFacet === "artist" ? null : (
          <ConcentrationGroup
            title="Top 5 artists"
            share={stats.artistConcentrationShare}
            items={stats.artistConcentration}
          />
        )}
        <div>
          <p className="brief-group-label">Mix type</p>
          <div className="brief-chips">
            {stats.mixTypeHistogram.map((item) => {
              const selected = selectedMixTypes.has(item.label);
              return (
                <button
                  key={item.label}
                  type="button"
                  className={cx("brief-chip", selected && "selected")}
                  aria-pressed={selected}
                  disabled={item.count === 0 && !selected}
                  onClick={() => toggleFilter("mixTypes", item.label)}
                >
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="brief-group-label">Length</p>
          <div className="brief-chips">
            {stats.lengthHistogram.map((item) => (
              <span className="brief-chip brief-chip-static" key={item.label}>
                <span>{item.label} min</span>
                <strong>{item.count}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
