import { useEffect } from 'react'
import { AnalysisView } from './components/AnalysisView'
import { ExtractionHelpCard } from './components/ExtractionHelp'
import { Header } from './components/Header'
import { PreviewPlayer } from './components/PreviewPlayer'
import { usePreviewPlayer } from './hooks/usePreviewPlayer'
import { useRefresh } from './hooks/useRefresh'
import { useStorageState } from './hooks/useStorageState'
import { useTrackAnalysis } from './hooks/useTrackAnalysis'

export function App() {
  const { tabId, snapshot, extractionError, keyNotation, setKeyNotation } =
    useStorageState()
  const analysis = useTrackAnalysis(snapshot, tabId)
  const { refreshing, refreshFailed, beatportReloadAttempted, requestRefresh } =
    useRefresh(snapshot, extractionError)
  const player = usePreviewPlayer(analysis.sortedTracks)

  useEffect(() => {
    player.stop()
  }, [player.stop, snapshot?.pageUrl])

  const showExtractionHelp =
    !refreshing &&
    analysis.tracks.length === 0 &&
    (Boolean(extractionError) || refreshFailed || beatportReloadAttempted)

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
          <ExtractionHelpCard
            pageUrl={snapshot?.pageUrl ?? extractionError?.pageUrl ?? ''}
            pageTitle={snapshot?.pageTitle ?? extractionError?.pageTitle ?? ''}
            extractedAt={snapshot?.extractedAt}
            errorAt={extractionError?.at}
            trackCount={snapshot?.trackCount}
            listCount={snapshot?.listCount}
            complete={snapshot?.complete}
            diagnostics={
              snapshot?.diagnostics ?? extractionError?.diagnostics ?? null
            }
          />
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
  )
}
