import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Compass, Sparkles, Volume2 } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { playSfx, speakPhrase } from '../../audio';
import { useVaultStore } from '../../store/useVaultStore';
import {
  LANGUAGE_META,
  type ArcadeLanternItem,
  type ArcadeProficiencyTier,
  type CharacterPose,
  type LanguageCode,
} from '../../types/contracts';
import { MascotStage } from '../characters/MascotStage';
import { StarlightHintButton } from '../lesson/StarlightHintButton';
import { useHintEngine } from '../lesson/useHintEngine';
import { StarlightBridgeEmblem } from './ArcadeEmblems';
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
  recordArcadeRunResult,
  resolveArcadePlainEnglish,
  useArcadeContainerMetrics,
  useArcadeDeck,
} from './arcadeShared';

const ROUND_DURATION_SECONDS = 45;
const GAP_EDGE_X = 38;
const BRIDGE_END_X = 87;

interface ClozePromptSpec {
  mode: 'sentence_cloze' | 'phrase_bridge';
  beforeBlank: string;
  afterBlank: string;
  blankLabel: string;
  englishClue: string;
  phoneticHint: string;
  romanizedHint?: string;
  speakText: string;
}

interface BridgeRound {
  uid: number;
  target: ArcadeLanternItem;
  cloze: ClozePromptSpec;
  choices: ArcadeLanternItem[];
  correctPlankText: string;
}

