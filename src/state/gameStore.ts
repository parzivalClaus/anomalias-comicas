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
  getEggPurchasePrice,
  getPortalResidualIncomePerSecond,
  getSellValue,
  getTotalProductionPerSecond,
} from '../utils/economy';
import type { SoundCueType } from '../utils/sound';

export type DragState = {
  kind: 'creature' | 'egg';
  instanceId: string;
  fromSlotIndex: number;
  pointerX: number;
  pointerY: number;
} | null;

export type GameAction =
  | { type: 'buyEgg' }
  | { type: 'sell'; instanceId: string }
  | { type: 'sacrifice'; instanceId: string }
  | { type: 'move'; instanceId: string; toSlotIndex: number }
  | { type: 'moveEgg'; eggId: string; toSlotIndex: number }
  | { type: 'swap'; sourceInstanceId: string; targetInstanceId: string }
  | { type: 'swapEggs'; sourceEggId: string; targetEggId: string }
  | { type: 'swapCreatureWithEgg'; creatureInstanceId: string; eggId: string }
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
      targetSlotIndex: number;
    }
  | { type: 'blockedMerge'; message: string }
  | { type: 'replaceState'; state: GameState; toast?: string }
  | { type: 'showToast'; message: string }
  | { type: 'clearToast' }
  | { type: 'collectCreatureCoins'; instanceId: string }
  | { type: 'tick'; elapsedSeconds: number }
  | { type: 'dismissWelcome' }
  | { type: 'dismissDiscovery' }
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

function createSoundCue(type: SoundCueType) {
  soundCueCounter += 1;
  return { id: soundCueCounter, type };
}

export function createInstance(creatureId: CreatureId, slotIndex: number): CreatureInstance {
  idCounter += 1;
  return {
    instanceId:
      globalThis.crypto?.randomUUID?.() ?? `${creatureId}-${Date.now()}-${idCounter}`,
    creatureId,
    slotIndex,
    birthId: Date.now() + idCounter,
    pendingCoins: 0,
  };
}

function createEgg(slotIndex: number, source: EggSource = 'free'): EggState {
  idCounter += 1;
  return {
    eggId: globalThis.crypto?.randomUUID?.() ?? `egg-${Date.now()}-${idCounter}`,
    slotIndex,
    remainingIncubationSeconds: gameConfig.cosmicEggIncubationSeconds,
    birthId: Date.now() + idCounter,
    source,
  };
}

