import { creatureDefinitions } from '../data/creatures';
import { gameConfig } from '../data/gameConfig';
import { clearLocalSave } from '../persistence/localSave';
import type {
  CreatureId,
  CreatureDefinition,
  CreatureInstance,
  EggSource,
  EggState,
  EnvironmentId,
  GameState,
  OfflineReward,
} from '../types/game';
import {
  decayEggPurchasePressure,
  getEggPurchasePrice,
  getProductionPerSecond,
  getPortalResidualIncomePerSecond,
  getStoreCreatureOptions,
  getSellValue,
  getTotalProductionPerSecond,
} from '../utils/economy';
import {
  advancePortalRequestCooldown,
  isFinalMapOneNaturalMergeResult,
  startPortalRequest,
} from '../utils/portalRequests';
import type { SoundCueType } from '../utils/sound';
import { logSaveDebug } from '../utils/saveDebug';

export type DragState = {
  kind: 'creature' | 'egg';
  instanceId: string;
  startPointerX: number;
  startPointerY: number;
  pointerX: number;
  pointerY: number;
} | null;

export type GameAction =
  | { type: 'buyEgg' }
  | { type: 'buyCreatureEgg'; creatureId: CreatureId }
  | { type: 'sell'; instanceId: string }
  | { type: 'deliverPortalRequest'; instanceId: string }
  | { type: 'move'; instanceId: string; x: number; y: number }
  | { type: 'moveEgg'; eggId: string; x: number; y: number }
  | { type: 'openEgg'; eggId: string }
  | {
      type: 'environmentalTransform';
      sourceInstanceId: string;
      environmentId: EnvironmentId;
      resultCreatureId: CreatureId;
    }
  | {
      type: 'merge';
      sourceInstanceId: string;
      targetInstanceId: string;
      resultCreatureId: CreatureId;
      x: number;
      y: number;
    }
  | { type: 'blockedMerge'; message: string }
  | { type: 'replaceState'; state: GameState; toast?: string }
  | { type: 'showToast'; message: string }
  | { type: 'clearToast' }
  | { type: 'collectOfflineReward'; reward: OfflineReward; multiplier: 1 | 2 }
  | { type: 'tick'; elapsedSeconds: number; pausedCreatureInstanceId?: string | null }
  | { type: 'dismissWelcome' }
  | { type: 'dismissCloudSavePrompt' }
  | { type: 'dismissDiscovery' }
  | { type: 'switchMap'; mapId?: 'map1' | 'map2' }
  | { type: 'reset' }
  | { type: 'touchTimestamp' };

export interface GameModel {
  state: GameState;
  latestDiscoveryId: CreatureId | null;
  toast: string | null;
  portalPulseId: number;
  productionPulseId: number;
  soundCue: { id: number; type: SoundCueType } | null;
}

let idCounter = 0;
let soundCueCounter = 0;

const worldBounds = {
  minX: 0.06,
  maxX: 0.94,
  minY: 0.08,
  maxY: 0.92,
};

const portalAvoidanceZone = {
  minX: 0.34,
  maxX: 0.66,
  minY: 0,
  maxY: 0.2,
};

function createSoundCue(type: SoundCueType) {
  soundCueCounter += 1;
  return { id: soundCueCounter, type };
}

function clampWorldPosition(x: number, y: number) {
  return {
    x: Math.min(worldBounds.maxX, Math.max(worldBounds.minX, x)),
    y: Math.min(worldBounds.maxY, Math.max(worldBounds.minY, y)),
  };
}

function positionIsInPortalAvoidanceZone(x: number, y: number) {
  return (
    x >= portalAvoidanceZone.minX &&
    x <= portalAvoidanceZone.maxX &&
    y >= portalAvoidanceZone.minY &&
    y <= portalAvoidanceZone.maxY
  );
}

