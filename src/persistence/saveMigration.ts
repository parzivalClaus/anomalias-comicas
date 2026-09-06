import { gameConfig } from '../data/gameConfig';
import type {
  CreatureId,
  GameState,
  GuidedTutorialStep,
  SaveOwnerType,
  VersionedGameSave,
} from '../types/game';
import { decayEggPurchasePressure, getEggPurchasePrice, getTotalProductionPerSecond } from '../utils/economy';

export const currentSaveVersion = 10;

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

function clampWorldPosition(x: number, y: number) {
  return {
    x: Math.min(0.94, Math.max(0.06, Number.isFinite(x) ? x : 0.5)),
    y: Math.min(0.92, Math.max(0.08, Number.isFinite(y) ? y : 0.5)),
  };
}

function slotToWorldPosition(slotIndex: number) {
  const safeSlot = Number.isFinite(slotIndex) ? slotIndex : 0;
  const row = Math.floor(safeSlot / gameConfig.boardColumns);
  const column = safeSlot % gameConfig.boardColumns;
  return clampWorldPosition(
    0.14 + (column / Math.max(1, gameConfig.boardColumns - 1)) * 0.72,
    0.14 + (row / Math.max(1, gameConfig.boardRows - 1)) * 0.72,
  );
}

function normalizeEntityPosition(entity: { x?: number; y?: number; slotIndex?: number }) {
  if (typeof entity.x === 'number' && typeof entity.y === 'number') {
    return clampWorldPosition(entity.x, entity.y);
  }

  return slotToWorldPosition(entity.slotIndex ?? 0);
}

function isCreatureId(value: unknown): value is CreatureId {
  return (
    value === 'nebulo' ||
    value === 'nebulume' ||
    value === 'nebulux' ||
    value === 'umbrelume' ||
    value === 'neburix' ||
    value === 'gravulon' ||
    value === 'singulume'
  );
}

function isGuidedTutorialStep(value: unknown): value is GuidedTutorialStep {
  return (
    value === 'openFirstEgg' ||
    value === 'buyEgg' ||
    value === 'openSecondEgg' ||
    value === 'merge' ||
    value === 'done'
  );
}

function getVelocity(seed: number) {
  const angle = ((seed % 360) / 360) * Math.PI * 2;
  const speed = 0.0025 + (seed % 5) * 0.00035;

  return {
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed * 0.7,
  };
}

function normalizeWorldEntities(state: GameState) {
  const creatures = (state.creatures ?? [])
    .slice(0, gameConfig.maxWorldEntities)
    .map((creature, index) => {
      const legacyCreature = creature as typeof creature & { pendingCoins?: number };
      const { pendingCoins: _pendingCoins, ...rest } = legacyCreature;

      return {
        ...rest,
        ...normalizeEntityPosition(creature),
        velocityX: creature.velocityX ?? getVelocity(creature.birthId ?? index).velocityX,
        velocityY: creature.velocityY ?? getVelocity(creature.birthId ?? index).velocityY,
        birthId: creature.birthId ?? Date.now() + index,
      };
    });

  const remainingCapacity = Math.max(0, gameConfig.maxWorldEntities - creatures.length);
  const eggs = (state.eggs ?? [])
    .slice(0, remainingCapacity)
    .map((egg, index) => ({
      ...egg,
      ...normalizeEntityPosition(egg),
      birthId: egg.birthId ?? Date.now() + creatures.length + index,
      source: egg.source ?? 'free',
      contentCreatureId: isCreatureId(egg.contentCreatureId) ? egg.contentCreatureId : undefined,
    }));

  return { creatures, eggs };
}

function normalizeState(state: GameState): GameState {
  const remainingEggSpawnSeconds = Math.min(
    state.remainingEggSpawnSeconds ?? gameConfig.cosmicEggSpawnSeconds,
    gameConfig.cosmicEggSpawnSeconds,
  );
  const occupancy = normalizeWorldEntities(state);
  const creatures = occupancy.creatures;
  const portalState =
    state.portalState ??
    (state.discoveredCreatureIds.includes('umbrelume') ? 'cracked' : 'dormant');
  const currentIncomePerSecond = getTotalProductionPerSecond({ ...state, creatures, portalState });
  const secondsSinceLastSave = Math.max(0, Math.floor((Date.now() - state.lastSavedAt) / 1000));
  const eggPurchasePressure = decayEggPurchasePressure(
    state.eggPurchasePressure ?? 0,
    secondsSinceLastSave,
  );
  const normalizedForPricing = {
    ...state,
    creatures,
    portalState,
    eggPurchasePressure,
    highestIncomePerSecond: Math.max(
      state.highestIncomePerSecond ?? currentIncomePerSecond,
      currentIncomePerSecond,
    ),
  };

  return {
    ...state,
    creatures,
    eggs: occupancy.eggs,
    purchaseCounts: state.purchaseCounts ?? {},
    purchasedEggCount: state.purchasedEggCount ?? 0,
    eggPurchasePressure,
    currentEggPrice: Math.max(
      gameConfig.eggPricing.basePrice,
      state.currentEggPrice ?? getEggPurchasePrice(normalizedForPricing),
    ),
    highestIncomePerSecond: normalizedForPricing.highestIncomePerSecond,
    hasSeenWelcomeModal: state.hasSeenWelcomeModal ?? true,
    hasSeenCloudSavePrompt: state.hasSeenCloudSavePrompt ?? false,
    hasSeenPortalReaction: state.hasSeenPortalReaction ?? false,
    hasCompletedFirstMergeTutorial: state.hasCompletedFirstMergeTutorial ?? false,
    guidedTutorialStep: isGuidedTutorialStep(state.guidedTutorialStep)
      ? state.guidedTutorialStep
      : 'done',
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

interface SaveOwner {
  ownerType: SaveOwnerType;
  ownerUserId?: string;
}

export function createVersionedSave(
  state: GameState,
  owner: SaveOwner = { ownerType: 'guest' },
): VersionedGameSave {
  return {
    saveVersion: currentSaveVersion,
    state,
    updatedAt: new Date(state.lastSavedAt).toISOString(),
    ownerType: owner.ownerType,
    ownerUserId: owner.ownerType === 'account' ? owner.ownerUserId : undefined,
  };
}

export function migrateSave(value: unknown): VersionedGameSave | null {
  if (!value || typeof value !== 'object') return null;

  if ('saveVersion' in value && 'state' in value) {
    const versioned = value as VersionedGameSave;
    if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(versioned.saveVersion) || !isGameState(versioned.state)) {
      return null;
    }

    return {
      saveVersion: currentSaveVersion,
      state: normalizeState(versioned.state),
      updatedAt: versioned.updatedAt ?? new Date(versioned.state.lastSavedAt).toISOString(),
      ownerType: versioned.ownerType ?? 'guest',
      ownerUserId: versioned.ownerType === 'account' ? versioned.ownerUserId : undefined,
    };
  }

  if (isGameState(value)) {
    const state = normalizeState(value);
    return createVersionedSave(state);
  }

  return null;
}
