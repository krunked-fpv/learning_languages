import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Gem, Heart, Play, RotateCcw, Star, Volume2, X } from 'lucide-react';
import { playSfx, speakPhrase } from '../../audio';
import { getArcadeLexicon } from '../../curriculum';
import { useVaultStore } from '../../store/useVaultStore';
import type { ArcadeLanternItem, CompanionId, LanguageCode } from '../../types/contracts';
import { MascotStage } from '../characters/MascotStage';
import { ConfettiBurst } from '../fx/JuiceEngine';

export const FALLBACK_ARCADE_LEXICON: Record<LanguageCode, ArcadeLanternItem[]> = {
  es: [
    { id: 'fb-es-1', language: 'es', foreign: 'hola', english: 'hello', phonetic: 'OH-lah', illustrationKey: 'wave_hello' },
    { id: 'fb-es-2', language: 'es', foreign: 'el agua', english: 'the water', phonetic: 'el AH-gwah', illustrationKey: 'water_carafe' },
    { id: 'fb-es-3', language: 'es', foreign: 'el sol', english: 'the sun', phonetic: 'el SOHL', illustrationKey: 'morning_sun' },
    { id: 'fb-es-4', language: 'es', foreign: 'el gato', english: 'the cat', phonetic: 'el GAH-toh', illustrationKey: 'cozy_cat' },
    { id: 'fb-es-5', language: 'es', foreign: 'la manzana', english: 'the apple', phonetic: 'lah mahn-SAH-nah', illustrationKey: 'fresh_apple' },
    { id: 'fb-es-6', language: 'es', foreign: 'el pan', english: 'the bread', phonetic: 'el PAHN', illustrationKey: 'warm_bread' },
    { id: 'fb-es-7', language: 'es', foreign: 'el queso', english: 'the cheese', phonetic: 'el KEH-soh', illustrationKey: 'golden_cheese' },
    { id: 'fb-es-8', language: 'es', foreign: 'la luna', english: 'the moon', phonetic: 'lah LOO-nah', illustrationKey: 'crescent_moon' },
  ],
  fr: [
    { id: 'fb-fr-1', language: 'fr', foreign: 'bonjour', english: 'hello', phonetic: 'bon-ZHOOR', illustrationKey: 'wave_hello' },
    { id: 'fb-fr-2', language: 'fr', foreign: "l'eau", english: 'the water', phonetic: 'LOH', illustrationKey: 'water_carafe' },
    { id: 'fb-fr-3', language: 'fr', foreign: 'le croissant', english: 'the croissant', phonetic: 'luh kwah-SAHN', illustrationKey: 'flaky_pastry' },
    { id: 'fb-fr-4', language: 'fr', foreign: 'le chat', english: 'the cat', phonetic: 'luh SHAH', illustrationKey: 'cozy_cat' },
    { id: 'fb-fr-5', language: 'fr', foreign: 'la pomme', english: 'the apple', phonetic: 'lah POHM', illustrationKey: 'fresh_apple' },
    { id: 'fb-fr-6', language: 'fr', foreign: 'le pain', english: 'the bread', phonetic: 'luh PAN', illustrationKey: 'warm_bread' },
    { id: 'fb-fr-7', language: 'fr', foreign: 'le soleil', english: 'the sun', phonetic: 'luh soh-LAY', illustrationKey: 'morning_sun' },
    { id: 'fb-fr-8', language: 'fr', foreign: 'la lune', english: 'the moon', phonetic: 'lah LOON', illustrationKey: 'crescent_moon' },
  ],
  de: [
    { id: 'fb-de-1', language: 'de', foreign: 'hallo', english: 'hello', phonetic: 'HAH-loh', illustrationKey: 'wave_hello' },
    { id: 'fb-de-2', language: 'de', foreign: 'das Wasser', english: 'the water', phonetic: 'dahs VAH-ser', illustrationKey: 'water_carafe' },
    { id: 'fb-de-3', language: 'de', foreign: 'das Brot', english: 'the bread', phonetic: 'dahs BROHT', illustrationKey: 'warm_bread' },
    { id: 'fb-de-4', language: 'de', foreign: 'die Katze', english: 'the cat', phonetic: 'dee KAHT-suh', illustrationKey: 'cozy_cat' },
    { id: 'fb-de-5', language: 'de', foreign: 'der Apfel', english: 'the apple', phonetic: 'dair AHP-fel', illustrationKey: 'fresh_apple' },
    { id: 'fb-de-6', language: 'de', foreign: 'die Sonne', english: 'the sun', phonetic: 'dee ZOH-nuh', illustrationKey: 'morning_sun' },
    { id: 'fb-de-7', language: 'de', foreign: 'der Zug', english: 'the train', phonetic: 'dair TSOOG', illustrationKey: 'express_train' },
    { id: 'fb-de-8', language: 'de', foreign: 'der Mond', english: 'the moon', phonetic: 'dair MOHNT', illustrationKey: 'crescent_moon' },
  ],
  it: [
    { id: 'fb-it-1', language: 'it', foreign: 'ciao', english: 'hello', phonetic: 'CHOW', illustrationKey: 'wave_hello' },
    { id: 'fb-it-2', language: 'it', foreign: "l'acqua", english: 'the water', phonetic: 'LAHK-wah', illustrationKey: 'water_carafe' },
    { id: 'fb-it-3', language: 'it', foreign: 'il gelato', english: 'the gelato', phonetic: 'eel jeh-LAH-toh', illustrationKey: 'sweet_gelato' },
    { id: 'fb-it-4', language: 'it', foreign: 'il gatto', english: 'the cat', phonetic: 'eel GAHT-toh', illustrationKey: 'cozy_cat' },
    { id: 'fb-it-5', language: 'it', foreign: 'la mela', english: 'the apple', phonetic: 'lah MEH-lah', illustrationKey: 'fresh_apple' },
    { id: 'fb-it-6', language: 'it', foreign: 'il pane', english: 'the bread', phonetic: 'eel PAH-neh', illustrationKey: 'warm_bread' },
    { id: 'fb-it-7', language: 'it', foreign: 'il sole', english: 'the sun', phonetic: 'eel SOH-leh', illustrationKey: 'morning_sun' },
    { id: 'fb-it-8', language: 'it', foreign: 'la luna', english: 'the moon', phonetic: 'lah LOO-nah', illustrationKey: 'crescent_moon' },
  ],
};

