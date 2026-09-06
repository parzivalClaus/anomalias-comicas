import cosmicEggImage from '../assets/ui/ovo-cosmico.png';
import type { EggState } from '../types/game';

interface CosmicEggProps {
  egg: EggState;
  isDragging?: boolean;
  isOpening?: boolean;
  isHighlighted?: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

export function CosmicEgg({
  egg,
  isDragging = false,
  isOpening = false,
  isHighlighted = false,
  onPointerDown,
}: CosmicEggProps) {
  const wobbleDelay = -((egg.birthId % 9) * 0.12);

  return (
    <button
      className={`cosmicEgg cosmicEgg--ready ${isOpening ? 'cosmicEgg--opening' : ''} ${
        isHighlighted && !isOpening ? 'cosmicEgg--tutorialHint' : ''
      } ${
        isDragging ? 'cosmicEgg--dragging' : ''
      }`}
      type="button"
      aria-label="Ovo cósmico pronto para abrir"
      onPointerDown={onPointerDown}
      style={{ '--egg-wobble-delay': `${wobbleDelay}s` } as React.CSSProperties}
    >
      <span className="cosmicEgg__shadow" />
      <img
        className="cosmicEgg__image"
        src={cosmicEggImage}
        alt=""
        draggable="false"
        decoding="async"
        onError={(event) => event.currentTarget.classList.add('is-missing')}
      />
    </button>
  );
}
