import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Download,
  Flame,
  Gamepad2,
  Gem,
  Heart,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AvatarBadge } from '../../art/AvatarBadge';
import { FlagIcon } from '../../art/FlagIcon';
import { playSfx, setAudioPreferences } from '../../audio';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import { LANGUAGE_LIST, LANGUAGE_META, type LanguageCode } from '../../types/contracts';
import { clampPopoverPosition } from '../lesson/lessonHelpers';

type OpenPopover = 'lang' | 'hearts' | 'audio' | null;

export interface TopHudProps {
  onOpenProfileModal: () => void;
  onOpenArcade: () => void;
  canInstallApp: boolean;
  onInstallApp: () => void;
}

export function TopHud({
  onOpenProfileModal,
  onOpenArcade,
  canInstallApp,
  onInstallApp,
}: TopHudProps) {
  const { vault, activeProfile } = useVaultStore();
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [popoverCoords, setPopoverCoords] = useState({ top: 56, left: 16, width: 256 });

  const langBtnRef = useRef<HTMLButtonElement | null>(null);
  const heartsBtnRef = useRef<HTMLButtonElement | null>(null);
  const audioBtnRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const activeAnchorRef =
    openPopover === 'lang'
      ? langBtnRef
      : openPopover === 'hearts'
        ? heartsBtnRef
        : openPopover === 'audio'
          ? audioBtnRef
          : null;

  useLayoutEffect(() => {
    if (!openPopover || !activeAnchorRef?.current) return;
    const rect = activeAnchorRef.current.getBoundingClientRect();
    const desiredW = openPopover === 'lang' ? 276 : 244;
    const measuredH = popoverRef.current?.offsetHeight || 190;
    setPopoverCoords(clampPopoverPosition(rect, desiredW, measuredH));
  }, [openPopover, activeAnchorRef]);

  useEffect(() => {
    if (!openPopover) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (
        t &&
        (popoverRef.current?.contains(t) ||
          langBtnRef.current?.contains(t) ||
          heartsBtnRef.current?.contains(t) ||
          audioBtnRef.current?.contains(t))
      ) {
        return;
      }
      setOpenPopover(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPopover(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [openPopover]);

  const activeLangMeta = LANGUAGE_META[activeProfile.activeLanguage];
  const { volume, muted } = vault.audioSettings;

  const togglePopover = (which: Exclude<OpenPopover, null>) => {
    playSfx('button_click');
    setOpenPopover((cur) => (cur === which ? null : which));
  };

  const handleSelectLanguage = (lang: LanguageCode) => {
    playSfx('button_click');
    vaultActions.setActiveLanguage(lang);
    setOpenPopover(null);
  };

  const popoverNode = openPopover ? (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={
        openPopover === 'lang'
          ? 'Switch Language'
          : openPopover === 'hearts'
            ? 'Hearts & Recharge'
            : 'Audio Volume'
      }
      className="hud-popover"
      style={{
        top: `${popoverCoords.top}px`,
        left: `${popoverCoords.left}px`,
        width: `${popoverCoords.width}px`,
      }}
    >
      {openPopover === 'lang' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
            Choose Expedition Land
          </div>
          {LANGUAGE_LIST.map((lang) => {
            const meta = LANGUAGE_META[lang];
            const isSelected = lang === activeProfile.activeLanguage;
            return (
              <button
                key={lang}
                type="button"
                className="tactile-btn"
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 10px',
                  background: isSelected ? meta.accentPalette.surfaceTint : '#ffffff',
                  borderColor: isSelected ? meta.accentPalette.primary : '#cbd5e1',
                }}
                onClick={() => handleSelectLanguage(lang)}
              >
                <FlagIcon language={lang} size={26} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#1e1b4b' }}>
                    {meta.name} ({meta.nativeName})
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                    {meta.landTitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {openPopover === 'hearts' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: '0.96rem', color: '#be123c' }}>
            Hearts: {activeProfile.hearts} / {activeProfile.maxHearts}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
            {activeProfile.hearts >= activeProfile.maxHearts
              ? 'Pip has full hearts! Play Sky-Catcher anytime for bonus Gems!'
              : 'Recharge +1 to +5 Hearts anytime in Sky-Catcher Fiesta!'}
          </div>
          <button
            type="button"
            className="tactile-btn tactile-btn-amber"
            style={{ width: '100%' }}
            onClick={() => {
              playSfx('button_click');
              setOpenPopover(null);
              onOpenArcade();
            }}
          >
            <Gamepad2 size={16} />
            <span>Play Sky-Catcher Fiesta!</span>
          </button>
        </div>
      ) : null}

      {openPopover === 'audio' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>Sound & Speech</span>
            <button
              type="button"
              className={`tactile-btn ${muted ? 'tactile-btn-rose' : 'tactile-btn-success'}`}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => {
                const nextMuted = !muted;
                vaultActions.setAudioSettings({ muted: nextMuted });
                setAudioPreferences({ volume, muted: nextMuted });
              }}
            >
              {muted ? 'Muted' : 'Sound On'}
            </button>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', fontWeight: 800 }}>
            <span>Volume: {Math.round(volume * 100)}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => {
                const nextVol = Number(e.target.value) / 100;
                const nextMuted = nextVol === 0;
                vaultActions.setAudioSettings({ volume: nextVol, muted: nextMuted });
                setAudioPreferences({ volume: nextVol, muted: nextMuted });
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <header className="top-hud">
      <div className="top-hud-inner">
        {/* Left: Kid Profile Switcher + Flag Language Switcher */}
        <div className="hud-group">
          <button
            type="button"
            className="hud-pill"
            aria-label={`Switch kid profile (${activeProfile.name})`}
            onClick={() => {
              playSfx('button_click');
              onOpenProfileModal();
            }}
          >
            <AvatarBadge avatarId={activeProfile.avatarId} size={26} />
            <span>{activeProfile.name}</span>
          </button>

          <button
            ref={langBtnRef}
            type="button"
            className="hud-pill"
            aria-label={`Active language: ${activeLangMeta.name}`}
            aria-expanded={openPopover === 'lang'}
            onClick={() => togglePopover('lang')}
          >
            <FlagIcon language={activeProfile.activeLanguage} size={24} />
            <span className="hud-hide-xs">{activeLangMeta.name}</span>
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Right: Streak + Shields, Gems, Hearts, Audio, Install */}
        <div className="hud-group">
          <span
            className="hud-pill hud-pill-static"
            title={`${activeProfile.streakDays} day streak • ${activeProfile.streakShields} Streak Shields`}
            style={{ background: '#fff7ed', borderColor: '#fdba74', color: '#c2410c' }}
          >
            <Flame size={15} fill="#f97316" />
            <span>{activeProfile.streakDays}</span>
            <Shield size={14} color="#0284c7" />
            <span>{activeProfile.streakShields}</span>
          </span>

          <span
            className="hud-pill hud-pill-static"
            title={`${activeProfile.gems} Gems`}
            style={{ background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }}
          >
            <Gem size={15} color="#2563eb" />
            <span>{activeProfile.gems}</span>
          </span>

          <button
            ref={heartsBtnRef}
            type="button"
            className="hud-pill"
            aria-label={`Hearts: ${activeProfile.hearts} of ${activeProfile.maxHearts}`}
            aria-expanded={openPopover === 'hearts'}
            style={{ background: '#fff1f2', borderColor: '#fda4af', color: '#be123c' }}
            onClick={() => togglePopover('hearts')}
          >
            <Heart size={15} fill="#f43f5e" />
            <span>
              {activeProfile.hearts}/{activeProfile.maxHearts}
            </span>
          </button>

          <button
            ref={audioBtnRef}
            type="button"
            className="hud-pill"
            aria-label="Sound and volume settings"
            aria-expanded={openPopover === 'audio'}
            onClick={() => togglePopover('audio')}
          >
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {canInstallApp ? (
            <button
              type="button"
              className="hud-pill"
              style={{
                background: '#eef2ff',
                borderColor: '#6366f1',
                color: '#312e81',
              }}
              onClick={() => {
                playSfx('button_click');
                onInstallApp();
              }}
            >
              <Download size={15} />
              <span>Install App</span>
            </button>
          ) : null}
        </div>
      </div>

      {popoverNode && typeof document !== 'undefined'
        ? createPortal(popoverNode, document.body)
        : popoverNode}
    </header>
  );
}
