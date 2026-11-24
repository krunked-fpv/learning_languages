import { useMemo } from 'react';
import { LANGUAGE_META, type LanguageCode } from '../../types/contracts';
import { VirtualScriptDrawer } from './VirtualScriptDrawer';
import { getPinyinTonePreview } from './useFreeRecallInput';

export interface FreeRecallScriptStripProps {
  language: LanguageCode;
  direction: 'to_foreign' | 'to_english';
  typedText: string;
  compact: boolean;
  disabled: boolean;
  drawerOpen: boolean;
  drawerKey?: string;
  onOpenChange: (open: boolean) => void;
  onInsertChar: (ch: string) => void;
  onApplyPinyinPreview?: (convertedText: string) => void;
}

/**
 * Renders Free-Recall language notes (Arabic QWERTY optionality, live Mandarin numeric Pinyin
 * tone preview) alongside the unified Accent bar + VirtualScriptDrawer strip.
 */
export function FreeRecallScriptStrip({
  language,
  direction,
  typedText,
  compact,
  disabled,
  drawerOpen,
  drawerKey,
  onOpenChange,
  onInsertChar,
  onApplyPinyinPreview,
}: FreeRecallScriptStripProps) {
  const langMeta = LANGUAGE_META[language];
  const accentChars = useMemo(
    () => Array.from(new Set(langMeta.helperAccents)),
    [langMeta.helperAccents]
  );

  if (direction !== 'to_foreign') {
    return null;
  }

  const hasManyAccents = accentChars.length > 14;
  const showArabicNote = language === 'ar' || language === 'arz';
  const pinyinPreview = getPinyinTonePreview(language, direction, typedText);
  const isApplyPreviewDisabled = disabled || typedText.trim() === pinyinPreview;
  const isCompactRow = compact && !drawerOpen;

  return (
    <>
      {showArabicNote ? (
        <div
          data-testid="arabic-qwerty-optionality-note"
          dir="ltr"
          className="free-recall-note"
          style={{
            padding: compact ? '2px 7px' : '4px 10px',
            borderRadius: 10,
            background: 'var(--tint-indigo-bg)',
            border: '1px solid var(--tint-indigo-border)',
            color: 'var(--tint-indigo-ink)',
            fontSize: compact ? '0.68rem' : '0.74rem',
            fontWeight: 800,
            lineHeight: 1.25,
            maxWidth: '100%',
            overflowWrap: 'break-word',
          }}
        >
          Tip: Hamza (<bdi dir="rtl">أ إ ء</bdi>) &amp; vowels are optional on QWERTY — or tap Script Keys!
        </div>
      ) : null}

      {pinyinPreview ? (
        <div
          data-testid="pinyin-tone-number-preview"
          role="status"
          dir="ltr"
          className="free-recall-note"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: compact ? '3px 6px' : '4px 8px',
            padding: compact ? '2px 7px' : '4px 10px',
            borderRadius: 10,
            background: 'var(--tint-emerald-bg)',
            border: '1px solid var(--tint-emerald-border)',
            color: 'var(--tint-emerald-ink)',
            fontSize: compact ? '0.7rem' : '0.76rem',
            fontWeight: 800,
            lineHeight: 1.25,
            maxWidth: '100%',
            overflowWrap: 'break-word',
          }}
        >
          <span style={{ minWidth: 0, overflowWrap: 'break-word' }}>
            Pinyin tones: <strong>{pinyinPreview}</strong>
          </span>{' '}
          <button
            type="button"
            data-testid="pinyin-preview-apply-btn"
            disabled={isApplyPreviewDisabled}
            onClick={() => onApplyPinyinPreview?.(pinyinPreview)}
            style={{
              flexShrink: 0,
              padding: compact ? '2px 8px' : '3px 10px',
              borderRadius: 999,
              background: isApplyPreviewDisabled ? 'var(--card-soft-bg)' : '#047857',
              border: isApplyPreviewDisabled
                ? '1px solid var(--card-border)'
                : '1px solid var(--tint-emerald-border)',
              color: isApplyPreviewDisabled ? 'var(--text-muted)' : '#ffffff',
              fontSize: compact ? '0.68rem' : '0.72rem',
              fontWeight: 900,
              lineHeight: 1.25,
              cursor: isApplyPreviewDisabled ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Tap to apply
          </button>
        </div>
      ) : null}

      <div
        data-testid="unified-script-strip"
        className={`unified-script-strip ${isCompactRow ? 'is-compact-row' : ''}`}
        style={
          isCompactRow
            ? {
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'nowrap',
                gap: 5,
                width: '100%',
                minWidth: 0,
              }
            : {
                display: 'flex',
                flexDirection: 'column',
                gap: compact ? 4 : 6,
                width: '100%',
                minWidth: 0,
              }
        }
      >
        {!drawerOpen ? (
          <div
            aria-label="Accent character bar"
            dir={langMeta.dir}
            className={
              isCompactRow
                ? 'console-scroll-pane-x unified-accent-strip is-compact'
                : 'console-scroll-pane unified-accent-strip'
            }
            style={
              isCompactRow
                ? {
                    flex: '1 1 0%',
                    minWidth: 0,
                    maxHeight: 38,
                    display: 'flex',
                    flexWrap: 'nowrap',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    gap: 4,
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: '1px 2px',
                  }
                : {
                    maxHeight: 112,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: hasManyAccents ? 5 : 6,
                    justifyContent: 'center',
                    padding: '2px 2px',
                  }
            }
          >
            {accentChars.map((ch) => (
              <button
                key={ch}
                type="button"
                className="tactile-tile"
                style={
                  isCompactRow
                    ? {
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        padding: '1px 6px',
                        fontSize: '0.8rem',
                        minWidth: 25,
                        borderBottomWidth: 3,
                        lineHeight: langMeta.dir === 'rtl' ? 1.3 : 1.15,
                      }
                    : {
                        padding: hasManyAccents ? '4px 8px' : '5px 11px',
                        fontSize: hasManyAccents ? '0.88rem' : '0.95rem',
                        minWidth: hasManyAccents ? 30 : 36,
                        lineHeight: langMeta.dir === 'rtl' ? 1.5 : 1.25,
                      }
                }
                disabled={disabled}
                onClick={() => onInsertChar(ch)}
              >
                {ch}
              </button>
            ))}
          </div>
        ) : null}

        <VirtualScriptDrawer
          key={drawerKey}
          language={language}
          compact={compact}
          disabled={disabled}
          open={drawerOpen}
          inlineCollapsed={isCompactRow}
          onOpenChange={onOpenChange}
          onInsertChar={onInsertChar}
        />
      </div>
    </>
  );
}
