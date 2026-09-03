interface EggTimerProps {
  phase: 'manifesting' | 'incubating';
  remainingSeconds: number;
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function EggTimer({ phase, remainingSeconds }: EggTimerProps) {
  const label = phase === 'incubating' ? 'Chocando' : 'Proximo ovo';
  const ariaLabel =
    phase === 'incubating'
      ? `Ovo cosmico chocando em ${formatTimer(remainingSeconds)}`
      : `Proximo ovo cosmico em ${formatTimer(remainingSeconds)}`;

  return (
    <div className="eggTimer" aria-label={ariaLabel}>
      <span aria-hidden="true">{label}</span>
      <strong>{formatTimer(remainingSeconds)}</strong>
    </div>
  );
}
