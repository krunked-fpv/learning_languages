import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getSpeechRuntimeState,
  playHintMisplacedNudge,
  playHintStepChime,
  stopHintChimes,
} from '../../audio';
import {
  resolveChoiceHint,
  resolveFreeRecallHint,
  resolvePairMatchHint,
  resolveTileSequenceHint,
  type FreeRecallHintPlan,
  type HintPoolTile,
} from '../../core';
import type {
  HintControllerState,
  HintPresentationMode,
  HintTier,
  LanguageCode,
} from '../../types/contracts';

export interface TileHintConfig {
  pool: readonly HintPoolTile[];
  targetTokens: readonly string[];
  expectedSentence?: string;
  acceptedSentences?: readonly string[];
  selectedTileUids: readonly string[];
  language: LanguageCode;
  seed: string;
}

export interface FreeRecallHintConfig {
  typedText: string;
  expected: string;
  accepted?: readonly string[];
  targetTokens?: readonly string[];
  language: LanguageCode;
}

export interface ChoiceHintConfig {
  choices: readonly string[];
  expected: string;
  accepted?: readonly string[];
  language: LanguageCode;
  seed: string;
  selectedChoice?: string | null;
}

export interface PairMatchHintConfig {
  leftIds: readonly string[];
  matchedIds: readonly string[];
  selectedLeftId?: string | null;
  selectedRightId?: string | null;
}

export interface UseHintEngineOptions {
  promptKey: string;
  mode: HintPresentationMode;
  canHint: boolean;
  enableShortcut?: boolean;
  tileConfig?: TileHintConfig;
  freeRecallConfig?: FreeRecallHintConfig;
  choiceConfig?: ChoiceHintConfig;
  pairConfig?: PairMatchHintConfig;
  onHintTriggered?: (info: { tier: 1 | 2 | 3; hintsUsed: number }) => void;
  onCustomTrigger?: (tier: 1 | 2 | 3) => void;
}

export interface HintGlintArc {
  fromUid: string;
  toUid: string;
  key: string;
}

export interface UseHintEngineReturn extends HintControllerState {
  prefersReducedMotion: boolean;
  activeFlashUids: ReadonlySet<string>;
  peakFlashUid: string | null;
  lingerUid: string | null;
  stepNumbersByUid: ReadonlyMap<string, number>;
  misplacedPulseUids: ReadonlySet<string>;
  dimmedUids: ReadonlySet<string>;
  spotlightUid: string | null;
  spotlightZone: 'bank' | 'tray' | 'choice' | 'pair' | null;
  glintArc: HintGlintArc | null;
  freeRecallPlan: FreeRecallHintPlan | null;
  ghostFaded: boolean;
  revealWordCount: number;
  triggerHint: () => void;
  cancelHint: (opts?: { clearAssists?: boolean }) => void;
  resetHintState: () => void;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener?.(onChange);
    return () => mq.removeListener?.(onChange);
  }, []);

  return reduced;
}

