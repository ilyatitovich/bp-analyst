import { useEffect, useMemo } from 'react';
import { formatTrackKey } from '../lib/analysis/camelot';
import { computeTrackStats } from '../lib/analysis/stats';
import { BRIEF_STAT_HINTS } from '../lib/constants/briefStatHints';
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
import { useStorageState } from '../sidepanel/hooks/useStorageState';
import { BarList } from './BarList';
import { ChipGroup } from './ChipGroup';
import { ReportStat } from './ReportStat';

let printTimer: number | null = null;

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
            <ReportStat
              label="Exclusive"
              value={formatShare(stats.exclusiveShare)}
              caption={BRIEF_STAT_HINTS.exclusive}
            />
            <ReportStat
              label="Hype"
              value={formatShare(stats.hypeShare)}
              caption={BRIEF_STAT_HINTS.hype}
            />
            <ReportStat
              label="Last 7 days"
              value={formatShare(stats.freshness7Share)}
              caption={BRIEF_STAT_HINTS.freshness7}
            />
            <ReportStat
              label="Last 30 days"
              value={formatShare(stats.freshness30Share)}
              caption={BRIEF_STAT_HINTS.freshness30}
            />
            <ReportStat
              label="BPM median"
              value={formatBpm(stats.bpmMedian)}
              caption={BRIEF_STAT_HINTS.bpmMedian}
            />
            <ReportStat
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
