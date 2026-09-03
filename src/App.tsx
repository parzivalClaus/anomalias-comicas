import { RotateCcw } from 'lucide-react';
import { useEffect, useReducer, useState } from 'react';
import { AccountButton } from './components/AccountButton';
import { AnomalyShop } from './components/AnomalyShop';
import { BuyCreatureButton } from './components/BuyCreatureButton';
import { CoinHud } from './components/CoinHud';
import { Dex } from './components/Dex';
import { DiscoveryModal } from './components/DiscoveryModal';
import { EggTimer } from './components/EggTimer';
import { GameBoard } from './components/GameBoard';
import { OfflineRewardModal } from './components/OfflineRewardModal';
import { useAuth } from './auth/AuthProvider';
import { creatureDefinitions, dexOrder } from './data/creatures';
import { gameConfig } from './data/gameConfig';
import { useGameLoop } from './hooks/useGameLoop';
import { useAutosave, useInitialGameModel } from './hooks/useGamePersistence';
import { reducer, type DragState } from './state/gameStore';
import type { CreatureInstance } from './types/game';
import { getProductionPerSecond } from './utils/economy';
import { evaluateMerge } from './utils/merge';
import { useCloudSync } from './persistence/useCloudSync';

function App() {
  const initial = useInitialGameModel();
  const [model, dispatch] = useReducer(reducer, initial.model);
  const [dragState, setDragState] = useState<DragState>(null);
  const [isDexOpen, setIsDexOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isPortalReacting, setIsPortalReacting] = useState(false);
  const [visibleDiscoveryId, setVisibleDiscoveryId] = useState(model.latestDiscoveryId);
  const [mergeBurst, setMergeBurst] = useState<{
    id: number;
    x: number;
    y: number;
    isDiscovery: boolean;
  } | null>(null);

  const productionPerSecond = getProductionPerSecond(model.state.creatures);
  const occupiedSlots = model.state.creatures.length + model.state.eggs.length;
  const isBoardFull = occupiedSlots >= gameConfig.boardSlots;
  const nextEggToHatch = model.state.eggs.reduce<number | null>(
    (lowestSeconds, egg) =>
      lowestSeconds === null
        ? egg.remainingIncubationSeconds
        : Math.min(lowestSeconds, egg.remainingIncubationSeconds),
    null,
  );
  const eggTimerPhase = nextEggToHatch === null ? 'manifesting' : 'incubating';
  const eggTimerSeconds = nextEggToHatch ?? model.state.remainingEggSpawnSeconds;
  const { user } = useAuth();
  const { syncStatus } = useCloudSync({
    user,
    state: model.state,
    onApplyState: (state, message) => dispatch({ type: 'replaceState', state, toast: message }),
  });

  useGameLoop(dispatch);
  useAutosave(model.state);

  function handleCreaturePointerDown(
    creature: CreatureInstance,
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    setDragState({
      instanceId: creature.instanceId,
      fromSlotIndex: creature.slotIndex,
      pointerX: event.clientX,
      pointerY: event.clientY,
    });
  }

  function handleDropOnSlot(slotIndex: number, burstPoint?: { x: number; y: number }) {
    if (!dragState) return;

    const dragged = model.state.creatures.find(
      (creature) => creature.instanceId === dragState.instanceId,
    );
    const target = model.state.creatures.find((creature) => creature.slotIndex === slotIndex);
    const targetEgg = model.state.eggs.find((egg) => egg.slotIndex === slotIndex);

    setDragState(null);
    if (!dragged || dragged.slotIndex === slotIndex) return;

    if (!target && !targetEgg) {
      dispatch({ type: 'move', instanceId: dragged.instanceId, toSlotIndex: slotIndex });
      return;
    }

    if (targetEgg) {
      dispatch({ type: 'blockedMerge', message: 'O ovo ainda esta incubando.' });
      return;
    }

    if (!target) return;

    const merge = evaluateMerge(dragged, target);
    if (merge.status === 'success') {
      const isDiscovery = !model.state.discoveredCreatureIds.includes(merge.resultCreatureId);

      if (burstPoint) {
        setMergeBurst({
          id: Date.now(),
          x: burstPoint.x,
          y: burstPoint.y,
          isDiscovery,
        });
      }

      dispatch({
        type: 'merge',
        sourceInstanceId: dragged.instanceId,
        targetInstanceId: target.instanceId,
        resultCreatureId: merge.resultCreatureId,
        targetSlotIndex: slotIndex,
      });
      return;
    }

    if (merge.status === 'blocked') {
      dispatch({ type: 'blockedMerge', message: merge.message });
      return;
    }

    dispatch({
      type: 'swap',
      sourceInstanceId: dragged.instanceId,
      targetInstanceId: target.instanceId,
    });
  }

  useEffect(() => {
    if (!dragState) return;

    function handleWindowPointerMove(event: PointerEvent) {
      setDragState((current) =>
        current
          ? {
              ...current,
              pointerX: event.clientX,
              pointerY: event.clientY,
            }
          : null,
      );
    }

    function handleWindowPointerUp(event: PointerEvent) {
      const slot = document
        .elementsFromPoint(event.clientX, event.clientY)
        .map((element) => element.closest<HTMLElement>('[data-slot-index]'))
        .find(Boolean);

      if (!slot?.dataset.slotIndex) {
        setDragState(null);
        return;
      }

      const slotRect = slot.getBoundingClientRect();

      handleDropOnSlot(Number(slot.dataset.slotIndex), {
        x: slotRect.left + slotRect.width / 2,
        y: slotRect.top + slotRect.height / 2,
      });
    }

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [dragState, model.state.creatures, model.state.eggs]);

  const draggedCreature = dragState
    ? model.state.creatures.find((creature) => creature.instanceId === dragState.instanceId)
    : null;

  useEffect(() => {
    if (model.portalPulseId === 0) return;

    setIsPortalReacting(true);
    const timeout = window.setTimeout(() => setIsPortalReacting(false), 1700);
    return () => window.clearTimeout(timeout);
  }, [model.portalPulseId]);

  useEffect(() => {
    setVisibleDiscoveryId(null);

    if (!model.latestDiscoveryId) return;

    const delay = model.latestDiscoveryId === 'umbrelume' ? 1850 : 850;
    const timeout = window.setTimeout(() => {
      setVisibleDiscoveryId(model.latestDiscoveryId);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [model.latestDiscoveryId]);

  useEffect(() => {
    if (!mergeBurst) return;

    const timeout = window.setTimeout(() => setMergeBurst(null), 1100);
    return () => window.clearTimeout(timeout);
  }, [mergeBurst]);

  useEffect(() => {
    if (isBoardFull) {
      setIsShopOpen(false);
    }
  }, [isBoardFull]);

  useEffect(() => {
    if (!model.toast) return;

    const timeout = window.setTimeout(() => dispatch({ type: 'clearToast' }), 2600);
    return () => window.clearTimeout(timeout);
  }, [model.toast]);

  return (
    <main className="appShell">
      <div className={`gameStage ${isPortalReacting ? 'gameStage--portalPulse' : ''}`}>
        <CoinHud coins={model.state.coins} productionPerSecond={productionPerSecond} />
        <AccountButton syncStatus={syncStatus} />
        <EggTimer phase={eggTimerPhase} remainingSeconds={eggTimerSeconds} />
        <div className="portalHint" aria-hidden="true" />
        <GameBoard
          creatures={model.state.creatures}
          eggs={model.state.eggs}
          dragState={dragState}
          productionPulseId={model.productionPulseId}
          onCreaturePointerDown={handleCreaturePointerDown}
        />

        {model.toast ? <p className="toast" role="status">{model.toast}</p> : null}

        <div className="actionBar">
          <BuyCreatureButton
            disabled={isBoardFull}
            onOpenShop={() => {
              if (!isBoardFull) setIsShopOpen(true);
            }}
          />
        </div>

        <aside className="sideActions" aria-label="Ações">
          <button className="iconTile" type="button" onClick={() => setIsDexOpen(true)}>
            <span className="iconTile__art iconTile__art--dex">
              <img src="/ui/dex.png" alt="" />
            </span>
            <span>Dex</span>
            <small>
              {model.state.discoveredCreatureIds.length} / {dexOrder.length}
            </small>
          </button>
        </aside>

        <button className="resetButton" type="button" onClick={() => setIsResetConfirmOpen(true)}>
          <RotateCcw size={15} aria-hidden="true" />
          Resetar save
        </button>

        {dragState && draggedCreature ? (
          <div
            className="dragPreview"
            style={
              {
                '--drag-x': `${dragState.pointerX}px`,
                '--drag-y': `${dragState.pointerY}px`,
              } as React.CSSProperties
            }
            aria-hidden="true"
          >
            <img src={creatureDefinitions[draggedCreature.creatureId].image} alt="" />
          </div>
        ) : null}

        {mergeBurst ? (
          <div
            className={`mergeBurst ${mergeBurst.isDiscovery ? 'mergeBurst--discovery' : ''}`}
            style={
              {
                '--burst-x': `${mergeBurst.x}px`,
                '--burst-y': `${mergeBurst.y}px`,
              } as React.CSSProperties
            }
            aria-hidden="true"
          >
            <span />
            <i />
            <i />
            <i />
            <i />
          </div>
        ) : null}

      </div>

      {isDexOpen ? (
        <Dex
          discoveredCreatureIds={model.state.discoveredCreatureIds}
          onClose={() => setIsDexOpen(false)}
        />
      ) : null}

      {isShopOpen ? (
        <AnomalyShop
          coins={model.state.coins}
          discoveredCreatureIds={model.state.discoveredCreatureIds}
          purchaseCounts={model.state.purchaseCounts}
          onBuy={(creatureId) => {
            if (isBoardFull) {
              setIsShopOpen(false);
              return;
            }

            dispatch({ type: 'buy', creatureId });
          }}
          onClose={() => setIsShopOpen(false)}
        />
      ) : null}

      {isResetConfirmOpen ? (
        <div className="modalBackdrop" role="presentation">
          <section className="modal resetConfirm" role="dialog" aria-modal="true" aria-labelledby="reset-title">
            <p className="modal__eyebrow">Resetar save</p>
            <h2 id="reset-title">Tudo sera removido</h2>
            <p>
              Essa acao zera moedas, criaturas, Dex, compras e descobertas. Se voce estiver
              conectado, esse reset tambem sera sincronizado na nuvem.
            </p>
            <div className="resetConfirm__actions">
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="dangerButton"
                type="button"
                onClick={() => {
                  setIsResetConfirmOpen(false);
                  setIsDexOpen(false);
                  setIsShopOpen(false);
                  setVisibleDiscoveryId(null);
                  dispatch({ type: 'reset' });
                }}
              >
                Resetar tudo
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {visibleDiscoveryId ? (
        <DiscoveryModal
          creatureId={visibleDiscoveryId}
          onClose={() => {
            setVisibleDiscoveryId(null);
            dispatch({ type: 'dismissDiscovery' });
          }}
        />
      ) : null}

      {initial.offlineReward ? (
        <OfflineRewardModal
          reward={initial.offlineReward}
          onCollect={initial.dismissOfflineReward}
        />
      ) : null}
    </main>
  );
}

export default App;
