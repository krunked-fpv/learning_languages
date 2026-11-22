import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  Compass,
  Download,
  Flame,
  Gamepad2,
  Gem,
  Heart,
  Palette,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AvatarBadge } from '../../art/AvatarBadge';
import { FlagIcon } from '../../art/FlagIcon';
import { playSfx, setAudioPreferences } from '../../audio';
import { COSMETIC_CATALOG } from '../../core';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import {
  LANGUAGE_LIST,
  LANGUAGE_META,
  type CosmeticId,
  type LanguageCode,
} from '../../types/contracts';
import { clampPopoverPosition } from '../lesson/lessonHelpers';
import { PaletteOrbSwatches, THEME_SWATCH_TRIPLES } from '../meta/paletteSwatches';

type OpenPopover = 'lang' | 'palette' | 'hearts' | 'audio' | null;

export interface TopHudProps {
  onOpenProfileModal: () => void;
  onOpenArcade: () => void;
  onOpenShop?: () => void;
  canInstallApp: boolean;
  onInstallApp: () => void;
}

export function TopHud({
  onOpenProfileModal,
  onOpenArcade,
  onOpenShop,
  canInstallApp,
  onInstallApp,
}: TopHudProps) {
  const { vault, activeProfile } = useVaultStore();
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [popoverCoords, setPopoverCoords] = useState({ top: 56, left: 16, width: 256 });
  const [compassTaps, setCompassTaps] = useState(0);
  const [compassAnimKey, setCompassAnimKey] = useState(0);

  const langBtnRef = useRef<HTMLButtonElement | null>(null);
  const paletteBtnRef = useRef<HTMLButtonElement | null>(null);
  const heartsBtnRef = useRef<HTMLButtonElement | null>(null);
  const audioBtnRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const activeAnchorRef =
    openPopover === 'lang'
      ? langBtnRef
      : openPopover === 'palette'
        ? paletteBtnRef
        : openPopover === 'hearts'
          ? heartsBtnRef
          : openPopover === 'audio'
            ? audioBtnRef
            : null;

  useLayoutEffect(() => {
    if (!openPopover || !activeAnchorRef?.current) return;
    const rect = activeAnchorRef.current.getBoundingClientRect();
    const desiredW = openPopover === 'lang' || openPopover === 'palette' ? 286 : 246;
    const measuredH = popoverRef.current?.offsetHeight || 200;
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
          paletteBtnRef.current?.contains(t) ||
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

  useEffect(() => {
    setCompassTaps(0);
  }, [activeProfile.id]);

  const unlockedThemes = useMemo(() => {
    const owned = new Set(activeProfile.unlockedCosmetics);
    return COSMETIC_CATALOG.filter((item) => item.slot === 'theme' && owned.has(item.id));
  }, [activeProfile.unlockedCosmetics]);

  const activeThemeId = activeProfile.equippedCosmetics.theme ?? 'default';
  const activeLangMeta = LANGUAGE_META[activeProfile.activeLanguage];
  const { volume, muted } = vault.audioSettings;

  const togglePopover = (which: Exclude<OpenPopover, null>) => {
    playSfx('button_click');
    setOpenPopover((cur) => (cur === which ? null : which));
  };

  const handleSelectLanguage = (lang: LanguageCode) => {
    playSfx('whoosh_transition');
    vaultActions.setActiveLanguage(lang);
    setOpenPopover(null);
  };

  const handleSelectTheme = (themeId?: CosmeticId) => {
    playSfx('tile_tap');
    vaultActions.equipCosmetic('theme', themeId);
    setOpenPopover(null);
  };

  const handleGoldenCompassTap = () => {
    setCompassAnimKey((k) => k + 1);
    if (activeProfile.secretArcadeUnlocked) {
      playSfx('star_pop', 2);
      return;
    }
    const nextTap = compassTaps + 1;
    if (nextTap >= 5) {
      setCompassTaps(0);
      vaultActions.unlockSecretArcade();
    } else {
      setCompassTaps(nextTap);
      playSfx('star_pop', nextTap - 1);
    }
  };

  const popoverNode = openPopover ? (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={
        openPopover === 'lang'
          ? 'Switch Language'
          : openPopover === 'palette'
            ? 'Color Palettes'
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
          <div style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
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
                  background: isSelected ? 'var(--tint-indigo-bg)' : 'var(--tile-bg)',
                  borderColor: isSelected ? meta.accentPalette.primary : 'var(--card-border)',
                  color: 'var(--text-main)',
                }}
                onClick={() => handleSelectLanguage(lang)}
              >
                <FlagIcon language={lang} size={26} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>
                    {meta.name} ({meta.nativeName})
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {meta.landTitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {openPopover === 'palette' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Unlocked Color Palettes
          </div>

          <button
            type="button"
            className="tactile-btn"
            style={{
              justifyContent: 'space-between',
              padding: '8px 10px',
              background: activeThemeId === 'default' ? 'var(--tint-indigo-bg)' : 'var(--tile-bg)',
              borderColor: activeThemeId === 'default' ? 'var(--lang-primary)' : 'var(--card-border)',
            }}
            onClick={() => handleSelectTheme(undefined)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <PaletteOrbSwatches colors={THEME_SWATCH_TRIPLES.default} size={12} />
              <span style={{ fontSize: '0.84rem' }}>Storybook Parchment</span>
            </span>
            {activeThemeId === 'default' ? <Check size={15} /> : null}
          </button>

          {unlockedThemes.map((themeItem) => {
            const isSelected = activeThemeId === themeItem.id;
            const swatches = THEME_SWATCH_TRIPLES[themeItem.id] ?? THEME_SWATCH_TRIPLES.default;
            return (
              <button
                key={themeItem.id}
                type="button"
                className="tactile-btn"
                style={{
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: isSelected ? 'var(--tint-indigo-bg)' : 'var(--tile-bg)',
                  borderColor: isSelected ? themeItem.accentColor : 'var(--card-border)',
                }}
                onClick={() => handleSelectTheme(themeItem.id)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <PaletteOrbSwatches colors={swatches} size={12} />
                  <span style={{ fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {themeItem.name}
                  </span>
                </span>
                {isSelected ? <Check size={15} /> : null}
              </button>
            );
          })}

          {onOpenShop ? (
            <button
              type="button"
              className="tactile-btn tactile-btn-indigo"
              style={{ width: '100%', padding: '8px 10px', fontSize: '0.8rem' }}
              onClick={() => {
                playSfx('button_click');
                setOpenPopover(null);
                onOpenShop();
              }}
            >
              <Sparkles size={15} />
              <span>Get Cosmic Galaxy & Palettes in Gem Shop</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {openPopover === 'hearts' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: '0.96rem', color: 'var(--tint-rose-ink)' }}>
            Hearts: {activeProfile.hearts} / {activeProfile.maxHearts}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {activeProfile.hearts >= activeProfile.maxHearts
              ? 'Pip has full hearts! Play Arcade anytime for bonus Gems!'
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
        {/* Left: Kid Profile Switcher + Flag Language Switcher + Palette Switcher + Golden Starlight Compass */}
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
            <AvatarBadge avatarId={activeProfile.avatarId} size={24} />
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
            <FlagIcon language={activeProfile.activeLanguage} size={22} />
            <span className="hud-hide-xs">{activeLangMeta.name}</span>
            <ChevronDown size={13} />
          </button>

          <button
            ref={paletteBtnRef}
            type="button"
            className="hud-pill"
            aria-label="Color palettes"
            aria-expanded={openPopover === 'palette'}
            onClick={() => togglePopover('palette')}
          >
            <Palette size={15} />
            <span className="hud-hide-xs">Theme</span>
          </button>

          <button
            type="button"
            className="hud-pill"
            aria-label="Golden Starlight Compass"
            title={
              activeProfile.secretArcadeUnlocked
                ? 'Starlight Secret Unlocked!'
                : 'Golden Starlight Compass'
            }
            style={{
              background: 'var(--tint-amber-bg)',
              borderColor: 'var(--tint-amber-border)',
              color: 'var(--tint-amber-ink)',
            }}
            onClick={handleGoldenCompassTap}
          >
            <motion.span
              key={compassAnimKey}
              initial={compassAnimKey > 0 ? { rotate: -18, scale: 1.22 } : false}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 460, damping: 14 }}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              <Compass size={16} />
            </motion.span>
            {compassTaps > 0 && !activeProfile.secretArcadeUnlocked ? (
              <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>{compassTaps}/5</span>
            ) : null}
          </button>
        </div>

        {/* Right: Streak + Shields, Gems, Hearts, Audio, Install */}
        <div className="hud-group">
          <span
            className="hud-pill hud-pill-static"
            title={`${activeProfile.streakDays} day streak • ${activeProfile.streakShields} Streak Shields`}
            style={{
              background: 'var(--tint-amber-bg)',
              borderColor: 'var(--tint-amber-border)',
              color: 'var(--tint-amber-ink)',
            }}
          >
            <Flame size={15} fill="#f97316" color="#f97316" />
            <span>{activeProfile.streakDays}</span>
            <Shield size={13} color="#38bdf8" />
            <span>{activeProfile.streakShields}</span>
          </span>

          <span
            className="hud-pill hud-pill-static"
            title={`${activeProfile.gems} Gems`}
            style={{
              background: 'var(--tint-indigo-bg)',
              borderColor: 'var(--tint-indigo-border)',
              color: 'var(--tint-indigo-ink)',
            }}
          >
            <Gem size={14} />
            <span>{activeProfile.gems}</span>
          </span>

          <button
            ref={heartsBtnRef}
            type="button"
            className="hud-pill"
            aria-label={`Hearts: ${activeProfile.hearts} of ${activeProfile.maxHearts}`}
            aria-expanded={openPopover === 'hearts'}
            style={{
              background: 'var(--tint-rose-bg)',
              borderColor: 'var(--tint-rose-border)',
              color: 'var(--tint-rose-ink)',
            }}
            onClick={() => togglePopover('hearts')}
          >
            <Heart size={14} fill="#f43f5e" color="#f43f5e" />
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
            {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {canInstallApp ? (
            <button
              type="button"
              className="hud-pill"
              style={{
                background: 'var(--tint-indigo-bg)',
                borderColor: 'var(--tint-indigo-border)',
                color: 'var(--tint-indigo-ink)',
              }}
              onClick={() => {
                playSfx('button_click');
                onInstallApp();
              }}
            >
              <Download size={14} />
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
