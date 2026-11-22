import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, X } from 'lucide-react';
import { playSfx, speakPhrase } from '../../audio';
import { LANGUAGE_META, type LanguageCode, type TapHintToken } from '../../types/contracts';
import { NO_SPACE_AFTER_RE, NO_SPACE_BEFORE_RE, clampPopoverPosition } from './lessonHelpers';

export interface TapHintTextProps {
  tokens: readonly TapHintToken[];
  fallbackText?: string;
  language: LanguageCode;
  className?: string;
}

export function TapHintText({
  tokens,
  fallbackText,
  language,
  className = '',
}: TapHintTextProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 24,
    left: 16,
    width: 248,
  });
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const activeToken = activeIndex !== null ? tokens[activeIndex] ?? null : null;
  const langDir = LANGUAGE_META[language].dir;

  useLayoutEffect(() => {
    if (activeIndex === null || !anchorRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const measuredH = popoverRef.current?.offsetHeight || 156;
    const measuredW = Math.min(264, window.innerWidth - 20);
    setCoords(clampPopoverPosition(anchorRect, measuredW, measuredH));
  }, [activeIndex, activeToken?.surface]);

  useEffect(() => {
    if (activeIndex === null) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (
        target &&
        (popoverRef.current?.contains(target) || anchorRef.current?.contains(target))
      ) {
        return;
      }
      setActiveIndex(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveIndex(null);
    };

    const handleViewportChange = () => {
      if (!anchorRef.current) return;
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const measuredH = popoverRef.current?.offsetHeight || 156;
      const measuredW = Math.min(264, window.innerWidth - 20);
      setCoords(clampPopoverPosition(anchorRect, measuredW, measuredH));
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [activeIndex]);

  if (tokens.length === 0) {
    return (
      <span className={className} dir={langDir}>
        {fallbackText ?? ''}
      </span>
    );
  }

  const popoverNode = activeToken ? (
    <div
      ref={popoverRef}
      role="dialog"
      dir="ltr"
      aria-label={`Word hint for ${activeToken.surface}`}
      className="tap-hint-popover"
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <strong
          dir={langDir}
          style={{
            fontSize: '1.05rem',
            color: 'var(--lang-primary)',
            lineHeight: langDir === 'rtl' ? 1.5 : 1.25,
          }}
        >
          {activeToken.surface}
        </strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            className="tactile-btn tactile-btn-soft"
            style={{ padding: '4px 8px', borderRadius: 10, fontSize: '0.78rem' }}
            aria-label={`Pronounce ${activeToken.speakText}`}
            onClick={() => {
              void speakPhrase({
                text: activeToken.speakText,
                language,
                phonetic: activeToken.phonetic,
              });
            }}
          >
            <Volume2 size={15} />
            <span>Hear</span>
          </button>
          <button
            type="button"
            className="tactile-btn tactile-btn-soft"
            style={{ padding: '4px 6px', borderRadius: 10 }}
            aria-label="Close word hint"
            onClick={() => setActiveIndex(null)}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
        {activeToken.translation}
      </div>
      {activeToken.romanized ? (
        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--lang-primary)', marginTop: 2 }}>
          {activeToken.romanized}
        </div>
      ) : null}
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
        Say: <strong style={{ color: 'var(--text-main)' }}>{activeToken.phonetic}</strong>
      </div>

      {activeToken.articleNote ? (
        <div
          style={{
            marginTop: 6,
            padding: '4px 8px',
            borderRadius: 10,
            background: 'var(--tint-indigo-bg)',
            color: 'var(--tint-indigo-ink)',
            fontSize: '0.76rem',
            fontWeight: 700,
          }}
        >
          {activeToken.articleNote}
        </div>
      ) : null}

      {activeToken.accentNote ? (
        <div
          style={{
            marginTop: 6,
            padding: '4px 8px',
            borderRadius: 10,
            background: 'var(--tint-amber-bg)',
            color: 'var(--tint-amber-ink)',
            fontSize: '0.76rem',
            fontWeight: 700,
          }}
        >
          {activeToken.accentNote}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <span className={className} dir={langDir} style={{ lineHeight: 1.5, unicodeBidi: 'isolate' }}>
      {tokens.map((token, idx) => {
        const prev = idx > 0 ? tokens[idx - 1].surface : '';
        const needsSpace =
          idx > 0 &&
          !NO_SPACE_AFTER_RE.test(prev) &&
          !NO_SPACE_BEFORE_RE.test(token.surface);
        const isOpen = activeIndex === idx;

        return (
          <span key={`${token.normalizedId}-${idx}`}>
            {needsSpace ? ' ' : ''}
            <button
              type="button"
              ref={(el) => {
                if (isOpen) anchorRef.current = el;
              }}
              className={`tap-hint-token-btn ${isOpen ? 'is-open' : ''}`}
              aria-expanded={isOpen}
              onClick={(e) => {
                anchorRef.current = e.currentTarget;
                playSfx('tile_tap');
                setActiveIndex((cur) => (cur === idx ? null : idx));
              }}
            >
              {token.surface}
            </button>
          </span>
        );
      })}
      {popoverNode && typeof document !== 'undefined'
        ? createPortal(popoverNode, document.body)
        : popoverNode}
    </span>
  );
}
