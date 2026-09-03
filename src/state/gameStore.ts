import { creatureDefinitions } from '../data/creatures';
import { gameConfig } from '../data/gameConfig';
import { clearLocalSave } from '../persistence/localSave';
import type { CreatureId, CreatureInstance, EggState, GameState, OfflineReward } from '../types/game';
import { getProductionPerSecond, getPurchasePrice } from '../utils/economy';

export type DragState = {
  instanceId: string;
  fromSlotIndex: number;
  pointerX: number;
  pointerY: number;
} | null;

export type GameAction =
  | { type: 'buy'; creatureId: CreatureId }
  | { type: 'move'; instanceId: string; toSlotIndex: number }
  | { type: 'swap'; sourceInstanceId: string; targetInstanceId: string }
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
  | { type: 'tick'; elapsedSeconds: number }
  | { type: 'dismissDiscovery' }
  | { type: 'reset' }
  | { type: 'touchTimestamp' };

export interface GameModel {
  state: GameState;
  latestDiscoveryId: CreatureId | null;
  toast: string | null;
  portalPulseId: number;
  productionPulseId: number;
}

let idCounter = 0;

export function createInstance(creatureId: CreatureId, slotIndex: number): CreatureInstance {
  idCounter += 1;
  return {
    instanceId:
      globalThis.crypto?.randomUUID?.() ?? `${creatureId}-${Date.now()}-${idCounter}`,
    creatureId,
    slotIndex,
    birthId: Date.now() + idCounter,
  };
}

function createEgg(slotIndex: number): EggState {
  idCounter += 1;
  return {
    eggId: globalThis.crypto?.randomUUID?.() ?? `egg-${Date.now()}-${idCounter}`,
    slotIndex,
    remainingIncubationSeconds: gameConfig.cosmicEggIncubationSeconds,
    birthId: Date.now() + idCounter,
  };
}

