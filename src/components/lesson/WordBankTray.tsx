import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { playSfx } from '../../audio';
import type { HintTier, TextDirection } from '../../types/contracts';
import { deterministicShuffle, joinWordBankTokens } from './lessonHelpers';
import { StarlightGlintArc } from './StarlightGlintArc';
import type { HintGlintArc } from './useHintEngine';

export interface WordBankPoolTile {
  uid: string;
  label: string;
}

export interface WordBankHintOverlay {
  hintTier: HintTier;
  prefersReducedMotion: boolean;
  activeFlashUids: ReadonlySet<string>;
  peakFlashUid: string | null;
  lingerUid: string | null;
  stepNumbersByUid: ReadonlyMap<string, number>;
  misplacedPulseUids: ReadonlySet<string>;
  dimmedUids: ReadonlySet<string>;
  spotlightUid: string | null;
  spotlightZone: 'bank' | 'tray' | 'choice' | 'pair' | null;
  glintArc: HintGlintArc | null;
}

export interface WordBankTrayProps {
  seed: string;
  targetTokens: readonly string[];
  distractorTokens?: readonly string[];
  selectedTileUids: readonly string[];
  disabled?: boolean;
  compact?: boolean;
  dir?: TextDirection;
  hintOverlay?: WordBankHintOverlay;
  onTileInteract?: () => void;
  onChangeSelected: (nextUids: string[]) => void;
}

export function buildWordBankPool(
  seed: string,
  targetTokens: readonly string[],
  distractorTokens: readonly string[] = []
): WordBankPoolTile[] {
  const combined = [...targetTokens, ...distractorTokens].map((label, idx) => ({
    uid: `${seed}::${idx}::${label}`,
    label,
  }));
  return deterministicShuffle(combined, seed);
}

export function getAssembledText(
  pool: readonly WordBankPoolTile[],
  selectedUids: readonly string[]
): string {
  const byUid = new Map(pool.map((t) => [t.uid, t.label]));
  const labels = selectedUids.map((uid) => byUid.get(uid) ?? '').filter(Boolean);
  return joinWordBankTokens(labels);
}

