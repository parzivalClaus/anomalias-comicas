import type { GameState, VersionedGameSave } from '../types/game';

export const currentSaveVersion = 1;

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;

  const state = value as GameState;
  return (
    typeof state.coins === 'number' &&
    Array.isArray(state.creatures) &&
    Array.isArray(state.discoveredCreatureIds) &&
    typeof state.lastSavedAt === 'number'
  );
}

function normalizeState(state: GameState): GameState {
  return {
    ...state,
    purchaseCounts: state.purchaseCounts ?? {},
    hasSeenPortalReaction: state.hasSeenPortalReaction ?? false,
  };
}

export function createVersionedSave(state: GameState): VersionedGameSave {
  return {
    saveVersion: currentSaveVersion,
    state,
    updatedAt: new Date(state.lastSavedAt).toISOString(),
  };
}

export function migrateSave(value: unknown): VersionedGameSave | null {
  if (!value || typeof value !== 'object') return null;

  if ('saveVersion' in value && 'state' in value) {
    const versioned = value as VersionedGameSave;
    if (versioned.saveVersion !== currentSaveVersion || !isGameState(versioned.state)) {
      return null;
    }

    return {
      saveVersion: currentSaveVersion,
      state: normalizeState(versioned.state),
      updatedAt: versioned.updatedAt ?? new Date(versioned.state.lastSavedAt).toISOString(),
    };
  }

  if (isGameState(value)) {
    const state = normalizeState(value);
    return createVersionedSave(state);
  }

  return null;
}
