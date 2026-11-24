import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Download,
  Flame,
  Gem,
  Heart,
  KeyRound,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import { AvatarBadge } from '../../art/AvatarBadge';
import { FlagIcon } from '../../art/FlagIcon';
import { playSfx } from '../../audio';
import {
  exportVaultJson,
  importVaultJson,
  useVaultStore,
  vaultActions,
} from '../../store/useVaultStore';
import {
  ADULT_EASTER_EGG_TAP_COUNT,
  ADULT_MASHUP_LANGUAGES,
  CLASSIC_ADULT_LANGUAGES,
  LANGUAGE_LIST,
  LANGUAGE_META,
  MAX_HEART_CONTAINERS,
  STARTER_AVATAR_IDS,
  isAdultLanguage,
  isDefaultKidProfileId,
  type AdultLanguageCode,
  type AvatarId,
  type BaseLanguageCode,
  type ClassicAdultLanguageCode,
  type CoopSafeAtlasMask,
  type LanguageCode,
} from '../../types/contracts';
import { resolvePriorKidProfile, safeVaultActions } from './vaultSafeActions';
import {
  getCachedOfflinePackCounts,
  prefetchAllOfflinePacks,
  useAdultRegistryVersion,
  useBaseRegistryVersion,
  type OfflinePackPrefetchResult,
} from './adultCurriculumSync';

const ALL_AVATAR_OPTIONS: readonly { id: AvatarId; label: string }[] = [
  { id: 'pip_explorer', label: 'Pip' },
  { id: 'mateo_chef', label: 'Mateo' },
  { id: 'colette_baker', label: 'Colette' },
  { id: 'benni_tinker', label: 'Benni' },
  { id: 'luca_captain', label: 'Luca' },
  { id: 'star_compass', label: 'Compass' },
  { id: 'origami_crane_crest', label: 'Origami Crane' },
  { id: 'clockwork_owl_crest', label: 'Clockwork Owl' },
  { id: 'fennec_voyager', label: 'Fennec' },
  { id: 'grand_laureate_crest', label: 'Laureate' },
];

const STARTER_AVATAR_OPTIONS = ALL_AVATAR_OPTIONS.filter((a) =>
  STARTER_AVATAR_IDS.includes(a.id)
);

const BANNER_PALETTE = [
  '#2563EB',
  '#EA580C',
  '#059669',
  '#9333EA',
  '#E11D48',
  '#D97706',
] as const;

const CLASSIC_TRACK_COPY: Record<ClassicAdultLanguageCode, { title: string; subtitle: string }> = {
  ebonics: {
    title: 'AAVE -> Suburban',
    subtitle: 'AAVE <-> Suburban',
  },
  suburban: {
    title: 'Suburban -> AAVE',
    subtitle: 'Suburban <-> AAVE',
  },
};

export interface ProfileVaultModalProps {
  onClose: () => void;
  coopSafeMask?: CoopSafeAtlasMask;
}

