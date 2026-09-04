import { creatureDefinitions } from '../data/creatures';
import { gameConfig } from '../data/gameConfig';
import type React from 'react';
import type { CreatureInstance } from '../types/game';
import { formatCoins } from '../utils/economy';

interface CreatureProps {
  creature: CreatureInstance;
  isDragging: boolean;
  collectionBurst: { id: number; amount: number } | null;
  hasMergeHint: boolean;
  hasEnvironmentalHint: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onCollect: () => void;
}

export function Creature({
  creature,
  isDragging,
  collectionBurst,
  hasMergeHint,
  hasEnvironmentalHint,
  onPointerDown,
  onCollect,
}: CreatureProps) {
  const definition = creatureDefinitions[creature.creatureId];
  const idleDuration = 2.1 + (creature.birthId % 7) * 0.13;
  const idleDelay = -((creature.birthId % 11) * 0.17);
  const pendingCoins = Math.floor(creature.pendingCoins ?? 0);
  const maxPendingCoins = definition.coinsPerSecond * gameConfig.coinStorageSeconds;
  const hasReachedCoinCap = maxPendingCoins > 0 && pendingCoins >= maxPendingCoins;

  return (
    <button
      className={[
        'creature',
        `creature--${creature.creatureId}`,
        isDragging ? 'creature--dragging' : '',
        hasMergeHint ? 'creature--mergeHint' : '',
        hasEnvironmentalHint ? 'creature--environmentHint' : '',
      ].join(' ')}
      data-creature-instance-id={creature.instanceId}
      type="button"
      aria-label={`${definition.name}, ${definition.coinsPerSecond} moedas por segundo, ${pendingCoins} moedas acumuladas`}
      onPointerDown={onPointerDown}
      onPointerEnter={onCollect}
      style={
        {
          '--idle-duration': `${idleDuration}s`,
          '--idle-delay': `${idleDelay}s`,
        } as React.CSSProperties
      }
    >
      <span className="creature__shadow" />
      <img className="creature__image" src={definition.image} alt="" draggable="false" />
      {pendingCoins > 0 ? (
        <span
          className={`creature__pendingCoins ${
            hasReachedCoinCap ? 'creature__pendingCoins--capped' : ''
          }`}
          aria-hidden="true"
        >
          {formatCoins(pendingCoins)}
        </span>
      ) : null}
      {collectionBurst ? (
        <span className="creature__coinCollect" key={collectionBurst.id} aria-hidden="true">
          +{formatCoins(collectionBurst.amount)}
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