export function useArcadeDeck(): {
  language: LanguageCode;
  lexicon: ArcadeLanternItem[];
  targetLexicon: ArcadeLanternItem[];
  bestScoreFor: (gameId: string) => number;
} {
  const { activeProfile, activeProgress } = useVaultStore();
  const language = activeProfile.activeLanguage;

  const lexicon = useMemo(() => {
    const items = getArcadeLexicon(
      language,
      activeProgress.unlockedVocabIds,
      activeProgress.currentUnitIndex
    );
    return items.length >= 8 ? items : FALLBACK_ARCADE_LEXICON[language];
  }, [language, activeProgress.unlockedVocabIds, activeProgress.currentUnitIndex]);

  const targetLexicon = useMemo(() => {
    if (activeProgress.currentUnitIndex === 0 && activeProgress.unlockedVocabIds.length < 13) {
      return lexicon.slice(0, Math.min(13, lexicon.length));
    }
    return lexicon;
  }, [lexicon, activeProgress.currentUnitIndex, activeProgress.unlockedVocabIds.length]);

  const bestScoreFor = (gameId: string): number => {
    const mapScore = activeProfile.arcadeHighScores?.[gameId] ?? 0;
    if (gameId === 'starlight_choir') {
      return Math.max(mapScore, activeProfile.secretArcadeBestScore ?? 0);
    }
    return mapScore;
  };

  return { language, lexicon, targetLexicon, bestScoreFor };
}

export function useArcadeContainerMetrics() {
  const containerRef = useRef<HTMLElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (el && typeof ResizeObserver !== 'undefined') {
      const obs = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (rect && rect.width > 0 && rect.height > 0) {
          setSize({ width: rect.width, height: rect.height });
        }
      });
      obs.observe(el);
      return () => obs.disconnect();
    }

    if (typeof window !== 'undefined') {
      const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    return undefined;
  }, []);

  const isNarrow = size.width < 720;
  const isShort = size.height < 640;
  const isCompact = isNarrow || isShort;

  return { containerRef, width: size.width, height: size.height, isNarrow, isShort, isCompact };
}