function slotToWorldPosition(slotIndex: number) {
  const safeSlot = Number.isFinite(slotIndex) ? slotIndex : 0;
  const row = Math.floor(safeSlot / gameConfig.boardColumns);
  const column = safeSlot % gameConfig.boardColumns;
  const x = 0.14 + (column / Math.max(1, gameConfig.boardColumns - 1)) * 0.72;
  const y = 0.14 + (row / Math.max(1, gameConfig.boardRows - 1)) * 0.72;

  return clampWorldPosition(x, y);
}

function distanceSquared(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return dx * dx + dy * dy;
}

function getEntityPositions(state: Pick<GameState, 'creatures' | 'eggs'>, mapId = 'map1') {
  return [
    ...state.creatures
      .filter((creature) => creature.mapId === mapId)
      .map((creature) => ({ x: creature.x, y: creature.y })),
    ...state.eggs.filter((egg) => egg.mapId === mapId).map((egg) => ({ x: egg.x, y: egg.y })),
  ];
}

function findWorldSpawnPosition(state: Pick<GameState, 'creatures' | 'eggs'>, mapId = 'map1') {
  const occupiedPositions = getEntityPositions(state, mapId);
  let bestPosition = clampWorldPosition(
    worldBounds.minX + Math.random() * (worldBounds.maxX - worldBounds.minX),
    worldBounds.minY + Math.random() * (worldBounds.maxY - worldBounds.minY),
  );
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 28; attempt += 1) {
    const candidate = clampWorldPosition(
      worldBounds.minX + Math.random() * (worldBounds.maxX - worldBounds.minX),
      worldBounds.minY + Math.random() * (worldBounds.maxY - worldBounds.minY),
    );

    if (positionIsInPortalAvoidanceZone(candidate.x, candidate.y)) continue;

    const nearestDistance = occupiedPositions.reduce(
      (nearest, position) => Math.min(nearest, distanceSquared(candidate, position)),
      Infinity,
    );

    if (nearestDistance > bestScore) {
      bestScore = nearestDistance;
      bestPosition = candidate;
    }
  }

  return bestPosition;
}

function getCreatureVelocity(seed = Date.now()) {
  const angle = ((seed % 360) / 360) * Math.PI * 2;
  const speed = 0.0025 + (seed % 5) * 0.00035;

  return {
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed * 0.7,
  };
}

export function createInstance(
  creatureId: CreatureId,
  positionOrSlot: number | { x: number; y: number },
  mapId: 'map1' | 'map2' = 'map1',
): CreatureInstance {
  idCounter += 1;
  const position =
    typeof positionOrSlot === 'number' ? slotToWorldPosition(positionOrSlot) : positionOrSlot;
  const clampedPosition = clampWorldPosition(position.x, position.y);
  const velocity = getCreatureVelocity(Date.now() + idCounter);

  return {
    instanceId:
      globalThis.crypto?.randomUUID?.() ?? `${creatureId}-${Date.now()}-${idCounter}`,
    creatureId,
    mapId,
    x: clampedPosition.x,
    y: clampedPosition.y,
    ...velocity,
    birthId: Date.now() + idCounter,
  };
}

function createEgg(
  positionOrSlot: number | { x: number; y: number },
  source: EggSource = 'free',
  contentCreatureId?: CreatureId,
  mapId: 'map1' | 'map2' = 'map1',
): EggState {
  idCounter += 1;
  const position =
    typeof positionOrSlot === 'number' ? slotToWorldPosition(positionOrSlot) : positionOrSlot;
  const clampedPosition = clampWorldPosition(position.x, position.y);

  return {
    eggId: globalThis.crypto?.randomUUID?.() ?? `egg-${Date.now()}-${idCounter}`,
    mapId,
    x: clampedPosition.x,
    y: clampedPosition.y,
    birthId: Date.now() + idCounter,
    source,
    contentCreatureId,
  };
}

