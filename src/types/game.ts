export type CreatureId =
  | 'nebulo'
  | 'nebulume'
  | 'nebulux'
  | 'umbrelume'
  | 'neburix'
  | 'gravulon'
  | 'singulume';
export type EvolutionConditionType = 'portal_influence';
export type EnvironmentId = 'portal';
export type ProgressionType = 'natural' | 'environmental';
export type PortalState = 'dormant' | 'cracked' | 'active';
export type MapId = 'map1' | 'map2';
export type EggSource = 'free' | 'purchased';

export interface CreatureDefinition {
  id: CreatureId;
  dexNumber: number;
  name: string;
  tier: number;
  image: string;
  coinsPerSecond: number;
  purchasable: boolean;
  basePurchasePrice?: number;
  purchasePriceGrowth?: number;
  startsUnlockedInShop?: boolean;
  familyId: string;
  naturalTier: number | null;
  progressionType: ProgressionType;
  portalEnergyValue: number;
  sellValue?: number;
  stage: number;
  canHatchFromCosmicEgg: boolean;
  description: string;
  undiscoveredHint?: string;
  idleAnimation?: 'breathe' | 'float' | 'bounce';
  effect?: 'bubbles' | 'none';
}

export interface EvolutionCondition {
  type: EvolutionConditionType;
}

export interface EvolutionRecipe {
  inputs: [CreatureId, CreatureId];
  result: CreatureId;
  conditions?: EvolutionCondition[];
  blockedMessage?: string;
}

export interface EnvironmentalTransformation {
  input: CreatureId;
  environmentId: EnvironmentId;
  result: CreatureId;
}

export interface EggHatchConfig {
  allowedStages: number[];
  allowedFamilies?: string[];
  weights?: Partial<Record<CreatureId, number>>;
}

export interface CreatureInstance {
  instanceId: string;
  creatureId: CreatureId;
  slotIndex: number;
  birthId: number;
  pendingCoins: number;
}

export interface EggState {
  eggId: string;
  slotIndex: number;
  remainingIncubationSeconds: number;
  birthId: number;
  source: EggSource;
}

export interface GameState {
  coins: number;
  creatures: CreatureInstance[];
  eggs: EggState[];
  discoveredCreatureIds: CreatureId[];
  purchaseCounts: Partial<Record<CreatureId, number>>;
  purchasedEggCount: number;
  highestIncomePerSecond: number;
  lastSavedAt: number;
  hasSeenWelcomeModal: boolean;
  hasSeenPortalReaction: boolean;
  hasCompletedFirstMergeTutorial: boolean;
  portalState: PortalState;
  portalEnergy: number;
  portalEnergyRequired: number;
  unlockedMapIds: MapId[];
  currentMapId: MapId;
  remainingEggSpawnSeconds: number;
  offlineProductionCapSeconds: number;
}

export interface OfflineReward {
  coins: number;
  secondsAway: number;
  capReached: boolean;
}

export interface VersionedGameSave {
  saveVersion: 1 | 2 | 3 | 4 | 5;
  state: GameState;
  updatedAt: string;
}
