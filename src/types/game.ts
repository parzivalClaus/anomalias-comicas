export type CreatureId = 'nebulo' | 'nebulume' | 'nebulux' | 'umbrelume';
export type EvolutionConditionType = 'portal_influence';
export type EnvironmentId = 'portal';

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

export interface CreatureInstance {
  instanceId: string;
  creatureId: CreatureId;
  slotIndex: number;
  birthId: number;
}

export interface EggState {
  eggId: string;
  slotIndex: number;
  remainingIncubationSeconds: number;
  birthId: number;
}

export interface GameState {
  coins: number;
  creatures: CreatureInstance[];
  eggs: EggState[];
  discoveredCreatureIds: CreatureId[];
  purchaseCounts: Partial<Record<CreatureId, number>>;
  lastSavedAt: number;
  hasSeenPortalReaction: boolean;
  hasCompletedFirstMergeTutorial: boolean;
  remainingEggSpawnSeconds: number;
  offlineProductionCapSeconds: number;
}

export interface OfflineReward {
  coins: number;
  secondsAway: number;
  capReached: boolean;
}

export interface VersionedGameSave {
  saveVersion: 1;
  state: GameState;
  updatedAt: string;
}