export function getInitialState(): GameState {
  return {
    coins: gameConfig.startingCoins,
    creatures: [],
    eggs: [createEgg(findWorldSpawnPosition({ creatures: [], eggs: [] }, 'map1'), 'free')],
    discoveredCreatureIds: [],
    purchaseCounts: {},
    purchasedEggCount: 0,
    eggPurchasePressure: 0,
    currentEggPrice: gameConfig.eggPricing.basePrice,
    highestIncomePerSecond: 0,
    lastSavedAt: Date.now(),
    hasSeenWelcomeModal: false,
    hasSeenCloudSavePrompt: false,
    hasSeenPortalReaction: false,
    hasCompletedFirstMergeTutorial: false,
    guidedTutorialStep: 'openFirstEgg',
    portalState: 'dormant',
    portalEnergy: 0,
    portalEnergyRequired: gameConfig.portalEnergyRequired,
    portalRequestState: null,
    activePortalRequest: null,
    portalRequestCooldownStartedAt: null,
    lastRequestedTier: null,
    sameTierRequestStreak: 0,
    unlockedMapIds: ['map1'],
    currentMapId: 'map1',
    remainingEggSpawnSeconds: gameConfig.cosmicEggSpawnSeconds,
    offlineProductionCapSeconds: gameConfig.offlineRewardCapSeconds,
  };
}

export function getInitialModel(): GameModel {
  return {
    state: getInitialState(),
    latestDiscoveryId: null,
    toast: null,
    portalPulseId: 0,
    productionPulseId: 0,
    soundCue: null,
  };
}

function hasWorldCapacity(state: Pick<GameState, 'creatures' | 'eggs'>, mapId = 'map1') {
  return (
    state.creatures.filter((creature) => creature.mapId === mapId).length +
      state.eggs.filter((egg) => egg.mapId === mapId).length <
    gameConfig.maxWorldEntities
  );
}

function familyIsKnown(definition: CreatureDefinition, state: GameState) {
  if (definition.startsUnlockedInShop) return true;

  return Object.values(creatureDefinitions).some(
    (candidate) =>
      candidate.familyId === definition.familyId &&
      (state.discoveredCreatureIds.includes(candidate.id) ||
        state.creatures.some((creature) => creature.creatureId === candidate.id)),
  );
}

function getHatchEligibleCreatureIds(state: GameState): CreatureId[] {
  const hatchConfig = gameConfig.eggHatchConfig;

  return Object.values(creatureDefinitions)
    .filter((definition) => {
      if (!definition.canHatchFromCosmicEgg) return false;
      if (!hatchConfig.allowedStages.includes(definition.stage)) return false;
      if (
        hatchConfig.allowedFamilies &&
        !hatchConfig.allowedFamilies.includes(definition.familyId)
      ) {
        return false;
      }

      return familyIsKnown(definition, state);
    })
    .map((definition) => definition.id);
}

function chooseHatchedCreatureId(state: GameState): CreatureId | null {
  const eligible = getHatchEligibleCreatureIds(state);

  if (eligible.length === 0) return null;

  const weights = gameConfig.eggHatchConfig.weights ?? {};
  const weightedEntries = eligible.map((creatureId) => ({
    creatureId,
    weight: Math.max(0, weights[creatureId] ?? 1),
  }));
  const totalWeight = weightedEntries.reduce((total, entry) => total + entry.weight, 0);

  if (totalWeight <= 0) return eligible[0] ?? null;

  let roll = Math.random() * totalWeight;
  for (const entry of weightedEntries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.creatureId;
  }

  return weightedEntries[weightedEntries.length - 1]?.creatureId ?? null;
}

function hasHatchCandidate(state: GameState) {
  return getHatchEligibleCreatureIds(state).length > 0;
}

function updateHighestIncome(state: GameState): GameState {
  return {
    ...state,
    highestIncomePerSecond: Math.max(
      state.highestIncomePerSecond,
      getTotalProductionPerSecond(state),
    ),
  };
}

function removeCreatures(state: GameState, instanceIds: string[]) {
  const instanceIdSet = new Set(instanceIds);

  return {
    ...state,
    creatures: state.creatures.filter((creature) => !instanceIdSet.has(creature.instanceId)),
  };
}

