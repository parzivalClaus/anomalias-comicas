import { X } from 'lucide-react';
import cosmicEggImage from '../assets/ui/ovo-cosmico.png';
import type { CreatureId, GameState } from '../types/game';
import { formatCoins, getStoreCreatureOptions } from '../utils/economy';

interface AnomalyShopProps {
  coins: number;
  isFull: boolean;
  state: GameState;
  tutorialCreatureId?: CreatureId | null;
  onBuyCreatureEgg: (creatureId: CreatureId) => void;
  onClose: () => void;
}

export function AnomalyShop({
  coins,
  isFull,
  state,
  tutorialCreatureId = null,
  onBuyCreatureEgg,
  onClose,
}: AnomalyShopProps) {
  const options = getStoreCreatureOptions(state).filter((option) => option.isUnlocked);

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
            <h2>Ovos direcionados</h2>
          </div>
          <button className="iconButton" type="button" onClick={onClose} aria-label="Fechar loja">
            <X size={20} />
          </button>
        </div>

        <div className="shopList">
          {options.map(({ definition, price, purchaseCount }) => {
            const canBuy = !isFull && coins >= price;

            return (
              <article
                className={[
                  'shopItem',
                  tutorialCreatureId === definition.id ? 'shopItem--tutorialHint' : '',
                ].join(' ')}
                key={definition.id}
              >
                <div className="shopItem__portrait">
                  <img src={definition.image} alt="" />
                  <img className="shopItem__egg" src={cosmicEggImage} alt="" />
                </div>
                <div className="shopItem__info">
                  <p>Comprados: {purchaseCount}</p>
                  <h3>{definition.name}</h3>
                  <span>Nasce ao abrir um Ovo Cósmico</span>
                </div>
                <button
                  className="shopItem__buy"
                  type="button"
                  disabled={!canBuy}
                  onClick={() => onBuyCreatureEgg(definition.id)}
                >
                  <span>{formatCoins(price)}</span>
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
