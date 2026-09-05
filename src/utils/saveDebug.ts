import { createVersionedSave } from '../persistence/saveMigration';
import type { GameState, VersionedGameSave } from '../types/game';

type SaveDebugEvent =
  | 'LOCAL_SAVE_LOADED'
  | 'CLOUD_SAVE_LOADED'
  | 'SAVE_WINNER_SELECTED'
  | 'OFFLINE_REWARD_CALCULATED'
  | 'OFFLINE_REWARD_COLLECTED'
  | 'LOCAL_SAVE_WRITTEN'
  | 'CLOUD_SYNC_STARTED'
  | 'CLOUD_SYNC_FINISHED';

interface SaveDebugPayload {
  source: 'local' | 'cloud' | 'memory' | 'none';
  state?: GameState | null;
  save?: VersionedGameSave | null;
  coins?: number;
  extra?: Record<string, unknown>;
}

export function logSaveDebug(event: SaveDebugEvent, payload: SaveDebugPayload) {
  const save = payload.save ?? (payload.state ? createVersionedSave(payload.state) : null);
  const state = payload.state ?? save?.state ?? null;

  console.debug(`[save-debug] ${event}`, {
    coins: payload.coins ?? state?.coins ?? null,
    updatedAt: save?.updatedAt ?? null,
    lastSeenAt: state?.lastSavedAt ?? null,
    source: payload.source,
    ownerType: save?.ownerType ?? null,
    ownerUserId: save?.ownerUserId ?? null,
    ...payload.extra,
  });
}
