import { Coins } from 'lucide-react';
import type { OfflineReward } from '../types/game';
import { formatCoins } from '../utils/economy';

interface OfflineRewardModalProps {
  reward: OfflineReward;
  onCollect: () => void;
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
        <p>Suas anomalias produziram por {Math.floor(reward.secondsAway / 60)} min.</p>
        <button className="primaryButton" type="button" onClick={onCollect}>
          Coletar
        </button>
      </section>
    </div>
  );
}
