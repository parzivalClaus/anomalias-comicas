import type { EggHatchConfig } from '../types/game';

const defaultEggHatchConfig: EggHatchConfig = {
  allowedStages: [1],
};

export const ECONOMY_BALANCE = {
  egg: {
    basePrice: 25,
    targetProductionSeconds: 25,
    incubationSeconds: 60,
    initialIncubationSeconds: 10,
    freeSpawnIntervalSeconds: 25,
    purchasePriceGrowth: 1.3,
  },
  offline: {
    capSeconds: 2 * 60 * 60,
    efficiency: 0.25,
  },
  coinStorageSeconds: 30,
  portalResidualIncomePerSecond: 1,
  portalSacrificeWarningPercent: 10,
  criticalProductionPerSecond: 10,
  productionPerSecond: {
    nebulo: 1,
    nebulume: 3,
    nebulux: 8,
    neburix: 18,
    gravulon: 40,
    singulume: 90,
  },
} as const;

export const gameConfig = {
  boardSlots: 20,
  boardColumns: 4,
  boardRows: 5,
  startingCoins: 0,
  offlineRewardCapSeconds: ECONOMY_BALANCE.offline.capSeconds,
  offlineProductionEfficiency: ECONOMY_BALANCE.offline.efficiency,
  cosmicEggSpawnSeconds: ECONOMY_BALANCE.egg.freeSpawnIntervalSeconds,
  cosmicEggIncubationSeconds: ECONOMY_BALANCE.egg.incubationSeconds,
  initialCosmicEggIncubationSeconds: ECONOMY_BALANCE.egg.initialIncubationSeconds,
  cosmicEggHatchingThresholdSeconds: 5,
  baseEggPrice: ECONOMY_BALANCE.egg.basePrice,
  eggTargetProductionSeconds: ECONOMY_BALANCE.egg.targetProductionSeconds,
  defaultPurchasePriceGrowth: ECONOMY_BALANCE.egg.purchasePriceGrowth,
  eggPurchasePriceGrowth: ECONOMY_BALANCE.egg.purchasePriceGrowth,
  eggHatchConfig: defaultEggHatchConfig,
  portalEnergyRequired: 1000,
  saveKey: 'anomalias-cosmicas-save-v1',
  coinTickMs: 1000,
  coinStorageSeconds: ECONOMY_BALANCE.coinStorageSeconds,
  portalResidualIncomePerSecond: ECONOMY_BALANCE.portalResidualIncomePerSecond,
  portalSacrificeWarningPercent: ECONOMY_BALANCE.portalSacrificeWarningPercent,
  criticalProductionPerSecond: ECONOMY_BALANCE.criticalProductionPerSecond,
  autosaveMs: 2500,
  cloudSyncMs: 15000,
  syncPendingIndicatorDelayMs: 900,
};
