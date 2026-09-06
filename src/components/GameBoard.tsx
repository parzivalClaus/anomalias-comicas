import type React from "react";
import type { DragState } from "../state/gameStore";
import type { CreatureInstance, EggState } from "../types/game";
import { CosmicEgg } from "./CosmicEgg";
import { Creature } from "./Creature";

interface GameBoardProps {
  creatures: CreatureInstance[];
  eggs: EggState[];
  dragState: DragState;
  dragWorldPosition: { x: number; y: number } | null;
  collectionBursts: Record<string, { id: number; amount: number }>;
  openingEggIds: string[];
  highlightedEggIds?: string[];
  mergeHintInstanceIds: string[];
  environmentalHintInstanceIds: string[];
  mergeGestureHint?: { sourceX: number; sourceY: number; targetX: number; targetY: number } | null;
  onCreaturePointerDown: (
    creature: CreatureInstance,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onEggPointerDown: (egg: EggState, event: React.PointerEvent<HTMLButtonElement>) => void;
}

export function GameBoard({
  creatures,
  eggs,
  dragState,
  dragWorldPosition,
  collectionBursts,
  openingEggIds,
  highlightedEggIds = [],
  mergeHintInstanceIds,
  environmentalHintInstanceIds,
  mergeGestureHint,
  onCreaturePointerDown,
  onEggPointerDown,
}: GameBoardProps) {
  return (
    <section className="worldField" data-world-field aria-label="Campo de anomalias">
      {creatures.map((creature) => (
        (() => {
          const isDragging =
            dragState?.kind === 'creature' && dragState.instanceId === creature.instanceId;
          const renderX = isDragging && dragWorldPosition ? dragWorldPosition.x : creature.x;
          const renderY = isDragging && dragWorldPosition ? dragWorldPosition.y : creature.y;

          return (
        <div
          className={`worldEntity worldEntity--creature ${isDragging ? 'worldEntity--dragging' : ''}`}
          key={creature.instanceId}
          style={
            {
              '--entity-x': `${renderX * 100}%`,
              '--entity-y': `${renderY * 100}%`,
            } as React.CSSProperties
          }
        >
          <Creature
            creature={creature}
            isDragging={isDragging}
            collectionBurst={collectionBursts[creature.instanceId] ?? null}
            hasMergeHint={mergeHintInstanceIds.includes(creature.instanceId)}
            hasEnvironmentalHint={environmentalHintInstanceIds.includes(creature.instanceId)}
            onPointerDown={(event) => onCreaturePointerDown(creature, event)}
          />
        </div>
          );
        })()
      ))}
      {eggs.map((egg) => (
        (() => {
          const isDragging = dragState?.kind === 'egg' && dragState.instanceId === egg.eggId;
          const renderX = isDragging && dragWorldPosition ? dragWorldPosition.x : egg.x;
          const renderY = isDragging && dragWorldPosition ? dragWorldPosition.y : egg.y;

          return (
        <div
          className={`worldEntity worldEntity--egg ${isDragging ? 'worldEntity--dragging' : ''}`}
          key={egg.eggId}
          style={
            {
              '--entity-x': `${renderX * 100}%`,
              '--entity-y': `${renderY * 100}%`,
            } as React.CSSProperties
          }
        >
          <CosmicEgg
            egg={egg}
            isDragging={isDragging}
            isOpening={openingEggIds.includes(egg.eggId)}
            isHighlighted={highlightedEggIds.includes(egg.eggId)}
            onPointerDown={(event) => onEggPointerDown(egg, event)}
          />
        </div>
          );
        })()
      ))}
      {mergeGestureHint ? (
        <div
          className="mergeGestureHint"
          style={
            {
              '--hint-from-x': `${mergeGestureHint.sourceX * 100}%`,
              '--hint-from-y': `${mergeGestureHint.sourceY * 100}%`,
              '--hint-to-x': `${mergeGestureHint.targetX * 100}%`,
              '--hint-to-y': `${mergeGestureHint.targetY * 100}%`,
            } as React.CSSProperties
          }
          aria-hidden="true"
        >
          <span />
        </div>
      ) : null}
    </section>
  );
}
