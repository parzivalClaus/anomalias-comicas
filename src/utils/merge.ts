import { evolutionRecipes } from '../data/evolutions';
import { gameConfig } from '../data/gameConfig';
import type { CreatureInstance, CreatureId, EvolutionCondition } from '../types/game';

type MergeEvaluation =
  | { status: 'success'; resultCreatureId: CreatureId }
  | { status: 'blocked'; message: string }
  | { status: 'none' };

function recipeMatches(inputs: [CreatureId, CreatureId], dragged: CreatureId, target: CreatureId) {
  return inputs.includes(dragged) && inputs.includes(target);
}

interface MergeEnvironment {
  targetSlotIndex: number;
}

interface MergeContext {
  dragged: CreatureInstance;
  target: CreatureInstance;
  environment: MergeEnvironment;
}

function isSlotInPortalInfluence(slotIndex: number) {
  return slotIndex >= 0 && slotIndex < gameConfig.boardColumns;
}

function getMergeEnvironment(target: CreatureInstance): MergeEnvironment {
  return {
    targetSlotIndex: target.slotIndex,
  };
}

function conditionIsMet(condition: EvolutionCondition, context: MergeContext) {
  if (condition.type === 'portal_influence') {
    return isSlotInPortalInfluence(context.environment.targetSlotIndex);
  }

  return false;
}

export function evaluateMerge(
  dragged: CreatureInstance,
  target: CreatureInstance,
): MergeEvaluation {
  if (dragged.instanceId === target.instanceId) return { status: 'none' };

  const recipe = evolutionRecipes.find((item) =>
    recipeMatches(item.inputs, dragged.creatureId, target.creatureId),
  );

  if (!recipe) return { status: 'none' };

  const context: MergeContext = {
    dragged,
    target,
    environment: getMergeEnvironment(target),
  };
  const conditionsMet =
    recipe.conditions?.every((condition) => conditionIsMet(condition, context)) ?? true;

  if (!conditionsMet) {
    return {
      status: 'blocked',
      message: recipe.blockedMessage ?? 'A ressonância parece incompleta...',
    };
  }

  return { status: 'success', resultCreatureId: recipe.result };
}
