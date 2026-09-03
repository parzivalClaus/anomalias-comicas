export type CreatureId = 'nebulo' | 'nebulume' | 'nebulux' | 'umbrelume';
export type EvolutionConditionType = 'portal_influence';

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

export interface CreatureInstance {
  instanceId: string;
  creatureId: CreatureId;
  slotIndex: number;
  birthId: number;
}

export interface GameState {
  coins: number;
  creatures: CreatureInstance[];
  discoveredCreatureIds: CreatureId[];
  purchaseCounts: Partial<Record<CreatureId, number>>;
  lastSavedAt: number;
  hasSeenPortalReaction: boolean;
}

export interface OfflineReward {
  coins: number;
  secondsAway: number;
}

export interface VersionedGameSave {
  saveVersion: 1;
  state: GameState;
  updatedAt: string;
}
