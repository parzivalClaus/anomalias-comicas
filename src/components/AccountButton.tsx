import { Cloud, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { signInWithGoogle, signOut } from '../auth/authService';
import { useAuth } from '../auth/AuthProvider';
import type { SyncStatus } from '../persistence/useCloudSync';

interface AccountButtonProps {
  syncStatus: SyncStatus;
}

function getSyncLabel(syncStatus: SyncStatus) {
  if (syncStatus === 'synced') return 'Sincronizado';
  if (syncStatus === 'pending') return 'Salvando...';
  if (syncStatus === 'offline') return 'Offline';
  if (syncStatus === 'error') return 'Pendente';
  return 'Local';
}

export function AccountButton({ syncStatus }: AccountButtonProps) {
  const { user, isConfigured, isLoading } = useAuth();
  const [showSyncedStatus, setShowSyncedStatus] = useState(false);

  useEffect(() => {
    if (syncStatus !== 'synced') {
      setShowSyncedStatus(true);
      return;
    }

    setShowSyncedStatus(true);
    const timeout = window.setTimeout(() => setShowSyncedStatus(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [syncStatus]);

  if (!isConfigured) {
    return (
      <button className="accountButton" type="button" disabled>
        <Cloud size={14} aria-hidden="true" />
        <span>Local</span>
      </button>
    );
  }

  if (user) {
    if (syncStatus === 'synced' && !showSyncedStatus) {
      return (
        <button
          className="accountButton accountButton--compact"
          type="button"
          title="Sair da conta"
          aria-label="Sair da conta"
          onClick={signOut}
        >
          <LogOut size={14} aria-hidden="true" />
        </button>
      );
    }

    return (
      <button className="accountButton" type="button" onClick={signOut}>
        <LogOut size={14} aria-hidden="true" />
        <span>{getSyncLabel(syncStatus)}</span>
      </button>
    );
  }

  return (
    <button className="accountButton" type="button" disabled={isLoading} onClick={signInWithGoogle}>
      <Cloud size={14} aria-hidden="true" />
      <span>{isLoading ? '...' : 'Salvar progresso'}</span>
    </button>
  );
}
