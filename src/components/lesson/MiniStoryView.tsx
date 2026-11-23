import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Turtle, Eye, EyeOff, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { playSfx, speakPhrase } from '../../audio';
import { LANGUAGE_META, type LanguageCode, type MiniStoryExercise } from '../../types/contracts';
import { TapHintText } from './TapHintText';
import { SayItNormallyButton } from './SayItNormallyButton';

export interface MiniStoryViewProps {
  exercise: MiniStoryExercise;
  language: LanguageCode;
  compact: boolean;
  scaffoldingMode?: 'guided' | 'bridge' | 'fluent';
  onTurtlePlay: () => void;
  onFluentPlay?: () => void;
  onComplete: () => void;
}

export function MiniStoryView({
  exercise,
  language,
  compact,
  scaffoldingMode = 'guided',
  onTurtlePlay,
  onFluentPlay,
  onComplete,
}: MiniStoryViewProps) {
  const [visibleCount, setVisibleCount] = useState(1);
  const [resolvedDecisionIdx, setResolvedDecisionIdx] = useState<number[]>([]);
  const [decisionNote, setDecisionNote] = useState<{
    ok: boolean;
    english: string;
    foreign?: string;
  } | null>(null);
  const [englishRevealedIds, setEnglishRevealedIds] = useState<string[]>([]);
  const [peekPhonetics, setPeekPhonetics] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(1);
    setResolvedDecisionIdx([]);
    setDecisionNote(null);
    setEnglishRevealedIds([]);
    setPeekPhonetics(false);
  }, [exercise.id]);

  useEffect(() => {
    if (typeof scrollEndRef.current?.scrollIntoView === 'function') {
      scrollEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [visibleCount, decisionNote]);

  const currentLastBubbleIndex = visibleCount - 1;
  const activeDecision = exercise.decisions.find(
    (d) =>
      d.afterBubbleIndex === currentLastBubbleIndex &&
      !resolvedDecisionIdx.includes(d.afterBubbleIndex)
  );
  const allBubblesRevealed = visibleCount >= exercise.bubbles.length;
  const isFinished = allBubblesRevealed && !activeDecision;
  const langMeta = LANGUAGE_META[language];
  const langDir = langMeta.dir;
  const translationLabel = langMeta.translationLanguageLabel ?? 'English';
  const isGuided = scaffoldingMode === 'guided';
  const showPhoneticSupport = isGuided || peekPhonetics;

  const toggleEnglish = (bubbleId: string) => {
    playSfx('tile_tap');
    setEnglishRevealedIds((prev) =>
      prev.includes(bubbleId) ? prev.filter((id) => id !== bubbleId) : [...prev, bubbleId]
    );
  };

  const handleAdvance = () => {
    playSfx('button_click');
    setDecisionNote(null);
    if (!allBubblesRevealed) {
      const nextIndex = visibleCount;
      setVisibleCount((c) => Math.min(exercise.bubbles.length, c + 1));
      const nextBubble = exercise.bubbles[nextIndex];
      if (nextBubble) {
        void speakPhrase({
          text: nextBubble.foreignText,
          language,
          phonetic: nextBubble.phonetic,
        });
      }
    } else if (isFinished) {
      playSfx('correct_chime');
      onComplete();
    }
  };

  return (
    <div
      className="tactile-card"
      style={{
        padding: compact ? '12px 12px' : '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 8 : 12,
        width: '100%',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* Story Title Header */}
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          borderBottom: '2px solid var(--card-border)',
          paddingBottom: 8,
        }}
      >
        <div>
          <div style={{ fontSize: compact ? '1rem' : '1.18rem', fontWeight: 900, color: 'var(--text-main)' }}>
            {exercise.title}
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {exercise.settingSubtitle}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {!isGuided ? (
            <button
              type="button"
              className={`tactile-btn ${peekPhonetics ? 'tactile-btn-amber' : 'tactile-btn-soft'}`}
              style={{ padding: '4px 9px', fontSize: '0.74rem', borderRadius: 12 }}
              onClick={() => {
                playSfx('tile_tap');
                setPeekPhonetics((v) => !v);
              }}
            >
              {peekPhonetics ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{peekPhonetics ? 'Hide Phonetic / Romanized' : 'Peek Phonetic / Romanized'}</span>
            </button>
          ) : null}
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: 'var(--tint-indigo-bg)',
              color: 'var(--tint-indigo-ink)',
              fontSize: '0.76rem',
              fontWeight: 900,
            }}
          >
            {Math.min(visibleCount, exercise.bubbles.length)} / {exercise.bubbles.length}
          </span>
        </div>
      </div>

      {/* Scrollable Dialogue Bubbles */}
      <div className="comic-bubbles-scroll" style={{ flex: '1 1 auto', minHeight: 0 }}>
        {exercise.bubbles.slice(0, visibleCount).map((bubble) => {
          const isRight = bubble.side === 'right';
          const showEnglish = englishRevealedIds.includes(bubble.id);

          return (
            <motion.div
              key={bubble.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              style={{
                alignSelf: isRight ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
                padding: compact ? '9px 12px' : '12px 15px',
                borderRadius: 18,
                background: isRight ? 'var(--tint-indigo-bg)' : 'var(--card-soft-bg)',
                borderTopWidth: 2,
                borderRightWidth: 2,
                borderLeftWidth: 2,
                borderBottomWidth: 4,
                borderStyle: 'solid',
                borderColor: isRight ? 'var(--lang-primary)' : 'var(--card-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--lang-primary)' }}>
                  {bubble.speakerName}
                </span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-soft"
                    style={{ padding: '3px 7px', borderRadius: 10, fontSize: '0.74rem' }}
                    aria-label={`Hear ${bubble.speakerName} speak`}
                    onClick={() => {
                      void speakPhrase({
                        text: bubble.foreignText,
                        language,
                        phonetic: bubble.phonetic,
                      });
                    }}
                  >
                    <Volume2 size={13} />
                    <span>1.0x</span>
                  </button>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-soft"
                    style={{ padding: '3px 7px', borderRadius: 10, fontSize: '0.74rem' }}
                    aria-label={`Hear ${bubble.speakerName} slowly`}
                    onClick={() => {
                      onTurtlePlay();
                      void speakPhrase({
                        text: bubble.foreignText,
                        language,
                        phonetic: bubble.phonetic,
                        slow: true,
                      });
                    }}
                  >
                    <Turtle size={13} />
                  </button>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-soft"
                    style={{ padding: '3px 7px', borderRadius: 10, fontSize: '0.74rem' }}
                    aria-label={`Hear ${bubble.speakerName} fluently`}
                    onClick={() => {
                      onFluentPlay?.();
                      void speakPhrase({
                        text: bubble.foreignText,
                        language,
                        phonetic: bubble.phonetic,
                        speed: 'fluent',
                      });
                    }}
                  >
                    <Zap size={12} />
                    <span>1.12x</span>
                  </button>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-soft"
                    style={{ padding: '3px 7px', borderRadius: 10, fontSize: '0.74rem' }}
                    aria-label={showEnglish ? `Hide ${translationLabel}` : `Peek ${translationLabel}`}
                    onClick={() => toggleEnglish(bubble.id)}
                  >
                    {showEnglish ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div
                dir={langDir}
                style={{
                  fontSize: compact ? '0.96rem' : '1.06rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  lineHeight: langDir === 'rtl' ? 1.5 : 1.35,
                }}
              >
                <TapHintText
                  tokens={bubble.tapHints}
                  fallbackText={bubble.foreignText}
                  language={language}
                />
              </div>

              {showPhoneticSupport && bubble.romanized ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--lang-primary)', fontWeight: 800, marginTop: 2 }}>
                  {bubble.romanized}
                </div>
              ) : null}

              {showPhoneticSupport ? (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: 2 }}>
                  {bubble.phonetic}
                </div>
              ) : null}

              {showEnglish ? (
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 5,
                    borderTop: '1px dashed var(--card-border)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                  }}
                >
                  {bubble.englishText}
                </div>
              ) : null}

              <div style={{ marginTop: 6 }}>
                <SayItNormallyButton
                  language={language}
                  dialectAText={bubble.foreignText}
                  dialectBText={bubble.englishText}
                  explicitPlain={bubble.plainEnglish}
                  resetKey={`${exercise.id}:${bubble.id}`}
                  size="sm"
                />
              </div>
            </motion.div>
          );
        })}

        {/* Funny Mid-Story Decision Card */}
        {activeDecision ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              padding: compact ? '10px 12px' : '14px 16px',
              borderRadius: 18,
              background: 'var(--tint-amber-bg)',
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderLeftWidth: 2,
              borderBottomWidth: 4,
              borderStyle: 'solid',
              borderColor: 'var(--tint-amber-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, color: 'var(--tint-amber-ink)' }}>
              <Sparkles size={16} />
              <span>Story Choice: {activeDecision.questionEnglish}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeDecision.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="tactile-btn"
                  style={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    padding: '9px 12px',
                    fontSize: '0.9rem',
                  }}
                  onClick={() => {
                    if (opt.isCorrect) {
                      playSfx('correct_chime');
                      setResolvedDecisionIdx((prev) => [...prev, activeDecision.afterBubbleIndex]);
                      setDecisionNote({
                        ok: true,
                        english: opt.reactionEnglish,
                        foreign: opt.reactionForeign,
                      });
                    } else {
                      playSfx('gentle_nudge');
                      setDecisionNote({
                        ok: false,
                        english: opt.reactionEnglish,
                        foreign: opt.reactionForeign,
                      });
                    }
                  }}
                >
                  <div>
                    <div dir="auto">{opt.label}</div>
                    {opt.phonetic ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.phonetic}</div>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}

        {decisionNote ? (
          <div
            style={{
              padding: '9px 12px',
              borderRadius: 14,
              background: decisionNote.ok ? 'var(--tint-emerald-bg)' : 'var(--tint-rose-bg)',
              border: `2px solid ${decisionNote.ok ? 'var(--tint-emerald-border)' : 'var(--tint-rose-border)'}`,
              color: decisionNote.ok ? 'var(--tint-emerald-ink)' : 'var(--tint-rose-ink)',
              fontWeight: 800,
              fontSize: '0.86rem',
            }}
          >
            {decisionNote.foreign ? <div dir={langDir}>{decisionNote.foreign}</div> : null}
            <div>{decisionNote.english}</div>
          </div>
        ) : null}

        <div ref={scrollEndRef} />
      </div>

      {/* Pinned Advance / Finish Button */}
      <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
        <button
          type="button"
          className={`tactile-btn tactile-btn-hero ${isFinished ? 'tactile-btn-success' : 'tactile-btn-primary'}`}
          disabled={Boolean(activeDecision)}
          onClick={handleAdvance}
        >
          <span>
            {activeDecision
              ? 'Pick a story choice above!'
              : isFinished
                ? 'Finish Story!'
                : 'Next Line'}
          </span>
          {!activeDecision ? <ArrowRight size={18} /> : null}
        </button>
      </div>
    </div>
  );
}
