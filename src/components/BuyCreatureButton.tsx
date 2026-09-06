import { Sparkles } from 'lucide-react';

interface BuyCreatureButtonProps {
  isHighlighted?: boolean;
  onBuy: () => void;
}

export function BuyCreatureButton({ isHighlighted = false, onBuy }: BuyCreatureButtonProps) {
  return (
    <button
      className={`buyButton ${isHighlighted ? 'buyButton--tutorialHint' : ''}`}
      type="button"
      onClick={onBuy}
    >
      <Sparkles size={18} aria-hidden="true" />
      <span>Loja de Ovos</span>
    </button>
  );
}
