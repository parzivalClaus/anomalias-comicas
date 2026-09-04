import cosmicEggImage from '../assets/ui/ovo-cosmico.png';
import { gameConfig } from '../data/gameConfig';
import type { EggState } from '../types/game';

interface CosmicEggProps {
  egg: EggState;
  isDragging?: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

function formatEggTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function CosmicEgg({ egg, isDragging = false, onPointerDown }: CosmicEggProps) {
  const isHatching =
    egg.remainingIncubationSeconds <= gameConfig.cosmicEggHatchingThresholdSeconds;
  const wobbleDelay = -((egg.birthId % 9) * 0.12);

  return (
    <button
      className={`cosmicEgg ${isHatching ? 'cosmicEgg--hatching' : ''} ${
        isDragging ? 'cosmicEgg--dragging' : ''
      }`}
      type="button"
      aria-label="Ovo cósmico incubando"
      onPointerDown={onPointerDown}
      style={{ '--egg-wobble-delay': `${wobbleDelay}s` } as React.CSSProperties}
    >
      <span className="cosmicEgg__shadow" />
      <img className="cosmicEgg__image" src={cosmicEggImage} alt="" draggable="false" />
      <span className="cosmicEgg__timer">{formatEggTime(egg.remainingIncubationSeconds)}</span>
    </button>
  );
}
