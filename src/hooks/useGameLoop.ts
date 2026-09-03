import { useEffect } from 'react';
import type React from 'react';
import { gameConfig } from '../data/gameConfig';
import type { GameAction } from '../state/gameStore';

export function useGameLoop(dispatch: React.Dispatch<GameAction>) {
  useEffect(() => {
    const interval = window.setInterval(() => {
      dispatch({ type: 'tick', elapsedSeconds: gameConfig.coinTickMs / 1000 });
    }, gameConfig.coinTickMs);

    return () => window.clearInterval(interval);
  }, [dispatch]);
}
