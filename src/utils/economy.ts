import { creatureDefinitions } from '../data/creatures';
import { gameConfig } from '../data/gameConfig';
import type { CreatureId, CreatureInstance } from '../types/game';

export function getProductionPerSecond(creatures: CreatureInstance[]) {
  return creatures.reduce(
    (total, creature) => total + creatureDefinitions[creature.creatureId].coinsPerSecond,
    0,
  );
}

export function formatCoins(value: number) {
  return Math.floor(value).toLocaleString('pt-BR');
}

export function getPurchasePrice(
  creatureId: CreatureId,
  purchaseCounts: Partial<Record<CreatureId, number>>,
) {
  const definition = creatureDefinitions[creatureId];
  const basePrice = definition.basePurchasePrice ?? 0;
  const growth = definition.purchasePriceGrowth ?? gameConfig.defaultPurchasePriceGrowth;
  const purchaseCount = purchaseCounts[creatureId] ?? 0;

  return Math.round(basePrice * Math.pow(growth, purchaseCount));
}
