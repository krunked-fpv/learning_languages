import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AvatarBadge } from '../../art/AvatarBadge';
import { FlagIcon } from '../../art/FlagIcon';
import {
  PROFICIENCY_TIERS,
  PROFICIENCY_TIER_META,
  resolveUnitProficiencyTier,
  type AvatarId,
  type CompanionId,
  type CourseUnit,
  type EquippedCosmetics,
  type LanguageCourse,
  type LanguageProgressState,
  type MapNode,
  type MapNodeType,
  type ProficiencyTier,
} from '../../types/contracts';
import { MascotStage } from '../characters/MascotStage';
import { GoldStar, MapNodeIcon, PadlockBadge } from './NodeIcons';
import { RegionalScenery } from './RegionalScenery';

export interface AdventureMapProps {
  course: LanguageCourse;
  progress: LanguageProgressState;
  equippedCosmetics: EquippedCosmetics;
  onSelectNode: (node: MapNode) => void;
  onSelectUnit?: (unitIndex: number) => void;
  onStartTierCheckpoint?: (targetTier: Exclude<ProficiencyTier, 'A1'>) => void;
}

const COMPANION_AVATAR_MAP: Record<Exclude<CompanionId, 'pip'>, AvatarId> = {
  mateo: 'mateo_chef',
  colette: 'colette_baker',
  benni: 'benni_tinker',
  luca: 'luca_captain',
};

const NODE_TYPE_LABELS: Record<MapNodeType, string> = {
  lesson: 'Lesson',
  story: 'Story',
  chest: 'Chest',
  boss: 'Boss',
};

const DESKTOP_SLOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 9, y: 36 },
  { x: 22.5, y: 64 },
  { x: 36, y: 34 },
  { x: 50, y: 66 },
  { x: 64, y: 36 },
  { x: 77.5, y: 64 },
  { x: 91, y: 46 },
];

const MOBILE_SLOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 18, y: 20 },
  { x: 50, y: 20 },
  { x: 82, y: 20 },
  { x: 72, y: 49 },
  { x: 28, y: 49 },
  { x: 24, y: 77 },
  { x: 76, y: 77 },
];

function getNodeCoords(index: number, total: number, isCompact: boolean): { x: number; y: number } {
  const slots = isCompact ? MOBILE_SLOTS : DESKTOP_SLOTS;
  if (index < slots.length && total <= slots.length) {
    return slots[index];
  }
  const t = total <= 1 ? 0.5 : index / (total - 1);
  if (isCompact) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = row % 2 === 0 ? 18 + col * 32 : 82 - col * 32;
    const y = Math.min(82, 20 + row * 28);
    return { x, y };
  }
  return {
    x: Math.round((9 + t * 82) * 10) / 10,
    y: Math.round((50 + Math.sin(index * 1.45) * 18) * 10) / 10,
  };
}

function buildPercentCurveSegments(nodes: readonly MapNode[], isCompact: boolean) {
  const points = nodes.map((_, idx) => getNodeCoords(idx, nodes.length, isCompact));

  return points.slice(0, -1).map((from, idx) => {
    const to = points[idx + 1];
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);

    // Smooth horizontal-first S-curves across panoramic/row moves, vertical-turn curves between mobile rows
    const d =
      dx >= dy
        ? `M ${from.x} ${from.y} C ${(from.x + to.x) / 2} ${from.y}, ${(from.x + to.x) / 2} ${to.y}, ${to.x} ${to.y}`
        : `M ${from.x} ${from.y} C ${from.x} ${(from.y + to.y) / 2}, ${to.x} ${(from.y + to.y) / 2}, ${to.x} ${to.y}`;

    return {
      id: `${nodes[idx].id}->${nodes[idx + 1].id}`,
      fromNode: nodes[idx],
      toNode: nodes[idx + 1],
      d,
    };
  });
}

