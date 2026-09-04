import type { EggHatchConfig } from '../types/game';

const defaultEggHatchConfig: EggHatchConfig = {
  allowedStages: [1],
};

export const ECONOMY_BALANCE = {
  egg: {
    basePrice: 25,
    targetProductionSeconds: 25,
    incubationSeconds: 60,
    freeSpawnIntervalSeconds: 25,
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
  boardSlots: 24,
  boardColumns: 4,
  boardRows: 6,
  startingCoins: 0,
  offlineRewardCapSeconds: 120 * 60,
  cosmicEggSpawnSeconds: ECONOMY_BALANCE.egg.freeSpawnIntervalSeconds,
  cosmicEggIncubationSeconds: ECONOMY_BALANCE.egg.incubationSeconds,
  cosmicEggHatchingThresholdSeconds: 5,
  baseEggPrice: ECONOMY_BALANCE.egg.basePrice,
  eggTargetProductionSeconds: ECONOMY_BALANCE.egg.targetProductionSeconds,
  defaultPurchasePriceGrowth: 1.3,
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
