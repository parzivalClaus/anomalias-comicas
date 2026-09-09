import type { EggHatchConfig } from '../types/game';

const defaultEggHatchConfig: EggHatchConfig = {
  allowedStages: [1],
};

export const ECONOMY_BALANCE = {
  egg: {
    basePrice: 25,
    targetProductionSeconds: 25,
    peakProductionFloorFactor: 0.5,
    incubationSeconds: 60,
    initialIncubationSeconds: 10,
    freeSpawnIntervalSeconds: 10,
    purchasePriceGrowth: 1.3,
    purchasePressureIncrease: 1,
    purchasePressureDecaySeconds: 180,
  },
  offline: {
    capSeconds: 2 * 60 * 60,
    efficiency: 0.25,
  },
  portalResidualIncomePerSecond: 1,
  portalSacrificeWarningPercent: 10,
  portalRequests: {
    cooldownSeconds: 120,
    requestTierGap: 4,
    tierWeightDecay: 0.6,
    maxSameTierStreak: 3,
    repeatedTierPenalty: 0.15,
    quantityByTier: {
      1: { min: 2, max: 6 },
      2: { min: 1, max: 4 },
      3: { min: 1, max: 3 },
      4: { min: 1, max: 2 },
    },
    defaultQuantity: { min: 1, max: 1 },
    energyByTier: {
      1: 80,
      2: 95,
      3: 110,
      4: 125,
      5: 140,
      6: 140,
      7: 140,
      8: 150,
      9: 160,
      10: 180,
    },
    defaultEnergy: 140,
    finalMapOneNaturalTier: 10,
  },
  criticalProductionPerSecond: 10,
  productionPerSecond: {
    nebulo: 1,
    nebulume: 3,
    nebulux: 8,
    neburix: 18,
    gravulon: 40,
    singulume: 90,
    astralume: 145,
    cosmoryx: 220,
    nexoryx: 330,
    translume: 500,
  },
} as const;

export const MAP_CONFIG = {
  map1: {
    maxNaturalTier: 10,
    transitionTier: 11,
  },
  map2: {
    minNaturalTier: 11,
  },
} as const;

export const gameConfig = {
  boardSlots: 24,
  boardColumns: 4,
  boardRows: 6,
  maxWorldEntities: 30,
  maxProductionBurstsPerTick: 14,
  storeUnlockGap: 5,
  startingCoins: 25,
  offlineRewardCapSeconds: ECONOMY_BALANCE.offline.capSeconds,
  offlineProductionEfficiency: ECONOMY_BALANCE.offline.efficiency,
  cosmicEggSpawnSeconds: ECONOMY_BALANCE.egg.freeSpawnIntervalSeconds,
  cosmicEggIncubationSeconds: ECONOMY_BALANCE.egg.incubationSeconds,
  initialCosmicEggIncubationSeconds: ECONOMY_BALANCE.egg.initialIncubationSeconds,
  cosmicEggHatchingThresholdSeconds: 5,
  eggPricing: {
    basePrice: ECONOMY_BALANCE.egg.basePrice,
    targetProductionSeconds: ECONOMY_BALANCE.egg.targetProductionSeconds,
    peakProductionFloorFactor: ECONOMY_BALANCE.egg.peakProductionFloorFactor,
    purchasePressureGrowth: ECONOMY_BALANCE.egg.purchasePriceGrowth,
    purchasePressureIncrease: ECONOMY_BALANCE.egg.purchasePressureIncrease,
    purchasePressureDecaySeconds: ECONOMY_BALANCE.egg.purchasePressureDecaySeconds,
  },
  defaultPurchasePriceGrowth: ECONOMY_BALANCE.egg.purchasePriceGrowth,
  eggHatchConfig: defaultEggHatchConfig,
  portalEnergyRequired: 1000,
  saveKey: 'anomalias-cosmicas-save-v1',
  coinTickMs: 1000,
  portalResidualIncomePerSecond: ECONOMY_BALANCE.portalResidualIncomePerSecond,
  portalSacrificeWarningPercent: ECONOMY_BALANCE.portalSacrificeWarningPercent,
  portalRequests: ECONOMY_BALANCE.portalRequests,
  mapConfig: MAP_CONFIG,
  criticalProductionPerSecond: ECONOMY_BALANCE.criticalProductionPerSecond,
  autosaveMs: 2500,
  cloudSyncMs: 15000,
  syncPendingIndicatorDelayMs: 900,
};
