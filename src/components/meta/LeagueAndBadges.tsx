import { useMemo } from 'react';
import { Award, CheckCircle2, Crown, Sparkles, Trophy } from 'lucide-react';
import { AvatarBadge } from '../../art/AvatarBadge';
import { VocabIllustration } from '../../art/VocabIllustration';
import {
  BADGE_CATALOG,
  LEAGUE_TIER_META,
  buildWeeklyLeaderboard,
} from '../../core';
import { useVaultStore } from '../../store/useVaultStore';
import { LANGUAGE_LIST, type BadgeId, type KidProfile, type LeagueTier } from '../../types/contracts';

const TIER_ORDER: readonly LeagueTier[] = [
  'bronze_acorn',
  'silver_compass',
  'gold_feather',
  'sapphire_sky',
  'starlight_legend',
];

function computeBadgeProgress(profile: KidProfile, badgeId: BadgeId): number {
  const langsStarted = LANGUAGE_LIST.filter(
    (lang) => profile.languageProgress[lang].completedNodeIds.length > 0
  ).length;
  const totalVocab = LANGUAGE_LIST.reduce(
    (sum, lang) => sum + profile.languageProgress[lang].unlockedVocabIds.length,
    0
  );
  const totalChests = LANGUAGE_LIST.reduce(
    (sum, lang) => sum + profile.languageProgress[lang].claimedChestIds.length,
    0
  );

  switch (badgeId) {
    case 'first_hello':
      return profile.stats.lessonsCompleted;
    case 'polyglot_explorer':
      return langsStarted;
    case 'turtle_listener':
      return profile.stats.turtlePlaysCount;
    case 'combo_comet':
      return profile.stats.bestComboStreak;
    case 'phrasebook_collector':
      return totalVocab;
    case 'arcade_ace':
      return profile.stats.arcadeGamesWon;
    case 'boss_befriender':
      return profile.stats.bossesCleared;
    case 'accent_scholar':
      return profile.stats.accentSpotlightsSeen;
    case 'streak_spark':
      return profile.streakDays;
    case 'chest_hunter':
      return totalChests;
    case 'story_reader':
      return profile.stats.storiesCompleted;
    case 'starlight_master':
      return profile.totalXp;
  }
}

export function LeagueAndBadges() {
  const { activeProfile } = useVaultStore();

  const tierMeta = LEAGUE_TIER_META[activeProfile.leagueTier];
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

  const unlockedSet = useMemo(() => new Set(activeProfile.badges), [activeProfile.badges]);

  return (
    <section aria-label="Leagues and Badges" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* League Tier Crest Card */}
      <div
        className="tactile-card"
        style={{
          padding: 20,
          background: `linear-gradient(135deg, ${tierMeta.crestBg} 0%, #ffffff 100%)`,
          borderColor: tierMeta.color,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: tierMeta.color,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={26} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#1e1b4b' }}>
                {tierMeta.label} League
              </h1>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#475569' }}>
                This week’s expedition score: <strong>{activeProfile.weeklyXp} XP</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TIER_ORDER.map((tier) => {
              const m = LEAGUE_TIER_META[tier];
              const isCurrent = tier === activeProfile.leagueTier;
              return (
                <span
                  key={tier}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 999,
                    background: isCurrent ? m.color : '#f1f5f9',
                    color: isCurrent ? '#ffffff' : '#64748b',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                  }}
                >
                  {m.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Stepped Podium (#2 - #1 - #3) */}
        {podiumTop3.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${podiumTop3.length}, minmax(0, 1fr))`,
              alignItems: 'end',
              gap: 10,
              paddingTop: 8,
            }}
          >
            {podiumTop3.map((entry) => {
              const isFirst = entry.rank === 1;
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: isFirst ? '16px 10px' : '10px 8px',
                    minHeight: isFirst ? 148 : entry.rank === 2 ? 124 : 112,
                    justifyContent: 'flex-end',
                    borderRadius: 18,
                    background: entry.isPlayer ? '#eef2ff' : '#ffffff',
                    border: `2px solid ${isFirst ? '#f59e0b' : entry.isPlayer ? '#4f46e5' : '#cbd5e1'}`,
                    borderBottomWidth: 4,
                    textAlign: 'center',
                  }}
                >
                  {isFirst ? <Crown size={20} color="#f59e0b" /> : null}
                  <AvatarBadge avatarId={entry.avatarId} size={isFirst ? 48 : 38} />
                  <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#1e1b4b' }}>
                    #{entry.rank} {entry.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4f46e5' }}>
                    {entry.weeklyXp} XP
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Full Rival Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {leaderboard.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '9px 14px',
                borderRadius: 14,
                background: entry.isPlayer ? '#eef2ff' : '#ffffff',
                border: `2px solid ${entry.isPlayer ? '#4f46e5' : '#e2e8f0'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 28, fontWeight: 900, color: '#475569' }}>#{entry.rank}</span>
                <AvatarBadge avatarId={entry.avatarId} size={32} />
                <strong style={{ color: '#1e1b4b' }}>{entry.name}</strong>
                {entry.isPlayer ? (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: '#4f46e5',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                    }}
                  >
                    YOU
                  </span>
                ) : null}
              </div>
              <span style={{ fontWeight: 900, color: '#1e1b4b' }}>{entry.weeklyXp} XP</span>
            </div>
          ))}
        </div>
      </div>

      {/* 12 Achievement Badges Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={22} color="#f59e0b" />
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }} className="shell-dark-text-zone">
            Expedition Badges ({activeProfile.badges.length} / {BADGE_CATALOG.length || 12})
          </h2>
        </div>

        {BADGE_CATALOG.length === 0 ? (
          <div className="tactile-card" style={{ padding: 20, fontWeight: 700, color: '#64748b' }}>
            Complete lessons, collect stickers, and play Sky-Catcher Fiesta to earn badges!
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {BADGE_CATALOG.map((badge) => {
              const unlocked = unlockedSet.has(badge.id);
              const progressVal = computeBadgeProgress(activeProfile, badge.id);
              const clamped = Math.min(badge.targetCount, progressVal);
              const pct = badge.targetCount > 0 ? Math.round((clamped / badge.targetCount) * 100) : 0;

              return (
                <div
                  key={badge.id}
                  className="tactile-card"
                  style={{
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    background: unlocked
                      ? 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)'
                      : '#f8fafc',
                    borderColor: unlocked ? '#f59e0b' : '#cbd5e1',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ filter: unlocked ? 'none' : 'grayscale(1)', opacity: unlocked ? 1 : 0.45 }}>
                      <VocabIllustration illustrationKey={badge.iconKey} size={52} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <strong style={{ fontSize: '0.96rem', color: '#1e1b4b' }}>
                          {badge.name}
                        </strong>
                        {unlocked ? (
                          <CheckCircle2 size={18} color="#059669" />
                        ) : (
                          <Sparkles size={15} color="#94a3b8" />
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginTop: 2 }}>
                        {badge.description}
                      </div>
                    </div>
                  </div>

                  {/* Progress Meter */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: unlocked ? '#065f46' : '#64748b', marginBottom: 4 }}>
                      <span>{unlocked ? 'Unlocked!' : 'Progress'}</span>
                      <span>
                        {clamped} / {badge.targetCount}
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${unlocked ? 100 : pct}%`,
                          height: '100%',
                          background: unlocked ? '#10b981' : '#6366f1',
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
    </section>
  );
}
