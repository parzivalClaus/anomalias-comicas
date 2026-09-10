import { evolutionRecipes } from '../data/evolutions';
import { environmentalTransformations } from '../data/environmentalTransformations';
import type { CreatureInstance, EnvironmentId, GameState } from '../types/game';
import { evaluateMerge } from './merge';

export interface MergeTutorialHint {
  sourceInstanceId: string;
  targetInstanceId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export interface EnvironmentalHint {
  creatureInstanceIds: string[];
  environmentIds: EnvironmentId[];
}

export function findMergeTutorialHint(creatures: CreatureInstance[]): MergeTutorialHint | null {
  for (let sourceIndex = 0; sourceIndex < creatures.length; sourceIndex += 1) {
    for (let targetIndex = sourceIndex + 1; targetIndex < creatures.length; targetIndex += 1) {
      const source = creatures[sourceIndex];
      const target = creatures[targetIndex];

      if (source.creatureId !== target.creatureId) continue;

      const merge = evaluateMerge(source, target);
      if (merge.status !== 'success') continue;

      return {
        sourceInstanceId: source.instanceId,
        targetInstanceId: target.instanceId,
        sourceX: source.x,
        sourceY: source.y,
        targetX: target.x,
        targetY: target.y,
      };
    }
  }

  return null;
}

export function findEnvironmentalHint(
  creatures: CreatureInstance[],
  state?: Pick<GameState, 'discoveredCreatureIds' | 'portalState'>,
): EnvironmentalHint | null {
  const availableTransformations = environmentalTransformations.filter(
    (transformation) =>
      !transformation.allowedPortalStates ||
      !state ||
      transformation.allowedPortalStates.includes(state.portalState),
  ).filter(
    (transformation) =>
      !transformation.oncePerSave ||
      !state ||
      !state.discoveredCreatureIds.includes(transformation.result),
  );
  const hintedCreatureIds = new Set(
    availableTransformations.map((transformation) => transformation.input),
  );
  const environmentIds = new Set(
    availableTransformations.map((transformation) => transformation.environmentId),
  );
  const creatureInstanceIds = creatures
    .filter((creature) => hintedCreatureIds.has(creature.creatureId))
    .map((creature) => creature.instanceId);

  if (creatureInstanceIds.length === 0 || environmentIds.size === 0) return null;

  return {
    creatureInstanceIds,
    environmentIds: [...environmentIds],
  };
}
