export type RewardedAdPlacement = 'offline_reward';

export type RewardedAdResult = 'rewarded' | 'closed' | 'failed' | 'unavailable';

export interface RewardedAdRequest {
  id: number;
  placement: RewardedAdPlacement;
}

export interface RewardedAdService {
  isAvailable(): Promise<boolean>;
  showRewardedAd(placement: RewardedAdPlacement): Promise<RewardedAdResult>;
}

type RewardedAdRequestListener = (request: RewardedAdRequest) => void;

class MockRewardedAdService implements RewardedAdService {
  private nextRequestId = 0;
  private readonly pendingRequests = new Map<number, (result: RewardedAdResult) => void>();
  private readonly listeners = new Set<RewardedAdRequestListener>();

  async isAvailable() {
    return true;
  }

  async showRewardedAd(placement: RewardedAdPlacement) {
    this.nextRequestId += 1;
    const request: RewardedAdRequest = {
      id: this.nextRequestId,
      placement,
    };

    return new Promise<RewardedAdResult>((resolve) => {
      this.pendingRequests.set(request.id, resolve);
      this.listeners.forEach((listener) => listener(request));
    });
  }

  resolveRequest(id: number, result: RewardedAdResult) {
    const resolve = this.pendingRequests.get(id);
    if (!resolve) return;

    this.pendingRequests.delete(id);
    resolve(result);
  }

  subscribe(listener: RewardedAdRequestListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const rewardedAdService = new MockRewardedAdService();
