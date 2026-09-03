import { Coins } from 'lucide-react';
import type { OfflineReward } from '../types/game';
import { formatCoins } from '../utils/economy';

interface OfflineRewardModalProps {
  reward: OfflineReward;
  onCollect: () => void;
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

export function OfflineRewardModal({ reward, onCollect }: OfflineRewardModalProps) {
  return (
    <div className="modalBackdrop" role="presentation">
      <section className="modal offline" role="dialog" aria-modal="true" aria-label="Recompensa offline">
        <p className="modal__eyebrow">Enquanto você esteve fora...</p>
        <h2>
          <Coins size={24} aria-hidden="true" />
          +{formatCoins(reward.coins)}
        </h2>
        <p>Suas anomalias produziram por {formatOfflineDuration(reward.secondsAway)}.</p>
        {reward.capReached ? (
          <p className="offline__cap">Limite de producao offline atingido.</p>
        ) : null}
        <button className="primaryButton" type="button" onClick={onCollect}>
          Coletar
        </button>
      </section>
    </div>
  );
}
