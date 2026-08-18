import type { TrackStats } from "../analysis/stats";

function formatShare(share: number | null): string {
  if (share === null) return "-";
  return `${Math.round(share * 100)}%`;
}

function formatBpm(value: number | null): string {
  if (value === null) return "-";
  return String(value);
}

function coverageLabel(
  trackCount: number,
  listCount?: number | null,
  complete?: boolean,
): string | null {
  if (complete === true) return null;
  if (listCount != null && listCount > trackCount) {
    return `Based on ${trackCount} of ${listCount} tracks`;
  }
  if (complete === false) {
    return `Based on ${trackCount} tracks`;
  }
  return null;
}

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
  hint?: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const className = [
    "brief-stat",
    onClick ? "" : "brief-stat-static",
    pressed ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <span className="brief-stat-hint">{hint}</span> : null}
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

export function MarketBrief({
  stats,
  trackCount,
  listCount,
  complete,
  exclusiveOnly,
  hypeOnly,
  mixTypes,
  publishedWithinDays,
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
  onToggleExclusive: () => void;
  onToggleHype: () => void;
  onToggleMixType: (mixType: string) => void;
  onToggleFreshness: (days: 7 | 30) => void;
}) {
  const coverage = coverageLabel(trackCount, listCount, complete);
  const selectedMixTypes = new Set(mixTypes);
  const iqr =
    stats.bpmP25 !== null && stats.bpmP75 !== null
      ? `${formatBpm(stats.bpmP25)}–${formatBpm(stats.bpmP75)}`
      : "-";

  return (
    <section className="panel-card">
      <div className="chart-header">
        <h3>Market brief</h3>
        {coverage ? <span className="muted">{coverage}</span> : null}
      </div>

      <div className="brief-grid">
        <BriefStat
          label="Exclusive"
          value={formatShare(stats.exclusiveShare)}
          pressed={exclusiveOnly}
          disabled={stats.exclusiveCount === 0 && !exclusiveOnly}
          onClick={onToggleExclusive}
        />
        <BriefStat
          label="Hype"
          value={formatShare(stats.hypeShare)}
          pressed={hypeOnly}
          disabled={stats.hypeCount === 0 && !hypeOnly}
          onClick={onToggleHype}
        />
        <BriefStat
          label="Last 7 days"
          value={formatShare(stats.freshness7Share)}
          pressed={publishedWithinDays === 7}
          disabled={stats.freshness7Count === 0 && publishedWithinDays !== 7}
          onClick={() => onToggleFreshness(7)}
        />
        <BriefStat
          label="Last 30 days"
          value={formatShare(stats.freshness30Share)}
          pressed={publishedWithinDays === 30}
          disabled={stats.freshness30Count === 0 && publishedWithinDays !== 30}
          onClick={() => onToggleFreshness(30)}
        />
        <BriefStat
          label="Top 3 keys"
          value={formatShare(stats.keyConcentrationShare)}
          hint={
            stats.keyConcentrationKeys.length
              ? stats.keyConcentrationKeys.join(" · ")
              : undefined
          }
        />
        <BriefStat label="BPM median" value={formatBpm(stats.bpmMedian)} />
        <BriefStat label="BPM p25–p75" value={iqr} />
      </div>

      <div className="brief-groups">
        <div>
          <p className="brief-group-label">Mix type</p>
          <div className="brief-chips">
            {stats.mixTypeHistogram.map((item) => {
              const selected = selectedMixTypes.has(item.label);
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`brief-chip${selected ? " selected" : ""}`}
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
