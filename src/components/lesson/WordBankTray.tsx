import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { playSfx } from '../../audio';
import type { TextDirection } from '../../types/contracts';
import { deterministicShuffle, joinWordBankTokens } from './lessonHelpers';

export interface WordBankPoolTile {
  uid: string;
  label: string;
}

export interface WordBankTrayProps {
  seed: string;
  targetTokens: readonly string[];
  distractorTokens?: readonly string[];
  selectedTileUids: readonly string[];
  disabled?: boolean;
  compact?: boolean;
  dir?: TextDirection;
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
  const denseChips = compact || targetTokens.length >= 9 || pool.length >= 9;
  const veryDense = targetTokens.length >= 9 || pool.length >= 11;

  const addTile = (uid: string) => {
    if (disabled || selectedSet.has(uid)) return;
    playSfx('tile_tap');
    onChangeSelected([...selectedTileUids, uid]);
  };

  const removeTile = (uid: string) => {
    if (disabled) return;
    playSfx('tile_remove');
    onChangeSelected(selectedTileUids.filter((id) => id !== uid));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: denseChips ? 7 : 12 }}>
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
              style={{ display: 'flex', flexWrap: 'wrap', gap: veryDense ? 4 : 6, alignItems: 'center' }}
            >
              {selectedTileUids.map((uid) => {
                const tile = byUid.get(uid);
                if (!tile) return null;
                return (
                  <motion.button
                    key={uid}
                    type="button"
                    layout
                    initial={{ scale: 0.88, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 460, damping: 28 }}
                    className={`tactile-tile is-selected ${veryDense ? 'word-bank-chip is-dense' : ''}`}
                    style={
                      veryDense
                        ? { lineHeight: dir === 'rtl' ? 1.5 : 1.2 }
                        : {
                            padding: denseChips ? '6px 11px' : '8px 14px',
                            fontSize: denseChips ? '0.9rem' : '0.98rem',
                            lineHeight: dir === 'rtl' ? 1.5 : 1.25,
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
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: veryDense ? 5 : denseChips ? 6 : 8,
        }}
      >
        {pool.map((tile) => {
          const isUsed = selectedSet.has(tile.uid);
          return (
            <button
              key={tile.uid}
              type="button"
              className={`tactile-tile ${veryDense ? 'word-bank-chip is-dense' : ''} ${
                isUsed ? 'is-ghost' : ''
              }`}
              style={
                veryDense
                  ? { lineHeight: dir === 'rtl' ? 1.5 : 1.2 }
                  : {
                      padding: denseChips ? '6px 11px' : '8px 14px',
                      fontSize: denseChips ? '0.9rem' : '0.98rem',
                      lineHeight: dir === 'rtl' ? 1.5 : 1.25,
                    }
              }
              disabled={disabled || isUsed}
              aria-hidden={isUsed}
              tabIndex={isUsed ? -1 : 0}
              onClick={() => addTile(tile.uid)}
            >
              {tile.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
