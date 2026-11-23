import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Gem, Heart, RotateCcw, Sparkles, Star, Volume2, X, Zap } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import {
  calculateComboMultiplier,
  calculateLessonRewards,
  computeFreeRecallHintedBonus,
  gradeAnswer,
} from '../../core';
import { getCourse, getPlayableNodeExercises, getUnitById, getVocabCard } from '../../curriculum';
import { playSfx, speakPhrase, stopSpeech } from '../../audio';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import { MascotStage } from '../characters/MascotStage';
import { SkyCatcherArcade } from '../arcade/SkyCatcherArcade';
import { AmbientBackdrop } from '../fx/AmbientBackdrop';
import { ConfettiBurst, CountUpTicker, FloatingPopToast, type PopToastItem } from '../fx/JuiceEngine';
import { safeVaultActions } from '../shell/vaultSafeActions';
import {
  HEART_ELIXIR_COST_GEMS,
  LANGUAGE_META,
  PROFICIENCY_TIER_META,
  isAdultLanguage,
  type AccentCoaching,
  type ArticleCoaching,
  type CharacterPose,
  type HintTier,
  type LanguageCode,
  type LessonExercise,
  type MapNode,
} from '../../types/contracts';
import { BossGauntletView } from './BossGauntletView';
import { ContextClozeView } from './ContextClozeView';
import { DiscoveryCardView } from './DiscoveryCardView';
import { ListenDecodeView } from './ListenDecodeView';
import { MiniStoryView } from './MiniStoryView';
import { PairMatchRushView } from './PairMatchRushView';
import { WordBankView, type ExerciseDraftPayload } from './WordBankView';
import {
  resolveNodeProficiencyTier,
  resolveUnitOrderFromId,
  useCompactViewport,
} from './lessonHelpers';

interface FeedbackBannerState {
  kind: 'correct' | 'accent' | 'nudge';
  headline: string;
  detail?: string;
  expectedText?: string;
  accentCoaching?: AccentCoaching;
  articleCoaching?: ArticleCoaching;
  speakText?: string;
  phonetic?: string;
}

export interface LessonArenaProps {
  node: MapNode;
  language: LanguageCode;
  onExit: () => void;
}

