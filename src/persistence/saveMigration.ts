import { gameConfig } from '../data/gameConfig';
import type { GameState, VersionedGameSave } from '../types/game';
import { getTotalProductionPerSecond } from '../utils/economy';

export const currentSaveVersion = 5;

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
  const remainingEggSpawnSeconds = Math.min(
    state.remainingEggSpawnSeconds ?? gameConfig.cosmicEggSpawnSeconds,
    gameConfig.cosmicEggSpawnSeconds,
  );
  const creatures = (state.creatures ?? []).map((creature) => ({
    ...creature,
    pendingCoins: creature.pendingCoins ?? 0,
  }));
  const portalState =
    state.portalState ??
    (state.discoveredCreatureIds.includes('umbrelume') ? 'cracked' : 'dormant');
  const currentIncomePerSecond = getTotalProductionPerSecond({ ...state, creatures, portalState });

  return {
    ...state,
    creatures,
    eggs: (state.eggs ?? []).map((egg) => ({
      ...egg,
      remainingIncubationSeconds: Math.min(
        egg.remainingIncubationSeconds,
        gameConfig.cosmicEggIncubationSeconds,
      ),
      source: egg.source ?? 'free',
    })),
    purchaseCounts: state.purchaseCounts ?? {},
    purchasedEggCount: state.purchasedEggCount ?? 0,
    highestIncomePerSecond: Math.max(
      state.highestIncomePerSecond ?? currentIncomePerSecond,
      currentIncomePerSecond,
    ),
    hasSeenWelcomeModal: state.hasSeenWelcomeModal ?? true,
    hasSeenPortalReaction: state.hasSeenPortalReaction ?? false,
    hasCompletedFirstMergeTutorial: state.hasCompletedFirstMergeTutorial ?? false,
    portalState,
    portalEnergy: state.portalEnergy ?? 0,
    portalEnergyRequired: state.portalEnergyRequired ?? gameConfig.portalEnergyRequired,
    unlockedMapIds: state.unlockedMapIds ?? ['map1'],
    currentMapId: state.currentMapId ?? 'map1',
    remainingEggSpawnSeconds,
    offlineProductionCapSeconds:
      state.offlineProductionCapSeconds ?? gameConfig.offlineRewardCapSeconds,
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
    if (![1, 2, 3, 4, 5].includes(versioned.saveVersion) || !isGameState(versioned.state)) {
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
