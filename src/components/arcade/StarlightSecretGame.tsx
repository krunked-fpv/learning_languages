import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Music, Play, Star, X } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { playSfx, speakPhrase } from '../../audio';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import { LANGUAGE_META, type ArcadeLanternItem, type CharacterPose, type CompanionId } from '../../types/contracts';
import { MascotStage } from '../characters/MascotStage';
import {
  ARCADE_SHELL_STYLE,
  ArcadeSummaryCard,
  CARD_SURFACE_STYLE,
  SOFT_BTN_STYLE,
  TargetPromptBar,
  getArcadeForeignTextStyle,
  useArcadeContainerMetrics,
  useArcadeDeck,
} from './arcadeShared';

const ROUND_DURATION_SECONDS = 45;
const CHOIR_COMPANIONS: readonly CompanionId[] = ['pip', 'mateo', 'colette', 'benni', 'luca'];

const BUBBLE_PALETTES = [
  { bg: '#eef2ff', border: '#6366f1', text: '#312e81' },
  { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
  { bg: '#fff1f2', border: '#f43f5e', text: '#9f1239' },
  { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a' },
] as const;

interface SongBubbleEntity {
  uid: number;
  kind: 'word' | 'star';
  item?: ArcadeLanternItem;
  x: number;
  y: number;
  speed: number;
  swayOffset: number;
  paletteIndex: number;
}

export interface StarlightSecretGameProps {
  onExit: () => void;
}

export function StarlightSecretGame({ onExit }: StarlightSecretGameProps) {
  const { activeProfile } = useVaultStore();
  const { language, lexicon, bestScoreFor } = useArcadeDeck();
  const { containerRef, isCompact } = useArcadeContainerMetrics();
  const langDir = LANGUAGE_META[language].dir;

  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>('ready');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [choirPose, setChoirPose] = useState<CharacterPose>('idle');
  const [targetItem, setTargetItem] = useState<ArcadeLanternItem>(() => lexicon[0]);
  const [bubbles, setBubbles] = useState<SongBubbleEntity[]>([]);
  const [wobbleUid, setWobbleUid] = useState<number | null>(null);
  const [toast, setToast] = useState<ReactNode>('Pop the floating Song-Bubble matching the clue!');
  const [summary, setSummary] = useState<{
    score: number;
    heartsWon: number;
    bonusGems: number;
    catches: number;
  } | null>(null);

  const bubblesRef = useRef<SongBubbleEntity[]>([]);
  const targetRef = useRef<ArcadeLanternItem>(lexicon[0]);
  const catchesRef = useRef(0);
  const streakRef = useRef(0);
  const scoreRef = useRef(0);
  const starGemsRef = useRef(0);
  const bonusSecondsRef = useRef(0);
  const elapsedRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const starTimerRef = useRef(4.5);
  const nextUidRef = useRef(1);
  const finishedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (phase === 'ready' && lexicon.length > 0) {
      targetRef.current = lexicon[0];
      setTargetItem(lexicon[0]);
    }
  }, [phase, lexicon]);

  useEffect(() => {
    return () => {
      for (const id of timersRef.current) {
        window.clearTimeout(id);
      }
      timersRef.current = [];
    };
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
  }, []);

  const pickNextTarget = useCallback(
    (avoidId?: string, speakNow = false) => {
      const pool = lexicon.filter((item) => item.id !== avoidId);
      const list = pool.length > 0 ? pool : lexicon;
      const chosen = list[Math.floor(Math.random() * list.length)];
      targetRef.current = chosen;
      setTargetItem(chosen);
      if (speakNow) {
        void speakPhrase({ text: chosen.foreign, language, phonetic: chosen.phonetic });
      }
      return chosen;
    },
    [lexicon, language]
  );

  const finishRun = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const totalCatches = catchesRef.current;
    const finalScore = scoreRef.current;
    const heartsWon = Math.min(5, Math.max(1, Math.ceil(totalCatches / 2)));
    const bonusGems =
      starGemsRef.current + Math.floor(finalScore / 20) + (totalCatches >= 5 ? 5 : 0);
    vaultActions.recordArcadeGameResult({
      gameId: 'starlight_choir',
      score: finalScore,
      heartsWon,
      bonusGems,
    });
    playSfx('secret_fanfare');
    setSummary({ score: finalScore, heartsWon, bonusGems, catches: totalCatches });
    setPhase('summary');
  }, []);

  const startRun = useCallback(() => {
    playSfx('secret_fanfare');
    finishedRef.current = false;
    catchesRef.current = 0;
    streakRef.current = 0;
    scoreRef.current = 0;
    starGemsRef.current = 0;
    bonusSecondsRef.current = 0;
    elapsedRef.current = 0;
    spawnTimerRef.current = 0.7;
    starTimerRef.current = 4;
    setScore(0);
    setStreak(0);
    setChoirPose('happy');
    setTimeLeft(ROUND_DURATION_SECONDS);
    setSummary(null);
    setToast('Pop matching Song-Bubbles to fill Disco Fever!');

    const first = pickNextTarget(undefined, true);
    const distractors = lexicon.filter((i) => i.id !== first.id).slice(0, 2);
    bubblesRef.current = [
      {
        uid: nextUidRef.current++,
        kind: 'word',
        item: first,
        x: 50,
        y: 80,
        speed: 14,
        swayOffset: 0,
        paletteIndex: 0,
      },
      ...distractors.map((d, idx) => ({
        uid: nextUidRef.current++,
        kind: 'word' as const,
        item: d,
        x: idx === 0 ? 24 : 76,
        y: 86 + idx * 4,
        speed: 13 + idx,
        swayOffset: idx + 1,
        paletteIndex: (idx + 1) % BUBBLE_PALETTES.length,
      })),
    ];
    setBubbles([...bubblesRef.current]);
    setPhase('playing');
  }, [lexicon, pickNextTarget]);

  useEffect(() => {
    if (phase !== 'playing') return;

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      elapsedRef.current += dt;
      const totalAllowed = ROUND_DURATION_SECONDS + bonusSecondsRef.current;
      const rem = Math.max(0, Math.ceil(totalAllowed - elapsedRef.current));
      setTimeLeft((prev) => (prev !== rem ? rem : prev));

      if (elapsedRef.current >= totalAllowed) {
        finishRun();
        return;
      }

      spawnTimerRef.current += dt;
      starTimerRef.current -= dt;
      if (starTimerRef.current <= 0 && bubblesRef.current.length < 7) {
        starTimerRef.current = 6.5;
        bubblesRef.current.push({
          uid: nextUidRef.current++,
          kind: 'star',
          x: 18 + Math.random() * 64,
          y: 100,
          speed: 17,
          swayOffset: Math.random() * Math.PI,
          paletteIndex: 0,
        });
      } else if (spawnTimerRef.current >= 0.95 && bubblesRef.current.length < 6) {
        spawnTimerRef.current = 0;
        const activeIds = new Set(
          bubblesRef.current.filter((b) => b.kind === 'word' && b.item).map((b) => b.item!.id)
        );
        const hasTarget = activeIds.has(targetRef.current.id);
        const distractorChoices = lexicon.filter(
          (i) => i.id !== targetRef.current.id && !activeIds.has(i.id)
        );
        const chosen = !hasTarget
          ? targetRef.current
          : distractorChoices.length > 0
            ? distractorChoices[Math.floor(Math.random() * distractorChoices.length)]
            : null;
        if (chosen) {
          bubblesRef.current.push({
            uid: nextUidRef.current++,
            kind: 'word',
            item: chosen,
            x: 21 + Math.random() * 58,
            y: 100,
            speed: 13 + Math.random() * 6,
            swayOffset: Math.random() * Math.PI * 2,
            paletteIndex: Math.floor(Math.random() * BUBBLE_PALETTES.length),
          });
        }
      }

      const nextList: SongBubbleEntity[] = [];
      for (const b of bubblesRef.current) {
        const nextY = b.y - b.speed * dt;
        const swayX = Math.max(
          19,
          Math.min(81, b.x + Math.sin(elapsedRef.current * 2.2 + b.swayOffset) * 5 * dt)
        );
        if (nextY > -12) {
          nextList.push({ ...b, x: swayX, y: nextY });
        }
      }

      bubblesRef.current = nextList;
      setBubbles(nextList);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, lexicon, finishRun]);

  const handlePopBubble = (bubble: SongBubbleEntity) => {
    if (phase !== 'playing') return;

    if (bubble.kind === 'star') {
      bubblesRef.current = bubblesRef.current.filter((b) => b.uid !== bubble.uid);
      setBubbles([...bubblesRef.current]);
      starGemsRef.current += 5;
      bonusSecondsRef.current += 3;
      playSfx('star_pop', Math.min(3, streakRef.current));
      setToast('Golden Star Note! +5 Gems & +3s!');
      return;
    }

    if (bubble.item && bubble.item.id === targetRef.current.id) {
      const nextStreak = streakRef.current + 1;
      const isDisco = nextStreak >= 5;
      const pts = isDisco ? 20 : 10;
      streakRef.current = nextStreak;
      catchesRef.current += 1;
      scoreRef.current += pts;

      setStreak(nextStreak);
      setScore(scoreRef.current);
      setChoirPose(isDisco ? 'victory_dance' : 'happy');
      playSfx('bubble_pop', nextStreak - 1);
      void speakPhrase({
        text: bubble.item.foreign,
        language,
        phonetic: bubble.item.phonetic,
      });

      const poppedId = bubble.item.id;
      const poppedForeign = bubble.item.foreign;
      bubblesRef.current = bubblesRef.current.filter(
        (b) => !(b.kind === 'word' && b.item?.id === poppedId)
      );
      setBubbles([...bubblesRef.current]);
      spawnTimerRef.current = 0.75;
      setToast(
        isDisco ? (
          `STARLIGHT DISCO FEVER! +${pts} pts!`
        ) : (
          <>
            Popped “<bdi dir={langDir}>{poppedForeign}</bdi>”! +{pts} pts!
          </>
        )
      );
      pickNextTarget(poppedId, false);
      if (!isDisco) {
        scheduleTimeout(() => setChoirPose('idle'), 650);
      }
    } else {
      streakRef.current = 0;
      setStreak(0);
      setChoirPose('sympathetic');
      setWobbleUid(bubble.uid);
      playSfx('gentle_nudge');
      setToast(`Oops! Find "${targetRef.current.english}"!`);
      scheduleTimeout(() => {
        setWobbleUid((cur) => (cur === bubble.uid ? null : cur));
        setChoirPose('idle');
      }, 450);
    }
  };

  const discoActive = streak >= 5;
  const discoPct = Math.min(100, Math.round((streak / 5) * 100));
  const bestScore = bestScoreFor('starlight_choir');

  return (
    <section
      ref={containerRef}
      aria-label="Starlight Critter Choir"
      style={ARCADE_SHELL_STYLE}
    >
      {/* Top Choir Header */}
      <div
        style={{
          ...CARD_SURFACE_STYLE,
          flexShrink: 0,
          padding: isCompact ? '7px 10px' : '9px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
          borderRadius: 18,
          borderColor: '#818cf8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, maxWidth: '100%', flex: '1 1 160px' }}>
          <div
            style={{
              width: isCompact ? 32 : 36,
              height: isCompact ? 32 : 36,
              borderRadius: 11,
              background: '#eef2ff',
              borderTopWidth: 1.5,
              borderRightWidth: 1.5,
              borderLeftWidth: 1.5,
              borderBottomWidth: 3,
              borderStyle: 'solid',
              borderColor: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Music size={isCompact ? 17 : 20} color="#4f46e5" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: isCompact ? '0.96rem' : '1.08rem',
                fontWeight: 900,
                color: 'var(--text-main, #1e1b4b)',
              }}
            >
              Starlight Critter Choir
            </div>
            {!isCompact ? (
              <div
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: 'var(--text-muted, #475569)',
                }}
              >
                Musical Secret Mini-Game • Best Score: {bestScore}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            className="hud-pill hud-pill-static"
            style={{
              background: '#fffbeb',
              borderColor: '#f59e0b',
              color: '#b45309',
              padding: isCompact ? '3px 8px' : '5px 10px',
              fontSize: isCompact ? '0.76rem' : '0.84rem',
            }}
          >
            <Star size={13} fill="#f59e0b" /> Score: {score}
          </span>
          <span
            className="hud-pill hud-pill-static"
            style={{
              background: '#eff6ff',
              borderColor: '#93c5fd',
              color: '#1d4ed8',
              padding: isCompact ? '3px 8px' : '5px 10px',
              fontSize: isCompact ? '0.76rem' : '0.84rem',
            }}
          >
            {timeLeft}s
          </span>
          <button
            type="button"
            className="tactile-btn"
            style={{
              ...SOFT_BTN_STYLE,
              padding: isCompact ? '4px 8px' : '5px 10px',
              fontSize: '0.78rem',
              borderRadius: 12,
            }}
            onClick={onExit}
          >
            <X size={14} />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Ready Intro */}
      {phase === 'ready' ? (
        <div
          style={{
            ...CARD_SURFACE_STYLE,
            flex: 1,
            minHeight: 0,
            padding: isCompact ? 14 : 22,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isCompact ? 8 : 12,
            textAlign: 'center',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isCompact ? 2 : 6,
              flexWrap: 'wrap',
            }}
          >
            {CHOIR_COMPANIONS.map((cid) => (
              <MascotStage
                key={cid}
                companionId={cid}
                pose="happy"
                equippedCosmetics={cid === 'pip' ? activeProfile.equippedCosmetics : undefined}
                size={isCompact ? 50 : 68}
              />
            ))}
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: isCompact ? '1.12rem' : '1.35rem',
              fontWeight: 900,
              color: 'var(--text-main, #1e1b4b)',
            }}
          >
            Pop Musical Song-Bubbles With All 5 Companions!
          </h2>
          <p
            style={{
              margin: 0,
              maxWidth: 500,
              fontSize: isCompact ? '0.82rem' : '0.92rem',
              fontWeight: 700,
              color: 'var(--text-muted, #475569)',
            }}
          >
            Tap bubbles matching the English prompt to play rising pentatonic melodies! Hit a 5x
            streak to trigger STARLIGHT DISCO FEVER (2x points), and tap Golden Star Notes for
            extra time & Gems!
          </p>
          <button
            type="button"
            className="tactile-btn tactile-btn-hero tactile-btn-indigo"
            onClick={startRun}
          >
            <Play size={18} />
            <span>Start Critter Choir!</span>
          </button>
        </div>
      ) : null}

      {/* Active Musical Stage */}
      {phase === 'playing' ? (
        <>
          <TargetPromptBar
            label="POP SONG-BUBBLE:"
            targetItem={targetItem}
            language={language}
            isCompact={isCompact}
            borderColor={discoActive ? '#f43f5e' : '#fbbf24'}
            rightContent={
              <>
                <div style={{ width: isCompact ? 82 : 112 }}>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      color: discoActive ? '#f43f5e' : 'var(--text-muted, #4338ca)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {discoActive ? 'DISCO FEVER 2x!' : `Disco ${streak}/5`}
                  </div>
                  <div
                    style={{
                      height: 7,
                      borderRadius: 999,
                      background: 'rgba(148, 163, 184, 0.35)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${discoPct}%`,
                        height: '100%',
                        background: discoActive
                          ? 'linear-gradient(90deg, #f43f5e, #f59e0b, #6366f1)'
                          : '#6366f1',
                        transition: 'width 180ms ease',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="tactile-btn tactile-btn-success"
                  style={{
                    padding: isCompact ? '5px 10px' : '6px 12px',
                    fontSize: isCompact ? '0.76rem' : '0.82rem',
                    borderRadius: 12,
                  }}
                  onClick={finishRun}
                >
                  Claim Rewards
                </button>
              </>
            }
          />

          {/* Floating Bubbles Stage + 5-Companion Choir */}
          <div
            className={discoActive ? 'disco-fever-stage' : ''}
            style={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              width: '100%',
              borderRadius: 22,
              borderTopWidth: 3,
              borderRightWidth: 3,
              borderLeftWidth: 3,
              borderBottomWidth: 5,
              borderStyle: 'solid',
              borderColor: discoActive ? '#f43f5e' : '#6366f1',
              background: discoActive
                ? 'radial-gradient(circle at 50% 35%, #4c1d95 0%, #312e81 55%, #1e1b4b 100%)'
                : 'radial-gradient(circle at 50% 25%, #3730a3 0%, #1e1b4b 70%, #0f172a 100%)',
              overflow: 'hidden',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: 'calc(100% - 16px)',
                padding: '3px 11px',
                borderRadius: 999,
                background: 'rgba(15, 23, 42, 0.78)',
                color: '#fef08a',
                fontSize: '0.75rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              {toast}
            </div>

            {bubbles.map((b) => {
              const isWobbling = wobbleUid === b.uid;
              if (b.kind === 'star') {
                return (
                  <motion.button
                    key={b.uid}
                    type="button"
                    aria-label="Golden Star Note"
                    onClick={() => handlePopBubble(b)}
                    whileTap={{ scale: 0.85 }}
                    style={{
                      position: 'absolute',
                      left: `${b.x}%`,
                      top: `${b.y}%`,
                      transform: 'translate(-50%, -50%)',
                      willChange: 'top, left',
                      padding: '6px 11px',
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)',
                      borderTopWidth: 2,
                      borderRightWidth: 2,
                      borderLeftWidth: 2,
                      borderBottomWidth: 4,
                      borderStyle: 'solid',
                      borderColor: '#b45309',
                      color: '#451a03',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                      zIndex: 10,
                    }}
                  >
                    <Star size={15} fill="#ffffff" />
                    <span>+5 Gems / +3s</span>
                  </motion.button>
                );
              }

              if (!b.item) return null;
              const pal = BUBBLE_PALETTES[b.paletteIndex];

              return (
                <motion.button
                  key={b.uid}
                  type="button"
                  dir={langDir}
                  onClick={() => handlePopBubble(b)}
                  animate={isWobbling ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
                  transition={{ duration: 0.35 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    position: 'absolute',
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    transform: 'translate(-50%, -50%)',
                    willChange: 'top, left',
                    padding: isCompact ? '5px 9px' : '6px 11px',
                    borderRadius: 24,
                    background: pal.bg,
                    borderTopWidth: 2,
                    borderRightWidth: 2,
                    borderLeftWidth: 2,
                    borderBottomWidth: 4,
                    borderStyle: 'solid',
                    borderColor: pal.border,
                    color: pal.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    maxWidth: isCompact ? '44%' : '250px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
                    zIndex: 8,
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                    <VocabIllustration
                      illustrationKey={b.item.illustrationKey}
                      language={language}
                      size={isCompact ? 20 : 26}
                    />
                  </span>
                  <span
                    dir={langDir}
                    style={getArcadeForeignTextStyle(language, b.item.foreign, {
                      isCompact,
                      density: 'normal',
                      color: pal.text,
                    })}
                  >
                    {b.item.foreign}
                  </span>
                </motion.button>
              );
            })}

            {/* Bottom 5-Companion Choir Stage */}
            <div
              aria-label="Critter Choir"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 2,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                padding: '0 6px',
                pointerEvents: 'none',
                zIndex: 4,
              }}
            >
              {CHOIR_COMPANIONS.map((cid) => (
                <MascotStage
                  key={cid}
                  companionId={cid}
                  pose={choirPose}
                  equippedCosmetics={cid === 'pip' ? activeProfile.equippedCosmetics : undefined}
                  comboCount={discoActive ? 6 : streak}
                  size={isCompact ? 42 : 54}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}

      {/* Summary Victory */}
      {phase === 'summary' && summary ? (
        <ArcadeSummaryCard
          companionId="pip"
          badgeText="Encore Victory!"
          title="Encore! Starlight Critter Choir Complete!"
          score={summary.score}
          bestScore={bestScore}
          heartsWon={summary.heartsWon}
          bonusGems={summary.bonusGems}
          statLine={`Song-Bubbles popped: ${summary.catches}`}
          isCompact={isCompact}
          playAgainLabel="Play Encore!"
          mascotSlot={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isCompact ? 2 : 6,
                flexWrap: 'wrap',
              }}
            >
              {CHOIR_COMPANIONS.map((cid) => (
                <MascotStage
                  key={cid}
                  companionId={cid}
                  pose="victory_dance"
                  equippedCosmetics={cid === 'pip' ? activeProfile.equippedCosmetics : undefined}
                  size={isCompact ? 46 : 62}
                />
              ))}
            </div>
          }
          onPlayAgain={startRun}
          onExit={onExit}
          exitLabel="Back to Arcade Hub"
        />
      ) : null}
    </section>
  );
}