export function LessonArena({ node, language, onExit }: LessonArenaProps) {
  const { activeProfile, activeProgress } = useVaultStore();
  const compact = useCompactViewport();
  const langDir = LANGUAGE_META[language].dir;
  const activeUnit = getUnitById(language, node.unitId);
  const nodeTier = resolveNodeProficiencyTier(node, activeUnit);
  const tierMeta = PROFICIENCY_TIER_META[nodeTier];
  const scaffoldingMode = tierMeta.scaffoldingMode;
  const unitOrder = activeUnit?.order ?? resolveUnitOrderFromId(node.unitId);
  const isUnit16Boss = node.nodeType === 'boss' && unitOrder >= 16;

  const [replayNonce, setReplayNonce] = useState(0);
  const [sessionExercises, setSessionExercises] = useState<LessonExercise[]>(() => {
    const pooled = getPlayableNodeExercises(
      language,
      node.id,
      activeProgress.seenExerciseIds,
      false,
      activeProgress.hintAssistedCounts
    );
    return pooled.length > 0 ? pooled : node.exercises;
  });
  const [chestWasAlreadyClaimed, setChestWasAlreadyClaimed] = useState<boolean>(() =>
    activeProgress.claimedChestIds.includes(node.id)
  );

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [bossTurnIndex, setBossTurnIndex] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [extraGems, setExtraGems] = useState(0);
  const [freeRecallCount, setFreeRecallCount] = useState(0);
  const [freeRecallHintTiers, setFreeRecallHintTiers] = useState<HintTier[]>([]);
  const [maxHintTierUsed, setMaxHintTierUsed] = useState<HintTier>(0);
  const [hintPulseNonce, setHintPulseNonce] = useState(0);
  const [boosterAppliedAtWin, setBoosterAppliedAtWin] = useState(false);
  const [draft, setDraft] = useState<ExerciseDraftPayload | null>(null);
  const [feedback, setFeedback] = useState<FeedbackBannerState | null>(null);
  const [lessonWon, setLessonWon] = useState(false);
  const [chestClaimed, setChestClaimed] = useState(false);
  const [inRecoveryArcade, setInRecoveryArcade] = useState(false);
  const [pointerTarget, setPointerTarget] = useState<{ x: number; y: number } | null>(null);
  const [popToasts, setPopToasts] = useState<PopToastItem[]>([]);
  const [burstActive, setBurstActive] = useState(false);
  const [revealedStars, setRevealedStars] = useState(0);

  const savedNodeRef = useRef(false);
  const toastCounterRef = useRef(0);
  const seenAtStartRef = useRef<readonly string[] | undefined>(activeProgress.seenExerciseIds);
  const hintAssistedAtStartRef = useRef<Record<string, number> | undefined>(
    activeProgress.hintAssistedCounts
  );
  const claimedAtStartRef = useRef<readonly string[]>(activeProgress.claimedChestIds);
  const boosterChargesRef = useRef<number>(activeProfile.xpBoosterCharges ?? 0);
  const exerciseHintsRef = useRef<Record<string, number>>({});

  seenAtStartRef.current = activeProgress.seenExerciseIds;
  hintAssistedAtStartRef.current = activeProgress.hintAssistedCounts;
  claimedAtStartRef.current = activeProgress.claimedChestIds;
  boosterChargesRef.current = activeProfile.xpBoosterCharges ?? 0;

  // Play whoosh transition when entering arena & stop lingering speech on unmount
  useEffect(() => {
    playSfx('whoosh_transition');
    return () => {
      stopSpeech();
    };
  }, []);

  // Re-initialize run state & pull fresh non-repeating exercises when node/language/replayNonce changes
  useEffect(() => {
    const isReplay = replayNonce > 0;
    const pooled = getPlayableNodeExercises(
      language,
      node.id,
      seenAtStartRef.current,
      isReplay,
      hintAssistedAtStartRef.current
    );
    setSessionExercises(pooled.length > 0 ? pooled : node.exercises);
    setChestWasAlreadyClaimed(claimedAtStartRef.current.includes(node.id));
    setExerciseIndex(0);
    setBossTurnIndex(0);
    setComboCount(0);
    setMaxCombo(0);
    setMistakesCount(0);
    setExtraGems(0);
    setFreeRecallCount(0);
    setFreeRecallHintTiers([]);
    setMaxHintTierUsed(0);
    setHintPulseNonce(0);
    setBoosterAppliedAtWin(false);
    setDraft(null);
    setFeedback(null);
    setLessonWon(false);
    setChestClaimed(false);
    setInRecoveryArcade(false);
    setBurstActive(false);
    setRevealedStars(0);
    savedNodeRef.current = false;
    exerciseHintsRef.current = {};
  }, [node.id, node.exercises, language, replayNonce]);

  const pushPopToast = useCallback((label: string, tone: PopToastItem['tone']) => {
    const id = `toast-${++toastCounterRef.current}`;
    setPopToasts((prev) => [...prev.slice(-2), { id, label, tone }]);
    window.setTimeout(() => {
      setPopToasts((prev) => prev.filter((item) => item.id !== id));
    }, 1150);
  }, []);

  const triggerMiniConfetti = useCallback(() => {
    setBurstActive(false);
    window.setTimeout(() => setBurstActive(true), 10);
    window.setTimeout(() => setBurstActive(false), 1200);
  }, []);

  const exercises = sessionExercises;
  const currentExercise = exercises[exerciseIndex];
  const isChestNode = node.nodeType === 'chest' && exercises.length === 0;
  const requiresHearts = node.nodeType === 'lesson' || node.nodeType === 'boss';
  const showZeroHeartModal =
    requiresHearts && activeProfile.hearts <= 0 && !lessonWon && !inRecoveryArcade && !isChestNode;

  const victoryRewards = useMemo(() => {
    const raw = calculateLessonRewards({
      baseXp: node.xpReward,
      baseGems: node.gemReward + extraGems,
      maxCombo,
      mistakesCount,
      ...(freeRecallCount > 0 ? { freeRecallCount } : {}),
      ...(freeRecallHintTiers.length > 0 ? { freeRecallHintTiers } : {}),
      ...(maxHintTierUsed > 0 ? { maxHintTierUsed } : {}),
    } as Parameters<typeof calculateLessonRewards>[0]);
    const hasBoost = lessonWon ? boosterAppliedAtWin : (activeProfile.xpBoosterCharges ?? 0) > 0;
    return {
      ...raw,
      xpEarned: hasBoost ? raw.xpEarned * 2 : raw.xpEarned,
      boostApplied: hasBoost,
    };
  }, [
    node.xpReward,
    node.gemReward,
    extraGems,
    maxCombo,
    mistakesCount,
    freeRecallCount,
    freeRecallHintTiers,
    maxHintTierUsed,
    lessonWon,
    boosterAppliedAtWin,
    activeProfile.xpBoosterCharges,
  ]);

  // Staggered star pop celebration on victory
  useEffect(() => {
    if (!lessonWon) {
      setRevealedStars(0);
      return;
    }
    const timers: number[] = [];
    for (let s = 1; s <= victoryRewards.stars; s++) {
      const idx = s;
      const t = window.setTimeout(() => {
        setRevealedStars(idx);
        playSfx('star_pop', idx - 1);
      }, idx * 210);
      timers.push(t);
    }
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [lessonWon, victoryRewards.stars]);

  const finalizeVictory = useCallback(
    (
      finalMaxCombo: number,
      finalMistakes: number,
      bonusGems: number,
      finalFreeRecallCount: number,
      finalFreeRecallHintTiers?: HintTier[],
      finalMaxHintTier?: HintTier
    ) => {
      if (!savedNodeRef.current) {
        savedNodeRef.current = true;
        const hadBooster = boosterChargesRef.current > 0;
        setBoosterAppliedAtWin(hadBooster);
        const usedRecallTiers = finalFreeRecallHintTiers ?? freeRecallHintTiers;
        const usedMaxHintTier = finalMaxHintTier ?? maxHintTierUsed;
        const rewards = calculateLessonRewards({
          baseXp: node.xpReward,
          baseGems: node.gemReward + bonusGems,
          maxCombo: finalMaxCombo,
          mistakesCount: finalMistakes,
          ...(finalFreeRecallCount > 0 ? { freeRecallCount: finalFreeRecallCount } : {}),
          ...(usedRecallTiers.length > 0 ? { freeRecallHintTiers: usedRecallTiers } : {}),
          ...(usedMaxHintTier > 0 ? { maxHintTierUsed: usedMaxHintTier } : {}),
        } as Parameters<typeof calculateLessonRewards>[0]);
        vaultActions.recordSeenExercises(
          language,
          exercises.map((ex) => ex.id),
          exerciseHintsRef.current
        );
        vaultActions.completeMapNode({
          language,
          nodeId: node.id,
          stars: rewards.stars,
          xpEarned: rewards.xpEarned,
          gemsEarned: rewards.gemsEarned,
          unlockedVocabIds: node.rewardVocabIds,
          maxCombo: finalMaxCombo,
          isStory: node.nodeType === 'story',
          isBoss: node.nodeType === 'boss',
          isChest: node.nodeType === 'chest',
        });

        if (node.checkpointTargetTier) {
          const course = getCourse(language);
          const sortedUnits = [...course.units].sort((a, b) => a.order - b.order);
          const targetOrder = PROFICIENCY_TIER_META[node.checkpointTargetTier].unitRange[0];
          const targetUnitIndex = Math.max(
            0,
            sortedUnits.findIndex((u) => u.order >= targetOrder)
          );
          const prerequisiteNodeIds = sortedUnits
            .filter((u) => u.order < targetOrder)
            .flatMap((u) => u.nodes.map((n) => n.id));
          safeVaultActions.unlockProficiencyTier({
            language,
            targetTier: node.checkpointTargetTier,
            prerequisiteNodeIds,
            targetUnitIndex,
          });
          playSfx('tier_unlock');
        } else if (isUnit16Boss) {
          playSfx('laureate_fanfare');
        } else {
          playSfx('unit_fanfare');
        }
      }
      setLessonWon(true);
    },
    [language, node, exercises, isUnit16Boss, freeRecallHintTiers, maxHintTierUsed]
  );

  const handleExerciseHintUsed = useCallback(
    ({ exerciseId, tier }: { exerciseId: string; tier: 1 | 2 | 3; hintsUsed: number }) => {
      setHintPulseNonce((n) => n + 1);
      setMaxHintTierUsed((prev) => (tier > prev ? tier : prev));
      exerciseHintsRef.current[exerciseId] = (exerciseHintsRef.current[exerciseId] ?? 0) + 1;
      safeVaultActions.recordHintUsed();
    },
    []
  );

  const advanceExercise = useCallback(
    (
      overrideMaxCombo?: number,
      overrideMistakes?: number,
      overrideExtraGems?: number,
      overrideFreeRecall?: number,
      overrideFreeRecallHintTiers?: HintTier[],
      overrideMaxHintTier?: HintTier
    ) => {
      setDraft(null);
      setFeedback(null);
      setBossTurnIndex(0);
      if (exerciseIndex + 1 >= exercises.length) {
        finalizeVictory(
          overrideMaxCombo ?? maxCombo,
          overrideMistakes ?? mistakesCount,
          overrideExtraGems ?? extraGems,
          overrideFreeRecall ?? freeRecallCount,
          overrideFreeRecallHintTiers,
          overrideMaxHintTier
        );
      } else {
        setExerciseIndex((i) => i + 1);
      }
    },
    [
      exerciseIndex,
      exercises.length,
      finalizeVictory,
      maxCombo,
      mistakesCount,
      extraGems,
      freeRecallCount,
    ]
  );

  const handleCheck = useCallback(() => {
    if (!draft || feedback) return;
    const isReverseDirection =
      (currentExercise?.type === 'word_bank' && currentExercise.direction === 'to_english') ||
      (currentExercise?.type === 'listen_decode' && currentExercise.mode === 'select_meaning');
    const gradingLanguage: LanguageCode = isReverseDirection
      ? language === 'ebonics'
        ? 'suburban'
        : language === 'suburban'
          ? 'ebonics'
          : isAdultLanguage(language)
            ? language
            : 'en'
      : language;
    const result = gradeAnswer({
      submitted: draft.submitted,
      expected: draft.expected,
      accepted: draft.accepted,
      language: gradingLanguage,
      expectedArticle: draft.expectedArticle,
    });

    if (result.isCorrect) {
      const nextCombo = comboCount + 1;
      const nextMax = Math.max(maxCombo, nextCombo);
      const comboMeta = calculateComboMultiplier(nextCombo);
      setComboCount(nextCombo);
      setMaxCombo(nextMax);

      vaultActions.recordAnswerOutcome({
        isCorrect: true,
        comboCount: nextCombo,
        usedAccentCoaching: Boolean(result.accentCoaching),
      });

      if (currentExercise?.type === 'context_cloze') {
        safeVaultActions.recordClozeSolve();
      }

      if (draft.isFreeRecall) {
        safeVaultActions.recordFreeRecallSolve();
        setFreeRecallCount((c) => c + 1);
        setFreeRecallHintTiers((prev) => [...prev, draft.hintTierUsed ?? 0]);
      }

      const recallBonus = computeFreeRecallHintedBonus(draft.hintTierUsed ?? 0);

      if (result.accentCoaching) {
        if (draft.isFreeRecall) {
          playSfx('free_recall_ace');
          pushPopToast(
            `Free-Recall + Accent! +${recallBonus.xp} XP +${recallBonus.gems} Gems`,
            'accent'
          );
        } else {
          playSfx('accent_sparkle');
          pushPopToast('Golden Accent! +XP', 'accent');
        }
        triggerMiniConfetti();
        setFeedback({
          kind: 'accent',
          headline: draft.isFreeRecall
            ? 'Free-Recall + Accent Spotlight!'
            : 'Accent Spotlight! Spot-on!',
          detail: result.accentCoaching.friendlyTip,
          accentCoaching: result.accentCoaching,
          articleCoaching: result.articleCoaching,
          speakText: draft.speakOnResult,
          phonetic: draft.phoneticHint,
        });
      } else {
        if (draft.isFreeRecall) {
          playSfx('free_recall_ace');
          pushPopToast(
            `Free-Recall Ace! +${recallBonus.xp} XP +${recallBonus.gems} Gems`,
            'bonus'
          );
          triggerMiniConfetti();
        } else if (nextCombo >= 6) {
          playSfx('combo_fire', nextCombo);
          pushPopToast('ON FIRE! 2.0x', 'combo');
          triggerMiniConfetti();
        } else if (nextCombo === 5) {
          playSfx('combo_5x', nextCombo);
          pushPopToast('5x Streak!', 'combo');
          triggerMiniConfetti();
        } else if (nextCombo === 3) {
          playSfx('combo_3x', nextCombo);
          pushPopToast('3x Combo!', 'combo');
        } else {
          playSfx('correct_chime');
          pushPopToast('+XP!', 'xp');
        }

        setFeedback({
          kind: 'correct',
          headline: draft.isFreeRecall
            ? `Free-Recall Ace! (+${recallBonus.xp} XP / +${recallBonus.gems} Gems)`
            : comboMeta.label
              ? `${comboMeta.label} Great job!`
              : 'Nicely done!',
          detail:
            currentExercise?.type !== 'context_cloze' && draft.nuanceNote
              ? `Nuance: ${draft.nuanceNote}`
              : undefined,
          articleCoaching: result.articleCoaching,
          speakText: draft.speakOnResult,
          phonetic: draft.phoneticHint,
        });
      }
    } else {
      playSfx('gentle_nudge');
      setComboCount(0);
      setMistakesCount((m) => m + 1);
      vaultActions.recordAnswerOutcome({
        isCorrect: false,
        comboCount: 0,
      });
      setFeedback({
        kind: 'nudge',
        headline: 'Almost there!',
        detail: `Expected: ${draft.expected}`,
        expectedText: draft.expected,
        articleCoaching: result.articleCoaching,
        speakText: draft.speakOnResult,
        phonetic: draft.phoneticHint,
      });
    }
  }, [draft, feedback, language, comboCount, maxCombo, currentExercise, pushPopToast, triggerMiniConfetti]);

  const handleDiscoveryCollect = () => {
    if (!currentExercise || currentExercise.type !== 'discovery_card') return;
    const card = getVocabCard(language, currentExercise.vocabId);
    playSfx('flip_card');
    if (card) {
      void speakPhrase({
        text: card.foreignWithArticle || card.bareForeign,
        language,
        phonetic: card.phonetic,
      });
    }
    const nextCombo = comboCount + 1;
    const nextMax = Math.max(maxCombo, nextCombo);
    setComboCount(nextCombo);
    setMaxCombo(nextMax);
    pushPopToast('Sticker Collected!', 'bonus');
    vaultActions.recordAnswerOutcome({ isCorrect: true, comboCount: nextCombo });
    advanceExercise(nextMax, mistakesCount, extraGems);
  };

  const handleOpenChest = () => {
    if (chestClaimed) return;
    setChestClaimed(true);
    playSfx('chest_open');
    playSfx('unit_fanfare');
    if (!savedNodeRef.current) {
      savedNodeRef.current = true;
      vaultActions.completeMapNode({
        language,
        nodeId: node.id,
        stars: 3,
        xpEarned: node.xpReward,
        gemsEarned: chestWasAlreadyClaimed ? 0 : node.gemReward,
        unlockedVocabIds: node.rewardVocabIds,
        maxCombo: 0,
        isChest: true,
      });
    }
  };

  const comboMeta = calculateComboMultiplier(comboCount);

  const pipPose: CharacterPose = lessonWon
    ? 'victory_dance'
    : feedback?.kind === 'nudge'
      ? 'sympathetic'
      : feedback
        ? 'happy'
        : comboCount >= 5
          ? 'streak_fire'
          : currentExercise?.type === 'listen_decode'
            ? 'listening'
            : draft
              ? 'thinking'
              : 'idle';

  const progressPct = lessonWon
    ? 100
    : exercises.length > 0
      ? Math.round((exerciseIndex / exercises.length) * 100)
      : chestClaimed
        ? 100
        : 30;

  const showSideMascot =
    !compact &&
    !lessonWon &&
    !isChestNode &&
    !inRecoveryArcade &&
    currentExercise &&
    currentExercise.type !== 'boss_gauntlet' &&
    currentExercise.type !== 'mini_story';

  const usesStickyFooter =
    !lessonWon &&
    !isChestNode &&
    !inRecoveryArcade &&
    currentExercise &&
    (currentExercise.type === 'discovery_card' ||
      currentExercise.type === 'word_bank' ||
      currentExercise.type === 'context_cloze' ||
      currentExercise.type === 'listen_decode');

  return (
    <div
      className={`lesson-arena-shell ${comboCount >= 5 ? 'is-on-fire' : ''}`}
      role="region"
      aria-label={`Lesson: ${node.title}`}
      onPointerMove={(e) => setPointerTarget({ x: e.clientX, y: e.clientY })}
      onPointerLeave={() => setPointerTarget(null)}
    >
      <AmbientBackdrop theme={activeProfile.equippedCosmetics.theme ?? 'default'} />
      <ConfettiBurst
        active={lessonWon || chestClaimed || burstActive}
        intensity={lessonWon || chestClaimed ? 'grand' : 'medium'}
      />
      <FloatingPopToast items={popToasts} />

      {/* Top Lesson Header */}
      <header className="lesson-arena-header">
        <button
          type="button"
          className="tactile-btn tactile-btn-soft"
          style={{ padding: '7px 10px', borderRadius: 14 }}
          aria-label="Exit lesson"
          onClick={() => {
            stopSpeech();
            playSfx('whoosh_transition');
            onExit();
          }}
        >
          <X size={18} />
        </button>

        <div className="lesson-progress-track" aria-label="Lesson progress">
          <div className="lesson-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <span
          className="hud-pill hud-pill-static hud-hide-xs"
          style={{
            background: tierMeta.surfaceTint,
            borderColor: tierMeta.badgeColor,
            color: '#0f172a',
            fontWeight: 900,
          }}
        >
          {node.checkpointTargetTier
            ? `Checkpoint → ${PROFICIENCY_TIER_META[node.checkpointTargetTier].cefrLabel}`
            : `${tierMeta.cefrLabel} · ${tierMeta.title}`}
        </span>

        {replayNonce > 0 ? (
          <span
            className="hud-pill hud-pill-static"
            style={{
              background: 'var(--tint-indigo-bg)',
              borderColor: 'var(--tint-indigo-border)',
              color: 'var(--tint-indigo-ink)',
            }}
          >
            Remix
          </span>
        ) : null}

        {comboMeta.label ? (
          <span
            className="hud-pill hud-pill-static"
            style={{
              background: 'var(--tint-amber-bg)',
              borderColor: 'var(--tint-amber-border)',
              color: 'var(--tint-amber-ink)',
            }}
          >
            <Flame size={15} fill="#f59e0b" color="#f59e0b" />
            <span>{comboMeta.label}</span>
          </span>
        ) : null}

        <span
          className="hud-pill hud-pill-static"
          style={{
            background: 'var(--tint-rose-bg)',
            borderColor: 'var(--tint-rose-border)',
            color: 'var(--tint-rose-ink)',
          }}
          aria-label={`${activeProfile.hearts} of ${activeProfile.maxHearts} hearts`}
        >
          <Heart size={15} fill="#f43f5e" color="#f43f5e" />
          <span>
            {activeProfile.hearts}/{activeProfile.maxHearts}
          </span>
        </span>
      </header>

      {/* Main Centered Stage inside 100dvh */}
      <main
        className={`lesson-arena-stage ${
          currentExercise?.type === 'mini_story' || inRecoveryArcade ? 'is-top-aligned' : ''
        }`}
      >
        <div className="lesson-arena-stage-inner">
          {/* Recovery Arcade Inline Mode */}
          {inRecoveryArcade ? (
            <SkyCatcherArcade
              isHeartRecovery
              onResumeLesson={() => {
                setInRecoveryArcade(false);
                setFeedback(null);
              }}
              onExit={onExit}
            />
          ) : null}

          {/* Instant Treasure Chest Ceremony */}
          {!inRecoveryArcade && isChestNode ? (
            <motion.div
              animate={chestClaimed ? { rotate: [-3, 3, -2, 2, 0], scale: [0.95, 1.05, 1] } : {}}
              transition={{ duration: 0.36 }}
              className="tactile-card"
              style={{
                padding: compact ? 18 : 28,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                textAlign: 'center',
              }}
            >
              <MascotStage
                companionId="pip"
                pose={chestClaimed ? 'victory_dance' : 'happy'}
                equippedCosmetics={activeProfile.equippedCosmetics}
                pointerTarget={pointerTarget}
                size={compact ? 98 : 144}
                badgeText={
                  chestClaimed
                    ? chestWasAlreadyClaimed
                      ? 'Vault Re-Visited!'
                      : 'Treasure Claimed!'
                    : 'Milestone Chest!'
                }
              />
              <h2 style={{ margin: 0, fontSize: compact ? '1.25rem' : '1.55rem', fontWeight: 900, color: 'var(--text-main)' }}>
                {node.title}
              </h2>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-muted)' }}>{node.subtitle}</p>

              {!chestClaimed ? (
                <button
                  type="button"
                  className="tactile-btn tactile-btn-hero tactile-btn-amber"
                  onClick={handleOpenChest}
                >
                  <Sparkles size={20} />
                  <span>Open Treasure Chest!</span>
                </button>
              ) : (
                <>
                  {chestWasAlreadyClaimed ? (
                    <div
                      style={{
                        padding: '8px 14px',
                        borderRadius: 999,
                        background: 'var(--tint-indigo-bg)',
                        border: '2px solid var(--tint-indigo-border)',
                        color: 'var(--tint-indigo-ink)',
                        fontWeight: 900,
                      }}
                    >
                      Treasure Vault Re-Visited! (+Practice Sparkles)
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {!chestWasAlreadyClaimed ? (
                      <span
                        className="hud-pill hud-pill-static"
                        style={{
                          background: 'var(--tint-indigo-bg)',
                          borderColor: 'var(--tint-indigo-border)',
                          color: 'var(--tint-indigo-ink)',
                        }}
                      >
                        <Gem size={16} /> +{node.gemReward} Gems
                      </span>
                    ) : null}
                    <span
                      className="hud-pill hud-pill-static"
                      style={{
                        background: 'var(--tint-amber-bg)',
                        borderColor: 'var(--tint-amber-border)',
                        color: 'var(--tint-amber-ink)',
                      }}
                    >
                      <Star size={16} fill="#f59e0b" color="#f59e0b" /> +{node.xpReward} XP
                    </span>
                  </div>

                  {node.rewardVocabIds.length > 0 ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {node.rewardVocabIds.map((vid) => {
                        const card = getVocabCard(language, vid);
                        if (!card) return null;
                        return (
                          <div
                            key={vid}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 14,
                              background: 'var(--card-soft-bg)',
                              border: '2px solid var(--card-border)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <VocabIllustration
                              illustrationKey={card.illustrationKey}
                              language={language}
                              size={32}
                            />
                            <span
                              dir={langDir}
                              style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-main)' }}
                            >
                              {card.foreignWithArticle}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="tactile-btn tactile-btn-hero tactile-btn-success"
                    onClick={() => {
                      playSfx('whoosh_transition');
                      onExit();
                    }}
                  >
                    Claim & Return to Atlas
                  </button>
                </>
              )}
            </motion.div>
          ) : null}

          {/* Lesson Victory Summary */}
          {!inRecoveryArcade && !isChestNode && lessonWon ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="tactile-card"
              style={{
                padding: compact ? 14 : 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: compact ? 8 : 12,
                textAlign: 'center',
              }}
            >
              <MascotStage
                companionId="pip"
                pose="victory_dance"
                equippedCosmetics={activeProfile.equippedCosmetics}
                pointerTarget={pointerTarget}
                comboCount={maxCombo}
                size={compact ? 94 : 144}
                badgeText="Expedition Complete!"
              />

              <h2
                style={{
                  margin: 0,
                  fontSize: compact ? '1.25rem' : '1.6rem',
                  fontWeight: 900,
                  color: 'var(--tint-emerald-ink)',
                }}
              >
                {node.title} Complete!
              </h2>

              {/* Staggered 1..3 Stars */}
              <div
                style={{ display: 'flex', gap: 6 }}
                aria-label={`${victoryRewards.stars} out of 3 stars`}
              >
                {[1, 2, 3].map((idx) => {
                  const earned = idx <= victoryRewards.stars;
                  const popped = idx <= revealedStars;
                  return (
                    <motion.div
                      key={idx}
                      animate={popped ? { scale: [0.5, 1.3, 1] } : { scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 18 }}
                    >
                      <Star
                        size={compact ? 26 : 32}
                        color="#d97706"
                        fill={earned && popped ? '#fbbf24' : 'transparent'}
                      />
                    </motion.div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {node.checkpointTargetTier ? (
                  <span
                    className="hud-pill hud-pill-static"
                    style={{
                      background: 'var(--tint-emerald-bg)',
                      borderColor: 'var(--tint-emerald-border)',
                      color: 'var(--tint-emerald-ink)',
                    }}
                  >
                    <Sparkles size={15} /> Tier Unlocked:{' '}
                    {PROFICIENCY_TIER_META[node.checkpointTargetTier].cefrLabel}{' '}
                    {PROFICIENCY_TIER_META[node.checkpointTargetTier].title}!
                  </span>
                ) : null}
                <span
                  className="hud-pill hud-pill-static"
                  style={{
                    background: 'var(--tint-amber-bg)',
                    borderColor: 'var(--tint-amber-border)',
                    color: 'var(--tint-amber-ink)',
                  }}
                >
                  <Sparkles size={15} /> +<CountUpTicker target={victoryRewards.xpEarned} /> XP
                </span>
                {victoryRewards.boostApplied ? (
                  <span
                    className="hud-pill hud-pill-static"
                    style={{
                      background: 'var(--tint-indigo-bg)',
                      borderColor: 'var(--tint-indigo-border)',
                      color: 'var(--tint-indigo-ink)',
                    }}
                  >
                    <Zap size={14} /> 2x XP Boost!
                  </span>
                ) : null}
                <span
                  className="hud-pill hud-pill-static"
                  style={{
                    background: 'var(--tint-indigo-bg)',
                    borderColor: 'var(--tint-indigo-border)',
                    color: 'var(--tint-indigo-ink)',
                  }}
                >
                  <Gem size={15} /> +<CountUpTicker target={victoryRewards.gemsEarned} /> Gems
                </span>
                {maxCombo > 1 ? (
                  <span
                    className="hud-pill hud-pill-static"
                    style={{
                      background: 'var(--tint-amber-bg)',
                      borderColor: 'var(--tint-amber-border)',
                      color: 'var(--tint-amber-ink)',
                    }}
                  >
                    <Flame size={15} /> Best Combo: {maxCombo}x
                  </span>
                ) : null}
              </div>

              {node.rewardVocabIds.length > 0 ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {node.rewardVocabIds.slice(0, 4).map((vid) => {
                    const card = getVocabCard(language, vid);
                    if (!card) return null;
                    return (
                      <div
                        key={vid}
                        style={{
                          padding: '4px 9px',
                          borderRadius: 12,
                          background: 'var(--card-soft-bg)',
                          border: '2px solid var(--card-border)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <VocabIllustration
                          illustrationKey={card.illustrationKey}
                          language={language}
                          size={26}
                        />
                        <span
                          dir={langDir}
                          style={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--text-main)' }}
                        >
                          {card.foreignWithArticle}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="tactile-btn tactile-btn-hero tactile-btn-primary"
                  onClick={() => {
                    playSfx('whoosh_transition');
                    setReplayNonce((n) => n + 1);
                  }}
                >
                  <RotateCcw size={18} />
                  <span>Play Fresh Remix!</span>
                </button>

                <button
                  type="button"
                  className="tactile-btn tactile-btn-hero tactile-btn-success"
                  onClick={() => {
                    playSfx('whoosh_transition');
                    onExit();
                  }}
                >
                  Return to Atlas Map
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* Active Exercise Layout (Boss turnIndex preserved across Zero-Heart Recovery!) */}
          {!inRecoveryArcade && !isChestNode && !lessonWon && currentExercise ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                width: '100%',
                height: currentExercise.type === 'mini_story' ? '100%' : 'auto',
                minHeight: 0,
              }}
            >
              {showSideMascot ? (
                <div
                  style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <MascotStage
                    companionId="pip"
                    pose={pipPose}
                    equippedCosmetics={activeProfile.equippedCosmetics}
                    pointerTarget={pointerTarget}
                    comboCount={comboCount}
                    size={132}
                    hintPulseNonce={hintPulseNonce}
                  />
                </div>
              ) : null}

              <div
                style={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  height: currentExercise.type === 'mini_story' ? '100%' : 'auto',
                  minHeight: 0,
                }}
              >
                <motion.div
                  key={`${replayNonce}-${exerciseIndex}-${currentExercise.id}`}
                  initial={{ opacity: 0, y: 12, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{
                    width: '100%',
                    height: currentExercise.type === 'mini_story' ? '100%' : 'auto',
                    minHeight: 0,
                  }}
                >
                  {currentExercise.type === 'discovery_card' ? (
                    <DiscoveryCardView
                      exercise={currentExercise}
                      language={language}
                      vocabCard={getVocabCard(language, currentExercise.vocabId)}
                      compact={compact}
                      onTurtlePlay={() => vaultActions.recordTurtlePlay()}
                      onFluentPlay={() => safeVaultActions.recordFluentPlay()}
                    />
                  ) : null}

                  {currentExercise.type === 'word_bank' ? (
                    <WordBankView
                      exercise={currentExercise}
                      language={language}
                      compact={compact}
                      locked={Boolean(feedback)}
                      proficiencyTier={nodeTier}
                      scaffoldingMode={scaffoldingMode}
                      onTurtlePlay={() => vaultActions.recordTurtlePlay()}
                      onFluentPlay={() => safeVaultActions.recordFluentPlay()}
                      onDraftChange={setDraft}
                      onSubmitShortcut={handleCheck}
                      onHintUsed={handleExerciseHintUsed}
                    />
                  ) : null}

                  {currentExercise.type === 'context_cloze' ? (
                    <ContextClozeView
                      exercise={currentExercise}
                      language={language}
                      compact={compact}
                      locked={Boolean(feedback)}
                      revealed={Boolean(feedback)}
                      scaffoldingMode={scaffoldingMode}
                      onTurtlePlay={() => vaultActions.recordTurtlePlay()}
                      onFluentPlay={() => safeVaultActions.recordFluentPlay()}
                      onDraftChange={setDraft}
                      onHintUsed={handleExerciseHintUsed}
                    />
                  ) : null}

                  {currentExercise.type === 'listen_decode' ? (
                    <ListenDecodeView
                      exercise={currentExercise}
                      language={language}
                      compact={compact}
                      locked={Boolean(feedback)}
                      revealed={Boolean(feedback)}
                      scaffoldingMode={scaffoldingMode}
                      onTurtlePlay={() => vaultActions.recordTurtlePlay()}
                      onFluentPlay={() => safeVaultActions.recordFluentPlay()}
                      onDraftChange={setDraft}
                      onHintUsed={handleExerciseHintUsed}
                    />
                  ) : null}

                  {currentExercise.type === 'pair_match_rush' ? (
                    <PairMatchRushView
                      exercise={currentExercise}
                      language={language}
                      compact={compact}
                      onHintUsed={handleExerciseHintUsed}
                      onComplete={({ bonusEarned, maxRushCombo }) => {
                        const nextMax = Math.max(maxCombo, maxRushCombo);
                        const bonus = bonusEarned ? 5 : 0;
                        setMaxCombo(nextMax);
                        setExtraGems((g) => g + bonus);
                        advanceExercise(nextMax, mistakesCount, extraGems + bonus);
                      }}
                    />
                  ) : null}

                  {currentExercise.type === 'mini_story' ? (
                    <MiniStoryView
                      exercise={currentExercise}
                      language={language}
                      compact={compact}
                      scaffoldingMode={scaffoldingMode}
                      onTurtlePlay={() => vaultActions.recordTurtlePlay()}
                      onFluentPlay={() => safeVaultActions.recordFluentPlay()}
                      onHintUsed={handleExerciseHintUsed}
                      onComplete={() => advanceExercise()}
                    />
                  ) : null}

                  {currentExercise.type === 'boss_gauntlet' ? (
                    <BossGauntletView
                      exercise={currentExercise}
                      language={language}
                      compact={compact}
                      proficiencyTier={nodeTier}
                      scaffoldingMode={scaffoldingMode}
                      initialTurnIndex={bossTurnIndex}
                      onTurnIndexChange={setBossTurnIndex}
                      onTurtlePlay={() => vaultActions.recordTurtlePlay()}
                      onFluentPlay={() => safeVaultActions.recordFluentPlay()}
                      onHintUsed={handleExerciseHintUsed}
                      onTurnResult={({
                        isCorrect,
                        usedAccentCoaching,
                        usedFreeRecall,
                        hintTierUsed,
                      }) => {
                        if (isCorrect) {
                          const nextCombo = comboCount + 1;
                          setComboCount(nextCombo);
                          setMaxCombo((m) => Math.max(m, nextCombo));
                          if (usedFreeRecall) {
                            safeVaultActions.recordFreeRecallSolve();
                            setFreeRecallCount((c) => c + 1);
                            const recallTier: HintTier = hintTierUsed ?? 0;
                            const recallBonus = computeFreeRecallHintedBonus(recallTier);
                            setFreeRecallHintTiers((prev) => [...prev, recallTier]);
                            pushPopToast(
                              `Free-Recall Ace! +${recallBonus.xp} XP +${recallBonus.gems} Gems`,
                              'bonus'
                            );
                          } else {
                            pushPopToast(
                              usedAccentCoaching ? 'Golden Accent!' : 'Boss Hit!',
                              usedAccentCoaching ? 'accent' : 'combo'
                            );
                          }
                          vaultActions.recordAnswerOutcome({
                            isCorrect: true,
                            comboCount: nextCombo,
                            usedAccentCoaching,
                          });
                        } else {
                          setComboCount(0);
                          setMistakesCount((m) => m + 1);
                          vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
                        }
                      }}
                      onComplete={(bossGems) => {
                        const nextExtra = extraGems + bossGems;
                        setExtraGems(nextExtra);
                        advanceExercise(maxCombo, mistakesCount, nextExtra, freeRecallCount);
                      }}
                    />
                  ) : null}
                </motion.div>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Sticky Bottom Feedback & Check/Continue Bar */}
      {usesStickyFooter ? (
        <footer
          className={`lesson-arena-footer ${
            feedback?.kind === 'correct'
              ? 'is-correct'
              : feedback?.kind === 'accent'
                ? 'is-accent'
                : feedback?.kind === 'nudge'
                  ? 'is-nudge'
                  : ''
          }`}
        >
          <div className="lesson-arena-footer-inner">
            {currentExercise.type === 'discovery_card' ? (
              <>
                <span
                  className="hud-hide-xs"
                  style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.9rem' }}
                >
                  Listen & tap any word to peek, then collect your sticker!
                </span>
                <button
                  type="button"
                  className="tactile-btn tactile-btn-hero tactile-btn-success"
                  style={{ marginLeft: 'auto' }}
                  onClick={handleDiscoveryCollect}
                >
                  <Sparkles size={18} />
                  <span>Speak & Collect</span>
                </button>
              </>
            ) : feedback ? (
              <>
                <div style={{ flex: '1 1 220px', minWidth: 0, overflowWrap: 'break-word', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                      fontWeight: 900,
                      fontSize: '1rem',
                      color:
                        feedback.kind === 'correct'
                          ? 'var(--tint-emerald-ink)'
                          : feedback.kind === 'accent'
                            ? 'var(--tint-amber-ink)'
                            : 'var(--tint-rose-ink)',
                    }}
                  >
                    <span>{feedback.headline}</span>
                    {feedback.speakText ? (
                      <button
                        type="button"
                        className="tactile-btn tactile-btn-soft"
                        style={{ padding: '4px 9px', borderRadius: 10, fontSize: '0.78rem' }}
                        aria-label="Replay audio"
                        onClick={() => {
                          void speakPhrase({
                            text: feedback.speakText!,
                            language,
                            phonetic: feedback.phonetic,
                          });
                        }}
                      >
                        <Volume2 size={14} />
                        <span>Replay</span>
                      </button>
                    ) : null}
                  </div>

                  {feedback.accentCoaching ? (
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--tint-amber-ink)' }}>
                      Spell with accents:{' '}
                      <strong
                        dir={/[\u0600-\u06FF]/.test(feedback.accentCoaching.expected) ? 'rtl' : 'ltr'}
                        style={{ unicodeBidi: 'isolate' }}
                      >
                        {feedback.accentCoaching.expected}
                      </strong>{' '}
                      ({feedback.accentCoaching.highlightedChars.join(', ')}) —{' '}
                      {feedback.accentCoaching.friendlyTip}
                    </div>
                  ) : feedback.expectedText ? (
                    <div
                      dir="ltr"
                      style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}
                    >
                      Expected:{' '}
                      <strong
                        dir={/[\u0600-\u06FF]/.test(feedback.expectedText) ? 'rtl' : 'ltr'}
                        style={{ unicodeBidi: 'isolate' }}
                      >
                        {feedback.expectedText}
                      </strong>
                    </div>
                  ) : feedback.detail ? (
                    <div
                      dir="auto"
                      style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}
                    >
                      {feedback.detail}
                    </div>
                  ) : null}

                  {feedback.articleCoaching ? (
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--tint-indigo-ink)' }}>
                      Article Tip ({feedback.articleCoaching.article}):{' '}
                      {feedback.articleCoaching.note}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className={`tactile-btn tactile-btn-hero ${
                    feedback.kind === 'nudge' ? 'tactile-btn-rose' : 'tactile-btn-success'
                  }`}
                  onClick={() => {
                    playSfx('button_click');
                    advanceExercise();
                  }}
                >
                  Continue
                </button>
              </>
            ) : (
              <>
                <span
                  className="hud-hide-xs"
                  style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.88rem' }}
                >
                  Assemble your answer, then check!
                </span>
                <button
                  type="button"
                  className="tactile-btn tactile-btn-hero tactile-btn-primary"
                  style={{ marginLeft: 'auto' }}
                  disabled={!draft}
                  onClick={handleCheck}
                >
                  Check
                </button>
              </>
            )}
          </div>
        </footer>
      ) : null}

      {/* Zero-Heart Recovery Modal */}
      {showZeroHeartModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Recharge Hearts">
          <div className="modal-card" style={{ textAlign: 'center', maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <MascotStage
                companionId="pip"
                pose="sympathetic"
                equippedCosmetics={activeProfile.equippedCosmetics}
                size={124}
                badgeText={`0/${activeProfile.maxHearts} Hearts!`}
              />
            </div>
            <h2
              style={{
                margin: '0 0 6px',
                fontSize: '1.35rem',
                fontWeight: 900,
                color: 'var(--text-main)',
              }}
            >
              Pip’s Hearts Need a Recharge!
            </h2>
            <p style={{ margin: '0 0 14px', fontWeight: 700, color: 'var(--text-muted)' }}>
              No worries, explorer! Use a Heart Refill Elixir or hop into Sky-Catcher Fiesta to win
              back Hearts and bonus Gems!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {(activeProfile.heartElixirs ?? 0) > 0 ? (
                <button
                  type="button"
                  className="tactile-btn tactile-btn-hero tactile-btn-success"
                  onClick={() => {
                    const ok = safeVaultActions.useHeartElixir();
                    if (ok) {
                      playSfx('heart_win');
                      pushPopToast('Hearts Refilled!', 'bonus');
                      setFeedback(null);
                    }
                  }}
                >
                  <Sparkles size={18} />
                  <span>Use Heart Refill Elixir ({activeProfile.heartElixirs} in Pack)</span>
                </button>
              ) : null}

              <button
                type="button"
                className="tactile-btn tactile-btn-hero tactile-btn-rose"
                disabled={activeProfile.gems < HEART_ELIXIR_COST_GEMS}
                onClick={() => {
                  const ok = safeVaultActions.buyHeartElixir();
                  if (ok) {
                    playSfx('heart_win');
                    pushPopToast('Elixir Refilled Hearts!', 'bonus');
                    setFeedback(null);
                  } else {
                    playSfx('gentle_nudge');
                  }
                }}
              >
                <Gem size={17} />
                <span>Buy & Use Heart Refill Elixir ({HEART_ELIXIR_COST_GEMS} Gems)</span>
              </button>

              <button
                type="button"
                className="tactile-btn tactile-btn-hero tactile-btn-amber"
                onClick={() => {
                  playSfx('button_click');
                  setInRecoveryArcade(true);
                }}
              >
                <Heart size={18} fill="#ffffff" />
                <span>Play Sky-Catcher Fiesta to Recharge Hearts!</span>
              </button>
              <button
                type="button"
                className="tactile-btn tactile-btn-soft"
                onClick={() => {
                  playSfx('button_click');
                  onExit();
                }}
              >
                Back to Atlas Map
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
