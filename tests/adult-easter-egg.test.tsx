import '@testing-library/jest-dom/vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import * as audioModule from '../src/audio';
import {
  SPEECH_LOCALE_MAP,
  getSpeechRuntimeState,
  hasNativeVoice,
  playSfx,
  rankVoiceForLanguage,
  setAudioPreferences,
  speakPhrase,
  stopSpeech,
} from '../src/audio';
import { VOCAB_ILLUSTRATIONS } from '../src/art/VocabIllustration';
import { ArcadeHub } from '../src/components/arcade/ArcadeHub';
import { FALLBACK_ARCADE_LEXICON } from '../src/components/arcade/arcadeShared';
import {
  buildTapHintsFromExample,
  joinWordBankTokens,
  splitTapHintsAroundBlank,
} from '../src/components/lesson/lessonHelpers';
import { WordBankView } from '../src/components/lesson/WordBankView';
import { AdventureMap } from '../src/components/map/AdventureMap';
import { PhrasebookVault } from '../src/components/meta/PhrasebookVault';
import { ProfileVaultModal } from '../src/components/shell/ProfileVaultModal';
import { TopHud } from '../src/components/shell/TopHud';
import { gradeAnswer } from '../src/core';
import {
  COURSES,
  buildTierCheckpointNode,
  ensureAllAdultCoursesLoaded,
  getAdultCourse,
  getArcadeLexicon,
  getCourse,
  getNodeById,
  getPlayableNodeExercises,
  getUnitById,
  getVisibleLanguageCodes,
} from '../src/curriculum';
import {
  STORAGE_KEY,
  createDefaultVault,
  exportVaultJson,
  importVaultJson,
  loadVaultFromStorage,
  vaultActions,
} from '../src/store/useVaultStore';
import {
  ADULT_EASTER_EGG_CODES,
  ADULT_EASTER_EGG_LANGUAGES,
  ADULT_EASTER_EGG_TAP_COUNT,
  ADULT_MASHUP_LANGUAGES,
  ALL_LANGUAGE_LIST,
  CLASSIC_ADULT_LANGUAGES,
  DEFAULT_KID_PROFILE_IDS,
  ILLUSTRATION_KEYS,
  LANGUAGE_LIST,
  LANGUAGE_META,
  PROFICIENCY_TIERS,
  VISIBLE_BASE_LANGUAGES,
  isAdultLanguage,
  isAdultMashupLanguage,
  isDefaultKidProfileId,
  resolveUnitProficiencyTier,
  type KidProfile,
  type SaveVault,
  type TapHintToken,
} from '../src/types/contracts';

const ROOT_DIR = resolve(__dirname, '..');
const UNICODE_FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]/u;
const BANNED_ALCOHOL_RE =
  /\b(wine|beer|vino|cerveza|bier|vin|birra|alcohol|champagne|cocktail|vodka|whiskey|tequila|pub|tavern)\b/i;