export function AdventureMap({
  course,
  progress,
  equippedCosmetics,
  onSelectNode,
  onSelectUnit,
  onStartTierCheckpoint,
}: AdventureMapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isCompactWidth, setIsCompactWidth] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 680 : false
  );

  // Track diorama container width dynamically so 7-node layout switches cleanly at 680px
  useEffect(() => {
    const el = rootRef.current;
    if (el && typeof ResizeObserver !== 'undefined') {
      const obs = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect?.width ?? 0;
        if (w > 0) {
          setIsCompactWidth(w < 680);
        }
      });
      obs.observe(el);
      return () => obs.disconnect();
    }

    if (typeof window !== 'undefined') {
      const onResize = () => setIsCompactWidth(window.innerWidth < 680);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    return undefined;
  }, []);

  const sortedUnits = useMemo<CourseUnit[]>(
    () =>
      [...course.units]
        .sort((a, b) => a.order - b.order)
        .map((unit) => ({
          ...unit,
          nodes: [...unit.nodes].sort((a, b) => a.order - b.order),
        })),
    [course.units]
  );

  const {
    completedSet,
    activeNodeId,
    activeUnitIdx,
    totalStars,
    maxStars,
    tierUnlockedMap,
    tierJumpUnitIdx,
    unlockedTierActiveNodeIds,
  } = useMemo(() => {
    const completed = new Set<string>([
      ...progress.completedNodeIds,
      ...progress.claimedChestIds,
    ]);
    const explicitlyUnlocked = new Set<ProficiencyTier>(progress.unlockedTiers ?? []);
    let firstActive: string | null = null;
    let firstActiveUnit = 0;
    let earnedStars = 0;
    let possibleStars = 0;

    const unlockedTiers: Record<ProficiencyTier, boolean> = {
      A1: true,
      A2: explicitlyUnlocked.has('A2'),
      B1: explicitlyUnlocked.has('B1'),
      B2: explicitlyUnlocked.has('B2'),
      C1_C2: explicitlyUnlocked.has('C1_C2'),
    };
    const tierFirstIdx: Partial<Record<ProficiencyTier, number>> = {};
    const tierActiveIdx: Partial<Record<ProficiencyTier, number>> = {};
    const tierFirstUncompleted = new Map<ProficiencyTier, string>();

    sortedUnits.forEach((unit, uIdx) => {
      const uTier = unit.proficiencyTier ?? resolveUnitProficiencyTier(unit.order);
      if (tierFirstIdx[uTier] === undefined) {
        tierFirstIdx[uTier] = uIdx;
      }
      for (const node of unit.nodes) {
        possibleStars += 3;
        if (completed.has(node.id)) {
          earnedStars += progress.nodeStars[node.id] ?? 3;
          unlockedTiers[uTier] = true;
        } else {
          if (firstActive === null) {
            firstActive = node.id;
            firstActiveUnit = uIdx;
          }
          if (tierActiveIdx[uTier] === undefined) {
            tierActiveIdx[uTier] = uIdx;
          }
          if (!tierFirstUncompleted.has(uTier) && explicitlyUnlocked.has(uTier)) {
            tierFirstUncompleted.set(uTier, node.id);
          }
        }
      }
    });

    if (firstActive === null && sortedUnits.length > 0) {
      firstActiveUnit = Math.min(
        Math.max(0, progress.currentUnitIndex),
        sortedUnits.length - 1
      );
    }

    const jumpIdx: Partial<Record<ProficiencyTier, number>> = {};
    for (const tier of PROFICIENCY_TIERS) {
      jumpIdx[tier] = tierActiveIdx[tier] ?? tierFirstIdx[tier];
    }

    return {
      completedSet: completed,
      activeNodeId: firstActive,
      activeUnitIdx: firstActiveUnit,
      totalStars: earnedStars,
      maxStars: possibleStars,
      tierUnlockedMap: unlockedTiers,
      tierJumpUnitIdx: jumpIdx,
      unlockedTierActiveNodeIds: tierFirstUncompleted,
    };
  }, [
    sortedUnits,
    progress.completedNodeIds,
    progress.claimedChestIds,
    progress.nodeStars,
    progress.currentUnitIndex,
    progress.unlockedTiers,
  ]);

  const [focusedUnitIdx, setFocusedUnitIdx] = useState<number>(activeUnitIdx);
  const [slideDir, setSlideDir] = useState<number>(1);
  const prevLangRef = useRef(course.language);
  const prevPropUnitIdxRef = useRef(progress.currentUnitIndex);
  const tabListRef = useRef<HTMLDivElement | null>(null);

  // Auto-focus the unit containing the current activeNodeId on language switch;
  // also follow explicit external currentUnitIndex updates on the same language.
  useEffect(() => {
    if (prevLangRef.current !== course.language) {
      prevLangRef.current = course.language;
      prevPropUnitIdxRef.current = progress.currentUnitIndex;
      setSlideDir(1);
      setFocusedUnitIdx(activeUnitIdx);
      return;
    }

    if (prevPropUnitIdxRef.current !== progress.currentUnitIndex) {
      prevPropUnitIdxRef.current = progress.currentUnitIndex;
      const clamped = Math.max(0, Math.min(progress.currentUnitIndex, Math.max(0, sortedUnits.length - 1)));
      if (clamped !== focusedUnitIdx) {
        setSlideDir(clamped >= focusedUnitIdx ? 1 : -1);
        setFocusedUnitIdx(clamped);
      }
    }
  }, [course.language, progress.currentUnitIndex, activeUnitIdx, sortedUnits.length, focusedUnitIdx]);

  const safeUnitIdx = Math.max(0, Math.min(focusedUnitIdx, Math.max(0, sortedUnits.length - 1)));
  const currentUnit = sortedUnits[safeUnitIdx];
  const palette = course.meta.accentPalette;
  const companionAvatar = COMPANION_AVATAR_MAP[course.meta.companionId];

  // Keep the active chapter tab centered in horizontal scroll strip on small viewports
  useEffect(() => {
    const listEl = tabListRef.current;
    if (!listEl || !currentUnit) return;
    const activeTab = listEl.querySelector(`[data-unit-tab="${currentUnit.id}"]`);
    if (activeTab && typeof (activeTab as HTMLElement).scrollIntoView === 'function') {
      try {
        (activeTab as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      } catch {
        // Ignore in minimal DOM environments
      }
    }
  }, [currentUnit]);

  const handleSelectChapter = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(nextIdx, Math.max(0, sortedUnits.length - 1)));
    setSlideDir(clamped >= safeUnitIdx ? 1 : -1);
    setFocusedUnitIdx(clamped);
    onSelectUnit?.(clamped);
  };

  const handleSelectTier = (tier: ProficiencyTier) => {
    const targetIdx = tierJumpUnitIdx[tier];
    if (targetIdx !== undefined) {
      handleSelectChapter(targetIdx);
    }
  };

  if (sortedUnits.length === 0 || !currentUnit) {
    return (
      <div
        ref={rootRef}
        data-course={course.language}
        style={{
          height: '100%',
          width: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          borderRadius: 24,
          backgroundColor: 'var(--card-bg, #ffffff)',
          color: 'var(--text-main, #0f172a)',
          borderStyle: 'solid',
          borderWidth: '2px 2px 4px 2px',
          borderColor: palette.primary,
          textAlign: 'center',
        }}
      >
        <FlagIcon language={course.language} size={42} />
        <h2 style={{ margin: '10px 0 4px' }}>{course.meta.landTitle}</h2>
        <p style={{ margin: 0, color: 'var(--text-muted, #475569)' }}>
          Charting your expedition with {course.meta.companionName}...
        </p>
      </div>
    );
  }

  const doneCount = currentUnit.nodes.filter((n) => completedSet.has(n.id)).length;
  const segments = buildPercentCurveSegments(currentUnit.nodes, isCompactWidth);
  const currentUnitTier: ProficiencyTier =
    currentUnit.proficiencyTier ?? resolveUnitProficiencyTier(currentUnit.order);
  const currentTierMeta = PROFICIENCY_TIER_META[currentUnitTier];
  const isCurrentTierLocked =
    currentUnitTier !== 'A1' && !tierUnlockedMap[currentUnitTier];

  return (
    <div
      ref={rootRef}
      data-course={course.language}
      style={{
        height: '100%',
        width: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflow: 'hidden',
        maxWidth: 960,
        margin: '0 auto',
      }}
    >
      {/* Top Compact Chapter Navigator Bar */}
      <section
        aria-label={`${course.meta.name} chapter navigator`}
        style={{
          flexShrink: 0,
          borderRadius: 20,
          padding: isCompactWidth ? '8px 10px' : '10px 14px',
          background: 'var(--card-bg, #ffffff)',
          color: 'var(--text-main, #0f172a)',
          borderStyle: 'solid',
          borderWidth: '2px 2px 4px 2px',
          borderColor: 'var(--card-border, #cbd5e1)',
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: isCompactWidth ? 6 : 10,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isCompactWidth ? 7 : 9,
              flex: '1 1 0%',
              minWidth: 0,
            }}
          >
            <span style={{ flexShrink: 0, display: 'inline-flex' }}>
              <AvatarBadge avatarId={companionAvatar} size={isCompactWidth ? 34 : 42} />
            </span>
            <div style={{ flex: '1 1 0%', minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isCompactWidth ? 5 : 6,
                  flexWrap: 'nowrap',
                  minWidth: 0,
                }}
              >
                <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                  <FlagIcon language={course.language} size={isCompactWidth ? 20 : 22} />
                </span>
                <h2
                  title={course.meta.landTitle}
                  style={{
                    margin: 0,
                    fontSize: isCompactWidth ? '0.94rem' : '1.15rem',
                    fontWeight: 900,
                    color: 'var(--text-main, #0f172a)',
                    lineHeight: 1.15,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {course.meta.landTitle}
                </h2>
              </div>
              <p
                title={`Guide: ${course.meta.companionName} • ${course.meta.companionRole}`}
                style={{
                  margin: '1px 0 0',
                  fontSize: isCompactWidth ? 11 : 11.5,
                  fontWeight: 700,
                  color: 'var(--text-muted, #475569)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Guide: {course.meta.companionName} • {course.meta.companionRole}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isCompactWidth ? 4 : 6, flexShrink: 0 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: isCompactWidth ? '3px 7px' : '4px 10px',
                borderRadius: 999,
                backgroundColor: '#FEF3C7',
                borderStyle: 'solid',
                borderWidth: '1.5px',
                borderColor: '#F59E0B',
                color: '#92400E',
                fontWeight: 800,
                fontSize: isCompactWidth ? 11 : 12,
                whiteSpace: 'nowrap',
              }}
            >
              <GoldStar filled size={isCompactWidth ? 12 : 13} />
              {totalStars}/{maxStars}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: isCompactWidth ? '3px 7px' : '4px 10px',
                borderRadius: 999,
                backgroundColor: '#EFF6FF',
                borderStyle: 'solid',
                borderWidth: '1.5px',
                borderColor: '#60A5FA',
                color: '#1D4ED8',
                fontWeight: 800,
                fontSize: isCompactWidth ? 11 : 12,
                whiteSpace: 'nowrap',
              }}
            >
              {progress.xpEarned} XP
            </span>
          </div>
        </div>

        {/* 5-Tier CEFR Atlas Ribbon (A1 Sprout · A2 Trailblazer · B1 Storyweaver · B2 Diplomat · C1+ Laureate) */}
        <div
          role="navigation"
          aria-label="CEFR proficiency tiers"
          data-cefr-ribbon="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isCompactWidth ? 4 : 6,
            marginTop: 7,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            paddingBottom: 1,
          }}
        >
          {PROFICIENCY_TIERS.map((tier) => {
            const meta = PROFICIENCY_TIER_META[tier];
            const hasUnits = tierJumpUnitIdx[tier] !== undefined;
            const isActiveTier = currentUnitTier === tier;
            const isUnlocked = tierUnlockedMap[tier];
            const compactLabel =
              tier === 'B2' ? 'Diplomat' : tier === 'C1_C2' ? 'Laureate' : meta.title;

            return (
              <motion.button
                key={tier}
                type="button"
                disabled={!hasUnits}
                data-tier-pill={tier}
                data-tier-locked={isUnlocked ? 'false' : 'true'}
                aria-pressed={isActiveTier}
                aria-label={`${meta.cefrLabel} ${meta.title}`}
                whileTap={hasUnits ? { scale: 0.96, y: 1 } : undefined}
                transition={{ type: 'spring', stiffness: 460, damping: 26 }}
                onClick={() => handleSelectTier(tier)}
                style={{
                  flex: isCompactWidth ? '0 0 auto' : '1 1 0%',
                  minWidth: isCompactWidth ? 'auto' : 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isCompactWidth ? 4 : 5,
                  padding: isCompactWidth ? '3px 8px' : '4px 9px',
                  borderRadius: 999,
                  fontSize: isCompactWidth ? 10.5 : 11,
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  cursor: hasUnits ? 'pointer' : 'not-allowed',
                  opacity: hasUnits ? 1 : 0.45,
                  backgroundColor: isActiveTier
                    ? meta.badgeColor
                    : isUnlocked
                      ? meta.surfaceTint
                      : 'var(--card-soft-bg, #f8fafc)',
                  color: isActiveTier ? '#FFFFFF' : 'var(--text-main, #0f172a)',
                  borderStyle: 'solid',
                  borderWidth: '1.5px 1.5px 3px 1.5px',
                  borderColor: isActiveTier
                    ? '#0F172A'
                    : isUnlocked
                      ? meta.badgeColor
                      : 'var(--card-border, #cbd5e1)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    flexShrink: 0,
                    backgroundColor: isActiveTier
                      ? '#FFFFFF'
                      : isUnlocked
                        ? meta.badgeColor
                        : '#94A3B8',
                  }}
                />
                <span style={{ fontWeight: 900 }}>{meta.cefrLabel}</span>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {isCompactWidth ? compactLabel : meta.title}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Chapter 1..16 Carousel Tabs with Prev / Next */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
          }}
        >
          <motion.button
            type="button"
            aria-label="Previous chapter"
            disabled={safeUnitIdx <= 0}
            whileHover={safeUnitIdx > 0 ? { scale: 1.06 } : undefined}
            whileTap={safeUnitIdx > 0 ? { scale: 0.92, y: 1 } : undefined}
            transition={{ type: 'spring', stiffness: 450, damping: 24 }}
            onClick={() => handleSelectChapter(safeUnitIdx - 1)}
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--card-soft-bg, #f8fafc)',
              color: 'var(--text-main, #0f172a)',
              borderStyle: 'solid',
              borderWidth: '2px 2px 3px 2px',
              borderColor: 'var(--card-border, #cbd5e1)',
              cursor: safeUnitIdx <= 0 ? 'not-allowed' : 'pointer',
              opacity: safeUnitIdx <= 0 ? 0.45 : 1,
              fontWeight: 900,
              fontSize: 12,
              padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10.5 3.5L5.5 8L10.5 12.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>

          <div
            ref={tabListRef}
            role="tablist"
            aria-label="Unit quick-jump tabs"
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: 2,
            }}
          >
            {sortedUnits.map((unit, idx) => {
              const unitDoneCount = unit.nodes.filter((n) => completedSet.has(n.id)).length;
              const isSelected = safeUnitIdx === idx;
              const unitComplete = unit.nodes.length > 0 && unitDoneCount === unit.nodes.length;
              const unitTier = unit.proficiencyTier ?? resolveUnitProficiencyTier(unit.order);
              const unitTierMeta = PROFICIENCY_TIER_META[unitTier];

              return (
                <motion.button
                  key={unit.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`Chapter ${unit.order}: ${unit.title}`}
                  data-unit-tab={unit.id}
                  data-unit-tier={unitTier}
                  whileTap={{ scale: 0.95, y: 1 }}
                  transition={{ type: 'spring', stiffness: 460, damping: 26 }}
                  onClick={() => handleSelectChapter(idx)}
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: isCompactWidth ? '4px 8px' : '5px 10px',
                    borderRadius: 11,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 800,
                    backgroundColor: isSelected
                      ? palette.primary
                      : 'var(--card-soft-bg, #f8fafc)',
                    color: isSelected ? '#FFFFFF' : 'var(--text-main, #0f172a)',
                    borderStyle: 'solid',
                    borderWidth: '2px 2px 3px 2px',
                    borderColor: isSelected ? palette.bevel : 'var(--card-border, #cbd5e1)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      flexShrink: 0,
                      backgroundColor: isSelected ? '#FDE047' : unitTierMeta.badgeColor,
                    }}
                  />
                  <span>{isCompactWidth ? `Ch ${unit.order}` : `Unit ${unit.order}`}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '0 5px',
                      borderRadius: 999,
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.22)'
                        : unitComplete
                          ? '#DCFCE7'
                          : 'rgba(148, 163, 184, 0.2)',
                      color: isSelected
                        ? '#FFFFFF'
                        : unitComplete
                          ? '#15803D'
                          : 'var(--text-muted, #475569)',
                    }}
                  >
                    {unitDoneCount}/{unit.nodes.length}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <motion.button
            type="button"
            aria-label="Next chapter"
            disabled={safeUnitIdx >= sortedUnits.length - 1}
            whileHover={safeUnitIdx < sortedUnits.length - 1 ? { scale: 1.06 } : undefined}
            whileTap={safeUnitIdx < sortedUnits.length - 1 ? { scale: 0.92, y: 1 } : undefined}
            transition={{ type: 'spring', stiffness: 450, damping: 24 }}
            onClick={() => handleSelectChapter(safeUnitIdx + 1)}
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--card-soft-bg, #f8fafc)',
              color: 'var(--text-main, #0f172a)',
              borderStyle: 'solid',
              borderWidth: '2px 2px 3px 2px',
              borderColor: 'var(--card-border, #cbd5e1)',
              cursor: safeUnitIdx >= sortedUnits.length - 1 ? 'not-allowed' : 'pointer',
              opacity: safeUnitIdx >= sortedUnits.length - 1 ? 0.45 : 1,
              fontWeight: 900,
              fontSize: 12,
              padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M5.5 3.5L10.5 8L5.5 12.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        </div>
      </section>

      {/* Full-Frame Single-Chapter Interactive Diorama */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={currentUnit.id}
            data-unit-id={currentUnit.id}
            initial={{ opacity: 0, x: slideDir * 36, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -slideDir * 36, scale: 0.985 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 24,
              overflow: 'hidden',
              borderStyle: 'solid',
              borderWidth: '2.5px 2.5px 5px 2.5px',
              borderColor: 'var(--card-border, #cbd5e1)',
              backgroundColor: 'var(--card-bg, #ffffff)',
              boxShadow: '0 10px 26px rgba(15, 23, 42, 0.1)',
            }}
          >
            {/* Compact Unit Header */}
            <header
              style={{
                flexShrink: 0,
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexWrap: isCompactWidth ? 'wrap' : 'nowrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: isCompactWidth ? 6 : 10,
                padding: isCompactWidth ? '7px 10px' : '10px 16px',
                backgroundColor: currentUnit.themeColor || palette.primary,
                color: '#FFFFFF',
                borderBottomStyle: 'solid',
                borderBottomWidth: 3,
                borderBottomColor: 'rgba(15, 23, 42, 0.22)',
              }}
            >
              <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span
                    style={{
                      flexShrink: 0,
                      padding: '1px 7px',
                      borderRadius: 999,
                      backgroundColor: currentTierMeta.badgeColor,
                      color: '#FFFFFF',
                      border: '1px solid rgba(255,255,255,0.45)',
                      fontSize: isCompactWidth ? 9.5 : 10,
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {currentTierMeta.cefrLabel}
                  </span>
                  <span
                    title={`Unit ${currentUnit.order} • ${currentUnit.culturalLandmark}`}
                    style={{
                      display: 'inline-block',
                      maxWidth: '100%',
                      padding: '1px 8px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(15, 23, 42, 0.26)',
                      fontSize: isCompactWidth ? 10 : 10.5,
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Unit {currentUnit.order} • {currentUnit.culturalLandmark}
                  </span>
                </div>
                <h3
                  title={currentUnit.title}
                  style={{
                    margin: '2px 0 0',
                    fontSize: isCompactWidth ? 14.5 : 17,
                    fontWeight: 900,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentUnit.title}
                </h3>
                {!isCompactWidth && (
                  <p
                    title={currentUnit.subtitle}
                    style={{
                      margin: '1px 0 0',
                      fontSize: 12,
                      fontWeight: 600,
                      opacity: 0.92,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {currentUnit.subtitle}
                  </p>
                )}
              </div>

              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {currentUnitTier !== 'A1' && isCurrentTierLocked && (
                  <motion.button
                    type="button"
                    data-tier-checkpoint={currentUnitTier}
                    aria-label={`Test into ${currentTierMeta.cefrLabel}`}
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95, y: 1 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                    onClick={() => onStartTierCheckpoint?.(currentUnitTier)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: isCompactWidth ? '4px 9px' : '5px 12px',
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, #FEF08A 0%, #FACC15 100%)',
                      color: '#0F172A',
                      borderStyle: 'solid',
                      borderWidth: '2px 2px 3.5px 2px',
                      borderColor: '#92400E',
                      fontWeight: 900,
                      fontSize: isCompactWidth ? 11 : 12,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
                    }}
                  >
                    <GoldStar filled size={isCompactWidth ? 12 : 14} />
                    <span>Test into {currentTierMeta.cefrLabel}</span>
                  </motion.button>
                )}

                <div
                  style={{
                    flexShrink: 0,
                    padding: isCompactWidth ? '3px 8px' : '4px 10px',
                    borderRadius: 12,
                    backgroundColor: 'rgba(255, 255, 255, 0.22)',
                    borderStyle: 'solid',
                    borderWidth: 1.5,
                    borderColor: 'rgba(255, 255, 255, 0.45)',
                    fontWeight: 800,
                    fontSize: isCompactWidth ? 11 : 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {doneCount} / {currentUnit.nodes.length} Stops
                </div>
              </div>
            </header>

            {/* Non-Scrolling Percentage Diorama Trail Stage */}
            <div
              style={{
                position: 'relative',
                flex: '1 1 0%',
                width: '100%',
                minHeight: 'min(220px, 32dvh)',
                overflow: 'hidden',
              }}
            >
              <RegionalScenery
                language={course.language}
                unitOrder={currentUnit.order}
                proficiencyTier={currentUnitTier}
              />

              {/* Smooth Percentage S-Curve Vector Path */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                {segments.map((seg) => {
                  const isTrailLit = completedSet.has(seg.fromNode.id);
                  return (
                    <g key={seg.id}>
                      <path
                        d={seg.d}
                        fill="none"
                        stroke="rgba(15, 23, 42, 0.18)"
                        strokeWidth={isCompactWidth ? '12' : '15'}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d={seg.d}
                        fill="none"
                        stroke={isTrailLit ? '#FEF3C7' : '#F8FAFC'}
                        strokeWidth={isCompactWidth ? '8' : '10'}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d={seg.d}
                        fill="none"
                        stroke={isTrailLit ? palette.primary : '#94A3B8'}
                        strokeWidth={isCompactWidth ? '3' : '3.8'}
                        strokeDasharray={isTrailLit ? 'none' : '7 7'}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* All Unit Nodes Positioned Cleanly via Percentage Coordinates */}
              {currentUnit.nodes.map((node, nodeIdx) => {
                const isCompleted = completedSet.has(node.id);
                const isActive =
                  !isCompleted &&
                  (activeNodeId === node.id ||
                    unlockedTierActiveNodeIds.get(currentUnitTier) === node.id);
                const state: 'completed' | 'active' | 'locked' = isCompleted
                  ? 'completed'
                  : isActive
                    ? 'active'
                    : 'locked';

                const { x: xPct, y: yPct } = getNodeCoords(
                  nodeIdx,
                  currentUnit.nodes.length,
                  isCompactWidth
                );

                const buttonSize = isCompactWidth
                  ? node.nodeType === 'boss'
                    ? 54
                    : 48
                  : node.nodeType === 'boss'
                    ? 66
                    : 58;

                const stars = isCompleted ? progress.nodeStars[node.id] ?? 3 : 0;

                const buttonBg =
                  state === 'locked'
                    ? '#E2E8F0'
                    : node.nodeType === 'chest'
                      ? '#F59E0B'
                      : node.nodeType === 'boss'
                        ? '#E11D48'
                        : node.nodeType === 'story'
                          ? '#7C3AED'
                          : state === 'completed'
                            ? '#16A34A'
                            : palette.primary;

                const buttonBevel =
                  state === 'locked'
                    ? '#94A3B8'
                    : node.nodeType === 'chest'
                      ? '#92400E'
                      : node.nodeType === 'boss'
                        ? '#9F1239'
                        : node.nodeType === 'story'
                          ? '#5B21B6'
                          : state === 'completed'
                            ? '#166534'
                            : palette.bevel;

                const pipOnLeft = xPct > 55;
                const pipSize = isCompactWidth ? 46 : 58;

                return (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      left: `${xPct}%`,
                      top: `${yPct}%`,
                      width: buttonSize,
                      height: buttonSize,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isActive ? 5 : 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Live Pip Explorer cheering beside the Active Node */}
                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          top: isCompactWidth ? -4 : -8,
                          ...(pipOnLeft
                            ? { right: buttonSize + (isCompactWidth ? 6 : 12) }
                            : { left: buttonSize + (isCompactWidth ? 6 : 12) }),
                          pointerEvents: 'none',
                          zIndex: 6,
                        }}
                      >
                        <MascotStage
                          companionId="pip"
                          pose="happy"
                          equippedCosmetics={equippedCosmetics}
                          size={pipSize}
                        />
                      </div>
                    )}

                    {/* Pulsing Starlight Compass Beacon */}
                    {isActive && (
                      <motion.div
                        aria-hidden="true"
                        animate={{ scale: [1, 1.28, 1], opacity: [0.74, 0.16, 0.74] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          position: 'absolute',
                          inset: isCompactWidth ? -7 : -9,
                          borderRadius: '50%',
                          borderStyle: 'solid',
                          borderWidth: 3.5,
                          borderColor: palette.secondary,
                          backgroundColor: 'rgba(250, 204, 21, 0.24)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    {/* Floating START! CTA Badge */}
                    {isActive && (
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 6px)',
                          left: '50%',
                          x: '-50%',
                          padding: isCompactWidth ? '1px 8px' : '2px 10px',
                          borderRadius: 999,
                          backgroundColor: '#0F172A',
                          color: '#FDE047',
                          fontSize: isCompactWidth ? 9.5 : 10.5,
                          fontWeight: 900,
                          letterSpacing: '0.06em',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 10px rgba(15, 23, 42, 0.24)',
                          pointerEvents: 'none',
                        }}
                      >
                        {node.nodeType === 'boss'
                          ? 'CHALLENGE!'
                          : node.nodeType === 'chest'
                            ? 'OPEN!'
                            : 'START!'}
                      </motion.div>
                    )}

                    {/* Tactile 3D-Bevel Node Medallion Button */}
                    <motion.button
                      type="button"
                      disabled={state === 'locked'}
                      data-node-id={node.id}
                      data-node-state={state}
                      data-node-type={node.nodeType}
                      aria-label={`${node.title} (${NODE_TYPE_LABELS[node.nodeType]}) — ${
                        state === 'completed'
                          ? `Completed with ${stars} stars`
                          : state === 'active'
                            ? 'Ready to play'
                            : 'Locked'
                      }`}
                      whileHover={state !== 'locked' ? { scale: 1.09, y: -3 } : undefined}
                      whileTap={state !== 'locked' ? { scale: 0.94, y: 2 } : undefined}
                      transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                      onClick={() => {
                        if (state !== 'locked') {
                          onSelectNode(node);
                        }
                      }}
                      style={{
                        position: 'relative',
                        width: buttonSize,
                        height: buttonSize,
                        borderRadius: '50%',
                        backgroundColor: buttonBg,
                        borderStyle: 'solid',
                        borderWidth: isCompactWidth ? '2.5px 2.5px 5px 2.5px' : '3px 3px 6px 3px',
                        borderTopColor: state === 'locked' ? '#94A3B8' : '#0F172A',
                        borderRightColor: state === 'locked' ? '#94A3B8' : '#0F172A',
                        borderLeftColor: state === 'locked' ? '#94A3B8' : '#0F172A',
                        borderBottomColor: buttonBevel,
                        boxShadow: isActive
                          ? `0 6px 18px ${palette.glow}`
                          : '0 4px 10px rgba(15, 23, 42, 0.16)',
                        cursor: state === 'locked' ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        opacity: state === 'locked' ? 0.88 : 1,
                      }}
                    >
                      <div style={{ transform: isCompactWidth ? 'scale(0.84)' : 'scale(0.95)', display: 'flex' }}>
                        <MapNodeIcon nodeType={node.nodeType} state={state} />
                      </div>
                      {state === 'locked' && (
                        <span
                          style={{
                            position: 'absolute',
                            right: -4,
                            bottom: -4,
                            backgroundColor: '#FFFFFF',
                            borderRadius: '50%',
                            padding: 2,
                            borderStyle: 'solid',
                            borderWidth: 1.5,
                            borderColor: '#64748B',
                            display: 'inline-flex',
                          }}
                        >
                          <PadlockBadge />
                        </span>
                      )}
                    </motion.button>

                    {/* Stars & Node Title Pill anchored cleanly beneath */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 2px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 'max-content',
                        maxWidth: isCompactWidth ? 102 : 134,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      {isCompleted && (
                        <div
                          aria-label={`${stars} of 3 stars`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            marginTop: -7,
                            zIndex: 4,
                            padding: '1px 5px',
                            borderRadius: 999,
                            backgroundColor: '#FFFFFF',
                            borderStyle: 'solid',
                            borderWidth: 1.5,
                            borderColor: '#F59E0B',
                          }}
                        >
                          {[1, 2, 3].map((n) => (
                            <GoldStar key={n} filled={n <= stars} size={isCompactWidth ? 11 : 13} />
                          ))}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: 2,
                          padding: isCompactWidth ? '1px 6px' : '2px 8px',
                          borderRadius: 9,
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderStyle: 'solid',
                          borderWidth: 1.5,
                          borderColor: 'rgba(15, 23, 42, 0.14)',
                          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
                          textAlign: 'center',
                          maxWidth: isCompactWidth ? 98 : 138,
                        }}
                      >
                        <div
                          style={{
                            fontSize: isCompactWidth ? 9.5 : 10.5,
                            fontWeight: 800,
                            color: state === 'locked' ? '#64748B' : '#0F172A',
                            lineHeight: 1.18,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {node.title}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Expedition Mastered Ribbon overlay when entire course is complete */}
              {activeNodeId === null && doneCount === currentUnit.nodes.length && (
                <div
                  aria-label="Expedition mastered"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 8,
                    transform: 'translateX(-50%)',
                    maxWidth: 'calc(100% - 20px)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    zIndex: 6,
                    padding: '4px 12px',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                    borderStyle: 'solid',
                    borderWidth: '2px 2px 3px 2px',
                    borderColor: '#F59E0B',
                    color: '#78350F',
                    fontSize: isCompactWidth ? 10.5 : 11,
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.14)',
                    pointerEvents: 'none',
                  }}
                >
                  {course.meta.landTitle} Mastered! ({totalStars}/{maxStars} Stars)
                </div>
              )}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
