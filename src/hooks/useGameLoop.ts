import { useEffect } from 'react';
import type React from 'react';
import { gameConfig } from '../data/gameConfig';
import type { GameAction } from '../state/gameStore';

export function useGameLoop(
  dispatch: React.Dispatch<GameAction>,
  enabled = true,
  pausedCreatureInstanceId?: string | null,
) {
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!enabled) return;
      if (document.visibilityState !== 'visible') return;

      dispatch({
        type: 'tick',
        elapsedSeconds: gameConfig.coinTickMs / 1000,
        pausedCreatureInstanceId,
      });
    }, gameConfig.coinTickMs);

    return () => window.clearInterval(interval);
  }, [dispatch, enabled, pausedCreatureInstanceId]);
}
