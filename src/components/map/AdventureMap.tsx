import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AvatarBadge } from '../../art/AvatarBadge';
import { FlagIcon } from '../../art/FlagIcon';
import type {
  AvatarId,
  CompanionId,
  CourseUnit,
  EquippedCosmetics,
  LanguageCourse,
  LanguageProgressState,
  MapNode,
  MapNodeType,
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

const ROW_HEIGHT = 114;

function getNodeXPct(indexInUnit: number, totalInUnit: number): number {
  if (totalInUnit <= 1 || indexInUnit === 0 || indexInUnit === totalInUnit - 1) {
    return 50;
  }
  const wave = Math.sin(indexInUnit * 1.02) * 24;
  return Math.round((50 + wave) * 10) / 10;
}

function buildCurveSegments(nodes: readonly MapNode[]) {
  const points = nodes.map((_, idx) => ({
    x: getNodeXPct(idx, nodes.length),
    y: idx * ROW_HEIGHT + ROW_HEIGHT / 2,
  }));

  return points.slice(0, -1).map((from, idx) => {
    const to = points[idx + 1];
    const midY = (from.y + to.y) / 2;
    return {
      id: `${nodes[idx].id}->${nodes[idx + 1].id}`,
      fromNode: nodes[idx],
      toNode: nodes[idx + 1],
      d: `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`,
    };
  });
}

export function AdventureMap({
  course,
  progress,
  equippedCosmetics,
  onSelectNode,
  onSelectUnit,
}: AdventureMapProps) {
  const unitRefs = useRef<Record<string, HTMLElement | null>>({});
  const [focusedUnitIdx, setFocusedUnitIdx] = useState(progress.currentUnitIndex);

  useEffect(() => {
    setFocusedUnitIdx(progress.currentUnitIndex);
  }, [progress.currentUnitIndex]);

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

  const { completedSet, activeNodeId, totalStars, maxStars } = useMemo(() => {
    const completed = new Set<string>([
      ...progress.completedNodeIds,
      ...progress.claimedChestIds,
    ]);
    let firstActive: string | null = null;
    let earnedStars = 0;
    let possibleStars = 0;

    for (const unit of sortedUnits) {
      for (const node of unit.nodes) {
        possibleStars += 3;
        if (completed.has(node.id)) {
          earnedStars += progress.nodeStars[node.id] ?? 3;
        } else if (firstActive === null) {
          firstActive = node.id;
        }
      }
    }

    return {
      completedSet: completed,
      activeNodeId: firstActive,
      totalStars: earnedStars,
      maxStars: possibleStars,
    };
  }, [sortedUnits, progress.completedNodeIds, progress.claimedChestIds, progress.nodeStars]);

  const palette = course.meta.accentPalette;
  const companionAvatar = COMPANION_AVATAR_MAP[course.meta.companionId];

  const handleUnitJump = (unitIdx: number, unitId: string) => {
    setFocusedUnitIdx(unitIdx);
    onSelectUnit?.(unitIdx);
    const el = unitRefs.current[unitId];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (sortedUnits.length === 0) {
    return (
      <div
        data-course={course.language}
        style={{
          padding: 24,
          borderRadius: 24,
          backgroundColor: palette.surfaceTint,
          border: `2px solid ${palette.primary}`,
          textAlign: 'center',
        }}
      >
        <FlagIcon language={course.language} size={42} />
        <h2 style={{ margin: '10px 0 4px', color: '#0F172A' }}>{course.meta.landTitle}</h2>
        <p style={{ margin: 0, color: '#475569' }}>
          Charting your expedition with {course.meta.companionName}...
        </p>
      </div>
    );
  }

  return (
    <div
      data-course={course.language}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        width: '100%',
        maxWidth: 860,
        margin: '0 auto',
      }}
    >
      {/* Land Explorer Banner & Unit Quick-Jump Tabs */}
      <section
        aria-label={`${course.meta.name} expedition header`}
        style={{
          borderRadius: 24,
          padding: '16px 18px',
          background: `linear-gradient(135deg, ${palette.surfaceTint} 0%, #FFFFFF 100%)`,
          border: `2.5px solid ${palette.primary}`,
          borderBottomWidth: 5,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AvatarBadge avatarId={companionAvatar} size={50} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <FlagIcon language={course.language} size={26} />
                <h2
                  style={{
                    margin: 0,
                    fontSize: 'clamp(1.1rem, 2.5vw, 1.45rem)',
                    fontWeight: 900,
                    color: '#0F172A',
                  }}
                >
                  {course.meta.landTitle}
                </h2>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: '#475569' }}>
                Guide: {course.meta.companionName} ({course.meta.companionRole})
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 999,
                backgroundColor: '#FEF3C7',
                border: '2px solid #F59E0B',
                color: '#92400E',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              <GoldStar filled size={15} />
              {totalStars}/{maxStars}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 12px',
                borderRadius: 999,
                backgroundColor: '#EFF6FF',
                border: '2px solid #60A5FA',
                color: '#1D4ED8',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {progress.xpEarned} XP
            </span>
          </div>
        </div>

        {/* Unit Quick-Jump Tabs */}
        <div
          role="tablist"
          aria-label="Unit quick-jump tabs"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 14,
          }}
        >
          {sortedUnits.map((unit, idx) => {
            const doneCount = unit.nodes.filter((n) => completedSet.has(n.id)).length;
            const isSelected = focusedUnitIdx === idx;
            const unitComplete = unit.nodes.length > 0 && doneCount === unit.nodes.length;

            return (
              <button
                key={unit.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                data-unit-tab={unit.id}
                onClick={() => handleUnitJump(idx, unit.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 13px',
                  borderRadius: 14,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 800,
                  backgroundColor: isSelected ? palette.primary : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#1E293B',
                  border: `2px solid ${isSelected ? palette.bevel : '#CBD5E1'}`,
                  borderBottomWidth: 4,
                  transition: 'transform 0.12s ease',
                }}
              >
                <span>Unit {unit.order}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    backgroundColor: isSelected
                      ? 'rgba(255,255,255,0.22)'
                      : unitComplete
                        ? '#DCFCE7'
                        : '#F1F5F9',
                    color: isSelected ? '#FFFFFF' : unitComplete ? '#15803D' : '#475569',
                  }}
                >
                  {doneCount}/{unit.nodes.length}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Units & Winding S-Curve Trails */}
      {sortedUnits.map((unit, unitIdx) => {
        const doneCount = unit.nodes.filter((n) => completedSet.has(n.id)).length;
        const unitHeight = Math.max(unit.nodes.length * ROW_HEIGHT, 240);
        const segments = buildCurveSegments(unit.nodes);

        return (
          <section
            key={unit.id}
            ref={(el) => {
              unitRefs.current[unit.id] = el;
            }}
            data-unit-id={unit.id}
            style={{
              position: 'relative',
              borderRadius: 28,
              overflow: 'hidden',
              border: '2.5px solid #CBD5E1',
              borderBottomWidth: 5,
              backgroundColor: palette.surfaceTint,
              boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)',
            }}
          >
            {/* Unit Header */}
            <header
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '14px 18px',
                backgroundColor: unit.themeColor || palette.primary,
                color: '#FFFFFF',
                borderBottom: `4px solid rgba(15, 23, 42, 0.22)`,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      padding: '2px 10px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(15, 23, 42, 0.24)',
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Unit {unit.order} • {unit.culturalLandmark}
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 2px', fontSize: 19, fontWeight: 900 }}>
                  {unit.title}
                </h3>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, opacity: 0.92 }}>
                  {unit.subtitle}
                </p>
              </div>

              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: 14,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1.5px solid rgba(255, 255, 255, 0.45)',
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                {doneCount} / {unit.nodes.length} Stops
              </div>
            </header>

            {/* Bespoke Regional Scenery + S-Curve Trail Stage */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: unitHeight,
                overflow: 'hidden',
              }}
            >
              <RegionalScenery language={course.language} unitOrder={unit.order || unitIdx + 1} />

              {/* Winding S-Curve Vector Path */}
              <svg
                viewBox={`0 0 100 ${unitHeight}`}
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
                      {/* Outer cobblestone shadow */}
                      <path
                        d={seg.d}
                        fill="none"
                        stroke="rgba(15, 23, 42, 0.16)"
                        strokeWidth="16"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Track core */}
                      <path
                        d={seg.d}
                        fill="none"
                        stroke={isTrailLit ? '#FEF3C7' : '#F8FAFC'}
                        strokeWidth="11"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Inner traveler dashes */}
                      <path
                        d={seg.d}
                        fill="none"
                        stroke={isTrailLit ? palette.primary : '#94A3B8'}
                        strokeWidth="4"
                        strokeDasharray={isTrailLit ? 'none' : '8 8'}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Interactive Expedition Nodes */}
              {unit.nodes.map((node, nodeIdx) => {
                const isCompleted = completedSet.has(node.id);
                const isActive = !isCompleted && activeNodeId === node.id;
                const state: 'completed' | 'active' | 'locked' = isCompleted
                  ? 'completed'
                  : isActive
                    ? 'active'
                    : 'locked';

                const xPct = getNodeXPct(nodeIdx, unit.nodes.length);
                const yPx = nodeIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
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

                return (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      left: `${xPct}%`,
                      top: yPx,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isActive ? 5 : 3,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    {/* Live Pip Explorer Companion cheering beside the Active Node! */}
                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -12,
                          ...(pipOnLeft ? { right: 86 } : { left: 86 }),
                          pointerEvents: 'none',
                          zIndex: 6,
                        }}
                      >
                        <MascotStage
                          companionId="pip"
                          pose="happy"
                          equippedCosmetics={equippedCosmetics}
                          size={66}
                        />
                      </div>
                    )}

                    {/* Pulsing Compass Beacon Halo on Active Node */}
                    {isActive && (
                      <motion.div
                        aria-hidden="true"
                        animate={{ scale: [1, 1.32, 1], opacity: [0.72, 0.15, 0.72] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          position: 'absolute',
                          top: -9,
                          width: 82,
                          height: 82,
                          borderRadius: '50%',
                          border: `4px solid ${palette.secondary}`,
                          backgroundColor: 'rgba(250, 204, 21, 0.22)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    {/* Floating START CTA Tag for Active Node */}
                    {isActive && (
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          position: 'absolute',
                          top: -28,
                          padding: '2px 10px',
                          borderRadius: 999,
                          backgroundColor: '#0F172A',
                          color: '#FDE047',
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: '0.06em',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 10px rgba(15, 23, 42, 0.22)',
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
                    <button
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
                      onClick={() => {
                        if (state !== 'locked') {
                          onSelectNode(node);
                        }
                      }}
                      style={{
                        position: 'relative',
                        width: node.nodeType === 'boss' ? 72 : 64,
                        height: node.nodeType === 'boss' ? 72 : 64,
                        borderRadius: '50%',
                        backgroundColor: buttonBg,
                        border: `3px solid ${state === 'locked' ? '#94A3B8' : '#0F172A'}`,
                        borderBottomWidth: 6,
                        borderBottomColor: buttonBevel,
                        boxShadow: isActive
                          ? `0 8px 20px ${palette.glow}`
                          : '0 5px 12px rgba(15, 23, 42, 0.16)',
                        cursor: state === 'locked' ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        transition: 'transform 0.12s ease',
                        opacity: state === 'locked' ? 0.85 : 1,
                      }}
                    >
                      <MapNodeIcon nodeType={node.nodeType} state={state} />
                      {state === 'locked' && (
                        <span
                          style={{
                            position: 'absolute',
                            right: -4,
                            bottom: -4,
                            backgroundColor: '#FFFFFF',
                            borderRadius: '50%',
                            padding: 2,
                            border: '1.5px solid #64748B',
                            display: 'inline-flex',
                          }}
                        >
                          <PadlockBadge />
                        </span>
                      )}
                    </button>

                    {/* 1–3 Gold Stars for Completed Nodes */}
                    {isCompleted && (
                      <div
                        aria-label={`${stars} of 3 stars`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          marginTop: -6,
                          zIndex: 4,
                          padding: '1px 6px',
                          borderRadius: 999,
                          backgroundColor: '#FFFFFF',
                          border: '1.5px solid #F59E0B',
                        }}
                      >
                        {[1, 2, 3].map((n) => (
                          <GoldStar key={n} filled={n <= stars} size={13} />
                        ))}
                      </div>
                    )}

                    {/* Node Title Pill */}
                    <div
                      style={{
                        marginTop: 4,
                        padding: '2px 9px',
                        borderRadius: 10,
                        backgroundColor: 'rgba(255, 255, 255, 0.94)',
                        border: '1.5px solid rgba(15, 23, 42, 0.14)',
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
                        textAlign: 'center',
                        maxWidth: 136,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: state === 'locked' ? '#64748B' : '#0F172A',
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {node.title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {activeNodeId === null && sortedUnits.length > 0 && (
        <section
          aria-label="Expedition mastered"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '16px 20px',
            borderRadius: 24,
            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
            border: '2.5px solid #F59E0B',
            borderBottomWidth: 5,
            boxShadow: '0 8px 20px rgba(245, 158, 11, 0.2)',
          }}
        >
          <MascotStage
            companionId="pip"
            pose="victory_dance"
            equippedCosmetics={equippedCosmetics}
            comboCount={6}
            size={76}
          />
          <div>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#78350F' }}>
              {course.meta.landTitle} Mastered!
            </h4>
            <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: '#92400E' }}>
              Every stop unlocked with {totalStars}/{maxStars} stars! Replay any node anytime for bonus combos.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
