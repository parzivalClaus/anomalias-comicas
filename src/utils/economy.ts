import { creatureDefinitions } from '../data/creatures';
import { gameConfig } from '../data/gameConfig';
import type { CreatureDefinition, CreatureId, CreatureInstance, GameState, PortalState } from '../types/game';

export function getProductionPerSecond(creatures: CreatureInstance[]) {
  return creatures.reduce(
    (total, creature) => total + creatureDefinitions[creature.creatureId].coinsPerSecond,
    0,
  );
}

export function getPortalResidualIncomePerSecond(portalState: PortalState) {
  return portalState === 'cracked' || portalState === 'awaiting_transition' || portalState === 'open'
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

export function getHighestDiscoveredNaturalTier(discoveredCreatureIds: CreatureId[]) {
  return discoveredCreatureIds.reduce((highestTier, creatureId) => {
    const naturalTier = creatureDefinitions[creatureId]?.naturalTier ?? 0;
    return Math.max(highestTier, naturalTier);
  }, 0);
}

export function canBuyCreatureFromStore(
  definition: CreatureDefinition,
  state: Pick<GameState, 'discoveredCreatureIds' | 'currentMapId'>,
) {
  if (!definition.purchasable || definition.naturalTier === null) return false;
  const maxTierForMap =
    state.currentMapId === 'map1'
      ? gameConfig.mapConfig.map1.maxNaturalTier
      : Infinity;
  const minTierForMap =
    state.currentMapId === 'map2' ? gameConfig.mapConfig.map2.minNaturalTier : 1;

  if (definition.naturalTier > maxTierForMap || definition.naturalTier < minTierForMap) {
    return false;
  }

  if (definition.startsUnlockedInShop) return state.currentMapId === 'map1';

  const highestDiscoveredTier = getHighestDiscoveredNaturalTier(state.discoveredCreatureIds);
  return definition.naturalTier <= highestDiscoveredTier - (gameConfig.storeUnlockGap - 1);
}

export function getStoreCreatureOptions(state: GameState) {
  return Object.values(creatureDefinitions)
    .filter((definition) => definition.purchasable && definition.naturalTier !== null)
    .sort((a, b) => (a.naturalTier ?? 0) - (b.naturalTier ?? 0))
    .map((definition) => ({
      definition,
      isUnlocked: canBuyCreatureFromStore(definition, state),
      price: getPurchasePrice(definition.id, state.purchaseCounts),
      purchaseCount: state.purchaseCounts[definition.id] ?? 0,
      requiredTier: definition.startsUnlockedInShop
        ? null
        : (definition.naturalTier ?? 0) + gameConfig.storeUnlockGap - 1,
    }));
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
