import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Coffee, Sparkles, Volume2 } from 'lucide-react';
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
import { StarlightHintButton } from '../lesson/StarlightHintButton';
import { useHintEngine } from '../lesson/useHintEngine';
import { CafeOrderRushEmblem } from './ArcadeEmblems';
import {
  ARCADE_SHELL_STYLE,
  ArcadeHeaderBar,
  ArcadePlainEnglishCallout,
  ArcadeReadyCard,
  ArcadeSayItNormallyButton,
  ArcadeSummaryCard,
  SOFT_BTN_STYLE,
  computeScaledArcadeRewards,
  getArcadeClueTextStyle,
  getArcadeForeignTextStyle,
  isAdultArcadeActive,
  pickDistinctItems,
  resolveArcadePlainEnglish,
  useArcadeContainerMetrics,
  useArcadeCoopReport,
  useArcadeCoopTurn,
  useArcadeDeck,
  useArcadeEffectiveProfile,
} from './arcadeShared';

const ROUND_DURATION_SECONDS = 45;
const CAFE_GUESTS: readonly CompanionId[] = ['colette', 'mateo', 'benni', 'luca', 'pip'];

const PLATTER_ACCENTS = [
  { border: '#f97316', badgeBg: '#ffedd5', badgeInk: '#9a3412' },
  { border: '#10b981', badgeBg: '#d1fae5', badgeInk: '#065f46' },
  { border: '#ec4899', badgeBg: '#fce7f3', badgeInk: '#9d174d' },
  { border: '#6366f1', badgeBg: '#e0e7ff', badgeInk: '#312e81' },
] as const;

type OrderDirection = 'foreign_to_english' | 'english_to_foreign';

interface CafeOrderRound {
  uid: number;
  guest: CompanionId;
  direction: OrderDirection;
  target: ArcadeLanternItem;
  platters: [ArcadeLanternItem, ArcadeLanternItem, ArcadeLanternItem, ArcadeLanternItem];
}

export interface CafeOrderRushArcadeProps {
  arcadeTier?: ArcadeProficiencyTier;
  onExit: () => void;
}

