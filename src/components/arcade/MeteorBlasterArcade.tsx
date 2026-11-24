import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Crosshair, Rocket, Sparkles, Zap } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { playSfx, speakPhrase } from '../../audio';
import {
  LANGUAGE_META,
  type ArcadeLanternItem,
  type ArcadeProficiencyTier,
  type CharacterPose,
} from '../../types/contracts';
import { MascotStage } from '../characters/MascotStage';
import { MeteorBlasterEmblem } from './ArcadeEmblems';
import {
  ARCADE_SHELL_STYLE,
  ArcadeHeaderBar,
  ArcadeReadyCard,
  ArcadeSummaryCard,
  TargetPromptBar,
  computeScaledArcadeRewards,
  getArcadeForeignTextStyle,
  pickDistinctItems,
  useArcadeContainerMetrics,
  useArcadeCoopReport,
  useArcadeDeck,
  useArcadeEffectiveProfile,
  ArcadeStageDressing,
} from './arcadeShared';

const ROUND_DURATION_SECONDS = 45;
const LANE_X = [19, 50, 81] as const;

interface AsteroidEntity {
  uid: number;
  kind: 'word' | 'comet';
  lane: 0 | 1 | 2;
  item?: ArcadeLanternItem;
  x: number;
  y: number;
  speed: number;
}

interface LaserEffect {
  uid: number;
  fromX: number;
  toX: number;
  toY: number;
  color: string;
}

interface BurstEffect {
  uid: number;
  x: number;
  y: number;
  label: string;
  color: string;
}

export interface MeteorBlasterArcadeProps {
  arcadeTier?: ArcadeProficiencyTier;
  onExit: () => void;
}