export function getInitialState(): GameState {
  return {
    coins: gameConfig.startingCoins,
    creatures: [],
    eggs: [createEgg(Math.floor(Math.random() * gameConfig.boardSlots))],
    discoveredCreatureIds: [],
    purchaseCounts: {},
    purchasedEggCount: 0,
    highestIncomePerSecond: 0,
    lastSavedAt: Date.now(),
    hasSeenWelcomeModal: false,
    hasSeenPortalReaction: false,
    hasCompletedFirstMergeTutorial: false,
    portalState: 'dormant',
    portalEnergy: 0,
    portalEnergyRequired: gameConfig.portalEnergyRequired,
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

export function findFreeSlot(creatures: CreatureInstance[], eggs: EggState[] = []) {
  const occupiedSlots = new Set([
    ...creatures.map((creature) => creature.slotIndex),
    ...eggs.map((egg) => egg.slotIndex),
  ]);

  for (let index = 0; index < gameConfig.boardSlots; index += 1) {
    if (!occupiedSlots.has(index)) return index;
  }

  return null;
}

function findRandomFreeSlot(creatures: CreatureInstance[], eggs: EggState[]) {
  const occupiedSlots = new Set([
    ...creatures.map((creature) => creature.slotIndex),
    ...eggs.map((egg) => egg.slotIndex),
  ]);
  const freeSlots = Array.from({ length: gameConfig.boardSlots }, (_, index) => index).filter(
    (index) => !occupiedSlots.has(index),
  );

  if (freeSlots.length === 0) return null;

  return freeSlots[Math.floor(Math.random() * freeSlots.length)];
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

function getPendingCoins(creature: CreatureInstance) {
  return Math.floor(creature.pendingCoins ?? 0);
}

function getPendingCoinCap(creature: CreatureInstance) {
  return creatureDefinitions[creature.creatureId].coinsPerSecond * gameConfig.coinStorageSeconds;
}

function getPendingCoinsForInstanceIds(state: GameState, instanceIds: string[]) {
  const instanceIdSet = new Set(instanceIds);

  return state.creatures
    .filter((creature) => instanceIdSet.has(creature.instanceId))
    .reduce((total, creature) => total + getPendingCoins(creature), 0);
}

function removeCreaturesAndCollectPending(state: GameState, instanceIds: string[]) {
  const instanceIdSet = new Set(instanceIds);

  return {
    ...state,
    coins: state.coins + getPendingCoinsForInstanceIds(state, instanceIds),
    creatures: state.creatures.filter((creature) => !instanceIdSet.has(creature.instanceId)),
  };
}

export function reducer(model: GameModel, action: GameAction): GameModel {
  switch (action.type) {
    case 'buyEgg': {
      const cost = getEggPurchasePrice(model.state.highestIncomePerSecond);
      const freeSlot = findFreeSlot(model.state.creatures, model.state.eggs);

      if (freeSlot === null) {
        return { ...model, toast: 'Nao ha espaco livre no tabuleiro.' };
      }

      if (model.state.coins < cost) {
        return { ...model, toast: 'Moedas insuficientes.' };
      }

      return {
        ...model,
        toast: null,
        soundCue: createSoundCue('buy'),
        state: {
          ...model.state,
          coins: model.state.coins - cost,
          eggs: [...model.state.eggs, createEgg(freeSlot, 'purchased')],
          purchasedEggCount: model.state.purchasedEggCount + 1,
          lastSavedAt: Date.now(),
        },
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
              ? { ...creature, slotIndex: action.toSlotIndex }
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
            egg.eggId === action.eggId ? { ...egg, slotIndex: action.toSlotIndex } : egg,
          ),
          lastSavedAt: Date.now(),
        },
      };

    case 'sell': {
      const creature = model.state.creatures.find((item) => item.instanceId === action.instanceId);
      if (!creature) return model;

      const sellValue = getSellValue(creature.creatureId);
      const collectedCoins = getPendingCoins(creature);

      return {
        ...model,
        soundCue: createSoundCue('buy'),
        state: {
          ...model.state,
          coins: model.state.coins + sellValue + collectedCoins,
          creatures: model.state.creatures.filter((item) => item.instanceId !== action.instanceId),
          lastSavedAt: Date.now(),
        },
      };
    }

    case 'sacrifice': {
      const creature = model.state.creatures.find((item) => item.instanceId === action.instanceId);
      if (!creature || model.state.portalState !== 'cracked') return model;

      const gainedEnergy = creatureDefinitions[creature.creatureId].portalEnergyValue;
      const nextEnergy = Math.min(
        model.state.portalEnergy + gainedEnergy,
        model.state.portalEnergyRequired,
      );
      const portalActivated =
        model.state.portalState === 'cracked' && nextEnergy >= model.state.portalEnergyRequired;

      return {
        ...model,
        portalPulseId: model.portalPulseId + 1,
        soundCue: createSoundCue('portalTransform'),
        toast: portalActivated ? 'Portal ativo. Mapa 2 em breve...' : null,
        state: {
          ...model.state,
          coins: model.state.coins + getPendingCoins(creature),
          creatures: model.state.creatures.filter((item) => item.instanceId !== action.instanceId),
          portalEnergy: nextEnergy,
          portalState: portalActivated ? 'active' : model.state.portalState,
          unlockedMapIds: portalActivated
            ? Array.from(new Set([...model.state.unlockedMapIds, 'map2']))
            : model.state.unlockedMapIds,
          lastSavedAt: Date.now(),
        },
      };
    }

    case 'swap': {
      const source = model.state.creatures.find(
        (creature) => creature.instanceId === action.sourceInstanceId,
      );
      const target = model.state.creatures.find(
        (creature) => creature.instanceId === action.targetInstanceId,
      );

      if (!source || !target) return model;

      return {
        ...model,
        toast: null,
        state: {
          ...model.state,
          creatures: model.state.creatures.map((creature) => {
            if (creature.instanceId === source.instanceId) {
              return { ...creature, slotIndex: target.slotIndex };
            }

            if (creature.instanceId === target.instanceId) {
              return { ...creature, slotIndex: source.slotIndex };
            }

            return creature;
          }),
          lastSavedAt: Date.now(),
        },
      };
    }

    case 'swapEggs': {
      const source = model.state.eggs.find((egg) => egg.eggId === action.sourceEggId);
      const target = model.state.eggs.find((egg) => egg.eggId === action.targetEggId);

      if (!source || !target) return model;

      return {
        ...model,
        toast: null,
        state: {
          ...model.state,
          eggs: model.state.eggs.map((egg) => {
            if (egg.eggId === source.eggId) return { ...egg, slotIndex: target.slotIndex };
            if (egg.eggId === target.eggId) return { ...egg, slotIndex: source.slotIndex };
            return egg;
          }),
          lastSavedAt: Date.now(),
        },
      };
    }

    case 'swapCreatureWithEgg': {
      const creature = model.state.creatures.find(
        (item) => item.instanceId === action.creatureInstanceId,
      );
      const egg = model.state.eggs.find((item) => item.eggId === action.eggId);

      if (!creature || !egg) return model;

      return {
        ...model,
        toast: null,
        state: {
          ...model.state,
          creatures: model.state.creatures.map((item) =>
            item.instanceId === creature.instanceId ? { ...item, slotIndex: egg.slotIndex } : item,
          ),
          eggs: model.state.eggs.map((item) =>
            item.eggId === egg.eggId ? { ...item, slotIndex: creature.slotIndex } : item,
          ),
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
      const stateAfterCollection = removeCreaturesAndCollectPending(model.state, [
        action.sourceInstanceId,
      ]);

      const nextState = updateHighestIncome({
        ...stateAfterCollection,
        creatures: [
          ...stateAfterCollection.creatures,
          createInstance(action.resultCreatureId, source.slotIndex),
        ],
        discoveredCreatureIds: alreadyDiscovered
          ? model.state.discoveredCreatureIds
          : [...model.state.discoveredCreatureIds, action.resultCreatureId],
        hasSeenPortalReaction: shouldPulsePortal || model.state.hasSeenPortalReaction
          ? true
          : model.state.hasSeenPortalReaction,
        portalState: shouldCrackPortal ? 'cracked' : model.state.portalState,
        lastSavedAt: Date.now(),
      });

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
      const nextCreature = createInstance(action.resultCreatureId, action.targetSlotIndex);
      const shouldPulsePortal = action.resultCreatureId === 'umbrelume';
      const stateAfterCollection = removeCreaturesAndCollectPending(model.state, [
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
        lastSavedAt: Date.now(),
      });

      return {
        ...model,
        latestDiscoveryId: alreadyDiscovered ? model.latestDiscoveryId : action.resultCreatureId,
        toast: alreadyDiscovered ? null : 'Nova anomalia descoberta!',
        portalPulseId: shouldPulsePortal ? model.portalPulseId + 1 : model.portalPulseId,
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

    case 'collectCreatureCoins': {
      const creature = model.state.creatures.find((item) => item.instanceId === action.instanceId);
      if (!creature) return model;

      const collectedCoins = getPendingCoins(creature);
      if (collectedCoins <= 0) return model;

      return {
        ...model,
        state: {
          ...model.state,
          coins: model.state.coins + collectedCoins,
          creatures: model.state.creatures.map((item) =>
            item.instanceId === action.instanceId ? { ...item, pendingCoins: 0 } : item,
          ),
          lastSavedAt: Date.now(),
        },
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

    case 'tick': {
      const elapsedSeconds = action.elapsedSeconds;
      const productionPerSecond = getTotalProductionPerSecond(model.state);
      const residualIncome =
        getPortalResidualIncomePerSecond(model.state.portalState) * elapsedSeconds;
      const shouldResolveEggCycle = model.state.remainingEggSpawnSeconds <= elapsedSeconds;
      const canSpawnEgg = shouldResolveEggCycle && hasHatchCandidate(model.state);
      const freeSlot = canSpawnEgg
        ? findRandomFreeSlot(model.state.creatures, model.state.eggs)
        : null;
      const nextEggs =
        canSpawnEgg && freeSlot !== null
          ? [...model.state.eggs, createEgg(freeSlot, 'free')]
          : model.state.eggs;
      const spawnedEgg = nextEggs.length !== model.state.eggs.length;
      const missedEgg = canSpawnEgg && freeSlot === null;
      const hatchedCreatureIdByEggId = new Map<string, CreatureId>();
      const incubatingEggs = nextEggs
        .map((egg) => {
          const remainingIncubationSeconds = Math.max(
            0,
            egg.remainingIncubationSeconds - elapsedSeconds,
          );

          if (remainingIncubationSeconds > 0) {
            return { ...egg, remainingIncubationSeconds };
          }

          const hatchedCreatureId = chooseHatchedCreatureId(model.state);
          if (!hatchedCreatureId) return { ...egg, remainingIncubationSeconds: 1 };

          hatchedCreatureIdByEggId.set(egg.eggId, hatchedCreatureId);
          return null;
        })
        .filter((egg): egg is EggState => egg !== null);
      const hatchedCreatures = nextEggs
        .filter((egg) => hatchedCreatureIdByEggId.has(egg.eggId))
        .map((egg) => createInstance(hatchedCreatureIdByEggId.get(egg.eggId)!, egg.slotIndex));
      const discoveredCreatureIds = [...model.state.discoveredCreatureIds];
      let hatchedDiscoveryId: CreatureId | null = null;

      for (const hatchedCreature of hatchedCreatures) {
        const definition = creatureDefinitions[hatchedCreature.creatureId];

        if (
          definition.startsUnlockedInShop &&
          !discoveredCreatureIds.includes(hatchedCreature.creatureId)
        ) {
          discoveredCreatureIds.push(hatchedCreature.creatureId);
          hatchedDiscoveryId = hatchedDiscoveryId ?? hatchedCreature.creatureId;
        }
      }
      const nextCreatures =
        hatchedCreatures.length > 0
          ? [...model.state.creatures, ...hatchedCreatures]
          : model.state.creatures;
      const creaturesWithProduction = nextCreatures.map((creature) => ({
        ...creature,
        pendingCoins: Math.min(
          getPendingCoinCap(creature),
          (creature.pendingCoins ?? 0) +
            creatureDefinitions[creature.creatureId].coinsPerSecond * elapsedSeconds,
        ),
      }));

      return {
        ...model,
        latestDiscoveryId: hatchedDiscoveryId ?? model.latestDiscoveryId,
        productionPulseId:
          productionPerSecond > 0 ? model.productionPulseId + 1 : model.productionPulseId,
        soundCue:
          hatchedCreatures.length > 0
            ? createSoundCue('eggHatch')
            : spawnedEgg
              ? createSoundCue('eggSpawn')
              : missedEgg
                ? createSoundCue('invalid')
                : model.soundCue,
        toast: hatchedDiscoveryId
          ? 'Nova anomalia descoberta!'
          : missedEgg
            ? 'Uma anomalia tentou se manifestar, mas nao havia espaco disponivel.'
            : model.toast,
        state: updateHighestIncome({
          ...model.state,
          coins: model.state.coins + residualIncome,
          creatures: creaturesWithProduction,
          eggs: incubatingEggs,
          discoveredCreatureIds,
          remainingEggSpawnSeconds:
            spawnedEgg || missedEgg
              ? gameConfig.cosmicEggSpawnSeconds
              : Math.max(0, model.state.remainingEggSpawnSeconds - elapsedSeconds),
        }),
      };
    }

    case 'dismissDiscovery':
      return { ...model, latestDiscoveryId: null, toast: null };

    case 'touchTimestamp':
      return { ...model, state: { ...model.state, lastSavedAt: Date.now() } };

    case 'reset':
      clearLocalSave();
      return getInitialModel();

    default:
      return model;
  }
}

export function applyOfflineReward(state: GameState): {
  state: GameState;
  reward: OfflineReward | null;
} {
  const now = Date.now();
  const secondsAway = Math.max(0, Math.floor((now - state.lastSavedAt) / 1000));
  const offlineProductionCapSeconds =
    state.offlineProductionCapSeconds ?? gameConfig.offlineRewardCapSeconds;
  const cappedSecondsAway = Math.min(secondsAway, offlineProductionCapSeconds);
  const totalProduction = getTotalProductionPerSecond(state);
  const coins = totalProduction * cappedSecondsAway;

  if (coins <= 0 || secondsAway < 10) {
    return {
      state: { ...state, offlineProductionCapSeconds, lastSavedAt: now },
      reward: null,
    };
  }

  return {
    state: { ...state, coins: state.coins + coins, offlineProductionCapSeconds, lastSavedAt: now },
    reward: {
      coins,
      secondsAway: cappedSecondsAway,
      capReached: secondsAway >= offlineProductionCapSeconds,
    },
  };
}
