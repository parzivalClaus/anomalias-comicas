import { creatureDefinitions } from '../data/creatures';
import { evolutionRecipes } from '../data/evolutions';
import { gameConfig } from '../data/gameConfig';
import type { CreatureId, GameState, PortalRequest } from '../types/game';
import { getHighestDiscoveredNaturalTier } from './economy';

function getRangeForTier(tier: number) {
  const configured =
    gameConfig.portalRequests.quantityByTier[
      tier as keyof typeof gameConfig.portalRequests.quantityByTier
    ];

  return configured ?? gameConfig.portalRequests.defaultQuantity;
}

function getEnergyForTier(tier: number) {
  return (
    gameConfig.portalRequests.energyByTier[
      tier as keyof typeof gameConfig.portalRequests.energyByTier
    ] ?? gameConfig.portalRequests.defaultEnergy
  );
}

function randomIntInclusive(min: number, max: number) {
  const safeMin = Math.ceil(Math.min(min, max));
  const safeMax = Math.floor(Math.max(min, max));

  return safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1));
}

function getRequestableNaturalDefinitions(state: GameState) {
  const highestDiscoveredTier = getHighestDiscoveredNaturalTier(state.discoveredCreatureIds);
  const maxRequestableTier = Math.max(
    1,
    highestDiscoveredTier - gameConfig.portalRequests.requestTierGap,
  );

  return Object.values(creatureDefinitions)
    .filter((definition) => {
      if (definition.progressionType !== 'natural') return false;
      if (definition.naturalTier === null) return false;
      if (definition.naturalTier > maxRequestableTier) return false;

      return state.discoveredCreatureIds.includes(definition.id);
    })
    .sort((a, b) => (a.naturalTier ?? 0) - (b.naturalTier ?? 0));
}

function chooseRequestCreatureId(state: GameState): CreatureId | null {
  const eligible = getRequestableNaturalDefinitions(state);
  if (eligible.length === 0) return null;

  const weighted = eligible.map((definition) => {
    const tier = definition.naturalTier ?? 1;
    const isOverRepeated =
      state.lastRequestedTier === tier &&
      state.sameTierRequestStreak >= gameConfig.portalRequests.maxSameTierStreak;
    const repeatMultiplier = isOverRepeated
      ? gameConfig.portalRequests.repeatedTierPenalty
      : 1;

    return {
      creatureId: definition.id,
      weight:
        Math.pow(gameConfig.portalRequests.tierWeightDecay, tier - 1) * repeatMultiplier,
    };
  });
  const totalWeight = weighted.reduce((total, entry) => total + entry.weight, 0);

  if (totalWeight <= 0) return weighted[0]?.creatureId ?? null;

  let roll = Math.random() * totalWeight;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.creatureId;
  }

  return weighted[weighted.length - 1]?.creatureId ?? null;
}

export function createPortalRequest(state: GameState): PortalRequest | null {
  const creatureId = chooseRequestCreatureId(state);
  if (!creatureId) return null;

  const requestedTier = creatureDefinitions[creatureId].naturalTier ?? 1;
  const quantity = getRangeForTier(requestedTier);

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `portal-request-${Date.now()}`,
    creatureId,
    requestedTier,
    requiredCount: randomIntInclusive(quantity.min, quantity.max),
    deliveredCount: 0,
    energyReward: getEnergyForTier(requestedTier),
  };
}

export function startPortalRequest(state: GameState): GameState {
  const request = createPortalRequest(state);

  if (!request) {
    return {
      ...state,
      portalRequestState: 'cooldown',
      activePortalRequest: null,
      portalRequestCooldownStartedAt: Date.now(),
    };
  }

  const sameTierRequestStreak =
    state.lastRequestedTier === request.requestedTier ? state.sameTierRequestStreak + 1 : 1;

  return {
    ...state,
    portalRequestState: 'active',
    activePortalRequest: request,
    portalRequestCooldownStartedAt: null,
    lastRequestedTier: request.requestedTier,
    sameTierRequestStreak,
  };
}

export function advancePortalRequestCooldown(state: GameState, now = Date.now()): GameState {
  if (state.portalState !== 'cracked' || state.portalRequestState !== 'cooldown') return state;
  if (state.portalEnergy >= state.portalEnergyRequired) {
    return {
      ...state,
      portalState: 'charged',
      portalRequestState: 'charged',
      activePortalRequest: null,
      portalRequestCooldownStartedAt: null,
    };
  }

  const startedAt = state.portalRequestCooldownStartedAt;
  if (!startedAt) return startPortalRequest(state);

  const elapsedSeconds = Math.floor((now - startedAt) / 1000);
  if (elapsedSeconds < gameConfig.portalRequests.cooldownSeconds) return state;

  return startPortalRequest(state);
}

export function getPortalRequestCooldownRemainingSeconds(state: GameState, now = Date.now()) {
  if (state.portalRequestState !== 'cooldown' || !state.portalRequestCooldownStartedAt) return 0;

  const elapsedSeconds = Math.floor((now - state.portalRequestCooldownStartedAt) / 1000);
  return Math.max(0, gameConfig.portalRequests.cooldownSeconds - elapsedSeconds);
}

export function isFinalMapOneNaturalMergeResult(creatureId: CreatureId) {
  const definition = creatureDefinitions[creatureId];

  return (
    definition.progressionType === 'natural' &&
    definition.naturalTier === gameConfig.portalRequests.finalMapOneNaturalTier
  );
}

export function getCurrentFinalMapOneMergeInputs() {
  return evolutionRecipes.find((recipe) => isFinalMapOneNaturalMergeResult(recipe.result)) ?? null;
}