export function WordBankTray({
  seed,
  targetTokens,
  distractorTokens = [],
  selectedTileUids,
  disabled = false,
  compact = false,
  dir = 'ltr',
  hintOverlay,
  onTileInteract,
  onChangeSelected,
}: WordBankTrayProps) {
  const pool = useMemo(
    () => buildWordBankPool(seed, targetTokens, distractorTokens),
    [seed, targetTokens, distractorTokens]
  );

  const byUid = useMemo(() => new Map(pool.map((item) => [item.uid, item])), [pool]);
  const selectedSet = useMemo(() => new Set(selectedTileUids), [selectedTileUids]);
  const assembledPreview = useMemo(
    () => getAssembledText(pool, selectedTileUids),
    [pool, selectedTileUids]
  );
  const totalPoolChars = useMemo(
    () => pool.reduce((sum, tile) => sum + tile.label.length, 0),
    [pool]
  );
  const longTokenLayout = totalPoolChars > 65;
  const denseChips =
    compact || targetTokens.length >= 9 || pool.length >= 9 || longTokenLayout;
  const veryDense = targetTokens.length >= 9 || pool.length >= 11 || longTokenLayout;

  const addTile = (uid: string) => {
    if (disabled || selectedSet.has(uid)) return;
    onTileInteract?.();
    playSfx('tile_tap');
    onChangeSelected([...selectedTileUids, uid]);
  };

  const removeTile = (uid: string) => {
    if (disabled) return;
    onTileInteract?.();
    playSfx('tile_remove');
    onChangeSelected(selectedTileUids.filter((id) => id !== uid));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: denseChips ? 7 : 12, minWidth: 0, width: '100%' }}>
      {/* Answer Assembly Tray */}
      <div
        aria-label="Answer tray"
        dir={dir}
        data-dense={veryDense ? 'true' : 'false'}
        style={{
          minHeight: veryDense ? 46 : denseChips ? 54 : 66,
          padding: veryDense ? '6px 9px' : denseChips ? '8px 10px' : '11px 14px',
          borderRadius: veryDense ? 15 : 18,
          background: 'var(--card-soft-bg)',
          border: '2px dashed var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: veryDense ? 4 : 6,
          minWidth: 0,
          width: '100%',
        }}
      >
        {selectedTileUids.length === 0 ? (
          <span
            dir="ltr"
            style={{
              color: 'var(--text-muted)',
              fontWeight: 700,
              fontSize: veryDense ? '0.82rem' : '0.88rem',
              textAlign: 'center',
            }}
          >
            Tap word tiles below in order
          </span>
        ) : (
          <>
            <div
              dir={dir}
              style={{ display: 'flex', flexWrap: 'wrap', gap: veryDense ? 4 : 6, alignItems: 'center', minWidth: 0 }}
            >
              {selectedTileUids.map((uid) => {
                const tile = byUid.get(uid);
                if (!tile) return null;
                const isMisplaced = Boolean(hintOverlay?.misplacedPulseUids.has(uid));
                const isTraySpotlight =
                  hintOverlay?.spotlightZone === 'tray' && hintOverlay?.spotlightUid === uid;
                return (
                  <motion.button
                    key={uid}
                    type="button"
                    layout
                    initial={{ scale: 0.88, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 460, damping: 28 }}
                    data-tile-uid={uid}
                    data-hint-misplaced={isMisplaced ? 'true' : undefined}
                    data-hint-spotlight={isTraySpotlight ? 'true' : undefined}
                    className={`tactile-tile is-selected ${veryDense ? 'word-bank-chip is-dense' : ''} ${
                      isMisplaced ? 'is-starlight-misplaced' : ''
                    } ${isTraySpotlight ? 'is-starlight-spotlight' : ''}`}
                    style={
                      veryDense
                        ? { lineHeight: dir === 'rtl' ? 1.5 : 1.2, maxWidth: '100%', overflowWrap: 'anywhere' }
                        : {
                            padding: denseChips ? '6px 11px' : '8px 14px',
                            fontSize: denseChips ? '0.9rem' : '0.98rem',
                            lineHeight: dir === 'rtl' ? 1.5 : 1.25,
                            maxWidth: '100%',
                            overflowWrap: 'anywhere',
                          }
                    }
                    disabled={disabled}
                    onClick={() => removeTile(uid)}
                  >
                    {tile.label}
                  </motion.button>
                );
              })}
            </div>
            <div
              dir="ltr"
              style={{
                fontSize: veryDense ? '0.74rem' : '0.8rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                borderTop: '1px solid var(--card-border)',
                paddingTop: 3,
                overflowWrap: 'anywhere',
              }}
            >
              Preview:{' '}
              <span
                dir={dir}
                style={{
                  color: 'var(--text-main)',
                  fontWeight: 800,
                  unicodeBidi: 'isolate',
                  lineHeight: dir === 'rtl' ? 1.5 : 1.25,
                }}
              >
                {assembledPreview}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Tile Pool */}
      <div
        aria-label="Word bank tiles"
        dir={dir}
        style={{
          position: 'relative',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: veryDense ? 5 : denseChips ? 6 : 8,
          minWidth: 0,
          width: '100%',
        }}
      >
        <StarlightGlintArc
          glintArc={hintOverlay?.glintArc ?? null}
          disabled={disabled || hintOverlay?.prefersReducedMotion}
        />
        {pool.map((tile) => {
          const isUsed = selectedSet.has(tile.uid);
          const isFlashing = !isUsed && Boolean(hintOverlay?.activeFlashUids.has(tile.uid));
          const isPeak = !isUsed && hintOverlay?.peakFlashUid === tile.uid;
          const isLinger = !isUsed && hintOverlay?.lingerUid === tile.uid;
          const isDimmed = !isUsed && Boolean(hintOverlay?.dimmedUids.has(tile.uid));
          const isSpotlight =
            !isUsed && hintOverlay?.spotlightZone === 'bank' && hintOverlay?.spotlightUid === tile.uid;
          const stepNumber = !isUsed ? hintOverlay?.stepNumbersByUid.get(tile.uid) : undefined;
          const tier2Glow = isFlashing && (hintOverlay?.hintTier ?? 0) >= 2;
          return (
            <span
              key={tile.uid}
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
            >
              <button
                type="button"
                data-tile-uid={tile.uid}
                data-hint-active={isFlashing ? 'true' : undefined}
                data-hint-peak={isPeak ? 'true' : undefined}
                data-hint-linger={isLinger ? 'true' : undefined}
                data-hint-spotlight={isSpotlight ? 'true' : undefined}
                data-hint-dimmed={isDimmed ? 'true' : undefined}
                data-hint-step={stepNumber !== undefined ? String(stepNumber) : undefined}
                className={`tactile-tile ${veryDense ? 'word-bank-chip is-dense' : ''} ${
                  isUsed ? 'is-ghost' : ''
                } ${isFlashing ? 'is-starlight-seq-active' : ''} ${
                  tier2Glow ? 'is-starlight-seq-tier2' : ''
                } ${isLinger ? 'is-starlight-linger' : ''} ${
                  isSpotlight ? 'is-starlight-spotlight' : ''
                } ${isDimmed ? 'is-starlight-dimmed' : ''}`}
                style={
                  veryDense
                    ? { lineHeight: dir === 'rtl' ? 1.5 : 1.2, maxWidth: '100%', overflowWrap: 'anywhere' }
                    : {
                        padding: denseChips ? '6px 11px' : '8px 14px',
                        fontSize: denseChips ? '0.9rem' : '0.98rem',
                        lineHeight: dir === 'rtl' ? 1.5 : 1.25,
                        maxWidth: '100%',
                        overflowWrap: 'anywhere',
                      }
                }
                disabled={disabled || isUsed}
                aria-hidden={isUsed}
                tabIndex={isUsed ? -1 : 0}
                onClick={() => addTile(tile.uid)}
              >
                {tile.label}
                {isPeak && !hintOverlay?.prefersReducedMotion ? (
                  <span className="starlight-sheen-clip" aria-hidden="true">
                    <span className="starlight-sheen-sweep" />
                  </span>
                ) : null}
              </button>
              {hintOverlay?.prefersReducedMotion && stepNumber !== undefined ? (
                <span
                  data-testid="hint-step-badge"
                  className="starlight-step-badge"
                  aria-hidden="true"
                >
                  {stepNumber}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
