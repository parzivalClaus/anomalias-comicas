import { gameConfig } from "../data/gameConfig";
import type { DragState } from "../state/gameStore";
import type { CreatureInstance } from "../types/game";
import { Creature } from "./Creature";

interface GameBoardProps {
  creatures: CreatureInstance[];
  dragState: DragState;
  onCreaturePointerDown: (
    creature: CreatureInstance,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
}

export function GameBoard({
  creatures,
  dragState,
  onCreaturePointerDown,
}: GameBoardProps) {
  const rowTops = [-2, 17.55, 36.2, 56.25, 77.55, 98.1];
  const colLefts = [0.6, 25.15, 50.1, 75.05];
  const rowSidePadding = [1, 0, -1, -2, -2, -4];
  const slotWidth = 23.9;
  const slotHeight = 15.25;

  const slots = Array.from(
    { length: gameConfig.boardSlots },
    (_, slotIndex) => {
      const creature = creatures.find((item) => item.slotIndex === slotIndex);
      const row = Math.floor(slotIndex / gameConfig.boardColumns);
      const column = slotIndex % gameConfig.boardColumns;
      const sidePadding = rowSidePadding[row] ?? 0;
      const rowWidth = 100 - sidePadding * 2;
      const slotLeft = sidePadding + (colLefts[column] * rowWidth) / 100;
      const adjustedSlotWidth = (slotWidth * rowWidth) / 100;

      return (
        <div
          className={`boardSlot ${creature ? "boardSlot--occupied" : ""}`}
          data-slot-index={slotIndex}
          key={slotIndex}
          style={
            {
              "--slot-left": `${slotLeft}%`,
              "--slot-top": `${rowTops[row]}%`,
              "--slot-width": `${adjustedSlotWidth}%`,
              "--slot-height": `${slotHeight}%`,
            } as React.CSSProperties
          }
        >
          <span className="boardSlot__glow" />
          {creature ? (
            <Creature
              creature={creature}
              isDragging={dragState?.instanceId === creature.instanceId}
              onPointerDown={(event) => onCreaturePointerDown(creature, event)}
            />
          ) : null}
        </div>
      );
    },
  );

  return (
    <section className="boardWrap" aria-label="Tabuleiro 4 por 6">
      <div className="board">{slots}</div>
    </section>
  );
}
