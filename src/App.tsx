import { Cloud, RotateCcw } from 'lucide-react';
import { useEffect, useReducer, useRef, useState } from 'react';
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
import { signInWithGoogle } from './auth/authService';
import { creatureDefinitions, dexOrder } from './data/creatures';
import { gameConfig, WORLD_LABELS } from './data/gameConfig';
import { useGameLoop } from './hooks/useGameLoop';
import { useAutosave, useInitialGameModel } from './hooks/useGamePersistence';
import { calculateOfflineReward, reducer, type DragState } from './state/gameStore';
import type { CreatureInstance, EggState, EnvironmentId, MapId } from './types/game';
import {
  formatCoins,
  getSellValue,
  getTotalProductionPerSecond,
} from './utils/economy';
import { evaluateEnvironmentalTransformation } from './utils/environmentalTransform';
import { findEnvironmentalHint, findMergeTutorialHint } from './utils/hints';
import { evaluateMerge } from './utils/merge';
import {
  getPortalRequestCooldownRemainingSeconds,
  isFinalMapOneNaturalMergeResult,
} from './utils/portalRequests';
import { playSoundCue, unlockGameAudio } from './utils/sound';
import { useCloudSync } from './persistence/useCloudSync';
import { saveLocal } from './persistence/localSave';
import { logSaveDebug } from './utils/saveDebug';
import {
  rewardedAdService,
} from './ads/rewardedAdService';
import { evolutionRecipes } from './data/evolutions';

const boardBackgrounds = {
  dormant: '/backgrounds/game-board.png',
  cracked: '/backgrounds/game-board-portal-cracked.png',
  awaiting_transition: '/backgrounds/game-board-portal-cracked.png',
  open: '/backgrounds/game-board-portal-open.png',
  map2: '/backgrounds/game-board-2.png',
} as const;

function requestPortraitOrientationLock() {
  const orientation = screen.orientation as (ScreenOrientation & {
    lock?: (orientation: 'portrait') => Promise<void>;
  }) | undefined;
  const lock = orientation?.lock;
  if (!lock) return;

  void lock.call(orientation, 'portrait').catch(() => {
    // Browsers may reject orientation lock outside installed/fullscreen contexts.
  });
}

function preloadImage(src: string) {
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
}

function formatShortTimer(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function clampWorldCoordinate(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(0.94, Math.max(0.06, value));
}

function getWorldPositionFromPoint(clientX: number, clientY: number) {
  const field = document.querySelector<HTMLElement>('[data-world-field]');
  if (!field) return null;

  const rect = field.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    x: clampWorldCoordinate((clientX - rect.left) / rect.width),
    y: clampWorldCoordinate((clientY - rect.top) / rect.height),
  };
}

