import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame, Gem, Heart, Sparkles, Star, Volume2, X } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import {
  calculateComboMultiplier,
  calculateLessonRewards,
  gradeAnswer,
} from '../../core';
import { getVocabCard } from '../../curriculum';
import { playSfx, speakPhrase, stopSpeech } from '../../audio';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import { MascotStage } from '../characters/MascotStage';
import { SkyCatcherArcade } from '../arcade/SkyCatcherArcade';
import type {
  AccentCoaching,
  ArticleCoaching,
  CharacterPose,
  LanguageCode,
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
  const { activeProfile } = useVaultStore();
  const compact = useCompactViewport();

  const [exerciseIndex, setExerciseIndex] = useState(0);
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

  const savedNodeRef = useRef(false);

  // Stop any lingering speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Reset state if node changes
  useEffect(() => {
    setExerciseIndex(0);
    setComboCount(0);
    setMaxCombo(0);
    setMistakesCount(0);
    setExtraGems(0);
    setDraft(null);
    setFeedback(null);
    setLessonWon(false);
    setChestClaimed(false);
    setInRecoveryArcade(false);
    savedNodeRef.current = false;
  }, [node.id]);

  const exercises = node.exercises;
  const currentExercise = exercises[exerciseIndex];
  const isChestNode = node.nodeType === 'chest' && exercises.length === 0;
  const requiresHearts = node.nodeType === 'lesson' || node.nodeType === 'boss';
  const showZeroHeartModal =
    requiresHearts && activeProfile.hearts <= 0 && !lessonWon && !inRecoveryArcade && !isChestNode;

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
    [language, node]
  );

  const advanceExercise = useCallback(
    (overrideMaxCombo?: number, overrideMistakes?: number, overrideExtraGems?: number) => {
      setDraft(null);
      setFeedback(null);
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
        if (nextCombo >= 6) playSfx('combo_fire', nextCombo);
        else if (nextCombo === 5) playSfx('combo_5x', nextCombo);
        else if (nextCombo === 3) playSfx('combo_3x', nextCombo);
        else playSfx('correct_chime');

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
  }, [draft, feedback, language, comboCount, maxCombo]);

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
    vaultActions.recordAnswerOutcome({ isCorrect: true, comboCount: nextCombo });
    advanceExercise(nextMax, mistakesCount, extraGems);
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
      className="lesson-arena-shell"
      role="region"
      aria-label={`Lesson: ${node.title}`}
      onPointerMove={(e) => setPointerTarget({ x: e.clientX, y: e.clientY })}
      onPointerLeave={() => setPointerTarget(null)}
    >
      {/* Top Lesson Header */}
      <header className="lesson-arena-header">
        <button
          type="button"
          className="tactile-btn tactile-btn-soft"
          style={{ padding: '7px 10px', borderRadius: 14 }}
          aria-label="Exit lesson"
          onClick={() => {
            stopSpeech();
            playSfx('button_click');
            onExit();
          }}
        >
          <X size={18} />
        </button>

        <div className="lesson-progress-track" aria-label="Lesson progress">
          <div className="lesson-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

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
          <div
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
              badgeText={chestClaimed ? 'Treasure Claimed!' : 'Milestone Chest!'}
            />
            <h2 style={{ margin: 0, fontSize: compact ? '1.3rem' : '1.6rem', fontWeight: 900 }}>
              {node.title}
            </h2>
            <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>{node.subtitle}</p>

            {!chestClaimed ? (
              <button
                type="button"
                className="tactile-btn tactile-btn-hero tactile-btn-amber"
                onClick={() => {
                  playSfx('chest_open');
                  playSfx('unit_fanfare');
                  setChestClaimed(true);
                  if (!savedNodeRef.current) {
                    savedNodeRef.current = true;
                    vaultActions.completeMapNode({
                      language,
                      nodeId: node.id,
                      stars: 3,
                      xpEarned: node.xpReward,
                      gemsEarned: node.gemReward,
                      unlockedVocabIds: node.rewardVocabIds,
                      maxCombo: 0,
                      isChest: true,
                    });
                  }
                }}
              >
                <Sparkles size={20} />
                <span>Open Treasure Chest!</span>
              </button>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span className="hud-pill hud-pill-static" style={{ background: '#eff6ff', borderColor: '#60a5fa', color: '#1d4ed8' }}>
                    <Gem size={16} /> +{node.gemReward} Gems
                  </span>
                  <span className="hud-pill hud-pill-static" style={{ background: '#fffbeb', borderColor: '#fbbf24', color: '#b45309' }}>
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
                          <VocabIllustration illustrationKey={card.illustrationKey} language={language} size={34} />
                          <span style={{ fontWeight: 800, fontSize: '0.84rem' }}>{card.foreignWithArticle}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="tactile-btn tactile-btn-hero tactile-btn-success"
                  onClick={onExit}
                >
                  Claim & Return to Atlas
                </button>
              </>
            )}
          </div>
        ) : null}

        {/* Lesson Victory Summary */}
        {!inRecoveryArcade && !isChestNode && lessonWon ? (
          <div
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

            <h2 style={{ margin: 0, fontSize: compact ? '1.35rem' : '1.7rem', fontWeight: 900, color: '#065f46' }}>
              {node.title} Complete!
            </h2>

            {/* 1..3 Stars */}
            <div style={{ display: 'flex', gap: 6 }} aria-label={`${victoryRewards.stars} out of 3 stars`}>
              {[1, 2, 3].map((idx) => (
                <Star
                  key={idx}
                  size={compact ? 28 : 34}
                  color="#d97706"
                  fill={idx <= victoryRewards.stars ? '#fbbf24' : 'transparent'}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span className="hud-pill hud-pill-static" style={{ background: '#fffbeb', borderColor: '#fbbf24', color: '#b45309' }}>
                <Sparkles size={16} /> +{victoryRewards.xpEarned} XP
              </span>
              <span className="hud-pill hud-pill-static" style={{ background: '#eff6ff', borderColor: '#60a5fa', color: '#1d4ed8' }}>
                <Gem size={16} /> +{victoryRewards.gemsEarned} Gems
              </span>
              {maxCombo > 1 ? (
                <span className="hud-pill hud-pill-static" style={{ background: '#fff7ed', borderColor: '#fb923c', color: '#c2410c' }}>
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
                      <VocabIllustration illustrationKey={card.illustrationKey} language={language} size={30} />
                      <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{card.foreignWithArticle}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <button
              type="button"
              className="tactile-btn tactile-btn-hero tactile-btn-success"
              onClick={onExit}
            >
              Return to Atlas Map
            </button>
          </div>
        ) : null}

        {/* Active Exercise Layout */}
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
              <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                  onTurtlePlay={() => vaultActions.recordTurtlePlay()}
                  onTurnResult={({ isCorrect, usedAccentCoaching }) => {
                    if (isCorrect) {
                      const nextCombo = comboCount + 1;
                      setComboCount(nextCombo);
                      setMaxCombo((m) => Math.max(m, nextCombo));
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
            </div>
          </div>
        ) : null}
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
                <span className="hud-hide-xs" style={{ fontWeight: 800, color: '#475569', fontSize: '0.9rem' }}>
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
                      Article Tip ({feedback.articleCoaching.article}): {feedback.articleCoaching.note}
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
                <span className="hud-hide-xs" style={{ fontWeight: 700, color: '#64748b', fontSize: '0.88rem' }}>
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
            <h2 style={{ margin: '0 0 6px', fontSize: '1.35rem', fontWeight: 900, color: '#1e1b4b' }}>
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
