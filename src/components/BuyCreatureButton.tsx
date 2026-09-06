import { Sparkles } from 'lucide-react';

interface BuyCreatureButtonProps {
  disabled: boolean;
  isHighlighted?: boolean;
  onBuy: () => void;
}

export function BuyCreatureButton({ disabled, isHighlighted = false, onBuy }: BuyCreatureButtonProps) {
  return (
    <button
      className={`buyButton ${isHighlighted ? 'buyButton--tutorialHint' : ''}`}
      type="button"
      disabled={disabled}
      onClick={onBuy}
    >
      <Sparkles size={18} aria-hidden="true" />
      <span>Loja de Ovos</span>
    </button>
  );
}
