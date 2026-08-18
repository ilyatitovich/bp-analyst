import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import {
  STORAGE_KEYS,
  type ExtractionErrorState,
  type KeyNotation,
} from "../../lib/messaging/protocol";
import { extensionStorage, extensionStorageArea } from "../../lib/messaging/storage";
import type { ExtractionSnapshot } from "../../lib/types/track";

export function useStorageState() {
  const [snapshot, setSnapshot] = useState<ExtractionSnapshot | null>(null);
  const [extractionError, setExtractionError] =
    useState<ExtractionErrorState | null>(null);
  const [keyNotation, setKeyNotationState] = useState<KeyNotation>("camelot");

  useEffect(() => {
    let active = true;

    extensionStorage
      .get([
        STORAGE_KEYS.snapshot,
        STORAGE_KEYS.keyNotation,
        STORAGE_KEYS.extractionError,
      ])
      .then((stored) => {
        if (!active) return;
        setSnapshot(
          (stored[STORAGE_KEYS.snapshot] as ExtractionSnapshot | undefined) ??
            null,
        );
        setKeyNotationState(
          (stored[STORAGE_KEYS.keyNotation] as KeyNotation | undefined) ??
            "camelot",
        );
        setExtractionError(
          (stored[STORAGE_KEYS.extractionError] as
            | ExtractionErrorState
            | undefined) ?? null,
        );
      });

    const listener: Parameters<
      typeof browser.storage.onChanged.addListener
    >[0] = (changes, areaName) => {
      if (areaName !== extensionStorageArea) return;
      if (changes[STORAGE_KEYS.snapshot]) {
        setSnapshot(
          (changes[STORAGE_KEYS.snapshot].newValue as
            | ExtractionSnapshot
            | undefined) ?? null,
        );
      }
      if (changes[STORAGE_KEYS.keyNotation]) {
        setKeyNotationState(
          (changes[STORAGE_KEYS.keyNotation].newValue as
            | KeyNotation
            | undefined) ?? "camelot",
        );
      }
      if (changes[STORAGE_KEYS.extractionError]) {
        setExtractionError(
          (changes[STORAGE_KEYS.extractionError].newValue as
            | ExtractionErrorState
            | undefined) ?? null,
        );
      }
    };

    browser.storage.onChanged.addListener(listener);
    return () => {
      active = false;
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  const setKeyNotation = useCallback((notation: KeyNotation) => {
    setKeyNotationState(notation);
    void extensionStorage.set({
      [STORAGE_KEYS.keyNotation]: notation,
    });
  }, []);

  return { snapshot, extractionError, keyNotation, setKeyNotation };
}
