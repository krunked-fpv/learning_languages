import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { TrainFront } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { playSfx, speakPhrase } from '../../audio';
import {
  LANGUAGE_META,
  type ArcadeLanternItem,
  type ArcadeProficiencyTier,
  type CharacterPose,
} from '../../types/contracts';
import { MascotStage } from '../characters/MascotStage';
import { TrainSwitcherEmblem } from './ArcadeEmblems';
import {
  ARCADE_SHELL_STYLE,
  ArcadeHeaderBar,
  ArcadeReadyCard,
  ArcadeSummaryCard,
  TargetPromptBar,
  computeScaledArcadeRewards,
  getArcadeForeignTextStyle,
  pickDistinctItems,
  recordArcadeRunResult,
  useArcadeContainerMetrics,
  useArcadeDeck,
} from './arcadeShared';

const ROUND_DURATION_SECONDS = 45;
const TRACK_X = [18, 50, 82] as const;

interface TrackRoundState {
  target: ArcadeLanternItem;
  tracks: [ArcadeLanternItem, ArcadeLanternItem, ArcadeLanternItem];
}

function getTrainCoords(progress: number, lane: 0 | 1 | 2): { x: number; y: number } {
  if (progress <= 0.36) {
    const t = progress / 0.36;
    return { x: 50, y: 12 + t * 24 };
  }
  const t = (progress - 0.36) / 0.64;
  const endX = TRACK_X[lane];
  // Smooth S-curve along switched track
  const eased = t * t * (3 - 2 * t);
  return {
    x: 50 + (endX - 50) * eased,
    y: 36 + t * 36,
  };
}

export interface TrainSwitcherArcadeProps {
  arcadeTier?: ArcadeProficiencyTier;
  onExit: () => void;
}

