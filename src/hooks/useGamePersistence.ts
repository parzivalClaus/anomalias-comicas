import { useEffect, useRef, useState } from 'react';
import { gameConfig } from '../data/gameConfig';
import { applyOfflineReward, getInitialModel, type GameModel } from '../state/gameStore';
import type { GameState, OfflineReward } from '../types/game';
import { loadLocalSave, saveLocal } from '../persistence/localSave';

export function loadSavedModel(): { model: GameModel; offlineReward: OfflineReward | null } {
  const fallback = getInitialModel();
  const saved = loadLocalSave();

  if (!saved) return { model: fallback, offlineReward: null };

  try {
    const rewarded = applyOfflineReward(saved.state);
    return {
      model: {
        state: rewarded.state,
        latestDiscoveryId: null,
        toast: null,
        portalPulseId: 0,
        productionPulseId: 0,
        soundCue: null,
      },
      offlineReward: rewarded.reward,
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

  return { model: loaded.model, offlineReward, dismissOfflineReward: () => setOfflineReward(null) };
}

export function useAutosave(state: GameState) {
  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      saveLocal(latestStateRef.current);
    }, gameConfig.autosaveMs);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const saveNow = () => {
      saveLocal(latestStateRef.current);
    };

    window.addEventListener('pagehide', saveNow);
    return () => window.removeEventListener('pagehide', saveNow);
  }, [state]);
}