function App() {
  const initial = useInitialGameModel();
  const [model, dispatch] = useReducer(reducer, initial.model);
  const [dragState, setDragState] = useState<DragState>(null);
  const [isDexOpen, setIsDexOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [hasChosenGuestSession, setHasChosenGuestSession] = useState(false);
  const [isInitialAuthSigningIn, setIsInitialAuthSigningIn] = useState(false);
  const [isCloudSavePromptOpen, setIsCloudSavePromptOpen] = useState(false);
  const [isCloudSavePromptSigningIn, setIsCloudSavePromptSigningIn] = useState(false);
  const [isRewardedAdAvailable, setIsRewardedAdAvailable] = useState(false);
  const [isRewardedAdPending, setIsRewardedAdPending] = useState(false);
  const [rewardedAdMessage, setRewardedAdMessage] = useState<string | null>(null);
  const [isSellMode, setIsSellMode] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [pendingSale, setPendingSale] = useState<CreatureInstance | null>(null);
  const [isPortalReacting, setIsPortalReacting] = useState(false);
  const [mapTransition, setMapTransition] = useState<{ id: number; targetMapId: MapId } | null>(
    null,
  );
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
  const [openingEggIds, setOpeningEggIds] = useState<string[]>([]);
  const hasCalculatedOfflineRewardRef = useRef(false);
  const shouldSaveOfflineCollectionRef = useRef(false);
  const hasClaimedOfflineRewardRef = useRef(false);
  const lastRenderedProductionPulseRef = useRef(model.productionPulseId);
  const mapTransitionTimeoutsRef = useRef<number[]>([]);

  const productionPerSecond = getTotalProductionPerSecond(model.state);
  const visibleCreatures = model.state.creatures.filter(
    (creature) => creature.mapId === model.state.currentMapId,
  );
  const visibleEggs = model.state.eggs.filter((egg) => egg.mapId === model.state.currentMapId);
  const occupiedEntities = visibleCreatures.length + visibleEggs.length;
  const isBoardFull = occupiedEntities >= gameConfig.maxWorldEntities;
  const guidedTutorialStep = model.state.guidedTutorialStep;
  const eggTimerSeconds = model.state.remainingEggSpawnSeconds;
  const mergeTutorialHint = model.state.hasCompletedFirstMergeTutorial
    ? null
    : findMergeTutorialHint(visibleCreatures);
  const mergeHintInstanceIds =
    mergeTutorialHint && (mergeTutorialPhase !== 'idle' || guidedTutorialStep === 'merge')
      ? [mergeTutorialHint.sourceInstanceId, mergeTutorialHint.targetInstanceId]
      : [];
  const draggedCreatureForHints =
    dragState?.kind === 'creature'
      ? model.state.creatures.find((creature) => creature.instanceId === dragState.instanceId)
      : null;
  const dragMergeTargetIds = draggedCreatureForHints
    ? visibleCreatures
        .filter(
          (creature) =>
            creature.instanceId !== draggedCreatureForHints.instanceId &&
            evaluateMerge(draggedCreatureForHints, creature).status === 'success',
        )
        .map((creature) => creature.instanceId)
    : [];
  const mergeGestureHint =
    mergeTutorialHint && (mergeTutorialPhase === 'gesture' || guidedTutorialStep === 'merge')
      ? {
          sourceX: mergeTutorialHint.sourceX,
          sourceY: mergeTutorialHint.sourceY,
          targetX: mergeTutorialHint.targetX,
          targetY: mergeTutorialHint.targetY,
        }
      : null;
  const dragWorldPosition = dragState
    ? getWorldPositionFromPoint(dragState.pointerX, dragState.pointerY)
    : null;
  const environmentalHintSignature = model.state.creatures
    .filter((creature) => creature.mapId === model.state.currentMapId)
    .map((creature) => `${creature.instanceId}:${creature.creatureId}`)
    .sort()
    .join('|');
  const portalProgress =
    model.state.portalEnergyRequired > 0
      ? Math.min(
          100,
          Math.round((model.state.portalEnergy / model.state.portalEnergyRequired) * 100),
        )
      : 0;
  const boardBackground =
    model.state.currentMapId === 'map2'
      ? boardBackgrounds.map2
      : boardBackgrounds[model.state.portalState];
  const creatureCounts = visibleCreatures.reduce<Partial<Record<string, number>>>(
    (counts, creature) => ({
      ...counts,
      [creature.creatureId]: (counts[creature.creatureId] ?? 0) + 1,
    }),
    {},
  );
  const preloadCandidateImages = new Set<string>();

  if (
    model.state.portalState === 'dormant' &&
    (model.state.discoveredCreatureIds.includes('nebulux') ||
      visibleCreatures.some((creature) => creature.creatureId === 'nebulux'))
  ) {
    preloadCandidateImages.add(boardBackgrounds.cracked);
  }

  if (
    (model.state.portalState === 'cracked' && portalProgress >= 80) ||
    model.state.portalState === 'awaiting_transition'
  ) {
    preloadCandidateImages.add(boardBackgrounds.open);
  }
  preloadCandidateImages.add(boardBackgrounds.map2);

  for (const recipe of evolutionRecipes) {
    const [firstInput, secondInput] = recipe.inputs;
    const hasImmediateMerge =
      firstInput === secondInput
        ? (creatureCounts[firstInput] ?? 0) >= 2
        : (creatureCounts[firstInput] ?? 0) >= 1 && (creatureCounts[secondInput] ?? 0) >= 1;

    if (hasImmediateMerge) {
      preloadCandidateImages.add(creatureDefinitions[recipe.result].image);
    }
  }
  const pendingSaleDefinition = pendingSale ? creatureDefinitions[pendingSale.creatureId] : null;
  const pendingSaleValue = pendingSale ? getSellValue(pendingSale.creatureId) : 0;
  const portalRequest = model.state.activePortalRequest;
  const portalRequestDefinition = portalRequest
    ? creatureDefinitions[portalRequest.creatureId]
    : null;
  const portalRequestCooldownSeconds = getPortalRequestCooldownRemainingSeconds(model.state);
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const { syncStatus, hasResolvedInitialSync } = useCloudSync({
    user,
    state: model.state,
    canSyncState: !initial.offlineReward,
    onApplyState: (state, message) => dispatch({ type: 'replaceState', state, toast: message }),
  });
  const saveOwner = user
    ? ({ ownerType: 'account', ownerUserId: user.id } as const)
    : ({ ownerType: 'guest' } as const);
  const shouldShowInitialAuthPrompt =
    isConfigured && !isAuthLoading && !user && !hasChosenGuestSession;
  const isHydrating = isAuthLoading || Boolean(user && !hasResolvedInitialSync);
  const isGameplayLocked = isHydrating || shouldShowInitialAuthPrompt || isInitialAuthSigningIn;
  const preloadCandidateSignature = [...preloadCandidateImages].sort().join('|');
  const hasPlayedEnoughForCloudPrompt =
    model.state.hasCompletedFirstMergeTutorial ||
    model.state.discoveredCreatureIds.length >= 2 ||
    model.state.highestIncomePerSecond >= 2;
  const canShowCloudSavePrompt =
    isConfigured &&
    !user &&
    !isAuthLoading &&
    !isGameplayLocked &&
    model.state.hasSeenWelcomeModal &&
    !model.state.hasSeenCloudSavePrompt &&
    hasPlayedEnoughForCloudPrompt;
  const hasBlockingModal =
    isDexOpen ||
    isShopOpen ||
    !model.state.hasSeenWelcomeModal ||
    isResetConfirmOpen ||
    Boolean(pendingSale) ||
    Boolean(visibleDiscoveryId) ||
    Boolean(initial.offlineReward);
  const highlightedTutorialEggIds =
    guidedTutorialStep === 'openFirstEgg'
      ? visibleEggs.slice(0, 1).map((egg) => egg.eggId)
      : guidedTutorialStep === 'openSecondEgg'
        ? visibleEggs.filter((egg) => egg.source === 'purchased').map((egg) => egg.eggId)
        : [];
  const tutorialMessage =
    guidedTutorialStep === 'openFirstEgg'
      ? 'Toque no Ovo Cósmico para revelar sua primeira anomalia.'
      : guidedTutorialStep === 'buyEgg'
        ? 'Use suas moedas para comprar outro ovo.'
        : guidedTutorialStep === 'openSecondEgg'
          ? 'Toque no novo ovo para revelar outra anomalia.'
          : guidedTutorialStep === 'merge'
            ? 'Arraste uma anomalia sobre a outra para combinar.'
            : null;

  useGameLoop(
    dispatch,
    !isGameplayLocked,
    dragState?.kind === 'creature' ? dragState.instanceId : null,
  );
  useAutosave(
    model.state,
    !isGameplayLocked && hasResolvedInitialSync && !initial.offlineReward,
    saveOwner,
  );

  useEffect(() => {
    if (!model.soundCue) return;

    playSoundCue(model.soundCue.type);
  }, [model.soundCue]);

  useEffect(() => {
    if (model.productionPulseId === lastRenderedProductionPulseRef.current) return;
    lastRenderedProductionPulseRef.current = model.productionPulseId;
    if (model.productionPulseId <= 0) return;

    const productiveCreatures = visibleCreatures.filter(
      (creature) => creatureDefinitions[creature.creatureId].coinsPerSecond > 0,
    );
    if (productiveCreatures.length === 0) return;

    const timeouts: number[] = [];

    for (const creature of productiveCreatures) {
      const amount = Math.floor(creatureDefinitions[creature.creatureId].coinsPerSecond);
      const burstId = Date.now() + creature.birthId;
      const visualDelay = (creature.birthId * 37 + model.productionPulseId * 113) % 760;

      timeouts.push(
        window.setTimeout(() => {
          setCollectionBursts((current) => ({
            ...current,
            [creature.instanceId]: { id: burstId, amount },
          }));
        }, visualDelay),
      );

      timeouts.push(
        window.setTimeout(() => {
          setCollectionBursts((current) => {
            if (current[creature.instanceId]?.id !== burstId) return current;
            const next = { ...current };
            delete next[creature.instanceId];
            return next;
          });
        }, visualDelay + 780),
      );
    }

    return () => {
      for (const timeout of timeouts) window.clearTimeout(timeout);
    };
  }, [model.productionPulseId, visibleCreatures]);

  useEffect(() => {
    requestPortraitOrientationLock();
  }, []);

  useEffect(
    () => () => {
      mapTransitionTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    },
    [],
  );

  useEffect(() => {
    if (isGameplayLocked || !preloadCandidateSignature) return;

    const sources = preloadCandidateSignature.split('|');
    const preload = () => sources.forEach(preloadImage);
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(preload, { timeout: 4000 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timeout = window.setTimeout(preload, 1400);
    return () => window.clearTimeout(timeout);
  }, [isGameplayLocked, preloadCandidateSignature]);

  useEffect(() => {
    let cancelled = false;

    rewardedAdService.isAvailable().then((available) => {
      if (!cancelled) setIsRewardedAdAvailable(available);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function recordInteraction() {
    setLastInteractionAt(Date.now());
    setMergeTutorialPhase('idle');
  }

  async function handleCloudPromptSignIn() {
    setIsCloudSavePromptSigningIn(true);
    dispatch({ type: 'dismissCloudSavePrompt' });

    try {
      await signInWithGoogle();
    } catch {
      setIsCloudSavePromptSigningIn(false);
      dispatch({ type: 'showToast', message: 'Não foi possível abrir o login.' });
    }
  }

  async function handleInitialAuthSignIn() {
    setIsInitialAuthSigningIn(true);

    try {
      await signInWithGoogle();
    } catch {
      setIsInitialAuthSigningIn(false);
      dispatch({ type: 'showToast', message: 'Não foi possível abrir o login.' });
    }
  }

  function handleOfflineRewardCollect(multiplier: 1 | 2 = 1, allowWhileRewardedAdPending = false) {
    if (!initial.offlineReward) return;
    if (hasClaimedOfflineRewardRef.current) return;
    if (isRewardedAdPending && !allowWhileRewardedAdPending) return;

    setRewardedAdMessage(null);
    hasClaimedOfflineRewardRef.current = true;
    shouldSaveOfflineCollectionRef.current = true;
    dispatch({ type: 'collectOfflineReward', reward: initial.offlineReward, multiplier });
    initial.dismissOfflineReward();
  }

  async function handleRewardedOfflineReward() {
    if (!initial.offlineReward || hasClaimedOfflineRewardRef.current || isRewardedAdPending) return;

    setIsRewardedAdPending(true);
    setRewardedAdMessage(null);

    try {
      const result = await rewardedAdService.showRewardedAd('offline_reward');

      if (result === 'rewarded') {
        handleOfflineRewardCollect(2, true);
        return;
      }

      if (result === 'unavailable') {
        setIsRewardedAdAvailable(false);
      }

      setRewardedAdMessage(
        result === 'closed'
          ? 'Anúncio fechado. Você ainda pode coletar a recompensa normal.'
          : 'Não foi possível carregar o anúncio. Você ainda pode coletar a recompensa normal.',
      );
    } finally {
      setIsRewardedAdPending(false);
    }
  }

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

    setDragState({
      kind: 'creature',
      instanceId: creature.instanceId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      pointerX: event.clientX,
      pointerY: event.clientY,
    });
  }

  function handleEggPointerDown(egg: EggState, event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    recordInteraction();
    openEggWithAnimation(egg.eggId);
  }

  function handlePortalMapSwitch() {
    if (model.state.portalState !== 'open' || dragState || mapTransition) return;

    const targetMapId = model.state.currentMapId === 'map1' ? 'map2' : 'map1';
    const transitionId = Date.now();

    recordInteraction();
    setMapTransition({ id: transitionId, targetMapId });

    mapTransitionTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    mapTransitionTimeoutsRef.current = [
      window.setTimeout(() => {
        dispatch({ type: 'switchMap', mapId: targetMapId });
      }, 360),
      window.setTimeout(() => {
        setMapTransition((current) => (current?.id === transitionId ? null : current));
      }, 920),
    ];
  }

  function openEggWithAnimation(eggId: string) {
    if (openingEggIds.includes(eggId)) return;

    setOpeningEggIds((current) => [...current, eggId]);
    window.setTimeout(() => {
      dispatch({ type: 'openEgg', eggId });
      setOpeningEggIds((current) => current.filter((item) => item !== eggId));
    }, 560);
  }

  function handleDropInWorld(
    position: { x: number; y: number },
    targetInstanceId?: string,
    burstPoint?: { x: number; y: number },
  ) {
    if (!dragState) return;
    recordInteraction();

    const dragged =
      dragState.kind === 'creature'
        ? visibleCreatures.find((creature) => creature.instanceId === dragState.instanceId)
        : null;
    const target = targetInstanceId
      ? visibleCreatures.find((creature) => creature.instanceId === targetInstanceId)
      : null;

    setDragState(null);

    if (!dragged) return;
    if (!target || target.instanceId === dragged.instanceId) {
      dispatch({ type: 'move', instanceId: dragged.instanceId, x: position.x, y: position.y });
      return;
    }

    const merge = evaluateMerge(dragged, target);
    if (merge.status === 'success') {
      if (
        isFinalMapOneNaturalMergeResult(merge.resultCreatureId) &&
        model.state.portalState !== 'awaiting_transition' &&
        model.state.portalState !== 'open'
      ) {
        dispatch({
          type: 'blockedMerge',
          message:
            'Esta anomalia não pode evoluir neste mundo... O portal ainda não está estabilizado.',
        });
        return;
      }

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
        x: target.x,
        y: target.y,
      });
      return;
    }

    if (merge.status === 'blocked') {
      dispatch({ type: 'blockedMerge', message: merge.message });
      return;
    }

    dispatch({ type: 'move', instanceId: dragged.instanceId, x: position.x, y: position.y });
  }

  function handleDropOnEnvironment(environmentId: EnvironmentId) {
    if (!dragState) return;

    recordInteraction();
    if (environmentId === 'portal' && model.state.portalState === 'open') {
      setDragState(null);
      dispatch({ type: 'showToast', message: 'O portal já está aberto.' });
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

    if (environmentId === 'portal' && model.state.portalState !== 'dormant') {
      dispatch({ type: 'deliverPortalRequest', instanceId: dragged.instanceId });
      return;
    }

    const transformation = evaluateEnvironmentalTransformation(dragged, environmentId);
    if (transformation.status !== 'success') {
      dispatch({ type: 'showToast', message: 'Nada respondeu.' });
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
    const activeDragState = dragState;

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

      const worldPosition = getWorldPositionFromPoint(event.clientX, event.clientY);
      if (!worldPosition) {
        setDragState(null);
        return;
      }

      const draggedCreatureId =
        activeDragState.kind === 'creature' ? activeDragState.instanceId : null;
      const targetCreature = elements
        .map((element) => element.closest<HTMLElement>('[data-creature-instance-id]'))
        .find(
          (element) =>
            element?.dataset.creatureInstanceId &&
            element.dataset.creatureInstanceId !== draggedCreatureId,
        );
      const targetInstanceId = targetCreature?.dataset.creatureInstanceId;
      const targetRect = targetCreature?.getBoundingClientRect();

      handleDropInWorld(
        worldPosition,
        targetInstanceId,
        targetRect
          ? {
              x: targetRect.left + targetRect.width / 2,
              y: targetRect.top + targetRect.height / 2,
            }
          : {
              x: event.clientX,
              y: event.clientY,
            },
      );
    }

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [dragState, model.state.creatures, model.state.eggs, model.state.portalState]);

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
    if (shouldSaveOfflineCollectionRef.current) {
      shouldSaveOfflineCollectionRef.current = false;
      saveLocal(model.state, saveOwner);
    }
  }, [model.state, saveOwner]);

  useEffect(() => {
    if (hasCalculatedOfflineRewardRef.current || isGameplayLocked || !hasResolvedInitialSync) return;

    hasCalculatedOfflineRewardRef.current = true;
    const reward = calculateOfflineReward(model.state);
    logSaveDebug('OFFLINE_REWARD_CALCULATED', {
      source: 'memory',
      state: model.state,
      coins: reward?.coins ?? 0,
      extra: {
        secondsAway: reward?.secondsAway ?? 0,
        capReached: reward?.capReached ?? false,
      },
    });

    if (reward) {
      initial.showOfflineReward(reward);
    }
  }, [hasResolvedInitialSync, initial, isGameplayLocked, model.state]);

  useEffect(() => {
    if (!canShowCloudSavePrompt || hasBlockingModal || dragState || isCloudSavePromptOpen) {
      return;
    }

    const promptDelay = Math.max(0, 5200 - (Date.now() - lastInteractionAt));
    const timeout = window.setTimeout(() => {
      setIsCloudSavePromptOpen(true);
    }, promptDelay);

    return () => window.clearTimeout(timeout);
  }, [
    canShowCloudSavePrompt,
    dragState,
    hasBlockingModal,
    isCloudSavePromptOpen,
    lastInteractionAt,
  ]);

  useEffect(() => {
    if (user) {
      setIsCloudSavePromptOpen(false);
      setIsCloudSavePromptSigningIn(false);
      setIsInitialAuthSigningIn(false);
    }
  }, [user]);

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
    const hint = findEnvironmentalHint(visibleCreatures);
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

  if (isHydrating || isInitialAuthSigningIn) {
    return (
      <main className="startupScreen" aria-busy="true">
        <section className="startupPanel" aria-live="polite">
          <p className="modal__eyebrow">Anomalias Cósmicas</p>
          <h1>Anomalias Cósmicas</h1>
          <span className="startupSpinner" aria-hidden="true" />
          <p>Sincronizando...</p>
        </section>
      </main>
    );
  }

  if (shouldShowInitialAuthPrompt) {
    return (
      <main className="startupScreen">
        <section
          className="modal cloudSavePrompt authStartPrompt"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-start-title"
        >
          <span className="cloudSavePrompt__icon" aria-hidden="true">
            <Cloud size={28} />
          </span>
          <p className="modal__eyebrow">Salvar progresso</p>
          <h1 id="auth-start-title">Salve seu progresso</h1>
          <p>
            Entre com sua conta Google para manter suas anomalias sincronizadas entre
            dispositivos.
          </p>
          <div className="cloudSavePrompt__actions">
            <button
              className="primaryButton"
              type="button"
              disabled={isInitialAuthSigningIn}
              onClick={handleInitialAuthSignIn}
            >
              {isInitialAuthSigningIn ? 'Abrindo...' : 'Continuar com Google'}
            </button>
            <button
              className="secondaryButton"
              type="button"
              disabled={isInitialAuthSigningIn}
              onClick={() => setHasChosenGuestSession(true)}
            >
              Jogar sem conta
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className="appShell"
      onPointerDownCapture={() => {
        requestPortraitOrientationLock();
        unlockGameAudio();
        recordInteraction();
      }}
    >
      <div
        className={[
          'gameStage',
          `gameStage--portal-${model.state.portalState}`,
          mapTransition ? 'gameStage--mapTransition' : '',
          isPortalReacting ? 'gameStage--portalPulse' : '',
          isEnvironmentReacting ? 'gameStage--environmentPulse' : '',
        ].join(' ')}
        style={
          {
            '--scene-background-image': `url("${boardBackground}")`,
          } as React.CSSProperties
        }
      >
        <div className="sceneLayer" aria-hidden="true" />
        {mapTransition ? (
          <div
            key={mapTransition.id}
            className={`mapTransitionOverlay mapTransitionOverlay--to-${mapTransition.targetMapId}`}
            aria-hidden="true"
          >
            <span />
          </div>
        ) : null}
        <GameBoard
          creatures={visibleCreatures}
          eggs={visibleEggs}
          dragState={dragState}
          dragWorldPosition={dragWorldPosition}
          collectionBursts={collectionBursts}
          openingEggIds={openingEggIds}
          highlightedEggIds={highlightedTutorialEggIds}
          mergeHintInstanceIds={[...new Set([...mergeHintInstanceIds, ...dragMergeTargetIds])]}
          environmentalHintInstanceIds={environmentalHintInstanceIds}
          mergeGestureHint={mergeGestureHint}
          onCreaturePointerDown={handleCreaturePointerDown}
          onEggPointerDown={handleEggPointerDown}
        />
        <div className="hudLayer">
        <CoinHud coins={model.state.coins} productionPerSecond={productionPerSecond} />
        <AccountButton syncStatus={syncStatus} />
        {model.state.currentMapId === 'map1' ? <EggTimer remainingSeconds={eggTimerSeconds} /> : null}
        <button
          className="portalDropZone"
          type="button"
          data-environment-id="portal"
          aria-label={model.state.portalState === 'open' ? 'Trocar mapa' : 'Portal'}
          onClick={handlePortalMapSwitch}
        />
        {model.state.currentMapId === 'map1' && model.state.portalState === 'dormant' ? (
          <div className="portalHint" aria-hidden="true" />
        ) : null}
        {model.state.currentMapId === 'map1' &&
        model.state.portalState !== 'dormant' &&
        model.state.portalState !== 'open' ? (
          <div
            className="portalMeter"
            aria-label="Energia do portal"
          >
            {model.state.portalState === 'cracked' ? (
              <span className="portalMeter__message">
                {model.state.portalRequestState === 'cooldown'
                  ? `Próximo pedido em ${formatShortTimer(portalRequestCooldownSeconds)}`
                  : portalRequestDefinition && portalRequest
                    ? `Requer: ${portalRequestDefinition.name} ${portalRequest.deliveredCount}/${portalRequest.requiredCount}`
                    : 'O portal está faminto...'}
              </span>
            ) : model.state.portalState === 'awaiting_transition' ? (
              <span className="portalMeter__message">Portal estabilizado. Uma anomalia precisa atravessá-lo.</span>
            ) : null}
            <p>
              <strong>
                {model.state.portalEnergy}/{model.state.portalEnergyRequired}
              </strong>
            </p>
            <i
              style={
                {
                  '--portal-progress': `${portalProgress}%`,
                } as React.CSSProperties
              }
            />
          </div>
        ) : null}
        {model.toast ? <p className="toast" role="status">{model.toast}</p> : null}
        {tutorialMessage && !hasBlockingModal ? (
          <p className={`guidedTutorialPrompt guidedTutorialPrompt--${guidedTutorialStep}`}>
            {tutorialMessage}
          </p>
        ) : null}

        {model.state.currentMapId === 'map1' ? (
        <div className="actionBar">
          <BuyCreatureButton
            isHighlighted={guidedTutorialStep === 'buyEgg'}
            onBuy={() => {
              if (guidedTutorialStep !== 'done' && guidedTutorialStep !== 'buyEgg') return;
              setIsShopOpen(true);
            }}
          />
        </div>
        ) : null}

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
              <img src="/ui/sell.png" alt="" />
            </span>
            <span>Vender</span>
            <small>{isSellMode ? 'Ativo' : '15%'}</small>
          </button>
        </aside>

        <button className="resetButton" type="button" onClick={() => setIsResetConfirmOpen(true)}>
          <RotateCcw size={15} aria-hidden="true" />
          Resetar save
        </button>

        {dragState?.kind === 'creature' && draggedCreatureForHints ? (
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
              src={creatureDefinitions[draggedCreatureForHints.creatureId].image}
              alt=""
              decoding="async"
              onError={(event) => event.currentTarget.classList.add('is-missing')}
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
      </div>

      <section className="orientationGuard" role="status" aria-live="polite">
        <div className="orientationGuard__phone" aria-hidden="true">
          <span />
        </div>
        <h2>Vire o celular para jogar</h2>
        <p>Anomalias Cósmicas foi pensado para funcionar em modo vertical.</p>
      </section>

      {isDexOpen ? (
        <Dex
          discoveredCreatureIds={model.state.discoveredCreatureIds}
          onClose={() => setIsDexOpen(false)}
        />
      ) : null}

      {isShopOpen ? (
        <AnomalyShop
          coins={model.state.coins}
          isFull={isBoardFull}
          state={model.state}
          tutorialCreatureId={guidedTutorialStep === 'buyEgg' ? 'nebulo' : null}
          onBuyCreatureEgg={(creatureId) => {
            dispatch({ type: 'buyCreatureEgg', creatureId });
            setIsShopOpen(false);
          }}
          onClose={() => setIsShopOpen(false)}
        />
      ) : null}

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

      {isCloudSavePromptOpen ? (
        <div className="modalBackdrop" role="presentation">
          <section
            className="modal cloudSavePrompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cloud-save-title"
          >
            <span className="cloudSavePrompt__icon" aria-hidden="true">
              <Cloud size={28} />
            </span>
            <p className="modal__eyebrow">Salvar progresso</p>
            <h2 id="cloud-save-title">Proteger seu universo?</h2>
            <p>
              Conecte sua conta Google para manter seu save seguro e continuar de onde parou em
              outro dispositivo.
            </p>
            <div className="cloudSavePrompt__actions">
              <button
                className="primaryButton"
                type="button"
                disabled={isCloudSavePromptSigningIn}
                onClick={handleCloudPromptSignIn}
              >
                {isCloudSavePromptSigningIn ? 'Abrindo...' : 'Conectar Google'}
              </button>
              <button
                className="secondaryButton"
                type="button"
                disabled={isCloudSavePromptSigningIn}
                onClick={() => {
                  setIsCloudSavePromptOpen(false);
                  dispatch({ type: 'dismissCloudSavePrompt' });
                }}
              >
                Agora não
              </button>
            </div>
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
                  setIsShopOpen(false);
                  setIsSellMode(false);
                  setPendingSale(null);
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
          isRewardedAdAvailable={isRewardedAdAvailable}
          isPending={isRewardedAdPending || hasClaimedOfflineRewardRef.current}
          rewardedAdMessage={rewardedAdMessage}
          onCollect={() => handleOfflineRewardCollect(1)}
          onCollectDouble={handleRewardedOfflineReward}
        />
      ) : null}
    </main>
  );
}

export default App;