export function pickDistinctItems(
  pool: readonly ArcadeLanternItem[],
  count: number,
  excludeIds: ReadonlySet<string> = new Set()
): ArcadeLanternItem[] {
  const filtered = pool.filter((item) => !excludeIds.has(item.id));
  const copy = [...filtered];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, count);
}

export const ARCADE_SHELL_STYLE = {
  height: '100%',
  maxHeight: '100%',
  minHeight: 0,
  width: '100%',
  maxWidth: 960,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  overflow: 'hidden',
} as const;

export const CARD_SURFACE_STYLE = {
  background: 'var(--card-bg, #ffffff)',
  color: 'var(--text-main, #1e1b4b)',
  borderTopWidth: 2,
  borderRightWidth: 2,
  borderLeftWidth: 2,
  borderBottomWidth: 4,
  borderStyle: 'solid',
  borderColor: 'var(--card-border, #cbd5e1)',
  borderRadius: 20,
  boxShadow: 'var(--card-glow, 0 8px 22px rgba(15, 23, 42, 0.08))',
} as const;

export const SOFT_BTN_STYLE = {
  background: 'var(--card-soft-bg, #f1f5f9)',
  color: 'var(--text-main, #1e1b4b)',
  borderTopWidth: 2,
  borderRightWidth: 2,
  borderLeftWidth: 2,
  borderBottomWidth: 4,
  borderStyle: 'solid',
  borderColor: 'var(--card-border, #cbd5e1)',
} as const;

export interface ArcadeHeaderBarProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  score: number;
  bestScore?: number;
  timeLeft: number;
  combo?: number;
  heartsPreview?: number;
  isCompact: boolean;
  onExit?: () => void;
}

