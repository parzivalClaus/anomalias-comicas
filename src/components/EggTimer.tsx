interface EggTimerProps {
  remainingSeconds: number;
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function EggTimer({ remainingSeconds }: EggTimerProps) {
  return (
    <div className="eggTimer" aria-label={`Novo ovo cosmico em ${formatTimer(remainingSeconds)}`}>
      <span aria-hidden="true">Novo ovo em</span>
      <strong>{formatTimer(remainingSeconds)}</strong>
    </div>
  );
}
