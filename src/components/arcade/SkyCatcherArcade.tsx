import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { playSfx } from '../../audio';
import { useVaultStore } from '../../store/useVaultStore';
import {
  LANGUAGE_META,
  type ArcadeLanternItem,
  type ArcadeProficiencyTier,
  type CharacterPose,
} from '../../types/contracts';
import { MascotStage } from '../characters/MascotStage';
import { SkyCatcherEmblem } from './ArcadeEmblems';
import {
  ARCADE_SHELL_STYLE,
  ArcadeHeaderBar,
  ArcadeReadyCard,
  ArcadeSummaryCard,
  SOFT_BTN_STYLE,
  TargetPromptBar,
  computeScaledArcadeRewards,
  getArcadeForeignTextStyle,
  recordArcadeRunResult,
  useArcadeContainerMetrics,
  useArcadeDeck,
} from './arcadeShared';

const ROUND_DURATION_SECONDS = 45;

interface FallingEntity {
  uid: number;
  kind: 'lantern' | 'cloud';
  item?: ArcadeLanternItem;
  x: number;
  y: number;
  speed: number;
  swayOffset: number;
}

export interface SkyCatcherArcadeProps {
  arcadeTier?: ArcadeProficiencyTier;
  isHeartRecovery?: boolean;
  onResumeLesson?: () => void;
  onExit?: () => void;
}

