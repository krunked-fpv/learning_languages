import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Heart, Gem, Play, RotateCcw, Sparkles, Volume2, X } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { getArcadeLexicon } from '../../curriculum';
import { playSfx, speakPhrase } from '../../audio';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import { MascotStage } from '../characters/MascotStage';
import type { ArcadeLanternItem, CharacterPose, LanguageCode } from '../../types/contracts';

const ROUND_DURATION_SECONDS = 45;

const FALLBACK_LEXICON: Record<LanguageCode, ArcadeLanternItem[]> = {
  es: [
    { id: 'fb-es-1', language: 'es', foreign: 'hola', english: 'hello', phonetic: 'OH-lah', illustrationKey: 'wave_hello' },
    { id: 'fb-es-2', language: 'es', foreign: 'el agua', english: 'the water', phonetic: 'el AH-gwah', illustrationKey: 'water_carafe' },
    { id: 'fb-es-3', language: 'es', foreign: 'el sol', english: 'the sun', phonetic: 'el SOHL', illustrationKey: 'morning_sun' },
    { id: 'fb-es-4', language: 'es', foreign: 'el gato', english: 'the cat', phonetic: 'el GAH-toh', illustrationKey: 'cozy_cat' },
    { id: 'fb-es-5', language: 'es', foreign: 'la manzana', english: 'the apple', phonetic: 'lah mahn-SAH-nah', illustrationKey: 'fresh_apple' },
  ],
  fr: [
    { id: 'fb-fr-1', language: 'fr', foreign: 'bonjour', english: 'hello', phonetic: 'bon-ZHOOR', illustrationKey: 'wave_hello' },
    { id: 'fb-fr-2', language: 'fr', foreign: "l'eau", english: 'the water', phonetic: 'LOH', illustrationKey: 'water_carafe' },
    { id: 'fb-fr-3', language: 'fr', foreign: 'le croissant', english: 'the croissant', phonetic: 'luh kwah-SAHN', illustrationKey: 'flaky_pastry' },
    { id: 'fb-fr-4', language: 'fr', foreign: 'le chat', english: 'the cat', phonetic: 'luh SHAH', illustrationKey: 'cozy_cat' },
    { id: 'fb-fr-5', language: 'fr', foreign: 'la pomme', english: 'the apple', phonetic: 'lah POHM', illustrationKey: 'fresh_apple' },
  ],
  de: [
    { id: 'fb-de-1', language: 'de', foreign: 'hallo', english: 'hello', phonetic: 'HAH-loh', illustrationKey: 'wave_hello' },
    { id: 'fb-de-2', language: 'de', foreign: 'das Wasser', english: 'the water', phonetic: 'dahs VAH-ser', illustrationKey: 'water_carafe' },
    { id: 'fb-de-3', language: 'de', foreign: 'das Brot', english: 'the bread', phonetic: 'dahs BROHT', illustrationKey: 'warm_bread' },
    { id: 'fb-de-4', language: 'de', foreign: 'die Katze', english: 'the cat', phonetic: 'dee KAHT-suh', illustrationKey: 'cozy_cat' },
    { id: 'fb-de-5', language: 'de', foreign: 'der Apfel', english: 'the apple', phonetic: 'dair AHP-fel', illustrationKey: 'fresh_apple' },
  ],
  it: [
    { id: 'fb-it-1', language: 'it', foreign: 'ciao', english: 'hello', phonetic: 'CHOW', illustrationKey: 'wave_hello' },
    { id: 'fb-it-2', language: 'it', foreign: "l'acqua", english: 'the water', phonetic: 'LAHK-wah', illustrationKey: 'water_carafe' },
    { id: 'fb-it-3', language: 'it', foreign: 'il gelato', english: 'the gelato', phonetic: 'eel jeh-LAH-toh', illustrationKey: 'sweet_gelato' },
    { id: 'fb-it-4', language: 'it', foreign: 'il gatto', english: 'the cat', phonetic: 'eel GAHT-toh', illustrationKey: 'cozy_cat' },
    { id: 'fb-it-5', language: 'it', foreign: 'la mela', english: 'the apple', phonetic: 'lah MEH-lah', illustrationKey: 'fresh_apple' },
  ],
};

