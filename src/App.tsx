import { RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import cosmicEggImage from './assets/ui/ovo-cosmico.png';
import { AccountButton } from './components/AccountButton';
// import { AnomalyShop } from './components/AnomalyShop';
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
import type { CreatureInstance, EggState, EnvironmentId } from './types/game';
import {
  formatCoins,
  getEggPurchasePrice,
  getProductionPerSecond,
  getSellValue,
  getTotalProductionPerSecond,
} from './utils/economy';
import { evaluateEnvironmentalTransformation } from './utils/environmentalTransform';
import { findEnvironmentalHint, findMergeTutorialHint } from './utils/hints';
import { evaluateMerge } from './utils/merge';
import { playSoundCue, unlockGameAudio } from './utils/sound';
import { useCloudSync } from './persistence/useCloudSync';

function App() {
  const initial = useInitialGameModel();
  const [model, dispatch] = useReducer(reducer, initial.model);
  const [dragState, setDragState] = useState<DragState>(null);
  const [isDexOpen, setIsDexOpen] = useState(false);
  const [isSellMode, setIsSellMode] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [pendingSale, setPendingSale] = useState<CreatureInstance | null>(null);
  const [pendingSacrifice, setPendingSacrifice] = useState<CreatureInstance | null>(null);
  const [isMapPreviewOpen, setIsMapPreviewOpen] = useState(false);
  const [isPortalReacting, setIsPortalReacting] = useState(false);
  const [lastInteractionAt, setLastInteractionAt] = useState(Date.now());
  const [mergeTutorialPhase, setMergeTutorialPhase] = useState<'idle' | 'pulse' | 'gesture'>(
    'idle',
  );
  const [environmentalHintInstanceIds, setEnvironmentalHintInstanceIds] = useState<string[]>([]);
  const [isEnvironmentReacting, setIsEnvironmentReacting] = useState(false);
  const [visibleDiscoveryId, setVisibleDiscoveryId] = useState(model.latestDiscoveryId);
  const [mergeBurst, setMergeBurst] = useState<{
    id: number;
    x: number;
    y: number;
    isDiscovery: boolean;
  } | null>(null);
  const [collectionBursts, setCollectionBursts] = useState<
    Record<string, { id: number; amount: number }>
  >({});
  const recentlyCollectedCreatureIds = useRef(new Set<string>());

  const creatureProductionPerSecond = getProductionPerSecond(model.state.creatures);
  const productionPerSecond = getTotalProductionPerSecond(model.state);
  const occupiedSlots = model.state.creatures.length + model.state.eggs.length;
  const isBoardFull = occupiedSlots >= gameConfig.boardSlots;
  const eggPrice = getEggPurchasePrice(
    model.state.highestIncomePerSecond,
    model.state.purchasedEggCount,
  );
  const canBuyEgg = !isBoardFull && model.state.coins >= eggPrice;
  const eggTimerSeconds = model.state.remainingEggSpawnSeconds;
  const mergeTutorialHint = model.state.hasCompletedFirstMergeTutorial
    ? null
    : findMergeTutorialHint(model.state.creatures);
  const mergeHintInstanceIds =
    mergeTutorialHint && mergeTutorialPhase !== 'idle'
      ? [mergeTutorialHint.sourceInstanceId, mergeTutorialHint.targetInstanceId]
      : [];
  const mergeGestureHint =
    mergeTutorialHint && mergeTutorialPhase === 'gesture'
      ? {
          sourceSlotIndex: mergeTutorialHint.sourceSlotIndex,
          targetSlotIndex: mergeTutorialHint.targetSlotIndex,
        }
      : null;
  const environmentalHintSignature = model.state.creatures
    .map((creature) => `${creature.instanceId}:${creature.creatureId}:${creature.slotIndex}`)
    .sort()
    .join('|');
  const portalProgress =
    model.state.portalEnergyRequired > 0
      ? Math.min(
          100,
          Math.round((model.state.portalEnergy / model.state.portalEnergyRequired) * 100),
        )
      : 0;
  const pendingSaleDefinition = pendingSale ? creatureDefinitions[pendingSale.creatureId] : null;
  const pendingSaleValue = pendingSale ? getSellValue(pendingSale.creatureId) : 0;
  const pendingSacrificeDefinition = pendingSacrifice
    ? creatureDefinitions[pendingSacrifice.creatureId]
    : null;
  const pendingSacrificeEnergy = pendingSacrificeDefinition?.portalEnergyValue ?? 0;
  const pendingSacrificeProductionLoss = pendingSacrificeDefinition?.coinsPerSecond ?? 0;
  const pendingSacrificeProductionAfter = Math.max(
    0,
    productionPerSecond - pendingSacrificeProductionLoss,
  );
  const pendingSacrificeCreatureProductionAfter = pendingSacrifice
    ? Math.max(0, creatureProductionPerSecond - pendingSacrificeProductionLoss)
    : creatureProductionPerSecond;
  const pendingSacrificeLossPercent =
    productionPerSecond > 0
      ? (pendingSacrificeProductionLoss / productionPerSecond) * 100
      : 0;
  const { user } = useAuth();
  const { syncStatus } = useCloudSync({
    user,
    state: model.state,
    onApplyState: (state, message) => dispatch({ type: 'replaceState', state, toast: message }),
  });

  useGameLoop(dispatch);
  useAutosave(model.state);

  useEffect(() => {
    if (!model.soundCue) return;

    playSoundCue(model.soundCue.type);
  }, [model.soundCue]);

  function recordInteraction() {
    setLastInteractionAt(Date.now());
    setMergeTutorialPhase('idle');
  }

  const collectCreatureCoins = useCallback(
    (instanceId: string) => {
      if (recentlyCollectedCreatureIds.current.has(instanceId)) return;

      const creature = model.state.creatures.find((item) => item.instanceId === instanceId);
      const amount = Math.floor(creature?.pendingCoins ?? 0);

      if (!creature || amount <= 0) return;

      recentlyCollectedCreatureIds.current.add(instanceId);
      window.setTimeout(() => {
        recentlyCollectedCreatureIds.current.delete(instanceId);
      }, 120);

      const burstId = Date.now() + creature.birthId;
      setCollectionBursts((current) => ({
        ...current,
        [instanceId]: { id: burstId, amount },
      }));
      window.setTimeout(() => {
        setCollectionBursts((current) => {
          if (current[instanceId]?.id !== burstId) return current;
          const next = { ...current };
          delete next[instanceId];
          return next;
        });
      }, 780);

      dispatch({ type: 'collectCreatureCoins', instanceId });
    },
    [model.state.creatures],
  );

  function handleCreaturePointerDown(
    creature: CreatureInstance,
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    recordInteraction();

    if (isSellMode) {
      event.preventDefault();
      setPendingSale(creature);
      return;
    }

    collectCreatureCoins(creature.instanceId);

    setDragState({
      kind: 'creature',
      instanceId: creature.instanceId,
      fromSlotIndex: creature.slotIndex,
      pointerX: event.clientX,
      pointerY: event.clientY,
    });
  }

  function handleEggPointerDown(egg: EggState, event: React.PointerEvent<HTMLButtonElement>) {
    recordInteraction();
    setDragState({
      kind: 'egg',
      instanceId: egg.eggId,
      fromSlotIndex: egg.slotIndex,
      pointerX: event.clientX,
      pointerY: event.clientY,
    });
  }

  function handleDropOnSlot(slotIndex: number, burstPoint?: { x: number; y: number }) {
    if (!dragState) return;
    recordInteraction();

    const dragged =
      dragState.kind === 'creature'
        ? model.state.creatures.find((creature) => creature.instanceId === dragState.instanceId)
        : null;
    const draggedEgg =
      dragState.kind === 'egg'
        ? model.state.eggs.find((egg) => egg.eggId === dragState.instanceId)
        : null;
    const target = model.state.creatures.find((creature) => creature.slotIndex === slotIndex);
    const targetEgg = model.state.eggs.find((egg) => egg.slotIndex === slotIndex);

    setDragState(null);

    if (draggedEgg) {
      if (draggedEgg.slotIndex === slotIndex) return;

      if (!target && !targetEgg) {
        dispatch({ type: 'moveEgg', eggId: draggedEgg.eggId, toSlotIndex: slotIndex });
        return;
      }

      if (targetEgg) {
        dispatch({ type: 'swapEggs', sourceEggId: draggedEgg.eggId, targetEggId: targetEgg.eggId });
        return;
      }

      if (target) {
        dispatch({
          type: 'swapCreatureWithEgg',
          creatureInstanceId: target.instanceId,
          eggId: draggedEgg.eggId,
        });
      }

      return;
    }

    if (!dragged || dragged.slotIndex === slotIndex) return;

    if (!target && !targetEgg) {
      dispatch({ type: 'move', instanceId: dragged.instanceId, toSlotIndex: slotIndex });
      return;
    }

    if (targetEgg) {
      dispatch({
        type: 'swapCreatureWithEgg',
        creatureInstanceId: dragged.instanceId,
        eggId: targetEgg.eggId,
      });
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

  function handleDropOnEnvironment(environmentId: EnvironmentId) {
    if (!dragState) return;

    recordInteraction();
    if (environmentId === 'portal' && model.state.portalState === 'active') {
      setDragState(null);
      dispatch({ type: 'showToast', message: 'O portal já está ativo.' });
      return;
    }

    if (dragState.kind !== 'creature') {
      setDragState(null);
      dispatch({ type: 'showToast', message: 'Nada respondeu.' });
      return;
    }

    const dragged = model.state.creatures.find(
      (creature) => creature.instanceId === dragState.instanceId,
    );

    setDragState(null);
    if (!dragged) return;

    const transformation = evaluateEnvironmentalTransformation(dragged, environmentId);
    if (transformation.status !== 'success') {
      if (model.state.portalState === 'cracked') {
        const definition = creatureDefinitions[dragged.creatureId];
        const totalProductionAfter = Math.max(0, productionPerSecond - definition.coinsPerSecond);
        const creatureProductionAfter = Math.max(
          0,
          creatureProductionPerSecond - definition.coinsPerSecond,
        );
        const lossPercent =
          productionPerSecond > 0 ? (definition.coinsPerSecond / productionPerSecond) * 100 : 0;
        const shouldWarn =
          creatureProductionAfter === 0 ||
          totalProductionAfter <= gameConfig.criticalProductionPerSecond ||
          lossPercent >= gameConfig.portalSacrificeWarningPercent;

        if (shouldWarn) {
          setPendingSacrifice(dragged);
        } else {
          dispatch({ type: 'sacrifice', instanceId: dragged.instanceId });
        }
      } else {
        dispatch({ type: 'showToast', message: 'Nada respondeu.' });
      }
      return;
    }

    dispatch({
      type: 'environmentalTransform',
      sourceInstanceId: dragged.instanceId,
      environmentId,
      resultCreatureId: transformation.resultCreatureId,
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
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      const environment = elements
        .map((element) => element.closest<HTMLElement>('[data-environment-id]'))
        .find(Boolean);

      if (environment?.dataset.environmentId) {
        handleDropOnEnvironment(environment.dataset.environmentId as EnvironmentId);
        return;
      }

      const slot = elements
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
  }, [dragState, model.state.creatures, model.state.eggs, model.state.portalState]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const creatureElement = document
        .elementsFromPoint(event.clientX, event.clientY)
        .map((element) => element.closest<HTMLElement>('[data-creature-instance-id]'))
        .find(Boolean);

      const instanceId = creatureElement?.dataset.creatureInstanceId;
      if (instanceId) collectCreatureCoins(instanceId);
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [collectCreatureCoins]);

  const draggedCreature = dragState?.kind === 'creature'
    ? model.state.creatures.find((creature) => creature.instanceId === dragState.instanceId)
    : null;
  const draggedEgg = dragState?.kind === 'egg'
    ? model.state.eggs.find((egg) => egg.eggId === dragState.instanceId)
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
    if (!model.toast) return;

    const timeout = window.setTimeout(() => dispatch({ type: 'clearToast' }), 2600);
    return () => window.clearTimeout(timeout);
  }, [model.toast]);

  useEffect(() => {
    if (!mergeTutorialHint || model.state.hasCompletedFirstMergeTutorial || dragState) {
      setMergeTutorialPhase('idle');
      return;
    }

    const pulseDelay = Math.max(0, 3200 - (Date.now() - lastInteractionAt));
    const pulseTimeout = window.setTimeout(() => {
      setMergeTutorialPhase('pulse');
    }, pulseDelay);
    const gestureTimeout = window.setTimeout(() => {
      setMergeTutorialPhase('gesture');
    }, pulseDelay + 3000);

    return () => {
      window.clearTimeout(pulseTimeout);
      window.clearTimeout(gestureTimeout);
    };
  }, [
    dragState,
    lastInteractionAt,
    mergeTutorialHint?.sourceInstanceId,
    mergeTutorialHint?.targetInstanceId,
    model.state.hasCompletedFirstMergeTutorial,
  ]);

  useEffect(() => {
    const hint = findEnvironmentalHint(model.state.creatures);
    if (!hint) return;
    const activeHint = hint;

    let pulseTimeout: number | null = null;
    let pauseTimeout: number | null = null;

    function schedulePulse() {
      if (document.visibilityState !== 'visible') {
        pulseTimeout = window.setTimeout(schedulePulse, 500);
        return;
      }

      setEnvironmentalHintInstanceIds(activeHint.creatureInstanceIds.slice(0, 3));
      setIsEnvironmentReacting(activeHint.environmentIds.includes('portal'));
      pauseTimeout = window.setTimeout(() => {
        setEnvironmentalHintInstanceIds([]);
        setIsEnvironmentReacting(false);
        pulseTimeout = window.setTimeout(schedulePulse, 2500);
      }, 1850);
    }

    schedulePulse();

    return () => {
      if (pulseTimeout !== null) window.clearTimeout(pulseTimeout);
      if (pauseTimeout !== null) window.clearTimeout(pauseTimeout);
    };
  }, [environmentalHintSignature]);

  return (
    <main
      className="appShell"
      onPointerDownCapture={() => {
        unlockGameAudio();
        recordInteraction();
      }}
    >
      <div
        className={[
          'gameStage',
          `gameStage--portal-${model.state.portalState}`,
          isPortalReacting ? 'gameStage--portalPulse' : '',
          isEnvironmentReacting ? 'gameStage--environmentPulse' : '',
        ].join(' ')}
      >
        <CoinHud coins={model.state.coins} productionPerSecond={productionPerSecond} />
        <AccountButton syncStatus={syncStatus} />
        <EggTimer remainingSeconds={eggTimerSeconds} />
        <button
          className="portalDropZone"
          type="button"
          data-environment-id="portal"
          aria-label={model.state.portalState === 'active' ? 'Abrir Mapa 2' : 'Portal'}
          onClick={() => {
            if (model.state.portalState === 'active' && !dragState) {
              setIsMapPreviewOpen(true);
            }
          }}
        />
        <div className="portalHint" aria-hidden="true" />
        {model.state.portalState !== 'dormant' ? (
          <div
            className={`portalMeter ${
              model.state.portalState === 'active' ? 'portalMeter--active' : ''
            }`}
            aria-label="Energia do portal"
          >
            {model.state.portalState === 'cracked' ? (
              <span className="portalMeter__message">
                O portal despertou... e parece faminto.
              </span>
            ) : null}
            <p>
              {model.state.portalState === 'active' ? <span>Portal ativo</span> : null}
              <strong>
                {model.state.portalState === 'active'
                  ? 'Mapa 2'
                  : `${model.state.portalEnergy}/${model.state.portalEnergyRequired}`}
              </strong>
            </p>
            <i
              style={
                {
                  '--portal-progress': `${
                    model.state.portalState === 'active' ? 100 : portalProgress
                  }%`,
                } as React.CSSProperties
              }
            />
          </div>
        ) : null}
        <GameBoard
          creatures={model.state.creatures}
          eggs={model.state.eggs}
          dragState={dragState}
          collectionBursts={collectionBursts}
          mergeHintInstanceIds={mergeHintInstanceIds}
          environmentalHintInstanceIds={environmentalHintInstanceIds}
          mergeGestureHint={mergeGestureHint}
          onCreaturePointerDown={handleCreaturePointerDown}
          onCollectCreature={collectCreatureCoins}
          onEggPointerDown={handleEggPointerDown}
        />

        {model.toast ? <p className="toast" role="status">{model.toast}</p> : null}

        <div className="actionBar">
          <BuyCreatureButton
            disabled={!canBuyEgg}
            price={formatCoins(eggPrice)}
            onBuy={() => dispatch({ type: 'buyEgg' })}
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
          <button
            className={`iconTile iconTile--sell ${isSellMode ? 'is-active' : ''}`}
            type="button"
            aria-pressed={isSellMode}
            onClick={() => setIsSellMode((current) => !current)}
          >
            <span className="iconTile__symbol">
              <Trash2 size={22} aria-hidden="true" />
            </span>
            <span>Vender</span>
            <small>{isSellMode ? 'Ativo' : '15%'}</small>
          </button>
        </aside>

        <button className="resetButton" type="button" onClick={() => setIsResetConfirmOpen(true)}>
          <RotateCcw size={15} aria-hidden="true" />
          Resetar save
        </button>

        {dragState && (draggedCreature || draggedEgg) ? (
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
            <img
              src={
                draggedCreature
                  ? creatureDefinitions[draggedCreature.creatureId].image
                  : cosmicEggImage
              }
              alt=""
            />
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

      {/* Futuro: reativar AnomalyShop aqui se a compra voltar a ter submenu/upgrades. */}

      {!model.state.hasSeenWelcomeModal ? (
        <div className="modalBackdrop" role="presentation">
          <section
            className="modal welcomeModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
          >
            <p className="modal__eyebrow">Anomalias Cósmicas</p>
            <h2 id="welcome-title">Bem-vindo ao desconhecido! ✨</h2>
            <p>
              Crie anomalias, <strong>combine, misture e experimente</strong>. Descubra novas
              formas e desvende os segredos do universo.
            </p>
            <button
              className="primaryButton"
              type="button"
              onClick={() => dispatch({ type: 'dismissWelcome' })}
            >
              Explorar
            </button>
          </section>
        </div>
      ) : null}

      {isResetConfirmOpen ? (
        <div className="modalBackdrop" role="presentation">
          <section className="modal resetConfirm" role="dialog" aria-modal="true" aria-labelledby="reset-title">
            <p className="modal__eyebrow">Resetar save</p>
            <h2 id="reset-title">Tudo será removido</h2>
            <p>
              Essa ação zera moedas, criaturas, ovos, Dex, compras, portal e mapas. Se você
              estiver conectado, esse reset também será sincronizado na nuvem.
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
                  setIsSellMode(false);
                  setPendingSale(null);
                  setPendingSacrifice(null);
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

      {pendingSale && pendingSaleDefinition ? (
        <div className="modalBackdrop" role="presentation">
          <section
            className="modal resetConfirm compactConfirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sell-title"
          >
            <p className="modal__eyebrow">Remover anomalia</p>
            <h2 id="sell-title">Vender {pendingSaleDefinition.name}?</h2>
            <p>
              A criatura sai do tabuleiro e você recebe {pendingSaleValue} moedas. Dex, compras
              e descobertas não mudam.
            </p>
            <div className="resetConfirm__actions">
              <button
                className="secondaryButton"
                type="button"
                onClick={() => {
                  setPendingSale(null);
                  setIsSellMode(false);
                }}
              >
                Cancelar
              </button>
              <button
                className="dangerButton"
                type="button"
                onClick={() => {
                  dispatch({ type: 'sell', instanceId: pendingSale.instanceId });
                  setPendingSale(null);
                  setIsSellMode(false);
                }}
              >
                Vender
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingSacrifice && pendingSacrificeDefinition ? (
        <div className="modalBackdrop" role="presentation">
          <section
            className="modal resetConfirm compactConfirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sacrifice-title"
          >
            <p className="modal__eyebrow">Portal rachado</p>
            <h2 id="sacrifice-title">
              {pendingSacrificeCreatureProductionAfter === 0
                ? 'Última anomalia produtora'
                : pendingSacrificeProductionAfter <= gameConfig.criticalProductionPerSecond
                  ? 'Produção crítica'
                  : 'Sacrificar anomalia?'}
            </h2>
            <p>{pendingSacrificeDefinition.name} será consumido permanentemente pelo portal.</p>
            {pendingSacrificeCreatureProductionAfter === 0 ? (
              <p className="warningText">
                Sua produção das anomalias cairá para 0/s. Você dependerá da energia residual do
                portal, dos ovos gratuitos e da reconstrução da colônia.
              </p>
            ) : pendingSacrificeProductionAfter <= gameConfig.criticalProductionPerSecond ? (
              <p className="warningText">
                Este sacrifício reduzirá sua produção para apenas{' '}
                {formatCoins(pendingSacrificeProductionAfter)}/s. Reconstruir sua colônia poderá
                levar algum tempo.
              </p>
            ) : (
              <p className="warningText">
                Sua produção cairá de {formatCoins(productionPerSecond)}/s para{' '}
                {formatCoins(pendingSacrificeProductionAfter)}/s.
              </p>
            )}
            <p className="sacrificeStats">
              Energia recebida: +{formatCoins(pendingSacrificeEnergy)}
              <br />
              Perda de produção: {formatCoins(pendingSacrificeProductionLoss)}/s (
              {Math.round(pendingSacrificeLossPercent)}%)
            </p>
            <div className="resetConfirm__actions">
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setPendingSacrifice(null)}
              >
                Cancelar
              </button>
              <button
                className="dangerButton"
                type="button"
                onClick={() => {
                  dispatch({ type: 'sacrifice', instanceId: pendingSacrifice.instanceId });
                  setPendingSacrifice(null);
                }}
              >
                {pendingSacrificeCreatureProductionAfter === 0 ? 'Sacrificar mesmo assim' : 'Sacrificar'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isMapPreviewOpen ? (
        <div className="modalBackdrop" role="presentation">
          <section
            className="modal compactConfirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="map-preview-title"
          >
            <p className="modal__eyebrow">Portal ativo</p>
            <h2 id="map-preview-title">Mapa 2</h2>
            <p>Em breve...</p>
            <button className="primaryButton" type="button" onClick={() => setIsMapPreviewOpen(false)}>
              OK
            </button>
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
