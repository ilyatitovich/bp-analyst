import { useEffect } from "react";
import { AnalysisView } from "./components/AnalysisView";
import { ExtractionHelpCard } from "./components/ExtractionHelp";
import { Header } from "./components/Header";
import { PreviewPlayer } from "./components/PreviewPlayer";
import { usePreviewPlayer } from "./hooks/usePreviewPlayer";
import { useRefresh } from "./hooks/useRefresh";
import { useStorageState } from "./hooks/useStorageState";
import { useTrackAnalysis } from "./hooks/useTrackAnalysis";

export function App() {
  const { snapshot, extractionError, keyNotation, setKeyNotation } =
    useStorageState();
  const analysis = useTrackAnalysis(snapshot);
  const { refreshing, refreshFailed, beatportReloadAttempted, requestRefresh } =
    useRefresh(snapshot, extractionError);
  const player = usePreviewPlayer(analysis.sortedTracks);

  useEffect(() => {
    player.stop();
  }, [player.stop, snapshot?.pageUrl]);

  const showExtractionHelp =
    !refreshing &&
    analysis.tracks.length === 0 &&
    (Boolean(extractionError) || refreshFailed || beatportReloadAttempted);

  return (
    <div className="app">
      <main className="app-shell">
        <Header
          title={
            snapshot?.pageTitle ??
            extractionError?.pageTitle ??
            "Open a Beatport track list page"
          }
          refreshing={refreshing}
          showExtractionHelp={showExtractionHelp}
          hasSnapshot={Boolean(snapshot)}
          source={snapshot?.source}
          trackCount={analysis.tracks.length}
          visibleCount={analysis.sortedTracks.length}
          filtersActive={analysis.filtersActive}
          canExport={analysis.sortedTracks.length > 0}
          filters={analysis.filters}
          exclusiveCount={analysis.stats.exclusiveCount}
          hypeCount={analysis.stats.hypeCount}
          onResetFilters={analysis.resetFilters}
          onRefresh={() => void requestRefresh(true)}
          onExport={analysis.exportCsv}
          onTitleQueryChange={analysis.setTitleQuery}
          onToggleExclusive={analysis.toggleExclusive}
          onToggleHype={analysis.toggleHype}
        />

        {showExtractionHelp ? (
          <ExtractionHelpCard />
        ) : (
          <AnalysisView
            tracks={analysis.tracks}
            stats={analysis.stats}
            filteredStats={analysis.filteredStats}
            sortedTracks={analysis.sortedTracks}
            filters={analysis.filters}
            sort={analysis.sort}
            keyNotation={keyNotation}
            listCount={snapshot?.listCount}
            complete={snapshot?.complete}
            pageUrl={snapshot?.pageUrl}
            currentTrackId={player.currentTrack?.id ?? null}
            playing={player.playing}
            onKeyNotationChange={setKeyNotation}
            onToggleFilter={analysis.toggleFilter}
            onClearFilter={analysis.clearFilter}
            onToggleExclusive={analysis.toggleExclusive}
            onToggleHype={analysis.toggleHype}
            onToggleFreshness={analysis.toggleFreshness}
            onSort={analysis.cycleSort}
            onPlayTrack={player.playTrack}
          />
        )}
      </main>
      <PreviewPlayer player={player} />
    </div>
  );
}
