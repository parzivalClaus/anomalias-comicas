import { environmentalTransformations } from '../data/environmentalTransformations';
import type { CreatureInstance, CreatureId, EnvironmentId } from '../types/game';

type EnvironmentalTransformationEvaluation =
  | { status: 'success'; resultCreatureId: CreatureId }
  | { status: 'none' };

export function evaluateEnvironmentalTransformation(
  creature: CreatureInstance,
  environmentId: EnvironmentId,
): EnvironmentalTransformationEvaluation {
  const transformation = environmentalTransformations.find(
    (item) => item.input === creature.creatureId && item.environmentId === environmentId,
  );

  if (!transformation) return { status: 'none' };

  return { status: 'success', resultCreatureId: transformation.result };
}
