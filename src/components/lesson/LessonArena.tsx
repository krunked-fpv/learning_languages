import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Gem, Heart, RotateCcw, Sparkles, Star, Volume2, X } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import {
  calculateComboMultiplier,
  calculateLessonRewards,
  gradeAnswer,
} from '../../core';
import { getPlayableNodeExercises, getVocabCard } from '../../curriculum';
import { playSfx, speakPhrase, stopSpeech } from '../../audio';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import { MascotStage } from '../characters/MascotStage';
import { SkyCatcherArcade } from '../arcade/SkyCatcherArcade';
import { ConfettiBurst, CountUpTicker, FloatingPopToast, type PopToastItem } from '../fx/JuiceEngine';
import type {
  AccentCoaching,
  ArticleCoaching,
  CharacterPose,
  LanguageCode,
  LessonExercise,
  MapNode,
} from '../../types/contracts';
import { BossGauntletView } from './BossGauntletView';
import { DiscoveryCardView } from './DiscoveryCardView';
import { ListenDecodeView } from './ListenDecodeView';
import { MiniStoryView } from './MiniStoryView';
import { PairMatchRushView } from './PairMatchRushView';
import { WordBankView, type ExerciseDraftPayload } from './WordBankView';
import { useCompactViewport } from './lessonHelpers';

interface FeedbackBannerState {
  kind: 'correct' | 'accent' | 'nudge';
  headline: string;
  detail?: string;
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

