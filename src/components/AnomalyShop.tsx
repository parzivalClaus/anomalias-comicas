import { Lock, X } from 'lucide-react';
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
  const options = getStoreCreatureOptions(state);

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
          {options.map(({ definition, isUnlocked, price, purchaseCount, requiredTier }) => {
            const canBuy = isUnlocked && !isFull && coins >= price;

            return (
              <article
                className={[
                  'shopItem',
                  !isUnlocked ? 'shopItem--locked' : '',
                  tutorialCreatureId === definition.id ? 'shopItem--tutorialHint' : '',
                ].join(' ')}
                key={definition.id}
              >
                <div className="shopItem__portrait">
                  <img src={definition.image} alt="" />
                  <img className="shopItem__egg" src={cosmicEggImage} alt="" />
                </div>
                <div className="shopItem__info">
                  <p>{isUnlocked ? `Comprados: ${purchaseCount}` : `Descubra T${requiredTier}`}</p>
                  <h3>{definition.name}</h3>
                  <span>{isUnlocked ? 'Nasce ao abrir um Ovo Cósmico' : 'Bloqueado na loja'}</span>
                </div>
                <button
                  className="shopItem__buy"
                  type="button"
                  disabled={!canBuy}
                  onClick={() => onBuyCreatureEgg(definition.id)}
                >
                  {isUnlocked ? (
                    <span>{formatCoins(price)}</span>
                  ) : (
                    <span>
                      <Lock size={14} aria-hidden="true" />
                    </span>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
