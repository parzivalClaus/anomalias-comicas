export type CreatureId =
  | 'nebulo'
  | 'nebulume'
  | 'nebulux'
  | 'umbrelume'
  | 'neburix'
  | 'gravulon'
  | 'singulume'
  | 'astralume'
  | 'cosmoryx'
  | 'nexoryx'
  | 'translume';
export type EvolutionConditionType = 'portal_influence';
export type EnvironmentId = 'portal';
export type ProgressionType = 'natural' | 'environmental';
export type PortalState = 'dormant' | 'cracked' | 'awaiting_transition' | 'open';
export type PortalRequestState = 'active' | 'cooldown' | 'charged';
export type MapId = 'map1' | 'map2';
export type EggSource = 'free' | 'purchased';
export type SaveOwnerType = 'guest' | 'account';
export type GuidedTutorialStep = 'openFirstEgg' | 'buyEgg' | 'openSecondEgg' | 'merge' | 'done';

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

export interface PortalRequest {
  id: string;
  creatureId: CreatureId;
  requestedTier: number;
  requiredCount: number;
  deliveredCount: number;
  energyReward: number;
}

export interface CreatureInstance {
  instanceId: string;
  creatureId: CreatureId;
  mapId: MapId;
  slotIndex?: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  birthId: number;
}

export interface EggState {
  eggId: string;
  mapId: MapId;
  slotIndex?: number;
  x: number;
  y: number;
  birthId: number;
  source: EggSource;
  contentCreatureId?: CreatureId;
}

export interface GameState {
  coins: number;
  creatures: CreatureInstance[];
  eggs: EggState[];
  discoveredCreatureIds: CreatureId[];
  purchaseCounts: Partial<Record<CreatureId, number>>;
  purchasedEggCount: number;
  eggPurchasePressure: number;
  currentEggPrice: number;
  highestIncomePerSecond: number;
  lastSavedAt: number;
  hasSeenWelcomeModal: boolean;
  hasSeenCloudSavePrompt: boolean;
  hasSeenPortalReaction: boolean;
  hasCompletedFirstMergeTutorial: boolean;
  guidedTutorialStep: GuidedTutorialStep;
  portalState: PortalState;
  portalEnergy: number;
  portalEnergyRequired: number;
  portalRequestState: PortalRequestState | null;
  activePortalRequest: PortalRequest | null;
  portalRequestCooldownStartedAt: number | null;
  lastRequestedTier: number | null;
  sameTierRequestStreak: number;
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
  saveVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  state: GameState;
  updatedAt: string;
  ownerType: SaveOwnerType;
  ownerUserId?: string;
}
