import { Sparkles } from 'lucide-react';

interface BuyCreatureButtonProps {
  disabled: boolean;
  onOpenShop: () => void;
}

export function BuyCreatureButton({ disabled, onOpenShop }: BuyCreatureButtonProps) {
  return (
    <button className="buyButton" type="button" disabled={disabled} onClick={onOpenShop}>
      <Sparkles size={18} aria-hidden="true" />
      <span>Comprar Anomalia</span>
    </button>
  );
}
