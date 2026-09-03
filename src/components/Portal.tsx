export function Portal() {
  return (
    <section className="scene" aria-label="Cenário">
      <div className="scene__stars" />
      <div className="portal" aria-hidden="true">
        <div className="portal__arch" />
        <div className="portal__void" />
        <div className="portal__base" />
      </div>
      <div className="ruins ruins--left" />
      <div className="ruins ruins--right" />
    </section>
  );
}
