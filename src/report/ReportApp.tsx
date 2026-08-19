import { useEffect, useMemo } from 'react';
import { formatTrackKey } from '../lib/analysis/camelot';
import { computeTrackStats, type Bucket } from '../lib/analysis/stats';
import {
  buildReportTitle,
  formatReportDate,
  formatReportSourceUrl,
  reportPrintQuery,
  statsBasisLabel,
} from '../lib/export/report';
import { uniqueTracks } from '../lib/extract/normalize';
import { coverageLabel, formatBpm, formatBpmRange, formatShare } from '../lib/utils/format';
import {
  beatportCatalogUrlFromTracks,
  scopedFacetFromPageUrl,
} from '../lib/utils/page';
import { BRIEF_STAT_HINTS } from '../sidepanel/components/briefStatHints';
import { useStorageState } from '../sidepanel/hooks/useStorageState';

let printTimer: number | null = null;

function Stat({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="report-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{caption}</p>
    </div>
  );
}

type ChipItem = Bucket & { href?: string | null };

function ChipGroup({
  title,
  share,
  items,
}: {
  title: string;
  share?: number | null;
  items: ChipItem[];
}) {
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

function BarList({
  title,
  items,
  empty = 'No data',
}: {
  title: string;
  items: Bucket[];
  empty?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <section className="report-section">
      <h2>{title}</h2>
      {items.length ? (
        <ul className="report-bars">
          {items.map((item) => (
            <li key={item.label}>
              <span className="report-bar-label">{item.label}</span>
              <span className="report-bar-track">
                <span
                  className="report-bar-fill"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </span>
              <span className="report-bar-count">{item.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="report-muted">{empty}</p>
      )}
    </section>
  );
}

export function ReportApp() {
  const { snapshot, keyNotation } = useStorageState();
  const tracks = useMemo(
    () => uniqueTracks(snapshot?.tracks ?? []),
    [snapshot],
  );
  const stats = useMemo(() => computeTrackStats(tracks), [tracks]);
  const title = snapshot ? buildReportTitle(snapshot.pageTitle) : 'Beatport Analyst report';
  const coverage = snapshot
    ? coverageLabel(tracks.length, snapshot.listCount, snapshot.complete)
    : null;
  const scopedFacet = scopedFacetFromPageUrl(snapshot?.pageUrl);
  const keyItems = (
    keyNotation === 'camelot' ? stats.camelotHistogram : stats.scaleHistogram
  )
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const genreItems = scopedFacet === 'genre' ? [] : stats.genreDistribution;
  const basis = statsBasisLabel(tracks.length, snapshot?.listCount, snapshot?.complete);

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    if (!snapshot || !tracks.length) return;
    if (!reportPrintQuery(window.location.search)) return;
    if (printTimer != null) return;

    printTimer = window.setTimeout(() => {
      printTimer = null;
      window.print();
      window.history.replaceState(null, '', window.location.pathname);
    }, 120);
  }, [snapshot, tracks.length]);

  if (!snapshot || !tracks.length) {
    return (
      <main className="report-empty">
        <p>No Beatport list is loaded.</p>
        <p className="report-muted">
          Open Beatport Analyst on a chart, label, or genre page, then download the
          report again.
        </p>
      </main>
    );
  }

  return (
    <div className="report-shell">
      <div className="report-toolbar">
        <p>Beatport Analyst</p>
        <button onClick={() => window.print()} type="button">
          Save as PDF
        </button>
      </div>

      <article className="report">
        <header className="report-header">
          <p className="report-eyebrow">Beatport Analyst</p>
          <h1>{title}</h1>
          <p className="report-meta">
            <a href={snapshot.pageUrl}>{formatReportSourceUrl(snapshot.pageUrl)}</a>
            <span>{formatReportDate(snapshot.extractedAt)}</span>
          </p>
          {coverage ? (
            <p className="report-banner">
              Partial capture. {coverage}, so these figures may not represent the
              full list.
            </p>
          ) : null}
        </header>

        <section className="report-section">
          <div className="report-section-heading">
            <h2>Market snapshot</h2>
            <p className="report-basis">{basis}</p>
          </div>
          <div className="report-stats">
            <Stat
              label="Exclusive"
              value={formatShare(stats.exclusiveShare)}
              caption={BRIEF_STAT_HINTS.exclusive}
            />
            <Stat
              label="Hype"
              value={formatShare(stats.hypeShare)}
              caption={BRIEF_STAT_HINTS.hype}
            />
            <Stat
              label="Last 7 days"
              value={formatShare(stats.freshness7Share)}
              caption={BRIEF_STAT_HINTS.freshness7}
            />
            <Stat
              label="Last 30 days"
              value={formatShare(stats.freshness30Share)}
              caption={BRIEF_STAT_HINTS.freshness30}
            />
            <Stat
              label="BPM median"
              value={formatBpm(stats.bpmMedian)}
              caption={BRIEF_STAT_HINTS.bpmMedian}
            />
            <Stat
              label="BPM p25–p75"
              value={formatBpmRange(stats.bpmP25, stats.bpmP75)}
              caption={BRIEF_STAT_HINTS.bpmIqr}
            />
          </div>
        </section>

        <section className="report-section report-groups">
          <ChipGroup
            title="Top keys"
            share={stats.keyConcentrationShare}
            items={stats.keyConcentration.map((item) => ({
              ...item,
              label: formatTrackKey(item.label, null, keyNotation) ?? item.label,
            }))}
          />
          {scopedFacet === 'label' ? null : (
            <ChipGroup
              title="Top labels"
              share={stats.labelConcentrationShare}
              items={stats.labelConcentration.map((item) => ({
                ...item,
                href: beatportCatalogUrlFromTracks(tracks, 'label', item.label),
              }))}
            />
          )}
          {scopedFacet === 'artist' ? null : (
            <ChipGroup
              title="Top artists"
              share={stats.artistConcentrationShare}
              items={stats.artistConcentration.map((item) => ({
                ...item,
                href: beatportCatalogUrlFromTracks(tracks, 'artist', item.label),
              }))}
            />
          )}
          <ChipGroup title="Mix type" items={stats.mixTypeHistogram} />
          <ChipGroup
            title="Length"
            items={stats.lengthHistogram.map((item) => ({
              ...item,
              label: `${item.label} min`,
            }))}
          />
        </section>

        <BarList title="Keys" items={keyItems} />
        {genreItems.length > 1 ? (
          <BarList title="Genres" items={genreItems} />
        ) : null}

        <footer className="report-footer">
          Generated from the full captured list. Use Export CSV for the track table.
        </footer>
      </article>
    </div>
  );
}