const TEST_CLEAN_RE =
  /[\s¡!¿?.,;:"'’‘“”„«»‹›()[\]。？！，、；：・「」『』（）【】《》〈〉؟،؛।॥—–―…\-_\u0640]/g;

function walkFiles(dir: string, exts: RegExp, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      walkFiles(full, exts, out);
    } else if (exts.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function cleanCompare(raw: string): string {
  return raw.toLowerCase().replace(TEST_CLEAN_RE, '');
}

function assertValidTapHints(tokens: readonly TapHintToken[], context: string): void {
  expect(tokens.length, `${context}: tapHints must be non-empty`).toBeGreaterThan(0);
  for (const token of tokens) {
    expect(token.surface.trim(), `${context}: token surface empty`).not.toBe('');
    expect(token.normalizedId.trim(), `${context}: token normalizedId empty`).not.toBe('');
    expect(token.translation.trim(), `${context}: token "${token.surface}" translation empty`).not.toBe('');
    expect(token.phonetic.trim(), `${context}: token "${token.surface}" phonetic empty`).not.toBe('');
    expect(token.speakText.trim(), `${context}: token "${token.surface}" speakText empty`).not.toBe('');
  }
}

function makeMockVoice(lang: string, name = `Voice ${lang}`): SpeechSynthesisVoice {
  return {
    name,
    lang,
    localService: true,
    default: false,
    voiceURI: lang,
  } as SpeechSynthesisVoice;
}

function createFakeUtteranceCtor() {
  interface MockUtt {
    text: string;
    voice: SpeechSynthesisVoice | null;
    lang: string;
    rate: number;
    pitch: number;
    volume: number;
    onend: ((ev: Event) => void) | null;
    onerror: ((ev: SpeechSynthesisErrorEvent) => void) | null;
  }
  const created: MockUtt[] = [];
  class FakeUtterance implements MockUtt {
    text: string;
    voice: SpeechSynthesisVoice | null = null;
    lang = '';
    rate = 1;
    pitch = 1;
    volume = 1;
    onend: ((ev: Event) => void) | null = null;
    onerror: ((ev: SpeechSynthesisErrorEvent) => void) | null = null;
    constructor(text = '') {
      this.text = text;
      created.push(this);
    }
  }
  return { FakeUtterance, created };
}

function createMockAudioContext() {
  const oscTypes: string[] = [];
  class MockAudioContext {
    state: AudioContextState = 'running';
    currentTime = 0;
    destination = {} as AudioDestinationNode;
    resume = vi.fn().mockResolvedValue(undefined);
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          setTargetAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        Q: { value: 1, setValueAtTime: vi.fn() },
        frequency: {
          value: 1000,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
    }
    createOscillator() {
      return {
        _type: 'sine' as OscillatorType,
        get type(): OscillatorType {
          return this._type;
        },
        set type(v: OscillatorType) {
          this._type = v;
          oscTypes.push(v);
        },
        frequency: {
          value: 440,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
        onended: null as (() => void) | null,
      };
    }
  }
  return { MockAudioContext, oscTypes };
}

function assertKidProfileQuarantined(profile: KidProfile): void {
  expect(isDefaultKidProfileId(profile.id)).toBe(true);
  expect(profile.adultModeUnlocked).toBe(false);
  expect(profile.adultModeActive).toBe(false);
  expect(isAdultLanguage(profile.activeLanguage)).toBe(false);
  expect(Object.keys(profile.languageProgress).sort()).toEqual([...LANGUAGE_LIST].sort());
}

function assertAdultInvisibleEverywhere(options: { allowReentryButton?: boolean } = {}): void {
  const hud = render(
    <TopHud
      onOpenProfileModal={vi.fn()}
      onOpenArcade={vi.fn()}
      canInstallApp={false}
      onInstallApp={vi.fn()}
    />
  );
  expect(screen.queryByTestId('return-to-kid-atlas-btn')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Active language:/i }));
  const langDialog = screen.getByRole('dialog', { name: 'Switch Language' });
  expect(within(langDialog).getAllByRole('button')).toHaveLength(16);
  for (const adultCode of ADULT_EASTER_EGG_LANGUAGES) {
    expect(langDialog.querySelector(`svg[data-flag="${adultCode}"]`)).not.toBeInTheDocument();
    expect(within(langDialog).queryByText(LANGUAGE_META[adultCode].name)).not.toBeInTheDocument();
  }
  expect(within(langDialog).queryByText(/After-Hours/i)).not.toBeInTheDocument();
  hud.unmount();

  const pb = render(<PhrasebookVault />);
  const pbFilter = screen.getByRole('group', { name: 'Filter phrasebook by language' });
  expect(within(pbFilter).getAllByRole('button')).toHaveLength(16);
  for (const adultCode of ADULT_EASTER_EGG_LANGUAGES) {
    expect(pbFilter.querySelector(`svg[data-flag="${adultCode}"]`)).not.toBeInTheDocument();
  }
  pb.unmount();

  const pm = render(<ProfileVaultModal onClose={vi.fn()} />);
  if (options.allowReentryButton) {
    expect(screen.getByRole('button', { name: /Enter After-Hours Atlas/i })).toBeInTheDocument();
  } else {
    expect(screen.queryByRole('button', { name: /Enter After-Hours Atlas/i })).not.toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole('button', { name: /\+ New Kid Explorer/i }));
  const creatorLangs = screen.getByRole('group', { name: 'Pick Starting Language' });
  expect(within(creatorLangs).getAllByRole('button')).toHaveLength(16);
  for (const adultCode of ADULT_EASTER_EGG_LANGUAGES) {
    expect(creatorLangs.querySelector(`svg[data-flag="${adultCode}"]`)).not.toBeInTheDocument();
  }
  pm.unmount();

  const arc = render(<ArcadeHub onExitToMap={vi.fn()} />);
  for (const adultCode of ADULT_EASTER_EGG_LANGUAGES) {
    expect(document.querySelector(`svg[data-flag="${adultCode}"]`)).not.toBeInTheDocument();
    expect(screen.queryByText(LANGUAGE_META[adultCode].pairDirectionBadge ?? '')).not.toBeInTheDocument();
  }
  arc.unmount();
}

describe('After-Hours Atlas: Adult Mode Easter Egg, Kid Quarantine & Bidirectional Parity', () => {
  const originalSpeechSynthesis = window.speechSynthesis;
  const originalUtterance = globalThis.SpeechSynthesisUtterance;
  const originalAudioContext = (window as unknown as { AudioContext?: unknown }).AudioContext;

  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    setAudioPreferences({ volume: 0.85, muted: false });
    stopSpeech();
  });

  afterEach(() => {
    vi.useRealTimers();
    stopSpeech();
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: originalSpeechSynthesis,
    });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: originalUtterance,
    });
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: originalAudioContext,
    });
  });

  it('a) preserves zero base-game regressions: 16 courses, 256 units, 1,792 nodes, 112 illustrations, alcohol safety & hygiene', () => {
    expect(VISIBLE_BASE_LANGUAGES).toHaveLength(16);
    expect(LANGUAGE_LIST).toEqual(VISIBLE_BASE_LANGUAGES);
    expect(CLASSIC_ADULT_LANGUAGES).toEqual(['ebonics', 'suburban']);
    expect(ADULT_MASHUP_LANGUAGES).toEqual([
      'corp_trades',
      'midwest_northeast',
      'south_genz',
      'cali_country',
      'stoner_tactical',
    ]);
    expect(ADULT_EASTER_EGG_LANGUAGES).toHaveLength(7);
    expect(ALL_LANGUAGE_LIST).toHaveLength(23);
    expect(Object.keys(COURSES)).toHaveLength(16);
    for (const adultCode of ADULT_EASTER_EGG_LANGUAGES) {
      expect(Object.keys(COURSES)).not.toContain(adultCode);
    }
    expect(getVisibleLanguageCodes(false)).toEqual(VISIBLE_BASE_LANGUAGES);
    expect(getVisibleLanguageCodes(true)).toEqual(ALL_LANGUAGE_LIST);

    expect(Object.keys(VOCAB_ILLUSTRATIONS)).toHaveLength(112);
    expect(new Set(Object.keys(VOCAB_ILLUSTRATIONS))).toEqual(new Set(ILLUSTRATION_KEYS));

    let totalUnits = 0;
    let totalNodes = 0;
    for (const lang of LANGUAGE_LIST) {
      const course = COURSES[lang];
      expect(course.units).toHaveLength(16);
      totalUnits += course.units.length;
      const nodes = course.units.flatMap((u) => u.nodes);
      expect(nodes).toHaveLength(112);
      totalNodes += nodes.length;

      expect(FALLBACK_ARCADE_LEXICON[lang]).toHaveLength(8);

      for (const card of Object.values(course.vocabById)) {
        const text = `${card.foreignWithArticle} ${card.bareForeign} ${card.english} ${card.exampleForeign} ${card.exampleEnglish}`;
        expect(BANNED_ALCOHOL_RE.test(text), `Alcohol term leaked into base card ${card.id}`).toBe(false);
      }
      for (const node of nodes) {
        for (const ex of node.exercises) {
          if (ex.type === 'word_bank') {
            expect(BANNED_ALCOHOL_RE.test(`${ex.promptText} ${ex.expectedSentence}`), ex.id).toBe(false);
          } else if (ex.type === 'context_cloze') {
            expect(
              BANNED_ALCOHOL_RE.test(`${ex.fullForeignSentence} ${ex.englishTranslation} ${ex.nuanceNote}`),
              ex.id
            ).toBe(false);
          } else if (ex.type === 'listen_decode') {
            expect(BANNED_ALCOHOL_RE.test(`${ex.audioText} ${ex.englishMeaning}`), ex.id).toBe(false);
          } else if (ex.type === 'mini_story') {
            for (const b of ex.bubbles) {
              expect(BANNED_ALCOHOL_RE.test(`${b.foreignText} ${b.englishText}`), `${ex.id}:${b.id}`).toBe(false);
            }
          } else if (ex.type === 'boss_gauntlet') {
            for (const t of ex.turns) {
              expect(
                BANNED_ALCOHOL_RE.test(`${t.companionSayForeign} ${t.companionSayEnglish} ${t.expectedAnswer}`),
                `${ex.id}:${t.id}`
              ).toBe(false);
            }
          }
        }
      }
    }

    expect(totalUnits).toBe(256);
    expect(totalNodes).toBe(1792);
    for (const adultCode of ADULT_EASTER_EGG_LANGUAGES) {
      expect(FALLBACK_ARCADE_LEXICON[adultCode].length).toBeGreaterThanOrEqual(8);
    }
    expect(joinWordBankTokens(["We", "gon'", "pull", "up"])).toBe("We gon' pull up");
    expect(joinWordBankTokens(["l'", "eau"])).toBe("l'eau");

    // Static scan for zero Unicode flag emojis and zero runtime external https:// URLs in adultMode/
    const targetFiles = [
      ...walkFiles(resolve(ROOT_DIR, 'src'), /\.(ts|tsx|css|js|json|svg)$/i),
      ...walkFiles(resolve(ROOT_DIR, 'public'), /\.(js|json|html|svg|txt)$/i),
      ...walkFiles(resolve(ROOT_DIR, 'tests'), /\.(ts|tsx|js|json)$/i),
      resolve(ROOT_DIR, 'index.html'),
      resolve(ROOT_DIR, 'README.md'),
    ];
    for (const filePath of targetFiles) {
      const content = readFileSync(filePath, 'utf8');
      expect(UNICODE_FLAG_RE.test(content), `Flag emoji found in ${filePath}`).toBe(false);
    }

    const adultSrcFiles = walkFiles(resolve(ROOT_DIR, 'src/curriculum/adultMode'), /\.(ts|tsx)$/i);
    expect(adultSrcFiles.length).toBeGreaterThan(0);
    for (const filePath of adultSrcFiles) {
      const text = readFileSync(filePath, 'utf8');
      expect(text, `External URL leaked into ${filePath}`).not.toMatch(/https?:\/\//i);
    }
  });

  it('b.1) enforces strict kid-safe quarantine on default profiles (Leo & Maya) and keeps Adult Mode 100% invisible', () => {
    const defaultVault = createDefaultVault();
    expect(defaultVault.profiles.map((p) => p.id)).toEqual(DEFAULT_KID_PROFILE_IDS);
    for (const profile of defaultVault.profiles) {
      assertKidProfileQuarantined(profile);
    }

    // Store rejects direct adult-language or adultModeActive activation on kid profiles
    vaultActions.setActiveLanguage('ebonics');
    vaultActions.setAdultModeActive(true);
    let stored = loadVaultFromStorage();
    assertKidProfileQuarantined(stored.profiles[0]);
    assertKidProfileQuarantined(stored.profiles[1]);

    // Switching to Maya still stays completely quarantined
    vaultActions.switchProfile('kid-maya');
    vaultActions.setActiveLanguage('suburban');
    vaultActions.setAdultModeActive(true);
    stored = loadVaultFromStorage();
    assertKidProfileQuarantined(stored.profiles[1]);

    // Default UI shows zero trace of Adult Mode across TopHud, PhrasebookVault, ProfileVaultModal & ArcadeHub
    vaultActions.switchProfile('kid-leo');
    assertAdultInvisibleEverywhere();
  });

  it('b.2) unlocks only via 7-tap version badge + 18+ modal, leaves Leo/Maya untouched, supports 1-tap Return to Kid Atlas & exits active lessons', async () => {
    const sfxSpy = vi.spyOn(audioModule, 'playSfx');
    const onClose = vi.fn();
    const { unmount } = render(<ProfileVaultModal onClose={onClose} />);

    const versionBadge = screen.getByTestId('atlas-version-easter-egg');
    for (let tap = 1; tap < ADULT_EASTER_EGG_TAP_COUNT; tap++) {
      fireEvent.click(versionBadge);
      expect(
        screen.queryByRole('dialog', { name: 'After-Hours Atlas 18+ Confirmation' }),
        `Confirmation modal opened early on tap ${tap}`
      ).not.toBeInTheDocument();
    }

    // 7th tap opens the 18+ Confirmation Modal
    fireEvent.click(versionBadge);
    const confirmDialog = screen.getByRole('dialog', {
      name: 'After-Hours Atlas 18+ Confirmation',
    });
    expect(confirmDialog).toHaveAttribute('aria-modal', 'true');
    expect(confirmDialog.textContent).toMatch(/Leo|Maya|kid/i);

    // Declining with "Stay in Kid Atlas" keeps Leo untouched and Adult Mode locked
    fireEvent.click(within(confirmDialog).getByRole('button', { name: /Stay in Kid Atlas/i }));
    expect(
      screen.queryByRole('dialog', { name: 'After-Hours Atlas 18+ Confirmation' })
    ).not.toBeInTheDocument();
    expect(loadVaultFromStorage().profiles).toHaveLength(2);
    assertKidProfileQuarantined(loadVaultFromStorage().profiles[0]);

    // Tap 7 times again and confirm 18+ unlock on custom Adult Profile
    for (let tap = 0; tap < ADULT_EASTER_EGG_TAP_COUNT; tap++) {
      fireEvent.click(screen.getByTestId('atlas-version-easter-egg'));
    }
    const modal = screen.getByRole('dialog', { name: 'After-Hours Atlas 18+ Confirmation' });

    const nameInput = within(modal).queryByRole('textbox');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Midnight Scholar' } });
    }
    const suburbanTrackBtn = modal.querySelector('svg[data-flag="suburban"]')?.closest('button');
    expect(suburbanTrackBtn).toBeTruthy();
    if (suburbanTrackBtn) {
      fireEvent.click(suburbanTrackBtn);
    }

    sfxSpy.mockClear();
    fireEvent.click(
      within(modal).getByRole('button', { name: /I am 18\+.*Unlock After-Hours Atlas/i })
    );
    expect(sfxSpy).toHaveBeenCalledWith('adult_unlock');
    expect(onClose).toHaveBeenCalled();
    unmount();

    const postUnlockVault = loadVaultFromStorage();
    expect(postUnlockVault.profiles.length).toBe(3);
    const leo = postUnlockVault.profiles.find((p) => p.id === 'kid-leo')!;
    const maya = postUnlockVault.profiles.find((p) => p.id === 'kid-maya')!;
    const adult = postUnlockVault.profiles.find((p) => p.id === postUnlockVault.activeProfileId)!;
    assertKidProfileQuarantined(leo);
    assertKidProfileQuarantined(maya);
    expect(isDefaultKidProfileId(adult.id)).toBe(false);
    expect(adult.adultModeUnlocked).toBe(true);
    expect(adult.adultModeActive).toBe(true);
    expect(isAdultLanguage(adult.activeLanguage)).toBe(true);
    expect(adult.languageProgress.ebonics).toBeDefined();
    expect(adult.languageProgress.suburban).toBeDefined();

    // While active, Adult Mode tracks appear in TopHud (with Return to Kid Atlas + Flip Direction), PhrasebookVault, and ArcadeHub
    const hud = render(
      <TopHud
        onOpenProfileModal={vi.fn()}
        onOpenArcade={vi.fn()}
        canInstallApp={false}
        onInstallApp={vi.fn()}
      />
    );
    expect(screen.getByTestId('return-to-kid-atlas-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Active language:/i }));
    const langDialog = screen.getByRole('dialog', { name: 'Switch Language' });
    expect(within(langDialog).getByText(/After-Hours Atlas/i)).toBeInTheDocument();
    expect(langDialog.querySelector('svg[data-flag="ebonics"]')).toBeInTheDocument();
    expect(langDialog.querySelector('svg[data-flag="suburban"]')).toBeInTheDocument();
    const flipBtn = within(langDialog).getByRole('button', { name: /Flip Direction/i });
    const beforeFlip = loadVaultFromStorage().profiles.find((p) => p.id === adult.id)!.activeLanguage;
    fireEvent.click(flipBtn);
    const afterFlip = loadVaultFromStorage().profiles.find((p) => p.id === adult.id)!.activeLanguage;
    expect(afterFlip).not.toBe(beforeFlip);
    expect(isAdultLanguage(afterFlip)).toBe(true);
    hud.unmount();

    const pb = render(<PhrasebookVault />);
    const pbFilter = screen.getByRole('group', { name: 'Filter phrasebook by language' });
    expect(pbFilter.querySelector('svg[data-flag="ebonics"]')).toBeInTheDocument();
    expect(pbFilter.querySelector('svg[data-flag="suburban"]')).toBeInTheDocument();
    pb.unmount();

    const arc = render(<ArcadeHub onExitToMap={vi.fn()} />);
    expect(
      screen.getByText(LANGUAGE_META[afterFlip].pairDirectionBadge ?? '')
    ).toBeInTheDocument();
    arc.unmount();

    // Render full App, enter an active Adult lesson, and verify disarming via Return to Kid Atlas / store exits the lesson cleanly
    const appRender = render(<App />);
    const activeNodeBtn = document.querySelector('[data-node-state="active"]') as HTMLElement | null;
    expect(activeNodeBtn).not.toBeNull();
    fireEvent.click(activeNodeBtn!);
    await waitFor(() => {
      expect(document.querySelector('.lesson-arena-shell')).toBeInTheDocument();
    });

    // Disarming Adult Mode exits active LessonArena immediately back to base language
    act(() => {
      vaultActions.setAdultModeActive(false);
    });
    await waitFor(() => {
      expect(document.querySelector('.lesson-arena-shell')).not.toBeInTheDocument();
    });
    expect(document.querySelector('.app-root')?.getAttribute('data-language')).not.toMatch(
      /^(ebonics|suburban)$/
    );

    // Re-enter After-Hours via ProfileVaultModal discreet button, then test 1-tap Return to Kid Atlas button in TopHud
    fireEvent.click(screen.getByRole('button', { name: /Switch kid profile/i }));
    const profileDlg = screen.getByRole('dialog', { name: 'Explorer Profiles and Save Vault' });
    fireEvent.click(within(profileDlg).getByRole('button', { name: /Enter After-Hours Atlas/i }));
    await waitFor(() => {
      expect(screen.getByTestId('return-to-kid-atlas-btn')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('return-to-kid-atlas-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('return-to-kid-atlas-btn')).not.toBeInTheDocument();
    });
    const postReturn = loadVaultFromStorage().profiles.find((p) => p.id === adult.id)!;
    expect(postReturn.adultModeActive).toBe(false);
    expect(isAdultLanguage(postReturn.activeLanguage)).toBe(false);
    appRender.unmount();

    // Now Adult Mode tracks/UI must be hidden across TopHud, PhrasebookVault, creator picker & ArcadeHub
    assertAdultInvisibleEverywhere({ allowReentryButton: true });

    // Switching back to Leo keeps Leo quarantined (zero re-entry CTA too) and disarms any active adult session
    vaultActions.setAdultModeActive(true);
    vaultActions.switchProfile('kid-leo');
    const finalVault = loadVaultFromStorage();
    expect(finalVault.activeProfileId).toBe('kid-leo');
    assertKidProfileQuarantined(finalVault.profiles.find((p) => p.id === 'kid-leo')!);
    expect(finalVault.profiles.find((p) => p.id === adult.id)!.adultModeActive).toBe(false);
    assertAdultInvisibleEverywhere({ allowReentryButton: false });
  });

  it('b.3) verifies secret keycode unlock (AFTERHOURS / COOKOUT) in store & ProfileVaultModal UI', () => {
    for (const code of ADULT_EASTER_EGG_CODES) {
      expect(vaultActions.verifyAdultEasterEggCode(code)).toBe(true);
      expect(vaultActions.verifyAdultEasterEggCode(`  ${code.toLowerCase()}  `)).toBe(true);
    }
    expect(vaultActions.verifyAdultEasterEggCode('')).toBe(false);
    expect(vaultActions.verifyAdultEasterEggCode('WRONG_CODE')).toBe(false);

    render(<ProfileVaultModal onClose={vi.fn()} />);

    const keycodeToggle = screen.queryByRole('button', { name: /Atlas Keycode/i });
    if (keycodeToggle) {
      fireEvent.click(keycodeToggle);
      const keycodeInput =
        screen.queryByLabelText(/Atlas Keycode/i) ??
        screen.queryByPlaceholderText(/keycode|code/i) ??
        screen.getAllByRole('textbox').slice(-1)[0];
      fireEvent.change(keycodeInput, { target: { value: 'COOKOUT' } });
      const form = keycodeInput.closest('form');
      if (form) {
        fireEvent.submit(form);
      } else {
        const submitBtn = screen.queryByRole('button', { name: /Unlock|Verify|Enter|Submit/i });
        if (submitBtn) fireEvent.click(submitBtn);
      }
    } else {
      fireEvent.click(screen.getByRole('button', { name: /\+ New Kid Explorer/i }));
      const nameField = screen.getByLabelText('New explorer name');
      fireEvent.change(nameField, { target: { value: 'AFTERHOURS' } });
      fireEvent.submit(nameField.closest('form')!);
    }

    expect(
      screen.getByRole('dialog', { name: 'After-Hours Atlas 18+ Confirmation' })
    ).toBeInTheDocument();
  });

  it('c) validates full bidirectional curriculum parity, TapHintTokens, ContextCloze partitioning, Boss/WordBank solvability, Checkpoints, AdventureMap & Arcade isolation', async () => {
    await ensureAllAdultCoursesLoaded();
    const baseCardIds = new Set<string>();
    const baseUnitIds = new Set<string>();
    const baseNodeIds = new Set<string>();
    const baseExerciseIds = new Set<string>();
    for (const baseLang of LANGUAGE_LIST) {
      const c = COURSES[baseLang];
      Object.keys(c.vocabById).forEach((id) => baseCardIds.add(id));
      for (const u of c.units) {
        baseUnitIds.add(u.id);
        for (const n of u.nodes) {
          baseNodeIds.add(n.id);
          n.exercises.forEach((ex) => baseExerciseIds.add(ex.id));
        }
      }
    }

    const validIllustrations = new Set<string>(ILLUSTRATION_KEYS);
    const adultCardIds = new Set<string>();

    for (const lang of ADULT_EASTER_EGG_LANGUAGES) {
      const course = getCourse(lang);
      expect(getAdultCourse(lang)).toBe(course);
      expect(course.language).toBe(lang);
      expect(course.meta.isAdultOnly).toBe(true);
      expect(course.meta.dir).toBe('ltr');
      expect(course.meta.usesSpaces).toBe(true);
      expect(course.units).toHaveLength(16);

      const cards = Object.values(course.vocabById);
      expect(cards.length, `${lang} must have >= 150 unique VocabCards`).toBeGreaterThanOrEqual(150);

      const authoredWordBankKeys = new Set<string>();
      const authoredListenKeys = new Set<string>();
      const coveredTiers = new Set<string>();
      let contextClozeCount = 0;
      let freeRecallWordBankCount = 0;
      let freeRecallBossCount = 0;

      for (let idx = 0; idx < course.units.length; idx++) {
        const unit = course.units[idx];
        const expectedTier = resolveUnitProficiencyTier(unit.order);
        expect(unit.order).toBe(idx + 1);
        expect(baseUnitIds.has(unit.id)).toBe(false);
        expect(getUnitById(lang, unit.id)).toBe(unit);
        coveredTiers.add(expectedTier);
        if (unit.order >= 9) {
          expect(unit.proficiencyTier).toBe(expectedTier);
        }

        for (const card of unit.vocabCards) {
          expect(baseCardIds.has(card.id), `Adult card ${card.id} collides with base`).toBe(false);
          expect(adultCardIds.has(card.id), `Duplicate adult card ${card.id}`).toBe(false);
          adultCardIds.add(card.id);
          expect(card.language).toBe(lang);
          expect(validIllustrations.has(card.illustrationKey)).toBe(true);
          if (unit.order >= 9) {
            expect(card.proficiencyTier).toBe(expectedTier);
          }

          const hints = buildTapHintsFromExample(
            card.exampleForeign,
            card.exampleEnglish,
            card.examplePhonetic,
            card
          );
          assertValidTapHints(hints, `${lang}:example:${card.id}`);
        }

        const lessons = unit.nodes.filter((n) => n.nodeType === 'lesson');
        const stories = unit.nodes.filter((n) => n.nodeType === 'story');
        const chests = unit.nodes.filter((n) => n.nodeType === 'chest');
        const bosses = unit.nodes.filter((n) => n.nodeType === 'boss');
        expect(lessons.length).toBeGreaterThanOrEqual(4);
        expect(stories).toHaveLength(1);
        expect(chests).toHaveLength(1);
        expect(bosses).toHaveLength(1);

        for (const node of unit.nodes) {
          expect(baseNodeIds.has(node.id)).toBe(false);
          expect(getNodeById(lang, node.id)).toBe(node);
          if (unit.order >= 9) {
            expect(node.proficiencyTier).toBe(expectedTier);
          }

          const allVersions = [
            ...node.exercises,
            ...(node.nodeType === 'chest' ? [] : getPlayableNodeExercises(lang, node.id, [], false)),
          ];

          for (const ex of node.exercises) {
            expect(baseExerciseIds.has(ex.id)).toBe(false);
            if (ex.type === 'word_bank') {
              const wbKey = `${ex.promptText.trim().toLowerCase()}||${ex.expectedSentence.trim().toLowerCase()}`;
              expect(authoredWordBankKeys.has(wbKey), `Duplicate WordBank ${ex.id}`).toBe(false);
              authoredWordBankKeys.add(wbKey);
              if (ex.allowFreeRecall) freeRecallWordBankCount += 1;
            } else if (ex.type === 'listen_decode') {
              const lk = ex.audioText.trim().toLowerCase();
              expect(authoredListenKeys.has(lk), `Duplicate ListenDecode ${ex.id}`).toBe(false);
              authoredListenKeys.add(lk);
            }
          }

          for (const ex of allVersions) {
            if (ex.type === 'discovery_card') {
              expect(course.vocabById[ex.vocabId]).toBeDefined();
            } else if (ex.type === 'word_bank') {
              if (ex.direction === 'to_english') {
                assertValidTapHints(ex.promptTokens, `${lang}:${ex.id}`);
              }
              const assembled = joinWordBankTokens(ex.targetTokens);
              const wbGradeLang =
                ex.direction === 'to_foreign'
                  ? lang
                  : isAdultMashupLanguage(lang)
                    ? lang
                    : lang === 'ebonics'
                      ? 'suburban'
                      : lang === 'suburban'
                        ? 'ebonics'
                        : 'en';
              const res = gradeAnswer({
                submitted: assembled,
                expected: ex.expectedSentence,
                accepted: ex.acceptedSentences,
                language: wbGradeLang,
              });
              expect(res.isCorrect, `${lang}:${ex.id} WordBank failed`).toBe(true);
            } else if (ex.type === 'context_cloze') {
              if (node.exercises.includes(ex)) contextClozeCount += 1;
              assertValidTapHints(ex.tapHints, `${lang}:${ex.id}`);
              expect(ex.choices.includes(ex.expectedBlank)).toBe(true);
              expect(ex.nuanceNote.trim().length).toBeGreaterThan(0);

              const { beforeTokens, afterTokens, unmatchedTokens } = splitTapHintsAroundBlank(
                ex.sentenceBeforeBlank,
                ex.sentenceAfterBlank,
                ex.expectedBlank,
                ex.tapHints
              );
              expect(beforeTokens.map((t) => cleanCompare(t.surface)).join('')).toBe(
                cleanCompare(ex.sentenceBeforeBlank)
              );
              expect(afterTokens.map((t) => cleanCompare(t.surface)).join('')).toBe(
                cleanCompare(ex.sentenceAfterBlank)
              );
              expect(unmatchedTokens, `${lang}:${ex.id} unmatchedTokens`).toEqual([]);

              expect(
                gradeAnswer({
                  submitted: ex.expectedBlank,
                  expected: ex.expectedBlank,
                  accepted: ex.acceptedBlanks,
                  language: lang,
                }).isCorrect
              ).toBe(true);
            } else if (ex.type === 'listen_decode') {
              assertValidTapHints(ex.tapHints, `${lang}:${ex.id}`);
              const ans =
                ex.mode === 'select_meaning'
                  ? ex.englishMeaning
                  : joinWordBankTokens(ex.targetTokens ?? []);
              const exp = ex.mode === 'select_meaning' ? ex.englishMeaning : ex.audioText;
              expect(
                gradeAnswer({
                  submitted: ans,
                  expected: exp,
                  accepted: ex.acceptedAnswers,
                  language: lang,
                }).isCorrect,
                `${lang}:${ex.id} ListenDecode failed`
              ).toBe(true);
            } else if (ex.type === 'mini_story') {
              expect(ex.bubbles.length).toBeGreaterThanOrEqual(4);
              expect(ex.decisions.length).toBeGreaterThanOrEqual(1);
              for (const b of ex.bubbles) {
                assertValidTapHints(b.tapHints, `${lang}:${ex.id}:${b.id}`);
              }
              expect(ex.decisions.every((d) => d.options.some((o) => o.isCorrect))).toBe(true);
            } else if (ex.type === 'boss_gauntlet') {
              expect(ex.companionId).toBe(LANGUAGE_META[lang].companionId);
              expect(ex.turns.length).toBeGreaterThanOrEqual(3);
              for (const turn of ex.turns) {
                assertValidTapHints(turn.tapHints, `${lang}:${ex.id}:${turn.id}`);
                if (turn.allowFreeRecall) freeRecallBossCount += 1;
                const cand =
                  turn.mode === 'choice'
                    ? turn.expectedAnswer
                    : joinWordBankTokens(turn.targetTokens ?? []);
                expect(
                  gradeAnswer({
                    submitted: cand,
                    expected: turn.expectedAnswer,
                    accepted: turn.acceptedAnswers,
                    language: lang,
                  }).isCorrect,
                  `${lang}:${ex.id}:${turn.id} Boss turn failed`
                ).toBe(true);
              }
            }
          }
        }
      }

      expect(Array.from(coveredTiers).sort()).toEqual([...PROFICIENCY_TIERS].sort());
      expect(contextClozeCount).toBeGreaterThanOrEqual(32);
      expect(freeRecallWordBankCount).toBeGreaterThan(0);
      expect(freeRecallBossCount).toBeGreaterThan(0);

      // Tier Checkpoints across A2..C1_C2
      for (const tier of ['A2', 'B1', 'B2', 'C1_C2'] as const) {
        const cp = buildTierCheckpointNode(lang, tier);
        expect(cp.checkpointTargetTier).toBe(tier);
        expect(cp.exercises).toHaveLength(5);
        const pooled = getPlayableNodeExercises(lang, cp.id, [], false);
        expect(pooled).toHaveLength(5);
        for (const ex of pooled) {
          if (ex.type === 'context_cloze') {
            const { unmatchedTokens } = splitTapHintsAroundBlank(
              ex.sentenceBeforeBlank,
              ex.sentenceAfterBlank,
              ex.expectedBlank,
              ex.tapHints
            );
            expect(unmatchedTokens).toEqual([]);
          }
        }
      }

      // AdventureMap renders adult course + pairDirectionBadge cleanly
      const unlockedVault = createDefaultVault();
      const mapRender = render(
        <AdventureMap
          course={course}
          progress={unlockedVault.profiles[0].languageProgress.es}
          equippedCosmetics={{}}
          onSelectNode={vi.fn()}
        />
      );
      expect(document.querySelector(`svg[data-flag="${lang}"]`)).toBeInTheDocument();
      expect(screen.getByText(course.meta.pairDirectionBadge!)).toBeInTheDocument();
      mapRender.unmount();

      // WordBankView uses translationLanguageLabel and keeps Keyboard Free-Recall enabled
      const toEngWb = course.units
        .flatMap((u) => u.nodes)
        .flatMap((n) => n.exercises)
        .find((ex) => ex.type === 'word_bank' && ex.direction === 'to_english');
      expect(toEngWb).toBeDefined();
      if (toEngWb && toEngWb.type === 'word_bank') {
        const wbRender = render(
          <WordBankView
            exercise={toEngWb}
            language={lang}
            compact={false}
            locked={false}
            onTurtlePlay={vi.fn()}
            onDraftChange={vi.fn()}
          />
        );
        expect(
          screen.getByText(`Translate to ${course.meta.translationLanguageLabel}`)
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Type Instead|Keyboard Free-Recall/i })).toBeInTheDocument();
        wbRender.unmount();
      }
    }

    // Strict getArcadeLexicon isolation between base courses and adult courses
    for (const lang of ADULT_EASTER_EGG_LANGUAGES) {
      const deck = getArcadeLexicon(lang, [], 15);
      expect(deck.length).toBeGreaterThan(0);
      expect(deck.every((item) => item.language === lang)).toBe(true);
    }
    for (const baseLang of LANGUAGE_LIST) {
      const deck = getArcadeLexicon(baseLang, [], 15);
      expect(deck.length).toBeGreaterThan(0);
      expect(deck.every((item) => item.language === baseLang)).toBe(true);
      expect(deck.some((item) => isAdultLanguage(item.language))).toBe(false);
    }
  });

  it('d) enforces slang grader forgiveness in ebonics/suburban ONLY without altering base-language grading', () => {
    const slangForgivenessCases: Array<{
      submitted: string;
      expected: string;
      nonExact?: boolean;
    }> = [
      { submitted: 'aint', expected: "ain't", nonExact: true },
      { submitted: "ain't", expected: 'aint', nonExact: true },
      { submitted: 'yall', expected: "y'all", nonExact: true },
      { submitted: "y'all", expected: 'yall', nonExact: true },
      { submitted: 'gon', expected: "gon'", nonExact: true },
      { submitted: "gon'", expected: 'gon', nonExact: true },
      { submitted: 'lowkey', expected: 'low-key', nonExact: true },
      { submitted: 'low key', expected: 'low-key', nonExact: true },
      { submitted: 'low-key', expected: 'lowkey', nonExact: true },
      { submitted: 'cul de sac', expected: 'cul-de-sac', nonExact: true },
      { submitted: 'cul-de-sac', expected: 'cul de sac', nonExact: true },
      { submitted: "Y'all ain't trippin'!", expected: "y'all ain't trippin'", nonExact: false },
      { submitted: 'yall aint trippin', expected: "y'all ain't trippin'", nonExact: true },
      { submitted: 'deadass', expected: 'dead-ass', nonExact: true },
      { submitted: 'circle back', expected: 'circle-back', nonExact: true },
      { submitted: 'dad joke', expected: 'dad-joke', nonExact: true },
      { submitted: 'glowup', expected: 'glow-up', nonExact: true },
      { submitted: 'shoutout', expected: 'shout-out', nonExact: true },
    ];

    for (const lang of ADULT_EASTER_EGG_LANGUAGES) {
      for (const c of slangForgivenessCases) {
        const res = gradeAnswer({
          submitted: c.submitted,
          expected: c.expected,
          language: lang,
        });
        expect(res.isCorrect, `${lang}: "${c.submitted}" vs "${c.expected}"`).toBe(true);
        expect(res.heartPenalty, `${lang}: "${c.submitted}" heartPenalty`).toBe(0);
        if (c.nonExact) {
          expect(res.accentCoaching).toBeDefined();
          expect(res.accentCoaching!.friendlyTip.trim().length).toBeGreaterThan(5);
        } else {
          expect(res.exactMatch).toBe(true);
        }
      }
    }

    // Verify base-language ('en' / 'es' / 'fr') grading remains strict and unaltered
    const baseStrictCases = [
      { submitted: 'aint', expected: "ain't", language: 'en' as const },
      { submitted: 'yall', expected: "y'all", language: 'en' as const },
      { submitted: 'lowkey', expected: 'low-key', language: 'en' as const },
      { submitted: 'cul de sac', expected: 'cul-de-sac', language: 'en' as const },
    ];
    for (const c of baseStrictCases) {
      const res = gradeAnswer(c);
      expect(res.isCorrect, `Base ${c.language} should not apply slang forgiveness to "${c.submitted}"`).toBe(
        false
      );
      expect(res.heartPenalty).toBe(1);
    }

    // Existing Spanish/French diacritic & elision grading stays exact
    expect(gradeAnswer({ submitted: 'nino', expected: 'niño', language: 'es' })).toMatchObject({
      isCorrect: true,
      exactMatch: false,
      heartPenalty: 0,
    });
    expect(gradeAnswer({ submitted: "l' eau", expected: "l'eau", language: 'fr' })).toMatchObject({
      isCorrect: true,
      exactMatch: true,
      heartPenalty: 0,
    });
  });

  it('e) handles vault migration, tampered kid-save sanitization, and replace/merge export/import cleanly', () => {
    // 1. Legacy v1 save without adult flags hydrates cleanly with quarantined defaults
    const legacyVault = createDefaultVault();
    for (const p of legacyVault.profiles) {
      delete p.adultModeUnlocked;
      delete p.adultModeActive;
      delete p.lastBaseLanguage;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyVault));
    const hydratedLegacy = loadVaultFromStorage();
    for (const p of hydratedLegacy.profiles) {
      assertKidProfileQuarantined(p);
    }

    // 2. Tampered kid-leo / kid-maya save in localStorage is forcefully sanitized
    const tampered = createDefaultVault() as SaveVault;
    (tampered.profiles[0] as unknown as Record<string, unknown>).adultModeUnlocked = true;
    (tampered.profiles[0] as unknown as Record<string, unknown>).adultModeActive = true;
    tampered.profiles[0].activeLanguage = 'ebonics';
    tampered.profiles[0].languageProgress.ebonics = {
      completedNodeIds: ['eb-u1-n1'],
      nodeStars: { 'eb-u1-n1': 3 },
      unlockedVocabIds: ['eb-u1-c1'],
      claimedChestIds: [],
      currentUnitIndex: 1,
      xpEarned: 40,
      seenExerciseIds: [],
      unlockedTiers: [],
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tampered));
    const sanitized = loadVaultFromStorage();
    assertKidProfileQuarantined(sanitized.profiles[0]);
    expect(sanitized.profiles[0].languageProgress.ebonics).toBeUndefined();

    // 3. Unlocked Adult Mode profile progress exports & imports cleanly in both 'replace' and 'merge' modes
    vaultActions.resetVaultToDefaults();
    const adultProfile = vaultActions.unlockAdultMode({
      adultProfileName: 'After-Hours VIP',
      initialTrack: 'ebonics',
    });

    vaultActions.completeMapNode({
      language: 'ebonics',
      nodeId: 'eb-u1-n1',
      stars: 2,
      xpEarned: 35,
      gemsEarned: 10,
      unlockedVocabIds: ['eb-u1-c1', 'eb-u1-c2'],
      maxCombo: 3,
    });
    vaultActions.setActiveLanguage('suburban');
    vaultActions.completeMapNode({
      language: 'suburban',
      nodeId: 'sb-u1-n1',
      stars: 3,
      xpEarned: 45,
      gemsEarned: 12,
      unlockedVocabIds: ['sb-u1-c1'],
      maxCombo: 4,
    });

    const exportedAdultJson = exportVaultJson(loadVaultFromStorage());

    // Replace mode on fresh vault restores adult profile + both tracks while keeping Leo/Maya quarantined
    vaultActions.resetVaultToDefaults();
    const replaceRes = importVaultJson(exportedAdultJson, 'replace');
    expect(replaceRes.ok).toBe(true);
    const afterReplace = loadVaultFromStorage();
    const restoredAdult = afterReplace.profiles.find((p) => p.id === adultProfile.id)!;
    expect(restoredAdult).toBeDefined();
    expect(restoredAdult.adultModeUnlocked).toBe(true);
    expect(restoredAdult.languageProgress.ebonics?.completedNodeIds).toContain('eb-u1-n1');
    expect(restoredAdult.languageProgress.suburban?.completedNodeIds).toContain('sb-u1-n1');
    assertKidProfileQuarantined(afterReplace.profiles.find((p) => p.id === 'kid-leo')!);
    assertKidProfileQuarantined(afterReplace.profiles.find((p) => p.id === 'kid-maya')!);

    // Merge mode combines adult progress (higher stars, union of completedNodeIds / unlockedVocabIds) + rejects injected kid flags
    const parsedIncoming = JSON.parse(exportedAdultJson) as SaveVault;
    const incomingAdult = parsedIncoming.profiles.find((p) => p.id === adultProfile.id)!;
    incomingAdult.languageProgress.ebonics = {
      completedNodeIds: ['eb-u1-n1', 'eb-u1-n2'],
      nodeStars: { 'eb-u1-n1': 3, 'eb-u1-n2': 3 },
      unlockedVocabIds: ['eb-u1-c3'],
      claimedChestIds: [],
      currentUnitIndex: 2,
      xpEarned: 60,
      seenExerciseIds: [],
      unlockedTiers: ['A2'],
    };
    // Also inject forbidden adult flags on kid-maya in incoming JSON
    const incomingMaya = parsedIncoming.profiles.find((p) => p.id === 'kid-maya')!;
    incomingMaya.adultModeUnlocked = true;
    incomingMaya.adultModeActive = true;
    incomingMaya.activeLanguage = 'suburban';
    incomingMaya.languageProgress.suburban = {
      completedNodeIds: ['sb-u1-n1'],
      nodeStars: { 'sb-u1-n1': 3 },
      unlockedVocabIds: [],
      claimedChestIds: [],
      currentUnitIndex: 0,
      xpEarned: 20,
      seenExerciseIds: [],
      unlockedTiers: [],
    };

    const mergeRes = importVaultJson(JSON.stringify(parsedIncoming), 'merge');
    expect(mergeRes.ok).toBe(true);
    const afterMerge = loadVaultFromStorage();
    const mergedAdult = afterMerge.profiles.find((p) => p.id === adultProfile.id)!;
    expect(mergedAdult.languageProgress.ebonics?.completedNodeIds).toEqual(
      expect.arrayContaining(['eb-u1-n1', 'eb-u1-n2'])
    );
    expect(mergedAdult.languageProgress.ebonics?.nodeStars['eb-u1-n1']).toBe(3);
    expect(mergedAdult.languageProgress.ebonics?.unlockedVocabIds).toEqual(
      expect.arrayContaining(['eb-u1-c1', 'eb-u1-c2', 'eb-u1-c3'])
    );
    expect(mergedAdult.languageProgress.ebonics?.unlockedTiers).toContain('A2');
    expect(mergedAdult.languageProgress.suburban?.completedNodeIds).toContain('sb-u1-n1');
    assertKidProfileQuarantined(afterMerge.profiles.find((p) => p.id === 'kid-maya')!);
    expect(afterMerge.profiles.find((p) => p.id === 'kid-maya')!.languageProgress.suburban).toBeUndefined();
  });

  it('f) verifies en-US voice selection, 4500ms watchdog fallback, and warm sine/triangle adult_unlock SFX synthesis', async () => {
    expect(SPEECH_LOCALE_MAP.ebonics).toEqual(['en-US', 'en']);
    expect(SPEECH_LOCALE_MAP.suburban).toEqual(['en-US', 'en']);

    const enUsVoice = makeMockVoice('en-US', 'English US');
    const frVoice = makeMockVoice('fr-FR', 'French');
    for (const lang of ADULT_EASTER_EGG_LANGUAGES) {
      expect(rankVoiceForLanguage(enUsVoice, lang)).toBeGreaterThan(0);
      expect(rankVoiceForLanguage(frVoice, lang)).toBeLessThan(0);
    }

    // Native en-US utterance succeeds
    const { FakeUtterance, created } = createFakeUtteranceCtor();
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeUtterance,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        getVoices: () => [frVoice, enUsVoice],
        speak: (utt: { onend: ((ev: Event) => void) | null }) => {
          queueMicrotask(() => utt.onend?.(new Event('end')));
        },
        cancel: vi.fn(),
        speaking: false,
        pending: false,
        paused: false,
        onvoiceschanged: null,
        addEventListener: vi.fn(),
      },
    });

    for (const lang of ADULT_EASTER_EGG_LANGUAGES) {
      expect(hasNativeVoice(lang)).toBe(true);
      const outcome = await speakPhrase({
        text: lang === 'ebonics' ? "Bet, we locked in." : 'Circle back around noon.',
        language: lang,
        phonetic: 'bet wee lokd in',
      });
      expect(outcome).toEqual({ usedNativeVoice: true, fallbackActive: false, localeUsed: 'en-US' });
    }
    expect(created.length).toBeGreaterThanOrEqual(2);
    expect(created[0].voice?.lang).toBe('en-US');

    // Hung-utterance 4500ms watchdog unblocks state cleanly & cancels stuck speech
    const { MockAudioContext, oscTypes } = createMockAudioContext();
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: MockAudioContext,
    });
    const cancelSpy = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        getVoices: () => [enUsVoice],
        speak: vi.fn(), // Never fires onend/onerror
        cancel: cancelSpy,
        speaking: true,
        pending: false,
        paused: false,
        onvoiceschanged: null,
        addEventListener: vi.fn(),
      },
    });

    vi.useFakeTimers();
    const rescueBefore = getSpeechRuntimeState().watchdogRescueCount ?? 0;
    const hungPromise = speakPhrase({
      text: 'No cap, that track slaps.',
      language: 'ebonics',
      phonetic: 'noh kap',
    });
    expect(getSpeechRuntimeState().isSpeaking).toBe(true);
    await vi.advanceTimersByTimeAsync(4500);
    const watchdogOutcome = await hungPromise;
    expect(watchdogOutcome).toEqual({
      usedNativeVoice: false,
      fallbackActive: true,
      localeUsed: 'en-US',
      watchdogTriggered: true,
    });
    expect(cancelSpy).toHaveBeenCalled();
    expect(getSpeechRuntimeState().isSpeaking).toBe(false);
    expect(getSpeechRuntimeState().fallbackActive).toBe(true);
    expect(getSpeechRuntimeState().watchdogTriggered).toBe(true);
    expect(getSpeechRuntimeState().watchdogRescueCount ?? 0).toBeGreaterThanOrEqual(1);
    expect(getSpeechRuntimeState().watchdogRescueCount).toBe(rescueBefore + 1);
    stopSpeech();

    // No voices -> phonetic marimba cadence fallback with warm sine/triangle waves
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        getVoices: () => [],
        speak: vi.fn(),
        cancel: vi.fn(),
        speaking: false,
        pending: false,
        paused: false,
        onvoiceschanged: null,
        addEventListener: vi.fn(),
      },
    });
    const fallbackPromise = speakPhrase({
      text: 'Circle back around noon.',
      language: 'suburban',
      phonetic: 'SER-kul bak uh-ROWND noon',
    });
    await vi.advanceTimersByTimeAsync(2500);
    const fallbackOutcome = await fallbackPromise;
    expect(fallbackOutcome).toEqual({ usedNativeVoice: false, fallbackActive: true });
    expect(getSpeechRuntimeState().isSpeaking).toBe(false);
    vi.useRealTimers();

    // Warm sine/triangle-only SFX synthesis for 'adult_unlock'
    oscTypes.length = 0;
    playSfx('adult_unlock');
    expect(oscTypes.length).toBeGreaterThan(0);
    for (const wave of oscTypes) {
      expect(['sine', 'triangle']).toContain(wave);
    }
  });
});