interface FallingEntity {
  uid: number;
  kind: 'lantern' | 'cloud';
  item?: ArcadeLanternItem;
  x: number; // 10..90 %
  y: number; // -10..105 %
  speed: number; // % per second
  swayOffset: number;
}

export interface SkyCatcherArcadeProps {
  isHeartRecovery?: boolean;
  onResumeLesson?: () => void;
  onExit?: () => void;
}

export function SkyCatcherArcade({
  isHeartRecovery = false,
  onResumeLesson,
  onExit,
}: SkyCatcherArcadeProps) {
  const { activeProfile, activeProgress } = useVaultStore();
  const language = activeProfile.activeLanguage;

  const lexicon = useMemo(() => {
    const items = getArcadeLexicon(
      language,
      activeProgress.unlockedVocabIds,
      activeProgress.currentUnitIndex
    );
    return items.length > 0 ? items : FALLBACK_LEXICON[language];
  }, [language, activeProgress.unlockedVocabIds, activeProgress.currentUnitIndex]);

  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>(
    isHeartRecovery ? 'playing' : 'ready'
  );
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [catches, setCatches] = useState(0);
  const [combo, setCombo] = useState(0);
  const [pipX, setPipX] = useState(50);
  const [pipPose, setPipPose] = useState<CharacterPose>('idle');
  const [targetItem, setTargetItem] = useState<ArcadeLanternItem>(() => lexicon[0]);
  const [entities, setEntities] = useState<FallingEntity[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<{
    heartsWon: number;
    bonusGems: number;
    catches: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pipXRef = useRef(50);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const targetRef = useRef<ArcadeLanternItem>(lexicon[0]);
  const catchesRef = useRef(0);
  const comboRef = useRef(0);
  const entitiesRef = useRef<FallingEntity[]>([]);
  const nextUidRef = useRef(1);
  const spawnTimerRef = useRef(0);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);

  const pickNextTarget = useCallback(
    (avoidId?: string): ArcadeLanternItem => {
      const pool = lexicon.filter((item) => item.id !== avoidId);
      const list = pool.length > 0 ? pool : lexicon;
      const chosen = list[Math.floor(Math.random() * list.length)];
      targetRef.current = chosen;
      setTargetItem(chosen);
      return chosen;
    },
    [lexicon]
  );

  const finishRound = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const totalCatches = catchesRef.current;
    const heartsWon = Math.min(5, Math.max(1, Math.ceil(totalCatches / 2)));
    const bonusGems = totalCatches * 3 + (totalCatches >= 6 ? 10 : 0);
    vaultActions.restoreHeartsFromArcade({ heartsWon, bonusGems });
    playSfx('unit_fanfare');
    setSummaryResult({ heartsWon, bonusGems, catches: totalCatches });
    setPhase('summary');
  }, []);

  const startRound = useCallback(() => {
    playSfx('button_click');
    finishedRef.current = false;
    catchesRef.current = 0;
    comboRef.current = 0;
    pipXRef.current = 50;
    spawnTimerRef.current = 0.7;
    elapsedRef.current = 0;
    entitiesRef.current = [];
    setCatches(0);
    setCombo(0);
    setPipX(50);
    setPipPose('idle');
    setTimeLeft(ROUND_DURATION_SECONDS);
    setToast('Catch the matching word lantern!');
    setSummaryResult(null);
    const first = pickNextTarget();
    entitiesRef.current = [
      {
        uid: nextUidRef.current++,
        kind: 'lantern',
        item: first,
        x: 50,
        y: 6,
        speed: 22,
        swayOffset: 0,
      },
    ];
    setEntities([...entitiesRef.current]);
    setPhase('playing');
  }, [pickNextTarget]);

  // Auto-start when opened immediately from Zero-Heart Recovery
  useEffect(() => {
    if (isHeartRecovery) {
      startRound();
    }
  }, [isHeartRecovery, startRound]);

  // Keyboard controls (ArrowLeft / ArrowRight / A / D)
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      keysRef.current = { left: false, right: false };
    };
  }, [phase]);

  // 60fps requestAnimationFrame Loop
  useEffect(() => {
    if (phase !== 'playing') return;

    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      elapsedRef.current += dt;
      const remaining = Math.max(0, Math.ceil(ROUND_DURATION_SECONDS - elapsedRef.current));
      setTimeLeft((prev) => (prev !== remaining ? remaining : prev));

      if (elapsedRef.current >= ROUND_DURATION_SECONDS) {
        finishRound();
        return;
      }

      // Keyboard movement
      let nextPipX = pipXRef.current;
      if (keysRef.current.left) nextPipX -= 68 * dt;
      if (keysRef.current.right) nextPipX += 68 * dt;
      nextPipX = Math.max(10, Math.min(90, nextPipX));
      if (nextPipX !== pipXRef.current) {
        pipXRef.current = nextPipX;
        setPipX(nextPipX);
      }

      // Spawn lanterns & occasional storm clouds
      spawnTimerRef.current += dt;
      if (spawnTimerRef.current >= 1.15 && entitiesRef.current.length < 6) {
        spawnTimerRef.current = 0;
        const hasTargetOnScreen = entitiesRef.current.some(
          (ent) => ent.kind === 'lantern' && ent.item?.id === targetRef.current.id && ent.y < 68
        );
        const shouldSpawnCloud = hasTargetOnScreen && Math.random() < 0.24;

        if (shouldSpawnCloud) {
          entitiesRef.current.push({
            uid: nextUidRef.current++,
            kind: 'cloud',
            x: 12 + Math.random() * 76,
            y: -8,
            speed: 23 + Math.random() * 9,
            swayOffset: Math.random() * Math.PI * 2,
          });
        } else {
          const spawnTarget = !hasTargetOnScreen || Math.random() < 0.55;
          const others = lexicon.filter((i) => i.id !== targetRef.current.id);
          const item =
            spawnTarget || others.length === 0
              ? targetRef.current
              : others[Math.floor(Math.random() * others.length)];
          entitiesRef.current.push({
            uid: nextUidRef.current++,
            kind: 'lantern',
            item,
            x: 14 + Math.random() * 72,
            y: -10,
            speed: 19 + Math.random() * 8,
            swayOffset: Math.random() * Math.PI * 2,
          });
        }
      }

      // Advance entities & test collision near Pip's basket (y: 74..92, |x - pipX| < 14)
      const survivors: FallingEntity[] = [];
      for (const ent of entitiesRef.current) {
        const nextY = ent.y + ent.speed * dt;
        const swayX = Math.max(9, Math.min(91, ent.x + Math.sin(elapsedRef.current * 2 + ent.swayOffset) * 4 * dt));
        const hitPip = nextY >= 73 && nextY <= 92 && Math.abs(swayX - pipXRef.current) <= 13.5;

        if (hitPip) {
          if (ent.kind === 'lantern' && ent.item?.id === targetRef.current.id) {
            catchesRef.current += 1;
            comboRef.current += 1;
            setCatches(catchesRef.current);
            setCombo(comboRef.current);
            setPipPose('happy');
            setToast(`Caught "${ent.item.foreign}"! +1 Heart Charge!`);
            playSfx(comboRef.current >= 3 ? 'combo_3x' : 'heart_win', comboRef.current);
            pickNextTarget(ent.item.id);
            window.setTimeout(() => setPipPose('idle'), 550);
          } else {
            comboRef.current = 0;
            setCombo(0);
            setPipPose('sympathetic');
            setToast(
              ent.kind === 'cloud'
                ? 'Whoops — watch out for storm clouds!'
                : `Oops! Look for "${targetRef.current.english}"!`
            );
            playSfx('gentle_nudge');
            window.setTimeout(() => setPipPose('idle'), 600);
          }
          continue;
        }

        if (nextY < 105) {
          survivors.push({ ...ent, x: swayX, y: nextY });
        }
      }

      entitiesRef.current = survivors;
      setEntities(survivors);
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, lexicon, finishRound, pickNextTarget]);

  const movePipToClientX = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(10, Math.min(90, pct));
    pipXRef.current = clamped;
    setPipX(clamped);
  };

  const nudgePip = (delta: number) => {
    const clamped = Math.max(10, Math.min(90, pipXRef.current + delta));
    pipXRef.current = clamped;
    setPipX(clamped);
  };

  const heartsPreview = catches > 0 ? Math.min(5, Math.ceil(catches / 2)) : 1;

  return (
    <section
      aria-label="Sky-Catcher Fiesta Arcade"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: '100%',
        maxWidth: 880,
        margin: '0 auto',
      }}
    >
      {/* Top Arcade Bar */}
      <div
        className="tactile-card"
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={20} color="#f59e0b" />
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e1b4b' }}>
              Sky-Catcher Fiesta
            </div>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>
              {isHeartRecovery
                ? 'Catch word lanterns to recharge Pip’s Hearts!'
                : 'Glide Pip under matching word lanterns & dodge storm clouds!'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 999,
              background: '#fff1f2',
              border: '2px solid #fda4af',
              color: '#be123c',
              fontWeight: 900,
              fontSize: '0.84rem',
            }}
          >
            <Heart size={15} fill="#f43f5e" /> +{heartsPreview} Hearts
          </span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: '#eff6ff',
              border: '2px solid #93c5fd',
              color: '#1d4ed8',
              fontWeight: 900,
              fontSize: '0.84rem',
            }}
          >
            {timeLeft}s
          </span>
          {onExit ? (
            <button
              type="button"
              className="tactile-btn tactile-btn-soft"
              style={{ padding: '5px 10px', fontSize: '0.8rem' }}
              onClick={onExit}
            >
              <X size={15} />
              <span>Exit</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Ready Intro Screen */}
      {phase === 'ready' ? (
        <div
          className="tactile-card"
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            textAlign: 'center',
          }}
        >
          <MascotStage
            companionId="pip"
            pose="happy"
            equippedCosmetics={activeProfile.equippedCosmetics}
            size={140}
            badgeText="Sky-Catcher Ready!"
          />
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
            Catch Lanterns, Win Hearts & Gems!
          </h2>
          <p style={{ margin: 0, maxWidth: 460, fontWeight: 700, color: '#475569' }}>
            Drag Pip, tap Left/Right buttons, or press Arrow / A-D keys for 45 seconds to catch
            lanterns matching the target English meaning!
          </p>
          <button
            type="button"
            className="tactile-btn tactile-btn-hero tactile-btn-primary"
            onClick={startRound}
          >
            <Play size={20} />
            <span>Start 45s Fiesta!</span>
          </button>
        </div>
      ) : null}

      {/* Active Playing Field */}
      {phase === 'playing' ? (
        <>
          {/* Target Prompt Banner */}
          <div
            className="tactile-card"
            style={{
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              background: '#fffbeb',
              borderColor: '#fbbf24',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#b45309' }}>
                CATCH:
              </span>
              <strong style={{ fontSize: '1.15rem', color: '#1e1b4b' }}>
                {targetItem.english}
              </strong>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                }}
              >
                {targetItem.phonetic}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="tactile-btn tactile-btn-soft"
                style={{ padding: '4px 9px', fontSize: '0.78rem' }}
                onClick={() => {
                  void speakPhrase({
                    text: targetItem.foreign,
                    language,
                    phonetic: targetItem.phonetic,
                  });
                }}
              >
                <Volume2 size={14} />
                <span>Hint</span>
              </button>
              <span style={{ fontWeight: 900, fontSize: '0.86rem', color: '#065f46' }}>
                Catches: {catches} {combo >= 2 ? `(${combo}x!)` : ''}
              </span>
            </div>
          </div>

          {/* 60fps Sky Playfield */}
          <div
            ref={canvasRef}
            className="arcade-sky-canvas"
            onPointerDown={(e) => movePipToClientX(e.clientX)}
            onPointerMove={(e) => {
              if (e.buttons > 0 || e.pointerType === 'mouse') {
                movePipToClientX(e.clientX);
              }
            }}
          >
            {/* Decorative Clouds */}
            <svg
              aria-hidden="true"
              viewBox="0 0 800 180"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0.25,
                pointerEvents: 'none',
              }}
            >
              <ellipse cx="130" cy="48" rx="70" ry="24" fill="#ffffff" />
              <ellipse cx="640" cy="70" rx="85" ry="28" fill="#ffffff" />
              <circle cx="715" cy="45" r="24" fill="#fde047" />
            </svg>

            {/* Falling Lanterns & Storm Clouds */}
            {entities.map((ent) =>
              ent.kind === 'lantern' && ent.item ? (
                <div
                  key={ent.uid}
                  style={{
                    position: 'absolute',
                    left: `${ent.x}%`,
                    top: `${ent.y}%`,
                    transform: 'translate(-50%, -50%)',
                    padding: '5px 10px',
                    borderRadius: 16,
                    background: '#ffffff',
                    border: '2px solid #f59e0b',
                    borderBottomWidth: 4,
                    boxShadow: '0 8px 18px rgba(30, 27, 75, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                >
                  <VocabIllustration
                    illustrationKey={ent.item.illustrationKey}
                    language={language}
                    size={30}
                  />
                  <span style={{ fontWeight: 900, fontSize: '0.86rem', color: '#1e1b4b' }}>
                    {ent.item.foreign}
                  </span>
                </div>
              ) : (
                <div
                  key={ent.uid}
                  style={{
                    position: 'absolute',
                    left: `${ent.x}%`,
                    top: `${ent.y}%`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                >
                  <svg width="56" height="44" viewBox="0 0 64 50" aria-label="Storm cloud">
                    <path
                      d="M16 36h34a10 10 0 0 0 2-20 14 14 0 0 0-27-3 11 11 0 0 0-9 23z"
                      fill="#64748b"
                      stroke="#334155"
                      strokeWidth="3"
                    />
                    <path d="M22 21l6 3M42 21l-6 3" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M31 36l-4 8h5l-3 6" stroke="#fde047" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              )
            )}

            {/* Pip Catcher */}
            <div
              style={{
                position: 'absolute',
                left: `${pipX}%`,
                bottom: 6,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                transition: 'left 40ms linear',
              }}
            >
              <MascotStage
                companionId="pip"
                pose={pipPose}
                equippedCosmetics={activeProfile.equippedCosmetics}
                size={76}
              />
            </div>

            {toast ? (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: 'rgba(15, 23, 42, 0.76)',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {toast}
              </div>
            ) : null}
          </div>

          {/* Mobile / Tablet Tap Controls + Early Claim */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="tactile-btn tactile-btn-soft"
                aria-label="Move Pip left"
                onClick={() => nudgePip(-14)}
              >
                <ArrowLeft size={18} />
                <span>Left</span>
              </button>
              <button
                type="button"
                className="tactile-btn tactile-btn-soft"
                aria-label="Move Pip right"
                onClick={() => nudgePip(14)}
              >
                <span>Right</span>
                <ArrowRight size={18} />
              </button>
            </div>

            <button
              type="button"
              className="tactile-btn tactile-btn-success"
              onClick={finishRound}
            >
              Claim +{heartsPreview} Hearts
            </button>
          </div>
        </>
      ) : null}

      {/* Summary Screen */}
      {phase === 'summary' && summaryResult ? (
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
          <MascotStage
            companionId="pip"
            pose="victory_dance"
            equippedCosmetics={activeProfile.equippedCosmetics}
            size={132}
            badgeText="Hearts Recharged!"
          />
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#065f46' }}>
            Sky-Catcher Complete!
          </h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span className="hud-pill hud-pill-static" style={{ background: '#fff1f2', borderColor: '#fda4af', color: '#be123c' }}>
              <Heart size={16} fill="#f43f5e" /> +{summaryResult.heartsWon} Hearts Restored
            </span>
            <span className="hud-pill hud-pill-static" style={{ background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }}>
              <Gem size={16} /> +{summaryResult.bonusGems} Bonus Gems
            </span>
          </div>
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#475569' }}>
            Lanterns caught: {summaryResult.catches}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
            {isHeartRecovery && onResumeLesson ? (
              <button
                type="button"
                className="tactile-btn tactile-btn-hero tactile-btn-success"
                onClick={onResumeLesson}
              >
                Resume Lesson!
              </button>
            ) : (
              <button
                type="button"
                className="tactile-btn tactile-btn-hero tactile-btn-primary"
                onClick={startRound}
              >
                <RotateCcw size={18} />
                <span>Play Again!</span>
              </button>
            )}

            {onExit ? (
              <button
                type="button"
                className="tactile-btn tactile-btn-hero tactile-btn-soft"
                onClick={onExit}
              >
                Back to Atlas Map
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
