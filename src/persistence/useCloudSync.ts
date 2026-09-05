import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { gameConfig } from '../data/gameConfig';
import type { GameState } from '../types/game';
import { createVersionedSave } from './saveMigration';
import { loadLocalSave, saveVersionedLocal } from './localSave';
import { loadCloudSave, saveCloud } from './cloudSave';
import { chooseLastWrittenSave } from './saveSelection';
import { logSaveDebug } from '../utils/saveDebug';

export type SyncStatus = 'local-only' | 'synced' | 'pending' | 'offline' | 'error';

interface UseCloudSyncOptions {
  user: User | null;
  state: GameState;
  canSyncState?: boolean;
  onApplyState: (state: GameState, message?: string) => void;
}

export function useCloudSync({ user, state, canSyncState = true, onApplyState }: UseCloudSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local-only');
  const [hasResolvedInitialSync, setHasResolvedInitialSync] = useState(false);
  const hasCheckedCloudRef = useRef(false);
  const lastSyncedStateRef = useRef<GameState | null>(null);
  const latestStateRef = useRef(state);
  const canSyncStateRef = useRef(canSyncState);
  const dirtyRef = useRef(false);
  const hydrationGenerationRef = useRef(0);
  const pendingIndicatorTimeoutRef = useRef<number | null>(null);

  function setPendingStatus() {
    if (pendingIndicatorTimeoutRef.current !== null) return;

    pendingIndicatorTimeoutRef.current = window.setTimeout(() => {
      setSyncStatus(navigator.onLine ? 'pending' : 'offline');
      pendingIndicatorTimeoutRef.current = null;
    }, gameConfig.syncPendingIndicatorDelayMs);
  }

  function clearPendingIndicator() {
    if (pendingIndicatorTimeoutRef.current === null) return;

    window.clearTimeout(pendingIndicatorTimeoutRef.current);
    pendingIndicatorTimeoutRef.current = null;
  }

  useEffect(() => {
    latestStateRef.current = state;
    dirtyRef.current = true;
  }, [state]);

  useEffect(() => {
    canSyncStateRef.current = canSyncState;
  }, [canSyncState]);

  useEffect(() => {
    hydrationGenerationRef.current += 1;

    if (!user) {
      setSyncStatus('local-only');
      setHasResolvedInitialSync(true);
      hasCheckedCloudRef.current = false;
      lastSyncedStateRef.current = null;
      clearPendingIndicator();
      return;
    }

    let cancelled = false;
    const userId = user.id;
    const hydrationGeneration = hydrationGenerationRef.current;
    setHasResolvedInitialSync(false);

    async function reconcileOnLogin() {
      setPendingStatus();

      try {
        const initialLocal = loadLocalSave() ?? createVersionedSave(latestStateRef.current);
        const cloud = await loadCloudSave(userId);
        if (cancelled || hydrationGeneration !== hydrationGenerationRef.current) return;

        const latestLocal = loadLocalSave() ?? createVersionedSave(latestStateRef.current);
        const local = latestLocal.updatedAt >= initialLocal.updatedAt ? latestLocal : initialLocal;

        if (!cloud) {
          logSaveDebug('SAVE_WINNER_SELECTED', {
            source: 'local',
            save: local,
            extra: {
              localUpdatedAt: local.updatedAt,
              cloudUpdatedAt: null,
            },
          });
          await saveCloud(userId, local.state);
          lastSyncedStateRef.current = local.state;
          dirtyRef.current = false;
          clearPendingIndicator();
          setSyncStatus('synced');
          return;
        }

        const selectedSave = chooseLastWrittenSave(local, cloud);
        const selectedMessage =
          selectedSave === local ? 'Save local mantido.' : 'Save da nuvem carregado.';
        logSaveDebug('SAVE_WINNER_SELECTED', {
          source: selectedSave === local ? 'local' : 'cloud',
          save: selectedSave,
          extra: {
            localUpdatedAt: local.updatedAt,
            cloudUpdatedAt: cloud.updatedAt,
          },
        });

        saveVersionedLocal(selectedSave);
        onApplyState(selectedSave.state, selectedMessage);
        await saveCloud(userId, selectedSave.state);
        lastSyncedStateRef.current = selectedSave.state;
        dirtyRef.current = false;
        clearPendingIndicator();
        setSyncStatus('synced');
      } catch {
        clearPendingIndicator();
        if (!cancelled) setSyncStatus(navigator.onLine ? 'error' : 'offline');
      } finally {
        if (!cancelled && hydrationGeneration === hydrationGenerationRef.current) {
          hasCheckedCloudRef.current = true;
          setHasResolvedInitialSync(true);
        }
      }
    }

    if (!hasCheckedCloudRef.current) {
      reconcileOnLogin();
    }

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const userId = user.id;
    const interval = window.setInterval(async () => {
      if (!canSyncStateRef.current) return;
      if (!dirtyRef.current) return;

      try {
        setPendingStatus();
        await saveCloud(userId, latestStateRef.current);
        lastSyncedStateRef.current = latestStateRef.current;
        dirtyRef.current = false;
        clearPendingIndicator();
        setSyncStatus('synced');
      } catch {
        clearPendingIndicator();
        setSyncStatus(navigator.onLine ? 'error' : 'offline');
      }
    }, gameConfig.cloudSyncMs);

    return () => window.clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    function syncBeforeUnload() {
      if (!canSyncStateRef.current) return;
      void saveCloud(userId, latestStateRef.current);
    }

    window.addEventListener('pagehide', syncBeforeUnload);
    return () => window.removeEventListener('pagehide', syncBeforeUnload);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function syncOnOnline() {
      if (!canSyncStateRef.current) return;

      try {
        setPendingStatus();
        await saveCloud(userId, latestStateRef.current);
        lastSyncedStateRef.current = latestStateRef.current;
        dirtyRef.current = false;
        clearPendingIndicator();
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
      }
    }

    window.addEventListener('online', syncOnOnline);
    return () => window.removeEventListener('online', syncOnOnline);
  }, [user?.id]);

  return {
    syncStatus,
    hasResolvedInitialSync: user
      ? hasResolvedInitialSync && hasCheckedCloudRef.current
      : hasResolvedInitialSync,
  };
}
