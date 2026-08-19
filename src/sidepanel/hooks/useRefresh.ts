import { useCallback, useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";
import type { ExtractionErrorState } from "../../lib/messaging/protocol";
import type { ExtractionSnapshot } from "../../lib/types/track";

export function useRefresh(
  snapshot: ExtractionSnapshot | null,
  extractionError: ExtractionErrorState | null,
) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [beatportReloadAttempted, setBeatportReloadAttempted] = useState(false);
  const refreshStartedAt = useRef(snapshot?.extractedAt ?? null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const requestRefresh = useCallback(async (force = false, auto = false) => {
    refreshStartedAt.current =
      snapshotRef.current?.extractedAt ?? new Date().toISOString();
    if (!auto) {
      setRefreshFailed(false);
      setRefreshing(true);
    }
    try {
      const result = (await browser.runtime.sendMessage({
        type: "REQUEST_REFRESH",
        force,
        auto,
      })) as { reloaded?: boolean; skipped?: boolean } | undefined;
      if (result?.skipped) return;
      if (auto) {
        setRefreshFailed(false);
        if (result?.reloaded) setRefreshing(true);
      }
      setBeatportReloadAttempted(Boolean(result?.reloaded));
      if (!result?.reloaded) {
        setRefreshing(false);
      }
    } catch {
      setRefreshing(false);
      setRefreshFailed(true);
    }
  }, []);

  useEffect(() => {
    const port = browser.runtime.connect({ name: "bp-analyst-panel" });
    void requestRefresh(false, true);
    return () => port.disconnect();
  }, [requestRefresh]);

  useEffect(() => {
    if (!refreshing) return;
    if (
      snapshot?.extractedAt &&
      snapshot.extractedAt !== refreshStartedAt.current
    ) {
      setRefreshing(false);
      return;
    }
    const startedAt = refreshStartedAt.current;
    if (extractionError?.at && startedAt && extractionError.at > startedAt) {
      setRefreshing(false);
      return;
    }
    const timeout = window.setTimeout(() => setRefreshing(false), 12000);
    return () => window.clearTimeout(timeout);
  }, [extractionError?.at, refreshing, snapshot?.extractedAt]);

  return {
    refreshing,
    refreshFailed,
    beatportReloadAttempted,
    requestRefresh,
  };
}
