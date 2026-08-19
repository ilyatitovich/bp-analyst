import type { KeyNotation } from "../../lib/messaging/protocol";
import type { ExtractionSnapshot } from "../../lib/types/track";
import { scopedFacetFromPageUrl } from "../../lib/utils/page";
import type { PreviewPlayerHandle } from "../hooks/usePreviewPlayer";
import type { TrackAnalysis } from "../hooks/useTrackAnalysis";
import { BpmHistogram } from "./charts/BpmHistogram";
import { CountTable } from "./charts/CountTable";
import { DistributionChart } from "./charts/DistributionChart";
import { KeyHistogram } from "./charts/KeyHistogram";
import { MarketBrief } from "./MarketBrief";
import { TrackTable } from "./TrackTable";

export interface AnalysisViewProps {
  snapshot: ExtractionSnapshot | null;
  analysis: TrackAnalysis;
  keyNotation: KeyNotation;
  onKeyNotationChange: (notation: KeyNotation) => void;
  player: PreviewPlayerHandle;
}

export function AnalysisView({
  snapshot,
  analysis,
  keyNotation,
  onKeyNotationChange,
  player,
}: AnalysisViewProps) {
  const scopedFacet = scopedFacetFromPageUrl(snapshot?.pageUrl);
  const { stats } = analysis;
  const showGenrePanel = scopedFacet !== "genre" && stats.genreDistribution.length > 1;
  const showLabelPanel = scopedFacet !== "label" && stats.labelDistribution.length > 1;
  const showArtistPanel = scopedFacet !== "artist" && stats.artistDistribution.length > 1;

  return (
    <>
      <MarketBrief
        analysis={analysis}
        snapshot={snapshot}
        keyNotation={keyNotation}
        scopedFacet={scopedFacet}
      />

      <BpmHistogram analysis={analysis} />

      <KeyHistogram
        analysis={analysis}
        notation={keyNotation}
        onNotationChange={onKeyNotationChange}
      />

      {(showGenrePanel || showLabelPanel || showArtistPanel) && (
        <section className="chart-grid">
          {showGenrePanel ? (
            <DistributionChart
              title="Genres"
              items={stats.genreDistribution}
              analysis={analysis}
              filterKey="genreNames"
            />
          ) : null}
          {showLabelPanel ? (
            <CountTable
              title="Labels"
              nameHeader="Label"
              items={stats.labelDistribution}
              analysis={analysis}
              filterKey="labelNames"
            />
          ) : null}
          {showArtistPanel ? (
            <CountTable
              title="Artists"
              nameHeader="Artist"
              items={stats.artistDistribution}
              analysis={analysis}
              filterKey="artistNames"
            />
          ) : null}
        </section>
      )}

      <TrackTable analysis={analysis} keyNotation={keyNotation} player={player} />
    </>
  );
}
