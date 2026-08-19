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
          snapshot={snapshot}
          extractionError={extractionError}
          analysis={analysis}
          refreshing={refreshing}
          showExtractionHelp={showExtractionHelp}
          onRefresh={() => void requestRefresh(true)}
        />

        {showExtractionHelp ? (
          <ExtractionHelpCard />
        ) : (
          <AnalysisView
            snapshot={snapshot}
            analysis={analysis}
            keyNotation={keyNotation}
            onKeyNotationChange={setKeyNotation}
            player={player}
          />
        )}
      </main>
      <PreviewPlayer player={player} />
    </div>
  );
}