export function MeteorBlasterArcade({
  arcadeTier = 'sprout',
  onExit,
}: MeteorBlasterArcadeProps) {
  const activeProfile = useArcadeEffectiveProfile();
  const settleArcadeRun = useArcadeCoopReport();
  const { language, lexicon, targetLexicon, bestScoreFor, paceMultiplier } =
    useArcadeDeck(arcadeTier);
  const { containerRef, isCompact } = useArcadeContainerMetrics();
  const rocketUid = useId().replace(/:/g, '-');
  const langDir = LANGUAGE_META[language].dir;

  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>('ready');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [wave, setWave] = useState(1);
  const [shipX, setShipX] = useState(50);
  const [pipPose, setPipPose] = useState<CharacterPose>('idle');
  const [targetItem, setTargetItem] = useState<ArcadeLanternItem>(() => targetLexicon[0]);
  const [asteroids, setAsteroids] = useState<AsteroidEntity[]>([]);
  const [lasers, setLasers] = useState<LaserEffect[]>([]);
  const [bursts, setBursts] = useState<BurstEffect[]>([]);
  const [toast, setToast] = useState<ReactNode>('Tap matching asteroids or press 1, 2, 3!');
  const [summary, setSummary] = useState<{
    score: number;
    heartsWon: number;
    bonusGems: number;
    xpEarned: number;
    hits: number;
    maxWave: number;
  } | null>(null);

  const asteroidsRef = useRef<AsteroidEntity[]>([]);
  const targetRef = useRef<ArcadeLanternItem>(targetLexicon[0]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const hitsRef = useRef(0);
  const waveRef = useRef(1);
  const cometGemsRef = useRef(0);
  const elapsedRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const cometTimerRef = useRef(7);
  const nextUidRef = useRef(1);
  const finishedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (phase === 'ready' && targetLexicon.length > 0) {
      targetRef.current = targetLexicon[0];
      setTargetItem(targetLexicon[0]);
    }
  }, [phase, targetLexicon]);

  useEffect(() => {
    return () => {
      for (const id of timersRef.current) window.clearTimeout(id);
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
    (avoidId?: string): ArcadeLanternItem => {
      const pool = targetLexicon.filter((i) => i.id !== avoidId);
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
    const totalHits = hitsRef.current;
    const finalScore = scoreRef.current;
    const heartsWon = Math.min(5, Math.max(1, Math.ceil(totalHits / 3)));
    const baseGems = Math.floor(finalScore / 35) + cometGemsRef.current + (totalHits >= 5 ? 4 : 0);
    const { bonusGems, xpEarned } = computeScaledArcadeRewards({
      arcadeTier,
      baseGems,
      performanceUnits: totalHits,
    });
    settleArcadeRun({
      gameId: 'meteor_blaster',
      score: finalScore,
      heartsWon,
      bonusGems,
      xpEarned,
    });
    playSfx('unit_fanfare');
    setSummary({
      score: finalScore,
      heartsWon,
      bonusGems,
      xpEarned,
      hits: totalHits,
      maxWave: waveRef.current,
    });
    setPhase('summary');
  }, [arcadeTier, settleArcadeRun]);

  const startRound = useCallback(() => {
    playSfx('whoosh_transition');
    finishedRef.current = false;
    scoreRef.current = 0;
    comboRef.current = 0;
    hitsRef.current = 0;
    waveRef.current = 1;
    cometGemsRef.current = 0;
    elapsedRef.current = 0;
    spawnTimerRef.current = 0.6;
    cometTimerRef.current = 7;

    setScore(0);
    setCombo(0);
    setHits(0);
    setWave(1);
    setShipX(50);
    setPipPose('happy');
    setLasers([]);
    setBursts([]);
    setTimeLeft(ROUND_DURATION_SECONDS);
    setToast('Blast the glowing asteroid matching the target!');
    setSummary(null);

    const first = pickNextTarget();
    const distractors = pickDistinctItems(lexicon, 2, new Set([first.id]));
    const lanes: (0 | 1 | 2)[] = [0, 1, 2];
    const targetLane = lanes[Math.floor(Math.random() * lanes.length)];
    const otherLanes = lanes.filter((l) => l !== targetLane);

    const initial: AsteroidEntity[] = [
      {
        uid: nextUidRef.current++,
        kind: 'word',
        lane: targetLane,
        item: first,
        x: LANE_X[targetLane],
        y: 16,
        speed: 14 * paceMultiplier,
      },
      ...distractors.map((d, idx) => ({
        uid: nextUidRef.current++,
        kind: 'word' as const,
        lane: otherLanes[idx],
        item: d,
        x: LANE_X[otherLanes[idx]],
        y: 8 + idx * 9,
        speed: (13 + idx) * paceMultiplier,
      })),
    ];
    asteroidsRef.current = initial;
    setAsteroids(initial);
    setPhase('playing');
  }, [lexicon, pickNextTarget, paceMultiplier]);

  const fireAtAsteroid = useCallback(
    (targetAst: AsteroidEntity) => {
      if (phase !== 'playing') return;

      const fromX = LANE_X[targetAst.lane];
      setShipX(fromX);
      const laserUid = nextUidRef.current++;
      const laserColor = targetAst.kind === 'comet' ? '#fde047' : '#38bdf8';
      setLasers((prev) => [
        ...prev,
        { uid: laserUid, fromX, toX: targetAst.x, toY: targetAst.y, color: laserColor },
      ]);
      scheduleTimeout(() => {
        setLasers((prev) => prev.filter((l) => l.uid !== laserUid));
      }, 210);

      if (targetAst.kind === 'comet') {
        asteroidsRef.current = asteroidsRef.current.filter((a) => a.uid !== targetAst.uid);
        setAsteroids([...asteroidsRef.current]);
        cometGemsRef.current += 3;
        const pts = 50;
        scoreRef.current += pts;
        setScore(scoreRef.current);
        playSfx('star_pop', Math.min(3, comboRef.current));
        setToast('Golden Comet Core! +50 pts & +3 Gems!');
        const burstUid = nextUidRef.current++;
        setBursts((prev) => [
          ...prev,
          { uid: burstUid, x: targetAst.x, y: targetAst.y, label: '+50 ★', color: '#fde047' },
        ]);
        scheduleTimeout(() => setBursts((prev) => prev.filter((b) => b.uid !== burstUid)), 520);
        return;
      }

      if (targetAst.item && targetAst.item.id === targetRef.current.id) {
        const hitId = targetAst.item.id;
        asteroidsRef.current = asteroidsRef.current.filter(
          (a) => !(a.kind === 'word' && a.item?.id === hitId)
        );
        setAsteroids([...asteroidsRef.current]);

        hitsRef.current += 1;
        comboRef.current += 1;
        const nextWave = Math.min(4, 1 + Math.floor(hitsRef.current / 4));
        waveRef.current = nextWave;
        const pts = 20 * nextWave + Math.min(25, (comboRef.current - 1) * 5);
        scoreRef.current += pts;

        setHits(hitsRef.current);
        setCombo(comboRef.current);
        setWave(nextWave);
        setScore(scoreRef.current);
        setPipPose(comboRef.current >= 3 ? 'streak_fire' : 'happy');
        const hitForeign = targetAst.item.foreign;
        setToast(
          <>
            Direct hit “<bdi dir={langDir}>{hitForeign}</bdi>”! +{pts} pts
          </>
        );

        playSfx('boss_hit');
        playSfx('star_pop', Math.min(3, comboRef.current - 1));
        void speakPhrase({
          text: targetAst.item.foreign,
          language,
          phonetic: targetAst.item.phonetic,
        });

        const burstUid = nextUidRef.current++;
        setBursts((prev) => [
          ...prev,
          {
            uid: burstUid,
            x: targetAst.x,
            y: targetAst.y,
            label: `+${pts}`,
            color: '#4ade80',
          },
        ]);
        scheduleTimeout(() => {
          setBursts((prev) => prev.filter((b) => b.uid !== burstUid));
          setPipPose('idle');
        }, 540);

        spawnTimerRef.current = 0.85;
        pickNextTarget(hitId);
      } else {
        comboRef.current = 0;
        setCombo(0);
        setPipPose('sympathetic');
        setToast(`Shield graze! Find "${targetRef.current.english}"!`);
        playSfx('gentle_nudge');
        const burstUid = nextUidRef.current++;
        setBursts((prev) => [
          ...prev,
          { uid: burstUid, x: targetAst.x, y: targetAst.y, label: 'Miss!', color: '#fb7185' },
        ]);
        scheduleTimeout(() => {
          setBursts((prev) => prev.filter((b) => b.uid !== burstUid));
          setPipPose('idle');
        }, 480);
      }
    },
    [phase, language, langDir, pickNextTarget, scheduleTimeout]
  );

  const fireLaneBlaster = useCallback(
    (lane: 0 | 1 | 2) => {
      if (phase !== 'playing') return;
      const inLane = asteroidsRef.current
        .filter((a) => a.lane === lane)
        .sort((a, b) => b.y - a.y);
      if (inLane.length > 0) {
        fireAtAsteroid(inLane[0]);
      } else {
        setShipX(LANE_X[lane]);
        const laserUid = nextUidRef.current++;
        setLasers((prev) => [
          ...prev,
          { uid: laserUid, fromX: LANE_X[lane], toX: LANE_X[lane], toY: 8, color: '#38bdf8' },
        ]);
        playSfx('tile_tap', lane);
        scheduleTimeout(() => {
          setLasers((prev) => prev.filter((l) => l.uid !== laserUid));
        }, 180);
      }
    },
    [phase, fireAtAsteroid, scheduleTimeout]
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') fireLaneBlaster(0);
      else if (e.key === '2') fireLaneBlaster(1);
      else if (e.key === '3') fireLaneBlaster(2);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, fireLaneBlaster]);

  useEffect(() => {
    if (phase !== 'playing') return;

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      elapsedRef.current += dt;
      const rem = Math.max(0, Math.ceil(ROUND_DURATION_SECONDS - elapsedRef.current));
      setTimeLeft((prev) => (prev !== rem ? rem : prev));

      if (elapsedRef.current >= ROUND_DURATION_SECONDS) {
        finishRound();
        return;
      }

      spawnTimerRef.current += dt;
      cometTimerRef.current -= dt;

      if (cometTimerRef.current <= 0 && asteroidsRef.current.length < 6) {
        cometTimerRef.current = 8.5 / paceMultiplier;
        const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
        asteroidsRef.current.push({
          uid: nextUidRef.current++,
          kind: 'comet',
          lane,
          x: LANE_X[lane],
          y: -8,
          speed: (20 + waveRef.current * 2) * paceMultiplier,
        });
      } else if (spawnTimerRef.current >= 1.05 / paceMultiplier && asteroidsRef.current.length < 5) {
        spawnTimerRef.current = 0;
        const activeIds = new Set(
          asteroidsRef.current.filter((a) => a.kind === 'word' && a.item).map((a) => a.item!.id)
        );
        const hasTarget = activeIds.has(targetRef.current.id);
        const distractors = lexicon.filter(
          (i) => i.id !== targetRef.current.id && !activeIds.has(i.id)
        );
        const chosen = !hasTarget
          ? targetRef.current
          : distractors.length > 0
            ? distractors[Math.floor(Math.random() * distractors.length)]
            : null;

        if (chosen) {
          const laneCounts = [0, 0, 0];
          for (const a of asteroidsRef.current) laneCounts[a.lane] += 1;
          const minCount = Math.min(...laneCounts);
          const openLanes = ([0, 1, 2] as const).filter((l) => laneCounts[l] === minCount);
          const lane = openLanes[Math.floor(Math.random() * openLanes.length)];

          asteroidsRef.current.push({
            uid: nextUidRef.current++,
            kind: 'word',
            lane,
            item: chosen,
            x: LANE_X[lane],
            y: -8,
            speed: (13 + waveRef.current * 2.5 + Math.random() * 3) * paceMultiplier,
          });
        }
      }

      const survivors: AsteroidEntity[] = [];
      let missedTarget = false;
      for (const ast of asteroidsRef.current) {
        const nextY = ast.y + ast.speed * dt;
        if (nextY >= 80) {
          if (ast.kind === 'word' && ast.item?.id === targetRef.current.id) {
            missedTarget = true;
          }
          continue;
        }
        survivors.push({ ...ast, y: nextY });
      }

      if (missedTarget) {
        comboRef.current = 0;
        setCombo(0);
        setToast(`Watch out! New target coming!`);
        pickNextTarget(targetRef.current.id);
      }

      asteroidsRef.current = survivors;
      setAsteroids(survivors);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, lexicon, paceMultiplier, finishRound, pickNextTarget]);

  const bestScore = bestScoreFor('meteor_blaster');

  return (
    <section
      ref={containerRef}
      aria-label="Cosmic Meteor Blaster Arcade"
      style={ARCADE_SHELL_STYLE}
    >
      <ArcadeHeaderBar
        icon={<Rocket size={isCompact ? 17 : 20} color="#6366f1" />}
        title="Cosmic Meteor Blaster"
        subtitle="Blast matching word-asteroids with twin starship lasers!"
        score={score}
        bestScore={bestScore}
        timeLeft={timeLeft}
        combo={combo}
        arcadeTier={arcadeTier}
        isCompact={isCompact}
        onExit={onExit}
      />

      {phase === 'ready' ? (
        <ArcadeReadyCard
          companionId="pip"
          badgeText="Starship Ready!"
          title="Blast Word-Asteroids Across Deep Space!"
          description="Read or hear the target word, then tap glowing asteroids (or fire Lanes 1 / 2 / 3) to shatter meteors with twin neon lasers and build Wave multipliers!"
          startLabel="Launch Starfighter!"
          bestScore={bestScore}
          arcadeTier={arcadeTier}
          isCompact={isCompact}
          emblem={<MeteorBlasterEmblem size={isCompact ? 54 : 68} />}
          buttonClass="tactile-btn-indigo"
          onStart={startRound}
        />
      ) : null}

      {phase === 'playing' ? (
        <>
          <TargetPromptBar
            label="BLAST:"
            targetItem={targetItem}
            language={language}
            isCompact={isCompact}
            rightContent={
              <>
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: '#eef2ff',
                    color: '#4338ca',
                    fontSize: isCompact ? '0.72rem' : '0.8rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-display)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Wave {wave}x • Hits: {hits}
                </span>
                <button
                  type="button"
                  className="tactile-btn tactile-btn-success"
                  style={{
                    padding: isCompact ? '4px 9px' : '5px 11px',
                    fontSize: '0.76rem',
                    borderRadius: 10,
                  }}
                  onClick={finishRound}
                >
                  Finish
                </button>
              </>
            }
          />

          {/* Celestial Star-Chart Cockpit Viewport */}
          <div
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
              borderColor: '#d9b46a',
              background:
                'radial-gradient(ellipse at 24% 12%, rgba(246, 197, 106, 0.16), transparent 46%), radial-gradient(circle at 50% 24%, #352b76 0%, #1d1a4b 58%, #131130 100%)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              userSelect: 'none',
              boxShadow: 'inset 0 2px 18px rgba(10, 8, 28, 0.45)',
            }}
          >
            <ArcadeStageDressing glowKey={score} combo={combo} tone="celestial" />

            {/* Dedicated top celestial ticker strip (asteroids fall strictly below it — zero overlap) */}
            <div
              style={{
                position: 'relative',
                zIndex: 9,
                flexShrink: 0,
                padding: isCompact ? '4px 10px' : '5px 14px',
                background: 'rgba(20, 16, 48, 0.86)',
                borderBottom: '1px solid rgba(217, 180, 106, 0.36)',
                color: '#fef08a',
                fontSize: isCompact ? '0.68rem' : '0.75rem',
                fontWeight: 800,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                pointerEvents: 'none',
              }}
            >
              {toast}
            </div>

            {/* Falling Asteroid Arena (strictly below ticker strip) */}
            <div
              style={{
                position: 'relative',
                flex: 1,
                minHeight: 0,
                width: '100%',
                overflow: 'hidden',
              }}
            >
            {/* Gilded Star-Chart & 3 Lane Guides */}
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              <circle cx="50" cy="48" r="34" fill="none" stroke="#d9b46a" strokeOpacity="0.14" strokeWidth="0.4" strokeDasharray="1.8 2.4" />
              <circle cx="14" cy="18" r="0.6" fill="#fef08a" opacity="0.7" />
              <circle cx="86" cy="22" r="0.7" fill="#fde68a" opacity="0.65" />
              <circle cx="32" cy="64" r="0.5" fill="#bae6fd" opacity="0.55" />
              <circle cx="72" cy="58" r="0.6" fill="#fef08a" opacity="0.6" />
              {LANE_X.map((lx) => (
                <line
                  key={lx}
                  x1={lx}
                  y1="4"
                  x2={lx}
                  y2="82"
                  stroke="#d9b46a"
                  strokeOpacity="0.24"
                  strokeWidth="0.55"
                  strokeDasharray="2 3"
                />
              ))}
              {lasers.map((l) => (
                <g key={l.uid}>
                  <line
                    x1={l.fromX - 2.5}
                    y1="82"
                    x2={l.toX - 0.8}
                    y2={l.toY}
                    stroke={l.color}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <line
                    x1={l.fromX + 2.5}
                    y1="82"
                    x2={l.toX + 0.8}
                    y2={l.toY}
                    stroke={l.color}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </g>
              ))}
            </svg>

            {/* Asteroids */}
            {asteroids.map((ast) =>
              ast.kind === 'comet' ? (
                <button
                  key={ast.uid}
                  type="button"
                  aria-label="Golden Comet Core"
                  onClick={() => fireAtAsteroid(ast)}
                  style={{
                    position: 'absolute',
                    left: `${ast.x}%`,
                    top: `${ast.y}%`,
                    transform: 'translate(-50%, -50%)',
                    willChange: 'top',
                    padding: '5px 10px',
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
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    zIndex: 8,
                    boxShadow: '0 0 18px rgba(251, 191, 36, 0.65)',
                  }}
                >
                  <Sparkles size={14} />
                  <span>+3 Gems</span>
                </button>
              ) : ast.item ? (
                <button
                  key={ast.uid}
                  type="button"
                  dir={langDir}
                  onClick={() => fireAtAsteroid(ast)}
                  style={{
                    position: 'absolute',
                    left: `${ast.x}%`,
                    top: `${ast.y}%`,
                    transform: 'translate(-50%, -50%)',
                    willChange: 'top',
                    padding: isCompact ? '4px 5px' : '6px 10px',
                    borderRadius: 18,
                    background: 'linear-gradient(180deg, #352b78 0%, #201a4f 100%)',
                    borderTopWidth: 2,
                    borderRightWidth: 2,
                    borderLeftWidth: 2,
                    borderBottomWidth: 4,
                    borderStyle: 'solid',
                    borderColor: '#d9b46a',
                    color: '#fffbeb',
                    display: 'flex',
                    flexDirection:
                      isCompact || ast.item.foreign.length > 26
                        ? 'column'
                        : 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isCompact ? 2 : 5,
                    maxWidth: isCompact ? '32%' : '32%',
                    minWidth: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    zIndex: 7,
                    boxShadow: '0 4px 14px rgba(10, 8, 28, 0.45), 0 0 12px rgba(217, 180, 106, 0.25)',
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                    <VocabIllustration
                      illustrationKey={ast.item.illustrationKey}
                      language={language}
                      size={
                        isCompact
                          ? ast.item.foreign.length > 14
                            ? 16
                            : 18
                          : ast.item.foreign.length > 26
                            ? 20
                            : 26
                      }
                    />
                  </span>
                  <span
                    dir={langDir}
                    style={{
                      ...getArcadeForeignTextStyle(language, ast.item.foreign, {
                        isCompact,
                        density: 'tight',
                        color: '#fffbeb',
                      }),
                      fontSize: isCompact ? 'clamp(0.62rem, 2.75vw, 0.74rem)' : undefined,
                      lineHeight: isCompact ? 1.15 : undefined,
                      overflowWrap: 'break-word',
                      wordBreak: 'normal',
                      flex: '0 1 auto',
                      width:
                        isCompact || ast.item.foreign.length > 26
                          ? '100%'
                          : undefined,
                    }}
                  >
                    {ast.item.foreign}
                  </span>
                </button>
              ) : null
            )}

            {/* Shatter Sparkle Popups */}
            {bursts.map((b) => (
              <div
                key={b.uid}
                style={{
                  position: 'absolute',
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  transform: 'translate(-50%, -50%)',
                  color: b.color,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                {b.label}
              </div>
            ))}

            {/* Pip Painted Brass & Enamel Storybook Rocket Cockpit */}
            <div
              style={{
                position: 'absolute',
                left: `${shipX}%`,
                bottom: 4,
                transform: 'translateX(-50%)',
                transition: 'left 110ms ease-out',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                pointerEvents: 'none',
                zIndex: 5,
              }}
            >
              <svg width={isCompact ? 46 : 58} height={isCompact ? 44 : 54} viewBox="0 0 64 60" fill="none" aria-hidden="true">
                <defs>
                  <linearGradient id={`rocket-hull-${rocketUid}`} x1="20" y1="8" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFDF5" />
                    <stop offset="55%" stopColor="#F5E6C8" />
                    <stop offset="100%" stopColor="#D9C196" />
                  </linearGradient>
                  <linearGradient id={`rocket-brass-${rocketUid}`} x1="24" y1="6" x2="40" y2="18" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="100%" stopColor="#C2781F" />
                  </linearGradient>
                </defs>
                {/* Warm lantern thruster plume */}
                <path d="M26 44 L32 57 L38 44 Z" fill="#F97316" opacity="0.9" />
                <path d="M28.5 44 L32 53 L35.5 44 Z" fill="#FEF08A" />
                {/* Painted terracotta-brass side fins */}
                <path d="M21 30 L10 43 L22 41 Z" fill="#C85A32" stroke="#4A3426" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M43 30 L54 43 L42 41 Z" fill="#C85A32" stroke="#4A3426" strokeWidth="2.2" strokeLinejoin="round" />
                {/* Enamel ivory rocket fuselage */}
                <path d="M32 5 C41 13 44 26 43 42 H21 C20 26 23 13 32 5 Z" fill={`url(#rocket-hull-${rocketUid})`} stroke="#4A3426" strokeWidth="2.3" strokeLinejoin="round" />
                {/* Brass nosecone cap */}
                <path d="M32 5 C36.5 9.5 39 14 40 17 H24 C25 14 27.5 9.5 32 5 Z" fill={`url(#rocket-brass-${rocketUid})`} stroke="#4A3426" strokeWidth="2" strokeLinejoin="round" />
                {/* Upper-left highlight stripe */}
                <path d="M26 22 C26 28 26.5 34 27 38" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                {/* Brass-rimmed sky porthole */}
                <circle cx="32" cy="27" r="6.5" fill="#38BDF8" stroke="#B47320" strokeWidth="2.4" />
                <circle cx="30" cy="25" r="2" fill="#FFFBEB" opacity="0.85" />
                {/* Engine collar */}
                <rect x="23" y="40" width="18" height="4.5" rx="2" fill="#B47320" stroke="#4A3426" strokeWidth="1.8" />
              </svg>
              <MascotStage
                companionId="pip"
                pose={pipPose}
                equippedCosmetics={activeProfile.equippedCosmetics}
                size={isCompact ? 46 : 58}
              />
            </div>
            </div>
          </div>

          {/* 3-Lane Cockpit Blaster Console */}
          <div
            style={{
              flexShrink: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            {([0, 1, 2] as const).map((laneIdx) => (
              <button
                key={laneIdx}
                type="button"
                className="tactile-btn tactile-btn-indigo"
                style={{
                  padding: isCompact ? '7px 6px' : '9px 10px',
                  fontSize: isCompact ? '0.8rem' : '0.88rem',
                }}
                onClick={() => fireLaneBlaster(laneIdx)}
              >
                <Crosshair size={15} />
                <span>
                  {isCompact ? `Lane ${laneIdx + 1}` : `Fire Lane ${laneIdx + 1}`}
                </span>
                <Zap size={13} />
              </button>
            ))}
          </div>
        </>
      ) : null}

      {phase === 'summary' && summary ? (
        <ArcadeSummaryCard
          companionId="pip"
          badgeText={`Wave ${summary.maxWave} Pilot!`}
          title="Cosmic Meteor Blaster Complete!"
          score={summary.score}
          bestScore={bestScore}
          heartsWon={summary.heartsWon}
          bonusGems={summary.bonusGems}
          xpEarned={summary.xpEarned}
          arcadeTier={arcadeTier}
          statLine={`Asteroids shattered: ${summary.hits} • Max Wave: ${summary.maxWave}x`}
          isCompact={isCompact}
          onPlayAgain={startRound}
          onExit={onExit}
        />
      ) : null}
    </section>
  );
}