export function CafeOrderRushArcade({
  arcadeTier = 'sprout',
  onExit,
}: CafeOrderRushArcadeProps) {
  const activeProfile = useArcadeEffectiveProfile();
  const coopTurn = useArcadeCoopTurn();
  const settleArcadeRun = useArcadeCoopReport();
  const { language, lexicon, targetLexicon, bestScoreFor, paceMultiplier } =
    useArcadeDeck(arcadeTier);
  const { containerRef, isCompact } = useArcadeContainerMetrics();
  const langMeta = LANGUAGE_META[language];
  const langDir = langMeta.dir;
  const showPlainButton = !coopTurn?.kidQuarantined && isAdultArcadeActive(language, activeProfile);

  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>('ready');
  const [plainOpen, setPlainOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [served, setServed] = useState(0);
  const [tips, setTips] = useState(0);
  const [patience, setPatience] = useState(1);
  const [guestEnter, setGuestEnter] = useState(1);
  const [guestPose, setGuestPose] = useState<CharacterPose>('happy');
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [cafeHintNonce, setCafeHintNonce] = useState(0);
  const [round, setRound] = useState<CafeOrderRound>(() => ({
    uid: 1,
    guest: 'colette',
    direction: 'foreign_to_english',
    target: targetLexicon[0],
    platters: [
      targetLexicon[0],
      lexicon[1] ?? targetLexicon[0],
      lexicon[2] ?? targetLexicon[0],
      lexicon[3] ?? targetLexicon[0],
    ],
  }));
  const hint = useHintEngine({
    promptKey: `cafe::${round.uid}`,
    mode: 'multiple_choice',
    canHint: phase === 'playing',
    choiceConfig: {
      choices: round.platters.map((p) => p.id),
      expected: round.target.id,
      accepted: [round.target.id],
      language,
      seed: String(round.uid),
    },
    onHintTriggered: () => {
      setCafeHintNonce((n) => n + 1);
    },
  });
  const { cancelHint } = hint;
  useEffect(() => {
    if (phase !== 'playing') {
      cancelHint({ clearAssists: true });
    }
  }, [phase, cancelHint]);
  const plainResult = useMemo(
    () =>
      plainOpen && showPlainButton
        ? resolveArcadePlainEnglish(round.target, {
            avoidTerms: [
              round.direction === 'foreign_to_english' ? round.target.english : round.target.foreign,
            ],
          })
        : null,
    [plainOpen, showPlainButton, round]
  );
  useEffect(() => {
    setPlainOpen(false);
  }, [round.uid, phase]);
  const [toast, setToast] = useState<ReactNode>('Serve the matching treat platter before the ring runs out!');
  const [summary, setSummary] = useState<{
    score: number;
    heartsWon: number;
    bonusGems: number;
    xpEarned: number;
    served: number;
    tips: number;
  } | null>(null);

  const roundRef = useRef<CafeOrderRound>(round);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const servedRef = useRef(0);
  const tipsRef = useRef(0);
  const patienceRef = useRef(1);
  const guestEnterRef = useRef(1);
  const guestSeqRef = useRef(0);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (phase === 'ready' && targetLexicon.length > 0) {
      const next: CafeOrderRound = {
        uid: 1,
        guest: 'colette',
        direction: 'foreign_to_english',
        target: targetLexicon[0],
        platters: [
          targetLexicon[0],
          lexicon[1] ?? targetLexicon[0],
          lexicon[2] ?? targetLexicon[0],
          lexicon[3] ?? targetLexicon[0],
        ],
      };
      roundRef.current = next;
      setRound(next);
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

  const dealNextGuest = useCallback(
    (avoidId?: string) => {
      const pool = targetLexicon.filter((i) => i.id !== avoidId);
      const list = pool.length > 0 ? pool : targetLexicon;
      const target = list[Math.floor(Math.random() * list.length)];
      const distractors = pickDistinctItems(lexicon, 3, new Set([target.id]));
      const platters = [
        target,
        distractors[0] ?? target,
        distractors[1] ?? target,
        distractors[2] ?? target,
      ];
      for (let i = platters.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [platters[i], platters[j]] = [platters[j], platters[i]];
      }
      const seq = guestSeqRef.current++;
      const guest = CAFE_GUESTS[seq % CAFE_GUESTS.length];
      const direction: OrderDirection =
        seq % 2 === 0 ? 'foreign_to_english' : 'english_to_foreign';

      const nextRound: CafeOrderRound = {
        uid: seq + 1,
        guest,
        direction,
        target,
        platters: [platters[0], platters[1], platters[2], platters[3]],
      };
      roundRef.current = nextRound;
      patienceRef.current = 1;
      guestEnterRef.current = 0;
      setPatience(1);
      setGuestEnter(0);
      setGuestPose('listening');
      setRound(nextRound);
    },
    [targetLexicon, lexicon]
  );

  const finishRound = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const totalServed = servedRef.current;
    const totalTips = tipsRef.current;
    const finalScore = scoreRef.current;
    const heartsWon = Math.min(5, Math.max(1, Math.ceil(totalServed / 3)));
    const baseGems = Math.floor(finalScore / 32) + totalTips * 2;
    const { bonusGems, xpEarned } = computeScaledArcadeRewards({
      arcadeTier,
      baseGems,
      performanceUnits: totalServed,
      baseXpBonus: totalTips,
    });

    settleArcadeRun({
      gameId: 'cafe_order_rush',
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
      served: totalServed,
      tips: totalTips,
    });
    setPhase('summary');
  }, [arcadeTier, settleArcadeRun]);

  const startRound = useCallback(() => {
    playSfx('button_click');
    finishedRef.current = false;
    scoreRef.current = 0;
    comboRef.current = 0;
    servedRef.current = 0;
    tipsRef.current = 0;
    guestSeqRef.current = 0;
    elapsedRef.current = 0;
    patienceRef.current = 1;
    guestEnterRef.current = 0;

    setScore(0);
    setCombo(0);
    setServed(0);
    setTips(0);
    setPatience(1);
    setGuestEnter(0);
    setFlashIdx(null);
    setTimeLeft(ROUND_DURATION_SECONDS);
    setToast('Tap the matching platter before the patience ring drains!');
    setSummary(null);
    dealNextGuest();
    setPhase('playing');
  }, [dealNextGuest]);

  const handleServePlatter = useCallback(
    (idx: 0 | 1 | 2 | 3) => {
      if (phase !== 'playing') return;
      const chosen = roundRef.current.platters[idx];
      cancelHint({ clearAssists: chosen.id === roundRef.current.target.id });
      setFlashIdx(idx);
      scheduleTimeout(() => setFlashIdx(null), 170);

      if (chosen.id === roundRef.current.target.id) {
        const fastTip = patienceRef.current >= 0.55;
        comboRef.current += 1;
        servedRef.current += 1;
        if (fastTip) tipsRef.current += 1;

        const pts = (fastTip ? 38 : 24) + (comboRef.current - 1) * 6;
        scoreRef.current += pts;
        setCombo(comboRef.current);
        setServed(servedRef.current);
        setTips(tipsRef.current);
        setScore(scoreRef.current);
        setGuestPose(fastTip ? 'victory_dance' : 'happy');

        if (fastTip) {
          playSfx('star_pop', Math.min(3, comboRef.current - 1));
        } else {
          playSfx('bubble_pop', Math.min(3, comboRef.current - 1));
        }
        void speakPhrase({
          text: chosen.foreign,
          language,
          phonetic: chosen.phonetic,
        });

        const servedForeign = chosen.foreign;
        setToast(
          fastTip ? (
            <>
              SPEED TIP! Served “<bdi dir={langDir}>{servedForeign}</bdi>” +{pts} pts!
            </>
          ) : (
            <>
              Order served! “<bdi dir={langDir}>{servedForeign}</bdi>” +{pts} pts!
            </>
          )
        );
        dealNextGuest(chosen.id);
      } else {
        comboRef.current = 0;
        setCombo(0);
        setGuestPose('sympathetic');
        patienceRef.current = Math.max(0.08, patienceRef.current - 0.18);
        setPatience(patienceRef.current);
        playSfx('gentle_nudge');
        const targetHint =
          roundRef.current.direction === 'foreign_to_english'
            ? roundRef.current.target.english
            : roundRef.current.target.foreign;
        setToast(
          <>
            Oops, wrong platter! Check “<bdi dir={roundRef.current.direction === 'foreign_to_english' ? 'ltr' : langDir}>{targetHint}</bdi>”!
          </>
        );
        scheduleTimeout(() => setGuestPose('listening'), 450);
      }
    },
    [phase, language, langDir, dealNextGuest, scheduleTimeout]
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1' || e.key === 'q' || e.key === 'Q') handleServePlatter(0);
      else if (e.key === '2' || e.key === 'w' || e.key === 'W') handleServePlatter(1);
      else if (e.key === '3' || e.key === 'a' || e.key === 'A') handleServePlatter(2);
      else if (e.key === '4' || e.key === 's' || e.key === 'S') handleServePlatter(3);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, handleServePlatter]);

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

      if (guestEnterRef.current < 1) {
        const nextEnter = Math.min(1, guestEnterRef.current + dt * 4.5 * paceMultiplier);
        guestEnterRef.current = nextEnter;
        setGuestEnter(nextEnter);
      }

      const orderWindowSec = Math.max(4.8, 9.2 - Math.min(2.6, servedRef.current * 0.22)) / paceMultiplier;
      const nextPatience = patienceRef.current - dt / orderWindowSec;
      if (nextPatience <= 0) {
        comboRef.current = 0;
        setCombo(0);
        playSfx('gentle_nudge');
        setToast('Patience ring emptied! Next café guest stepping up!');
        dealNextGuest(roundRef.current.target.id);
      } else {
        patienceRef.current = nextPatience;
        setPatience(nextPatience);
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, paceMultiplier, finishRound, dealNextGuest]);

  const bestScore = bestScoreFor('cafe_order_rush');
  const ringRadius = isCompact ? 26 : 34;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringStrokeOffset = ringCirc * (1 - Math.max(0, Math.min(1, patience)));
  const ringColor =
    patience > 0.55 ? '#10b981' : patience > 0.25 ? '#f59e0b' : '#f43f5e';
  const target = round.target;
  const nextGuestId = CAFE_GUESTS[(round.uid) % CAFE_GUESTS.length];

  return (
    <section
      ref={containerRef}
      aria-label="Polyglot Café Order Rush Arcade"
      style={ARCADE_SHELL_STYLE}
    >
      <ArcadeHeaderBar
        icon={<Coffee size={isCompact ? 17 : 20} color="#ea580c" />}
        title="Polyglot Café Order Rush"
        subtitle="Serve warm cocoa, pastries & phrases before patience rings empty!"
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
          companionId="colette"
          badgeText="Café Counter Open!"
          title="Serve Bilingual Treats at the Polyglot Café!"
          description="Companions step up to the counter requesting cozy café treats and phrases. Match the right English or foreign platter before their patience ring empties to earn Speed Tips!"
          startLabel="Start Café Rush!"
          bestScore={bestScore}
          arcadeTier={arcadeTier}
          isCompact={isCompact}
          emblem={<CafeOrderRushEmblem size={isCompact ? 54 : 68} />}
          buttonClass="tactile-btn-amber"
          onStart={startRound}
        />
      ) : null}

      {phase === 'playing' ? (
        <>
          {/* Status + Toast Bar */}
          <div
            data-language={language}
            data-dir={langDir}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: isCompact ? '5px 10px' : '7px 14px',
              borderRadius: 16,
              background: 'var(--card-bg, #ffffff)',
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderLeftWidth: 2,
              borderBottomWidth: 4,
              borderStyle: 'solid',
              borderColor: '#fb923c',
              color: 'var(--text-main, #1e1b4b)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: '#ffedd5',
                  color: '#9a3412',
                  fontSize: isCompact ? '0.7rem' : '0.78rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-display)',
                  flexShrink: 0,
                }}
              >
                Served: {served} • Tips: {tips}
              </span>
              <span
                style={{
                  fontSize: isCompact ? '0.72rem' : '0.82rem',
                  fontWeight: 800,
                  color: 'var(--text-muted, #475569)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {toast}
              </span>
            </div>

            <button
              type="button"
              className="tactile-btn tactile-btn-success"
              style={{
                padding: isCompact ? '4px 9px' : '5px 11px',
                fontSize: '0.76rem',
                borderRadius: 10,
                flexShrink: 0,
              }}
              onClick={finishRound}
            >
              Finish
            </button>
          </div>

          {/* Café Counter & Platter Stage */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              width: '100%',
              padding: isCompact ? 8 : 14,
              borderRadius: 22,
              borderTopWidth: 3,
              borderRightWidth: 3,
              borderLeftWidth: 3,
              borderBottomWidth: 5,
              borderStyle: 'solid',
              borderColor: '#f97316',
              background: 'linear-gradient(180deg, #fff7ed 0%, #ffedd5 55%, #fde68a 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: isCompact ? 8 : 12,
              overflow: 'hidden',
              userSelect: 'none',
            }}
          >
            {/* Striped Bistro Awning */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: isCompact ? 10 : 14,
                background:
                  'repeating-linear-gradient(90deg, #ea580c 0px, #ea580c 22px, #ffffff 22px, #ffffff 44px)',
                opacity: 0.85,
                pointerEvents: 'none',
              }}
            />

            {/* Customer Order Counter Card */}
            <div
              style={{
                marginTop: isCompact ? 8 : 12,
                flexShrink: 0,
                padding: isCompact ? '8px 10px' : '12px 16px',
                borderRadius: 18,
                background: 'rgba(255, 255, 255, 0.94)',
                borderTopWidth: 2,
                borderRightWidth: 2,
                borderLeftWidth: 2,
                borderBottomWidth: 4,
                borderStyle: 'solid',
                borderColor: '#fdba74',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: isCompact ? 8 : 14,
                boxShadow: '0 8px 18px rgba(154, 52, 18, 0.12)',
              }}
            >
              {/* Active Companion with Live 60fps Patience Ring */}
              <div
                style={{
                  position: 'relative',
                  width: isCompact ? 62 : 82,
                  height: isCompact ? 62 : 82,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `translateX(${((1 - guestEnter) * -18).toFixed(1)}px)`,
                  opacity: 0.4 + guestEnter * 0.6,
                  willChange: 'transform, opacity',
                }}
              >
                <svg
                  width={isCompact ? 62 : 82}
                  height={isCompact ? 62 : 82}
                  viewBox={isCompact ? '0 0 62 62' : '0 0 82 82'}
                  aria-label="Customer patience ring"
                  style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
                >
                  <circle
                    cx={isCompact ? 31 : 41}
                    cy={isCompact ? 31 : 41}
                    r={ringRadius}
                    fill="#fffbeb"
                    stroke="#fed7aa"
                    strokeWidth={isCompact ? 4 : 5}
                  />
                  <circle
                    cx={isCompact ? 31 : 41}
                    cy={isCompact ? 31 : 41}
                    r={ringRadius}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={isCompact ? 4.5 : 5.5}
                    strokeDasharray={ringCirc}
                    strokeDashoffset={ringStrokeOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <MascotStage
                  companionId={round.guest}
                  pose={guestPose}
                  size={isCompact ? 48 : 64}
                  hintPulseNonce={cafeHintNonce}
                />
              </div>

              {/* Order Speech Bubble */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '1px 7px',
                      borderRadius: 999,
                      background: round.direction === 'foreign_to_english' ? '#eef2ff' : '#ecfdf5',
                      color: round.direction === 'foreign_to_english' ? '#3730a3' : '#065f46',
                      fontSize: isCompact ? 'clamp(0.56rem, 1.8vw, 0.64rem)' : '0.66rem',
                      fontWeight: 900,
                      lineHeight: 1.2,
                      textTransform: 'uppercase',
                      maxWidth: '100%',
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {language === 'en'
                      ? round.direction === 'foreign_to_english'
                        ? 'Order: Match Meaning Clue'
                        : 'Order: Match English Phrase'
                      : langMeta.isAdultOnly && langMeta.translationLanguageLabel
                        ? round.direction === 'foreign_to_english'
                          ? `Order: Match ${langMeta.translationLanguageLabel}`
                          : `Order: Match ${langMeta.name}`
                        : round.direction === 'foreign_to_english'
                          ? 'Order: Match English'
                          : `Order: Match ${langMeta.nativeName}`}
                  </span>
                  {patience >= 0.55 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '1px 7px',
                        borderRadius: 999,
                        background: '#fef3c7',
                        color: '#b45309',
                        fontSize: '0.66rem',
                        fontWeight: 900,
                      }}
                    >
                      <Sparkles size={10} /> Tip Window
                    </span>
                  ) : null}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? 5 : 8, flexWrap: 'wrap', minWidth: 0 }}>
                  {round.direction === 'foreign_to_english' ? (
                    <strong
                      dir={langDir}
                      style={getArcadeForeignTextStyle(language, target.foreign, {
                        isCompact,
                        density: isCompact
                          ? target.foreign.length > 26
                            ? 'tight'
                            : target.foreign.length > 16
                              ? 'normal'
                              : 'large'
                          : target.foreign.length > 34
                            ? 'normal'
                            : 'large',
                        color: '#1e1b4b',
                        textAlign: 'start',
                      })}
                    >
                      {target.foreign}
                    </strong>
                  ) : (
                    <strong
                      dir="ltr"
                      style={getArcadeClueTextStyle(target.english, {
                        isCompact,
                        variant: 'prompt',
                        color: '#1e1b4b',
                        textAlign: 'start',
                      })}
                    >
                      {target.english}
                    </strong>
                  )}

                  {target.romanized ? (
                    <span
                      dir="ltr"
                      style={{
                        padding: '1px 7px',
                        borderRadius: 999,
                        background: '#eef2ff',
                        border: '1px solid #c7d2fe',
                        color: '#3730a3',
                        fontSize: isCompact ? 'clamp(0.58rem, 1.7vw, 0.66rem)' : '0.74rem',
                        fontWeight: 800,
                        lineHeight: 1.25,
                        maxWidth: '100%',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {target.romanized}
                    </span>
                  ) : null}

                  <span
                    dir="ltr"
                    style={{
                      padding: '1px 7px',
                      borderRadius: 999,
                      background: '#fef3c7',
                      color: '#78350f',
                      fontSize: isCompact
                        ? target.phonetic.length > 26
                          ? 'clamp(0.55rem, 1.6vw, 0.62rem)'
                          : 'clamp(0.6rem, 1.75vw, 0.66rem)'
                        : '0.72rem',
                      fontWeight: 800,
                      lineHeight: 1.22,
                      maxWidth: '100%',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {target.phonetic}
                  </span>

                  <button
                    type="button"
                    className="tactile-btn"
                    aria-label={`Hear ${target.foreign}`}
                    style={{
                      ...SOFT_BTN_STYLE,
                      padding: isCompact ? '3px 7px' : '4px 9px',
                      fontSize: isCompact ? '0.68rem' : '0.74rem',
                      borderRadius: 10,
                    }}
                    onClick={() => {
                      void speakPhrase({
                        text: target.foreign,
                        language,
                        phonetic: target.phonetic,
                      });
                    }}
                  >
                    <Volume2 size={13} />
                    <span>Hear</span>
                  </button>
                  {showPlainButton ? (
                    <ArcadeSayItNormallyButton
                      item={target}
                      language={language}
                      isCompact={isCompact}
                      open={plainOpen}
                      avoidTerms={[
                        round.direction === 'foreign_to_english' ? target.english : target.foreign,
                      ]}
                      onToggle={(nextOpen) => setPlainOpen(nextOpen)}
                    />
                  ) : null}
                  <StarlightHintButton
                    size="xs"
                    hintTier={hint.hintTier}
                    hintsUsed={hint.hintsUsed}
                    isAnimating={hint.isAnimating}
                    canHint={hint.canHint}
                    onTrigger={hint.triggerHint}
                  />
                </div>

                {plainResult ? (
                  <ArcadePlainEnglishCallout
                    result={plainResult}
                    isCompact={isCompact}
                    onClose={() => setPlainOpen(false)}
                  />
                ) : null}

                {/* Patience Bar */}
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: '#fed7aa',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(patience * 100)}%`,
                      height: '100%',
                      background: ringColor,
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>

              {/* Next Guest Peeking in Queue (Desktop/Tablet) */}
              {!isCompact ? (
                <div
                  aria-hidden="true"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    opacity: 0.65,
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#9a3412' }}>NEXT</span>
                  <MascotStage companionId={nextGuestId} pose="idle" size={40} />
                </div>
              ) : null}
            </div>

            {/* 4 Serving Platters (2x2 Grid) */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                gap: isCompact ? 8 : 12,
              }}
            >
              {round.platters.map((item, idx) => {
                const platterIdx = idx as 0 | 1 | 2 | 3;
                const accent = PLATTER_ACCENTS[platterIdx];
                const isFlashed = flashIdx === platterIdx;
                const isDimmed = hint.dimmedUids.has(item.id);
                const isSpotlight = hint.spotlightZone === 'choice' && hint.spotlightUid === item.id;
                const showForeignOnPlatter = round.direction === 'english_to_foreign';

                return (
                  <button
                    key={`${round.uid}-${item.id}-${platterIdx}`}
                    type="button"
                    dir="ltr"
                    data-hint-dimmed={isDimmed ? 'true' : undefined}
                    data-hint-spotlight={isSpotlight ? 'true' : undefined}
                    className={`tactile-btn starlight-choice-tile ${
                      isDimmed ? 'is-starlight-dimmed' : ''
                    } ${isSpotlight ? 'is-starlight-spotlight' : ''}`}
                    onClick={() => handleServePlatter(platterIdx)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      minWidth: 0,
                      minHeight: 0,
                      padding: isCompact ? '15px 6px 5px' : '12px 14px',
                      borderRadius: 20,
                      background: '#ffffff',
                      borderTopWidth: 2.5,
                      borderRightWidth: 2.5,
                      borderLeftWidth: 2.5,
                      borderBottomWidth: 5,
                      borderStyle: 'solid',
                      borderColor: isSpotlight ? '#a78bfa' : accent.border,
                      color: '#1e1b4b',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isCompact ? 2 : 6,
                      cursor: 'pointer',
                      opacity: isDimmed ? 0.38 : 1,
                      transform: isFlashed ? 'scale(0.95)' : 'scale(1)',
                      transition: 'transform 90ms ease, opacity 220ms ease',
                      boxShadow: isSpotlight
                        ? '0 0 0 2px var(--starlight-glow-a), 0 0 18px 2px var(--starlight-glow-b), 0 8px 18px rgba(154, 52, 18, 0.12)'
                        : '0 8px 18px rgba(154, 52, 18, 0.12)',
                      overflow: 'visible',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: isCompact ? 4 : 6,
                        left: isCompact ? 6 : 8,
                        padding: '1px 7px',
                        borderRadius: 999,
                        background: accent.badgeBg,
                        color: accent.badgeInk,
                        fontSize: isCompact ? '0.6rem' : '0.66rem',
                        fontWeight: 900,
                      }}
                    >
                      Platter {platterIdx + 1}
                    </span>

                    <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                      <VocabIllustration
                        illustrationKey={item.illustrationKey}
                        language={language}
                        size={
                          isCompact
                            ? (showForeignOnPlatter ? item.foreign.length : item.english.length) > 24
                              ? 19
                              : 23
                            : 44
                        }
                      />
                    </span>

                    {showForeignOnPlatter ? (
                      <>
                        <span
                          dir={langDir}
                          style={{
                            ...getArcadeForeignTextStyle(language, item.foreign, {
                              isCompact,
                              density: isCompact
                                ? item.foreign.length > 18
                                  ? 'tight'
                                  : 'normal'
                                : item.foreign.length > 28
                                  ? 'normal'
                                  : 'large',
                              color: '#1e1b4b',
                            }),
                            width: '100%',
                          }}
                        >
                          {item.foreign}
                        </span>
                        {item.romanized ? (
                          <span
                            dir="ltr"
                            style={{
                              fontSize: isCompact ? '0.62rem' : '0.72rem',
                              fontWeight: 800,
                              color: '#4f46e5',
                              lineHeight: 1.2,
                              maxWidth: '100%',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {item.romanized}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span
                        dir="ltr"
                        style={{
                          ...getArcadeClueTextStyle(item.english, {
                            isCompact,
                            variant: 'tile',
                            color: '#1e1b4b',
                          }),
                          width: '100%',
                        }}
                      >
                        {item.english}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {phase === 'summary' && summary ? (
        <ArcadeSummaryCard
          companionId="colette"
          badgeText="Master Café Host!"
          title="Polyglot Café Order Rush Complete!"
          score={summary.score}
          bestScore={bestScore}
          heartsWon={summary.heartsWon}
          bonusGems={summary.bonusGems}
          xpEarned={summary.xpEarned}
          arcadeTier={arcadeTier}
          statLine={`Orders served: ${summary.served} • Speed Tips earned: ${summary.tips}`}
          isCompact={isCompact}
          onPlayAgain={startRound}
          onExit={onExit}
        />
      ) : null}
    </section>
  );
}
