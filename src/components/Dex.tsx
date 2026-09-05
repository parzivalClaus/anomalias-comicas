import { X } from 'lucide-react';
import { dexOrder } from '../data/creatures';
import type { CreatureId } from '../types/game';

interface DexProps {
  discoveredCreatureIds: CreatureId[];
  onClose: () => void;
}

export function Dex({ discoveredCreatureIds, onClose }: DexProps) {
  const discovered = new Set(discoveredCreatureIds);

  return (
    <div className="modalBackdrop" role="presentation">
      <section className="modal dex" role="dialog" aria-modal="true" aria-label="Dex">
        <div className="modal__header">
          <div>
            <p className="modal__eyebrow">Anomalias descobertas</p>
            <h2>
              {discovered.size} / {dexOrder.length}
            </h2>
          </div>
          <button className="iconButton" type="button" onClick={onClose} aria-label="Fechar Dex">
            <X size={20} />
          </button>
        </div>

        <div className="dex__list">
          {dexOrder.map((definition) => {
            const isDiscovered = discovered.has(definition.id);

            return (
              <article className="dexEntry" key={definition.id}>
                <div className={`dexEntry__portrait ${isDiscovered ? '' : 'is-hidden'}`}>
                  {isDiscovered ? (
                    <img
                      src={definition.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(event) => event.currentTarget.classList.add('is-missing')}
                    />
                  ) : (
                    <span aria-hidden="true" />
                  )}
                </div>
                <div>
                  <p className="dexEntry__number">#{definition.dexNumber.toString().padStart(3, '0')}</p>
                  <h3>{isDiscovered ? definition.name : '???'}</h3>
                  <p>
                    {isDiscovered
                      ? definition.description
                      : (definition.undiscoveredHint ?? 'Anomalia ainda não catalogada.')}
                  </p>
                </div>
                <span className="dexEntry__check">{isDiscovered ? '✓' : ''}</span>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
