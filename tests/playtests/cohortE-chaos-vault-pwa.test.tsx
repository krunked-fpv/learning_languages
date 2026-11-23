import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSpeechRuntimeState,
  hasNativeVoice,
  setAudioPreferences,
  speakPhrase,
  stopSpeech,
} from '../../src/audio';
import { BossGauntletView } from '../../src/components/lesson/BossGauntletView';
import { LessonArena } from '../../src/components/lesson/LessonArena';
import { ListenDecodeView } from '../../src/components/lesson/ListenDecodeView';
import { PairMatchRushView } from '../../src/components/lesson/PairMatchRushView';
import { CompanionShop } from '../../src/components/meta/CompanionShop';
import { ProfileVaultModal } from '../../src/components/shell/ProfileVaultModal';
import { COURSES } from '../../src/curriculum';
import {
  STORAGE_KEY,
  createDefaultVault,
  exportVaultJson,
  importVaultJson,
  loadVaultFromStorage,
  vaultActions,
} from '../../src/store/useVaultStore';
import {
  LANGUAGE_LIST,
  type BossGauntletExercise,
  type ListenDecodeExercise,
  type MapNode,
  type WordBankExercise,
} from '../../src/types/contracts';
import {
  clickTokensInTray,
  installMockSpeechSynthesis,
  queryButtonByText,
  requireButtonByText,
} from './helpers';

const ROOT_DIR = resolve(__dirname, '../..');

interface SimulatedSwHarness {
  listeners: Map<string, Array<(event: unknown) => void>>;
  cacheStore: Map<string, Map<string, Response>>;
  skipWaiting: ReturnType<typeof vi.fn>;
  clientsClaim: ReturnType<typeof vi.fn>;
  fetchMock: ReturnType<typeof vi.fn>;
  dispatchInstall: () => Promise<void>;
  dispatchActivate: () => Promise<void>;
  dispatchFetch: (request: Request) => Promise<Response | undefined>;
}

function loadServiceWorkerHarness(originBase = 'http://127.0.0.1:4173/wanderling-subpath/'): SimulatedSwHarness {
  const swSource = readFileSync(resolve(ROOT_DIR, 'public/sw.js'), 'utf8');
  const listeners = new Map<string, Array<(event: unknown) => void>>();
  const cacheStore = new Map<string, Map<string, Response>>();
  const skipWaiting = vi.fn().mockResolvedValue(undefined);
  const clientsClaim = vi.fn().mockResolvedValue(undefined);
  const fetchMock = vi.fn();

  const resolveUrlKey = (reqOrUrl: Request | string): string => {
    const raw = typeof reqOrUrl === 'string' ? reqOrUrl : reqOrUrl.url;
    return new URL(raw, originBase).href;
  };

  const makeCacheApi = (cacheName: string) => {
    if (!cacheStore.has(cacheName)) {
      cacheStore.set(cacheName, new Map());
    }
    const bucket = cacheStore.get(cacheName)!;
    return {
      async addAll(urls: string[]) {
        for (const u of urls) {
          const href = resolveUrlKey(u);
          bucket.set(
            href,
            new Response(`cached:${href}`, {
              status: 200,
              headers: { 'Content-Type': u.endsWith('.json') ? 'application/json' : 'text/html' },
            })
          );
        }
      },
      async put(req: Request | string, res: Response) {
        bucket.set(resolveUrlKey(req), res);
      },
      async match(req: Request | string) {
        return bucket.get(resolveUrlKey(req));
      },
    };
  };

  const cachesApi = {
    async open(name: string) {
      return makeCacheApi(name);
    },
    async keys() {
      return Array.from(cacheStore.keys());
    },
    async delete(name: string) {
      return cacheStore.delete(name);
    },
    async match(req: Request | string) {
      const key = resolveUrlKey(req);
      for (const bucket of cacheStore.values()) {
        const hit = bucket.get(key);
        if (hit) return hit;
      }
      return undefined;
    },
  };

  const selfObj = {
    location: new URL('sw.js', originBase),
    skipWaiting,
    clients: { claim: clientsClaim },
    addEventListener(type: string, fn: (event: unknown) => void) {
      const list = listeners.get(type) ?? [];
      list.push(fn);
      listeners.set(type, list);
    },
  };

  const context = vm.createContext({
    self: selfObj,
    caches: cachesApi,
    fetch: fetchMock,
    URL,
    Request,
    Response,
    Promise,
  });
  vm.runInContext(swSource, context);

  return {
    listeners,
    cacheStore,
    skipWaiting,
    clientsClaim,
    fetchMock,
    async dispatchInstall() {
      const pending: Promise<unknown>[] = [];
      for (const fn of listeners.get('install') ?? []) {
        fn({ waitUntil: (p: Promise<unknown>) => pending.push(p) });
      }
      await Promise.all(pending);
    },
    async dispatchActivate() {
      const pending: Promise<unknown>[] = [];
      for (const fn of listeners.get('activate') ?? []) {
        fn({ waitUntil: (p: Promise<unknown>) => pending.push(p) });
      }
      await Promise.all(pending);
    },
    async dispatchFetch(request: Request): Promise<Response | undefined> {
      let responded: Promise<Response> | Response | undefined;
      const pendingBg: Promise<unknown>[] = [];
      for (const fn of listeners.get('fetch') ?? []) {
        fn({
          request,
          respondWith: (p: Promise<Response> | Response) => {
            responded = p;
          },
          waitUntil: (p: Promise<unknown>) => {
            pendingBg.push(p);
          },
        });
      }
      const result = responded ? await responded : undefined;
      await Promise.all(pendingBg);
      return result;
    },
  };
}