export function ArcadeHeaderBar({
  icon,
  title,
  subtitle,
  score,
  bestScore,
  timeLeft,
  combo = 0,
  heartsPreview,
  isCompact,
  onExit,
}: ArcadeHeaderBarProps) {
  return (
    <div
      style={{
        ...CARD_SURFACE_STYLE,
        flexShrink: 0,
        padding: isCompact ? '7px 10px' : '9px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexWrap: 'wrap',
        borderRadius: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div
          style={{
            width: isCompact ? 32 : 38,
            height: isCompact ? 32 : 38,
            borderRadius: 12,
            background: 'var(--card-soft-bg, #f8fafc)',
            borderTopWidth: 1.5,
            borderRightWidth: 1.5,
            borderLeftWidth: 1.5,
            borderBottomWidth: 3,
            borderStyle: 'solid',
            borderColor: 'var(--card-border, #cbd5e1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isCompact ? '0.95rem' : '1.06rem',
              fontWeight: 900,
              color: 'var(--text-main, #1e1b4b)',
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </div>
          {!isCompact ? (
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: 'var(--text-muted, #475569)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitle}
              {bestScore !== undefined ? ` • Best: ${bestScore}` : ''}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {heartsPreview !== undefined ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: isCompact ? '3px 8px' : '4px 10px',
              borderRadius: 999,
              background: '#fff1f2',
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderLeftWidth: 2,
              borderBottomWidth: 3,
              borderStyle: 'solid',
              borderColor: '#fda4af',
              color: '#be123c',
              fontWeight: 900,
              fontSize: isCompact ? '0.76rem' : '0.82rem',
              fontFamily: 'var(--font-display)',
            }}
          >
            <Heart size={13} fill="#f43f5e" /> +{heartsPreview}
          </span>
        ) : null}

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: isCompact ? '3px 8px' : '4px 10px',
            borderRadius: 999,
            background: '#fffbeb',
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderLeftWidth: 2,
            borderBottomWidth: 3,
            borderStyle: 'solid',
            borderColor: '#f59e0b',
            color: '#b45309',
            fontWeight: 900,
            fontSize: isCompact ? '0.76rem' : '0.82rem',
            fontFamily: 'var(--font-display)',
          }}
        >
          <Star size={13} fill="#f59e0b" /> {score}
          {combo >= 2 ? ` (${combo}x)` : ''}
        </span>

        <span
          style={{
            padding: isCompact ? '3px 8px' : '4px 10px',
            borderRadius: 999,
            background: '#eff6ff',
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderLeftWidth: 2,
            borderBottomWidth: 3,
            borderStyle: 'solid',
            borderColor: '#60a5fa',
            color: '#1d4ed8',
            fontWeight: 900,
            fontSize: isCompact ? '0.76rem' : '0.82rem',
            fontFamily: 'var(--font-display)',
          }}
        >
          {timeLeft}s
        </span>

        {onExit ? (
          <button
            type="button"
            className="tactile-btn"
            style={{
              ...SOFT_BTN_STYLE,
              padding: isCompact ? '4px 8px' : '5px 10px',
              fontSize: '0.78rem',
              borderRadius: 12,
            }}
            onClick={onExit}
          >
            <X size={14} />
            <span>Exit</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TargetPromptBar({
  label,
  targetItem,
  language,
  isCompact,
  rightContent,
}: {
  label: string;
  targetItem: ArcadeLanternItem;
  language: LanguageCode;
  isCompact: boolean;
  rightContent?: ReactNode;
}) {
  return (
    <div
      style={{
        ...CARD_SURFACE_STYLE,
        flexShrink: 0,
        padding: isCompact ? '6px 10px' : '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexWrap: 'wrap',
        borderRadius: 16,
        borderColor: 'var(--lang-primary, #f59e0b)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: isCompact ? '0.72rem' : '0.8rem',
            fontWeight: 900,
            color: 'var(--lang-primary, #b45309)',
            letterSpacing: '0.03em',
          }}
        >
          {label}
        </span>
        <strong
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: isCompact ? '0.98rem' : '1.12rem',
            color: 'var(--text-main, #1e1b4b)',
          }}
        >
          {targetItem.english}
        </strong>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 999,
            background: 'var(--card-soft-bg, #fef3c7)',
            borderTopWidth: 1,
            borderRightWidth: 1,
            borderLeftWidth: 1,
            borderBottomWidth: 2,
            borderStyle: 'solid',
            borderColor: 'var(--card-border, #cbd5e1)',
            color: 'var(--text-muted, #475569)',
            fontSize: isCompact ? '0.72rem' : '0.78rem',
            fontWeight: 800,
          }}
        >
          {targetItem.phonetic}
        </span>
        <button
          type="button"
          className="tactile-btn"
          aria-label={`Hear ${targetItem.foreign}`}
          style={{
            ...SOFT_BTN_STYLE,
            padding: isCompact ? '3px 7px' : '4px 9px',
            fontSize: '0.74rem',
            borderRadius: 10,
          }}
          onClick={() => {
            void speakPhrase({
              text: targetItem.foreign,
              language,
              phonetic: targetItem.phonetic,
            });
          }}
        >
          <Volume2 size={13} />
          <span>Hear</span>
        </button>
      </div>

      {rightContent ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{rightContent}</div>
      ) : null}
    </div>
  );
}

