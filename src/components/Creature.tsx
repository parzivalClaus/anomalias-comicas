import { creatureDefinitions } from '../data/creatures';
import type React from 'react';
import type { CreatureInstance } from '../types/game';

interface CreatureProps {
  creature: CreatureInstance;
  isDragging: boolean;
  productionPulseId: number;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

export function Creature({ creature, isDragging, productionPulseId, onPointerDown }: CreatureProps) {
  const definition = creatureDefinitions[creature.creatureId];
  const idleDuration = 2.1 + (creature.birthId % 7) * 0.13;
  const idleDelay = -((creature.birthId % 11) * 0.17);
  const coinPopDelay = (creature.birthId % 8) * 55;

  return (
    <button
      className={`creature creature--${creature.creatureId} ${isDragging ? 'creature--dragging' : ''}`}
      type="button"
      aria-label={`${definition.name}, ${definition.coinsPerSecond} moedas por segundo`}
      onPointerDown={onPointerDown}
      style={
        {
          '--idle-duration': `${idleDuration}s`,
          '--idle-delay': `${idleDelay}s`,
          '--coin-pop-delay': `${coinPopDelay}ms`,
        } as React.CSSProperties
      }
    >
      <span className="creature__shadow" />
      <img className="creature__image" src={definition.image} alt="" draggable="false" />
      {productionPulseId > 0 && definition.coinsPerSecond > 0 ? (
        <span className="creature__coinPop" key={productionPulseId} aria-hidden="true">
          +{definition.coinsPerSecond}
        </span>
      ) : null}
      {definition.effect === 'bubbles' ? (
        <span className="creature__bubbles" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : null}
    </button>
  );
}
