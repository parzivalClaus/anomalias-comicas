import { supabase } from '../lib/supabase';
import type { GameState, VersionedGameSave } from '../types/game';
import { logSaveDebug } from '../utils/saveDebug';
import { createVersionedSave, migrateSave } from './saveMigration';

interface CloudSaveRow {
  user_id: string;
  save_version: number;
  state: unknown;
  updated_at: string;
}

export async function loadCloudSave(userId: string): Promise<VersionedGameSave | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_saves')
    .select('user_id, save_version, state, updated_at')
    .eq('user_id', userId)
    .maybeSingle<CloudSaveRow>();

  if (error) throw error;
  if (!data) {
    logSaveDebug('CLOUD_SAVE_LOADED', { source: 'none' });
    return null;
  }

  const save = migrateSave({
    saveVersion: data.save_version,
    state: data.state,
    updatedAt: data.updated_at,
    ownerType: 'account',
    ownerUserId: userId,
  });
  logSaveDebug('CLOUD_SAVE_LOADED', { source: save ? 'cloud' : 'none', save });

  return save;
}

export async function saveCloud(userId: string, state: GameState) {
  if (!supabase) return;

  const save = createVersionedSave(
    { ...state, lastSavedAt: Date.now() },
    { ownerType: 'account', ownerUserId: userId },
  );
  logSaveDebug('CLOUD_SYNC_STARTED', { source: 'cloud', save });

  const { error } = await supabase.from('game_saves').upsert({
    user_id: userId,
    save_version: save.saveVersion,
    state: save.state,
    updated_at: save.updatedAt,
  });

  if (error) throw error;
  logSaveDebug('CLOUD_SYNC_FINISHED', { source: 'cloud', save });
}
