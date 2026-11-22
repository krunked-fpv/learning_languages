import { useCallback, useEffect, useRef, useState } from 'react';
import { Music2 } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { playSfx, speakPhrase } from '../../audio';
import { vaultActions } from '../../store/useVaultStore';
import type { ArcadeLanternItem, CharacterPose } from '../../types/contracts';
import { MascotStage } from '../characters/MascotStage';
import { RhythmChefEmblem } from './ArcadeEmblems';
import {
  ARCADE_SHELL_STYLE,
  ArcadeHeaderBar,
  ArcadeReadyCard,
  ArcadeSummaryCard,
  TargetPromptBar,
  pickDistinctItems,
  useArcadeContainerMetrics,
  useArcadeDeck,
} from './arcadeShared';

const ROUND_DURATION_SECONDS = 45;
const BEAT_CYCLE_SECONDS = 1.9;

const PAD_STYLES = [
  { bg: '#fff1f2', border: '#f43f5e', text: '#9f1239', badge: '#ffe4e6' },
  { bg: '#ecfdf5', border: '#10b981', text: '#065f46', badge: '#d1fae5' },
  { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', badge: '#fef3c7' },
  { bg: '#eef2ff', border: '#6366f1', text: '#312e81', badge: '#e0e7ff' },
] as const;

interface RhythmRound {
  target: ArcadeLanternItem;
  pads: [ArcadeLanternItem, ArcadeLanternItem, ArcadeLanternItem, ArcadeLanternItem];
}

export interface RhythmChefArcadeProps {
  onExit: () => void;
}

export function RhythmChefArcade({ onExit }: RhythmChefArcadeProps) {
  const { language, lexicon, targetLexicon, bestScoreFor } = useArcadeDeck();
  const { containerRef, isCompact } = useArcadeContainerMetrics();

  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>('ready');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [hits, setHits] = useState(0);
  const [beatPhase, setBeatPhase] = useState(0); // 0..1 contracting toward rim
  const [activeFlashIdx, setActiveFlashIdx] = useState<number | null>(null);
  const [chefPose, setChefPose] = useState<CharacterPose>('idle');
  const [round, setRound] = useState<RhythmRound>(() => ({
    target: targetLexicon[0],
    pads: [
      targetLexicon[0],
      lexicon[1] ?? targetLexicon[0],
      lexicon[2] ?? targetLexicon[0],
      lexicon[3] ?? targetLexicon[0],
    ],
  }));
  const [toast, setToast] = useState<string>('Tap the matching drum pad when the glowing ring hits the rim!');
  const [summary, setSummary] = useState<{
    score: number;
    heartsWon: number;
    bonusGems: number;
    hits: number;
    perfects: number;
  } | null>(null);

  const roundRef = useRef<RhythmRound>(round);
  const beatPhaseRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const hitsRef = useRef(0);
  const perfectsRef = useRef(0);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

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

  const dealNextBeat = useCallback(
    (avoidId?: string) => {
      const pool = targetLexicon.filter((i) => i.id !== avoidId);
      const list = pool.length > 0 ? pool : targetLexicon;
      const target = list[Math.floor(Math.random() * list.length)];
      const distractors = pickDistinctItems(lexicon, 3, new Set([target.id]));
      const pads = [
        target,
        distractors[0] ?? target,
        distractors[1] ?? target,
        distractors[2] ?? target,
      ];
      for (let i = pads.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pads[i], pads[j]] = [pads[j], pads[i]];
      }
      const nextRound: RhythmRound = {
        target,
        pads: [pads[0], pads[1], pads[2], pads[3]],
      };
      roundRef.current = nextRound;
      setRound(nextRound);
    },
    [targetLexicon, lexicon]
  );

  const finishRound = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const totalHits = hitsRef.current;
    const totalPerfects = perfectsRef.current;
    const finalScore = scoreRef.current;
    const heartsWon = Math.min(5, Math.max(1, Math.ceil(totalHits / 3)));
    const bonusGems = Math.floor(finalScore / 30) + totalPerfects * 2;
    vaultActions.recordArcadeGameResult({
      gameId: 'rhythm_chef',
      score: finalScore,
      heartsWon,
      bonusGems,
    });
    playSfx('unit_fanfare');
    setSummary({
      score: finalScore,
      heartsWon,
      bonusGems,
      hits: totalHits,
      perfects: totalPerfects,
    });
    setPhase('summary');
  }, []);

  const startRound = useCallback(() => {
    playSfx('button_click');
    finishedRef.current = false;
    scoreRef.current = 0;
    comboRef.current = 0;
    hitsRef.current = 0;
    perfectsRef.current = 0;
    elapsedRef.current = 0;
    beatPhaseRef.current = 0.2;
    setScore(0);
    setCombo(0);
    setHits(0);
    setPerfects(0);
    setBeatPhase(0.2);
    setActiveFlashIdx(null);
    setChefPose('happy');
    setTimeLeft(ROUND_DURATION_SECONDS);
    setToast('Tap the matching drum inside the golden beat window for PERFECT!');
    setSummary(null);
    dealNextBeat();
    setPhase('playing');
  }, [dealNextBeat]);

  const handleTapPad = useCallback(
    (padIndex: 0 | 1 | 2 | 3) => {
      if (phase !== 'playing') return;
      const tapped = roundRef.current.pads[padIndex];
      setActiveFlashIdx(padIndex);
      scheduleTimeout(() => setActiveFlashIdx(null), 190);

      if (tapped.id === roundRef.current.target.id) {
        const curBeat = beatPhaseRef.current;
        const inPerfectWindow = curBeat >= 0.58 || curBeat <= 0.14;
        comboRef.current += 1;
        hitsRef.current += 1;
        if (inPerfectWindow) perfectsRef.current += 1;
        const pts = (inPerfectWindow ? 45 : 22) + (comboRef.current - 1) * 7;
        scoreRef.current += pts;

        setCombo(comboRef.current);
        setHits(hitsRef.current);
        setPerfects(perfectsRef.current);
        setScore(scoreRef.current);
        setChefPose(inPerfectWindow ? 'victory_dance' : 'happy');

        playSfx('bubble_pop', comboRef.current - 1);
        if (inPerfectWindow) {
          playSfx('star_pop', Math.min(3, comboRef.current - 1));
          setToast(`PERFECT BEAT! "${tapped.foreign}" +${pts} pts!`);
        } else {
          setToast(`Tasty rhythm! "${tapped.foreign}" +${pts} pts!`);
        }

        void speakPhrase({
          text: tapped.foreign,
          language,
          phonetic: tapped.phonetic,
        });
        scheduleTimeout(() => setChefPose('idle'), 550);
        dealNextBeat(tapped.id);
      } else {
        comboRef.current = 0;
        setCombo(0);
        setChefPose('sympathetic');
        playSfx('gentle_nudge');
        setToast(`Wrong drum! Listen & tap "${roundRef.current.target.english}"!`);
        scheduleTimeout(() => setChefPose('idle'), 500);
      }
    },
    [phase, language, dealNextBeat, scheduleTimeout]
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1' || e.key === 'q' || e.key === 'Q') handleTapPad(0);
      else if (e.key === '2' || e.key === 'w' || e.key === 'W') handleTapPad(1);
      else if (e.key === '3' || e.key === 'a' || e.key === 'A') handleTapPad(2);
      else if (e.key === '4' || e.key === 's' || e.key === 'S') handleTapPad(3);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, handleTapPad]);

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

      const nextBeat = (elapsedRef.current % BEAT_CYCLE_SECONDS) / BEAT_CYCLE_SECONDS;
      beatPhaseRef.current = nextBeat;
      setBeatPhase(nextBeat);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, finishRound]);

  const inBeatZone = beatPhase >= 0.58 || beatPhase <= 0.14;
  const ringScale = 1 + (1 - beatPhase) * 0.24;
  const bestScore = bestScoreFor('rhythm_chef');

  return (
    <section
      ref={containerRef}
      aria-label="Beat Kitchen Rhythm Arcade"
      style={ARCADE_SHELL_STYLE}
    >
      <ArcadeHeaderBar
        icon={<Music2 size={isCompact ? 17 : 20} color="#ea580c" />}
        title="Beat Kitchen Rhythm"
        subtitle="Tap the matching drum pad inside the golden beat window!"
        score={score}
        bestScore={bestScore}
        timeLeft={timeLeft}
        combo={combo}
        isCompact={isCompact}
        onExit={onExit}
      />

      {phase === 'ready' ? (
        <ArcadeReadyCard
          companionId="mateo"
          badgeText="Kitchen Jam!"
          title="Cook Up Musical Harmonies!"
          description="Read or hear Mateo's kitchen order while glowing beat rings contract around the 4 drum pads. Tap the matching word pad inside the golden beat window for PERFECT harmonies!"
          startLabel="Start Kitchen Beat!"
          bestScore={bestScore}
          isCompact={isCompact}
          emblem={<RhythmChefEmblem size={isCompact ? 54 : 68} />}
          buttonClass="tactile-btn-amber"
          onStart={startRound}
        />
      ) : null}

      {phase === 'playing' ? (
        <>
          <TargetPromptBar
            label="CHEF ORDER:"
            targetItem={round.target}
            language={language}
            isCompact={isCompact}
            rightContent={
              <>
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: inBeatZone ? '#fde047' : '#ffedd5',
                    color: '#9a3412',
                    fontSize: isCompact ? '0.72rem' : '0.8rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-display)',
                    transition: 'background-color 100ms ease',
                  }}
                >
                  {inBeatZone ? 'BEAT NOW!' : `Perfects: ${perfects}`}
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

          {/* 4-Pad Musical Kitchen Stage */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              width: '100%',
              padding: isCompact ? 10 : 16,
              borderRadius: 22,
              borderTopWidth: 3,
              borderRightWidth: 3,
              borderLeftWidth: 3,
              borderBottomWidth: 5,
              borderStyle: 'solid',
              borderColor: inBeatZone ? '#f59e0b' : '#fb923c',
              background: 'linear-gradient(180deg, #fff7ed 0%, #ffedd5 55%, #fed7aa 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: isCompact ? 8 : 12,
              overflow: 'hidden',
              userSelect: 'none',
            }}
          >
            {/* Top Status & Chef Reaction Row */}
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <MascotStage companionId="mateo" pose={chefPose} size={isCompact ? 42 : 54} />
                <div
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(124, 45, 18, 0.86)',
                    color: '#fef3c7',
                    fontSize: isCompact ? '0.72rem' : '0.8rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {toast}
                </div>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.76rem',
                  fontWeight: 900,
                  color: '#9a3412',
                }}
              >
                Hits: {hits}
              </div>
            </div>

            {/* 4 Drum / Bell Pads */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                gap: isCompact ? 10 : 14,
              }}
            >
              {round.pads.map((item, idx) => {
                const padIdx = idx as 0 | 1 | 2 | 3;
                const pal = PAD_STYLES[padIdx];
                const isFlashed = activeFlashIdx === padIdx;

                return (
                  <button
                    key={`${item.id}-${padIdx}`}
                    type="button"
                    onClick={() => handleTapPad(padIdx)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      minHeight: 0,
                      padding: isCompact ? 8 : 12,
                      borderRadius: 22,
                      background: pal.bg,
                      borderTopWidth: 3,
                      borderRightWidth: 3,
                      borderLeftWidth: 3,
                      borderBottomWidth: 6,
                      borderStyle: 'solid',
                      borderColor: inBeatZone ? '#f59e0b' : pal.border,
                      color: pal.text,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isCompact ? 4 : 6,
                      cursor: 'pointer',
                      transform: isFlashed ? 'scale(0.95)' : 'scale(1)',
                      transition: 'transform 90ms ease',
                      boxShadow: inBeatZone
                        ? '0 0 20px rgba(245, 158, 11, 0.4)'
                        : '0 8px 18px rgba(124, 45, 18, 0.14)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Contracting Luminous Beat Ring */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 6,
                        borderRadius: 16,
                        borderStyle: 'solid',
                        borderWidth: inBeatZone ? 3 : 2,
                        borderColor: inBeatZone ? '#f59e0b' : pal.border,
                        opacity: inBeatZone ? 0.85 : 0.35,
                        transform: `scale(${ringScale.toFixed(3)})`,
                        pointerEvents: 'none',
                      }}
                    />

                    <span
                      style={{
                        position: 'absolute',
                        top: 7,
                        left: 9,
                        padding: '1px 7px',
                        borderRadius: 999,
                        background: pal.badge,
                        color: pal.text,
                        fontSize: '0.68rem',
                        fontWeight: 900,
                      }}
                    >
                      Pad {padIdx + 1}
                    </span>

                    <VocabIllustration
                      illustrationKey={item.illustrationKey}
                      language={language}
                      size={isCompact ? 34 : 46}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 900,
                        fontSize: isCompact ? '0.88rem' : '1.05rem',
                        lineHeight: 1.15,
                        color: pal.text,
                        textAlign: 'center',
                        zIndex: 2,
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
          companionId="mateo"
          badgeText="Rhythm Maestro!"
          title="Beat Kitchen Rhythm Complete!"
          score={summary.score}
          bestScore={bestScore}
          heartsWon={summary.heartsWon}
          bonusGems={summary.bonusGems}
          statLine={`Beats hit: ${summary.hits} • Golden Perfects: ${summary.perfects}`}
          isCompact={isCompact}
          onPlayAgain={startRound}
          onExit={onExit}
        />
      ) : null}
    </section>
  );
}
