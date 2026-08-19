import { formatTrackKey } from "../../lib/analysis/camelot";
import type { Bucket, TrackStats } from "../../lib/analysis/stats";
import type { KeyNotation } from "../../lib/messaging/protocol";
import {
  coverageLabel,
  formatBpm,
  formatBpmRange,
  formatShare,
} from "../../lib/utils/format";
import { BRIEF_STAT_HINTS } from "./briefStatHints";
import { cx } from "./ui";

function BriefStat({
  label,
  value,
  hint,
  pressed,
  disabled,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const className = cx(
    "brief-stat",
    !onClick && "brief-stat-static",
    pressed && "selected",
  );

  const body = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      <span className="brief-stat-popup">{hint}</span>
    </>
  );

  if (!onClick) {
    return <div className={className}>{body}</div>;
  }

  return (
    <button
      className={className}
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {body}
    </button>
  );
}

function ConcentrationGroup({
  title,
  share,
  items,
}: {
  title: string;
  share: number | null;
  items: Bucket[];
}) {
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

export function MarketBrief({
  stats,
  trackCount,
  listCount,
  complete,
  exclusiveOnly,
  hypeOnly,
  mixTypes,
  publishedWithinDays,
  keyNotation,
  onToggleExclusive,
  onToggleHype,
  onToggleMixType,
  onToggleFreshness,
}: {
  stats: TrackStats;
  trackCount: number;
  listCount?: number | null;
  complete?: boolean;
  exclusiveOnly: boolean;
  hypeOnly: boolean;
  mixTypes: string[];
  publishedWithinDays: 7 | 30 | null;
  keyNotation: KeyNotation;
  onToggleExclusive: () => void;
  onToggleHype: () => void;
  onToggleMixType: (mixType: string) => void;
  onToggleFreshness: (days: 7 | 30) => void;
}) {
  const coverage = coverageLabel(trackCount, listCount, complete);
  const selectedMixTypes = new Set(mixTypes);

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
          pressed={exclusiveOnly}
          disabled={stats.exclusiveCount === 0 && !exclusiveOnly}
          onClick={onToggleExclusive}
        />
        <BriefStat
          label="Hype"
          value={formatShare(stats.hypeShare)}
          hint={BRIEF_STAT_HINTS.hype}
          pressed={hypeOnly}
          disabled={stats.hypeCount === 0 && !hypeOnly}
          onClick={onToggleHype}
        />
        <BriefStat
          label="Last 7 days"
          value={formatShare(stats.freshness7Share)}
          hint={BRIEF_STAT_HINTS.freshness7}
          pressed={publishedWithinDays === 7}
          disabled={stats.freshness7Count === 0 && publishedWithinDays !== 7}
          onClick={() => onToggleFreshness(7)}
        />
        <BriefStat
          label="Last 30 days"
          value={formatShare(stats.freshness30Share)}
          hint={BRIEF_STAT_HINTS.freshness30}
          pressed={publishedWithinDays === 30}
          disabled={stats.freshness30Count === 0 && publishedWithinDays !== 30}
          onClick={() => onToggleFreshness(30)}
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
        <ConcentrationGroup
          title="Top 5 labels"
          share={stats.labelConcentrationShare}
          items={stats.labelConcentration}
        />
        <ConcentrationGroup
          title="Top 5 artists"
          share={stats.artistConcentrationShare}
          items={stats.artistConcentration}
        />
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
                  onClick={() => onToggleMixType(item.label)}
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
