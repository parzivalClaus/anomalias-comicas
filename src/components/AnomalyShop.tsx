import { X } from 'lucide-react';
import cosmicEggImage from '../assets/ui/ovo-cosmico.png';
import { gameConfig } from '../data/gameConfig';
import { formatCoins, getEggPurchasePrice } from '../utils/economy';
import type { GameState } from '../types/game';

interface AnomalyShopProps {
  coins: number;
  state: GameState;
  onBuyEgg: () => void;
  onClose: () => void;
}

export function AnomalyShop({
  coins,
  state,
  onBuyEgg,
  onClose,
}: AnomalyShopProps) {
  const price = getEggPurchasePrice(state);
  const canAfford = coins >= price;

  return (
    <div className="shopBackdrop" role="presentation" onClick={onClose}>
      <section
        className="shopSheet"
        role="dialog"
        aria-modal="true"
        aria-label="Loja de Anomalias"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shopSheet__handle" aria-hidden="true" />
        <div className="shopSheet__header">
          <div>
            <p className="modal__eyebrow">Loja de Anomalias</p>
            <h2>Comprar Ovo</h2>
          </div>
          <button className="iconButton" type="button" onClick={onClose} aria-label="Fechar loja">
            <X size={20} />
          </button>
        </div>

        <div className="shopList">
          <article className="shopItem">
            <div className="shopItem__portrait shopItem__portrait--egg">
              <img src={cosmicEggImage} alt="" />
            </div>
            <div className="shopItem__info">
              <p>Incubação {gameConfig.cosmicEggIncubationSeconds}s</p>
              <h3>Ovo Cósmico</h3>
              <span>Gera anomalia-base</span>
            </div>
            <button
              className="shopItem__buy"
              type="button"
              disabled={!canAfford}
              onClick={onBuyEgg}
            >
              <span>{formatCoins(price)}</span>
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}
