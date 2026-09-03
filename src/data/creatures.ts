import nebuloImage from '../assets/creatures/nebulo.png';
import nebuluxImage from '../assets/creatures/nebulux.png';
import nebulumeImage from '../assets/creatures/nebulume.png';
import umbrelumeImage from '../assets/creatures/umbrelume.png';
import type { CreatureDefinition, CreatureId } from '../types/game';

export const creatureDefinitions: Record<CreatureId, CreatureDefinition> = {
  nebulo: {
    id: 'nebulo',
    dexNumber: 1,
    name: 'Nébulo',
    tier: 1,
    image: nebuloImage,
    coinsPerSecond: 1,
    purchaseCost: 25,
    description:
      'Uma pequena anomalia gelatinosa que parece reagir ao ambiente ao seu redor. Ninguém sabe de onde vieram os primeiros Nébulos.',
    idleAnimation: 'breathe',
    effect: 'bubbles',
  },
  nebulume: {
    id: 'nebulume',
    dexNumber: 2,
    name: 'Nebulume',
    tier: 2,
    image: nebulumeImage,
    coinsPerSecond: 3,
    description:
      'Quando dois Nébulos entram em ressonância, suas estruturas se fundem em uma anomalia maior. O processo libera uma quantidade incomum de energia.',
    undiscoveredHint: 'Ressonâncias mais intensas parecem ocorrer entre anomalias semelhantes.',
    idleAnimation: 'breathe',
    effect: 'bubbles',
  },
  nebulux: {
    id: 'nebulux',
    dexNumber: 3,
    name: 'Nebulux',
    tier: 3,
    image: nebuluxImage,
    coinsPerSecond: 8,
    description:
      'A energia acumulada em seu núcleo já não parece inteiramente natural. Próximo a certas estruturas, o Nebulux apresenta oscilações que ainda não conseguimos explicar.',
    undiscoveredHint: 'Ressonâncias mais intensas parecem ocorrer entre anomalias semelhantes.',
    idleAnimation: 'breathe',
    effect: 'bubbles',
  },
  umbrelume: {
    id: 'umbrelume',
    dexNumber: 4,
    name: 'Umbrelume',
    tier: 4,
    image: umbrelumeImage,
    coinsPerSecond: 20,
    description:
      'Duas anomalias entraram em ressonância com a estrutura adormecida. Por alguns instantes, algo do outro lado pareceu responder.',
    undiscoveredHint:
      'Registros indicam uma ressonância incomum nas proximidades da estrutura adormecida.',
    idleAnimation: 'breathe',
    effect: 'bubbles',
  },
};

export const dexOrder = Object.values(creatureDefinitions).sort(
  (a, b) => a.dexNumber - b.dexNumber,
);
