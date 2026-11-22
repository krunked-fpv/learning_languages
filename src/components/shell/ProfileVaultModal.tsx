import { useState, type ChangeEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Flame,
  Gem,
  Trash2,
  Upload,
  UserPlus,
  X,
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
import type { AvatarId } from '../../types/contracts';

const AVATAR_OPTIONS: readonly { id: AvatarId; label: string }[] = [
  { id: 'pip_explorer', label: 'Pip' },
  { id: 'mateo_chef', label: 'Mateo' },
  { id: 'colette_baker', label: 'Colette' },
  { id: 'benni_tinker', label: 'Benni' },
  { id: 'luca_captain', label: 'Luca' },
  { id: 'star_compass', label: 'Compass' },
];

const BANNER_PALETTE = [
  '#2563EB',
  '#EA580C',
  '#059669',
  '#9333EA',
  '#E11D48',
  '#D97706',
] as const;

export interface ProfileVaultModalProps {
  onClose: () => void;
}

export function ProfileVaultModal({ onClose }: ProfileVaultModalProps) {
  const { vault, activeProfile } = useVaultStore();
  const [showCreator, setShowCreator] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState<AvatarId>('pip_explorer');
  const [newBanner, setNewBanner] = useState<string>(BANNER_PALETTE[0]);

  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [pasteJsonOpen, setPasteJsonOpen] = useState(false);
  const [pasteJsonText, setPasteJsonText] = useState('');
  const [vaultFeedback, setVaultFeedback] = useState<{
    kind: 'ok' | 'err';
    message: string;
  } | null>(null);

  const canDelete = vault.profiles.length > 1;

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    vaultActions.createProfile({
      name: trimmed.slice(0, 20),
      avatarId: newAvatar,
      bannerColor: newBanner,
    });
    playSfx('correct_chime');
    setNewName('');
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

  const applyImportText = (raw: string) => {
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
      applyImportText(text);
    } catch {
      setVaultFeedback({ kind: 'err', message: 'Unable to read selected file.' });
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Explorer Profiles and Save Vault"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
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

        {/* Profile Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vault.profiles.map((profile) => {
            const isActive = profile.id === activeProfile.id;
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
                      <FlagIcon language={profile.activeLanguage} size={20} />
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
                        gap: 10,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginTop: 2,
                      }}
                    >
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
                {AVATAR_OPTIONS.map((av) => {
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
      </div>
    </div>
  );
}