const ARTICLE_PREFIX_RE =
  /^(?:the|an|a|el|la|los|las|un|una|le|les|une|l'|der|die|das|ein|eine|il|lo|i|gli|o|a|os|as|um|uma|al-|at-|ash-|ar-|con|cái|quả|chiếc|người)\s*/i;
const BRIDGE_EDGE_PUNCT_RE =
  /^[¡!¿?.,;:"'’‘“”„«»‹›()[\]。？！，、；：・「」『』（）【】《》〈〉؟،؛।॥…—–]+|[¡!¿?.,;:"'’‘“”„«»‹›()[\]。？！，、；：・「」『』（）【】《》〈〉؟،؛।॥…—–]+$/g;

export function extractBlankFromExample(
  item: ArcadeLanternItem,
  language: LanguageCode
): { beforeBlank: string; matchedToken: string; afterBlank: string } | null {
  const example = item.exampleForeign?.trim();
  if (!example) return null;

  const trimmedForeign = item.foreign.trim();
  const cleanEdge = trimmedForeign.replace(BRIDGE_EDGE_PUNCT_RE, '').trim();
  const strippedArticle = cleanEdge.replace(ARTICLE_PREFIX_RE, '').trim();
  const strippedArabicDef = cleanEdge.startsWith('ال') && cleanEdge.length > 3 ? cleanEdge.slice(2) : '';

  const rawCandidates = [
    trimmedForeign,
    cleanEdge,
    strippedArticle,
    strippedArabicDef,
  ];
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const raw of rawCandidates) {
    const t = raw.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    candidates.push(t);
  }

  const usesSpaces = LANGUAGE_META[language].usesSpaces;
  const minLen = usesSpaces ? 2 : 1;

  for (const cand of candidates) {
    if (!cand || cand.length < minLen) continue;
    const lowerExample = example.toLowerCase();
    const lowerCand = cand.toLowerCase();
    const idx = lowerExample.indexOf(lowerCand);
    if (idx < 0) continue;

    if (usesSpaces) {
      const charBefore = idx > 0 ? example[idx - 1] : ' ';
      const charAfter = idx + cand.length < example.length ? example[idx + cand.length] : ' ';
      const boundaryBefore = /[\s¡¿"'(’‘“”«،؛.,!?—–-]/.test(charBefore);
      const boundaryAfter = /[\s!?.,;:،؛"'’‘“”)»।॥—–-]/.test(charAfter);
      if (!boundaryBefore || !boundaryAfter) continue;
    }

    const beforeBlank = example.slice(0, idx);
    const matchedToken = example.slice(idx, idx + cand.length);
    const afterBlank = example.slice(idx + cand.length);
    if (beforeBlank.trim().length === 0 && afterBlank.trim().length === 0) {
      continue;
    }
    return { beforeBlank, matchedToken, afterBlank };
  }

  return null;
}

function buildClozePrompt(item: ArcadeLanternItem, language: LanguageCode): ClozePromptSpec {
  const split = extractBlankFromExample(item, language);
  if (split) {
    return {
      mode: 'sentence_cloze',
      beforeBlank: split.beforeBlank,
      afterBlank: split.afterBlank,
      blankLabel: split.matchedToken,
      englishClue: item.exampleEnglish ?? item.english,
      phoneticHint: item.examplePhonetic ?? item.phonetic,
      romanizedHint: item.exampleRomanized ?? item.romanized,
      speakText: item.exampleForeign ?? item.foreign,
    };
  }

  return {
    mode: 'phrase_bridge',
    beforeBlank: '',
    afterBlank: '',
    blankLabel: item.foreign,
    englishClue: item.english,
    phoneticHint: item.phonetic,
    romanizedHint: item.romanized,
    speakText: item.foreign,
  };
}

export interface StarlightBridgeArcadeProps {
  arcadeTier?: ArcadeProficiencyTier;
  onExit: () => void;
}

export function StarlightBridgeArcade({
  arcadeTier = 'sprout',
  onExit,
}: StarlightBridgeArcadeProps) {
  const { activeProfile } = useVaultStore();
  const { language, lexicon, targetLexicon, bestScoreFor, paceMultiplier } =
    useArcadeDeck(arcadeTier);
  const { containerRef, isCompact } = useArcadeContainerMetrics();
  const langDir = LANGUAGE_META[language].dir;

  const choiceCount = arcadeTier === 'sprout' ? 3 : 4;

  const makeRound = useCallback(
    (uid: number, avoidId?: string): BridgeRound => {
      const pool = targetLexicon.filter((i) => i.id !== avoidId);
      const list = pool.length > 0 ? pool : targetLexicon;
      const target = list[Math.floor(Math.random() * list.length)];
      const distractors = pickDistinctItems(lexicon, choiceCount - 1, new Set([target.id]));
      const choices = [target, ...distractors];
      while (choices.length < choiceCount && lexicon.length > 0) {
        choices.push(lexicon[choices.length % lexicon.length]);
      }
      for (let i = choices.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      const cloze = buildClozePrompt(target, language);
      return {
        uid,
        target,
        cloze,
        choices,
        correctPlankText: cloze.blankLabel,
      };
    },
    [targetLexicon, lexicon, choiceCount, language]
  );

  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>('ready');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bridgesCrossed, setBridgesCrossed] = useState(0);
  const [speedCrossings, setSpeedCrossings] = useState(0);
  const [pipX, setPipX] = useState(12);
  const [pipBobY, setPipBobY] = useState(0);
  const [pipPose, setPipPose] = useState<CharacterPose>('happy');
  const [plankLocked, setPlankLocked] = useState(false);
  const [wrongChoiceIdx, setWrongChoiceIdx] = useState<number | null>(null);
  const showPlainButton = isAdultArcadeActive(language, activeProfile);
  const [plainOpen, setPlainOpen] = useState(false);

  const [round, setRound] = useState<BridgeRound>(() => makeRound(1));
  const [bridgeHintNonce, setBridgeHintNonce] = useState(0);

  const hint = useHintEngine({
    promptKey: `bridge::${round.uid}`,
    mode: 'multiple_choice',
    canHint: phase === 'playing' && !plankLocked,
    choiceConfig: {
      choices: round.choices.map((c) => c.id),
      expected: round.target.id,
      accepted: [round.target.id],
      language,
      seed: String(round.uid),
    },
    onHintTriggered: () => {
      setBridgeHintNonce((n) => n + 1);
    },
  });

  const { cancelHint } = hint;

  useEffect(() => {
    if (phase !== 'playing' || plankLocked) {
      cancelHint({ clearAssists: true });
    }
  }, [phase, plankLocked, cancelHint]);

  const plainResult = useMemo(
    () =>
      plainOpen && showPlainButton
        ? resolveArcadePlainEnglish(round.target, {
            dialectAText: round.cloze.speakText,
            dialectBText: round.cloze.englishClue,
            avoidTerms: [round.correctPlankText, round.target.foreign],
          })
        : null,
    [plainOpen, showPlainButton, round]
  );
  useEffect(() => {
    setPlainOpen(false);
  }, [round.uid, phase]);
  const [toast, setToast] = useState<ReactNode>('Tap the matching bridge plank before Pip reaches the sky chasm!');
  const [summary, setSummary] = useState<{
    score: number;
    heartsWon: number;
    bonusGems: number;
    xpEarned: number;
    bridges: number;
    speedCrossings: number;
  } | null>(null);

  const roundRef = useRef<BridgeRound>(round);
  const pipXRef = useRef(12);
  const plankLockedRef = useRef(false);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const bridgesRef = useRef(0);
  const speedCrossingsRef = useRef(0);
  const uidRef = useRef(2);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (phase === 'ready' && targetLexicon.length > 0) {
      const fresh = makeRound(1);
      roundRef.current = fresh;
      setRound(fresh);
    }
  }, [phase, targetLexicon, makeRound]);

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

  const spawnNextBridge = useCallback(
    (avoidId?: string) => {
      const next = makeRound(uidRef.current++, avoidId);
      roundRef.current = next;
      plankLockedRef.current = false;
      pipXRef.current = 12;
      setRound(next);
      setPlankLocked(false);
      setWrongChoiceIdx(null);
      setPipX(12);
      setPipPose('happy');
    },
    [makeRound]
  );

  const finishRound = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const totalBridges = bridgesRef.current;
    const totalSpeed = speedCrossingsRef.current;
    const finalScore = scoreRef.current;
    const heartsWon = Math.min(5, Math.max(1, Math.ceil(totalBridges / 2)));
    const baseGems = Math.floor(finalScore / 30) + totalSpeed * 2;
    const { bonusGems, xpEarned } = computeScaledArcadeRewards({
      arcadeTier,
      baseGems,
      performanceUnits: totalBridges,
      baseXpBonus: totalSpeed,
    });

    recordArcadeRunResult({
      gameId: 'starlight_bridge',
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
      bridges: totalBridges,
      speedCrossings: totalSpeed,
    });
    setPhase('summary');
  }, [arcadeTier]);

  const startRound = useCallback(() => {
    playSfx('whoosh_transition');
    finishedRef.current = false;
    scoreRef.current = 0;
    comboRef.current = 0;
    bridgesRef.current = 0;
    speedCrossingsRef.current = 0;
    elapsedRef.current = 0;
    setScore(0);
    setCombo(0);
    setBridgesCrossed(0);
    setSpeedCrossings(0);
    setTimeLeft(ROUND_DURATION_SECONDS);
    setToast('Tap the matching bridge plank to carry Pip across the sky-islands!');
    setSummary(null);
    spawnNextBridge();
    setPhase('playing');
  }, [spawnNextBridge]);

  const handleSelectPlank = useCallback(
    (choiceIdx: number) => {
      if (phase !== 'playing' || plankLockedRef.current) return;
      const choice = roundRef.current.choices[choiceIdx];
      if (!choice) return;
      cancelHint({ clearAssists: choice.id === roundRef.current.target.id });

      if (choice.id === roundRef.current.target.id) {
        const isSpeedCrossing = pipXRef.current < GAP_EDGE_X - 1;
        plankLockedRef.current = true;
        setPlankLocked(true);

        comboRef.current += 1;
        bridgesRef.current += 1;
        if (isSpeedCrossing) speedCrossingsRef.current += 1;

        const pts = (isSpeedCrossing ? 42 : 26) + (comboRef.current - 1) * 7;
        scoreRef.current += pts;

        setCombo(comboRef.current);
        setBridgesCrossed(bridgesRef.current);
        setSpeedCrossings(speedCrossingsRef.current);
        setScore(scoreRef.current);
        setPipPose('victory_dance');

        playSfx(isSpeedCrossing ? 'star_pop' : 'correct_chime', Math.min(3, comboRef.current - 1));
        void speakPhrase({
          text: roundRef.current.cloze.speakText,
          language,
          phonetic: roundRef.current.cloze.phoneticHint,
        });

        const plankForeign = roundRef.current.correctPlankText;
        setToast(
          isSpeedCrossing ? (
            <>
              NON-STOP CROSSING! “<bdi dir={langDir}>{plankForeign}</bdi>” +{pts} pts!
            </>
          ) : (
            <>
              Bridge locked! “<bdi dir={langDir}>{plankForeign}</bdi>” +{pts} pts!
            </>
          )
        );
      } else {
        comboRef.current = 0;
        setCombo(0);
        setWrongChoiceIdx(choiceIdx);
        setPipPose('sympathetic');
        playSfx('gentle_nudge');
        setToast(`Not that plank! Clue: "${roundRef.current.cloze.englishClue}"`);
        scheduleTimeout(() => {
          setWrongChoiceIdx((cur) => (cur === choiceIdx ? null : cur));
          setPipPose('happy');
        }, 420);
      }
    },
    [phase, language, langDir, scheduleTimeout]
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') handleSelectPlank(0);
      else if (e.key === '2') handleSelectPlank(1);
      else if (e.key === '3') handleSelectPlank(2);
      else if (e.key === '4' && choiceCount >= 4) handleSelectPlank(3);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, choiceCount, handleSelectPlank]);

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

      if (plankLockedRef.current) {
        const dashSpeed = 72 * Math.max(1, paceMultiplier);
        const nextX = pipXRef.current + dashSpeed * dt;
        const arc =
          nextX >= GAP_EDGE_X && nextX <= 66
            ? -Math.sin(((nextX - GAP_EDGE_X) / (66 - GAP_EDGE_X)) * Math.PI) * 14
            : 0;
        setPipBobY(arc);
        if (nextX >= BRIDGE_END_X) {
          spawnNextBridge(roundRef.current.target.id);
        } else {
          pipXRef.current = nextX;
          setPipX(nextX);
        }
      } else {
        const approachSpeed = (8.5 + Math.min(4, bridgesRef.current * 0.45)) * paceMultiplier;
        if (pipXRef.current < GAP_EDGE_X) {
          const nextX = Math.min(GAP_EDGE_X, pipXRef.current + approachSpeed * dt);
          pipXRef.current = nextX;
          setPipX(nextX);
          setPipBobY(Math.sin(elapsedRef.current * 14) * 2.5);
        } else {
          // Safe flutter hover at island edge until plank is placed
          setPipBobY(Math.sin(elapsedRef.current * 8) * 5);
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, paceMultiplier, finishRound, spawnNextBridge]);

  const bestScore = bestScoreFor('starlight_bridge');
  const waitingAtGap = !plankLocked && pipX >= GAP_EDGE_X - 0.5;
  const cloze = round.cloze;
  const clozeSentenceLen =
    cloze.beforeBlank.length + cloze.blankLabel.length + cloze.afterBlank.length;

  const clozeHeaderLabel = (
    <span
      style={{
        fontSize: isCompact ? '0.58rem' : '0.68rem',
        fontWeight: 900,
        letterSpacing: '0.04em',
        color: '#4f46e5',
        textTransform: 'uppercase',
        lineHeight: 1.15,
      }}
    >
      {cloze.mode === 'sentence_cloze' ? 'Complete the Bridge Sentence' : 'Bridge Cloze Clue'}
    </span>
  );

  const clozePromptNode =
    cloze.mode === 'sentence_cloze' ? (
      <div
        dir={langDir}
        style={{
          ...getArcadeClueTextStyle(
            `${cloze.beforeBlank}${cloze.blankLabel}${cloze.afterBlank}`,
            {
              isCompact,
              variant: 'cloze',
              color: '#1e1b4b',
              textAlign: 'start',
            }
          ),
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: isCompact ? 3 : 5,
        }}
      >
        {cloze.beforeBlank ? <span>{cloze.beforeBlank}</span> : null}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: isCompact ? '0px 7px' : '1px 10px',
            borderRadius: isCompact ? 8 : 10,
            background: plankLocked ? '#d1fae5' : '#fef3c7',
            border: `2px dashed ${plankLocked ? '#10b981' : '#f59e0b'}`,
            color: plankLocked ? '#065f46' : '#b45309',
            minWidth: isCompact ? 42 : 54,
            maxWidth: '100%',
            textAlign: 'center',
            overflowWrap: 'anywhere',
            justifyContent: 'center',
          }}
        >
          {plankLocked ? cloze.blankLabel : '____'}
        </span>
        {cloze.afterBlank ? <span>{cloze.afterBlank}</span> : null}
      </div>
    ) : (
      <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? 4 : 6, flexWrap: 'wrap', minWidth: 0 }}>
        <span
          dir="ltr"
          style={getArcadeClueTextStyle(cloze.englishClue, {
            isCompact,
            variant: 'cloze',
            color: '#1e1b4b',
            textAlign: 'start',
          })}
        >
          {cloze.englishClue}
        </span>
        <span
          dir={langDir}
          style={{
            padding: isCompact ? '0px 7px' : '1px 9px',
            borderRadius: isCompact ? 8 : 10,
            background: plankLocked ? '#d1fae5' : '#fef3c7',
            border: `2px dashed ${plankLocked ? '#10b981' : '#f59e0b'}`,
            color: plankLocked ? '#065f46' : '#b45309',
            fontFamily: 'var(--font-display)',
            fontSize: isCompact ? 'clamp(0.72rem, 2.1vw, 0.8rem)' : '0.96rem',
            fontWeight: 900,
            maxWidth: '100%',
            overflowWrap: 'anywhere',
          }}
        >
          {plankLocked ? cloze.blankLabel : '____'}
        </span>
      </div>
    );

  const hintButtonNode = (
    <StarlightHintButton
      size="xs"
      hintTier={hint.hintTier}
      hintsUsed={hint.hintsUsed}
      isAnimating={hint.isAnimating}
      canHint={hint.canHint}
      onTrigger={hint.triggerHint}
    />
  );

  const hearButtonNode = (
    <button
      type="button"
      className="tactile-btn"
      aria-label={`Hear ${round.target.foreign}`}
      style={{
        ...SOFT_BTN_STYLE,
        padding: isCompact ? '3px 7px' : '6px 10px',
        fontSize: isCompact ? '0.68rem' : '0.76rem',
        borderRadius: isCompact ? 10 : 12,
        borderBottomWidth: isCompact ? 3 : 4,
        flexShrink: 0,
      }}
      onClick={() => {
        void speakPhrase({
          text: cloze.speakText,
          language,
          phonetic: cloze.phoneticHint,
        });
      }}
    >
      <Volume2 size={isCompact ? 13 : 14} />
      {!isCompact ? <span>Hear</span> : null}
    </button>
  );

  const clozeMetaRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? 3 : 5, flexWrap: 'wrap', minWidth: 0 }}>
      {cloze.mode === 'sentence_cloze' ? (
        <span
          dir="ltr"
          style={{
            fontSize: isCompact
              ? cloze.englishClue.length > 36
                ? 'clamp(0.6rem, 1.75vw, 0.65rem)'
                : '0.67rem'
              : '0.8rem',
            fontWeight: 800,
            lineHeight: isCompact ? 1.16 : 1.2,
            color: '#475569',
            maxWidth: '100%',
            overflowWrap: 'anywhere',
          }}
        >
          {cloze.englishClue}
        </span>
      ) : null}
      {cloze.romanizedHint ? (
        <span
          dir="ltr"
          style={{
            padding: isCompact ? '1px 6px' : '1px 7px',
            borderRadius: 999,
            background: '#eef2ff',
            border: '1px solid #c7d2fe',
            color: '#3730a3',
            fontSize: isCompact ? '0.58rem' : '0.74rem',
            fontWeight: 800,
            lineHeight: isCompact ? 1.16 : 1.25,
            maxWidth: '100%',
            overflowWrap: 'anywhere',
          }}
        >
          {cloze.romanizedHint}
        </span>
      ) : null}
      <span
        dir="ltr"
        style={{
          padding: isCompact ? '1px 6px' : '1px 7px',
          borderRadius: 999,
          background: '#f1f5f9',
          color: '#475569',
          fontSize: isCompact
            ? cloze.phoneticHint.length > 34
              ? 'clamp(0.54rem, 1.55vw, 0.59rem)'
              : '0.59rem'
            : '0.74rem',
          fontWeight: 800,
          lineHeight: isCompact ? 1.16 : 1.2,
          maxWidth: '100%',
          overflowWrap: 'anywhere',
        }}
      >
        {cloze.phoneticHint}
      </span>
      {showPlainButton ? (
        <ArcadeSayItNormallyButton
          item={round.target}
          language={language}
          isCompact={isCompact}
          open={plainOpen}
          dialectAText={cloze.speakText}
          dialectBText={cloze.englishClue}
          avoidTerms={[round.correctPlankText, round.target.foreign]}
          onToggle={(nextOpen) => setPlainOpen(nextOpen)}
        />
      ) : null}
      {!isCompact ? hintButtonNode : null}
    </div>
  );

  return (
    <section
      ref={containerRef}
      aria-label="Starlight Bridge Cloze Builder Arcade"
      style={{
        ...ARCADE_SHELL_STYLE,
        gap: isCompact ? 5 : 8,
      }}
    >
      <ArcadeHeaderBar
        icon={<Compass size={isCompact ? 17 : 20} color="#38bdf8" />}
        title="Starlight Bridge Cloze Builder"
        subtitle="Complete Pip's starry sky-island bridge with the right phrase plank!"
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
          badgeText="Sky-Islands Ready!"
          title="Build Starlight Bridges Across the Night Sky!"
          description="Pip sprints across floating starry sky-islands! Read or hear the cloze clue and tap the right bridge plank before Pip reaches the edge for Non-Stop Crossing bonus points!"
          startLabel="Start Bridge Sprint!"
          bestScore={bestScore}
          arcadeTier={arcadeTier}
          isCompact={isCompact}
          emblem={<StarlightBridgeEmblem size={isCompact ? 54 : 68} />}
          buttonClass="tactile-btn-indigo"
          onStart={startRound}
        />
      ) : null}

      {phase === 'playing' ? (
        <>
          {/* Cloze Status & Finish Strip */}
          <div
            data-language={language}
            data-dir={langDir}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: isCompact ? 'wrap' : 'nowrap',
              gap: isCompact ? '3px 8px' : 8,
              padding: isCompact ? '4px 9px' : '7px 14px',
              borderRadius: isCompact ? 14 : 16,
              background: 'var(--card-bg, #ffffff)',
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderLeftWidth: 2,
              borderBottomWidth: isCompact ? 3 : 4,
              borderStyle: 'solid',
              borderColor: '#38bdf8',
              color: 'var(--text-main, #1e1b4b)',
            }}
          >
            <span
              style={{
                order: 1,
                padding: isCompact ? '2px 7px' : '2px 8px',
                borderRadius: 999,
                background: '#e0f2fe',
                color: '#0369a1',
                fontSize: isCompact ? '0.68rem' : '0.78rem',
                fontWeight: 900,
                fontFamily: 'var(--font-display)',
                flexShrink: 0,
              }}
            >
              Bridges: {bridgesCrossed} • Turbo: {speedCrossings}
            </span>

            <span
              style={{
                order: isCompact ? 3 : 2,
                flex: isCompact ? '1 0 100%' : '1 1 0',
                minWidth: 0,
                fontSize: isCompact ? '0.67rem' : '0.82rem',
                fontWeight: 800,
                lineHeight: isCompact ? 1.18 : 1.25,
                color: 'var(--text-muted, #475569)',
                whiteSpace: isCompact ? 'normal' : 'nowrap',
                overflow: isCompact ? 'visible' : 'hidden',
                textOverflow: isCompact ? 'clip' : 'ellipsis',
              }}
            >
              {toast}
            </span>

            <button
              type="button"
              className="tactile-btn tactile-btn-success"
              style={{
                order: isCompact ? 2 : 3,
                marginLeft: isCompact ? 'auto' : undefined,
                padding: isCompact ? '3px 9px' : '5px 11px',
                fontSize: isCompact ? '0.72rem' : '0.76rem',
                borderRadius: 10,
                flexShrink: 0,
              }}
              onClick={finishRound}
            >
              Finish
            </button>
          </div>

          {/* Starry Sky-Island Bridge Stage */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              width: '100%',
              padding: isCompact ? 6 : 14,
              borderRadius: isCompact ? 18 : 22,
              borderTopWidth: 3,
              borderRightWidth: 3,
              borderLeftWidth: 3,
              borderBottomWidth: isCompact ? 4 : 5,
              borderStyle: 'solid',
              borderColor: waitingAtGap ? '#fbbf24' : '#38bdf8',
              background: 'radial-gradient(circle at 50% 25%, #312e81 0%, #1e1b4b 56%, #090d26 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: isCompact ? 4 : 10,
              overflow: 'hidden',
              userSelect: 'none',
            }}
          >
            {/* Cloze Challenge Card at Top of Sky Stage */}
            <div
              style={{
                position: 'relative',
                zIndex: 6,
                flex: isCompact ? '0 1 auto' : '0 0 auto',
                minHeight: 0,
                maxHeight: isCompact ? '43%' : undefined,
                overflowY: isCompact ? 'auto' : 'visible',
                overscrollBehavior: isCompact ? 'contain' : undefined,
                padding: isCompact ? '5px 8px' : '10px 16px',
                borderRadius: isCompact ? 15 : 18,
                background: 'rgba(255, 255, 255, 0.95)',
                borderTopWidth: 2,
                borderRightWidth: 2,
                borderLeftWidth: 2,
                borderBottomWidth: isCompact ? 3 : 4,
                borderStyle: 'solid',
                borderColor: plankLocked ? '#10b981' : '#818cf8',
                display: 'flex',
                flexDirection: 'column',
                gap: isCompact ? 3 : 6,
                boxShadow: '0 8px 22px rgba(2, 6, 23, 0.35)',
              }}
            >
              {isCompact ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      width: '100%',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                        <VocabIllustration
                          illustrationKey={round.target.illustrationKey}
                          language={language}
                          size={clozeSentenceLen > 42 ? 18 : 20}
                        />
                      </span>
                      {clozeHeaderLabel}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {hintButtonNode}
                      {hearButtonNode}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', minWidth: 0 }}>
                    {clozePromptNode}
                    {clozeMetaRow}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                    <VocabIllustration
                      illustrationKey={round.target.illustrationKey}
                      language={language}
                      size={46}
                    />
                  </span>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {clozeHeaderLabel}
                    {clozePromptNode}
                    {clozeMetaRow}
                  </div>

                  {hearButtonNode}
                </div>
              )}

              {plainResult ? (
                <ArcadePlainEnglishCallout
                  result={plainResult}
                  isCompact={isCompact}
                  onClose={() => setPlainOpen(false)}
                />
              ) : null}
            </div>

            {/* Sky-Island Chasm & Animated Pip Track */}
            <div
              style={{
                position: 'relative',
                flex: isCompact ? '1 1 42px' : 1,
                minHeight: isCompact ? 42 : 104,
                width: '100%',
              }}
            >
              {/* Starry Backdrop + Sky Islands SVG */}
              <svg
                aria-hidden="true"
                viewBox="0 0 100 50"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                <circle cx="15" cy="9" r="0.8" fill="#fef08a" />
                <circle cx="48" cy="7" r="1.1" fill="#7dd3fc" />
                <circle cx="82" cy="11" r="0.9" fill="#fde047" />
                <circle cx="64" cy="16" r="0.7" fill="#ffffff" />

                {/* Left Sky Island */}
                <polygon points="0,33 41,33 36,49 0,49" fill="#4338ca" />
                <rect x="0" y="29" width="42" height="6" rx="2" fill="#10b981" />

                {/* Right Sky Island */}
                <polygon points="65,33 100,33 100,49 70,49" fill="#4338ca" />
                <rect x="64" y="29" width="36" height="6" rx="2" fill="#10b981" />

                {/* Bridge Gap */}
                {plankLocked ? (
                  <>
                    <rect x="41" y="29.2" width="24" height="5" rx="2" fill="#fde047" stroke="#f59e0b" strokeWidth="0.9" />
                    <line x1="42" y1="31.5" x2="64" y2="31.5" stroke="#ffffff" strokeWidth="1.1" strokeDasharray="2 1.5" />
                  </>
                ) : (
                  <rect
                    x="42"
                    y="29.4"
                    width="22"
                    height="4.6"
                    rx="1.8"
                    fill={waitingAtGap ? 'rgba(251, 191, 36, 0.25)' : 'rgba(56, 189, 248, 0.16)'}
                    stroke={waitingAtGap ? '#fbbf24' : '#38bdf8'}
                    strokeWidth="0.9"
                    strokeDasharray="2 1.5"
                  />
                )}
              </svg>

              {/* Glowing Bridge Label Over Gap */}
              <div
                style={{
                  position: 'absolute',
                  left: '53%',
                  bottom: isCompact ? '14%' : '28%',
                  transform: 'translateX(-50%)',
                  maxWidth: '88%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  padding: isCompact ? '1px 7px' : '2px 9px',
                  borderRadius: 999,
                  background: plankLocked
                    ? '#10b981'
                    : waitingAtGap
                      ? '#f59e0b'
                      : 'rgba(15, 23, 42, 0.78)',
                  color: '#ffffff',
                  fontFamily: 'var(--font-display)',
                  fontSize: isCompact ? '0.6rem' : '0.74rem',
                  fontWeight: 900,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {plankLocked ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Sparkles size={11} /> <bdi dir={langDir}>{cloze.blankLabel}</bdi>
                  </span>
                ) : waitingAtGap ? (
                  'Tap Plank!'
                ) : (
                  'Star Chasm'
                )}
              </div>

              {/* Sprinting Pip */}
              <div
                style={{
                  position: 'absolute',
                  left: `${pipX}%`,
                  bottom: isCompact ? '18%' : '33%',
                  transform: `translate(-50%, ${pipBobY.toFixed(1)}px)`,
                  willChange: 'left, transform',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              >
                <MascotStage
                  companionId="pip"
                  pose={pipPose}
                  equippedCosmetics={activeProfile.equippedCosmetics}
                  size={isCompact ? 36 : 74}
                  hintPulseNonce={bridgeHintNonce}
                />
              </div>
            </div>

            {/* 3–4 Tactile Bridge Plank Choices */}
            <div
              style={{
                flexShrink: 0,
                display: 'grid',
                gridTemplateColumns:
                  isCompact
                    ? 'repeat(2, minmax(0, 1fr))'
                    : `repeat(${round.choices.length}, minmax(0, 1fr))`,
                gap: isCompact ? 5 : 10,
                zIndex: 6,
              }}
            >
              {round.choices.map((item, idx) => {
                const isLastOdd = isCompact && round.choices.length === 3 && idx === 2;
                const isWrong = wrongChoiceIdx === idx;
                const isTargetLocked = plankLocked && item.id === round.target.id;
                const isDimmed = !plankLocked && hint.dimmedUids.has(item.id);
                const isSpotlight =
                  !plankLocked && hint.spotlightZone === 'choice' && hint.spotlightUid === item.id;
                const plankText =
                  item.id === round.target.id ? round.correctPlankText : item.foreign;
                const foreignStyle = getArcadeForeignTextStyle(language, plankText, {
                  isCompact,
                  density: isCompact
                    ? plankText.length > 14
                      ? 'tight'
                      : 'normal'
                    : round.choices.length >= 4 && plankText.length > 22
                      ? 'tight'
                      : 'normal',
                  color: '#1e1b4b',
                });

                return (
                  <button
                    key={`${round.uid}-${item.id}-${idx}`}
                    type="button"
                    dir="ltr"
                    disabled={plankLocked}
                    data-hint-dimmed={isDimmed ? 'true' : undefined}
                    data-hint-spotlight={isSpotlight ? 'true' : undefined}
                    className={`tactile-btn starlight-choice-tile ${
                      isDimmed ? 'is-starlight-dimmed' : ''
                    } ${isSpotlight ? 'is-starlight-spotlight' : ''}`}
                    onClick={() => handleSelectPlank(idx)}
                    style={{
                      gridColumn: isLastOdd ? '1 / -1' : undefined,
                      position: 'relative',
                      padding: isCompact ? '4px 6px' : '10px 12px',
                      borderRadius: isCompact ? 13 : 16,
                      background: isTargetLocked
                        ? '#d1fae5'
                        : isWrong
                          ? '#ffe4e6'
                          : '#ffffff',
                      borderTopWidth: isCompact ? 2 : 2.5,
                      borderRightWidth: isCompact ? 2 : 2.5,
                      borderLeftWidth: isCompact ? 2 : 2.5,
                      borderBottomWidth: isCompact ? 3.5 : 5,
                      borderStyle: 'solid',
                      borderColor: isTargetLocked
                        ? '#10b981'
                        : isWrong
                          ? '#f43f5e'
                          : isSpotlight
                            ? '#a78bfa'
                            : '#38bdf8',
                      color: '#1e1b4b',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isCompact ? 1 : 2,
                      minWidth: 0,
                      overflow: 'visible',
                      opacity: isDimmed ? 0.38 : 1,
                      cursor: plankLocked ? 'default' : 'pointer',
                      boxShadow: isSpotlight
                        ? '0 0 0 2px var(--starlight-glow-a), 0 0 18px 2px var(--starlight-glow-b), 0 6px 16px rgba(2, 6, 23, 0.28)'
                        : '0 6px 16px rgba(2, 6, 23, 0.28)',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: isCompact ? 2 : 4,
                        left: isCompact ? 6 : 7,
                        fontSize: isCompact ? '0.54rem' : '0.62rem',
                        lineHeight: 1,
                        fontWeight: 900,
                        color: '#0369a1',
                      }}
                    >
                      Plank {idx + 1}
                    </span>

                    <span
                      dir={langDir}
                      style={{
                        ...foreignStyle,
                        paddingBlock: isCompact ? 0 : foreignStyle.paddingBlock,
                        lineHeight: isCompact
                          ? langDir === 'rtl'
                            ? 1.32
                            : 1.2
                          : foreignStyle.lineHeight,
                        width: '100%',
                        marginTop: isCompact ? 5 : 6,
                      }}
                    >
                      {plankText}
                    </span>

                    {item.romanized ? (
                      <span
                        dir="ltr"
                        style={{
                          fontSize: isCompact ? '0.58rem' : '0.7rem',
                          fontWeight: 800,
                          color: '#4f46e5',
                          lineHeight: isCompact ? 1.15 : 1.2,
                          maxWidth: '100%',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {item.romanized}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {phase === 'summary' && summary ? (
        <ArcadeSummaryCard
          companionId="pip"
          badgeText="Sky-Island Pathfinder!"
          title="Starlight Bridge Complete!"
          score={summary.score}
          bestScore={bestScore}
          heartsWon={summary.heartsWon}
          bonusGems={summary.bonusGems}
          xpEarned={summary.xpEarned}
          arcadeTier={arcadeTier}
          statLine={`Bridges crossed: ${summary.bridges} • Non-Stop Crossings: ${summary.speedCrossings}`}
          isCompact={isCompact}
          onPlayAgain={startRound}
          onExit={onExit}
        />
      ) : null}
    </section>
  );
}
