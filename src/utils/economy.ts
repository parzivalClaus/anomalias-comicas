import { creatureDefinitions } from '../data/creatures';
import type { CreatureInstance } from '../types/game';

export function getProductionPerSecond(creatures: CreatureInstance[]) {
  return creatures.reduce(
    (total, creature) => total + creatureDefinitions[creature.creatureId].coinsPerSecond,
    0,
  );
}

export function formatCoins(value: number) {
  return Math.floor(value).toLocaleString('pt-BR');
}
