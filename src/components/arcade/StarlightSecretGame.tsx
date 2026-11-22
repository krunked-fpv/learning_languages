import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Gem, Heart, Music, Play, RotateCcw, Sparkles, Star, Volume2, X } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { getArcadeLexicon } from '../../curriculum';
import { playSfx, speakPhrase } from '../../audio';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import { MascotStage } from '../characters/MascotStage';
import { ConfettiBurst } from '../fx/JuiceEngine';
import type { ArcadeLanternItem, CharacterPose, CompanionId, LanguageCode } from '../../types/contracts';

const ROUND_DURATION_SECONDS = 45;
const CHOIR_COMPANIONS: readonly CompanionId[] = ['pip', 'mateo', 'colette', 'benni', 'luca'];

const FALLBACK_CHOIR_LEXICON: Record<LanguageCode, ArcadeLanternItem[]> = {
  es: [
    { id: 'sc-es-1', language: 'es', foreign: 'hola', english: 'hello', phonetic: 'OH-lah', illustrationKey: 'wave_hello' },
    { id: 'sc-es-2', language: 'es', foreign: 'el sol', english: 'the sun', phonetic: 'el SOHL', illustrationKey: 'morning_sun' },
    { id: 'sc-es-3', language: 'es', foreign: 'la manzana', english: 'the apple', phonetic: 'lah mahn-SAH-nah', illustrationKey: 'fresh_apple' },
    { id: 'sc-es-4', language: 'es', foreign: 'el gato', english: 'the cat', phonetic: 'el GAH-toh', illustrationKey: 'cozy_cat' },
  ],
  fr: [
    { id: 'sc-fr-1', language: 'fr', foreign: 'bonjour', english: 'hello', phonetic: 'bon-ZHOOR', illustrationKey: 'wave_hello' },
    { id: 'sc-fr-2', language: 'fr', foreign: "l'eau", english: 'the water', phonetic: 'LOH', illustrationKey: 'water_carafe' },
    { id: 'sc-fr-3', language: 'fr', foreign: 'le croissant', english: 'the croissant', phonetic: 'luh kwah-SAHN', illustrationKey: 'flaky_pastry' },
    { id: 'sc-fr-4', language: 'fr', foreign: 'la pomme', english: 'the apple', phonetic: 'lah POHM', illustrationKey: 'fresh_apple' },
  ],
  de: [
    { id: 'sc-de-1', language: 'de', foreign: 'hallo', english: 'hello', phonetic: 'HAH-loh', illustrationKey: 'wave_hello' },
    { id: 'sc-de-2', language: 'de', foreign: 'das Brot', english: 'the bread', phonetic: 'dahs BROHT', illustrationKey: 'warm_bread' },
    { id: 'sc-de-3', language: 'de', foreign: 'die Katze', english: 'the cat', phonetic: 'dee KAHT-suh', illustrationKey: 'cozy_cat' },
    { id: 'sc-de-4', language: 'de', foreign: 'der Apfel', english: 'the apple', phonetic: 'dair AHP-fel', illustrationKey: 'fresh_apple' },
  ],
  it: [
    { id: 'sc-it-1', language: 'it', foreign: 'ciao', english: 'hello', phonetic: 'CHOW', illustrationKey: 'wave_hello' },
    { id: 'sc-it-2', language: 'it', foreign: 'il gelato', english: 'the gelato', phonetic: 'eel jeh-LAH-toh', illustrationKey: 'sweet_gelato' },
    { id: 'sc-it-3', language: 'it', foreign: 'il gatto', english: 'the cat', phonetic: 'eel GAHT-toh', illustrationKey: 'cozy_cat' },
    { id: 'sc-it-4', language: 'it', foreign: 'la mela', english: 'the apple', phonetic: 'lah MEH-lah', illustrationKey: 'fresh_apple' },
  ],
};

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
  const { activeProfile, activeProgress } = useVaultStore();
  const language = activeProfile.activeLanguage;

  const lexicon = useMemo(() => {
    const items = getArcadeLexicon(
      language,
      activeProgress.unlockedVocabIds,
      activeProgress.currentUnitIndex
    );
    return items.length > 0 ? items : FALLBACK_CHOIR_LEXICON[language];
  }, [language, activeProgress.unlockedVocabIds, activeProgress.currentUnitIndex]);

  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>('ready');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [choirPose, setChoirPose] = useState<CharacterPose>('idle');
  const [targetItem, setTargetItem] = useState<ArcadeLanternItem>(() => lexicon[0]);
  const [bubbles, setBubbles] = useState<SongBubbleEntity[]>([]);
  const [wobbleUid, setWobbleUid] = useState<number | null>(null);
  const [toast, setToast] = useState<string>('Pop the floating Song-Bubble matching the clue!');
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
    vaultActions.completeSecretArcadeRun({ score: finalScore, heartsWon, bonusGems });
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
        y: 86,
        speed: 14,
        swayOffset: 0,
        paletteIndex: 0,
      },
      ...distractors.map((d, idx) => ({
        uid: nextUidRef.current++,
        kind: 'word' as const,
        item: d,
        x: idx === 0 ? 22 : 78,
        y: 92 + idx * 4,
        speed: 13 + idx,
        swayOffset: idx + 1,
        paletteIndex: (idx + 1) % BUBBLE_PALETTES.length,
      })),
    ];
    setBubbles([...bubblesRef.current]);
    setPhase('playing');
  }, [lexicon, pickNextTarget]);

  // 60fps floating song-bubble loop
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

      // Spawn bubbles cleanly without duplicates
      spawnTimerRef.current += dt;
      starTimerRef.current -= dt;
      if (starTimerRef.current <= 0 && bubblesRef.current.length < 7) {
        starTimerRef.current = 6.5;
        bubblesRef.current.push({
          uid: nextUidRef.current++,
          kind: 'star',
          x: 16 + Math.random() * 68,
          y: 102,
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
            x: 16 + Math.random() * 68,
            y: 102,
            speed: 13 + Math.random() * 6,
            swayOffset: Math.random() * Math.PI * 2,
            paletteIndex: Math.floor(Math.random() * BUBBLE_PALETTES.length),
          });
        }
      }

      // Float bubbles upward smoothly
      const nextList: SongBubbleEntity[] = [];
      for (const b of bubblesRef.current) {
        const nextY = b.y - b.speed * dt;
        const swayX = Math.max(12, Math.min(88, b.x + Math.sin(elapsedRef.current * 2.2 + b.swayOffset) * 5 * dt));
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
      bubblesRef.current = bubblesRef.current.filter(
        (b) => !(b.kind === 'word' && b.item?.id === poppedId)
      );
      setBubbles([...bubblesRef.current]);
      spawnTimerRef.current = 0.75;
      setToast(
        isDisco
          ? `STARLIGHT DISCO FEVER! +${pts} pts!`
          : `Popped "${bubble.item.foreign}"! +${pts} pts!`
      );
      pickNextTarget(poppedId, false);
      if (!isDisco) {
        window.setTimeout(() => setChoirPose('idle'), 650);
      }
    } else {
      streakRef.current = 0;
      setStreak(0);
      setChoirPose('sympathetic');
      setWobbleUid(bubble.uid);
      playSfx('gentle_nudge');
      setToast(`Oops! Find "${targetRef.current.english}"!`);
      window.setTimeout(() => {
        setWobbleUid((cur) => (cur === bubble.uid ? null : cur));
        setChoirPose('idle');
      }, 450);
    }
  };

  const discoActive = streak >= 5;
  const discoPct = Math.min(100, Math.round((streak / 5) * 100));

  return (
    <section
      aria-label="Starlight Critter Choir"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
      }}
    >
      {/* Top Choir Header */}
      <div
        className="tactile-card"
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          background: 'linear-gradient(135deg, #eef2ff 0%, #fffbeb 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Music size={22} color="#4f46e5" />
          <div>
            <div style={{ fontSize: '1.08rem', fontWeight: 900, color: '#1e1b4b' }}>
              Starlight Critter Choir
            </div>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>
              Musical Secret Mini-Game • Best Score: {activeProfile.secretArcadeBestScore ?? 0}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            className="hud-pill hud-pill-static"
            style={{ background: '#fffbeb', borderColor: '#f59e0b', color: '#b45309' }}
          >
            <Star size={14} fill="#f59e0b" /> Score: {score}
          </span>
          <span
            className="hud-pill hud-pill-static"
            style={{ background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }}
          >
            {timeLeft}s
          </span>
          <button
            type="button"
            className="tactile-btn tactile-btn-soft"
            style={{ padding: '5px 10px', fontSize: '0.8rem' }}
            onClick={onExit}
          >
            <X size={15} />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Ready Intro */}
      {phase === 'ready' ? (
        <div
          className="tactile-card"
          style={{
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            {CHOIR_COMPANIONS.map((cid) => (
              <MascotStage
                key={cid}
                companionId={cid}
                pose="happy"
                equippedCosmetics={cid === 'pip' ? activeProfile.equippedCosmetics : undefined}
                size={68}
              />
            ))}
          </div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
            Pop Musical Song-Bubbles With All 5 Companions!
          </h2>
          <p style={{ margin: 0, maxWidth: 500, fontWeight: 700, color: '#475569' }}>
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
          {/* Target Prompt + Disco Fever Meter */}
          <div
            className="tactile-card"
            style={{
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              background: discoActive
                ? 'linear-gradient(90deg, #fef3c7 0%, #fce7f3 50%, #e0e7ff 100%)'
                : '#fffbeb',
              borderColor: discoActive ? '#f43f5e' : '#fbbf24',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#b45309' }}>
                POP SONG-BUBBLE:
              </span>
              <strong style={{ fontSize: '1.12rem', color: '#1e1b4b' }}>
                {targetItem.english}
              </strong>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: '#ffffff',
                  color: '#4338ca',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                }}
              >
                {targetItem.phonetic}
              </span>
              <button
                type="button"
                className="tactile-btn tactile-btn-soft"
                style={{ padding: '4px 9px', fontSize: '0.76rem' }}
                onClick={() => {
                  void speakPhrase({
                    text: targetItem.foreign,
                    language,
                    phonetic: targetItem.phonetic,
                  });
                }}
              >
                <Volume2 size={14} /> Hear
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 110 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: discoActive ? '#be123c' : '#4338ca' }}>
                  {discoActive ? 'DISCO FEVER 2x!' : `Disco Meter ${streak}/5`}
                </div>
                <div style={{ height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
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
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={finishRun}
              >
                Claim Rewards
              </button>
            </div>
          </div>

          {/* Floating Bubbles Stage + 5-Companion Choir */}
          <div
            className={discoActive ? 'disco-fever-stage' : ''}
            style={{
              position: 'relative',
              width: '100%',
              height: 'min(54dvh, 410px)',
              minHeight: 270,
              borderRadius: 24,
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
            {/* Status Pill */}
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '4px 12px',
                borderRadius: 999,
                background: 'rgba(15, 23, 42, 0.72)',
                color: '#fef08a',
                fontSize: '0.78rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              {toast}
            </div>

            {/* Song-Bubbles & Golden Star Notes */}
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
                      padding: '7px 12px',
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
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      cursor: 'pointer',
                      zIndex: 10,
                    }}
                  >
                    <Star size={16} fill="#ffffff" />
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
                  onClick={() => handlePopBubble(b)}
                  animate={isWobbling ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
                  transition={{ duration: 0.35 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    position: 'absolute',
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    transform: 'translate(-50%, -50%)',
                    padding: '6px 11px',
                    borderRadius: 999,
                    background: pal.bg,
                    borderTopWidth: 2,
                    borderRightWidth: 2,
                    borderLeftWidth: 2,
                    borderBottomWidth: 4,
                    borderStyle: 'solid',
                    borderColor: pal.border,
                    color: pal.text,
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
                    zIndex: 8,
                  }}
                >
                  <VocabIllustration
                    illustrationKey={b.item.illustrationKey}
                    language={language}
                    size={26}
                  />
                  <span>{b.item.foreign}</span>
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
                  size={54}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}

      {/* Summary Victory */}
      {phase === 'summary' && summary ? (
        <div
          className="tactile-card"
          style={{
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <ConfettiBurst active intensity="grand" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            {CHOIR_COMPANIONS.map((cid) => (
              <MascotStage
                key={cid}
                companionId={cid}
                pose="victory_dance"
                equippedCosmetics={cid === 'pip' ? activeProfile.equippedCosmetics : undefined}
                size={64}
              />
            ))}
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#312e81' }}>
            Encore! Starlight Critter Choir Complete!
          </h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span className="hud-pill hud-pill-static" style={{ background: '#fffbeb', borderColor: '#f59e0b', color: '#b45309' }}>
              <Sparkles size={15} /> Score: {summary.score}
            </span>
            <span className="hud-pill hud-pill-static" style={{ background: '#fff1f2', borderColor: '#fda4af', color: '#be123c' }}>
              <Heart size={15} fill="#f43f5e" /> +{summary.heartsWon} Hearts
            </span>
            <span className="hud-pill hud-pill-static" style={{ background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }}>
              <Gem size={15} /> +{summary.bonusGems} Gems
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="tactile-btn tactile-btn-hero tactile-btn-indigo"
              onClick={startRun}
            >
              <RotateCcw size={18} />
              <span>Play Encore!</span>
            </button>
            <button
              type="button"
              className="tactile-btn tactile-btn-hero tactile-btn-soft"
              onClick={onExit}
            >
              Back to Arcade Hub
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