export function SkyCatcherArcade({
  arcadeTier = 'sprout',
  isHeartRecovery = false,
  onResumeLesson,
  onExit,
}: SkyCatcherArcadeProps) {
  const { activeProfile } = useVaultStore();
  const { language, lexicon, targetLexicon, bestScoreFor, paceMultiplier } =
    useArcadeDeck(arcadeTier);
  const { containerRef, isCompact } = useArcadeContainerMetrics();
  const langDir = LANGUAGE_META[language].dir;

  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>(
    isHeartRecovery ? 'playing' : 'ready'
  );
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [catches, setCatches] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [pipX, setPipX] = useState(50);
  const [pipPose, setPipPose] = useState<CharacterPose>('idle');
  const [targetItem, setTargetItem] = useState<ArcadeLanternItem>(() => targetLexicon[0]);
  const [entities, setEntities] = useState<FallingEntity[]>([]);
  const [toast, setToast] = useState<ReactNode | null>(null);
  const [summaryResult, setSummaryResult] = useState<{
    score: number;
    heartsWon: number;
    bonusGems: number;
    xpEarned: number;
    catches: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pipXRef = useRef(50);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const targetRef = useRef<ArcadeLanternItem>(targetLexicon[0]);
  const catchesRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const entitiesRef = useRef<FallingEntity[]>([]);
  const nextUidRef = useRef(1);
  const spawnTimerRef = useRef(0);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const poseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === 'ready' && targetLexicon.length > 0) {
      targetRef.current = targetLexicon[0];
      setTargetItem(targetLexicon[0]);
    }
  }, [phase, targetLexicon]);

  useEffect(() => {
    return () => {
      if (poseTimerRef.current !== null) {
        window.clearTimeout(poseTimerRef.current);
      }
    };
  }, []);

  const schedulePoseReset = useCallback((ms: number) => {
    if (poseTimerRef.current !== null) {
      window.clearTimeout(poseTimerRef.current);
    }
    poseTimerRef.current = window.setTimeout(() => {
      setPipPose('idle');
      poseTimerRef.current = null;
    }, ms);
  }, []);

  const pickNextTarget = useCallback(
    (avoidId?: string): ArcadeLanternItem => {
      const pool = targetLexicon.filter((item) => item.id !== avoidId);
      const list = pool.length > 0 ? pool : targetLexicon;
      const chosen = list[Math.floor(Math.random() * list.length)];
      targetRef.current = chosen;
      setTargetItem(chosen);
      return chosen;
    },
    [targetLexicon]
  );

  const finishRound = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const totalCatches = catchesRef.current;
    const finalScore = scoreRef.current;
    const heartsWon = Math.min(5, Math.max(1, Math.ceil(totalCatches / 2)));
    const baseGems = totalCatches * 3 + (totalCatches >= 6 ? 10 : 0);
    const { bonusGems, xpEarned } = computeScaledArcadeRewards({
      arcadeTier,
      baseGems,
      performanceUnits: totalCatches,
    });
    recordArcadeRunResult({
      gameId: 'sky_catcher',
      score: finalScore,
      heartsWon,
      bonusGems,
      xpEarned,
      preserveXpBooster: Boolean(isHeartRecovery),
    });
    playSfx('unit_fanfare');
    setSummaryResult({ score: finalScore, heartsWon, bonusGems, xpEarned, catches: totalCatches });
    setPhase('summary');
  }, [arcadeTier]);

  const startRound = useCallback(() => {
    playSfx('button_click');
    finishedRef.current = false;
    catchesRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    pipXRef.current = 50;
    spawnTimerRef.current = 0.7;
    elapsedRef.current = 0;
    entitiesRef.current = [];
    setCatches(0);
    setScore(0);
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
        y: 8,
        speed: 22 * paceMultiplier,
        swayOffset: 0,
      },
    ];
    setEntities([...entitiesRef.current]);
    setPhase('playing');
  }, [pickNextTarget, paceMultiplier]);

  useEffect(() => {
    if (isHeartRecovery) {
      startRound();
    }
  }, [isHeartRecovery, startRound]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (e.key === 'ArrowLeft') e.preventDefault();
        keysRef.current.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (e.key === 'ArrowRight') e.preventDefault();
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

      let nextPipX = pipXRef.current;
      const moveSpeed = 68 * Math.max(1, paceMultiplier * 0.95);
      if (keysRef.current.left) nextPipX -= moveSpeed * dt;
      if (keysRef.current.right) nextPipX += moveSpeed * dt;
      nextPipX = Math.max(12, Math.min(88, nextPipX));
      if (nextPipX !== pipXRef.current) {
        pipXRef.current = nextPipX;
        setPipX(nextPipX);
      }

      spawnTimerRef.current += dt;
      if (spawnTimerRef.current >= 1.1 / paceMultiplier && entitiesRef.current.length < 6) {
        spawnTimerRef.current = 0;
        const activeLanternIds = new Set(
          entitiesRef.current
            .filter((ent) => ent.kind === 'lantern' && ent.item)
            .map((ent) => ent.item!.id)
        );
        const hasTargetOnScreen = entitiesRef.current.some(
          (ent) => ent.kind === 'lantern' && ent.item?.id === targetRef.current.id
        );
        const shouldSpawnCloud = hasTargetOnScreen && Math.random() < 0.24;

        if (shouldSpawnCloud) {
          entitiesRef.current.push({
            uid: nextUidRef.current++,
            kind: 'cloud',
            x: 16 + Math.random() * 68,
            y: -8,
            speed: (23 + Math.random() * 9) * paceMultiplier,
            swayOffset: Math.random() * Math.PI * 2,
          });
        } else {
          const distractorChoices = lexicon.filter(
            (i) => i.id !== targetRef.current.id && !activeLanternIds.has(i.id)
          );
          const item = !hasTargetOnScreen
            ? targetRef.current
            : distractorChoices.length > 0
              ? distractorChoices[Math.floor(Math.random() * distractorChoices.length)]
              : null;
          if (item) {
            entitiesRef.current.push({
              uid: nextUidRef.current++,
              kind: 'lantern',
              item,
              x: 22 + Math.random() * 56,
              y: -10,
              speed: (19 + Math.random() * 8) * paceMultiplier,
              swayOffset: Math.random() * Math.PI * 2,
            });
          }
        }
      }

      let survivors: FallingEntity[] = [];
      const clearedItemIds = new Set<string>();
      for (const ent of entitiesRef.current) {
        if (ent.kind === 'lantern' && ent.item && clearedItemIds.has(ent.item.id)) {
          continue;
        }
        const nextY = ent.y + ent.speed * dt;
        const swayX = Math.max(
          21,
          Math.min(79, ent.x + Math.sin(elapsedRef.current * 2 + ent.swayOffset) * 4 * dt)
        );
        const hitPip = nextY >= 72 && nextY <= 92 && Math.abs(swayX - pipXRef.current) <= 14;

        if (hitPip) {
          if (ent.kind === 'lantern' && ent.item?.id === targetRef.current.id) {
            const caughtId = ent.item.id;
            const caughtForeign = ent.item.foreign;
            clearedItemIds.add(caughtId);
            survivors = survivors.filter(
              (s) => !(s.kind === 'lantern' && s.item?.id === caughtId)
            );
            spawnTimerRef.current = 0.85;
            catchesRef.current += 1;
            comboRef.current += 1;
            const gained = 25 + (comboRef.current - 1) * 5;
            scoreRef.current += gained;
            setCatches(catchesRef.current);
            setCombo(comboRef.current);
            setScore(scoreRef.current);
            setPipPose('happy');
            setToast(
              <>
                Caught “<bdi dir={langDir}>{caughtForeign}</bdi>”! +{gained} pts
              </>
            );
            playSfx(comboRef.current >= 3 ? 'combo_3x' : 'heart_win', comboRef.current);
            pickNextTarget(caughtId);
            schedulePoseReset(550);
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
            schedulePoseReset(600);
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
  }, [phase, lexicon, langDir, paceMultiplier, finishRound, pickNextTarget, schedulePoseReset]);

  const movePipToClientX = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(12, Math.min(88, pct));
    pipXRef.current = clamped;
    setPipX(clamped);
  };

  const nudgePip = (delta: number) => {
    const clamped = Math.max(12, Math.min(88, pipXRef.current + delta));
    pipXRef.current = clamped;
    setPipX(clamped);
  };

  const heartsPreview = catches > 0 ? Math.min(5, Math.ceil(catches / 2)) : 1;
  const bestScore = bestScoreFor('sky_catcher');

  return (
    <section
      ref={containerRef}
      aria-label="Sky-Catcher Fiesta Arcade"
      style={ARCADE_SHELL_STYLE}
    >
      <ArcadeHeaderBar
        icon={<Sparkles size={isCompact ? 18 : 20} color="#f59e0b" />}
        title="Sky-Catcher Fiesta"
        subtitle={
          isHeartRecovery
            ? 'Catch word lanterns to recharge Pip’s Hearts!'
            : 'Glide Pip under matching word lanterns & dodge storm clouds!'
        }
        score={score}
        bestScore={bestScore}
        timeLeft={timeLeft}
        combo={combo}
        heartsPreview={heartsPreview}
        arcadeTier={arcadeTier}
        isCompact={isCompact}
        onExit={onExit}
      />

      {phase === 'ready' ? (
        <ArcadeReadyCard
          companionId="pip"
          badgeText="Sky-Catcher Ready!"
          title="Catch Lanterns, Win Hearts & Gems!"
          description="Drag Pip, tap Left/Right buttons, or press Arrow / A-D keys for 45 seconds to catch lanterns matching the target English meaning!"
          startLabel="Start 45s Fiesta!"
          bestScore={bestScore}
          arcadeTier={arcadeTier}
          isCompact={isCompact}
          emblem={<SkyCatcherEmblem size={isCompact ? 54 : 68} />}
          onStart={startRound}
        />
      ) : null}

      {phase === 'playing' ? (
        <>
          <TargetPromptBar
            label="CATCH:"
            targetItem={targetItem}
            language={language}
            isCompact={isCompact}
            hearLabel="Hint"
            borderColor="#f59e0b"
            rightContent={
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: isCompact ? '0.78rem' : '0.86rem',
                  color: 'var(--text-main, #065f46)',
                  whiteSpace: 'nowrap',
                }}
              >
                Catches: {catches}
              </span>
            }
          />

          <div
            ref={canvasRef}
            className="arcade-sky-canvas"
            onPointerDown={(e) => movePipToClientX(e.clientX)}
            onPointerMove={(e) => {
              if (e.buttons > 0 || e.pointerType === 'mouse') {
                movePipToClientX(e.clientX);
              }
            }}
            style={{
              flex: 1,
              minHeight: 0,
              height: 'auto',
              width: '100%',
              position: 'relative',
              borderRadius: 22,
              borderTopWidth: 3,
              borderRightWidth: 3,
              borderLeftWidth: 3,
              borderBottomWidth: 5,
              borderStyle: 'solid',
              borderColor: '#60a5fa',
              background: 'linear-gradient(180deg, #1d4ed8 0%, #38bdf8 52%, #bae6fd 100%)',
              overflow: 'hidden',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 800 180"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0.28,
                pointerEvents: 'none',
              }}
            >
              <ellipse cx="130" cy="48" rx="70" ry="24" fill="#ffffff" />
              <ellipse cx="640" cy="70" rx="85" ry="28" fill="#ffffff" />
              <circle cx="715" cy="45" r="24" fill="#fde047" />
            </svg>

            {entities.map((ent) =>
              ent.kind === 'lantern' && ent.item ? (
                <div
                  key={ent.uid}
                  dir={langDir}
                  style={{
                    position: 'absolute',
                    left: `${ent.x}%`,
                    top: `${ent.y}%`,
                    transform: 'translate(-50%, -50%)',
                    willChange: 'left, top',
                    padding: isCompact ? '4px 8px' : '5px 10px',
                    borderRadius: 14,
                    background: '#ffffff',
                    borderTopWidth: 2,
                    borderRightWidth: 2,
                    borderLeftWidth: 2,
                    borderBottomWidth: 4,
                    borderStyle: 'solid',
                    borderColor: '#f59e0b',
                    boxShadow: '0 8px 18px rgba(30, 27, 75, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    maxWidth: isCompact ? '40%' : '34%',
                    minWidth: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                    <VocabIllustration
                      illustrationKey={ent.item.illustrationKey}
                      language={language}
                      size={isCompact ? 22 : 28}
                    />
                  </span>
                  <span
                    dir={langDir}
                    style={{
                      ...getArcadeForeignTextStyle(language, ent.item.foreign, {
                        isCompact,
                        density: 'normal',
                        color: '#1e1b4b',
                      }),
                      flex: '0 1 auto',
                    }}
                  >
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
                    willChange: 'left, top',
                    pointerEvents: 'none',
                  }}
                >
                  <svg width={isCompact ? 46 : 56} height={isCompact ? 36 : 44} viewBox="0 0 64 50" aria-label="Storm cloud">
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

            <div
              style={{
                position: 'absolute',
                left: `${pipX}%`,
                bottom: 4,
                transform: 'translateX(-50%)',
                willChange: 'left',
                pointerEvents: 'none',
                transition: 'left 40ms linear',
              }}
            >
              <MascotStage
                companionId="pip"
                pose={pipPose}
                equippedCosmetics={activeProfile.equippedCosmetics}
                size={isCompact ? 60 : 74}
              />
            </div>

            {toast ? (
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
                  color: '#ffffff',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  pointerEvents: 'none',
                }}
              >
                {toast}
              </div>
            ) : null}
          </div>

          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="tactile-btn"
                aria-label="Move Pip left"
                style={{
                  ...SOFT_BTN_STYLE,
                  padding: isCompact ? '7px 12px' : '9px 16px',
                  fontSize: isCompact ? '0.84rem' : '0.92rem',
                }}
                onClick={() => nudgePip(-14)}
              >
                <ArrowLeft size={16} />
                <span>Left</span>
              </button>
              <button
                type="button"
                className="tactile-btn"
                aria-label="Move Pip right"
                style={{
                  ...SOFT_BTN_STYLE,
                  padding: isCompact ? '7px 12px' : '9px 16px',
                  fontSize: isCompact ? '0.84rem' : '0.92rem',
                }}
                onClick={() => nudgePip(14)}
              >
                <span>Right</span>
                <ArrowRight size={16} />
              </button>
            </div>

            <button
              type="button"
              className="tactile-btn tactile-btn-success"
              style={{
                padding: isCompact ? '7px 12px' : '9px 16px',
                fontSize: isCompact ? '0.84rem' : '0.92rem',
              }}
              onClick={finishRound}
            >
              Claim +{heartsPreview} Hearts
            </button>
          </div>
        </>
      ) : null}

      {phase === 'summary' && summaryResult ? (
        <ArcadeSummaryCard
          companionId="pip"
          badgeText="Hearts Recharged!"
          title="Sky-Catcher Complete!"
          score={summaryResult.score}
          bestScore={bestScore}
          heartsWon={summaryResult.heartsWon}
          bonusGems={summaryResult.bonusGems}
          xpEarned={summaryResult.xpEarned}
          arcadeTier={arcadeTier}
          statLine={`Lanterns caught: ${summaryResult.catches}`}
          isCompact={isCompact}
          isHeartRecovery={isHeartRecovery}
          onResumeLesson={onResumeLesson}
          onPlayAgain={startRound}
          onExit={onExit}
          exitLabel="Back to Atlas Map"
        />
      ) : null}
    </section>
  );
}
