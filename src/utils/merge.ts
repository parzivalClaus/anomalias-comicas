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

function isInPortalInfluence(creature: CreatureInstance) {
  return creature.slotIndex >= 0 && creature.slotIndex < gameConfig.boardColumns;
}

function conditionIsMet(condition: EvolutionCondition, creatures: [CreatureInstance, CreatureInstance]) {
  if (condition.type === 'portal_influence') {
    return creatures.every(isInPortalInfluence);
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

  const conditionsMet =
    recipe.conditions?.every((condition) => conditionIsMet(condition, [dragged, target])) ?? true;

  if (!conditionsMet) {
    return {
      status: 'blocked',
      message: recipe.blockedMessage ?? 'A ressonância parece incompleta...',
    };
  }

  return { status: 'success', resultCreatureId: recipe.result };
}
