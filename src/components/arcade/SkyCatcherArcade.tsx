import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Volume2 } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { playSfx, speakPhrase, stopSpeech } from '../../audio';
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
  ArcadeStageDressing,
  ArcadeSummaryCard,
  SOFT_BTN_STYLE,
  TargetPromptBar,
  computeScaledArcadeRewards,
  getArcadeForeignTextStyle,
  useArcadeContainerMetrics,
  useArcadeCoopReport,
  useArcadeDeck,
  useArcadeEffectiveProfile,
} from './arcadeShared';

export const SKY_CATCHER_TUNING = {
  roundDurationSeconds: 45,
  baseSpawnIntervalSec: 1.35,
  initialLanternSpeed: 15.5,
  lanternMinSpeed: 14,
  lanternSpeedRange: 4.5,
  cloudMinSpeed: 16.5,
  cloudSpeedRange: 4.5,
  swayFrequency: 1.65,
  swayAmplitude: 3.2,
  bumpGraceSeconds: 0.42,
  burstLifetimeSeconds: 0.72,
} as const;

const ROUND_DURATION_SECONDS = SKY_CATCHER_TUNING.roundDurationSeconds;
const SPAWN_CANDIDATE_LANES = [22, 36, 50, 64, 78] as const;

interface FallingEntity {
  uid: number;
  kind: 'lantern' | 'cloud';
  item?: ArcadeLanternItem;
  x: number;
  y: number;
  speed: number;
  swayOffset: number;
}

interface SkyBurst {
  uid: number;
  x: number;
  y: number;
  text: string;
  tone: 'catch' | 'combo' | 'bump';
  bornAt: number;
}