export function reducer(model: GameModel, action: GameAction): GameModel {
  switch (action.type) {
    case 'buyEgg': {
      const cost = model.state.currentEggPrice;
      const canCreateEgg = hasWorldCapacity(model.state, model.state.currentMapId);

      if (!canCreateEgg) {
        return { ...model, toast: 'Não há espaço livre no campo.' };
      }

      if (model.state.coins < cost) {
        return { ...model, toast: 'Moedas insuficientes.' };
      }

      const nextEggPurchasePressure =
        model.state.eggPurchasePressure + gameConfig.eggPricing.purchasePressureIncrease;
      const stateAfterPurchase = updateHighestIncome({
        ...model.state,
        coins: model.state.coins - cost,
        eggs: [
          ...model.state.eggs,
            createEgg(
              findWorldSpawnPosition(model.state, model.state.currentMapId),
              'purchased',
              undefined,
              model.state.currentMapId,
            ),
        ],
        purchasedEggCount: model.state.purchasedEggCount + 1,
        eggPurchasePressure: nextEggPurchasePressure,
        lastSavedAt: Date.now(),
      });

      return {
        ...model,
        toast: null,
        soundCue: createSoundCue('buy'),
        state: {
          ...stateAfterPurchase,
          currentEggPrice: getEggPurchasePrice(stateAfterPurchase),
        },
      };
    }

    case 'buyCreatureEgg': {
      const option = getStoreCreatureOptions(model.state).find(
        (item) => item.definition.id === action.creatureId,
      );

      if (!option || !option.isUnlocked) {
        return { ...model, toast: 'Essa anomalia ainda não está disponível.' };
      }

      if (!hasWorldCapacity(model.state, model.state.currentMapId)) {
        return { ...model, toast: 'Não há espaço livre no campo.' };
      }

      if (model.state.coins < option.price) {
        return { ...model, toast: 'Moedas insuficientes.' };
      }

      return {
        ...model,
        toast: null,
        soundCue: createSoundCue('buy'),
        state: updateHighestIncome({
          ...model.state,
          coins: model.state.coins - option.price,
          eggs: [
            ...model.state.eggs,
            createEgg(
              findWorldSpawnPosition(model.state, model.state.currentMapId),
              'purchased',
              action.creatureId,
              model.state.currentMapId,
            ),
          ],
          purchaseCounts: {
            ...model.state.purchaseCounts,
            [action.creatureId]: (model.state.purchaseCounts[action.creatureId] ?? 0) + 1,
          },
          guidedTutorialStep:
            model.state.guidedTutorialStep === 'buyEgg'
              ? 'openSecondEgg'
              : model.state.guidedTutorialStep,
          lastSavedAt: Date.now(),
        }),
      };
    }

    case 'move':
      return {
        ...model,
        toast: null,
        state: {
          ...model.state,
          creatures: model.state.creatures.map((creature) =>
            creature.instanceId === action.instanceId
              ? { ...creature, ...clampWorldPosition(action.x, action.y) }
              : creature,
          ),
          lastSavedAt: Date.now(),
        },
      };

    case 'moveEgg':
      return {
        ...model,
        toast: null,
        state: {
          ...model.state,
          eggs: model.state.eggs.map((egg) =>
            egg.eggId === action.eggId ? { ...egg, ...clampWorldPosition(action.x, action.y) } : egg,
          ),
          lastSavedAt: Date.now(),
        },
      };

    case 'openEgg': {
      const egg = model.state.eggs.find((item) => item.eggId === action.eggId);
      if (!egg) return model;

      const hatchedCreatureId = egg.contentCreatureId ?? chooseHatchedCreatureId(model.state);
      if (!hatchedCreatureId) {
        return {
          ...model,
          toast: 'Nada respondeu.',
          soundCue: createSoundCue('invalid'),
        };
      }

      const alreadyDiscovered = model.state.discoveredCreatureIds.includes(hatchedCreatureId);
      const hatchedCreature = createInstance(hatchedCreatureId, { x: egg.x, y: egg.y }, egg.mapId);
      const discoveredCreatureIds = alreadyDiscovered
        ? model.state.discoveredCreatureIds
        : [...model.state.discoveredCreatureIds, hatchedCreatureId];

      return {
        ...model,
        latestDiscoveryId: alreadyDiscovered ? model.latestDiscoveryId : hatchedCreatureId,
        toast: alreadyDiscovered ? null : 'Nova anomalia descoberta!',
        soundCue: createSoundCue('eggHatch'),
        state: updateHighestIncome({
          ...model.state,
          eggs: model.state.eggs.filter((item) => item.eggId !== action.eggId),
          creatures: [...model.state.creatures, hatchedCreature],
          discoveredCreatureIds,
          guidedTutorialStep:
            model.state.guidedTutorialStep === 'openFirstEgg'
              ? 'buyEgg'
              : model.state.guidedTutorialStep === 'openSecondEgg'
                ? 'merge'
                : model.state.guidedTutorialStep,
          lastSavedAt: Date.now(),
        }),
      };
    }

    case 'sell': {
      const creature = model.state.creatures.find((item) => item.instanceId === action.instanceId);
      if (!creature) return model;

      const sellValue = getSellValue(creature.creatureId);

      return {
        ...model,
        soundCue: createSoundCue('buy'),
        state: {
          ...model.state,
          coins: model.state.coins + sellValue,
          creatures: model.state.creatures.filter((item) => item.instanceId !== action.instanceId),
          lastSavedAt: Date.now(),
        },
      };
    }

    case 'deliverPortalRequest': {
      const creature = model.state.creatures.find((item) => item.instanceId === action.instanceId);
      const request = model.state.activePortalRequest;
      if (!creature || model.state.portalState !== 'cracked' || model.state.portalRequestState !== 'active' || !request) {
        return {
          ...model,
          toast:
            model.state.portalState === 'awaiting_transition'
              ? 'O portal já está estabilizado.'
              : 'O portal não está pedindo nada agora.',
          soundCue: createSoundCue('invalid'),
        };
      }

      if (creature.creatureId !== request.creatureId) {
        return {
          ...model,
          toast: 'O portal rejeitou essa anomalia.',
          soundCue: createSoundCue('invalid'),
        };
      }

      const deliveredCount = request.deliveredCount + 1;
      const completed = deliveredCount >= request.requiredCount;
      const gainedEnergy = completed ? request.energyReward : 0;
      const nextEnergy = Math.min(
        model.state.portalEnergy + gainedEnergy,
        model.state.portalEnergyRequired,
      );
      const portalAwaitingTransition = completed && nextEnergy >= model.state.portalEnergyRequired;
      const nextRequest = completed
        ? null
        : {
            ...request,
            deliveredCount,
          };

      return {
        ...model,
        portalPulseId: model.portalPulseId + 1,
        soundCue: createSoundCue('portalTransform'),
        toast: completed
          ? portalAwaitingTransition
            ? 'O portal está estabilizado. Algo ainda falta.'
            : `Pedido concluído. +${gainedEnergy} energia.`
          : `${deliveredCount}/${request.requiredCount} entregue ao portal.`,
        state: {
          ...model.state,
          creatures: model.state.creatures.filter((item) => item.instanceId !== action.instanceId),
          portalEnergy: nextEnergy,
          portalState: portalAwaitingTransition ? 'awaiting_transition' : model.state.portalState,
          portalRequestState: completed
            ? portalAwaitingTransition
              ? 'charged'
              : 'cooldown'
            : 'active',
          activePortalRequest: nextRequest,
          portalRequestCooldownStartedAt:
            completed && !portalAwaitingTransition ? Date.now() : null,
          lastSavedAt: Date.now(),
        },
      };
    }

    case 'environmentalTransform': {
      const source = model.state.creatures.find(
        (creature) => creature.instanceId === action.sourceInstanceId,
      );

      if (!source) return model;

      const alreadyDiscovered = model.state.discoveredCreatureIds.includes(action.resultCreatureId);
      const shouldPulsePortal = action.environmentId === 'portal';
      const shouldCrackPortal =
        shouldPulsePortal &&
        action.resultCreatureId === 'umbrelume' &&
        !model.state.discoveredCreatureIds.includes('umbrelume') &&
        model.state.portalState === 'dormant';
      const stateAfterCollection = removeCreatures(model.state, [
        action.sourceInstanceId,
      ]);

      const stateWithTransform = {
        ...stateAfterCollection,
        creatures: [
          ...stateAfterCollection.creatures,
          createInstance(action.resultCreatureId, { x: source.x, y: source.y }, source.mapId),
        ],
        discoveredCreatureIds: alreadyDiscovered
          ? model.state.discoveredCreatureIds
          : [...model.state.discoveredCreatureIds, action.resultCreatureId],
        hasSeenPortalReaction: shouldPulsePortal || model.state.hasSeenPortalReaction
          ? true
          : model.state.hasSeenPortalReaction,
        portalState: shouldCrackPortal ? 'cracked' : model.state.portalState,
        lastSavedAt: Date.now(),
      };
      const nextState = updateHighestIncome(
        shouldCrackPortal ? startPortalRequest(stateWithTransform) : stateWithTransform,
      );

      return {
        ...model,
        latestDiscoveryId: alreadyDiscovered ? model.latestDiscoveryId : action.resultCreatureId,
        toast: shouldCrackPortal
          ? 'Energia Residual desbloqueada: +1/s permanente'
          : alreadyDiscovered
            ? null
            : 'Nova anomalia descoberta!',
        portalPulseId: shouldPulsePortal ? model.portalPulseId + 1 : model.portalPulseId,
        soundCue: createSoundCue('portalTransform'),
        state: nextState,
      };
    }

    case 'merge': {
      const alreadyDiscovered = model.state.discoveredCreatureIds.includes(action.resultCreatureId);
      const source = model.state.creatures.find(
        (creature) => creature.instanceId === action.sourceInstanceId,
      );
      const target = model.state.creatures.find(
        (creature) => creature.instanceId === action.targetInstanceId,
      );
      if (!source || !target) return model;

      const isMapOneTransitionMerge =
        source.mapId === 'map1' &&
        target.mapId === 'map1' &&
        isFinalMapOneNaturalMergeResult(action.resultCreatureId);
      const canCrossPortal =
        model.state.portalState === 'awaiting_transition' || model.state.portalState === 'open';

      if (isMapOneTransitionMerge && !canCrossPortal) {
        return {
          ...model,
          toast:
            'Esta anomalia não pode evoluir neste mundo... O portal ainda não está estabilizado.',
          soundCue: createSoundCue('invalid'),
        };
      }

      const nextCreature = createInstance(
        action.resultCreatureId,
        { x: action.x, y: action.y },
        isMapOneTransitionMerge ? 'map2' : target.mapId,
      );
      const shouldPulsePortal = action.resultCreatureId === 'umbrelume';
      const shouldOpenPortal =
        isMapOneTransitionMerge && model.state.portalState === 'awaiting_transition';
      const stateAfterCollection = removeCreatures(model.state, [
        action.sourceInstanceId,
        action.targetInstanceId,
      ]);

      const nextState = updateHighestIncome({
        ...stateAfterCollection,
        creatures: [...stateAfterCollection.creatures, nextCreature],
        discoveredCreatureIds: alreadyDiscovered
          ? model.state.discoveredCreatureIds
          : [...model.state.discoveredCreatureIds, action.resultCreatureId],
        hasSeenPortalReaction: shouldPulsePortal || model.state.hasSeenPortalReaction
          ? true
          : model.state.hasSeenPortalReaction,
        hasCompletedFirstMergeTutorial: true,
        guidedTutorialStep: 'done',
        portalState: shouldOpenPortal ? 'open' : stateAfterCollection.portalState,
        portalRequestState: shouldOpenPortal ? null : stateAfterCollection.portalRequestState,
        activePortalRequest: shouldOpenPortal ? null : stateAfterCollection.activePortalRequest,
        portalRequestCooldownStartedAt: shouldOpenPortal
          ? null
          : stateAfterCollection.portalRequestCooldownStartedAt,
        unlockedMapIds: shouldOpenPortal
          ? Array.from(new Set([...stateAfterCollection.unlockedMapIds, 'map2']))
          : stateAfterCollection.unlockedMapIds,
        lastSavedAt: Date.now(),
      });

      return {
        ...model,
        latestDiscoveryId: alreadyDiscovered ? model.latestDiscoveryId : action.resultCreatureId,
        toast: isMapOneTransitionMerge
          ? shouldOpenPortal
            ? 'A anomalia atravessou o portal. Mapa 2 desbloqueado.'
            : 'A anomalia atravessou o portal.'
          : alreadyDiscovered
            ? null
            : 'Nova anomalia descoberta!',
        portalPulseId:
          shouldPulsePortal || isMapOneTransitionMerge
            ? model.portalPulseId + 1
            : model.portalPulseId,
        soundCue: createSoundCue('merge'),
        state: nextState,
      };
    }

    case 'blockedMerge':
      return {
        ...model,
        toast: action.message,
        soundCue: createSoundCue('invalid'),
      };

    case 'replaceState':
      return {
        ...model,
        state: action.state,
        latestDiscoveryId: null,
        toast: action.toast ?? null,
      };

    case 'showToast':
      return {
        ...model,
        toast: action.message,
        soundCue: createSoundCue('invalid'),
      };

    case 'clearToast':
      return {
        ...model,
        toast: null,
      };

    case 'collectOfflineReward': {
      const now = Date.now();
      const creditedCoins = action.reward.coins * action.multiplier;
      const nextState = {
        ...model.state,
        coins: model.state.coins + creditedCoins,
        lastSavedAt: now,
      };

      logSaveDebug('OFFLINE_REWARD_COLLECTED', {
        source: 'memory',
        state: nextState,
        extra: {
          rewardCoins: action.reward.coins,
          multiplier: action.multiplier,
          creditedCoins,
          secondsAway: action.reward.secondsAway,
          capReached: action.reward.capReached,
        },
      });

      return {
        ...model,
        state: nextState,
      };
    }

    case 'dismissWelcome':
      return {
        ...model,
        state: {
          ...model.state,
          hasSeenWelcomeModal: true,
          lastSavedAt: Date.now(),
        },
      };

    case 'dismissCloudSavePrompt':
      return {
        ...model,
        state: {
          ...model.state,
          hasSeenCloudSavePrompt: true,
          lastSavedAt: Date.now(),
        },
      };

    case 'tick': {
      const elapsedSeconds = action.elapsedSeconds;
      const productionPerSecond = getTotalProductionPerSecond(model.state);
      const eggPurchasePressure = decayEggPurchasePressure(
        model.state.eggPurchasePressure,
        elapsedSeconds,
      );
      const creatureIncome = getProductionPerSecond(model.state.creatures) * elapsedSeconds;
      const residualIncome =
        getPortalResidualIncomePerSecond(model.state.portalState) * elapsedSeconds;
      const guidedTutorialIsActive = model.state.guidedTutorialStep !== 'done';
      const shouldResolveEggCycle =
        !guidedTutorialIsActive && model.state.remainingEggSpawnSeconds <= elapsedSeconds;
      const canSpawnEgg =
        shouldResolveEggCycle && hasHatchCandidate(model.state) && hasWorldCapacity(model.state, 'map1');
      const nextEggs =
        canSpawnEgg
          ? [...model.state.eggs, createEgg(findWorldSpawnPosition(model.state, 'map1'), 'free')]
          : model.state.eggs;
      const spawnedEgg = nextEggs.length !== model.state.eggs.length;
      const missedEgg = shouldResolveEggCycle && !spawnedEgg;
      const stateAfterPortalCooldown = advancePortalRequestCooldown(model.state);
      const creaturesWithProduction = stateAfterPortalCooldown.creatures.map((creature) => {
        const isMovementPaused = creature.instanceId === action.pausedCreatureInstanceId;
        const nextX = isMovementPaused ? creature.x : creature.x + creature.velocityX * elapsedSeconds;
        const nextY = isMovementPaused ? creature.y : creature.y + creature.velocityY * elapsedSeconds;
        const clamped = clampWorldPosition(nextX, nextY);
        const velocityX =
          clamped.x === worldBounds.minX || clamped.x === worldBounds.maxX
            ? -creature.velocityX
            : creature.velocityX;
        const velocityY =
          clamped.y === worldBounds.minY || clamped.y === worldBounds.maxY
            ? -creature.velocityY
            : creature.velocityY;

        return {
          ...creature,
          ...clamped,
          velocityX,
          velocityY,
        };
      });

      return {
        ...model,
        productionPulseId:
          productionPerSecond > 0 ? model.productionPulseId + 1 : model.productionPulseId,
        soundCue:
          spawnedEgg
            ? createSoundCue('eggSpawn')
            : missedEgg
              ? createSoundCue('invalid')
              : model.soundCue,
        toast: missedEgg
            ? 'Uma anomalia tentou se manifestar, mas não havia espaço disponível.'
            : model.toast,
        state: updateHighestIncome({
          ...model.state,
          ...stateAfterPortalCooldown,
          coins: model.state.coins + creatureIncome + residualIncome,
          creatures: creaturesWithProduction,
          eggs: nextEggs,
          eggPurchasePressure,
          remainingEggSpawnSeconds:
            guidedTutorialIsActive || spawnedEgg || missedEgg
              ? gameConfig.cosmicEggSpawnSeconds
              : Math.max(0, model.state.remainingEggSpawnSeconds - elapsedSeconds),
        }),
      };
    }

    case 'dismissDiscovery':
      return { ...model, latestDiscoveryId: null, toast: null };

    case 'switchMap': {
      if (model.state.portalState !== 'open') {
        return {
          ...model,
          toast: 'O portal ainda não está aberto.',
          soundCue: createSoundCue('invalid'),
        };
      }

      const targetMapId =
        action.mapId ?? (model.state.currentMapId === 'map1' ? 'map2' : 'map1');
      if (!model.state.unlockedMapIds.includes(targetMapId)) {
        return {
          ...model,
          toast: 'Este mundo ainda não foi desbloqueado.',
          soundCue: createSoundCue('invalid'),
        };
      }

      return {
        ...model,
        toast: targetMapId === 'map2' ? 'Mapa 2' : 'Mapa 1',
        state: {
          ...model.state,
          currentMapId: targetMapId,
          lastSavedAt: Date.now(),
        },
      };
    }

    case 'touchTimestamp':
      return { ...model, state: { ...model.state, lastSavedAt: Date.now() } };

    case 'reset':
      clearLocalSave();
      return getInitialModel();

    default:
      return model;
  }
}

export function calculateOfflineReward(state: GameState): OfflineReward | null {
  const now = Date.now();
  const secondsAway = Math.max(0, Math.floor((now - state.lastSavedAt) / 1000));
  const offlineProductionCapSeconds =
    state.offlineProductionCapSeconds ?? gameConfig.offlineRewardCapSeconds;
  const cappedSecondsAway = Math.min(secondsAway, offlineProductionCapSeconds);
  const totalProduction = getTotalProductionPerSecond(state);
  const coins = Math.floor(
    totalProduction * cappedSecondsAway * gameConfig.offlineProductionEfficiency,
  );

  if (coins <= 0 || secondsAway < 10) {
    return null;
  }

  return {
    coins,
    secondsAway: cappedSecondsAway,
    capReached: secondsAway >= offlineProductionCapSeconds,
  };
}
