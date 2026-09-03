import { Coins } from 'lucide-react';
import { formatCoins } from '../utils/economy';

interface CoinHudProps {
  coins: number;
  productionPerSecond: number;
}

export function CoinHud({ coins, productionPerSecond }: CoinHudProps) {
  return (
    <header className="coinHud" aria-label="Moedas e produção">
      <div className="coinHud__amount">
        <Coins size={22} aria-hidden="true" />
        <span>{formatCoins(coins)}</span>
      </div>
      <div className="coinHud__rate">+{formatCoins(productionPerSecond)}/s</div>
    </header>
  );
}
