import { evolutionRecipes } from '../data/evolutions';
import { creatureDefinitions } from '../data/creatures';
import type { CreatureInstance, CreatureId, EvolutionCondition } from '../types/game';

type MergeEvaluation =
  | { status: 'success'; resultCreatureId: CreatureId }
  | { status: 'blocked'; message: string }
  | { status: 'none' };

function recipeMatches(inputs: [CreatureId, CreatureId], dragged: CreatureId, target: CreatureId) {
  return (
    (inputs[0] === dragged && inputs[1] === target) ||
    (inputs[0] === target && inputs[1] === dragged)
  );
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

  if (!recipe) {
    const draggedDefinition = creatureDefinitions[dragged.creatureId];
    const targetDefinition = creatureDefinitions[target.creatureId];
    const isCappedNaturalMerge =
      dragged.creatureId === target.creatureId &&
      draggedDefinition.familyId === targetDefinition.familyId &&
      draggedDefinition.naturalTier !== null &&
      draggedDefinition.naturalTier === targetDefinition.naturalTier;

    return isCappedNaturalMerge
      ? { status: 'blocked', message: 'Essa evolução ainda não está disponível.' }
      : { status: 'none' };
  }

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
