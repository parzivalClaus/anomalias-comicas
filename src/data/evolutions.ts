import type { EvolutionRecipe } from '../types/game';

export const evolutionRecipes: EvolutionRecipe[] = [
  {
    inputs: ['nebulo', 'nebulo'],
    result: 'nebulume',
  },
  {
    inputs: ['nebulume', 'nebulume'],
    result: 'nebulux',
  },
  {
    inputs: ['nebulux', 'nebulux'],
    result: 'umbrelume',
    conditions: [{ type: 'portal_influence' }],
    blockedMessage: 'A ressonância parece incompleta...',
  },
];