export function ProfileVaultModal({ onClose, coopSafeMask }: ProfileVaultModalProps) {
  const { vault, activeProfile } = useVaultStore();
  const [showCreator, setShowCreator] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState<AvatarId>('pip_explorer');
  const [newBanner, setNewBanner] = useState<string>(BANNER_PALETTE[0]);
  const [newLanguage, setNewLanguage] = useState<BaseLanguageCode>('es');

  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [pasteJsonOpen, setPasteJsonOpen] = useState(false);
  const [pasteJsonText, setPasteJsonText] = useState('');
  const [vaultFeedback, setVaultFeedback] = useState<{
    kind: 'ok' | 'err';
    message: string;
  } | null>(null);

  const [atlasTapCount, setAtlasTapCount] = useState(0);
  const [keycodeOpen, setKeycodeOpen] = useState(false);
  const [keycodeInput, setKeycodeInput] = useState('');
  const [keycodeError, setKeycodeError] = useState<string | null>(null);
  const [adultConfirmOpen, setAdultConfirmOpen] = useState(false);
  const [selectedAdultTrack, setSelectedAdultTrack] = useState<AdultLanguageCode>('ebonics');
  const [adultProfileName, setAdultProfileName] = useState('Parent');
  const [confirmRestoreOnStudyBreak, setConfirmRestoreOnStudyBreak] = useState<boolean>(() =>
    Boolean(vault.restoreKidProfileOnStudyBreak)
  );
  const [unlockedRestoreOnStudyBreak, setUnlockedRestoreOnStudyBreak] = useState<boolean>(() =>
    Boolean(vault.restoreKidProfileOnStudyBreak)
  );
  const [offlinePackLoading, setOfflinePackLoading] = useState(false);
  const [offlinePackResult, setOfflinePackResult] = useState<OfflinePackPrefetchResult | null>(
    null
  );
  const [coopMaskUnlockedByParent, setCoopMaskUnlockedByParent] = useState(false);
  const [coopParentGateOpen, setCoopParentGateOpen] = useState(false);
  const isMountedRef = useRef(true);

  useBaseRegistryVersion();
  useAdultRegistryVersion();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setUnlockedRestoreOnStudyBreak(Boolean(vault.restoreKidProfileOnStudyBreak));
  }, [vault.restoreKidProfileOnStudyBreak]);

  useEffect(() => {
    setCoopMaskUnlockedByParent(false);
    setCoopParentGateOpen(false);
    if (coopSafeMask?.active) {
      setAtlasTapCount(0);
      setKeycodeOpen(false);
      setKeycodeInput('');
      setKeycodeError(null);
      setAdultConfirmOpen(false);
    }
  }, [coopSafeMask?.active]);

  const isCoopMasked = Boolean(coopSafeMask?.active) && !coopMaskUnlockedByParent;
  const canDelete = vault.profiles.length > 1;
  const isOnDefaultKid = isDefaultKidProfileId(activeProfile.id);
  const isUnlockedAdult = !isOnDefaultKid && Boolean(activeProfile.adultModeUnlocked);
  const priorKidProfile = resolvePriorKidProfile(vault, activeProfile.id);
  const includeAdultInPack = Boolean(
    !isCoopMasked &&
      !isOnDefaultKid &&
      activeProfile.adultModeUnlocked &&
      activeProfile.adultModeActive
  );
  const cachedPackCounts = getCachedOfflinePackCounts(includeAdultInPack);

  const handleDownloadOfflinePack = async () => {
    if (offlinePackLoading) return;
    playSfx('button_click');
    setOfflinePackLoading(true);
    try {
      const result = await prefetchAllOfflinePacks(
        includeAdultInPack ? { includeAdult: true } : undefined
      );
      if (!isMountedRef.current) return;
      setOfflinePackResult(result);
      playSfx(result.errors.length === 0 ? 'chest_open' : 'gentle_nudge');
    } catch {
      if (!isMountedRef.current) return;
      const counts = getCachedOfflinePackCounts(includeAdultInPack);
      setOfflinePackResult({
        loadedCount: counts.loadedCount,
        totalCount: counts.totalCount,
        errors: ['Offline or unavailable — unable to download all language packs right now.'],
      });
      playSfx('gentle_nudge');
    } finally {
      if (isMountedRef.current) {
        setOfflinePackLoading(false);
      }
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (adultConfirmOpen) {
          setAdultConfirmOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [adultConfirmOpen, onClose]);

  const openAdultConfirmModal = () => {
    setSelectedAdultTrack('ebonics');
    setAdultProfileName('Parent');
    setConfirmRestoreOnStudyBreak(Boolean(vault.restoreKidProfileOnStudyBreak));
    setAdultConfirmOpen(true);
  };

  const handleVersionPillTap = () => {
    if (isCoopMasked) {
      playSfx('tile_tap');
      return;
    }
    const nextTap = atlasTapCount + 1;
    if (nextTap >= ADULT_EASTER_EGG_TAP_COUNT) {
      setAtlasTapCount(0);
      playSfx('star_pop', 2);
      openAdultConfirmModal();
    } else {
      setAtlasTapCount(nextTap);
      playSfx('tile_tap');
    }
  };

  const handleKeycodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keycodeInput.trim();
    if (!trimmed) return;
    if (isCoopMasked) {
      playSfx('gentle_nudge');
      setKeycodeError('Atlas keycodes are paused while Family Co-Op Safe Atlas is active.');
      return;
    }
    if (safeVaultActions.verifyAdultEasterEggCode(trimmed)) {
      playSfx('star_pop', 2);
      setKeycodeInput('');
      setKeycodeError(null);
      setKeycodeOpen(false);
      openAdultConfirmModal();
    } else {
      playSfx('gentle_nudge');
      setKeycodeError('No matching atlas keycode.');
    }
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (safeVaultActions.verifyAdultEasterEggCode(trimmed)) {
      if (isCoopMasked) {
        playSfx('gentle_nudge');
        setNewName('');
        setShowCreator(false);
        setVaultFeedback({
          kind: 'err',
          message: 'Special atlas codes are paused while Family Co-Op Safe Atlas is active.',
        });
        return;
      }
      playSfx('star_pop', 2);
      setNewName('');
      setShowCreator(false);
      openAdultConfirmModal();
      return;
    }
    const created = vaultActions.createProfile({
      name: trimmed.slice(0, 20),
      avatarId: newAvatar,
      bannerColor: newBanner,
    });
    if (created.activeLanguage !== newLanguage) {
      vaultActions.setActiveLanguage(newLanguage);
    }
    playSfx('correct_chime');
    setNewName('');
    setNewLanguage('es');
    setShowCreator(false);
    setVaultFeedback({ kind: 'ok', message: `Welcome aboard, ${trimmed}!` });
  };

  const handleExport = () => {
    playSfx('button_click');
    const json = exportVaultJson(vault);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wanderling-save.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setVaultFeedback({ kind: 'ok', message: 'Saved wanderling-save.json backup!' });
  };

  const requireCoopParentGate = (message: string) => {
    playSfx('gentle_nudge');
    setCoopParentGateOpen(true);
    setVaultFeedback({ kind: 'err', message });
  };

  const getCoopMaskedImportBlockMessage = (raw: string): string | null => {
    if (!isCoopMasked) return null;
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!parsed || typeof parsed !== 'object') return null;
    const payload = parsed as { activeProfileId?: unknown; profiles?: unknown };
    if (!Array.isArray(payload.profiles)) return null;

    const profiles = payload.profiles.filter(
      (p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object'
    );
    if (importMode === 'replace') {
      const requestedActiveId =
        typeof payload.activeProfileId === 'string' ? payload.activeProfileId : undefined;
      const target =
        (requestedActiveId ? profiles.find((p) => p.id === requestedActiveId) : undefined) ??
        profiles[0];
      if (Boolean(target?.adultModeActive)) {
        return 'Confirm Parent Controls (18+) before replacing with this active explorer during Family Co-Op.';
      }
      return null;
    }
    if (profiles.some((p) => p.id === activeProfile.id && p.adultModeActive === true)) {
      return 'Confirm Parent Controls (18+) before merging this active explorer during Family Co-Op.';
    }
    return null;
  };

  const applyImportText = (raw: string) => {
    const blockedMessage = getCoopMaskedImportBlockMessage(raw);
    if (blockedMessage) {
      requireCoopParentGate(blockedMessage);
      return;
    }

    const res = importVaultJson(raw, importMode);
    if (res.ok) {
      playSfx('chest_open');
      setPasteJsonText('');
      setPasteJsonOpen(false);
      setVaultFeedback({
        kind: 'ok',
        message: `Imported ${res.importedProfilesCount ?? 1} explorer profile(s) (${importMode})!`,
      });
    } else {
      playSfx('gentle_nudge');
      setVaultFeedback({
        kind: 'err',
        message: res.error ?? 'That save file could not be read.',
      });
    }
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      if (!isMountedRef.current) return;
      applyImportText(text);
    } catch {
      if (!isMountedRef.current) return;
      setVaultFeedback({ kind: 'err', message: 'Unable to read selected file.' });
    }
  };

  return (
    <>
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Explorer Profiles and Save Vault"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxHeight: 'calc(100dvh - 28px)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-main)' }}>
              Explorer Profiles & Vault
            </h2>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Switch kids or back up progress to .wanderling-save.json
            </div>
          </div>
          <button
            type="button"
            className="tactile-btn tactile-btn-soft"
            style={{ padding: 8, borderRadius: 12 }}
            aria-label="Close profiles modal"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="console-scroll-pane"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            paddingRight: 6,
          }}
        >

        {isCoopMasked ? (
          <div
            data-testid="profile-modal-coop-safe-mask"
            style={{
              padding: '10px 12px',
              borderRadius: 16,
              background: 'var(--tint-emerald-bg)',
              border: '2px solid var(--tint-emerald-border)',
              color: 'var(--tint-emerald-ink)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 900, fontSize: '0.86rem' }}>
                <ShieldCheck size={16} />
                <span>Family Co-Op Safe Atlas Active</span>
              </div>
              {!coopParentGateOpen ? (
                <button
                  type="button"
                  data-testid="profile-modal-unlock-parent-controls-btn"
                  className="tactile-btn tactile-btn-soft"
                  style={{ padding: '5px 10px', fontSize: '0.76rem', borderRadius: 12 }}
                  onClick={() => {
                    playSfx('button_click');
                    setCoopParentGateOpen(true);
                  }}
                >
                  Parent Controls (18+)
                </button>
              ) : null}
            </div>

            {coopParentGateOpen ? (
              <div
                data-testid="profile-modal-parent-gate"
                style={{
                  padding: '8px 10px',
                  borderRadius: 12,
                  background: 'var(--card-soft-bg)',
                  border: '1.5px solid var(--card-border)',
                  color: 'var(--text-main)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Confirm you are 18+ to show parent track controls for this modal session.
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    data-testid="profile-modal-confirm-parent-btn"
                    className="tactile-btn tactile-btn-indigo"
                    style={{ padding: '6px 11px', fontSize: '0.78rem', borderRadius: 12 }}
                    onClick={() => {
                      playSfx('button_click');
                      setCoopMaskUnlockedByParent(true);
                      setCoopParentGateOpen(false);
                      setVaultFeedback((prev) => (prev?.kind === 'err' ? null : prev));
                    }}
                  >
                    I am 18+ — Show Parent Controls
                  </button>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-soft"
                    style={{ padding: '6px 11px', fontSize: '0.78rem', borderRadius: 12 }}
                    onClick={() => {
                      playSfx('button_click');
                      setCoopParentGateOpen(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Profile Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vault.profiles.map((profile) => {
            const isActive = profile.id === activeProfile.id;
            const shouldMaskAdultLang = isCoopMasked || !profile.adultModeActive;
            const safeFallbackLang: BaseLanguageCode = isCoopMasked
              ? profile.lastBaseLanguage && !isAdultLanguage(profile.lastBaseLanguage)
                ? profile.lastBaseLanguage
                : 'es'
              : (profile.lastBaseLanguage ?? 'en');
            const displayLang: LanguageCode =
              shouldMaskAdultLang && isAdultLanguage(profile.activeLanguage)
                ? safeFallbackLang
                : profile.activeLanguage;
            const displayLangMeta = LANGUAGE_META[displayLang] ?? LANGUAGE_META.es;
            return (
              <div
                key={profile.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 18,
                  borderTopWidth: 2,
                  borderRightWidth: 2,
                  borderLeftWidth: 2,
                  borderBottomWidth: 4,
                  borderStyle: 'solid',
                  borderColor: isActive ? profile.bannerColor : 'var(--card-border)',
                  background: isActive ? 'var(--card-soft-bg)' : 'var(--tile-bg)',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  style={{
                    flex: '1 1 200px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-main)',
                  }}
                  onClick={() => {
                    if (
                      isCoopMasked &&
                      Boolean(profile.adultModeActive) &&
                      profile.id !== activeProfile.id
                    ) {
                      requireCoopParentGate(
                        'Confirm Parent Controls (18+) before switching into this profile during Family Co-Op.'
                      );
                      return;
                    }
                    playSfx('button_click');
                    vaultActions.switchProfile(profile.id);
                  }}
                >
                  <div
                    style={{
                      padding: 4,
                      borderRadius: 999,
                      background: profile.bannerColor,
                      display: 'inline-flex',
                    }}
                  >
                    <AvatarBadge avatarId={profile.avatarId} size={40} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                        {profile.name}
                      </strong>
                      <FlagIcon language={displayLang} size={20} />
                      {isActive ? (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: 'var(--tint-emerald-bg)',
                            color: 'var(--tint-emerald-ink)',
                            fontSize: '0.7rem',
                            fontWeight: 900,
                          }}
                        >
                          Active
                        </span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginTop: 2,
                      }}
                    >
                      <span>{displayLangMeta.name}</span>
                      <span>•</span>
                      <span>{profile.totalXp} XP</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Gem size={12} /> {profile.gems}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Flame size={12} /> {profile.streakDays}d
                      </span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  className="tactile-btn tactile-btn-soft"
                  style={{ padding: '7px 10px', borderRadius: 12 }}
                  disabled={!canDelete}
                  aria-label={`Delete profile ${profile.name}`}
                  title={canDelete ? `Delete ${profile.name}` : 'Keep at least 1 explorer profile'}
                  onClick={() => {
                    playSfx('button_click');
                    vaultActions.deleteProfile(profile.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Active Explorer Pack & Unlocked Avatars Summary */}
        <div
          style={{
            padding: 12,
            borderRadius: 18,
            background: 'var(--card-soft-bg)',
            border: '2px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontWeight: 900, fontSize: '0.88rem', color: 'var(--text-main)' }}>
              {activeProfile.name}’s Pack & Boosters
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span
                className="hud-pill hud-pill-static"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              >
                <Heart size={12} color="#f43f5e" fill="#f43f5e" />
                <span>
                  {activeProfile.hearts}/{activeProfile.maxHearts} (Max {MAX_HEART_CONTAINERS})
                </span>
              </span>
              <span
                className="hud-pill hud-pill-static"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              >
                <Sparkles size={12} color="#10b981" />
                <span>Elixirs: {activeProfile.heartElixirs ?? 0}</span>
              </span>
              <span
                className="hud-pill hud-pill-static"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              >
                <Zap size={12} color="#f59e0b" />
                <span>2x XP: {activeProfile.xpBoosterCharges ?? 0}</span>
              </span>
              <span
                className="hud-pill hud-pill-static"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              >
                <Shield size={12} color="#38bdf8" />
                <span>Shields: {activeProfile.streakShields}</span>
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 5 }}>
              Unlocked Avatars (Tap to Equip):
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ALL_AVATAR_OPTIONS.filter((av) => {
                const unlockedList = activeProfile.unlockedAvatars ?? STARTER_AVATAR_IDS;
                return unlockedList.includes(av.id) || activeProfile.avatarId === av.id;
              }).map((av) => {
                const isSelected = activeProfile.avatarId === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    className="tactile-btn"
                    style={{
                      padding: '4px 8px',
                      borderRadius: 12,
                      background: isSelected ? 'var(--tint-indigo-bg)' : 'var(--tile-bg)',
                      borderColor: isSelected ? 'var(--lang-primary)' : 'var(--card-border)',
                    }}
                    onClick={() => {
                      playSfx('tile_tap');
                      safeVaultActions.buyAndSelectAvatar(av.id);
                    }}
                  >
                    <AvatarBadge avatarId={av.id} size={24} />
                    <span style={{ fontSize: '0.74rem' }}>{av.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* + New Kid Explorer Creator */}
        {!showCreator ? (
          <button
            type="button"
            className="tactile-btn tactile-btn-primary"
            onClick={() => {
              playSfx('button_click');
              setShowCreator(true);
            }}
          >
            <UserPlus size={18} />
            <span>+ New Kid Explorer</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreateProfile}
            style={{
              padding: 14,
              borderRadius: 18,
              background: 'var(--card-soft-bg)',
              border: '2px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>Create New Kid Explorer</div>
            <input
              type="text"
              className="themed-input"
              value={newName}
              maxLength={20}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Explorer name (e.g. Sam)"
              aria-label="New explorer name"
              style={{
                padding: '9px 12px',
                fontSize: '0.95rem',
              }}
            />

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 5 }}>
                Pick Avatar:
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STARTER_AVATAR_OPTIONS.map((av) => {
                  const selected = newAvatar === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      className="tactile-btn"
                      style={{
                        padding: '5px 8px',
                        borderRadius: 14,
                        background: selected ? 'var(--tint-indigo-bg)' : 'var(--tile-bg)',
                        borderColor: selected ? 'var(--lang-primary)' : 'var(--card-border)',
                      }}
                      onClick={() => setNewAvatar(av.id)}
                    >
                      <AvatarBadge avatarId={av.id} size={28} />
                      <span style={{ fontSize: '0.76rem' }}>{av.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 5 }}>
                Pick Banner Color:
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {BANNER_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Color ${hex}`}
                    onClick={() => setNewBanner(hex)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: hex,
                      border: newBanner === hex ? '3px solid var(--text-main)' : '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 5 }}>
                Pick Starting Language:
              </div>
              <div
                className="console-scroll-pane"
                style={{ maxHeight: 148, paddingRight: 2 }}
              >
                <div
                  role="group"
                  aria-label="Pick Starting Language"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 6,
                  }}
                >
                  {LANGUAGE_LIST.map((lang) => {
                    const meta = LANGUAGE_META[lang];
                    const selected = newLanguage === lang;
                    return (
                      <button
                        key={lang}
                        type="button"
                        aria-pressed={selected}
                        className="tactile-btn"
                        style={{
                          justifyContent: 'flex-start',
                          padding: '5px 8px',
                          borderRadius: 12,
                          gap: 6,
                          minWidth: 0,
                          background: selected ? 'var(--tint-indigo-bg)' : 'var(--tile-bg)',
                          borderColor: selected ? meta.accentPalette.primary : 'var(--card-border)',
                        }}
                        onClick={() => {
                          playSfx('tile_tap');
                          setNewLanguage(lang);
                        }}
                      >
                        <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                          <FlagIcon language={lang} size={18} />
                        </span>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {meta.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="tactile-btn tactile-btn-soft"
                onClick={() => setShowCreator(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="tactile-btn tactile-btn-success"
                disabled={!newName.trim()}
              >
                Create Explorer
              </button>
            </div>
          </form>
        )}

        {/* Export / Import Vault */}
        <div
          style={{
            padding: 14,
            borderRadius: 18,
            background: 'var(--card-soft-bg)',
            border: '2px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: '0.94rem' }}>Save Vault Backup</div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="tactile-btn tactile-btn-indigo" onClick={handleExport}>
              <Download size={16} />
              <span>Export .wanderling-save.json</span>
            </button>

            <label className="tactile-btn tactile-btn-soft" style={{ cursor: 'pointer' }}>
              <Upload size={16} />
              <span>Import Save File</span>
              <input
                type="file"
                accept=".json,.wanderling-save.json,application/json"
                className="visually-hidden"
                onChange={handleImportFile}
              />
            </label>

            <button
              type="button"
              className="tactile-btn tactile-btn-soft"
              style={{ fontSize: '0.8rem', padding: '7px 11px' }}
              onClick={() => setPasteJsonOpen((v) => !v)}
            >
              {pasteJsonOpen ? 'Hide Paste Box' : 'Paste JSON'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', fontWeight: 800 }}>
            <span>Import Mode:</span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="radio"
                name="import-mode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
              />
              Replace
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="radio"
                name="import-mode"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
              />
              Merge
            </label>
          </div>

          {pasteJsonOpen ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea
                rows={4}
                className="themed-input"
                value={pasteJsonText}
                onChange={(e) => setPasteJsonText(e.target.value)}
                placeholder="Paste exported JSON save data here..."
                aria-label="Paste save JSON"
                style={{
                  width: '100%',
                  padding: 8,
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                }}
              />
              <button
                type="button"
                className="tactile-btn tactile-btn-primary"
                disabled={!pasteJsonText.trim()}
                onClick={() => applyImportText(pasteJsonText)}
              >
                Import Pasted JSON
              </button>
            </div>
          ) : null}

          {vaultFeedback ? (
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 12,
                background:
                  vaultFeedback.kind === 'ok' ? 'var(--tint-emerald-bg)' : 'var(--tint-rose-bg)',
                border: `2px solid ${
                  vaultFeedback.kind === 'ok'
                    ? 'var(--tint-emerald-border)'
                    : 'var(--tint-rose-border)'
                }`,
                color:
                  vaultFeedback.kind === 'ok' ? 'var(--tint-emerald-ink)' : 'var(--tint-rose-ink)',
                fontWeight: 800,
                fontSize: '0.84rem',
              }}
            >
              {vaultFeedback.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{vaultFeedback.message}</span>
            </div>
          ) : null}
        </div>

        {/* Offline Atlas Pack Downloader */}
        <div
          data-testid="offline-pack-section"
          style={{
            padding: 14,
            borderRadius: 18,
            background: 'var(--card-soft-bg)',
            border: '2px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.94rem', color: 'var(--text-main)' }}>
                Offline Atlas Pack
              </div>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Download all language trails to play smoothly without Wi-Fi.
              </div>
            </div>
            <span
              style={{
                padding: '3px 9px',
                borderRadius: 999,
                background:
                  cachedPackCounts.loadedCount >= cachedPackCounts.totalCount
                    ? 'var(--tint-emerald-bg)'
                    : 'var(--tint-indigo-bg)',
                border: `1.5px solid ${
                  cachedPackCounts.loadedCount >= cachedPackCounts.totalCount
                    ? 'var(--tint-emerald-border)'
                    : 'var(--tint-indigo-border)'
                }`,
                color:
                  cachedPackCounts.loadedCount >= cachedPackCounts.totalCount
                    ? 'var(--tint-emerald-ink)'
                    : 'var(--tint-indigo-ink)',
                fontSize: '0.72rem',
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}
            >
              {cachedPackCounts.loadedCount} / {cachedPackCounts.totalCount} languages cached offline
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              data-testid="download-offline-pack-btn"
              className="tactile-btn tactile-btn-primary"
              disabled={offlinePackLoading}
              onClick={() => {
                void handleDownloadOfflinePack();
              }}
            >
              <Download size={16} />
              <span>
                {offlinePackLoading
                  ? 'Downloading Offline Pack...'
                  : 'Download All Languages for Offline'}
              </span>
            </button>
          </div>

          {offlinePackResult ? (
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 11px',
                borderRadius: 12,
                background:
                  offlinePackResult.errors.length === 0
                    ? 'var(--tint-emerald-bg)'
                    : 'var(--tint-amber-bg)',
                border: `2px solid ${
                  offlinePackResult.errors.length === 0
                    ? 'var(--tint-emerald-border)'
                    : 'var(--tint-amber-border)'
                }`,
                color:
                  offlinePackResult.errors.length === 0
                    ? 'var(--tint-emerald-ink)'
                    : 'var(--tint-amber-ink)',
                fontWeight: 800,
                fontSize: '0.8rem',
              }}
            >
              {offlinePackResult.errors.length === 0 ? (
                <CheckCircle2 size={15} />
              ) : (
                <AlertCircle size={15} />
              )}
              <span>
                {offlinePackResult.errors.length === 0
                  ? `${offlinePackResult.loadedCount} / ${offlinePackResult.totalCount} languages cached offline — ready anywhere!`
                  : `${offlinePackResult.loadedCount} / ${offlinePackResult.totalCount} languages cached offline — Reconnect and retry to finish caching.`}
              </span>
            </div>
          ) : null}
        </div>

        {/* Discreet Unlocked Adult Controls (re-entry, 1-tap kid restore & Study Break opt-in) */}
        {!isCoopMasked && !adultConfirmOpen && isUnlockedAdult ? (
          <div
            data-testid="profile-modal-adult-controls"
            style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {!activeProfile.adultModeActive ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="tactile-btn tactile-btn-indigo"
                  style={{ flex: '1 1 180px', padding: '8px 12px', fontSize: '0.82rem' }}
                  onClick={() => {
                    playSfx('adult_unlock');
                    safeVaultActions.setAdultModeActive(true);
                    onClose();
                  }}
                >
                  <ShieldCheck size={15} />
                  <span>Enter After-Hours Atlas (18+)</span>
                </button>

                {priorKidProfile ? (
                  <button
                    type="button"
                    data-testid="restore-prior-kid-btn"
                    className="tactile-btn tactile-btn-success"
                    style={{ flex: '1 1 170px', padding: '8px 12px', fontSize: '0.82rem' }}
                    onClick={() => {
                      playSfx('whoosh_transition');
                      safeVaultActions.returnToPriorKidProfile(priorKidProfile.id);
                      onClose();
                    }}
                  >
                    <AvatarBadge avatarId={priorKidProfile.avatarId} size={18} />
                    <span>Switch back to {priorKidProfile.name}</span>
                  </button>
                ) : null}
              </div>
            ) : null}

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 12,
                background: 'var(--card-soft-bg)',
                border: '1.5px solid var(--card-border)',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                data-testid="study-break-restore-kid-toggle"
                checked={unlockedRestoreOnStudyBreak}
                onChange={(e) => {
                  const next = e.target.checked;
                  playSfx('tile_tap');
                  setUnlockedRestoreOnStudyBreak(next);
                  safeVaultActions.setRestoreKidProfileOnStudyBreak(next);
                }}
                style={{
                  width: 16,
                  height: 16,
                  accentColor: 'var(--lang-primary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <span>Switch back to Kid Explorer on Study Break</span>
            </label>
          </div>
        ) : null}
        </div>

        {/* Discreet Kid-Innocuous Atlas Version Footer & Keycode Entry */}
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid var(--card-border)',
            paddingTop: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              data-testid="atlas-version-easter-egg"
              onClick={handleVersionPillTap}
              style={{
                background: 'var(--card-soft-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 999,
                padding: '3px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Wanderling Atlas v2.0
            </button>

            <button
              type="button"
              onClick={() => {
                playSfx('button_click');
                setKeycodeOpen((v) => !v);
                setKeycodeError(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: '1px solid var(--card-border)',
                borderRadius: 999,
                padding: '3px 9px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <KeyRound size={12} />
              <span>Atlas Keycode</span>
            </button>
          </div>

          {keycodeOpen ? (
            <form
              onSubmit={handleKeycodeSubmit}
              style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
            >
              <input
                type="text"
                className="themed-input"
                value={keycodeInput}
                onChange={(e) => {
                  setKeycodeInput(e.target.value);
                  if (keycodeError) setKeycodeError(null);
                }}
                placeholder="Enter atlas keycode..."
                aria-label="Atlas Keycode"
                style={{
                  flex: '1 1 150px',
                  minWidth: 0,
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                }}
              />
              <button
                type="submit"
                className="tactile-btn tactile-btn-soft"
                style={{ padding: '5px 11px', fontSize: '0.76rem', borderRadius: 11 }}
                disabled={!keycodeInput.trim()}
              >
                Apply
              </button>
              {keycodeError ? (
                <div style={{ width: '100%', fontSize: '0.74rem', fontWeight: 700, color: 'var(--tint-rose-ink)' }}>
                  {keycodeError}
                </div>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>
    </div>

    {adultConfirmOpen ? (
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="After-Hours Atlas 18+ Confirmation"
        style={{ zIndex: 105 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setAdultConfirmOpen(false);
        }}
      >
        <div
          className="modal-card"
          style={{
            maxWidth: 540,
            maxHeight: 'calc(100dvh - 28px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'var(--tint-indigo-bg)',
                  border: '1.5px solid var(--tint-indigo-border)',
                  color: 'var(--tint-indigo-ink)',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                }}
              >
                18+ ONLY
              </span>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)' }}>
                After-Hours Atlas
              </h2>
            </div>
            <button
              type="button"
              className="tactile-btn tactile-btn-soft"
              style={{ padding: 6, borderRadius: 11 }}
              aria-label="Close 18+ confirmation modal"
              onClick={() => setAdultConfirmOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div
            className="console-scroll-pane"
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              paddingRight: 2,
            }}
          >
            <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.45 }}>
              Unlock bidirectional adult colloquial slang &amp; American subculture clash tracks.
              Default kid profiles (<strong>Leo</strong> &amp; <strong>Maya</strong>) stay 100%
              kid-safe and untouched — you can switch back to the Kid Atlas with 1 tap anytime.
            </p>

            <div role="group" aria-label="Choose Initial Track Direction" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(
                [
                  {
                    heading: 'Original Vernacular',
                    tracks: CLASSIC_ADULT_LANGUAGES as readonly AdultLanguageCode[],
                    columns: 'repeat(2, minmax(0, 1fr))',
                  },
                  {
                    heading: 'American Culture Clash (5 Mashups)',
                    tracks: ADULT_MASHUP_LANGUAGES as readonly AdultLanguageCode[],
                    columns: 'repeat(auto-fit, minmax(195px, 1fr))',
                  },
                ] as const
              ).map((section) => (
                <div key={section.heading}>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      marginBottom: 6,
                    }}
                  >
                    {section.heading}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: section.columns,
                      gap: 7,
                    }}
                  >
                    {section.tracks.map((code) => {
                      const selected = selectedAdultTrack === code;
                      const meta = LANGUAGE_META[code];
                      const classicCopy =
                        code === 'ebonics' || code === 'suburban' ? CLASSIC_TRACK_COPY[code] : null;
                      const title = classicCopy ? classicCopy.title : meta.name;
                      const clashTag = classicCopy
                        ? classicCopy.subtitle
                        : `${meta.dialectA ?? meta.name} <-> ${meta.dialectB ?? meta.translationLanguageLabel ?? ''}`;
                      return (
                        <button
                          key={code}
                          type="button"
                          aria-pressed={selected}
                          className="tactile-btn"
                          style={{
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 4,
                            padding: '8px 10px',
                            minWidth: 0,
                            textAlign: 'left',
                            background: selected ? 'var(--tile-selected-bg)' : 'var(--tile-bg)',
                            borderColor: selected ? meta.accentPalette.primary : 'var(--card-border)',
                            color: selected ? 'var(--tile-selected-ink)' : 'var(--text-main)',
                          }}
                          onClick={() => {
                            playSfx('tile_tap');
                            setSelectedAdultTrack(code);
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                            <FlagIcon language={code} size={22} />
                            <ArrowLeftRight size={13} style={{ opacity: 0.7 }} />
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 900, overflowWrap: 'break-word', width: '100%' }}>
                            {title}
                          </div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', overflowWrap: 'break-word', width: '100%' }}>
                            {clashTag}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {isOnDefaultKid ? (
              <div>
                <label
                  htmlFor="adult-profile-name-input"
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    marginBottom: 5,
                  }}
                >
                  Adult Profile Name (optional — keeps {activeProfile.name} untouched)
                </label>
                <input
                  id="adult-profile-name-input"
                  type="text"
                  className="themed-input"
                  value={adultProfileName}
                  maxLength={20}
                  onChange={(e) => setAdultProfileName(e.target.value)}
                  placeholder="Parent"
                  aria-label="Adult Profile Name"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem' }}
                />
              </div>
            ) : null}

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 12,
                background: 'var(--card-soft-bg)',
                border: '1.5px solid var(--card-border)',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                data-testid="study-break-restore-kid-toggle"
                checked={confirmRestoreOnStudyBreak}
                onChange={(e) => {
                  playSfx('tile_tap');
                  setConfirmRestoreOnStudyBreak(e.target.checked);
                }}
                style={{
                  width: 16,
                  height: 16,
                  accentColor: 'var(--lang-primary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <span>Switch back to Kid Explorer on Study Break</span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0, paddingTop: 2 }}>
            <button
              type="button"
              className="tactile-btn tactile-btn-hero tactile-btn-indigo"
              style={{ width: '100%' }}
              onClick={() => {
                playSfx('adult_unlock');
                safeVaultActions.unlockAdultMode({
                  ...(isOnDefaultKid
                    ? { adultProfileName: adultProfileName.trim() || 'Parent' }
                    : {}),
                  initialTrack: selectedAdultTrack,
                });
                safeVaultActions.setRestoreKidProfileOnStudyBreak(confirmRestoreOnStudyBreak);
                setAdultConfirmOpen(false);
                onClose();
              }}
            >
              <ShieldCheck size={18} />
              <span>I am 18+ — Unlock After-Hours Atlas</span>
            </button>

            <button
              type="button"
              className="tactile-btn tactile-btn-soft"
              style={{ width: '100%' }}
              onClick={() => {
                playSfx('button_click');
                setAdultConfirmOpen(false);
              }}
            >
              Stay in Kid Atlas
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
