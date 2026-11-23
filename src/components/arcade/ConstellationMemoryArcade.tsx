import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Volume2 } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { playSfx, speakPhrase } from '../../audio';
import {
  LANGUAGE_META,
  type ArcadeLanternItem,
  type ArcadeProficiencyTier,
} from '../../types/contracts';
import { ConstellationMemoryEmblem } from './ArcadeEmblems';
import {
  ARCADE_SHELL_STYLE,
  ArcadeHeaderBar,
  ArcadeReadyCard,
  ArcadeSummaryCard,
  computeScaledArcadeRewards,
  getArcadeForeignTextStyle,
  recordArcadeRunResult,
  useArcadeContainerMetrics,
  useArcadeDeck,
} from './arcadeShared';

const ROUND_DURATION_SECONDS = 60;
const PAIRS_PER_WAVE = 6;

interface MemoryCard {
  uid: number;
  pairId: string;
  side: 'picture' | 'phrase';
  item: ArcadeLanternItem;
}

function buildWaveDeck(lexicon: readonly ArcadeLanternItem[], uidSeed: number): MemoryCard[] {
  const pool = [...lexicon];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = pool.slice(0, Math.min(PAIRS_PER_WAVE, pool.length));
  const cards: MemoryCard[] = [];
  let uid = uidSeed;
  for (const item of chosen) {
    cards.push({ uid: uid++, pairId: item.id, side: 'picture', item });
    cards.push({ uid: uid++, pairId: item.id, side: 'phrase', item });
  }
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export interface ConstellationMemoryArcadeProps {
  arcadeTier?: ArcadeProficiencyTier;
  onExit: () => void;
}

export function ConstellationMemoryArcade({
  arcadeTier = 'sprout',
  onExit,
}: ConstellationMemoryArcadeProps) {
  const { language, lexicon, bestScoreFor, paceMultiplier } = useArcadeDeck(arcadeTier);
  const { containerRef, isCompact, isNarrow } = useArcadeContainerMetrics();
  const langDir = LANGUAGE_META[language].dir;
  const roundDuration = Math.round(ROUND_DURATION_SECONDS / Math.pow(paceMultiplier, 0.5));

  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>('ready');
  const [timeLeft, setTimeLeft] = useState(roundDuration);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [wave, setWave] = useState(1);
  const [pairsMatched, setPairsMatched] = useState(0);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [constellationLinks, setConstellationLinks] = useState<
    Array<{ id: string; aIdx: number; bIdx: number }>
  >([]);
  const [toast, setToast] = useState<ReactNode>('Match each picture star with its word twin!');
  const [summary, setSummary] = useState<{
    score: number;
    heartsWon: number;
    bonusGems: number;
    xpEarned: number;
    pairsMatched: number;
    wavesCleared: number;
  } | null>(null);

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const pairsRef = useRef(0);
  const wavesClearedRef = useRef(0);
  const bonusSecondsRef = useRef(0);
  const elapsedRef = useRef(0);
  const lockBoardRef = useRef(false);
  const uidCounterRef = useRef(1);
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

  const dealFreshWave = useCallback(() => {
    const deck = buildWaveDeck(lexicon, uidCounterRef.current);
    uidCounterRef.current += deck.length + 2;
    setCards(deck);
    setFlippedIndices([]);
    setMatchedPairIds([]);
    setConstellationLinks([]);
    lockBoardRef.current = false;
  }, [lexicon]);

  const finishRound = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const finalScore = scoreRef.current;
    const totalPairs = pairsRef.current;
    const wavesCleared = wavesClearedRef.current;
    const heartsWon = Math.min(5, Math.max(1, Math.ceil(totalPairs / 3)));
    const baseGems = Math.floor(finalScore / 35) + wavesCleared * 5;
    const { bonusGems, xpEarned } = computeScaledArcadeRewards({
      arcadeTier,
      baseGems,
      performanceUnits: totalPairs,
      baseXpBonus: wavesCleared * 3,
    });
    recordArcadeRunResult({
      gameId: 'constellation_memory',
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
      pairsMatched: totalPairs,
      wavesCleared,
    });
    setPhase('summary');
  }, [arcadeTier]);

  const startRound = useCallback(() => {
    playSfx('button_click');
    finishedRef.current = false;
    scoreRef.current = 0;
    comboRef.current = 0;
    pairsRef.current = 0;
    wavesClearedRef.current = 0;
    bonusSecondsRef.current = 0;
    elapsedRef.current = 0;
    setScore(0);
    setCombo(0);
    setWave(1);
    setPairsMatched(0);
    setTimeLeft(roundDuration);
    setToast('Tap any two star cards to connect a Constellation Twin!');
    setSummary(null);
    dealFreshWave();
    setPhase('playing');
  }, [dealFreshWave, roundDuration]);

  useEffect(() => {
    if (phase !== 'playing') return;

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      elapsedRef.current += dt;
      const totalAllowed = roundDuration + bonusSecondsRef.current;
      const rem = Math.max(0, Math.ceil(totalAllowed - elapsedRef.current));
      setTimeLeft((prev) => (prev !== rem ? rem : prev));

      if (elapsedRef.current >= totalAllowed) {
        finishRound();
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, roundDuration, finishRound]);

  const handleFlipCard = (index: number) => {
    if (phase !== 'playing' || lockBoardRef.current) return;
    const card = cards[index];
    if (!card) return;
    if (flippedIndices.includes(index) || matchedPairIds.includes(card.pairId)) return;

    playSfx('flip_card');
    if (card.side === 'phrase') {
      void speakPhrase({
        text: card.item.foreign,
        language,
        phonetic: card.item.phonetic,
      });
    }

    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length < 2) return;

    const [firstIdx, secondIdx] = nextFlipped;
    const firstCard = cards[firstIdx];
    const secondCard = cards[secondIdx];

    if (firstCard.pairId === secondCard.pairId) {
      comboRef.current += 1;
      pairsRef.current += 1;
      const pts = 30 + (comboRef.current - 1) * 10;
      scoreRef.current += pts;

      setCombo(comboRef.current);
      setPairsMatched(pairsRef.current);
      setScore(scoreRef.current);
      const nextMatched = [...matchedPairIds, firstCard.pairId];
      setMatchedPairIds(nextMatched);
      setConstellationLinks((prev) => [
        ...prev,
        { id: firstCard.pairId, aIdx: firstIdx, bIdx: secondIdx },
      ]);
      setFlippedIndices([]);

      playSfx('star_pop', Math.min(3, comboRef.current - 1));
      void speakPhrase({
        text: firstCard.item.foreign,
        language,
        phonetic: firstCard.item.phonetic,
      });
      setToast(
        <>
          Star twin “<bdi dir={langDir}>{firstCard.item.foreign}</bdi>” = {firstCard.item.english}! +{pts}
        </>
      );

      if (nextMatched.length >= cards.length / 2) {
        lockBoardRef.current = true;
        wavesClearedRef.current += 1;
        scoreRef.current += 60;
        bonusSecondsRef.current += 8;
        setScore(scoreRef.current);
        setWave(wavesClearedRef.current + 1);
        setToast('CONSTELLATION COMPLETE! +60 Bonus & +8s!');
        playSfx('unit_fanfare');
        scheduleTimeout(() => {
          dealFreshWave();
        }, 600);
      }
    } else {
      lockBoardRef.current = true;
      comboRef.current = 0;
      setCombo(0);
      playSfx('gentle_nudge');
      setToast('Not a twin yet — watch closely!');
      scheduleTimeout(() => {
        setFlippedIndices([]);
        lockBoardRef.current = false;
      }, Math.round(620 / paceMultiplier));
    }
  };

  const cols = isNarrow ? 3 : 4;
  const rows = isNarrow ? 4 : 3;
  const bestScore = bestScoreFor('constellation_memory');

  const centerCoords = (idx: number) => ({
    x: ((idx % cols) + 0.5) * (100 / cols),
    y: (Math.floor(idx / cols) + 0.5) * (100 / rows),
  });

  return (
    <section
      ref={containerRef}
      aria-label="Constellation Memory Twins Arcade"
      style={ARCADE_SHELL_STYLE}
    >
      <ArcadeHeaderBar
        icon={<Sparkles size={isCompact ? 17 : 20} color="#a855f7" />}
        title="Constellation Memory Twins"
        subtitle="Flip glossy star-cards to connect bilingual constellations!"
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
          badgeText="Star Chart Ready!"
          title="Connect Cosmic Memory Twins!"
          description="Flip 12 cosmic star-cards to pair illustrated meanings with their foreign phrases, draw glowing constellations, and clear bonus star waves!"
          startLabel="Chart the Stars!"
          bestScore={bestScore}
          arcadeTier={arcadeTier}
          isCompact={isCompact}
          emblem={<ConstellationMemoryEmblem size={isCompact ? 54 : 68} />}
          buttonClass="tactile-btn-indigo"
          onStart={startRound}
        />
      ) : null}

      {phase === 'playing' ? (
        <>
          <div
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
              borderColor: 'var(--card-border, #cbd5e1)',
              color: 'var(--text-main, #1e1b4b)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
              <span
                style={{
                  padding: '2px 9px',
                  borderRadius: 999,
                  background: '#f3e8ff',
                  color: '#6b21a8',
                  fontSize: '0.76rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-display)',
                  flexShrink: 0,
                }}
              >
                Wave {wave} • Pairs: {pairsMatched}
              </span>
              <span
                style={{
                  fontSize: isCompact ? '0.76rem' : '0.84rem',
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
              Claim Rewards
            </button>
          </div>

          {/* Cosmic Star-Chart Grid */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              width: '100%',
              padding: isCompact ? 8 : 12,
              borderRadius: 22,
              borderTopWidth: 3,
              borderRightWidth: 3,
              borderLeftWidth: 3,
              borderBottomWidth: 5,
              borderStyle: 'solid',
              borderColor: '#818cf8',
              background: 'radial-gradient(circle at 50% 35%, #2e1065 0%, #1e1b4b 58%, #090d26 100%)',
              overflow: 'hidden',
            }}
          >
            {/* Glowing SVG Constellation Lines Overlay */}
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                inset: isCompact ? 8 : 12,
                width: `calc(100% - ${isCompact ? 16 : 24}px)`,
                height: `calc(100% - ${isCompact ? 16 : 24}px)`,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              {constellationLinks.map((link) => {
                const a = centerCoords(link.aIdx);
                const b = centerCoords(link.bIdx);
                return (
                  <g key={link.id}>
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="#38bdf8"
                      strokeWidth="1.4"
                      strokeOpacity="0.65"
                      strokeDasharray="2 1.5"
                    />
                    <circle cx={a.x} cy={a.y} r="1.8" fill="#fde047" />
                    <circle cx={b.x} cy={b.y} r="1.8" fill="#fde047" />
                  </g>
                );
              })}
            </svg>

            {/* 12 Glossy Memory Cards */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                width: '100%',
                height: '100%',
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                gap: isCompact ? 6 : 10,
                perspective: 900,
              }}
            >
              {cards.map((card, idx) => {
                const isMatched = matchedPairIds.includes(card.pairId);
                const isFlipped = flippedIndices.includes(idx);
                const revealed = isMatched || isFlipped;

                return (
                  <motion.button
                    key={card.uid}
                    type="button"
                    dir={revealed && card.side === 'phrase' ? langDir : 'ltr'}
                    aria-label={
                      revealed
                        ? card.side === 'picture'
                          ? `${card.item.english} picture card`
                          : `${card.item.foreign} phrase card`
                        : `Star card ${idx + 1}`
                    }
                    onClick={() => handleFlipCard(idx)}
                    animate={{
                      rotateY: revealed ? 0 : 180,
                      scale: isMatched ? 0.96 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                    whileTap={revealed ? undefined : { scale: 0.94 }}
                    style={{
                      width: '100%',
                      height: '100%',
                      minWidth: 0,
                      minHeight: 0,
                      padding: isCompact ? 4 : 8,
                      borderRadius: 16,
                      borderTopWidth: 2,
                      borderRightWidth: 2,
                      borderLeftWidth: 2,
                      borderBottomWidth: 4,
                      borderStyle: 'solid',
                      borderColor: isMatched
                        ? '#38bdf8'
                        : revealed
                          ? '#f59e0b'
                          : '#818cf8',
                      background: isMatched
                        ? 'linear-gradient(180deg, #ecfeff 0%, #cffafe 100%)'
                        : revealed
                          ? '#ffffff'
                          : 'linear-gradient(165deg, #4338ca 0%, #312e81 100%)',
                      color: revealed ? '#1e1b4b' : '#fde047',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isCompact ? 2 : 4,
                      cursor: revealed ? 'default' : 'pointer',
                      boxShadow: isMatched
                        ? '0 0 18px rgba(56, 189, 248, 0.5)'
                        : '0 6px 14px rgba(2, 6, 23, 0.35)',
                      overflow: 'hidden',
                    }}
                  >
                    {revealed ? (
                      card.side === 'picture' ? (
                        <>
                          <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                            <VocabIllustration
                              illustrationKey={card.item.illustrationKey}
                              language={language}
                              size={isCompact ? (card.item.english.length > 22 ? 24 : 28) : 46}
                            />
                          </span>
                          <span
                            dir="ltr"
                            style={{
                              fontWeight: 900,
                              fontSize: isCompact
                                ? card.item.english.length > 28
                                  ? '0.54rem'
                                  : card.item.english.length > 20
                                    ? '0.59rem'
                                    : '0.67rem'
                                : card.item.english.length > 30
                                  ? '0.65rem'
                                  : card.item.english.length > 20
                                    ? '0.72rem'
                                    : '0.8rem',
                              lineHeight: card.item.english.length > 20 ? 1.16 : 1.24,
                              color: '#1e1b4b',
                              textAlign: 'center',
                              maxWidth: '100%',
                              overflowWrap: 'break-word',
                            }}
                          >
                            {card.item.english}
                          </span>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#4f46e5', flexShrink: 0 }}>
                            <Volume2 size={isCompact ? 12 : 14} />
                          </div>
                          <span
                            dir={langDir}
                            style={getArcadeForeignTextStyle(language, card.item.foreign, {
                              isCompact,
                              density: 'tight',
                              color: '#1e1b4b',
                            })}
                          >
                            {card.item.foreign}
                          </span>
                          {!isCompact ? (
                            <span
                              dir="ltr"
                              style={{
                                fontSize: '0.66rem',
                                fontWeight: 700,
                                lineHeight: 1.25,
                                color: '#64748b',
                                maxWidth: '100%',
                                overflowWrap: 'break-word',
                                textAlign: 'center',
                              }}
                            >
                              {card.item.romanized
                                ? `${card.item.romanized} · ${card.item.phonetic}`
                                : card.item.phonetic}
                            </span>
                          ) : card.item.romanized ? (
                            <span
                              dir="ltr"
                              style={{
                                fontSize: '0.56rem',
                                fontWeight: 800,
                                lineHeight: 1.15,
                                color: '#4f46e5',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                textAlign: 'center',
                              }}
                            >
                              {card.item.romanized}
                            </span>
                          ) : null}
                        </>
                      )
                    ) : (
                      <div
                        style={{
                          transform: 'rotateY(180deg)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <Sparkles size={isCompact ? 20 : 26} color="#fde047" />
                        <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#e0e7ff' }}>
                          STAR
                        </span>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {phase === 'summary' && summary ? (
        <ArcadeSummaryCard
          companionId="pip"
          badgeText="Starlight Navigator!"
          title="Constellation Memory Complete!"
          score={summary.score}
          bestScore={bestScore}
          heartsWon={summary.heartsWon}
          bonusGems={summary.bonusGems}
          xpEarned={summary.xpEarned}
          arcadeTier={arcadeTier}
          statLine={`Pairs matched: ${summary.pairsMatched} • Waves cleared: ${summary.wavesCleared}`}
          isCompact={isCompact}
          onPlayAgain={startRound}
          onExit={onExit}
        />
      ) : null}
    </section>
  );
}
