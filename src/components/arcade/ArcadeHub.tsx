import { useEffect, useState } from 'react';
import { Gamepad2, Lock, Music, Play, Sparkles, Star } from 'lucide-react';
import { playSfx } from '../../audio';
import { useVaultStore } from '../../store/useVaultStore';
import { MascotStage } from '../characters/MascotStage';
import { SkyCatcherArcade } from './SkyCatcherArcade';
import { StarlightSecretGame } from './StarlightSecretGame';

export type ArcadeGameMode = 'hub' | 'sky_catcher' | 'starlight_choir';

export interface ArcadeHubProps {
  initialMode?: ArcadeGameMode;
  onExitToMap: () => void;
}

export function ArcadeHub({ initialMode = 'hub', onExitToMap }: ArcadeHubProps) {
  const { activeProfile } = useVaultStore();
  const [mode, setMode] = useState<ArcadeGameMode>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (mode === 'sky_catcher') {
    return <SkyCatcherArcade onExit={() => setMode('hub')} />;
  }

  if (mode === 'starlight_choir' && activeProfile.secretArcadeUnlocked) {
    return <StarlightSecretGame onExit={() => setMode('hub')} />;
  }

  const secretUnlocked = Boolean(activeProfile.secretArcadeUnlocked);

  return (
    <section
      aria-label="Wanderling Arcade Hub"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Arcade Hub Banner */}
      <div
        className="tactile-card"
        style={{
          padding: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              background: 'var(--lang-tint)',
              border: '2px solid var(--lang-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--lang-primary)',
            }}
          >
            <Gamepad2 size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
              Expedition Arcade
            </h1>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#475569' }}>
              Recharge Hearts & win bonus Gems with Pip and friends!
            </div>
          </div>
        </div>

        <button
          type="button"
          className="tactile-btn tactile-btn-soft"
          onClick={onExitToMap}
        >
          Back to Atlas Map
        </button>
      </div>

      {/* Dual Mini-Game Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: 16,
        }}
      >
        {/* Card 1: Sky-Catcher Fiesta */}
        <div
          className="tactile-card"
          style={{
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            textAlign: 'center',
            background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
            borderColor: '#60a5fa',
          }}
        >
          <MascotStage
            companionId="pip"
            pose="happy"
            equippedCosmetics={activeProfile.equippedCosmetics}
            size={116}
            badgeText="Hearts + Gems"
          />
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.22rem', fontWeight: 900 }}>
              Sky-Catcher Fiesta
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#475569' }}>
              Glide Pip beneath floating word lanterns, dodge silly storm clouds, and recharge +1
              to +5 Hearts!
            </p>
          </div>
          <button
            type="button"
            className="tactile-btn tactile-btn-hero tactile-btn-primary"
            style={{ width: '100%' }}
            onClick={() => {
              playSfx('whoosh_transition');
              setMode('sky_catcher');
            }}
          >
            <Play size={18} />
            <span>Play Sky-Catcher Fiesta</span>
          </button>
        </div>

        {/* Card 2: Secret Unlockable — Starlight Critter Choir */}
        <div
          className="tactile-card"
          style={{
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            textAlign: 'center',
            background: secretUnlocked
              ? 'linear-gradient(180deg, #eef2ff 0%, #fffbeb 100%)'
              : 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
            borderColor: secretUnlocked ? '#6366f1' : '#818cf8',
            color: secretUnlocked ? '#1e1b4b' : '#f8fafc',
          }}
        >
          {secretUnlocked ? (
            <>
              <MascotStage
                companionId="pip"
                pose="victory_dance"
                equippedCosmetics={activeProfile.equippedCosmetics}
                size={116}
                badgeText={`Best: ${activeProfile.secretArcadeBestScore ?? 0}`}
              />
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: '#fef3c7',
                    color: '#b45309',
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    marginBottom: 6,
                  }}
                >
                  <Sparkles size={13} /> SECRET UNLOCKED!
                </div>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.22rem', fontWeight: 900 }}>
                  Starlight Critter Choir
                </h2>
                <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#475569' }}>
                  Pop musical Song-Bubbles with all 5 companions, build a 5x Disco Fever streak,
                  and catch Golden Star Notes!
                </p>
              </div>
              <button
                type="button"
                className="tactile-btn tactile-btn-hero tactile-btn-indigo"
                style={{ width: '100%' }}
                onClick={() => {
                  playSfx('secret_fanfare');
                  setMode('starlight_choir');
                }}
              >
                <Music size={18} />
                <span>Play Starlight Critter Choir!</span>
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '3px dashed #fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fde047',
                }}
              >
                <Lock size={40} />
              </div>
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'rgba(251, 191, 36, 0.2)',
                    color: '#fde047',
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    marginBottom: 6,
                  }}
                >
                  <Star size={13} /> MYSTERY VAULT
                </div>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.22rem', fontWeight: 900 }}>
                  ??? Starlight Critter Choir
                </h2>
                <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#e0e7ff' }}>
                  Clear any Unit Boss, finish 3 lessons, OR tap the Golden Compass 5 times in the
                  top bar to unlock!
                </p>
              </div>
              <button
                type="button"
                disabled
                className="tactile-btn tactile-btn-soft"
                style={{ width: '100%', opacity: 0.7 }}
              >
                <Lock size={16} />
                <span>Locked Mystery Game</span>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
