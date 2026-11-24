import { useMemo, useState } from 'react';
import { Award, CheckCircle2, Crown, Sparkles, Trophy } from 'lucide-react';
import { AvatarBadge } from '../../art/AvatarBadge';
import { VocabIllustration } from '../../art/VocabIllustration';
import {
  BADGE_CATALOG,
  LEAGUE_TIER_META,
  buildWeeklyLeaderboard,
  getBadgeProgress,
} from '../../core';
import { playSfx } from '../../audio';
import { useVaultStore } from '../../store/useVaultStore';
import type { LeagueTier } from '../../types/contracts';

const ALL_LEAGUE_TIERS: readonly LeagueTier[] = [
  'bronze_acorn',
  'silver_compass',
  'gold_feather',
  'sapphire_sky',
  'starlight_legend',
  'emerald_diplomat',
  'amethyst_symposium',
  'grand_polyglot_laureate',
];

type LeagueMetaEntry = { label: string; minXpHint: number; color: string; crestBg: string };

export function LeagueAndBadges() {
  const { activeProfile } = useVaultStore();
  const [mobileView, setMobileView] = useState<'league' | 'badges'>('league');

  const tierMetaMap = LEAGUE_TIER_META as Partial<Record<LeagueTier, LeagueMetaEntry>>;
  const visibleTiers = useMemo(
    () => ALL_LEAGUE_TIERS.filter((tier) => Boolean(tierMetaMap[tier])),
    [tierMetaMap]
  );
  const tierMeta = tierMetaMap[activeProfile.leagueTier] ?? LEAGUE_TIER_META.bronze_acorn;
  const leaderboard = useMemo(
    () => buildWeeklyLeaderboard(activeProfile),
    [activeProfile]
  );

  const podiumTop3 = useMemo(() => {
    const first = leaderboard.find((e) => e.rank === 1) ?? leaderboard[0];
    const second = leaderboard.find((e) => e.rank === 2);
    const third = leaderboard.find((e) => e.rank === 3);
    return [second, first, third].filter((e): e is NonNullable<typeof e> => Boolean(e));
  }, [leaderboard]);

  return (
    <section
      aria-label="Leagues and Badges"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        overflow: 'hidden',
      }}
    >
      {/* Narrow-Screen Toggle Bar */}
      <div className="leagues-mobile-tabs">
        <button
          type="button"
          className={`tactile-btn ${mobileView === 'league' ? 'tactile-btn-primary' : 'tactile-btn-soft'}`}
          style={{ flex: 1, padding: '7px 10px', fontSize: '0.84rem' }}
          onClick={() => {
            playSfx('tile_tap');
            setMobileView('league');
          }}
        >
          <Trophy size={15} /> Weekly League
        </button>
        <button
          type="button"
          className={`tactile-btn ${mobileView === 'badges' ? 'tactile-btn-primary' : 'tactile-btn-soft'}`}
          style={{ flex: 1, padding: '7px 10px', fontSize: '0.84rem' }}
          onClick={() => {
            playSfx('tile_tap');
            setMobileView('badges');
          }}
        >
          <Award size={15} /> Badges ({activeProfile.badges.length} / {BADGE_CATALOG.length})
        </button>
      </div>

      <div className="leagues-console-grid">
        {/* Left Pane: Weekly League Podium + Rival Table */}
        <div
          className={`tactile-card leagues-pane-card ${
            mobileView !== 'league' ? 'is-hidden-mobile' : ''
          }`}
          style={{
            padding: 15,
            borderColor: tierMeta.color,
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: tierMeta.color,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trophy size={22} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.16rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    {tierMeta.label} League
                  </h1>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Weekly score: <strong>{activeProfile.weeklyXp} XP</strong>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="console-scroll-pane-x"
              style={{
                display: 'flex',
                gap: 4,
                flexWrap: 'nowrap',
                overflowX: 'auto',
                paddingBottom: 2,
              }}
            >
              {visibleTiers.map((tier) => {
                const m = tierMetaMap[tier]!;
                const isCurrent = tier === activeProfile.leagueTier;
                return (
                  <span
                    key={tier}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: isCurrent ? m.color : 'var(--card-soft-bg)',
                      border: `1.5px solid ${isCurrent ? m.color : 'var(--card-border)'}`,
                      color: isCurrent ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {m.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Internally Bounded Scrollable Podium & Rivals */}
          <div className="console-scroll-pane" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
            {podiumTop3.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${podiumTop3.length}, minmax(0, 1fr))`,
                  alignItems: 'end',
                  gap: 8,
                  paddingTop: 4,
                }}
              >
                {podiumTop3.map((entry) => {
                  const isFirst = entry.rank === 1;
                  return (
                    <div
                      key={entry.id}
                      className={`cozy-podium-plinth is-rank-${entry.rank}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: isFirst ? '12px 8px' : '8px 6px',
                        minHeight: isFirst ? 128 : entry.rank === 2 ? 108 : 98,
                        justifyContent: 'flex-end',
                        borderRadius: 16,
                        background: entry.isPlayer ? 'var(--tint-indigo-bg)' : 'var(--card-soft-bg)',
                        borderTopWidth: 2,
                        borderRightWidth: 2,
                        borderLeftWidth: 2,
                        borderBottomWidth: 4,
                        borderStyle: 'solid',
                        borderColor: isFirst
                          ? '#f59e0b'
                          : entry.isPlayer
                            ? 'var(--lang-primary)'
                            : 'var(--card-border)',
                        textAlign: 'center',
                      }}
                    >
                      {isFirst ? <Crown size={18} color="#f59e0b" /> : null}
                      <AvatarBadge avatarId={entry.avatarId} size={isFirst ? 42 : 34} />
                      <div style={{ fontWeight: 900, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                        #{entry.rank} {entry.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--lang-primary)' }}>
                        {entry.weeklyXp} XP
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {leaderboard.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 14,
                    background: entry.isPlayer ? 'var(--tint-indigo-bg)' : 'var(--card-soft-bg)',
                    border: `2px solid ${entry.isPlayer ? 'var(--lang-primary)' : 'var(--card-border)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 24, fontWeight: 900, color: 'var(--text-muted)' }}>
                      #{entry.rank}
                    </span>
                    <AvatarBadge avatarId={entry.avatarId} size={28} />
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      {entry.name}
                    </strong>
                    {entry.isPlayer ? (
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: 999,
                          background: 'var(--lang-primary)',
                          color: '#ffffff',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                        }}
                      >
                        YOU
                      </span>
                    ) : null}
                  </div>
                  <span style={{ fontWeight: 900, color: 'var(--text-main)', fontSize: '0.86rem' }}>
                    {entry.weeklyXp} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Pane: All 24 Expedition Achievement Badges */}
        <div
          className={`tactile-card leagues-pane-card ${
            mobileView !== 'badges' ? 'is-hidden-mobile' : ''
          }`}
          style={{
            padding: 15,
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Award size={20} color="#f59e0b" />
            <h2 style={{ margin: 0, fontSize: '1.16rem', fontWeight: 900, color: 'var(--text-main)' }}>
              Expedition Badges ({activeProfile.badges.length} / {BADGE_CATALOG.length})
            </h2>
          </div>

          <div className="console-scroll-pane" style={{ flex: '1 1 auto', paddingRight: 4 }}>
            {BADGE_CATALOG.length === 0 ? (
              <div style={{ padding: 16, fontWeight: 700, color: 'var(--text-muted)' }}>
                Complete lessons, collect stickers, and play Sky-Catcher Fiesta to earn badges!
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
                  gap: 10,
                  paddingBottom: 4,
                }}
              >
                {BADGE_CATALOG.map((badge) => {
                  const progress = getBadgeProgress(activeProfile, badge.id);
                  const unlocked = progress.unlocked;
                  const clamped = Math.min(progress.target, progress.current);
                  const pct =
                    progress.target > 0 ? Math.round((clamped / progress.target) * 100) : 0;

                  return (
                    <div
                      key={badge.id}
                      className={`cozy-medallion-card ${unlocked ? 'is-unlocked' : 'is-locked'}`}
                      style={{
                        padding: 12,
                        borderRadius: 18,
                        borderTopWidth: 2,
                        borderRightWidth: 2,
                        borderLeftWidth: 2,
                        borderBottomWidth: 4,
                        borderStyle: 'solid',
                        borderColor: unlocked ? 'var(--gild, var(--tint-amber-border))' : 'var(--card-border)',
                        background: unlocked ? 'var(--tint-amber-bg)' : 'var(--card-soft-bg)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          className={`cozy-medallion-bezel ${unlocked ? 'is-unlocked' : 'is-locked'}`}
                          style={{ filter: unlocked ? 'none' : 'sepia(0.45) grayscale(0.55)', opacity: unlocked ? 1 : 0.58 }}
                        >
                          <VocabIllustration illustrationKey={badge.iconKey} size={46} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                            <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                              {badge.name}
                            </strong>
                            {unlocked ? (
                              <CheckCircle2 size={16} color="#10b981" />
                            ) : (
                              <Sparkles size={14} color="var(--text-muted)" />
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>
                            {badge.description}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: unlocked ? 'var(--tint-emerald-ink)' : 'var(--text-muted)',
                            marginBottom: 4,
                          }}
                        >
                          <span>{unlocked ? 'Unlocked!' : 'Progress'}</span>
                          <span>
                            {clamped} / {progress.target}
                          </span>
                        </div>
                        <div className="cozy-gauge-track" style={{ height: 8, borderRadius: 999, overflow: 'hidden' }}>
                          <div
                            className="cozy-gauge-fill"
                            style={{
                              width: `${unlocked ? 100 : pct}%`,
                              height: '100%',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
