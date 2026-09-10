import { environmentalTransformations } from '../data/environmentalTransformations';
import type { CreatureInstance, CreatureId, EnvironmentId, GameState } from '../types/game';

type EnvironmentalTransformationEvaluation =
  | { status: 'success'; resultCreatureId: CreatureId }
  | { status: 'none' };

export function evaluateEnvironmentalTransformation(
  creature: CreatureInstance,
  environmentId: EnvironmentId,
  state?: Pick<GameState, 'discoveredCreatureIds' | 'portalState'>,
): EnvironmentalTransformationEvaluation {
  const transformation = environmentalTransformations.find(
    (item) =>
      item.input === creature.creatureId &&
      item.environmentId === environmentId &&
      (!item.allowedPortalStates ||
        !state ||
        item.allowedPortalStates.includes(state.portalState)) &&
      (!item.oncePerSave || !state || !state.discoveredCreatureIds.includes(item.result)),
  );

  if (!transformation) return { status: 'none' };

  return { status: 'success', resultCreatureId: transformation.result };
}
