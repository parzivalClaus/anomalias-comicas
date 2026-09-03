import { Sparkles } from 'lucide-react';
import { creatureDefinitions } from '../data/creatures';
import { formatCoins } from '../utils/economy';

interface BuyCreatureButtonProps {
  disabled: boolean;
  onBuy: () => void;
}

export function BuyCreatureButton({ disabled, onBuy }: BuyCreatureButtonProps) {
  const nebulo = creatureDefinitions.nebulo;

  return (
    <button className="buyButton" type="button" disabled={disabled} onClick={onBuy}>
      <Sparkles size={18} aria-hidden="true" />
      <span>Comprar {nebulo.name}</span>
      <strong>{formatCoins(nebulo.purchaseCost ?? 0)}</strong>
    </button>
  );
}
