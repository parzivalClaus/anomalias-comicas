import { gameConfig } from "../data/gameConfig";
import type { DragState } from "../state/gameStore";
import type { CreatureInstance, EggState } from "../types/game";
import { CosmicEgg } from "./CosmicEgg";
import { Creature } from "./Creature";

interface GameBoardProps {
  creatures: CreatureInstance[];
  eggs: EggState[];
  dragState: DragState;
  collectionBursts: Record<string, { id: number; amount: number }>;
  mergeHintInstanceIds: string[];
  environmentalHintInstanceIds: string[];
  mergeGestureHint?: { sourceSlotIndex: number; targetSlotIndex: number } | null;
  onCreaturePointerDown: (
    creature: CreatureInstance,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onCollectCreature: (instanceId: string) => void;
  onEggPointerDown: (egg: EggState, event: React.PointerEvent<HTMLButtonElement>) => void;
}

export function GameBoard({
  creatures,
  eggs,
  dragState,
  collectionBursts,
  mergeHintInstanceIds,
  environmentalHintInstanceIds,
  mergeGestureHint,
  onCreaturePointerDown,
  onCollectCreature,
  onEggPointerDown,
}: GameBoardProps) {
  const rowTops = [-2, 17.55, 36.2, 56.25, 77.55, 98.1];
  const colLefts = [0.6, 25.15, 50.1, 75.05];
  const rowSidePadding = [1, 0, -1, -2, -2, -4];
  const slotWidth = 23.9;
  const slotHeight = 15.25;

  function getSlotCenter(slotIndex: number) {
    const row = Math.floor(slotIndex / gameConfig.boardColumns);
    const column = slotIndex % gameConfig.boardColumns;
    const sidePadding = rowSidePadding[row] ?? 0;
    const rowWidth = 100 - sidePadding * 2;
    const slotLeft = sidePadding + (colLefts[column] * rowWidth) / 100;
    const adjustedSlotWidth = (slotWidth * rowWidth) / 100;

    return {
      x: slotLeft + adjustedSlotWidth / 2,
      y: rowTops[row] + slotHeight / 2,
    };
  }

  const slots = Array.from(
    { length: gameConfig.boardSlots },
    (_, slotIndex) => {
      const creature = creatures.find((item) => item.slotIndex === slotIndex);
      const egg = eggs.find((item) => item.slotIndex === slotIndex);
      const row = Math.floor(slotIndex / gameConfig.boardColumns);
      const column = slotIndex % gameConfig.boardColumns;
      const sidePadding = rowSidePadding[row] ?? 0;
      const rowWidth = 100 - sidePadding * 2;
      const slotLeft = sidePadding + (colLefts[column] * rowWidth) / 100;
      const adjustedSlotWidth = (slotWidth * rowWidth) / 100;

      return (
        <div
          className={`boardSlot ${creature || egg ? "boardSlot--occupied" : ""}`}
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
              isDragging={
                dragState?.kind === 'creature' && dragState.instanceId === creature.instanceId
              }
              collectionBurst={collectionBursts[creature.instanceId] ?? null}
              hasMergeHint={mergeHintInstanceIds.includes(creature.instanceId)}
              hasEnvironmentalHint={environmentalHintInstanceIds.includes(creature.instanceId)}
              onPointerDown={(event) => onCreaturePointerDown(creature, event)}
              onCollect={() => onCollectCreature(creature.instanceId)}
            />
          ) : null}
          {egg ? (
            <CosmicEgg
              egg={egg}
              isDragging={dragState?.kind === 'egg' && dragState.instanceId === egg.eggId}
              onPointerDown={(event) => onEggPointerDown(egg, event)}
            />
          ) : null}
        </div>
      );
    },
  );

  return (
    <section className="boardWrap" aria-label="Tabuleiro 4 por 6">
      <div className="board">
        {slots}
        {mergeGestureHint ? (
          <div
            className="mergeGestureHint"
            style={
              {
                '--hint-from-x': `${getSlotCenter(mergeGestureHint.sourceSlotIndex).x}%`,
                '--hint-from-y': `${getSlotCenter(mergeGestureHint.sourceSlotIndex).y}%`,
                '--hint-to-x': `${getSlotCenter(mergeGestureHint.targetSlotIndex).x}%`,
                '--hint-to-y': `${getSlotCenter(mergeGestureHint.targetSlotIndex).y}%`,
              } as React.CSSProperties
            }
            aria-hidden="true"
          >
            <span />
          </div>
        ) : null}
      </div>
    </section>
  );
}
