import { Cloud, LogOut } from 'lucide-react';
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

  if (!isConfigured) {
    return (
      <button className="accountButton" type="button" disabled>
        <Cloud size={14} aria-hidden="true" />
        <span>Local</span>
      </button>
    );
  }

  if (user) {
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
