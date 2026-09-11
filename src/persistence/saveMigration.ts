import { gameConfig } from '../data/gameConfig';
import type {
  CreatureId,
  GameState,
  GuidedTutorialStep,
  PortalRequest,
  PortalRequestState,
  PortalState,
  SaveOwnerType,
  VersionedGameSave,
  MapId,
} from '../types/game';
import { decayEggPurchasePressure, getEggPurchasePrice, getTotalProductionPerSecond } from '../utils/economy';
import { advancePortalRequestCooldown, startPortalRequest } from '../utils/portalRequests';

export const currentSaveVersion = 17;

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
    value === 'singulume' ||
    value === 'astralume' ||
    value === 'cosmoryx' ||
    value === 'nexoryx' ||
    value === 'translume' ||
    value === 'solaris' ||
    value === 'solume' ||
    value === 'helion' ||
    value === 'coralume' ||
    value === 'solaryx' ||
    value === 'heliox' ||
    value === 'auroryx' ||
    value === 'corolume' ||
    value === 'stellaris' ||
    value === 'solaryon'
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

function isPortalState(value: unknown): value is PortalState {
  return (
    value === 'dormant' ||
    value === 'rupturing' ||
    value === 'cracked' ||
    value === 'awaiting_transition' ||
    value === 'open'
  );
}

function normalizePortalState(value: unknown, discoveredCreatureIds: CreatureId[]): PortalState {
  if (value === 'active') return 'open';
  if (value === 'charged') return 'awaiting_transition';
  if (isPortalState(value)) return value;

  return discoveredCreatureIds.includes('umbrelume') ? 'cracked' : 'dormant';
}

function isMapId(value: unknown): value is MapId {
  return value === 'map1' || value === 'map2';
}

function isPortalRequestState(value: unknown): value is PortalRequestState {
  return value === 'active' || value === 'cooldown' || value === 'charged';
}

function isPortalRequest(value: unknown): value is PortalRequest {
  if (!value || typeof value !== 'object') return false;

  const request = value as PortalRequest;
  return (
    typeof request.id === 'string' &&
    isCreatureId(request.creatureId) &&
    typeof request.requestedTier === 'number' &&
    typeof request.requiredCount === 'number' &&
    typeof request.deliveredCount === 'number' &&
    typeof request.energyReward === 'number'
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
        mapId: isMapId(creature.mapId) ? creature.mapId : 'map1',
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
      mapId: isMapId(egg.mapId) ? egg.mapId : 'map1',
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
  let creatures = occupancy.creatures;
  const hasPersistedUmbrelume = creatures.some((creature) => creature.creatureId === 'umbrelume');
  const discoveredBeforePortalNormalization =
    hasPersistedUmbrelume && !state.discoveredCreatureIds.includes('umbrelume')
      ? [...state.discoveredCreatureIds, 'umbrelume' as CreatureId]
      : state.discoveredCreatureIds;
  const legacyPortalState = normalizePortalState(
    state.portalState,
    discoveredBeforePortalNormalization,
  );
  const portalEnergyRequired = state.portalEnergyRequired ?? gameConfig.portalEnergyRequired;
  const portalEnergy = Math.min(state.portalEnergy ?? 0, portalEnergyRequired);
  const portalState =
    legacyPortalState === 'cracked' && portalEnergy >= portalEnergyRequired
      ? 'awaiting_transition'
      : legacyPortalState;
  const shouldRemovePersistedUmbrelume =
    hasPersistedUmbrelume && portalState !== 'dormant' && portalState !== 'rupturing';
  const discoveredCreatureIds =
    shouldRemovePersistedUmbrelume || portalState === 'rupturing'
      ? discoveredBeforePortalNormalization
      : state.discoveredCreatureIds;

  if (shouldRemovePersistedUmbrelume) {
    creatures = creatures.filter((creature) => creature.creatureId !== 'umbrelume');
  }

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

  const baseState: GameState = {
    ...state,
    creatures,
    eggs: occupancy.eggs,
    discoveredCreatureIds,
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
    portalEnergy,
    portalEnergyRequired,
    portalRequestState: isPortalRequestState(state.portalRequestState)
      ? state.portalRequestState
      : portalState === 'awaiting_transition'
        ? 'charged'
        : null,
    activePortalRequest: isPortalRequest(state.activePortalRequest)
      ? {
          ...state.activePortalRequest,
          deliveredCount: Math.min(
            state.activePortalRequest.requiredCount,
            Math.max(0, state.activePortalRequest.deliveredCount),
          ),
        }
      : null,
    portalRequestCooldownStartedAt:
      typeof state.portalRequestCooldownStartedAt === 'number'
        ? state.portalRequestCooldownStartedAt
        : null,
    lastRequestedTier:
      typeof state.lastRequestedTier === 'number' ? state.lastRequestedTier : null,
    sameTierRequestStreak:
      typeof state.sameTierRequestStreak === 'number' ? state.sameTierRequestStreak : 0,
    unlockedMapIds: Array.from(
      new Set([
        'map1' as MapId,
        ...(state.unlockedMapIds ?? []),
        ...(portalState === 'open' ? (['map2'] as MapId[]) : []),
      ]),
    ),
    currentMapId: isMapId(state.currentMapId)
      ? portalState === 'open' || state.currentMapId === 'map1'
        ? state.currentMapId
        : 'map1'
      : 'map1',
    remainingEggSpawnSeconds,
    offlineProductionCapSeconds:
      state.offlineProductionCapSeconds ?? gameConfig.offlineRewardCapSeconds,
    solarExposureEndsAt:
      typeof state.solarExposureEndsAt === 'number' ? state.solarExposureEndsAt : null,
    solarExposureNextCheckAt:
      typeof state.solarExposureNextCheckAt === 'number' ? state.solarExposureNextCheckAt : null,
    solarFirstDiscoveryPityAttempts:
      typeof state.solarFirstDiscoveryPityAttempts === 'number'
        ? state.solarFirstDiscoveryPityAttempts
        : 0,
    helioxCrossings:
      typeof state.helioxCrossings === 'number'
        ? Math.max(0, Math.floor(state.helioxCrossings))
        : 0,
  };

  if (baseState.portalState === 'awaiting_transition') {
    return {
      ...baseState,
      portalRequestState: 'charged',
      activePortalRequest: null,
      portalRequestCooldownStartedAt: null,
    };
  }

  if (baseState.portalState === 'cracked') {
    if (baseState.portalRequestState === 'active' && baseState.activePortalRequest) {
      return baseState;
    }

    if (baseState.portalRequestState === 'cooldown') {
      return advancePortalRequestCooldown(baseState);
    }

    return startPortalRequest(baseState);
  }

  return {
    ...baseState,
    portalRequestState: null,
    activePortalRequest: null,
    portalRequestCooldownStartedAt: null,
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
    if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].includes(versioned.saveVersion) || !isGameState(versioned.state)) {
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
