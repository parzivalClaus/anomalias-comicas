import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { gameConfig } from '../data/gameConfig';
import type { GameState } from '../types/game';
import { createVersionedSave } from './saveMigration';
import { loadLocalSave, saveVersionedLocal } from './localSave';
import { loadCloudSave, saveCloud } from './cloudSave';
import { chooseLastWrittenSave } from './saveSelection';

export type SyncStatus = 'local-only' | 'synced' | 'pending' | 'offline' | 'error';

interface UseCloudSyncOptions {
  user: User | null;
  state: GameState;
  onApplyState: (state: GameState, message?: string) => void;
}

export function useCloudSync({ user, state, onApplyState }: UseCloudSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local-only');
  const hasCheckedCloudRef = useRef(false);
  const lastSyncedStateRef = useRef<GameState | null>(null);
  const latestStateRef = useRef(state);
  const dirtyRef = useRef(false);
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
    if (!user) {
      setSyncStatus('local-only');
      hasCheckedCloudRef.current = false;
      lastSyncedStateRef.current = null;
      clearPendingIndicator();
      return;
    }

    let cancelled = false;
    const userId = user.id;

    async function reconcileOnLogin() {
      setPendingStatus();

      try {
        const local = loadLocalSave() ?? createVersionedSave(state);
        const cloud = await loadCloudSave(userId);
        if (cancelled) return;

        if (!cloud) {
          await saveCloud(userId, local.state);
          lastSyncedStateRef.current = local.state;
          clearPendingIndicator();
          setSyncStatus('synced');
          return;
        }

        const selectedSave = chooseLastWrittenSave(local, cloud);
        const selectedMessage =
          selectedSave === local ? 'Save local mantido.' : 'Save da nuvem carregado.';

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
        hasCheckedCloudRef.current = true;
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
      void saveCloud(userId, latestStateRef.current);
    }

    window.addEventListener('pagehide', syncBeforeUnload);
    return () => window.removeEventListener('pagehide', syncBeforeUnload);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function syncOnOnline() {
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

  return { syncStatus };
}