export function ArcadeReadyCard({
  companionId,
  badgeText,
  title,
  description,
  startLabel,
  bestScore,
  isCompact,
  emblem,
  buttonClass = 'tactile-btn-primary',
  onStart,
}: {
  companionId: CompanionId;
  badgeText: string;
  title: string;
  description: string;
  startLabel: string;
  bestScore: number;
  isCompact: boolean;
  emblem?: ReactNode;
  buttonClass?: string;
  onStart: () => void;
}) {
  const { activeProfile } = useVaultStore();

  return (
    <div
      style={{
        ...CARD_SURFACE_STYLE,
        flex: 1,
        minHeight: 0,
        padding: isCompact ? 14 : 22,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isCompact ? 8 : 12,
        textAlign: 'center',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <MascotStage
          companionId={companionId}
          pose="happy"
          equippedCosmetics={companionId === 'pip' ? activeProfile.equippedCosmetics : undefined}
          size={isCompact ? 92 : 124}
          badgeText={badgeText}
        />
        {emblem ? <div style={{ flexShrink: 0 }}>{emblem}</div> : null}
      </div>

      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: isCompact ? '1.15rem' : '1.4rem',
          fontWeight: 900,
          color: 'var(--text-main, #1e1b4b)',
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: 0,
          maxWidth: 480,
          fontSize: isCompact ? '0.82rem' : '0.92rem',
          fontWeight: 700,
          color: 'var(--text-muted, #475569)',
          lineHeight: 1.38,
        }}
      >
        {description}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: 999,
            background: '#fffbeb',
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderLeftWidth: 2,
            borderBottomWidth: 3,
            borderStyle: 'solid',
            borderColor: '#f59e0b',
            color: '#b45309',
            fontSize: '0.78rem',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
          }}
        >
          Best Score: {bestScore}
        </span>
      </div>

      <button
        type="button"
        className={`tactile-btn tactile-btn-hero ${buttonClass}`}
        onClick={onStart}
      >
        <Play size={18} />
        <span>{startLabel}</span>
      </button>
    </div>
  );
}

export function ArcadeSummaryCard({
  companionId,
  badgeText,
  title,
  score,
  bestScore,
  heartsWon,
  bonusGems,
  statLine,
  isCompact,
  isHeartRecovery = false,
  mascotSlot,
  playAgainLabel = 'Play Again!',
  onResumeLesson,
  onPlayAgain,
  onExit,
  exitLabel = 'Back to Arcade Hub',
}: {
  companionId: CompanionId;
  badgeText: string;
  title: string;
  score: number;
  bestScore: number;
  heartsWon: number;
  bonusGems: number;
  statLine: string;
  isCompact: boolean;
  isHeartRecovery?: boolean;
  mascotSlot?: ReactNode;
  playAgainLabel?: string;
  onResumeLesson?: () => void;
  onPlayAgain: () => void;
  onExit?: () => void;
  exitLabel?: string;
}) {
  const { activeProfile } = useVaultStore();

  return (
    <div
      style={{
        ...CARD_SURFACE_STYLE,
        flex: 1,
        minHeight: 0,
        padding: isCompact ? 14 : 22,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isCompact ? 8 : 12,
        textAlign: 'center',
        overflowY: 'auto',
      }}
    >
      <ConfettiBurst active intensity="grand" />
      {mascotSlot ?? (
        <MascotStage
          companionId={companionId}
          pose="victory_dance"
          equippedCosmetics={companionId === 'pip' ? activeProfile.equippedCosmetics : undefined}
          size={isCompact ? 92 : 124}
          badgeText={badgeText}
        />
      )}

      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: isCompact ? '1.15rem' : '1.38rem',
          fontWeight: 900,
          color: 'var(--text-main, #1e1b4b)',
        }}
      >
        {title}
      </h2>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span
          className="hud-pill hud-pill-static"
          style={{ background: '#fffbeb', borderColor: '#f59e0b', color: '#b45309' }}
        >
          <Star size={14} fill="#f59e0b" /> Score: {score} (Best: {Math.max(score, bestScore)})
        </span>
        <span
          className="hud-pill hud-pill-static"
          style={{ background: '#fff1f2', borderColor: '#fda4af', color: '#be123c' }}
        >
          <Heart size={14} fill="#f43f5e" /> +{heartsWon} Hearts
        </span>
        <span
          className="hud-pill hud-pill-static"
          style={{ background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }}
        >
          <Gem size={14} /> +{bonusGems} Gems
        </span>
      </div>

      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted, #475569)' }}>
        {statLine}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 2 }}>
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
            onClick={() => {
              playSfx('button_click');
              onPlayAgain();
            }}
          >
            <RotateCcw size={17} />
            <span>{playAgainLabel}</span>
          </button>
        )}

        {onExit ? (
          <button
            type="button"
            className="tactile-btn tactile-btn-hero"
            style={SOFT_BTN_STYLE}
            onClick={onExit}
          >
            {exitLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
