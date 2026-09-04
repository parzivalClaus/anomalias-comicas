import { Sparkles } from 'lucide-react';

interface BuyCreatureButtonProps {
  disabled: boolean;
  price: string;
  onBuy: () => void;
}

export function BuyCreatureButton({ disabled, price, onBuy }: BuyCreatureButtonProps) {
  return (
    <button className="buyButton" type="button" disabled={disabled} onClick={onBuy}>
      <Sparkles size={18} aria-hidden="true" />
      <span>
        Comprar Ovo <strong>{price}</strong>
      </span>
    </button>
  );
}
