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

function normalizeBoardOccupancy(state: GameState) {
  const occupiedSlots = new Set<number>();
  const getNextSlot = () => {
    for (let index = 0; index < gameConfig.boardSlots; index += 1) {
      if (!occupiedSlots.has(index)) {
        occupiedSlots.add(index);
        return index;
      }
    }

    return null;
  };

  const creatures = (state.creatures ?? [])
    .map((creature) => {
      const slotIndex =
        creature.slotIndex >= 0 &&
        creature.slotIndex < gameConfig.boardSlots &&
        !occupiedSlots.has(creature.slotIndex)
          ? creature.slotIndex
          : getNextSlot();

      if (slotIndex === null) return null;
      occupiedSlots.add(slotIndex);

      return {
        ...creature,
        slotIndex,
        pendingCoins: creature.pendingCoins ?? 0,
      };
    })
    .filter((creature): creature is GameState['creatures'][number] => creature !== null);

  const eggs = (state.eggs ?? [])
    .map((egg) => {
      const slotIndex =
        egg.slotIndex >= 0 &&
        egg.slotIndex < gameConfig.boardSlots &&
        !occupiedSlots.has(egg.slotIndex)
          ? egg.slotIndex
          : getNextSlot();

      if (slotIndex === null) return null;
      occupiedSlots.add(slotIndex);

      return {
        ...egg,
        slotIndex,
      };
    })
    .filter((egg): egg is GameState['eggs'][number] => egg !== null);

  return { creatures, eggs };
}

function normalizeState(state: GameState): GameState {
  const remainingEggSpawnSeconds = Math.min(
    state.remainingEggSpawnSeconds ?? gameConfig.cosmicEggSpawnSeconds,
    gameConfig.cosmicEggSpawnSeconds,
  );
  const occupancy = normalizeBoardOccupancy(state);
  const creatures = occupancy.creatures;
  const portalState =
    state.portalState ??
    (state.discoveredCreatureIds.includes('umbrelume') ? 'cracked' : 'dormant');
  const currentIncomePerSecond = getTotalProductionPerSecond({ ...state, creatures, portalState });

  return {
    ...state,
    creatures,
    eggs: occupancy.eggs.map((egg) => ({
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
