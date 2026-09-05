import { Coins, Play } from 'lucide-react';
import type { OfflineReward } from '../types/game';
import { formatCoins } from '../utils/economy';

interface OfflineRewardModalProps {
  reward: OfflineReward;
  isRewardedAdAvailable: boolean;
  isPending: boolean;
  rewardedAdMessage: string | null;
  onCollect: () => void;
  onCollectDouble: () => void;
}

function formatOfflineDuration(secondsAway: number) {
  const hours = Math.floor(secondsAway / 3600);
  const minutes = Math.floor((secondsAway % 3600) / 60);
  const seconds = secondsAway % 60;

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes} min ${seconds}s` : `${minutes} min`;
  }

  return `${seconds}s`;
}

export function OfflineRewardModal({
  reward,
  isRewardedAdAvailable,
  isPending,
  rewardedAdMessage,
  onCollect,
  onCollectDouble,
}: OfflineRewardModalProps) {
  const doubledCoins = reward.coins * 2;

  return (
    <div className="modalBackdrop" role="presentation">
      <section className="modal offline" role="dialog" aria-modal="true" aria-label="Recompensa offline">
        <p className="modal__eyebrow">Produção offline</p>
        <h2>
          <Coins size={24} aria-hidden="true" />
          +{formatCoins(reward.coins)}
        </h2>
        <p>
          Suas anomalias produziram enquanto você esteve fora por{' '}
          {formatOfflineDuration(reward.secondsAway)}.
        </p>
        {reward.capReached ? (
          <p className="offline__cap">Limite de produção offline atingido.</p>
        ) : null}
        {rewardedAdMessage ? (
          <p className="offline__adMessage" role="status">
            {rewardedAdMessage}
          </p>
        ) : null}
        <div className="offline__actions">
          <button className="secondaryButton" type="button" disabled={isPending} onClick={onCollect}>
            Coletar {formatCoins(reward.coins)}
          </button>
          <button
            className="primaryButton offline__rewardedButton"
            type="button"
            disabled={isPending || !isRewardedAdAvailable}
            onClick={onCollectDouble}
          >
            <Play size={16} aria-hidden="true" />
            {isPending
              ? 'Processando...'
              : isRewardedAdAvailable
                ? `2x - Receber ${formatCoins(doubledCoins)}`
                : '2x indisponível'}
          </button>
        </div>
      </section>
    </div>
  );
}
