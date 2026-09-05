export type RewardedAdPlacement = 'offline_reward';

export type RewardedAdResult = 'rewarded' | 'closed' | 'failed' | 'unavailable';

export interface RewardedAdService {
  isAvailable(): Promise<boolean>;
  showRewardedAd(placement: RewardedAdPlacement): Promise<RewardedAdResult>;
}

type RewardedAdBridgeResult =
  | RewardedAdResult
  | {
      status?: RewardedAdResult;
      result?: RewardedAdResult;
      rewarded?: boolean;
    };

type RewardedAdBridge = {
  isAvailable?: () => boolean | Promise<boolean>;
  showRewardedAd?: (placement: RewardedAdPlacement) => Promise<RewardedAdBridgeResult>;
};

declare global {
  interface Window {
    anomaliasRewardedAds?: RewardedAdBridge;
  }
}

class BrowserRewardedAdService implements RewardedAdService {
  async isAvailable() {
    const bridge = window.anomaliasRewardedAds;
    if (!bridge?.showRewardedAd) return true;
    if (!bridge.isAvailable) return true;

    try {
      return bridge.isAvailable();
    } catch {
      return false;
    }
  }

  async showRewardedAd(placement: RewardedAdPlacement) {
    const bridge = window.anomaliasRewardedAds;
    if (!bridge?.showRewardedAd) return 'failed';

    try {
      const result = await bridge.showRewardedAd(placement);
      return normalizeRewardedAdResult(result);
    } catch {
      return 'failed';
    }
  }
}

function normalizeRewardedAdResult(result: RewardedAdBridgeResult): RewardedAdResult {
  if (typeof result === 'string') return result;

  if (result.rewarded) {
    return 'rewarded';
  }

  if (result.status) {
    return result.status;
  }

  if (result.result) {
    return result.result;
  }

  return 'failed';
}

export const rewardedAdService = new BrowserRewardedAdService();
