import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, Sparkles } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { playSfx, speakPhrase } from '../../audio';
import {
  LANGUAGE_META,
  type ArcadeLanternItem,
  type ArcadeProficiencyTier,
  type CharacterPose,
  type CompanionId,
} from '../../types/contracts';
import { MascotStage } from '../characters/MascotStage';
import { TowerStackEmblem } from './ArcadeEmblems';
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
const SCOOP_COLORS = ['#fb7185', '#34d399', '#60a5fa', '#fbbf24', '#c084fc'] as const;

interface GlidingScoop {
  uid: number;
  item: ArcadeLanternItem;
  x: number; // 12..88 %
  color: string;
}

interface StackedScoop {
  uid: number;
  item: ArcadeLanternItem;
  offsetX: number;
  color: string;
  perfect: boolean;
}

export interface TowerStackArcadeProps {
  arcadeTier?: ArcadeProficiencyTier;
  onExit: () => void;
}

export function TowerStackArcade({
  arcadeTier = 'sprout',
  onExit,
}: TowerStackArcadeProps) {
  const { language, lexicon, targetLexicon, bestScoreFor, paceMultiplier } =
    useArcadeDeck(arcadeTier);
  const { containerRef, isCompact } = useArcadeContainerMetrics();
  const langDir = LANGUAGE_META[language].dir;

  const chefCompanion: CompanionId =
    language === 'fr' || language === 'it' ? 'colette' : 'mateo';
  const chefName = chefCompanion === 'colette' ? 'Colette' : 'Mateo';

  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>('ready');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [chefPose, setChefPose] = useState<CharacterPose>('idle');
  const [targetItem, setTargetItem] = useState<ArcadeLanternItem>(() => targetLexicon[0]);
  const [glidingScoops, setGlidingScoops] = useState<GlidingScoop[]>([]);
  const [stackedScoops, setStackedScoops] = useState<StackedScoop[]>([]);
  const [toast, setToast] = useState<ReactNode>('Drop the matching scoop when it passes over the cone!');
  const [perfectFlash, setPerfectFlash] = useState(false);
  const [summary, setSummary] = useState<{
    score: number;
    heartsWon: number;
    bonusGems: number;
    xpEarned: number;
    scoops: number;
    perfects: number;
  } | null>(null);

  const scoopsRef = useRef<GlidingScoop[]>([]);
  const targetRef = useRef<ArcadeLanternItem>(targetLexicon[0]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const perfectRef = useRef(0);
  const stackCountRef = useRef(0);
  const elapsedRef = useRef(0);
  const phaseAngleRef = useRef(0);
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

  const spawnRoundScoops = useCallback(
    (avoidId?: string) => {
      const pool = targetLexicon.filter((i) => i.id !== avoidId);
      const list = pool.length > 0 ? pool : targetLexicon;
      const chosen = list[Math.floor(Math.random() * list.length)];
      targetRef.current = chosen;
      setTargetItem(chosen);

      const distractor =
        pickDistinctItems(lexicon, 1, new Set([chosen.id]))[0] ?? chosen;
      const colorA = SCOOP_COLORS[nextUidRef.current % SCOOP_COLORS.length];
      const colorB = SCOOP_COLORS[(nextUidRef.current + 2) % SCOOP_COLORS.length];

      // Position matching scoop near 38-62% or start cleanly oscillating
      const flipOrder = Math.random() < 0.5;
      phaseAngleRef.current = flipOrder ? Math.PI * 0.15 : Math.PI * 0.85;
      const xA = 50 + Math.sin(phaseAngleRef.current) * 29;
      const xB = 50 + Math.sin(phaseAngleRef.current + Math.PI) * 29;

      const pair: GlidingScoop[] = [
        { uid: nextUidRef.current++, item: chosen, x: xA, color: colorA },
        { uid: nextUidRef.current++, item: distractor, x: xB, color: colorB },
      ];
      scoopsRef.current = pair;
      setGlidingScoops(pair);
    },
    [targetLexicon, lexicon]
  );

  const finishRound = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const totalScoops = stackCountRef.current;
    const finalScore = scoreRef.current;
    const totalPerfects = perfectRef.current;
    const heartsWon = Math.min(5, Math.max(1, Math.ceil(totalScoops / 2)));
    const baseGems = Math.floor(finalScore / 30) + totalPerfects * 2;
    const { bonusGems, xpEarned } = computeScaledArcadeRewards({
      arcadeTier,
      baseGems,
      performanceUnits: totalScoops,
      baseXpBonus: totalPerfects,
    });
    recordArcadeRunResult({
      gameId: 'tower_stack',
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
      scoops: totalScoops,
      perfects: totalPerfects,
    });
    setPhase('summary');
  }, [arcadeTier]);

  const startRound = useCallback(() => {
    playSfx('button_click');
    finishedRef.current = false;
    scoreRef.current = 0;
    comboRef.current = 0;
    perfectRef.current = 0;
    stackCountRef.current = 0;
    elapsedRef.current = 0;
    setScore(0);
    setCombo(0);
    setPerfectCount(0);
    setChefPose('happy');
    setStackedScoops([]);
    setPerfectFlash(false);
    setTimeLeft(ROUND_DURATION_SECONDS);
    setToast(`Wait until ${chefName}'s order glides over the cone, then Drop Scoop!`);
    setSummary(null);
    spawnRoundScoops();
    setPhase('playing');
  }, [chefName, spawnRoundScoops]);

  const handleDropScoop = useCallback(() => {
    if (phase !== 'playing' || scoopsRef.current.length === 0) return;

    const sorted = [...scoopsRef.current].sort(
      (a, b) => Math.abs(a.x - 50) - Math.abs(b.x - 50)
    );
    const closest = sorted[0];
    const dist = Math.abs(closest.x - 50);

    if (closest.item.id === targetRef.current.id && dist <= 22) {
      const isPerfect = dist <= 9;
      comboRef.current += 1;
      stackCountRef.current += 1;
      if (isPerfect) perfectRef.current += 1;
      const pts = (isPerfect ? 45 : 25) + (comboRef.current - 1) * 6;
      scoreRef.current += pts;

      setCombo(comboRef.current);
      setPerfectCount(perfectRef.current);
      setScore(scoreRef.current);
      setChefPose(isPerfect ? 'victory_dance' : 'happy');

      const hitForeign = closest.item.foreign;
      if (isPerfect) {
        setPerfectFlash(true);
        scheduleTimeout(() => setPerfectFlash(false), 600);
        playSfx('star_pop', Math.min(3, comboRef.current));
        playSfx('correct_chime', comboRef.current);
        setToast(
          <>
            PERFECT DRIZZLE! “<bdi dir={langDir}>{hitForeign}</bdi>” +{pts} pts!
          </>
        );
      } else {
        playSfx('bubble_pop', comboRef.current);
        setToast(
          <>
            Nice stack! “<bdi dir={langDir}>{hitForeign}</bdi>” +{pts} pts
          </>
        );
      }

      void speakPhrase({
        text: closest.item.foreign,
        language,
        phonetic: closest.item.phonetic,
      });

      const signedOffset = Math.max(-14, Math.min(14, closest.x - 50));
      setStackedScoops((prev) => [
        ...prev,
        {
          uid: closest.uid,
          item: closest.item,
          offsetX: isPerfect ? 0 : signedOffset,
          color: closest.color,
          perfect: isPerfect,
        },
      ]);

      scheduleTimeout(() => setChefPose('idle'), 650);
      spawnRoundScoops(closest.item.id);
    } else {
      comboRef.current = 0;
      setCombo(0);
      setChefPose('sympathetic');
      playSfx('gentle_nudge');
      const expectedForeign = targetRef.current.foreign;
      setToast(
        closest.item.id !== targetRef.current.id ? (
          <>
            Oops! Wait for “<bdi dir={langDir}>{expectedForeign}</bdi>” over the cone!
          </>
        ) : (
          <>
            Almost! Drop when “<bdi dir={langDir}>{expectedForeign}</bdi>” enters the glow zone!
          </>
        )
      );
      scheduleTimeout(() => setChefPose('idle'), 550);
    }
  }, [phase, language, langDir, spawnRoundScoops, scheduleTimeout]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        handleDropScoop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, handleDropScoop]);

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

      const speed = (1.65 + Math.min(0.9, stackCountRef.current * 0.08)) * paceMultiplier;
      phaseAngleRef.current += speed * dt;

      const updated = scoopsRef.current.map((s, idx) => ({
        ...s,
        x: 50 + Math.sin(phaseAngleRef.current + idx * Math.PI) * 29,
      }));
      scoopsRef.current = updated;
      setGlidingScoops(updated);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, paceMultiplier, finishRound]);

  const targetOverZone = glidingScoops.some(
    (s) => s.item.id === targetItem.id && Math.abs(s.x - 50) <= 18
  );
  const visibleStack = stackedScoops.slice(isCompact ? -3 : -5);
  const bestScore = bestScoreFor('tower_stack');

  return (
    <section
      ref={containerRef}
      aria-label="Gelato and Pastry Tower Arcade"
      style={ARCADE_SHELL_STYLE}
    >
      <ArcadeHeaderBar
        icon={<Sparkles size={isCompact ? 17 : 20} color="#ec4899" />}
        title="Gelato & Pastry Tower"
        subtitle={`${chefName}'s patisserie timing stacker!`}
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
          companionId={chefCompanion}
          badgeText="Patisserie Open!"
          title="Stack a Sky-High Word Gelato Tower!"
          description={`${chefName} announces each delicious word order. Tap Drop Scoop! (or Space) right when the matching treat glides into the golden drop zone above the cone!`}
          startLabel="Start Stacking!"
          bestScore={bestScore}
          arcadeTier={arcadeTier}
          isCompact={isCompact}
          emblem={<TowerStackEmblem size={isCompact ? 54 : 68} />}
          buttonClass="tactile-btn-rose"
          onStart={startRound}
        />
      ) : null}

      {phase === 'playing' ? (
        <>
          <TargetPromptBar
            label="ORDER:"
            targetItem={targetItem}
            language={language}
            isCompact={isCompact}
            rightContent={
              <>
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: '#fdf2f8',
                    color: '#be185d',
                    fontSize: isCompact ? '0.72rem' : '0.8rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-display)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Scoops: {stackedScoops.length} • Perfects: {perfectCount}
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

          {/* Patisserie Stacking Stage */}
          <div
            onClick={handleDropScoop}
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
              borderColor: perfectFlash ? '#f59e0b' : '#f472b6',
              background: 'linear-gradient(180deg, #fff1f2 0%, #fef3c7 58%, #fde68a 100%)',
              overflow: 'hidden',
              userSelect: 'none',
              cursor: 'pointer',
            }}
          >
            {/* Striped Patisserie Awning Top */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 14,
                background:
                  'repeating-linear-gradient(90deg, #fb7185 0px, #fb7185 24px, #ffffff 24px, #ffffff 48px)',
                opacity: 0.78,
              }}
            />

            {/* Status Toast */}
            <div
              style={{
                position: 'absolute',
                top: 18,
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: 'calc(100% - 16px)',
                padding: '3px 12px',
                borderRadius: 999,
                background: perfectFlash ? '#b45309' : 'rgba(30, 27, 75, 0.82)',
                color: perfectFlash ? '#fef08a' : '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                zIndex: 8,
                pointerEvents: 'none',
              }}
            >
              {toast}
            </div>

            {/* Brass Rail & Target Drop Crosshair */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '28%',
                left: '8%',
                right: '8%',
                height: 6,
                borderRadius: 999,
                background: '#d97706',
                opacity: 0.45,
                pointerEvents: 'none',
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '14%',
                bottom: '12%',
                left: '50%',
                width: isCompact ? 96 : 122,
                transform: 'translateX(-50%)',
                borderRadius: 20,
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: targetOverZone ? '#10b981' : 'rgba(217, 119, 6, 0.35)',
                background: targetOverZone ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
                pointerEvents: 'none',
                transition: 'border-color 120ms ease, background-color 120ms ease',
              }}
            />

            {/* Gliding Scoops along Top Rail */}
            {glidingScoops.map((s) => {
              const isInZone = Math.abs(s.x - 50) <= 18;
              return (
                <div
                  key={s.uid}
                  dir={langDir}
                  style={{
                    position: 'absolute',
                    left: `${s.x}%`,
                    top: '28%',
                    transform: 'translate(-50%, -50%)',
                    willChange: 'left',
                    padding: isCompact ? '5px 8px' : '7px 12px',
                    borderRadius: 24,
                    background: '#ffffff',
                    borderTopWidth: 2.5,
                    borderRightWidth: 2.5,
                    borderLeftWidth: 2.5,
                    borderBottomWidth: 4.5,
                    borderStyle: 'solid',
                    borderColor: isInZone ? '#f59e0b' : s.color,
                    boxShadow: isInZone
                      ? '0 0 18px rgba(245, 158, 11, 0.55)'
                      : '0 6px 14px rgba(15, 23, 42, 0.16)',
                    display: 'flex',
                    flexDirection:
                      isCompact && s.item.foreign.length > 16 ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isCompact && s.item.foreign.length > 16 ? 2 : 5,
                    maxWidth: isCompact ? '42%' : '250px',
                    minWidth: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    zIndex: 6,
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                    <VocabIllustration
                      illustrationKey={s.item.illustrationKey}
                      language={language}
                      size={isCompact ? (s.item.foreign.length > 16 ? 18 : 20) : 26}
                    />
                  </span>
                  <span
                    dir={langDir}
                    style={{
                      ...getArcadeForeignTextStyle(language, s.item.foreign, {
                        isCompact,
                        density: s.item.foreign.length > 20 ? 'tight' : 'normal',
                        color: '#1e1b4b',
                      }),
                      flex: '0 1 auto',
                      width: isCompact && s.item.foreign.length > 16 ? '100%' : undefined,
                    }}
                  >
                    {s.item.foreign}
                  </span>
                </div>
              );
            })}

            {/* Growing Cone Stack */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 8,
                transform: 'translateX(-50%)',
                width: '100%',
                display: 'flex',
                flexDirection: 'column-reverse',
                alignItems: 'center',
                pointerEvents: 'none',
                zIndex: 4,
              }}
            >
              {/* Waffle Cone Base */}
              <svg width={isCompact ? 62 : 76} height={isCompact ? 48 : 58} viewBox="0 0 80 62" aria-hidden="true">
                <polygon
                  points="14,6 66,6 40,58"
                  fill="#f59e0b"
                  stroke="#92400E"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                <path d="M24 14L46 42M56 14L34 42" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
              </svg>

              {/* Stacked Treat Scoops */}
              {visibleStack.map((scoop) => (
                <div
                  key={scoop.uid}
                  dir={langDir}
                  style={{
                    transform: `translateX(${scoop.offsetX}px)`,
                    marginBottom: -4,
                    padding: isCompact ? '3px 10px' : '4px 12px',
                    borderRadius: 24,
                    background: scoop.color,
                    borderTopWidth: 2,
                    borderRightWidth: 2,
                    borderLeftWidth: 2,
                    borderBottomWidth: 3,
                    borderStyle: 'solid',
                    borderColor: scoop.perfect ? '#fde047' : '#ffffff',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    maxWidth: isCompact ? '78%' : '300px',
                    minWidth: 0,
                    overflow: 'hidden',
                    boxShadow: scoop.perfect ? '0 0 12px rgba(251, 191, 36, 0.7)' : '0 3px 8px rgba(0,0,0,0.14)',
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                    <VocabIllustration
                      illustrationKey={scoop.item.illustrationKey}
                      language={language}
                      size={isCompact ? 18 : 22}
                    />
                  </span>
                  <span
                    dir={langDir}
                    style={{
                      ...getArcadeForeignTextStyle(language, scoop.item.foreign, {
                        isCompact,
                        density: 'tight',
                        color: '#ffffff',
                      }),
                      flex: '0 1 auto',
                      textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                    }}
                  >
                    {scoop.item.foreign}
                  </span>
                </div>
              ))}
            </div>

            {/* Cheering Chef Companion */}
            <div
              style={{
                position: 'absolute',
                left: 8,
                bottom: 4,
                pointerEvents: 'none',
                zIndex: 5,
              }}
            >
              <MascotStage
                companionId={chefCompanion}
                pose={chefPose}
                size={isCompact ? 62 : 82}
              />
            </div>
          </div>

          {/* Drop Scoop Primary Control */}
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              className="tactile-btn tactile-btn-hero tactile-btn-rose"
              style={{ width: '100%', maxWidth: 420 }}
              onClick={handleDropScoop}
            >
              <ArrowDown size={19} />
              <span>Drop Scoop!</span>
            </button>
          </div>
        </>
      ) : null}

      {phase === 'summary' && summary ? (
        <ArcadeSummaryCard
          companionId={chefCompanion}
          badgeText="Master Gelato Chef!"
          title="Gelato & Pastry Tower Complete!"
          score={summary.score}
          bestScore={bestScore}
          heartsWon={summary.heartsWon}
          bonusGems={summary.bonusGems}
          xpEarned={summary.xpEarned}
          arcadeTier={arcadeTier}
          statLine={`Scoops stacked: ${summary.scoops} • Golden Perfects: ${summary.perfects}`}
          isCompact={isCompact}
          onPlayAgain={startRound}
          onExit={onExit}
        />
      ) : null}
    </section>
  );
}
