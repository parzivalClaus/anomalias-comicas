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
    result: 'neburix',
  },
  {
    inputs: ['neburix', 'neburix'],
    result: 'gravulon',
  },
  {
    inputs: ['gravulon', 'gravulon'],
    result: 'singulume',
  },
  {
    inputs: ['singulume', 'singulume'],
    result: 'astralume',
  },
  {
    inputs: ['astralume', 'astralume'],
    result: 'cosmoryx',
  },
  {
    inputs: ['cosmoryx', 'cosmoryx'],
    result: 'nexoryx',
  },
  {
    inputs: ['nexoryx', 'nexoryx'],
    result: 'translume',
  },
];
