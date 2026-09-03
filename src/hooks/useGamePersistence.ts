import { useEffect, useState } from 'react';
import { gameConfig } from '../data/gameConfig';
import { applyOfflineReward, getInitialModel, type GameModel } from '../state/gameStore';
import type { GameState, OfflineReward } from '../types/game';

function isValidSavedState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;

  const state = value as GameState;
  return (
    typeof state.coins === 'number' &&
    Array.isArray(state.creatures) &&
    Array.isArray(state.discoveredCreatureIds) &&
    typeof state.lastSavedAt === 'number'
  );
}

export function loadSavedModel(): { model: GameModel; offlineReward: OfflineReward | null } {
  const fallback = getInitialModel();
  const saved = localStorage.getItem(gameConfig.saveKey);

  if (!saved) return { model: fallback, offlineReward: null };

  try {
    const parsed: unknown = JSON.parse(saved);
    if (!isValidSavedState(parsed)) return { model: fallback, offlineReward: null };

    const normalized = {
      ...parsed,
      hasSeenPortalReaction: parsed.hasSeenPortalReaction ?? false,
    };
    const rewarded = applyOfflineReward(normalized);
    return {
      model: {
        state: rewarded.state,
        latestDiscoveryId: null,
        toast: null,
        portalPulseId: 0,
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
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      localStorage.setItem(
        gameConfig.saveKey,
        JSON.stringify({ ...state, lastSavedAt: Date.now() }),
      );
    }, gameConfig.autosaveMs);

    return () => window.clearTimeout(timeout);
  }, [state]);

  useEffect(() => {
    const saveNow = () => {
      localStorage.setItem(
        gameConfig.saveKey,
        JSON.stringify({ ...state, lastSavedAt: Date.now() }),
      );
    };

    window.addEventListener('pagehide', saveNow);
    return () => window.removeEventListener('pagehide', saveNow);
  }, [state]);
}
