import { evolutionRecipes } from '../data/evolutions';
import type { CreatureInstance, CreatureId, EvolutionCondition } from '../types/game';

type MergeEvaluation =
  | { status: 'success'; resultCreatureId: CreatureId }
  | { status: 'blocked'; message: string }
  | { status: 'none' };

function recipeMatches(inputs: [CreatureId, CreatureId], dragged: CreatureId, target: CreatureId) {
  return inputs.includes(dragged) && inputs.includes(target);
}

interface MergeContext {
  dragged: CreatureInstance;
  target: CreatureInstance;
}

function conditionIsMet(_condition: EvolutionCondition, _context: MergeContext) {
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
