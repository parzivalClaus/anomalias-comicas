import { Sparkles } from 'lucide-react';
import { creatureDefinitions } from '../data/creatures';
import type { CreatureId } from '../types/game';

interface DiscoveryModalProps {
  creatureId: CreatureId;
  onClose: () => void;
}

export function DiscoveryModal({ creatureId, onClose }: DiscoveryModalProps) {
  const creature = creatureDefinitions[creatureId];

  return (
    <div className="modalBackdrop" role="presentation">
      <section className="modal discovery" role="dialog" aria-modal="true" aria-label="Nova anomalia">
        <p className="modal__eyebrow">Nova anomalia descoberta</p>
        <img
          className="discovery__image"
          src={creature.image}
          alt=""
          decoding="async"
          onError={(event) => event.currentTarget.classList.add('is-missing')}
        />
        <h2>#{creature.dexNumber.toString().padStart(3, '0')} {creature.name}</h2>
        <p>{creature.description}</p>
        <button className="primaryButton" type="button" onClick={onClose}>
          <Sparkles size={18} aria-hidden="true" />
          Catalogar
        </button>
      </section>
    </div>
  );
}
