import type { VersionedGameSave } from '../types/game';

function getSaveTimestamp(save: VersionedGameSave) {
  const updatedAtTimestamp = Date.parse(save.updatedAt);

  if (Number.isFinite(updatedAtTimestamp)) {
    return updatedAtTimestamp;
  }

  return save.state.lastSavedAt;
}

export function chooseLastWrittenSave(localSave: VersionedGameSave, cloudSave: VersionedGameSave) {
  const localTimestamp = getSaveTimestamp(localSave);
  const cloudTimestamp = getSaveTimestamp(cloudSave);

  if (localTimestamp === cloudTimestamp) {
    return localSave;
  }

  return localTimestamp > cloudTimestamp ? localSave : cloudSave;
}
