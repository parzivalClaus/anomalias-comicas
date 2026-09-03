import { X } from 'lucide-react';
import { creatureDefinitions, dexOrder } from '../data/creatures';
import type { CreatureId } from '../types/game';
import { formatCoins, getPurchasePrice } from '../utils/economy';

interface AnomalyShopProps {
  coins: number;
  discoveredCreatureIds: CreatureId[];
  purchaseCounts: Partial<Record<CreatureId, number>>;
  onBuy: (creatureId: CreatureId) => void;
  onClose: () => void;
}

export function AnomalyShop({
  coins,
  discoveredCreatureIds,
  purchaseCounts,
  onBuy,
  onClose,
}: AnomalyShopProps) {
  const discovered = new Set(discoveredCreatureIds);
  const shopItems = dexOrder.filter(
    (definition) =>
      definition.purchasable &&
      (definition.startsUnlockedInShop || discovered.has(definition.id)),
  );

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
            <h2>Comprar Anomalia</h2>
          </div>
          <button className="iconButton" type="button" onClick={onClose} aria-label="Fechar loja">
            <X size={20} />
          </button>
        </div>

        <div className="shopList">
          {shopItems.map((definition) => {
            const price = getPurchasePrice(definition.id, purchaseCounts);
            const canAfford = coins >= price;

            return (
              <article className="shopItem" key={definition.id}>
                <div className="shopItem__portrait">
                  <img src={definition.image} alt="" />
                </div>
                <div className="shopItem__info">
                  <p>#{definition.dexNumber.toString().padStart(3, '0')}</p>
                  <h3>{definition.name}</h3>
                  <span>+{formatCoins(definition.coinsPerSecond)}/s</span>
                </div>
                <button
                  className="shopItem__buy"
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onBuy(definition.id)}
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