function isSpeechBusy(): boolean {
  if (getSpeechRuntimeState().isSpeaking) return true;
  if (typeof window !== 'undefined') {
    try {
      const synth = (window as unknown as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
      if (synth?.speaking) return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function useHintEngine(options: UseHintEngineOptions): UseHintEngineReturn {
  const {
    promptKey,
    mode,
    canHint,
    enableShortcut = true,
    tileConfig,
    freeRecallConfig,
    choiceConfig,
    pairConfig,
    onHintTriggered,
    onCustomTrigger,
  } = options;

  const prefersReducedMotion = usePrefersReducedMotion();

  const [hintTier, setHintTier] = useState<HintTier>(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [targetSequence, setTargetSequence] = useState<readonly string[]>([]);

  const [activeFlashUids, setActiveFlashUids] = useState<ReadonlySet<string>>(() => new Set());
  const [peakFlashUid, setPeakFlashUid] = useState<string | null>(null);
  const [lingerUid, setLingerUid] = useState<string | null>(null);
  const [stepNumbersByUid, setStepNumbersByUid] = useState<ReadonlyMap<string, number>>(
    () => new Map()
  );
  const [misplacedPulseUids, setMisplacedPulseUids] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [dimmedUids, setDimmedUids] = useState<ReadonlySet<string>>(() => new Set());
  const [spotlightUid, setSpotlightUid] = useState<string | null>(null);
  const [spotlightZone, setSpotlightZone] = useState<'bank' | 'tray' | 'choice' | 'pair' | null>(
    null
  );
  const [glintArc, setGlintArc] = useState<HintGlintArc | null>(null);
  const [revealWordCount, setRevealWordCount] = useState(0);
  const [ghostFaded, setGhostFaded] = useState(false);

  const timersRef = useRef<Set<number>>(new Set());
  const rafRef = useRef<number | null>(null);
  const sequenceNonceRef = useRef(0);

  const clearPendingTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current.clear();
    if (rafRef.current !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);

  const cancelHint = useCallback(
    (opts?: { clearAssists?: boolean }) => {
      sequenceNonceRef.current += 1;
      clearPendingTimers();
      stopHintChimes();
      setIsAnimating(false);
      setActiveFlashUids(new Set());
      setPeakFlashUid(null);
      setLingerUid(null);
      setStepNumbersByUid(new Map());
      setMisplacedPulseUids(new Set());
      setGlintArc(null);
      setSpotlightUid(null);
      setSpotlightZone(null);
      if (opts?.clearAssists) {
        setDimmedUids(new Set());
      }
    },
    [clearPendingTimers]
  );

  const resetHintState = useCallback(() => {
    cancelHint({ clearAssists: true });
    setHintTier(0);
    setHintsUsed(0);
    setTargetSequence([]);
    setRevealWordCount(0);
    setGhostFaded(false);
  }, [cancelHint]);

  useEffect(() => {
    resetHintState();
  }, [promptKey, resetHintState]);

  useEffect(() => {
    return () => {
      clearPendingTimers();
      stopHintChimes();
    };
  }, [clearPendingTimers]);

  const freeRecallPlan = useMemo<FreeRecallHintPlan | null>(() => {
    if (mode !== 'free_recall' || !freeRecallConfig || hintTier === 0) {
      return null;
    }
    return resolveFreeRecallHint({
      ...freeRecallConfig,
      tier: hintTier,
      revealWordCount,
    });
  }, [mode, freeRecallConfig, hintTier, revealWordCount]);

  const triggerHint = useCallback(() => {
    if (!canHint || mode === 'none') return;

    const nextTier = Math.min(3, hintTier + 1) as 1 | 2 | 3;
    const nextHintsUsed = hintsUsed + 1;

    // Cancel any running timers/audio before starting fresh choreography
    sequenceNonceRef.current += 1;
    const runNonce = sequenceNonceRef.current;
    clearPendingTimers();
    stopHintChimes();
    setActiveFlashUids(new Set());
    setPeakFlashUid(null);
    setLingerUid(null);
    setStepNumbersByUid(new Map());
    setMisplacedPulseUids(new Set());
    setGlintArc(null);

    setHintTier(nextTier);
    setHintsUsed(nextHintsUsed);
    onHintTriggered?.({ tier: nextTier, hintsUsed: nextHintsUsed });

    if (mode === 'word_bank_tiles' || mode === 'listen_assemble') {
      if (!tileConfig) return;
      if (mode === 'listen_assemble') {
        onCustomTrigger?.(nextTier);
      }

      const plan = resolveTileSequenceHint({
        ...tileConfig,
        tier: nextTier,
      });
      setTargetSequence(plan.targetTokens);
      setDimmedUids(new Set(plan.dimmedBankUids));
      setSpotlightUid(plan.spotlightUid);
      setSpotlightZone(plan.spotlightZone);

      if (plan.alreadyComplete) {
        setIsAnimating(false);
        return;
      }

      const hasMisplaced = plan.misplacedTrayUids.length > 0;
      const misplacedDelay = hasMisplaced ? (prefersReducedMotion ? 420 : 520) : 0;

      if (hasMisplaced) {
        setIsAnimating(true);
        setMisplacedPulseUids(new Set(plan.misplacedTrayUids));
        playHintMisplacedNudge(isSpeechBusy());
        scheduleTimeout(() => {
          if (sequenceNonceRef.current !== runNonce) return;
          setMisplacedPulseUids(new Set());
        }, misplacedDelay);
      }

      const seq = plan.remainingBankUids;
      if (seq.length === 0) {
        if (hasMisplaced) {
          scheduleTimeout(() => {
            if (sequenceNonceRef.current !== runNonce) return;
            setIsAnimating(false);
          }, misplacedDelay + 60);
        } else {
          setIsAnimating(false);
        }
        return;
      }

      setIsAnimating(true);
      const stepCadenceMs = nextTier === 1 ? 300 : nextTier === 2 ? 380 : 340;
      const holdMs = nextTier === 1 ? 440 : nextTier === 2 ? 540 : 480;

      const stepsMap = new Map<string, number>();
      seq.forEach((uid, idx) => {
        stepsMap.set(uid, idx + 1);
      });

      if (prefersReducedMotion) {
        if (misplacedDelay === 0) {
          setStepNumbersByUid(stepsMap);
        } else {
          scheduleTimeout(() => {
            if (sequenceNonceRef.current !== runNonce) return;
            setStepNumbersByUid(stepsMap);
          }, misplacedDelay);
        }
      }

      if (nextTier === 2 && seq[0]) {
        scheduleTimeout(() => {
          if (sequenceNonceRef.current !== runNonce) return;
          setLingerUid(seq[0]);
        }, misplacedDelay);
      }

      seq.forEach((uid, idx) => {
        const startAt = misplacedDelay + idx * stepCadenceMs;
        scheduleTimeout(() => {
          if (sequenceNonceRef.current !== runNonce) return;
          setActiveFlashUids((prev) => {
            const next = new Set(prev);
            next.add(uid);
            return next;
          });
          setPeakFlashUid(uid);
          if (!prefersReducedMotion && idx > 0) {
            const prevUid = seq[idx - 1];
            setGlintArc({
              fromUid: prevUid,
              toUid: uid,
              key: `${promptKey}:${runNonce}:${idx}`,
            });
            scheduleTimeout(() => {
              if (sequenceNonceRef.current !== runNonce) return;
              setGlintArc((cur) => (cur?.toUid === uid ? null : cur));
            }, Math.min(320, stepCadenceMs));
          }
          playHintStepChime(idx, seq.length, nextTier, isSpeechBusy());
        }, startAt);

        scheduleTimeout(() => {
          if (sequenceNonceRef.current !== runNonce) return;
          setActiveFlashUids((prev) => {
            if (!prev.has(uid)) return prev;
            const next = new Set(prev);
            next.delete(uid);
            return next;
          });
          setPeakFlashUid((cur) => (cur === uid ? null : cur));
        }, startAt + holdMs);
      });

      const lastStart = misplacedDelay + (seq.length - 1) * stepCadenceMs;
      const lingerExtra = nextTier === 2 ? 420 : prefersReducedMotion ? 560 : 80;
      scheduleTimeout(() => {
        if (sequenceNonceRef.current !== runNonce) return;
        setActiveFlashUids(new Set());
        setPeakFlashUid(null);
        setLingerUid(null);
        setGlintArc(null);
        setStepNumbersByUid(new Map());
        setIsAnimating(false);
      }, lastStart + holdMs + lingerExtra);
      return;
    }

    if (mode === 'free_recall') {
      if (!freeRecallConfig) return;
      const nextReveal = nextTier >= 3 ? revealWordCount + 1 : 0;
      if (nextTier >= 3) {
        setRevealWordCount(nextReveal);
      } else {
        setRevealWordCount(0);
      }
      setGhostFaded(false);

      const plan = resolveFreeRecallHint({
        ...freeRecallConfig,
        tier: nextTier,
        revealWordCount: nextReveal,
      });
      setTargetSequence(plan.targetWords);
      setIsAnimating(true);

      if (!isSpeechBusy()) {
        const chimeCount = Math.min(
          3,
          Math.max(1, plan.targetWords.length - plan.validWordPrefixCount)
        );
        for (let i = 0; i < chimeCount; i += 1) {
          scheduleTimeout(() => {
            if (sequenceNonceRef.current !== runNonce) return;
            playHintStepChime(i, chimeCount, nextTier, isSpeechBusy());
          }, i * 150);
        }
      }

      if (nextTier === 2) {
        scheduleTimeout(() => {
          if (sequenceNonceRef.current !== runNonce) return;
          setGhostFaded(true);
        }, 1800);
      }

      scheduleTimeout(() => {
        if (sequenceNonceRef.current !== runNonce) return;
        setIsAnimating(false);
      }, 520);
      return;
    }

    if (mode === 'multiple_choice' || mode === 'listen_meaning') {
      if (mode === 'listen_meaning') {
        onCustomTrigger?.(nextTier);
      }
      if (!choiceConfig) {
        setIsAnimating(false);
        return;
      }
      const plan = resolveChoiceHint({
        ...choiceConfig,
        tier: nextTier,
      });
      setTargetSequence([choiceConfig.expected]);
      setDimmedUids(new Set(plan.dimmedChoices));
      setSpotlightUid(plan.spotlightChoice);
      setSpotlightZone(plan.spotlightChoice ? 'choice' : null);
      setIsAnimating(true);
      playHintStepChime(0, 1, nextTier, isSpeechBusy());
      scheduleTimeout(() => {
        if (sequenceNonceRef.current !== runNonce) return;
        setIsAnimating(false);
      }, 420);
      return;
    }

    if (mode === 'pair_match') {
      if (!pairConfig) return;
      const plan = resolvePairMatchHint({
        ...pairConfig,
        tier: nextTier,
      });
      setDimmedUids(new Set(plan.dimmedPairIds));
      if (!plan.targetPairId) {
        setSpotlightUid(null);
        setSpotlightZone(null);
        setIsAnimating(false);
        return;
      }
      setTargetSequence([plan.targetPairId]);
      setActiveFlashUids(new Set([plan.targetPairId]));
      setSpotlightUid(plan.sustainSpotlight ? plan.targetPairId : null);
      setSpotlightZone(plan.sustainSpotlight ? 'pair' : null);
      setIsAnimating(true);
      playHintStepChime(0, 2, nextTier, isSpeechBusy());
      scheduleTimeout(() => {
        if (sequenceNonceRef.current !== runNonce) return;
        playHintStepChime(1, 2, nextTier, isSpeechBusy());
      }, 95);
      scheduleTimeout(() => {
        if (sequenceNonceRef.current !== runNonce) return;
        setActiveFlashUids(new Set());
        setIsAnimating(false);
      }, 1400);
      return;
    }

    if (mode === 'story_bubble' || mode === 'arcade_target') {
      onCustomTrigger?.(nextTier);
      setIsAnimating(true);
      playHintStepChime(0, 1, nextTier, isSpeechBusy());
      scheduleTimeout(() => {
        if (sequenceNonceRef.current !== runNonce) return;
        setIsAnimating(false);
      }, 420);
    }
  }, [
    canHint,
    mode,
    hintTier,
    hintsUsed,
    tileConfig,
    freeRecallConfig,
    choiceConfig,
    pairConfig,
    revealWordCount,
    prefersReducedMotion,
    promptKey,
    clearPendingTimers,
    scheduleTimeout,
    onHintTriggered,
    onCustomTrigger,
  ]);

  // Accessible keyboard shortcut: H in tile/choice mode, Alt+H everywhere (including text inputs)
  useEffect(() => {
    if (!enableShortcut || !canHint || mode === 'none' || typeof window === 'undefined') {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      if (e.key.toLowerCase() !== 'h') return;

      const target = e.target as HTMLElement | null;
      const isEditable = Boolean(
        target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
      );

      if (e.altKey) {
        e.preventDefault();
        triggerHint();
        return;
      }

      if (isEditable) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      e.preventDefault();
      triggerHint();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enableShortcut, canHint, mode, triggerHint]);

  return {
    hintTier,
    hintsUsed,
    isAnimating,
    canHint,
    targetSequence,
    prefersReducedMotion,
    activeFlashUids,
    peakFlashUid,
    lingerUid,
    stepNumbersByUid,
    misplacedPulseUids,
    dimmedUids,
    spotlightUid,
    spotlightZone,
    glintArc,
    freeRecallPlan,
    ghostFaded,
    revealWordCount,
    triggerHint,
    cancelHint,
    resetHintState,
  };
}