function pickWellSpacedX(
  existing: readonly FallingEntity[],
  kind: 'lantern' | 'cloud',
  protectedTargetX?: number
): number {
  const minBound = kind === 'lantern' ? 21 : 18;
  const maxBound = kind === 'lantern' ? 79 : 82;
  const upperEntities = existing.filter((ent) => ent.y < 44);

  const scored = SPAWN_CANDIDATE_LANES.map((lane) => {
    const jitter = (Math.random() - 0.5) * 6;
    const x = Math.max(minBound, Math.min(maxBound, lane + jitter));
    let minDist = 100;
    for (const ent of upperEntities) {
      minDist = Math.min(minDist, Math.abs(x - ent.x));
    }
    if (kind === 'cloud' && protectedTargetX !== undefined) {
      minDist = Math.min(minDist, Math.abs(x - protectedTargetX) * 0.9);
    }
    return { x, minDist };
  });

  const spacious = scored.filter((c) => c.minDist >= 16);
  if (spacious.length > 0) {
    return spacious[Math.floor(Math.random() * spacious.length)].x;
  }

  let best = scored[0];
  for (const candidate of scored) {
    if (candidate.minDist > best.minDist) {
      best = candidate;
    }
  }
  return best.x;
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
  const activeProfile = useArcadeEffectiveProfile();
  const settleArcadeRun = useArcadeCoopReport();
  const { language, lexicon, targetLexicon, bestScoreFor, paceMultiplier } =
    useArcadeDeck(arcadeTier);
  const { containerRef, isCompact } = useArcadeContainerMetrics();
  const langDir = LANGUAGE_META[language].dir;

  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>(
    isHeartRecovery ? 'playing' : 'ready'
  );
  const [timeLeft, setTimeLeft] = useState<number>(ROUND_DURATION_SECONDS);
  const [catches, setCatches] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [pipX, setPipX] = useState(50);
  const [pipTilt, setPipTilt] = useState<-1 | 0 | 1>(0);
  const [pipPose, setPipPose] = useState<CharacterPose>('idle');
  const [targetItem, setTargetItem] = useState<ArcadeLanternItem>(() => targetLexicon[0]);
  const [entities, setEntities] = useState<FallingEntity[]>([]);
  const [bursts, setBursts] = useState<SkyBurst[]>([]);
  const [voiceCueNonce, setVoiceCueNonce] = useState(0);
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
  const pipTiltRef = useRef<-1 | 0 | 1>(0);
  const lastPointerMoveAtRef = useRef(-10);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const buttonHoldRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const holdMovedRef = useRef(false);
  const isCompactRef = useRef(isCompact);
  isCompactRef.current = isCompact;

  const targetRef = useRef<ArcadeLanternItem>(targetLexicon[0]);
  const catchesRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const entitiesRef = useRef<FallingEntity[]>([]);
  const burstsRef = useRef<SkyBurst[]>([]);
  const nextUidRef = useRef(1);
  const spawnTimerRef = useRef(0);
  const elapsedRef = useRef(0);
  const bumpGraceUntilRef = useRef(-1);
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
      stopSpeech();
    };
  }, []);

  const updateTilt = useCallback((nextTilt: -1 | 0 | 1) => {
    if (pipTiltRef.current !== nextTilt) {
      pipTiltRef.current = nextTilt;
      setPipTilt(nextTilt);
    }
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

  const speakSpawnedTarget = useCallback(
    (item: ArcadeLanternItem) => {
      setVoiceCueNonce((n) => n + 1);
      void speakPhrase({
        text: item.foreign,
        language,
        phonetic: item.phonetic,
        speed: 'normal',
      });
    },
    [language]
  );

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
    stopSpeech();
    buttonHoldRef.current = { left: false, right: false };
    keysRef.current = { left: false, right: false };
    holdMovedRef.current = false;
    burstsRef.current = [];
    setBursts([]);
    updateTilt(0);

    const totalCatches = catchesRef.current;
    const finalScore = scoreRef.current;
    const heartsWon = Math.min(5, Math.max(1, Math.ceil(totalCatches / 2)));
    const baseGems = totalCatches * 3 + (totalCatches >= 6 ? 10 : 0);
    const { bonusGems, xpEarned } = computeScaledArcadeRewards({
      arcadeTier,
      baseGems,
      performanceUnits: totalCatches,
    });
    settleArcadeRun({
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
  }, [arcadeTier, isHeartRecovery, settleArcadeRun, updateTilt]);

  const startRound = useCallback(() => {
    playSfx('button_click');
    finishedRef.current = false;
    catchesRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    pipXRef.current = 50;
    pipTiltRef.current = 0;
    lastPointerMoveAtRef.current = -10;
    buttonHoldRef.current = { left: false, right: false };
    keysRef.current = { left: false, right: false };
    holdMovedRef.current = false;
    bumpGraceUntilRef.current = -1;
    elapsedRef.current = 0;
    entitiesRef.current = [];
    burstsRef.current = [];

    const spawnInterval = SKY_CATCHER_TUNING.baseSpawnIntervalSec / paceMultiplier;
    spawnTimerRef.current = spawnInterval * 0.55;

    setCatches(0);
    setScore(0);
    setCombo(0);
    setPipX(50);
    setPipTilt(0);
    setPipPose('idle');
    setBursts([]);
    setTimeLeft(ROUND_DURATION_SECONDS);
    setToast('Listen & catch the matching word lantern!');
    setSummaryResult(null);

    const first = pickNextTarget();
    entitiesRef.current = [
      {
        uid: nextUidRef.current++,
        kind: 'lantern',
        item: first,
        x: 50,
        y: 7,
        speed: SKY_CATCHER_TUNING.initialLanternSpeed * paceMultiplier,
        swayOffset: 0,
      },
    ];
    setEntities([...entitiesRef.current]);
    speakSpawnedTarget(first);
    setPhase('playing');
  }, [pickNextTarget, paceMultiplier, speakSpawnedTarget]);

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
      buttonHoldRef.current = { left: false, right: false };
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

      const goLeft = keysRef.current.left || buttonHoldRef.current.left;
      const goRight = keysRef.current.right || buttonHoldRef.current.right;
      let nextPipX = pipXRef.current;
      const moveSpeed = 68 * Math.max(1, paceMultiplier * 0.95);
      if (goLeft) nextPipX -= moveSpeed * dt;
      if (goRight) nextPipX += moveSpeed * dt;
      nextPipX = Math.max(12, Math.min(88, nextPipX));
      if (nextPipX !== pipXRef.current) {
        if (buttonHoldRef.current.left || buttonHoldRef.current.right) {
          holdMovedRef.current = true;
        }
        pipXRef.current = nextPipX;
        setPipX(nextPipX);
      }

      if (goLeft && !goRight) {
        updateTilt(-1);
      } else if (goRight && !goLeft) {
        updateTilt(1);
      } else if (elapsedRef.current - lastPointerMoveAtRef.current > 0.14) {
        updateTilt(0);
      }

      const spawnInterval = SKY_CATCHER_TUNING.baseSpawnIntervalSec / paceMultiplier;
      const maxEntities = isCompactRef.current ? 4 : 5;
      spawnTimerRef.current += dt;
      if (spawnTimerRef.current >= spawnInterval && entitiesRef.current.length < maxEntities) {
        spawnTimerRef.current = 0;
        const activeLanternIds = new Set(
          entitiesRef.current
            .filter((ent) => ent.kind === 'lantern' && ent.item)
            .map((ent) => ent.item!.id)
        );
        const targetEntity = entitiesRef.current.find(
          (ent) => ent.kind === 'lantern' && ent.item?.id === targetRef.current.id
        );
        const hasTargetOnScreen = Boolean(targetEntity);
        const activeCloudCount = entitiesRef.current.filter((ent) => ent.kind === 'cloud').length;
        const shouldSpawnCloud = hasTargetOnScreen && activeCloudCount < 1 && Math.random() < 0.2;

        if (shouldSpawnCloud) {
          const protectedX = targetEntity && targetEntity.y < 40 ? targetEntity.x : undefined;
          entitiesRef.current.push({
            uid: nextUidRef.current++,
            kind: 'cloud',
            x: pickWellSpacedX(entitiesRef.current, 'cloud', protectedX),
            y: -8,
            speed:
              (SKY_CATCHER_TUNING.cloudMinSpeed +
                Math.random() * SKY_CATCHER_TUNING.cloudSpeedRange) *
              paceMultiplier,
            swayOffset: Math.random() * Math.PI * 2,
          });
        } else if (!hasTargetOnScreen) {
          const spawnedTarget = targetRef.current;
          entitiesRef.current.push({
            uid: nextUidRef.current++,
            kind: 'lantern',
            item: spawnedTarget,
            x: pickWellSpacedX(entitiesRef.current, 'lantern'),
            y: -10,
            speed:
              (SKY_CATCHER_TUNING.lanternMinSpeed +
                Math.random() * SKY_CATCHER_TUNING.lanternSpeedRange) *
              paceMultiplier,
            swayOffset: Math.random() * Math.PI * 2,
          });
          speakSpawnedTarget(spawnedTarget);
        } else {
          const distractorChoices = lexicon.filter(
            (i) => i.id !== targetRef.current.id && !activeLanternIds.has(i.id)
          );
          const distractor =
            distractorChoices.length > 0
              ? distractorChoices[Math.floor(Math.random() * distractorChoices.length)]
              : null;
          if (distractor) {
            entitiesRef.current.push({
              uid: nextUidRef.current++,
              kind: 'lantern',
              item: distractor,
              x: pickWellSpacedX(entitiesRef.current, 'lantern'),
              y: -10,
              speed:
                (SKY_CATCHER_TUNING.lanternMinSpeed +
                  Math.random() * SKY_CATCHER_TUNING.lanternSpeedRange) *
                paceMultiplier,
              swayOffset: Math.random() * Math.PI * 2,
            });
          }
        }
      }

      let survivors: FallingEntity[] = [];
      const clearedItemIds = new Set<string>();
      let burstsChanged = false;

      for (const ent of entitiesRef.current) {
        if (ent.kind === 'lantern' && ent.item && clearedItemIds.has(ent.item.id)) {
          continue;
        }
        const nextY = ent.y + ent.speed * dt;
        const swayX = Math.max(
          21,
          Math.min(
            79,
            ent.x +
              Math.sin(elapsedRef.current * SKY_CATCHER_TUNING.swayFrequency + ent.swayOffset) *
                SKY_CATCHER_TUNING.swayAmplitude *
                dt
          )
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
            spawnTimerRef.current = spawnInterval * 0.74;
            catchesRef.current += 1;
            comboRef.current += 1;
            const gained = 25 + (comboRef.current - 1) * 5;
            scoreRef.current += gained;
            setCatches(catchesRef.current);
            setCombo(comboRef.current);
            setScore(scoreRef.current);
            setPipPose(comboRef.current >= 3 ? 'victory_dance' : 'happy');
            setToast(
              <>
                Caught “<bdi dir={langDir}>{caughtForeign}</bdi>”! +{gained} pts
              </>
            );
            burstsRef.current.push({
              uid: nextUidRef.current++,
              x: swayX,
              y: Math.min(82, nextY),
              text: comboRef.current >= 2 ? `+${gained} · ${comboRef.current}x!` : `+${gained}`,
              tone: comboRef.current >= 3 ? 'combo' : 'catch',
              bornAt: elapsedRef.current,
            });
            burstsChanged = true;
            playSfx(comboRef.current >= 3 ? 'combo_3x' : 'heart_win', comboRef.current);
            pickNextTarget(caughtId);
            schedulePoseReset(comboRef.current >= 3 ? 700 : 550);
          } else if (elapsedRef.current >= bumpGraceUntilRef.current) {
            bumpGraceUntilRef.current = elapsedRef.current + SKY_CATCHER_TUNING.bumpGraceSeconds;
            comboRef.current = 0;
            setCombo(0);
            setPipPose('sympathetic');
            setToast(
              ent.kind === 'cloud'
                ? 'Whoops — watch out for storm clouds!'
                : `Oops! Look for "${targetRef.current.english}"!`
            );
            burstsRef.current.push({
              uid: nextUidRef.current++,
              x: swayX,
              y: Math.min(82, nextY),
              text: ent.kind === 'cloud' ? 'Zap!' : 'Oops!',
              tone: 'bump',
              bornAt: elapsedRef.current,
            });
            burstsChanged = true;
            playSfx('gentle_nudge');
            schedulePoseReset(600);
          }
          continue;
        }

        if (nextY < 105) {
          survivors.push({ ...ent, x: swayX, y: nextY });
        } else if (ent.kind === 'lantern' && ent.item?.id === targetRef.current.id) {
          setToast(`Listening again — catch "${targetRef.current.english}"!`);
          spawnTimerRef.current = Math.max(spawnTimerRef.current, spawnInterval * 0.78);
        }
      }

      const prevBurstCount = burstsRef.current.length;
      if (prevBurstCount > 0) {
        burstsRef.current = burstsRef.current.filter(
          (b) => elapsedRef.current - b.bornAt < SKY_CATCHER_TUNING.burstLifetimeSeconds
        );
        if (burstsRef.current.length !== prevBurstCount) {
          burstsChanged = true;
        }
      }
      if (burstsChanged) {
        setBursts([...burstsRef.current]);
      }

      entitiesRef.current = survivors;
      setEntities(survivors);
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [
    phase,
    lexicon,
    langDir,
    paceMultiplier,
    finishRound,
    pickNextTarget,
    schedulePoseReset,
    speakSpawnedTarget,
    updateTilt,
  ]);

  const movePipToClientX = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(12, Math.min(88, pct));
    const delta = clamped - pipXRef.current;
    if (Math.abs(delta) > 0.6) {
      updateTilt(delta < 0 ? -1 : 1);
      lastPointerMoveAtRef.current = elapsedRef.current;
    }
    pipXRef.current = clamped;
    setPipX(clamped);
  };

  const nudgePip = (delta: number) => {
    const clamped = Math.max(12, Math.min(88, pipXRef.current + delta));
    updateTilt(delta < 0 ? -1 : 1);
    lastPointerMoveAtRef.current = elapsedRef.current;
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
            ? 'Listen & catch word lanterns to recharge Pip’s Hearts!'
            : 'Hear each word as it enters the sky, catch its lantern & dodge storm clouds!'
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
          title="Listen, Catch Lanterns, Win Hearts & Gems!"
          description="Each target word is spoken aloud as its lantern floats in! Glide Pip by dragging, holding Left/Right, or using Arrow / A-D keys for 45 seconds."
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
            hearLabel="Hear"
            borderColor="#f59e0b"
            rightContent={
              <>
                {!isCompact ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'var(--tint-amber-bg, #fffbeb)',
                      border: '1px solid var(--tint-amber-border, #f59e0b)',
                      color: 'var(--tint-amber-ink, #92400e)',
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Volume2 size={12} aria-hidden="true" />
                    Spoken on spawn
                  </span>
                ) : null}
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
              </>
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
              borderColor: '#5c7fa6',
              background:
                'radial-gradient(65% 50% at 15% 12%, rgba(254, 240, 178, 0.48), transparent 58%), linear-gradient(180deg, #3c78b8 0%, #7cc4e8 54%, #f4e6c6 100%)',
              overflow: 'hidden',
              touchAction: 'none',
              userSelect: 'none',
              boxShadow: 'inset 0 2px 14px rgba(74, 52, 38, 0.16)',
            }}
          >
            <ArcadeStageDressing glowKey={score} combo={combo} tone="daylight" />
            <svg
              aria-hidden="true"
              viewBox="0 0 800 220"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {/* Warm sunlit gouache clouds & paper-cut distant meadow */}
              <circle cx="115" cy="46" r="28" fill="#fef3a7" opacity="0.62" />
              <ellipse cx="185" cy="58" rx="76" ry="22" fill="#fffdf6" opacity="0.55" />
              <ellipse cx="625" cy="64" rx="92" ry="24" fill="#fffdf6" opacity="0.5" />
              <path
                d="M0 184 Q 180 144 390 174 T 800 164 L 800 220 L 0 220 Z"
                fill="#82b889"
                opacity="0.45"
              />
              <path
                d="M0 198 Q 240 168 510 192 T 800 184 L 800 220 L 0 220 Z"
                fill="#5b9367"
                opacity="0.5"
              />
            </svg>

            {/* Storybook fiesta pennant bunting along upper canopy */}
            <svg
              aria-hidden="true"
              viewBox="0 0 800 32"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: isCompact ? 18 : 24,
                pointerEvents: 'none',
                zIndex: 2,
                opacity: 0.88,
              }}
            >
              <path
                d="M0 4 Q 200 18 400 7 Q 600 18 800 4"
                fill="none"
                stroke="#4a3426"
                strokeWidth="2"
                strokeOpacity="0.55"
              />
              <polygon points="36,7 64,10 49,25" fill="#f59e0b" stroke="#4a3426" strokeWidth="1.2" />
              <polygon points="96,11 124,13 109,28" fill="#f43f5e" stroke="#4a3426" strokeWidth="1.2" />
              <polygon points="158,13 186,14 172,29" fill="#10b981" stroke="#4a3426" strokeWidth="1.2" />
              <polygon points="220,13 248,12 234,27" fill="#8b5cf6" stroke="#4a3426" strokeWidth="1.2" />
              <polygon points="282,11 310,9 296,24" fill="#fbbf24" stroke="#4a3426" strokeWidth="1.2" />
              <polygon points="490,9 518,11 504,24" fill="#0ea5e9" stroke="#4a3426" strokeWidth="1.2" />
              <polygon points="552,12 580,13 566,27" fill="#f43f5e" stroke="#4a3426" strokeWidth="1.2" />
              <polygon points="614,14 642,13 628,29" fill="#f59e0b" stroke="#4a3426" strokeWidth="1.2" />
              <polygon points="676,13 704,11 690,28" fill="#10b981" stroke="#4a3426" strokeWidth="1.2" />
              <polygon points="736,10 764,7 751,25" fill="#8b5cf6" stroke="#4a3426" strokeWidth="1.2" />
            </svg>

            {voiceCueNonce > 0 ? (
              <div
                key={voiceCueNonce}
                data-testid="sky-catcher-voice-cue"
                aria-hidden="true"
                className="arcade-sky-audio-wave"
              >
                <span className="arcade-sky-audio-wave-ring" />
                <Volume2 size={13} />
                <span>Word in the sky!</span>
              </div>
            ) : null}

            {entities.map((ent) =>
              ent.kind === 'lantern' && ent.item ? (
                <div
                  key={ent.uid}
                  dir={langDir}
                  className="arcade-sky-lantern"
                  style={{
                    left: `${ent.x}%`,
                    top: `${ent.y}%`,
                    transform: 'translate(-50%, -50%)',
                    willChange: 'left, top',
                    padding: isCompact ? '4px 7px' : '5px 10px',
                    borderRadius: 15,
                    background:
                      'radial-gradient(80% 70% at 30% 18%, rgba(255, 255, 255, 0.85), transparent 60%), linear-gradient(155deg, #fffdf4 0%, #fef3c7 100%)',
                    borderTopWidth: 2,
                    borderRightWidth: 2,
                    borderLeftWidth: 2,
                    borderBottomWidth: 4,
                    borderStyle: 'solid',
                    borderColor: '#b45309',
                    boxShadow:
                      '2px 4px 0 rgba(74, 52, 38, 0.2), 0 0 14px rgba(251, 191, 36, 0.44)',
                    maxWidth: isCompact ? '42%' : '36%',
                    minWidth: 0,
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection:
                        isCompact && ent.item.foreign.length > 16 ? 'column' : 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isCompact && ent.item.foreign.length > 16 ? 2 : 5,
                      width: '100%',
                      minWidth: 0,
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                      <VocabIllustration
                        illustrationKey={ent.item.illustrationKey}
                        language={language}
                        size={isCompact ? (ent.item.foreign.length > 16 ? 18 : 22) : 28}
                      />
                    </span>
                    <span
                      dir={langDir}
                      style={{
                        ...getArcadeForeignTextStyle(language, ent.item.foreign, {
                          isCompact,
                          density:
                            (isCompact && ent.item.foreign.length > 16) ||
                            ent.item.foreign.length > 26
                              ? 'tight'
                              : 'normal',
                          color: '#1e1b4b',
                        }),
                        flex: '0 1 auto',
                        width: isCompact && ent.item.foreign.length > 16 ? '100%' : undefined,
                      }}
                    >
                      {ent.item.foreign}
                    </span>
                  </div>
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
                  <svg
                    width={isCompact ? 48 : 58}
                    height={isCompact ? 38 : 46}
                    viewBox="0 0 64 50"
                    aria-label="Storm cloud"
                  >
                    <path
                      d="M16 36h34a10 10 0 0 0 2-20 14 14 0 0 0-27-3 11 11 0 0 0-9 23z"
                      fill="#6d6884"
                      stroke="#4a3426"
                      strokeWidth="2.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 20a9 9 0 0 1 16-4"
                      fill="none"
                      stroke="#a7a0be"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity="0.7"
                    />
                    <path
                      d="M22 21l6 3M42 21l-6 3"
                      stroke="#fff8ea"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M31 36l-4 8h5l-3 6"
                      stroke="#fde047"
                      strokeWidth="2.6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )
            )}

            {bursts.map((burst) => (
              <div
                key={burst.uid}
                aria-hidden="true"
                className={`arcade-sky-burst arcade-sky-burst--${burst.tone}`}
                style={{
                  left: `${burst.x}%`,
                  top: `${burst.y}%`,
                }}
              >
                {burst.text}
              </div>
            ))}

            <div
              style={{
                position: 'absolute',
                left: `${pipX}%`,
                bottom: 4,
                transform: 'translateX(-50%)',
                willChange: 'left',
                pointerEvents: 'none',
              }}
            >
              <span
                aria-hidden="true"
                className="arcade-sky-catch-halo"
                style={{
                  width: isCompact ? 76 : 96,
                  height: isCompact ? 12 : 15,
                }}
              />
              <div
                style={{
                  transform: `rotate(${pipTilt * 6}deg)`,
                  transition: 'transform 140ms ease-out',
                  transformOrigin: '50% 85%',
                }}
              >
                <MascotStage
                  companionId="pip"
                  pose={pipPose}
                  equippedCosmetics={activeProfile.equippedCosmetics}
                  size={isCompact ? 60 : 74}
                />
              </div>
            </div>

            {toast ? (
              <div
                className="arcade-toast-ribbon"
                style={{
                  position: 'absolute',
                  top: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  maxWidth: 'calc(100% - 16px)',
                  padding: '3px 12px',
                  borderRadius: 999,
                  background: 'rgba(74, 52, 38, 0.88)',
                  color: '#fff8ea',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  pointerEvents: 'none',
                  zIndex: 6,
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
                  touchAction: 'none',
                }}
                onPointerDown={() => {
                  holdMovedRef.current = false;
                  buttonHoldRef.current.left = true;
                }}
                onPointerUp={() => {
                  buttonHoldRef.current.left = false;
                }}
                onPointerLeave={() => {
                  buttonHoldRef.current.left = false;
                }}
                onPointerCancel={() => {
                  buttonHoldRef.current.left = false;
                }}
                onClick={() => {
                  if (!holdMovedRef.current) {
                    nudgePip(-14);
                  }
                  holdMovedRef.current = false;
                }}
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
                  touchAction: 'none',
                }}
                onPointerDown={() => {
                  holdMovedRef.current = false;
                  buttonHoldRef.current.right = true;
                }}
                onPointerUp={() => {
                  buttonHoldRef.current.right = false;
                }}
                onPointerLeave={() => {
                  buttonHoldRef.current.right = false;
                }}
                onPointerCancel={() => {
                  buttonHoldRef.current.right = false;
                }}
                onClick={() => {
                  if (!holdMovedRef.current) {
                    nudgePip(14);
                  }
                  holdMovedRef.current = false;
                }}
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
