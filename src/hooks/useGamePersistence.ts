import { useEffect, useRef, useState } from 'react';
import { gameConfig } from '../data/gameConfig';
import { getInitialModel, type GameModel } from '../state/gameStore';
import type { GameState, OfflineReward } from '../types/game';
import { loadLocalSave, saveLocal } from '../persistence/localSave';

export function loadSavedModel(): { model: GameModel; offlineReward: OfflineReward | null } {
  const fallback = getInitialModel();
  const saved = loadLocalSave();

  if (!saved) return { model: fallback, offlineReward: null };

  try {
    return {
      model: {
        state: saved.state,
        latestDiscoveryId: null,
        toast: null,
        portalPulseId: 0,
        productionPulseId: 0,
        soundCue: null,
      },
      offlineReward: null,
    };
  } catch {
    return { model: fallback, offlineReward: null };
  }
}

export function useInitialGameModel() {
  const [loaded] = useState(loadSavedModel);
  const [offlineReward, setOfflineReward] = useState<OfflineReward | null>(
    loaded.offlineReward,
  );

  return {
    model: loaded.model,
    offlineReward,
    showOfflineReward: setOfflineReward,
    dismissOfflineReward: () => setOfflineReward(null),
  };
}

export function useAutosave(state: GameState, enabled = true) {
  const latestStateRef = useRef(state);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!enabledRef.current) return;
      saveLocal(latestStateRef.current);
    }, gameConfig.autosaveMs);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const saveNow = () => {
      if (!enabledRef.current) return;
      saveLocal(latestStateRef.current);
    };

    window.addEventListener('pagehide', saveNow);
    return () => window.removeEventListener('pagehide', saveNow);
  }, [state]);
}
