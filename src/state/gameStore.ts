import { gameConfig } from '../data/gameConfig';
import { creatureDefinitions } from '../data/creatures';
import type { CreatureId, CreatureInstance, GameState, OfflineReward } from '../types/game';
import { clearLocalSave } from '../persistence/localSave';
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
  | { type: 'tick'; elapsedSeconds: number }
  | { type: 'dismissDiscovery' }
  | { type: 'reset' }
  | { type: 'touchTimestamp' };

export interface GameModel {
  state: GameState;
  latestDiscoveryId: CreatureId | null;
  toast: string | null;
  portalPulseId: number;
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

export function getInitialState(): GameState {
  return {
    coins: gameConfig.startingCoins,
    creatures: [],
    discoveredCreatureIds: [],
    purchaseCounts: {},
    lastSavedAt: Date.now(),
    hasSeenPortalReaction: false,
  };
}

export function getInitialModel(): GameModel {
  return {
    state: getInitialState(),
    latestDiscoveryId: null,
    toast: null,
    portalPulseId: 0,
  };
}

export function findFreeSlot(creatures: CreatureInstance[]) {
  const occupiedSlots = new Set(creatures.map((creature) => creature.slotIndex));

  for (let index = 0; index < gameConfig.boardSlots; index += 1) {
    if (!occupiedSlots.has(index)) return index;
  }

  return null;
}

export function reducer(model: GameModel, action: GameAction): GameModel {
  switch (action.type) {
    case 'buy': {
      const definition = creatureDefinitions[action.creatureId];
      const cost = getPurchasePrice(action.creatureId, model.state.purchaseCounts);
      const freeSlot = findFreeSlot(model.state.creatures);

      if (freeSlot === null) {
        return { ...model, toast: 'Não há espaço livre no tabuleiro.' };
      }

      if (!definition.purchasable || definition.basePurchasePrice === undefined) {
        return { ...model, toast: 'Esta anomalia ainda não pode ser comprada.' };
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

    case 'tick':
      return {
        ...model,
        state: {
          ...model.state,
          coins:
            model.state.coins + getProductionPerSecond(model.state.creatures) * action.elapsedSeconds,
        },
      };

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
  const cappedSecondsAway = Math.min(secondsAway, gameConfig.offlineRewardCapSeconds);
  const production = getProductionPerSecond(state.creatures);
  const coins = production * cappedSecondsAway;

  if (coins <= 0 || secondsAway < 10) {
    return { state: { ...state, lastSavedAt: now }, reward: null };
  }

  return {
    state: { ...state, coins: state.coins + coins, lastSavedAt: now },
    reward: { coins, secondsAway: cappedSecondsAway },
  };
}