export function TrainSwitcherArcade({
  arcadeTier = 'sprout',
  onExit,
}: TrainSwitcherArcadeProps) {
  const { language, lexicon, targetLexicon, bestScoreFor, paceMultiplier } =
    useArcadeDeck(arcadeTier);
  const { containerRef, isCompact } = useArcadeContainerMetrics();
  const langDir = LANGUAGE_META[language].dir;

  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>('ready');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [coupledCount, setCoupledCount] = useState(0);
  const [benniPose, setBenniPose] = useState<CharacterPose>('idle');
  const [selectedLane, setSelectedLane] = useState<0 | 1 | 2>(1);
  const [trainProgress, setTrainProgress] = useState(0.05);
  const [roundState, setRoundState] = useState<TrackRoundState>(() => ({
    target: targetLexicon[0],
    tracks: [targetLexicon[0], lexicon[1] ?? targetLexicon[0], lexicon[2] ?? targetLexicon[0]],
  }));
  const [toast, setToast] = useState<ReactNode>('Switch Track 1, 2, or 3 to route the Alpine Express!');
  const [summary, setSummary] = useState<{
    score: number;
    heartsWon: number;
    bonusGems: number;
    xpEarned: number;
    coupled: number;
  } | null>(null);

  const selectedLaneRef = useRef<0 | 1 | 2>(1);
  const trainProgressRef = useRef(0.05);
  const boostRef = useRef(false);
  const roundRef = useRef<TrackRoundState>(roundState);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const coupledRef = useRef(0);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (phase === 'ready' && targetLexicon.length > 0) {
      const next: TrackRoundState = {
        target: targetLexicon[0],
        tracks: [targetLexicon[0], lexicon[1] ?? targetLexicon[0], lexicon[2] ?? targetLexicon[0]],
      };
      roundRef.current = next;
      setRoundState(next);
    }
  }, [phase, targetLexicon, lexicon]);

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

  const dispatchNextTrain = useCallback(
    (avoidId?: string) => {
      const pool = targetLexicon.filter((i) => i.id !== avoidId);
      const list = pool.length > 0 ? pool : targetLexicon;
      const target = list[Math.floor(Math.random() * list.length)];
      const distractors = pickDistinctItems(lexicon, 2, new Set([target.id]));
      const items = [target, distractors[0] ?? target, distractors[1] ?? target];
      for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      const nextRound: TrackRoundState = {
        target,
        tracks: [items[0], items[1], items[2]],
      };
      roundRef.current = nextRound;
      setRoundState(nextRound);
      trainProgressRef.current = 0.04;
      boostRef.current = false;
      setTrainProgress(0.04);
    },
    [targetLexicon, lexicon]
  );

  const finishRound = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const totalCoupled = coupledRef.current;
    const finalScore = scoreRef.current;
    const heartsWon = Math.min(5, Math.max(1, Math.ceil(totalCoupled / 2)));
    const baseGems = Math.floor(finalScore / 30) + (totalCoupled >= 5 ? 5 : 0);
    const { bonusGems, xpEarned } = computeScaledArcadeRewards({
      arcadeTier,
      baseGems,
      performanceUnits: totalCoupled,
    });
    recordArcadeRunResult({
      gameId: 'train_switcher',
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
      coupled: totalCoupled,
    });
    setPhase('summary');
  }, [arcadeTier]);

  const startRound = useCallback(() => {
    playSfx('button_click');
    finishedRef.current = false;
    scoreRef.current = 0;
    comboRef.current = 0;
    coupledRef.current = 0;
    elapsedRef.current = 0;
    selectedLaneRef.current = 1;
    setSelectedLane(1);
    setScore(0);
    setCombo(0);
    setCoupledCount(0);
    setBenniPose('happy');
    setTimeLeft(ROUND_DURATION_SECONDS);
    setToast('Tap Track 1, 2, or 3 (or press 1/2/3) to switch the rails!');
    setSummary(null);
    dispatchNextTrain();
    setPhase('playing');
  }, [dispatchNextTrain]);

  const resolveArrival = useCallback(
    (lane: 0 | 1 | 2) => {
      const chosenItem = roundRef.current.tracks[lane];
      if (chosenItem.id === roundRef.current.target.id) {
        comboRef.current += 1;
        coupledRef.current += 1;
        const pts = 35 + (comboRef.current - 1) * 10;
        scoreRef.current += pts;
        setCombo(comboRef.current);
        setCoupledCount(coupledRef.current);
        setScore(scoreRef.current);
        setBenniPose('victory_dance');
        playSfx('combo_3x');
        void speakPhrase({
          text: chosenItem.foreign,
          language,
          phonetic: chosenItem.phonetic,
        });
        setToast(
          <>
            All aboard Track {lane + 1}! Coupled “<bdi dir={langDir}>{chosenItem.foreign}</bdi>” +{pts}!
          </>
        );
        scheduleTimeout(() => setBenniPose('idle'), 650);
        dispatchNextTrain(chosenItem.id);
      } else {
        comboRef.current = 0;
        setCombo(0);
        setBenniPose('sympathetic');
        playSfx('gentle_nudge');
        setToast(`Wrong siding! Route next train to "${roundRef.current.target.english}"!`);
        scheduleTimeout(() => setBenniPose('idle'), 550);
        dispatchNextTrain(roundRef.current.target.id);
      }
    },
    [language, langDir, dispatchNextTrain, scheduleTimeout]
  );

  const selectTrack = useCallback(
    (lane: 0 | 1 | 2) => {
      if (phase !== 'playing') return;
      selectedLaneRef.current = lane;
      setSelectedLane(lane);
      playSfx('tile_tap', lane);
      boostRef.current = true;
    },
    [phase]
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1' || e.key === 'ArrowLeft') {
        if (e.key === 'ArrowLeft') e.preventDefault();
        selectTrack(0);
      } else if (e.key === '2' || e.key === 'ArrowDown') {
        if (e.key === 'ArrowDown') e.preventDefault();
        selectTrack(1);
      } else if (e.key === '3' || e.key === 'ArrowRight') {
        if (e.key === 'ArrowRight') e.preventDefault();
        selectTrack(2);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, selectTrack]);

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

      const baseSpeed = (0.21 + Math.min(0.14, coupledRef.current * 0.015)) * paceMultiplier;
      const speed = boostRef.current ? 1.85 * Math.max(1, paceMultiplier) : baseSpeed;
      const nextProg = trainProgressRef.current + speed * dt;
      if (nextProg >= 1) {
        resolveArrival(selectedLaneRef.current);
      } else {
        trainProgressRef.current = nextProg;
        setTrainProgress(nextProg);
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, paceMultiplier, finishRound, resolveArrival]);

  const trainPos = getTrainCoords(trainProgress, selectedLane);
  const bestScore = bestScoreFor('train_switcher');

  return (
    <section
      ref={containerRef}
      aria-label="Alpine Express Switcher Arcade"
      style={ARCADE_SHELL_STYLE}
    >
      <ArcadeHeaderBar
        icon={<TrainFront size={isCompact ? 17 : 20} color="#059669" />}
        title="Alpine Express Switcher"
        subtitle="Switch Benni's clockwork tracks to couple golden carriages!"
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
          companionId="benni"
          badgeText="All Aboard!"
          title="Switch the Clockwork Railway Tracks!"
          description="Benni's Alpine Express speeds toward the 3-way junction. Tap Track 1, 2, or 3 (or press 1/2/3 or Arrow keys) matching the prompt to couple golden carriages!"
          startLabel="Start Express Shift!"
          bestScore={bestScore}
          arcadeTier={arcadeTier}
          isCompact={isCompact}
          emblem={<TrainSwitcherEmblem size={isCompact ? 54 : 68} />}
          buttonClass="tactile-btn-success"
          onStart={startRound}
        />
      ) : null}

      {phase === 'playing' ? (
        <>
          <TargetPromptBar
            label="ROUTE TO:"
            targetItem={roundState.target}
            language={language}
            isCompact={isCompact}
            rightContent={
              <>
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: '#ecfdf5',
                    color: '#065f46',
                    fontSize: isCompact ? '0.72rem' : '0.8rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-display)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Cars: {coupledCount}
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

          {/* 3-Track Clockwork Junction Stage */}
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
              borderColor: '#10b981',
              background: 'linear-gradient(180deg, #dcfce7 0%, #a7f3d0 55%, #6ee7b7 100%)',
              overflow: 'hidden',
              userSelect: 'none',
            }}
          >
            {/* Alpine Scenery + 3 Curved Tracks SVG */}
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
              {/* Distant Alpine Peaks */}
              <polygon points="0,35 16,10 34,35" fill="#cbd5e1" opacity="0.45" />
              <polygon points="66,35 84,8 100,35" fill="#cbd5e1" opacity="0.45" />

              {/* Main Entry Rail */}
              <line x1="50" y1="6" x2="50" y2="36" stroke="#78350f" strokeWidth="4" />
              <line x1="50" y1="6" x2="50" y2="36" stroke="#fde047" strokeWidth="1.4" />

              {/* Branch Rails */}
              {TRACK_X.map((tx, idx) => {
                const isSelected = selectedLane === idx;
                const d = `M 50 36 C 50 54, ${tx} 54, ${tx} 75`;
                return (
                  <g key={tx}>
                    <path
                      d={d}
                      fill="none"
                      stroke={isSelected ? '#92400e' : '#64748b'}
                      strokeWidth={isSelected ? '4.5' : '3.2'}
                      strokeLinecap="round"
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke={isSelected ? '#fde047' : '#cbd5e1'}
                      strokeWidth={isSelected ? '1.8' : '1.1'}
                      strokeDasharray={isSelected ? 'none' : '2 2'}
                    />
                  </g>
                );
              })}

              {/* Junction Switch Lever Ring */}
              <circle cx="50" cy="36" r="4.2" fill="#f59e0b" stroke="#78350f" strokeWidth="1.4" />
            </svg>

            {/* Coupled Golden Carriages Counter */}
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 9px',
                borderRadius: 999,
                background: 'rgba(15, 23, 42, 0.78)',
                color: '#fde047',
                fontSize: '0.72rem',
                fontWeight: 900,
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              <span>Express Cars: {coupledCount}</span>
            </div>

            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 10,
                maxWidth: '58%',
                padding: '3px 10px',
                borderRadius: 999,
                background: 'rgba(15, 23, 42, 0.78)',
                color: '#ffffff',
                fontSize: '0.72rem',
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

            {/* Benni Conductor */}
            <div
              style={{
                position: 'absolute',
                left: 8,
                top: '28%',
                pointerEvents: 'none',
                zIndex: 4,
              }}
            >
              <MascotStage companionId="benni" pose={benniPose} size={isCompact ? 54 : 70} />
            </div>

            {/* Moving Clockwork Locomotive */}
            <div
              style={{
                position: 'absolute',
                left: `${trainPos.x}%`,
                top: `${trainPos.y}%`,
                transform: 'translate(-50%, -50%)',
                willChange: 'left, top',
                pointerEvents: 'none',
                zIndex: 7,
              }}
            >
              <svg width={isCompact ? 46 : 56} height={isCompact ? 42 : 50} viewBox="0 0 60 54" aria-label="Alpine Express train">
                <rect x="10" y="10" width="40" height="32" rx="10" fill="#d97706" stroke="#78350f" strokeWidth="3" />
                <rect x="17" y="15" width="26" height="14" rx="5" fill="#fef3c7" stroke="#92400e" strokeWidth="2" />
                <circle cx="30" cy="36" r="5" fill="#fde047" stroke="#78350f" strokeWidth="2" />
                <circle cx="16" cy="43" r="4.5" fill="#1e293b" />
                <circle cx="44" cy="43" r="4.5" fill="#1e293b" />
              </svg>
            </div>

            {/* 3 Clickable Cargo Track Gates */}
            <div
              style={{
                position: 'absolute',
                left: 8,
                right: 8,
                bottom: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: isCompact ? 6 : 10,
                zIndex: 8,
              }}
            >
              {roundState.tracks.map((item, idx) => {
                const lane = idx as 0 | 1 | 2;
                const isSelected = selectedLane === lane;
                return (
                  <button
                    key={`${item.id}-${lane}`}
                    type="button"
                    dir="ltr"
                    onClick={() => selectTrack(lane)}
                    style={{
                      padding: isCompact ? '4px 4px' : '8px 10px',
                      borderRadius: 16,
                      background: isSelected ? '#fef3c7' : '#ffffff',
                      borderTopWidth: 2.5,
                      borderRightWidth: 2.5,
                      borderLeftWidth: 2.5,
                      borderBottomWidth: 5,
                      borderStyle: 'solid',
                      borderColor: isSelected ? '#d97706' : '#059669',
                      color: '#1e1b4b',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isCompact ? 2 : 3,
                      minWidth: 0,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      boxShadow: isSelected
                        ? '0 0 18px rgba(245, 158, 11, 0.55)'
                        : '0 6px 14px rgba(15, 23, 42, 0.16)',
                    }}
                  >
                    <span
                      style={{
                        padding: '1px 7px',
                        borderRadius: 999,
                        background: isSelected ? '#d97706' : '#ecfdf5',
                        color: isSelected ? '#ffffff' : '#065f46',
                        fontSize: isCompact ? '0.6rem' : '0.66rem',
                        fontWeight: 900,
                      }}
                    >
                      Track {lane + 1}
                    </span>
                    <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                      <VocabIllustration
                        illustrationKey={item.illustrationKey}
                        language={language}
                        size={isCompact ? (item.foreign.length > 20 ? 18 : 22) : 36}
                      />
                    </span>
                    <span
                      dir={langDir}
                      style={{
                        ...getArcadeForeignTextStyle(language, item.foreign, {
                          isCompact,
                          density: 'tight',
                          color: '#1e1b4b',
                        }),
                        width: '100%',
                      }}
                    >
                      {item.foreign}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {phase === 'summary' && summary ? (
        <ArcadeSummaryCard
          companionId="benni"
          badgeText="Master Switchman!"
          title="Alpine Express Switcher Complete!"
          score={summary.score}
          bestScore={bestScore}
          heartsWon={summary.heartsWon}
          bonusGems={summary.bonusGems}
          xpEarned={summary.xpEarned}
          arcadeTier={arcadeTier}
          statLine={`Golden carriages coupled: ${summary.coupled}`}
          isCompact={isCompact}
          onPlayAgain={startRound}
          onExit={onExit}
        />
      ) : null}
    </section>
  );
}
