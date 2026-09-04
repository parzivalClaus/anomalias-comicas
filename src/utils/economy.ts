import { creatureDefinitions } from '../data/creatures';
import { gameConfig } from '../data/gameConfig';
import type { CreatureId, CreatureInstance, GameState, PortalState } from '../types/game';

export function getProductionPerSecond(creatures: CreatureInstance[]) {
  return creatures.reduce(
    (total, creature) => total + creatureDefinitions[creature.creatureId].coinsPerSecond,
    0,
  );
}

export function getPortalResidualIncomePerSecond(portalState: PortalState) {
  return portalState === 'cracked' || portalState === 'active'
    ? gameConfig.portalResidualIncomePerSecond
    : 0;
}

export function getTotalProductionPerSecond(state: GameState) {
  return getProductionPerSecond(state.creatures) + getPortalResidualIncomePerSecond(state.portalState);
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

export function getEggPurchasePrice(highestIncomePerSecond: number, purchasedEggCount = 0) {
  const economicEggPrice = Math.max(
    gameConfig.baseEggPrice,
    highestIncomePerSecond * gameConfig.eggTargetProductionSeconds,
  );
  const purchasePressure = gameConfig.baseEggPrice * Math.pow(
    gameConfig.eggPurchasePriceGrowth,
    purchasedEggCount,
  );

  return Math.round(Math.max(economicEggPrice, purchasePressure));
}

export function getSellValue(creatureId: CreatureId) {
  const definition = creatureDefinitions[creatureId];

  return definition.sellValue ?? Math.max(1, Math.floor((definition.basePurchasePrice ?? 10) * 0.15));
}
