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

interface EggPricingState {
  creatures: CreatureInstance[];
  portalState: PortalState;
  highestIncomePerSecond: number;
  eggPurchasePressure: number;
}

export function getEffectiveEggPricingProduction(state: EggPricingState) {
  const currentProductionPerSecond =
    getProductionPerSecond(state.creatures) + getPortalResidualIncomePerSecond(state.portalState);
  const peakFloor =
    state.highestIncomePerSecond * gameConfig.eggPricing.peakProductionFloorFactor;

  return Math.max(currentProductionPerSecond, peakFloor);
}

export function getEggPurchasePrice(state: EggPricingState) {
  const effectiveProductionPerSecond = getEffectiveEggPricingProduction(state);
  const economicEggPrice = Math.max(
    gameConfig.eggPricing.basePrice,
    effectiveProductionPerSecond * gameConfig.eggPricing.targetProductionSeconds,
  );

  return Math.round(
    economicEggPrice *
      Math.pow(gameConfig.eggPricing.purchasePressureGrowth, Math.max(0, state.eggPurchasePressure)),
  );
}

export function decayEggPurchasePressure(currentPressure: number, elapsedSeconds: number) {
  if (currentPressure <= 0) return 0;
  if (gameConfig.eggPricing.purchasePressureDecaySeconds <= 0) return currentPressure;

  return Math.max(
    0,
    currentPressure - elapsedSeconds / gameConfig.eggPricing.purchasePressureDecaySeconds,
  );
}

export function getSellValue(creatureId: CreatureId) {
  const definition = creatureDefinitions[creatureId];

  return definition.sellValue ?? Math.max(1, Math.floor((definition.basePurchasePrice ?? 10) * 0.15));
}