export function getInitialState(): GameState {
  return {
    coins: gameConfig.startingCoins,
    creatures: [],
    eggs: [createEgg(Math.floor(Math.random() * gameConfig.boardSlots))],
    discoveredCreatureIds: [],
    purchaseCounts: {},
    lastSavedAt: Date.now(),
    hasSeenPortalReaction: false,
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

function getHatchEligibleCreatureIds(state: GameState): CreatureId[] {
  const eligible = Object.values(creatureDefinitions)
    .filter(
      (definition) =>
        definition.stage === 1 &&
        definition.canHatchFromCosmicEgg &&
        state.discoveredCreatureIds.includes(definition.id),
    )
    .map((definition) => definition.id);

  if (eligible.length > 0) return eligible;

  return Object.values(creatureDefinitions)
    .filter(
      (definition) =>
        definition.stage === 1 &&
        definition.canHatchFromCosmicEgg &&
        state.creatures.some((creature) => creature.creatureId === definition.id),
    )
    .map((definition) => definition.id);
}

function chooseHatchedCreatureId(state: GameState): CreatureId | null {
  const eligible = getHatchEligibleCreatureIds(state);

  if (eligible.length === 0) {
    const starter = Object.values(creatureDefinitions).find(
      (definition) =>
        definition.stage === 1 &&
        definition.canHatchFromCosmicEgg &&
        definition.startsUnlockedInShop,
    );

    return starter?.id ?? null;
  }

  return eligible[Math.floor(Math.random() * eligible.length)];
}

function hasHatchCandidate(state: GameState) {
  return Object.values(creatureDefinitions).some(
    (definition) =>
      definition.stage === 1 &&
      definition.canHatchFromCosmicEgg &&
      (state.discoveredCreatureIds.includes(definition.id) ||
        state.creatures.some((creature) => creature.creatureId === definition.id) ||
        definition.startsUnlockedInShop),
  );
}

export function reducer(model: GameModel, action: GameAction): GameModel {
  switch (action.type) {
    case 'buy': {
      const definition = creatureDefinitions[action.creatureId];
      const cost = getPurchasePrice(action.creatureId, model.state.purchaseCounts);
      const freeSlot = findFreeSlot(model.state.creatures, model.state.eggs);

      if (freeSlot === null) {
        return { ...model, toast: 'Nao ha espaco livre no tabuleiro.' };
      }

      if (!definition.purchasable || definition.basePurchasePrice === undefined) {
        return { ...model, toast: 'Esta anomalia ainda nao pode ser comprada.' };
      }

      if (model.state.coins < cost) {
        return { ...model, toast: 'Moedas insuficientes.' };
      }

      const alreadyDiscovered = model.state.discoveredCreatureIds.includes(action.creatureId);

      return {
        ...model,
        latestDiscoveryId: alreadyDiscovered ? model.latestDiscoveryId : action.creatureId,
        toast: alreadyDiscovered ? null : 'Nova anomalia descoberta!',
        state: {
          ...model.state,
          coins: model.state.coins - cost,
          creatures: [...model.state.creatures, createInstance(action.creatureId, freeSlot)],
          purchaseCounts: {
            ...model.state.purchaseCounts,
            [action.creatureId]: (model.state.purchaseCounts[action.creatureId] ?? 0) + 1,
          },
          discoveredCreatureIds: alreadyDiscovered
            ? model.state.discoveredCreatureIds
            : [...model.state.discoveredCreatureIds, action.creatureId],
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

    case 'merge': {
      const alreadyDiscovered = model.state.discoveredCreatureIds.includes(action.resultCreatureId);
      const nextCreature = createInstance(action.resultCreatureId, action.targetSlotIndex);
      const shouldPulsePortal = action.resultCreatureId === 'umbrelume';

      return {
        ...model,
        latestDiscoveryId: alreadyDiscovered ? model.latestDiscoveryId : action.resultCreatureId,
        toast: alreadyDiscovered ? null : 'Nova anomalia descoberta!',
        portalPulseId: shouldPulsePortal ? model.portalPulseId + 1 : model.portalPulseId,
        state: {
          ...model.state,
          creatures: [
            ...model.state.creatures.filter(
              (creature) =>
                creature.instanceId !== action.sourceInstanceId &&
                creature.instanceId !== action.targetInstanceId,
            ),
            nextCreature,
          ],
          discoveredCreatureIds: alreadyDiscovered
            ? model.state.discoveredCreatureIds
            : [...model.state.discoveredCreatureIds, action.resultCreatureId],
          hasSeenPortalReaction: shouldPulsePortal || model.state.hasSeenPortalReaction
            ? true
            : model.state.hasSeenPortalReaction,
          lastSavedAt: Date.now(),
        },
      };
    }

    case 'blockedMerge':
      return {
        ...model,
        toast: action.message,
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
      };

    case 'clearToast':
      return {
        ...model,
        toast: null,
      };

    case 'tick': {
      const elapsedSeconds = action.elapsedSeconds;
      const productionPerSecond = getProductionPerSecond(model.state.creatures);
      const hasIncubatingEgg = model.state.eggs.length > 0;
      const shouldResolveEggCycle =
        !hasIncubatingEgg && model.state.remainingEggSpawnSeconds <= elapsedSeconds;
      const canSpawnEgg = shouldResolveEggCycle && hasHatchCandidate(model.state);
      const freeSlot = canSpawnEgg
        ? findRandomFreeSlot(model.state.creatures, model.state.eggs)
        : null;
      const nextEggs =
        canSpawnEgg && freeSlot !== null
          ? [...model.state.eggs, createEgg(freeSlot)]
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
      const shouldPauseEggCycle = incubatingEggs.length > 0;
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

      return {
        ...model,
        latestDiscoveryId: hatchedDiscoveryId ?? model.latestDiscoveryId,
        productionPulseId:
          productionPerSecond > 0 ? model.productionPulseId + 1 : model.productionPulseId,
        toast: hatchedDiscoveryId
          ? 'Nova anomalia descoberta!'
          : missedEgg
            ? 'Uma anomalia tentou se manifestar, mas nao havia espaco disponivel.'
            : model.toast,
        state: {
          ...model.state,
          coins: model.state.coins + productionPerSecond * elapsedSeconds,
          creatures: [...model.state.creatures, ...hatchedCreatures],
          eggs: incubatingEggs,
          discoveredCreatureIds,
          remainingEggSpawnSeconds:
            spawnedEgg || missedEgg || hatchedCreatures.length > 0
              ? gameConfig.cosmicEggSpawnSeconds
              : shouldPauseEggCycle
                ? model.state.remainingEggSpawnSeconds <= elapsedSeconds
                  ? gameConfig.cosmicEggSpawnSeconds
                  : model.state.remainingEggSpawnSeconds
                : Math.max(0, model.state.remainingEggSpawnSeconds - elapsedSeconds),
        },
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
  const production = getProductionPerSecond(state.creatures);
  const coins = production * cappedSecondsAway;

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
