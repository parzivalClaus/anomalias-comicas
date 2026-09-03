import { gameConfig } from '../data/gameConfig';
import type { GameState, VersionedGameSave } from '../types/game';
import { createVersionedSave, migrateSave } from './saveMigration';

export function loadLocalSave(): VersionedGameSave | null {
  const saved = localStorage.getItem(gameConfig.saveKey);
  if (!saved) return null;

  try {
    return migrateSave(JSON.parse(saved));
  } catch {
    return null;
  }
}

export function saveLocal(state: GameState) {
  localStorage.setItem(
    gameConfig.saveKey,
    JSON.stringify(createVersionedSave({ ...state, lastSavedAt: Date.now() })),
  );
}

export function saveVersionedLocal(save: VersionedGameSave) {
  localStorage.setItem(gameConfig.saveKey, JSON.stringify(save));
}

export function clearLocalSave() {
  localStorage.removeItem(gameConfig.saveKey);
}