describe('Cohort E [PT-089..PT-100]: Chaos, Save Vault, Audio Watchdog, PWA Offline & Double-Click Stress', () => {
  const originalSpeechSynthesis = window.speechSynthesis;
  const originalUtterance = globalThis.SpeechSynthesisUtterance;

  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    setAudioPreferences({ volume: 0.85, muted: false });
    stopSpeech();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
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
    delete (Object.prototype as Record<string, unknown>).polluted;
  });

  it('[PT-089] multi-kid creation & switching keeps profile state isolated across Leo, Maya, and newly created explorers', () => {
    const { unmount } = render(<ProfileVaultModal onClose={vi.fn()} />);

    // Create Sam (Japanese) and Aria (Hindi) via UI
    for (const [name, langLabel] of [
      ['Sam', 'Japanese'],
      ['Aria', 'Hindi'],
    ] as const) {
      fireEvent.click(screen.getByRole('button', { name: /\+ New Kid Explorer/i }));
      fireEvent.change(screen.getByLabelText('New explorer name'), { target: { value: name } });
      const langGroup = screen.getByRole('group', { name: 'Pick Starting Language' });
      fireEvent.click(within(langGroup).getByRole('button', { name: new RegExp(langLabel, 'i') }));
      fireEvent.click(screen.getByRole('button', { name: 'Create Explorer' }));
    }

    let vault = loadVaultFromStorage();
    expect(vault.profiles).toHaveLength(4);
    const sam = vault.profiles.find((p) => p.name === 'Sam')!;
    const aria = vault.profiles.find((p) => p.name === 'Aria')!;
    expect(sam.activeLanguage).toBe('ja');
    expect(aria.activeLanguage).toBe('hi');

    // Progress on Aria must not affect Leo, Maya, or Sam
    vaultActions.completeMapNode({
      language: 'hi',
      nodeId: 'hi-u1-n1',
      stars: 3,
      xpEarned: 45,
      gemsEarned: 12,
      unlockedVocabIds: ['hi-u1-c1'],
      maxCombo: 4,
    });

    vaultActions.switchProfile('kid-leo');
    vault = loadVaultFromStorage();
    expect(vault.activeProfileId).toBe('kid-leo');
    expect(vault.profiles.find((p) => p.id === 'kid-leo')?.totalXp).toBe(0);
    expect(vault.profiles.find((p) => p.id === aria.id)?.totalXp).toBe(45);
    expect(vault.profiles.find((p) => p.id === sam.id)?.totalXp).toBe(0);

    unmount();
  });

  it('[PT-090] last-profile delete refusal blocks deleting the final remaining profile in store & UI', () => {
    const { unmount } = render(<ProfileVaultModal onClose={vi.fn()} />);

    // Delete Maya so only Leo remains
    fireEvent.click(screen.getByRole('button', { name: 'Delete profile Maya' }));
    expect(loadVaultFromStorage().profiles).toHaveLength(1);

    const lastDeleteBtn = screen.getByRole('button', { name: 'Delete profile Leo' });
    expect(lastDeleteBtn).toBeDisabled();
    fireEvent.click(lastDeleteBtn);
    expect(vaultActions.deleteProfile('kid-leo')).toBe(false);
    expect(loadVaultFromStorage().profiles).toHaveLength(1);
    expect(loadVaultFromStorage().activeProfileId).toBe('kid-leo');

    unmount();
  });

  it('[PT-091] .wanderling-save.json replace import overwrites vault cleanly via Paste JSON UI & importVaultJson', () => {
    const incoming = createDefaultVault();
    incoming.profiles[0].gems = 777;
    incoming.profiles[0].totalXp = 950;
    incoming.profiles[0].languageProgress.es.completedNodeIds = ['es-u1-n1', 'es-u1-n2'];
    incoming.audioSettings = { volume: 0.4, muted: true };
    const json = exportVaultJson(incoming);

    const { unmount } = render(<ProfileVaultModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Paste JSON' }));
    fireEvent.change(screen.getByLabelText('Paste save JSON'), { target: { value: json } });
    fireEvent.click(screen.getByRole('button', { name: 'Import Pasted JSON' }));

    expect(screen.getByRole('status')).toHaveTextContent(/Imported 2 explorer profile\(s\) \(replace\)/i);
    const loaded = loadVaultFromStorage();
    expect(loaded.profiles[0].gems).toBe(777);
    expect(loaded.profiles[0].totalXp).toBe(950);
    expect(loaded.audioSettings).toEqual({ volume: 0.4, muted: true });
    unmount();
  });

  it('[PT-092] .wanderling-save.json merge import preserves union of progress, max stars/XP & new profiles', () => {
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-u1-n1',
      stars: 2,
      xpEarned: 20,
      gemsEarned: 5,
      unlockedVocabIds: ['es-u1-c1'],
      maxCombo: 2,
    });

    const incoming = createDefaultVault();
    incoming.profiles[0].gems = 300;
    incoming.profiles[0].totalXp = 500;
    incoming.profiles[0].languageProgress.es.completedNodeIds = ['es-u1-n1', 'es-u1-n2'];
    incoming.profiles[0].languageProgress.es.nodeStars = { 'es-u1-n1': 3, 'es-u1-n2': 3 };
    incoming.profiles[0].languageProgress.es.unlockedVocabIds = ['es-u1-c1', 'es-u1-c2'];
    incoming.profiles.push({
      ...structuredClone(incoming.profiles[0]),
      id: 'kid-guest',
      name: 'Guest',
    });

    const res = importVaultJson(exportVaultJson(incoming), 'merge');
    expect(res.ok).toBe(true);
    expect(res.importedProfilesCount).toBe(3);

    const after = loadVaultFromStorage();
    expect(after.profiles).toHaveLength(3);
    const leo = after.profiles.find((p) => p.id === 'kid-leo')!;
    expect(leo.gems).toBe(300);
    expect(leo.languageProgress.es.completedNodeIds).toEqual(['es-u1-n1', 'es-u1-n2']);
    expect(leo.languageProgress.es.nodeStars['es-u1-n1']).toBe(3);
    expect(leo.languageProgress.es.unlockedVocabIds).toEqual(['es-u1-c1', 'es-u1-c2']);
  });

  it('[PT-093] malformed & prototype-pollution JSON payloads are rejected without mutating vault or Object.prototype', () => {
    const beforeSnapshot = exportVaultJson();

    const invalidPayloads = [
      '',
      '{not-json',
      '[]',
      JSON.stringify({ schemaVersion: 99, activeProfileId: 'kid-leo', profiles: [], audioSettings: { volume: 0.8, muted: false } }),
      JSON.stringify({ ...createDefaultVault(), activeProfileId: 'missing-id' }),
      JSON.stringify({ ...createDefaultVault(), audioSettings: { volume: 5, muted: false } }),
    ];

    for (const payload of invalidPayloads) {
      const res = importVaultJson(payload, 'replace');
      expect(res.ok).toBe(false);
    }

    // Prototype-pollution payload with __proto__ / constructor keys
    const base = createDefaultVault();
    const pollutedJson = JSON.stringify({
      ...base,
      profiles: [
        {
          ...base.profiles[0],
          arcadeHighScores: JSON.parse('{"__proto__": 999, "constructor": 888}'),
        },
        base.profiles[1],
      ],
    });
    importVaultJson(pollutedJson, 'replace');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    const rawProtoPayload =
      '{"__proto__":{"polluted":"yes"},"schemaVersion":1,"activeProfileId":"kid-leo","audioSettings":{"volume":0.8,"muted":false},"profiles":[]}';
    const protoRes = importVaultJson(rawProtoPayload, 'replace');
    expect(protoRes.ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    // Restore clean vault check (if pollutedJson wasn't rejected, at least prototype wasn't polluted)
    if (exportVaultJson() !== beforeSnapshot) {
      const current = loadVaultFromStorage();
      expect(
        Object.prototype.hasOwnProperty.call(current.profiles[0].arcadeHighScores ?? {}, '__proto__')
      ).toBe(false);
    }
  });

  it('[PT-094] legacy wanderling.vault.v1 migration hydrates missing Vol.2 fields losslessly', () => {
    const legacyVault = {
      schemaVersion: 1,
      activeProfileId: 'kid-maya',
      audioSettings: { volume: 0.75, muted: false },
      profiles: [
        {
          id: 'kid-leo',
          name: 'Leo',
          avatarId: 'pip_explorer',
          bannerColor: '#2563EB',
          activeLanguage: 'es',
          gems: 120,
          hearts: 4,
          maxHearts: 5,
          streakDays: 3,
          lastPracticeISO: '2026-10-01',
          streakShields: 1,
          equippedCosmetics: {},
          unlockedCosmetics: [],
          badges: ['first_hello'],
          weeklyXp: 40,
          totalXp: 40,
          leagueTier: 'bronze_acorn',
          stats: {
            lessonsCompleted: 2,
            storiesCompleted: 0,
            bossesCleared: 0,
            arcadeGamesWon: 0,
            turtlePlaysCount: 1,
            bestComboStreak: 3,
            accentSpotlightsSeen: 0,
          },
          languageProgress: {
            es: {
              completedNodeIds: ['es-u1-n1'],
              nodeStars: { 'es-u1-n1': 3 },
              unlockedVocabIds: ['es-u1-c1'],
              claimedChestIds: [],
              currentUnitIndex: 0,
              xpEarned: 40,
            },
          },
        },
        {
          id: 'kid-maya',
          name: 'Maya',
          avatarId: 'colette_baker',
          bannerColor: '#EC4899',
          activeLanguage: 'fr',
          gems: 95,
          hearts: 5,
          maxHearts: 5,
          streakDays: 2,
          lastPracticeISO: '2026-10-02',
          streakShields: 1,
          equippedCosmetics: {},
          unlockedCosmetics: [],
          badges: [],
          weeklyXp: 25,
          totalXp: 25,
          leagueTier: 'bronze_acorn',
          stats: {
            lessonsCompleted: 1,
            storiesCompleted: 0,
            bossesCleared: 0,
            arcadeGamesWon: 0,
            turtlePlaysCount: 0,
            bestComboStreak: 2,
            accentSpotlightsSeen: 0,
          },
          languageProgress: {
            fr: {
              completedNodeIds: ['fr-u1-n1'],
              nodeStars: { 'fr-u1-n1': 3 },
              unlockedVocabIds: ['fr-u1-c1'],
              claimedChestIds: [],
              currentUnitIndex: 0,
              xpEarned: 25,
            },
          },
        },
      ],
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyVault));
    const hydrated = loadVaultFromStorage();
    expect(hydrated.activeProfileId).toBe('kid-maya');
    const leo = hydrated.profiles.find((p) => p.id === 'kid-leo')!;
    const maya = hydrated.profiles.find((p) => p.id === 'kid-maya')!;
    expect(leo.languageProgress.es.completedNodeIds).toEqual(['es-u1-n1']);
    expect(leo.heartElixirs).toBe(0);
    expect(leo.xpBoosterCharges).toBe(0);
    expect(leo.unlockedAvatars?.length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(maya.languageProgress)).toHaveLength(16);
    expect(maya.languageProgress.ja.xpEarned).toBe(0);

    // BUG-012: importVaultJson must also hydrate sparse valid v1 saves omitting optional profile fields
    const sparseV1 = {
      schemaVersion: 1,
      activeProfileId: 'legacy-sparse',
      profiles: [
        {
          id: 'legacy-sparse',
          name: 'Sparse Milo',
          activeLanguage: 'es',
          languageProgress: {
            es: {
              completedNodeIds: ['es-u1-n1'],
            },
          },
        },
      ],
    };
    const sparseRes = importVaultJson(JSON.stringify(sparseV1), 'replace');
    expect(
      sparseRes.ok,
      `BUG-012: sparse valid v1 import failed: ${sparseRes.error}`
    ).toBe(true);
  });

  it('[PT-095] zero-voice getVoices()=>[] triggers instant phonetic/marimba fallback across all 16 languages and ListenDecodeView', async () => {
    const { speakSpy } = installMockSpeechSynthesis({ voices: [] });

    for (const lang of LANGUAGE_LIST) {
      expect(hasNativeVoice(lang)).toBe(false);
    }

    const res = await speakPhrase({
      text: '¡Buenos días!',
      language: 'es',
      phonetic: 'BWEH-nohs DEE-ahs',
      speed: 'normal',
    });
    expect(res).toEqual({ usedNativeVoice: false, fallbackActive: true });
    expect(speakSpy).not.toHaveBeenCalled();
    expect(getSpeechRuntimeState().fallbackActive).toBe(true);
    expect(getSpeechRuntimeState().isSpeaking).toBe(false);

    const ldEx: ListenDecodeExercise = {
      id: 'pt095-ld',
      type: 'listen_decode',
      mode: 'select_meaning',
      audioText: '¡Buenos días!',
      phonetic: 'BWEH-nohs DEE-ahs',
      voiceFallbackPhoneticPrompt: 'BWEH-nohs DEE-ahs',
      englishMeaning: 'Good morning!',
      choices: ['Good morning!', 'Good night!'],
      acceptedAnswers: ['Good morning!'],
      tapHints: [],
      vocabIds: [],
    };
    const { unmount } = render(
      <ListenDecodeView
        exercise={ldEx}
        language="es"
        compact={false}
        locked={false}
        revealed={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    expect(screen.getByRole('note', { name: 'Phonetic clue' })).toBeInTheDocument();
    unmount();
  });

  it('[PT-096] 4500ms hung-utterance watchdog + onerror marimba cadence fallback recover cleanly without stalling', async () => {
    vi.useFakeTimers();

    // Case A: hung utterance (neither onend nor onerror fires)
    const { cancelSpy } = installMockSpeechSynthesis({
      voices: [
        {
          name: 'Mock Spanish',
          lang: 'es-MX',
          localService: true,
          default: true,
          voiceURI: 'es-MX',
        } as SpeechSynthesisVoice,
      ],
      autoComplete: 'hang',
    });

    let settled = false;
    const p1 = speakPhrase({
      text: '¡Hola!',
      language: 'es',
      phonetic: 'OH-lah',
      speed: 'normal',
    }).then((out) => {
      settled = true;
      return out;
    });

    expect(getSpeechRuntimeState().isSpeaking).toBe(true);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(4600);
    const out1 = await p1;
    expect(settled).toBe(true);
    expect(out1.usedNativeVoice).toBe(true);
    expect(cancelSpy).toHaveBeenCalled();
    expect(getSpeechRuntimeState().isSpeaking).toBe(false);

    // Case B: onerror falls back to marimba cadence cleanly
    installMockSpeechSynthesis({
      voices: [
        {
          name: 'Mock French',
          lang: 'fr-FR',
          localService: true,
          default: true,
          voiceURI: 'fr-FR',
        } as SpeechSynthesisVoice,
      ],
      autoComplete: 'error',
    });

    const out2 = await speakPhrase({
      text: 'Bonjour',
      language: 'fr',
      phonetic: 'bon-ZHOOR',
      speed: 'slow',
    });
    expect(out2).toEqual({ usedNativeVoice: false, fallbackActive: true });
    expect(getSpeechRuntimeState().isSpeaking).toBe(false);
  });

  it('[PT-097] rapid mid-speech tab/language/speed switching cancels stale utterances without overlapping state', async () => {
    const { utterances, cancelSpy } = installMockSpeechSynthesis({
      voices: [
        { name: 'es', lang: 'es-MX', localService: true, default: false, voiceURI: 'es' } as SpeechSynthesisVoice,
        { name: 'ar', lang: 'ar-SA', localService: true, default: false, voiceURI: 'ar' } as SpeechSynthesisVoice,
        { name: 'zh', lang: 'zh-CN', localService: true, default: false, voiceURI: 'zh' } as SpeechSynthesisVoice,
      ],
      autoComplete: 'hang',
    });

    const p1 = speakPhrase({ text: 'Hola', language: 'es', speed: 'slow' });
    const p2 = speakPhrase({ text: 'مرحبا', language: 'ar', speed: 'fluent' });
    const p3 = speakPhrase({ text: '你好', language: 'zh', speed: 'normal' });

    expect(utterances).toHaveLength(3);
    expect(utterances[0].rate).toBe(0.65);
    expect(utterances[1].rate).toBe(1.12);
    expect(utterances[2].rate).toBe(0.95);
    expect(cancelSpy).toHaveBeenCalled();

    // Firing stale onend on utterance 0 must be ignored; utterance 2 settles cleanly
    utterances[0].onend?.(new Event('end'));
    expect(getSpeechRuntimeState().activeText).toBe('你好');

    utterances[2].onend?.(new Event('end'));
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1.usedNativeVoice).toBe(true);
    expect(r2.usedNativeVoice).toBe(true);
    expect(r3.usedNativeVoice).toBe(true);
    expect(getSpeechRuntimeState().isSpeaking).toBe(false);
  });

  it('[PT-098] ./sw.js precaches all core assets on install and purges stale caches on activate', async () => {
    const sw = loadServiceWorkerHarness('http://127.0.0.1:4173/wanderling-subpath/');
    // Pre-populate stale caches
    sw.cacheStore.set('wanderling-cache-v1', new Map());
    sw.cacheStore.set('wanderling-cache-v5', new Map());

    await sw.dispatchInstall();
    expect(sw.skipWaiting).toHaveBeenCalledTimes(1);

    const activeCache = sw.cacheStore.get('wanderling-cache-v6');
    expect(activeCache).toBeDefined();
    for (const relUrl of [
      './',
      './index.html',
      './manifest.json',
      './icons/icon-192.png',
      './icons/icon-512.png',
      './icons/icon-maskable-192.png',
      './icons/icon-maskable-512.png',
      './icons/apple-touch-icon.png',
    ]) {
      const fullHref = new URL(relUrl, 'http://127.0.0.1:4173/wanderling-subpath/').href;
      expect(activeCache!.has(fullHref), `Missing precache entry ${fullHref}`).toBe(true);
    }

    await sw.dispatchActivate();
    expect(sw.clientsClaim).toHaveBeenCalledTimes(1);
    expect(sw.cacheStore.has('wanderling-cache-v1')).toBe(false);
    expect(sw.cacheStore.has('wanderling-cache-v5')).toBe(false);
    expect(sw.cacheStore.has('wanderling-cache-v6')).toBe(true);

    // BUG-017: Root metadata must match 16-language Wanderling 2.0 scope
    const pkg = JSON.parse(readFileSync(resolve(ROOT_DIR, 'package.json'), 'utf8')) as {
      description?: string;
    };
    expect(pkg.description ?? '', 'BUG-017: package.json still claims 4-language').not.toMatch(/4-language/i);
    const designDoc = readFileSync(resolve(ROOT_DIR, 'DESIGN.md'), 'utf8');
    expect(designDoc, 'BUG-017: DESIGN.md still lists Four Symmetrical Cultural Lands').not.toMatch(
      /Four Symmetrical Cultural Lands/i
    );
  });

  it('[PT-099] ./sw.js caches lazy chunks online and serves offline navigation & cached chunks under /wanderling-subpath/', async () => {
    const sw = loadServiceWorkerHarness('http://127.0.0.1:4173/wanderling-subpath/');
    await sw.dispatchInstall();
    await sw.dispatchActivate();

    const chunkUrl = 'http://127.0.0.1:4173/wanderling-subpath/assets/corpTrades-chunk.js';
    sw.fetchMock.mockResolvedValueOnce(
      new Response('export const corpTrades = {};', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      })
    );

    const onlineChunkRes = await sw.dispatchFetch(new Request(chunkUrl, { method: 'GET' }));
    expect(onlineChunkRes?.status).toBe(200);

    // Now go offline: cached lazy chunk must resolve from cache!
    sw.fetchMock.mockRejectedValue(new Error('Network offline'));
    const offlineChunkRes = await sw.dispatchFetch(new Request(chunkUrl, { method: 'GET' }));
    expect(offlineChunkRes?.status).toBe(200);
    expect(await offlineChunkRes!.text()).toContain('corpTrades');

    // Offline HTML navigation under subpath falls back to cached ./index.html
    const offlineNavRes = await sw.dispatchFetch(
      new Request('http://127.0.0.1:4173/wanderling-subpath/anything', {
        method: 'GET',
        headers: { Accept: 'text/html' },
      })
    );
    expect(offlineNavRes?.status).toBe(200);
    expect(await offlineNavRes!.text()).toContain('index.html');

    // Cross-origin & POST requests are ignored by sw fetch listener
    const postRes = await sw.dispatchFetch(
      new Request('http://127.0.0.1:4173/wanderling-subpath/api', { method: 'POST' })
    );
    expect(postRes).toBeUndefined();

    // Uncached offline asset returns graceful 503
    const missingRes = await sw.dispatchFetch(
      new Request('http://127.0.0.1:4173/wanderling-subpath/assets/uncached.js', { method: 'GET' })
    );
    expect(missingRes?.status).toBe(503);
  });

  it('[PT-100] rapid double-click stress on Check/Continue, Chest Claim, Shop Buy, and Boss victory never double-penalizes, skips exercises, or double-charges', () => {
    vi.useFakeTimers();

    // 1. Rapid double-click on Check (wrong answer must deduct ONLY 1 heart, NOT 2) & Continue (must NOT skip next exercise)
    const wb1: WordBankExercise = {
      id: 'pt100-wb-1',
      type: 'word_bank',
      direction: 'to_foreign',
      promptText: 'Hello',
      promptTokens: [],
      targetTokens: ['Hola'],
      distractorTokens: ['Adiós'],
      expectedSentence: 'Hola',
      acceptedSentences: ['Hola'],
      phoneticHint: 'OH-lah',
      vocabIds: [],
    };
    const wb2: WordBankExercise = {
      id: 'pt100-wb-2',
      type: 'word_bank',
      direction: 'to_foreign',
      promptText: 'Second Question Must Not Be Skipped',
      promptTokens: [],
      targetTokens: ['Agua'],
      distractorTokens: ['Pan'],
      expectedSentence: 'Agua',
      acceptedSentences: ['Agua'],
      phoneticHint: 'AH-gwah',
      vocabIds: [],
    };
    const wb3: WordBankExercise = {
      id: 'pt100-wb-3',
      type: 'word_bank',
      direction: 'to_foreign',
      promptText: 'Third Question',
      promptTokens: [],
      targetTokens: ['Sol'],
      distractorTokens: ['Luna'],
      expectedSentence: 'Sol',
      acceptedSentences: ['Sol'],
      phoneticHint: 'SOHL',
      vocabIds: [],
    };
    const stressNode: MapNode = {
      id: 'pt100-stress-node',
      unitId: 'es-u1',
      order: 1,
      nodeType: 'lesson',
      title: 'Double Click Stress',
      subtitle: 'Race stress',
      xpReward: 20,
      gemReward: 5,
      exercises: [wb1, wb2, wb3],
      rewardVocabIds: [],
    };

    const { unmount: unmountStress } = render(
      <LessonArena node={stressNode} language="es" onExit={vi.fn()} />
    );
    clickTokensInTray(['Adiós']); // Wrong answer on wb1
    const checkBtn = requireButtonByText('Check');
    // 1a. Same-tick rapid double-click before React commit must deduct at most 1 heart
    act(() => {
      checkBtn.click();
      checkBtn.click();
    });
    expect(
      loadVaultFromStorage().profiles[0].hearts,
      'Same-tick double-click on Check deducted 2 hearts for 1 wrong answer!'
    ).toBe(4);

    // 1b. Same-tick double-click on Continue must NOT skip Exercise 2 ("Second Question Must Not Be Skipped")
    const continueBtn = requireButtonByText('Continue');
    act(() => {
      continueBtn.click();
      continueBtn.click();
    });
    expect(
      document.body.textContent ?? '',
      'Same-tick double-click on Continue skipped exercise 2 ("Second Question Must Not Be Skipped")!'
    ).toContain('Second Question Must Not Be Skipped');

    // 1c. Consecutive double-click on un-keyed Check button must NOT reuse the DOM node as Continue and skip feedback
    clickTokensInTray(['No']); // Wrong answer on wb2
    const checkBtn2 = requireButtonByText('Check');
    fireEvent.click(checkBtn2);
    fireEvent.click(checkBtn2);
    expect(
      queryButtonByText('Continue'),
      'Consecutive rapid double-click on Check reused the un-keyed DOM button as Continue and skipped feedback!'
    ).toBeDefined();
    act(() => {
      vi.clearAllTimers();
    });
    unmountStress();
    cleanup();

    // 2. Rapid double-click on Chest Claim
    vaultActions.resetVaultToDefaults();
    const chestNode = COURSES.es.units[0].nodes.find((n) => n.nodeType === 'chest')!;
    const gemsBeforeChest = loadVaultFromStorage().profiles[0].gems;
    const { unmount: unmountChest } = render(
      <LessonArena node={chestNode} language="es" onExit={vi.fn()} />
    );
    const openBtn = requireButtonByText('Open Treasure Chest!');
    act(() => {
      openBtn.click();
      openBtn.click();
    });
    expect(loadVaultFromStorage().profiles[0].gems).toBe(gemsBeforeChest + chestNode.gemReward);
    act(() => {
      vi.clearAllTimers();
    });
    unmountChest();
    cleanup();

    // 3. Rapid double-click on Shop Buy (cosmetic purchase must charge once)
    vaultActions.resetVaultToDefaults();
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-seed-gems',
      stars: 3,
      xpEarned: 10,
      gemsEarned: 200,
      unlockedVocabIds: [],
      maxCombo: 0,
    });
    const gemsBeforeShop = loadVaultFromStorage().profiles[0].gems;
    const { unmount: unmountShop } = render(<CompanionShop />);
    fireEvent.click(screen.getByRole('button', { name: 'Hats' }));
    const buyBtn = screen.getAllByRole('button', { name: /Buy & Equip \(35\)/i })[0];
    act(() => {
      buyBtn.click();
      buyBtn.click();
    });
    expect(loadVaultFromStorage().profiles[0].gems).toBe(gemsBeforeShop - 35);
    unmountShop();
    cleanup();

    // 4. Rapid double-click on Boss Gauntlet Send Reply & Collect Boss Chest & Finish!
    vaultActions.resetVaultToDefaults();
    const bossEx: BossGauntletExercise = {
      id: 'pt100-boss',
      type: 'boss_gauntlet',
      companionId: 'mateo',
      companionName: 'Mateo',
      title: 'Boss Double Click Test',
      introLine: 'Hola!',
      rewardChestGems: 25,
      vocabIds: [],
      turns: [
        {
          id: 'pt100-boss-t1',
          companionSayForeign: '¡Hola!',
          companionSayEnglish: 'Hello!',
          companionPhonetic: 'OH-lah',
          tapHints: [],
          promptEnglish: 'Say hello!',
          mode: 'choice',
          choices: ['¡Hola!', '¡Adiós!'],
          expectedAnswer: '¡Hola!',
          acceptedAnswers: ['¡Hola!'],
          phoneticAnswer: 'OH-lah',
          victoryReplyForeign: '¡Genial!',
          victoryReplyEnglish: 'Great!',
        },
      ],
    };
    const onTurnResultSpy = vi.fn();
    const onCompleteSpy = vi.fn();
    const { unmount: unmountBoss } = render(
      <BossGauntletView
        exercise={bossEx}
        language="es"
        compact={false}
        onTurtlePlay={vi.fn()}
        onTurnResult={onTurnResultSpy}
        onComplete={onCompleteSpy}
      />
    );
    fireEvent.click(requireButtonByText('¡Hola!'));
    const sendReplyBtn = requireButtonByText('Send Reply!');
    act(() => {
      sendReplyBtn.click();
      sendReplyBtn.click();
    });
    expect(
      onTurnResultSpy,
      'Double-clicking Send Reply! fired onTurnResult twice!'
    ).toHaveBeenCalledTimes(1);

    fireEvent.click(requireButtonByText('Finish Encounter!'));
    const collectBtn = requireButtonByText('Collect Boss Chest & Finish!');
    act(() => {
      collectBtn.click();
      collectBtn.click();
    });
    expect(
      onCompleteSpy,
      'Double-clicking Collect Boss Chest & Finish! fired onComplete twice!'
    ).toHaveBeenCalledTimes(1);
    act(() => {
      vi.clearAllTimers();
    });
    unmountBoss();
    cleanup();

    // 5. BUG-016: Unmounting PairMatchRushView mid-mismatch must clear pending 420ms timeout
    const { unmount: unmountPair } = render(
      <PairMatchRushView
        exercise={{
          id: 'pt100-pair',
          type: 'pair_match_rush',
          title: 'Timer Leak Check',
          pairs: [
            { id: 'p1', foreign: 'Hola', english: 'Hello', phonetic: 'OH-lah' },
            { id: 'p2', foreign: 'Agua', english: 'Water', phonetic: 'AH-gwah' },
          ],
          timeBonusSeconds: 30,
        }}
        language="es"
        compact={false}
        onComplete={vi.fn()}
      />
    );
    const leftBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-pair-id="p1"]'));
    const rightBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-pair-id="p2"]'));
    fireEvent.click(leftBtns[0]);
    fireEvent.click(rightBtns[1]); // mismatch schedules 420ms window.setTimeout
    unmountPair();
    cleanup();
    expect(
      vi.getTimerCount(),
      'BUG-016: PairMatchRushView leaked pending mismatch timeout after unmount!'
    ).toBe(0);
  });
});