  const [replayNonce, setReplayNonce] = useState(0);
  const [sessionExercises, setSessionExercises] = useState<LessonExercise[]>(() => {
    const pooled = getPlayableNodeExercises(
      language,
      node.id,
      activeProgress.seenExerciseIds,
      false
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
  const claimedAtStartRef = useRef<readonly string[]>(activeProgress.claimedChestIds);

  seenAtStartRef.current = activeProgress.seenExerciseIds;
  claimedAtStartRef.current = activeProgress.claimedChestIds;

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
      isReplay
    );
    setSessionExercises(pooled.length > 0 ? pooled : node.exercises);
    setChestWasAlreadyClaimed(claimedAtStartRef.current.includes(node.id));
    setExerciseIndex(0);
    setBossTurnIndex(0);
    setComboCount(0);
    setMaxCombo(0);
    setMistakesCount(0);
    setExtraGems(0);
    setDraft(null);
    setFeedback(null);
    setLessonWon(false);
    setChestClaimed(false);
    setInRecoveryArcade(false);
    setBurstActive(false);
    setRevealedStars(0);
    savedNodeRef.current = false;
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

  const victoryRewards = useMemo(
    () =>
      calculateLessonRewards({
        baseXp: node.xpReward,
        baseGems: node.gemReward + extraGems,
        maxCombo,
        mistakesCount,
      }),
    [node.xpReward, node.gemReward, extraGems, maxCombo, mistakesCount]
  );

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
    (finalMaxCombo: number, finalMistakes: number, bonusGems: number) => {
      if (!savedNodeRef.current) {
        savedNodeRef.current = true;
        const rewards = calculateLessonRewards({
          baseXp: node.xpReward,
          baseGems: node.gemReward + bonusGems,
          maxCombo: finalMaxCombo,
          mistakesCount: finalMistakes,
        });
        vaultActions.recordSeenExercises(
          language,
          exercises.map((ex) => ex.id)
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
        playSfx('unit_fanfare');
      }
      setLessonWon(true);
    },
    [language, node, exercises]
  );

  const advanceExercise = useCallback(
    (overrideMaxCombo?: number, overrideMistakes?: number, overrideExtraGems?: number) => {
      setDraft(null);
      setFeedback(null);
      setBossTurnIndex(0);
      if (exerciseIndex + 1 >= exercises.length) {
        finalizeVictory(
          overrideMaxCombo ?? maxCombo,
          overrideMistakes ?? mistakesCount,
          overrideExtraGems ?? extraGems
        );
      } else {
        setExerciseIndex((i) => i + 1);
      }
    },
    [exerciseIndex, exercises.length, finalizeVictory, maxCombo, mistakesCount, extraGems]
  );

  const handleCheck = useCallback(() => {
    if (!draft || feedback) return;
    const result = gradeAnswer({
      submitted: draft.submitted,
      expected: draft.expected,
      accepted: draft.accepted,
      language,
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

      if (result.accentCoaching) {
        playSfx('accent_sparkle');
        pushPopToast('Golden Accent! +XP', 'accent');
        triggerMiniConfetti();
        setFeedback({
          kind: 'accent',
          headline: 'Accent Spotlight! Spot-on!',
          detail: result.accentCoaching.friendlyTip,
          accentCoaching: result.accentCoaching,
          articleCoaching: result.articleCoaching,
          speakText: draft.speakOnResult,
          phonetic: draft.phoneticHint,
        });
      } else {
        if (nextCombo >= 6) {
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
          headline: comboMeta.label ? `${comboMeta.label} Great job!` : 'Nicely done!',
          detail: result.articleCoaching?.note,
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
        articleCoaching: result.articleCoaching,
        speakText: draft.speakOnResult,
        phonetic: draft.phoneticHint,
      });
    }
  }, [draft, feedback, language, comboCount, maxCombo, pushPopToast, triggerMiniConfetti]);

  const handleDiscoveryCollect = () => {
    if (!currentExercise || currentExercise.type !== 'discovery_card') return;
    const card = getVocabCard(language, currentExercise.vocabId);
    playSfx('flip_card');
    if (card) {
      void speakPhrase({ text: card.bareForeign, language, phonetic: card.phonetic });
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
      currentExercise.type === 'listen_decode');

  return (
    <div
      className={`lesson-arena-shell ${comboCount >= 5 ? 'is-on-fire' : ''}`}
      role="region"
      aria-label={`Lesson: ${node.title}`}
      onPointerMove={(e) => setPointerTarget({ x: e.clientX, y: e.clientY })}
      onPointerLeave={() => setPointerTarget(null)}
    >
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

        {replayNonce > 0 ? (
          <span
            className="hud-pill hud-pill-static"
            style={{ background: '#eef2ff', borderColor: '#818cf8', color: '#3730a3' }}
          >
            Remix
          </span>
        ) : null}

        {comboMeta.label ? (
          <span
            className="hud-pill hud-pill-static"
            style={{
              background: '#fffbeb',
              borderColor: '#f59e0b',
              color: '#b45309',
            }}
          >
            <Flame size={15} fill="#f59e0b" />
            <span>{comboMeta.label}</span>
          </span>
        ) : null}

        <span
          className="hud-pill hud-pill-static"
          style={{
            background: '#fff1f2',
            borderColor: '#fda4af',
            color: '#be123c',
          }}
          aria-label={`${activeProfile.hearts} of ${activeProfile.maxHearts} hearts`}
        >
          <Heart size={15} fill="#f43f5e" />
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
                size={compact ? 116 : 152}
                badgeText={
                  chestClaimed
                    ? chestWasAlreadyClaimed
                      ? 'Vault Re-Visited!'
                      : 'Treasure Claimed!'
                    : 'Milestone Chest!'
                }
              />
              <h2 style={{ margin: 0, fontSize: compact ? '1.3rem' : '1.6rem', fontWeight: 900 }}>
                {node.title}
              </h2>
              <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>{node.subtitle}</p>

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
                        background: '#eef2ff',
                        border: '2px solid #818cf8',
                        color: '#3730a3',
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
                        style={{ background: '#eff6ff', borderColor: '#60a5fa', color: '#1d4ed8' }}
                      >
                        <Gem size={16} /> +{node.gemReward} Gems
                      </span>
                    ) : null}
                    <span
                      className="hud-pill hud-pill-static"
                      style={{ background: '#fffbeb', borderColor: '#fbbf24', color: '#b45309' }}
                    >
                      <Star size={16} fill="#f59e0b" /> +{node.xpReward} XP
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
                              padding: '6px 10px',
                              borderRadius: 14,
                              background: '#f8fafc',
                              border: '2px solid #cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <VocabIllustration
                              illustrationKey={card.illustrationKey}
                              language={language}
                              size={34}
                            />
                            <span style={{ fontWeight: 800, fontSize: '0.84rem' }}>
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
                padding: compact ? 18 : 28,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: compact ? 10 : 14,
                textAlign: 'center',
              }}
            >
              <MascotStage
                companionId="pip"
                pose="victory_dance"
                equippedCosmetics={activeProfile.equippedCosmetics}
                pointerTarget={pointerTarget}
                comboCount={maxCombo}
                size={compact ? 116 : 156}
                badgeText="Expedition Complete!"
              />

              <h2
                style={{
                  margin: 0,
                  fontSize: compact ? '1.35rem' : '1.7rem',
                  fontWeight: 900,
                  color: '#065f46',
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
                        size={compact ? 28 : 34}
                        color="#d97706"
                        fill={earned && popped ? '#fbbf24' : 'transparent'}
                      />
                    </motion.div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span
                  className="hud-pill hud-pill-static"
                  style={{ background: '#fffbeb', borderColor: '#fbbf24', color: '#b45309' }}
                >
                  <Sparkles size={16} /> +<CountUpTicker target={victoryRewards.xpEarned} /> XP
                </span>
                <span
                  className="hud-pill hud-pill-static"
                  style={{ background: '#eff6ff', borderColor: '#60a5fa', color: '#1d4ed8' }}
                >
                  <Gem size={16} /> +<CountUpTicker target={victoryRewards.gemsEarned} /> Gems
                </span>
                {maxCombo > 1 ? (
                  <span
                    className="hud-pill hud-pill-static"
                    style={{ background: '#fff7ed', borderColor: '#fb923c', color: '#c2410c' }}
                  >
                    <Flame size={16} /> Best Combo: {maxCombo}x
                  </span>
                ) : null}
              </div>

              {node.rewardVocabIds.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {node.rewardVocabIds.slice(0, 4).map((vid) => {
                    const card = getVocabCard(language, vid);
                    if (!card) return null;
                    return (
                      <div
                        key={vid}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 14,
                          background: '#f8fafc',
                          border: '2px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <VocabIllustration
                          illustrationKey={card.illustrationKey}
                          language={language}
                          size={30}
                        />
                        <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>
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
                    />
                  ) : null}

                  {currentExercise.type === 'word_bank' ? (
                    <WordBankView
                      exercise={currentExercise}
                      language={language}
                      compact={compact}
                      locked={Boolean(feedback)}
                      onTurtlePlay={() => vaultActions.recordTurtlePlay()}
                      onDraftChange={setDraft}
                      onSubmitShortcut={handleCheck}
                    />
                  ) : null}

                  {currentExercise.type === 'listen_decode' ? (
                    <ListenDecodeView
                      exercise={currentExercise}
                      language={language}
                      compact={compact}
                      locked={Boolean(feedback)}
                      revealed={Boolean(feedback)}
                      onTurtlePlay={() => vaultActions.recordTurtlePlay()}
                      onDraftChange={setDraft}
                    />
                  ) : null}

                  {currentExercise.type === 'pair_match_rush' ? (
                    <PairMatchRushView
                      exercise={currentExercise}
                      language={language}
                      compact={compact}
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
                      onTurtlePlay={() => vaultActions.recordTurtlePlay()}
                      onComplete={() => advanceExercise()}
                    />
                  ) : null}

                  {currentExercise.type === 'boss_gauntlet' ? (
                    <BossGauntletView
                      exercise={currentExercise}
                      language={language}
                      compact={compact}
                      initialTurnIndex={bossTurnIndex}
                      onTurnIndexChange={setBossTurnIndex}
                      onTurtlePlay={() => vaultActions.recordTurtlePlay()}
                      onTurnResult={({ isCorrect, usedAccentCoaching }) => {
                        if (isCorrect) {
                          const nextCombo = comboCount + 1;
                          setComboCount(nextCombo);
                          setMaxCombo((m) => Math.max(m, nextCombo));
                          pushPopToast(
                            usedAccentCoaching ? 'Golden Accent!' : 'Boss Hit!',
                            usedAccentCoaching ? 'accent' : 'combo'
                          );
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
                        advanceExercise(maxCombo, mistakesCount, nextExtra);
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
                  style={{ fontWeight: 800, color: '#475569', fontSize: '0.9rem' }}
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
                <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 900,
                      fontSize: '1rem',
                      color:
                        feedback.kind === 'correct'
                          ? '#065f46'
                          : feedback.kind === 'accent'
                            ? '#b45309'
                            : '#9f1239',
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
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#78350f' }}>
                      Spell with accents: <strong>{feedback.accentCoaching.expected}</strong> (
                      {feedback.accentCoaching.highlightedChars.join(', ')}) —{' '}
                      {feedback.accentCoaching.friendlyTip}
                    </div>
                  ) : feedback.detail ? (
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>
                      {feedback.detail}
                    </div>
                  ) : null}

                  {feedback.articleCoaching ? (
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d4ed8' }}>
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
                  style={{ fontWeight: 700, color: '#64748b', fontSize: '0.88rem' }}
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
                badgeText="0/5 Hearts!"
              />
            </div>
            <h2
              style={{
                margin: '0 0 6px',
                fontSize: '1.35rem',
                fontWeight: 900,
                color: '#1e1b4b',
              }}
            >
              Pip’s Hearts Need a Recharge!
            </h2>
            <p style={{ margin: '0 0 16px', fontWeight: 700, color: '#475569' }}>
              No worries, explorer! Hop into a quick round of Sky-Catcher Fiesta to win back +1 to
              +5 Hearts and bonus Gems, then jump right back here!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
