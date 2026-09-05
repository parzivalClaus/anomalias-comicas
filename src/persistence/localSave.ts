import { gameConfig } from '../data/gameConfig';
import type { GameState, VersionedGameSave } from '../types/game';
import { logSaveDebug } from '../utils/saveDebug';
import { createVersionedSave, migrateSave } from './saveMigration';

export function loadLocalSave(): VersionedGameSave | null {
  const saved = localStorage.getItem(gameConfig.saveKey);
  if (!saved) {
    logSaveDebug('LOCAL_SAVE_LOADED', { source: 'none' });
    return null;
  }

  try {
    const save = migrateSave(JSON.parse(saved));
    logSaveDebug('LOCAL_SAVE_LOADED', { source: save ? 'local' : 'none', save });
    return save;
  } catch {
    logSaveDebug('LOCAL_SAVE_LOADED', { source: 'none' });
    return null;
  }
}

export function saveLocal(state: GameState) {
  const save = createVersionedSave({ ...state, lastSavedAt: Date.now() });
  localStorage.setItem(gameConfig.saveKey, JSON.stringify(save));
  logSaveDebug('LOCAL_SAVE_WRITTEN', { source: 'local', save });
  return save;
}

export function saveVersionedLocal(save: VersionedGameSave) {
  localStorage.setItem(gameConfig.saveKey, JSON.stringify(save));
  logSaveDebug('LOCAL_SAVE_WRITTEN', { source: 'local', save });
}

export function clearLocalSave() {
  localStorage.removeItem(gameConfig.saveKey);
}
