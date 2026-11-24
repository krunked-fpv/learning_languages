import '@testing-library/jest-dom/vitest';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import vm from 'node:vm';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { getSpeechRuntimeState, speakPhrase, stopSpeech } from '../../src/audio';
import { ArcadeHub } from '../../src/components/arcade/ArcadeHub';
import { BossGauntletView } from '../../src/components/lesson/BossGauntletView';
import { FreeRecallHintBar } from '../../src/components/lesson/FreeRecallHintBar';
import { LessonArena } from '../../src/components/lesson/LessonArena';
import { VirtualScriptDrawer } from '../../src/components/lesson/VirtualScriptDrawer';
import { WordBankView } from '../../src/components/lesson/WordBankView';
import { AdventureMap } from '../../src/components/map/AdventureMap';
import { ProfileVaultModal } from '../../src/components/shell/ProfileVaultModal';
import {
  computeUpdatedVocabMastery,
  resolveFreeRecallHint,
  scoreSrsCandidates,
} from '../../src/core';
import {
  COURSES,
  buildSrsReviewQuestNode,
  getCourseGlossary,
  lookupGlossaryEntry,
} from '../../src/curriculum';
import {
  EAGER_BASE_COURSES as PROD_EAGER_BASE_COURSES,
  BASE_COURSE_LOADERS as PROD_BASE_COURSE_LOADERS,
} from '../../src/curriculum/baseCoursesLoader.prod';
import { buildTapHintsFromExample } from '../../src/components/lesson/lessonHelpers';
import {
  exportVaultJson,
  importVaultJson,
  loadVaultFromStorage,
  vaultActions,
} from '../../src/store/useVaultStore';
import {
  LANGUAGE_META,
  VISIBLE_BASE_LANGUAGES,
  type BaseLanguageCode,
  type BossGauntletExercise,
  type ListenDecodeExercise,
  type MapNode,
  type VocabMasteryEntry,
  type WordBankExercise,
} from '../../src/types/contracts';
import { installMockSpeechSynthesis, playExerciseInDom } from './helpers';

const ROOT_DIR = resolve(__dirname, '../..');
const DIST_DIR = resolve(ROOT_DIR, 'dist');
const UNICODE_FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]/u;
const MAX_JS_CHUNK_BYTES = 500 * 1024;

function ensureBuiltDist(): void {
  const manifestPath = resolve(DIST_DIR, 'sw-precache-manifest.json');
  const distSwPath = resolve(DIST_DIR, 'sw.js');
  if (existsSync(manifestPath) && existsSync(distSwPath) && existsSync(resolve(DIST_DIR, 'index.html'))) {
    return;
  }
  const nodeBinDir = dirname(process.execPath);
  const pathSep = process.platform === 'win32' ? ';' : ':';
  execSync('npm run build', {
    cwd: ROOT_DIR,
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PATH: `${nodeBinDir}${pathSep}${process.env.PATH ?? ''}`,
    },
  });
}

function walkFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      out.push(...walkFilesRecursive(fullPath));
    } else if (st.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

function setViewportSize(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatioHex(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(parseHexColor(hexA));
  const l2 = relativeLuminance(parseHexColor(hexB));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgbOrHex(raw: string): [number, number, number] | null {
  const trimmed = raw.trim();
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(trimmed)) {
    return parseHexColor(trimmed);
  }
  const rgbaMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)$/i.exec(trimmed);
  if (!rgbaMatch) return null;
  return [Number(rgbaMatch[1]), Number(rgbaMatch[2]), Number(rgbaMatch[3])];
}

function compositeOver(
  fgRgba: string,
  bgRgb: [number, number, number]
): [number, number, number] {
  const rgbaMatch = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/i.exec(fgRgba.trim());
  if (!rgbaMatch) {
    return parseRgbOrHex(fgRgba) ?? bgRgb;
  }
  const alpha = Number(rgbaMatch[4]);
  return [
    Math.round(Number(rgbaMatch[1]) * alpha + bgRgb[0] * (1 - alpha)),
    Math.round(Number(rgbaMatch[2]) * alpha + bgRgb[1] * (1 - alpha)),
    Math.round(Number(rgbaMatch[3]) * alpha + bgRgb[2] * (1 - alpha)),
  ];
}

function contrastRatioRgb(a: [number, number, number], b: [number, number, number]): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function createMockAudioContextWithTracking() {
  const oscTypes: string[] = [];
  const stopSpies: Array<ReturnType<typeof vi.fn>> = [];
  const MockAudioContext = class {
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
      const stopSpy = vi.fn();
      stopSpies.push(stopSpy);
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
        stop: stopSpy,
        disconnect: vi.fn(),
        onended: null as (() => void) | null,
      };
    }
  };
  return { MockAudioContext, oscTypes, stopSpies };
}

function loadDistSwHarness(originBase = 'http://127.0.0.1:4173/wanderling-subpath/') {
  const swSource = readFileSync(resolve(DIST_DIR, 'sw.js'), 'utf8');
  const listeners = new Map<string, Array<(event: unknown) => void>>();
  const cacheStore = new Map<string, Map<string, Response>>();
  const skipWaiting = vi.fn().mockResolvedValue(undefined);
  const clientsClaim = vi.fn().mockResolvedValue(undefined);
  const fetchMock = vi.fn();
  const resolveUrlKey = (reqOrUrl: Request | string): string =>
    new URL(typeof reqOrUrl === 'string' ? reqOrUrl : reqOrUrl.url, originBase).href;

  const makeCacheApi = (cacheName: string) => {
    if (!cacheStore.has(cacheName)) cacheStore.set(cacheName, new Map());
    const bucket = cacheStore.get(cacheName)!;
    return {
      async addAll(urls: string[]) {
        for (const u of urls) {
          const href = resolveUrlKey(u);
          bucket.set(
            href,
            new Response(`cached:${href}`, {
              status: 200,
              headers: { 'Content-Type': u.endsWith('.js') ? 'application/javascript' : 'text/html' },
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

  vm.runInContext(
    swSource,
    vm.createContext({ self: selfObj, caches: cachesApi, fetch: fetchMock, URL, Request, Response, Promise })
  );

  return {
    cacheStore,
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
          waitUntil: (p: Promise<unknown>) => pendingBg.push(p),
        });
      }
      const result = responded ? await responded : undefined;
      await Promise.all(pendingBg);
      return result;
    },
  };
}

function findRomanizedToForeignWordBank(lang: BaseLanguageCode): {
  exercise: WordBankExercise;
  romanizedSample: string;
} {
  const latinRe = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;
  const nonLatinRe = /[\u3005\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\u0900-\u097F\u0980-\u09FF\u0600-\u06FF\u0400-\u04FF]/;
  for (const unit of COURSES[lang].units) {
    for (const node of unit.nodes) {
      for (const ex of node.exercises) {
        if (ex.type === 'word_bank' && ex.direction === 'to_foreign' && ex.allowFreeRecall) {
          const rom = (ex.acceptedSentences ?? []).find(
            (cand) => latinRe.test(cand) && !nonLatinRe.test(cand)
          );
          if (rom) {
            return { exercise: ex, romanizedSample: rom };
          }
        }
      }
    }
  }
  throw new Error(`No romanized to_foreign WordBankExercise found for ${lang}`);
}

describe('Cohort F [PT-101..PT-115]: Sprint 2 Features (Operation Starlight Horizon)', () => {
  const originalSpeechSynthesis = window.speechSynthesis;
  const originalUtterance = globalThis.SpeechSynthesisUtterance;
  const originalAudioContext = (window as unknown as { AudioContext?: unknown }).AudioContext;
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    stopSpeech();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    stopSpeech();
    cleanup();
    vi.restoreAllMocks();
    vi.doUnmock('../../src/curriculum/baseCoursesLoader');
    vi.doUnmock('../../src/curriculum/baseCoursesLoader.test');
    vi.doUnmock('../../src/curriculum');
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
    setViewportSize(originalInnerWidth, originalInnerHeight);
  });

  it('[PT-101] (S2-001) dynamic base course loader keeps only es eager, lazily loads non-es courses, and recovers offline via BaseTrackLoadingCard', async () => {
    // 1. Production loader metadata: ONLY `es` is eager; all 16 languages have dynamic loaders
    expect(Object.keys(PROD_EAGER_BASE_COURSES)).toEqual(['es']);
    expect(PROD_EAGER_BASE_COURSES.es?.course.units).toHaveLength(16);
    for (const lang of VISIBLE_BASE_LANGUAGES) {
      expect(typeof PROD_BASE_COURSE_LOADERS[lang]).toBe('function');
    }
    const lazyJa = await PROD_BASE_COURSE_LOADERS.ja();
    expect(lazyJa.course.language).toBe('ja');
    expect(lazyJa.course.units).toHaveLength(16);

    // 2. Simulate production lazy loading + offline failure + Retry + Switch to Español in App
    vi.resetModules();
    let jaAttempts = 0;
    const jaLoaderMock = vi.fn(async () => {
      jaAttempts += 1;
      if (jaAttempts === 1) {
        throw new Error('503 Offline');
      }
      return {
        course: COURSES.ja,
        glossary: getCourseGlossary('ja'),
      };
    });
    const frLoaderMock = vi.fn(async () => {
      throw new Error('503 Offline');
    });

    const mockBaseLoaderPayload = {
      EAGER_BASE_COURSES: {
        es: { course: COURSES.es, glossary: getCourseGlossary('es') },
      },
      BASE_COURSE_LOADERS: {
        ...Object.fromEntries(
          VISIBLE_BASE_LANGUAGES.map((lang) => [
            lang,
            async () => ({ course: COURSES[lang], glossary: getCourseGlossary(lang) }),
          ])
        ),
        ja: jaLoaderMock,
        fr: frLoaderMock,
      },
    };
    vi.doMock('../../src/curriculum/baseCoursesLoader', () => mockBaseLoaderPayload);
    vi.doMock('../../src/curriculum/baseCoursesLoader.test', () => mockBaseLoaderPayload);

    try {
      const baseReg = await import('../../src/curriculum/baseRegistry');
      expect(baseReg.isBaseTrackLoaded('es')).toBe(true);
      expect(baseReg.isBaseTrackLoaded('ja')).toBe(false);
      expect(baseReg.isBaseTrackLoaded('fr')).toBe(false);
      expect(baseReg.getBaseCourse('ja').units).toHaveLength(0);

      // Concurrent ensureBaseCourseLoaded('fr') deduplicates loader call
      const pA = baseReg.ensureBaseCourseLoaded('fr').catch((e) => e);
      const pB = baseReg.ensureBaseCourseLoaded('fr').catch((e) => e);
      await Promise.all([pA, pB]);
      expect(frLoaderMock).toHaveBeenCalledTimes(1);

      const { App: LazyApp } = await import('../../src/App');
      const { vaultActions: lazyVaultActions, loadVaultFromStorage: lazyLoadVault } = await import(
        '../../src/store/useVaultStore'
      );
      window.localStorage.clear();
      lazyVaultActions.resetVaultToDefaults();
      lazyVaultActions.setActiveLanguage('ja');

      const { unmount } = render(<LazyApp />);
      await waitFor(() => {
        const card = screen.getByTestId('base-track-loading-card');
        expect(card).toHaveTextContent('OFFLINE FALLBACK');
        expect(card).toHaveTextContent(/offline right now/i);
      });

      // Click Retry Loading -> jaLoaderMock succeeds on attempt #2 and mounts Japanese map!
      fireEvent.click(screen.getByRole('button', { name: 'Retry Loading' }));
      await waitFor(() => {
        expect(screen.queryByTestId('base-track-loading-card')).not.toBeInTheDocument();
        expect(screen.getByText(LANGUAGE_META.ja.landTitle)).toBeInTheDocument();
      });
      expect(jaAttempts).toBe(2);

      // Switch to French offline -> shows BaseTrackLoadingCard -> click "Switch to Español"
      act(() => {
        lazyVaultActions.setActiveLanguage('fr');
      });
      await waitFor(() => {
        expect(screen.getByTestId('base-track-loading-card')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Switch to Español' }));
      await waitFor(() => {
        expect(screen.queryByTestId('base-track-loading-card')).not.toBeInTheDocument();
        expect(screen.getByText(LANGUAGE_META.es.landTitle)).toBeInTheDocument();
      });
      const activeProf = lazyLoadVault().profiles.find((p) => p.id === lazyLoadVault().activeProfileId)!;
      expect(activeProf.activeLanguage).toBe('es');
      unmount();
    } finally {
      vi.doUnmock('../../src/curriculum/baseCoursesLoader');
      vi.doUnmock('../../src/curriculum/baseCoursesLoader.test');
      vi.resetModules();
    }
  });

  it('[PT-102] (S2-003) verifies wanderling-cache-v8, dist/sw-precache-manifest.json runtime coverage, and ProfileVaultModal Offline Atlas Pack CTA', async () => {
    ensureBuiltDist();
    const manifestPath = resolve(DIST_DIR, 'sw-precache-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      cacheVersion: string;
      assets: string[];
    };
    expect(manifest.cacheVersion).toBe('wanderling-cache-v8');
    expect(new Set(manifest.assets).size).toBe(manifest.assets.length);

    // Every built .js/.mjs/.css/.woff2 asset in dist/assets must be covered in sw-precache-manifest.json
    const builtFiles = walkFilesRecursive(resolve(DIST_DIR, 'assets'))
      .filter((f) => /\.(js|mjs|css|woff2)$/i.test(f))
      .map((f) => `./${relative(DIST_DIR, f).replace(/\\/g, '/')}`);
    expect(builtFiles.length).toBeGreaterThan(20);
    for (const rel of builtFiles) {
      expect(manifest.assets, `Missing built chunk ${rel} in sw-precache-manifest.json`).toContain(rel);
    }

    // Simulated SW v8 install + activate + offline cached chunk fetch
    const sw = loadDistSwHarness('http://127.0.0.1:4173/wanderling-subpath/');
    sw.cacheStore.set('wanderling-cache-v7', new Map());
    await sw.dispatchInstall();
    await sw.dispatchActivate();
    expect(sw.cacheStore.has('wanderling-cache-v7')).toBe(false);
    expect(sw.cacheStore.has('wanderling-cache-v8')).toBe(true);

    const lazyCourseAsset = builtFiles.find((f) => /^\.\/assets\/course-ja-/.test(f))!;
    sw.fetchMock.mockRejectedValue(new Error('Network offline'));
    const offlineLazyRes = await sw.dispatchFetch(
      new Request(new URL(lazyCourseAsset, 'http://127.0.0.1:4173/wanderling-subpath/').href)
    );
    expect(offlineLazyRes?.status).toBe(200);

    // ProfileVaultModal Offline Atlas Pack CTA
    const { unmount } = render(<ProfileVaultModal onClose={vi.fn()} />);
    const section = screen.getByTestId('offline-pack-section');
    expect(section).toHaveTextContent(/Offline Atlas Pack/i);
    expect(section).toHaveTextContent(/16 \/ 16 languages cached offline|languages cached offline/i);

    const downloadBtn = screen.getByTestId('download-offline-pack-btn');
    fireEvent.click(downloadBtn);
    await waitFor(() => {
      expect(section).toHaveTextContent(/16 \/ 16 languages cached offline — ready anywhere!/i);
    });
    expect(downloadBtn).not.toBeDisabled();
    unmount();
    cleanup();

    // Offline error recovery inside ProfileVaultModal Offline Atlas Pack CTA
    vi.resetModules();
    const actualCurr = await vi.importActual<typeof import('../../src/curriculum')>('../../src/curriculum');
    vi.doMock('../../src/curriculum', () => ({
      ...actualCurr,
      isBaseTrackLoaded: vi.fn((lang: string) => lang === 'es'),
      ensureAllBaseCoursesLoaded: vi.fn().mockRejectedValue(new Error('Offline chunk fetch failed')),
    }));
    try {
      const { ProfileVaultModal: MockedVaultModal } = await import(
        '../../src/components/shell/ProfileVaultModal'
      );
      const { unmount: unmountErr } = render(<MockedVaultModal onClose={vi.fn()} />);
      const errSection = screen.getByTestId('offline-pack-section');
      expect(errSection).toHaveTextContent('1 / 16 languages cached offline');
      fireEvent.click(screen.getByTestId('download-offline-pack-btn'));
      await waitFor(() => {
        expect(errSection).toHaveTextContent(/Reconnect and retry to finish caching/i);
      });
      expect(screen.getByTestId('download-offline-pack-btn')).not.toBeDisabled();
      unmountErr();
    } finally {
      vi.doUnmock('../../src/curriculum');
      vi.resetModules();
    }
  });

  it('[PT-103] (S2-002) renders Romanized Syllable Guide & Tier 1/2/3 romanized slots across zh, ja, hi, bn, ar, arz, and ru', () => {
    const romanizedLangs: readonly BaseLanguageCode[] = ['zh', 'ja', 'hi', 'bn', 'ar', 'arz', 'ru'];
    const latinCharRe = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;

    for (const lang of romanizedLangs) {
      const { exercise, romanizedSample } = findRomanizedToForeignWordBank(lang);
      const firstWord = romanizedSample.trim().split(/\s+/)[0];
      const prefix = firstWord.slice(0, Math.min(2, firstWord.length));

      for (const tier of [1, 2, 3] as const) {
        const plan = resolveFreeRecallHint({
          typedText: prefix,
          expected: exercise.targetTokens.join(' '),
          accepted: exercise.acceptedSentences,
          targetTokens: exercise.targetTokens,
          language: lang,
          tier,
        });
        expect(plan.isRomanizedMode, `${lang} tier ${tier} must enter romanized mode`).toBe(true);
        expect(plan.hasWrongSuffix, `${lang} tier ${tier} rejected prefix "${prefix}"`).toBe(false);
        expect(plan.slots.some((s) => latinCharRe.test(s.word))).toBe(true);
        if (tier === 2) {
          expect(plan.slots.some((s) => s.state === 'ghost')).toBe(true);
        }
        if (tier === 3) {
          expect(plan.slots.some((s) => s.state === 'revealed')).toBe(true);
        }
      }

      // Render inside real WordBankView with Type-Instead Free-Recall toggled ON + Hint
      const { unmount } = render(
        <WordBankView
          exercise={exercise}
          language={lang}
          compact={false}
          locked={false}
          onTurtlePlay={vi.fn()}
          onDraftChange={vi.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
      const input = screen.getByLabelText('Type your translation') as HTMLInputElement;
      fireEvent.change(input, { target: { value: prefix } });
      fireEvent.click(screen.getByTestId('starlight-hint-btn'));

      const hintBar = screen.getByTestId('free-recall-hint-bar');
      expect(screen.getByTestId('free-recall-romanized-chip')).toHaveTextContent(
        'Romanized Syllable Guide'
      );
      expect(screen.queryByTestId('free-recall-mismatch-note')).not.toBeInTheDocument();
      // Romanized hint slots always read LTR (even for Arabic/Egyptian Arabic)
      expect(hintBar.querySelector('[dir="ltr"]')).not.toBeNull();
      unmount();
      cleanup();
    }
  });

  it('[PT-104] (S2-002) surfaces Free-Recall tone/diacritic coaching without blocking progress on zh Pinyin, vi, and accented Romance', () => {
    // 1. zh Pinyin: "Mateao" vs "Mǎtè'ào"
    const zhPlan = resolveFreeRecallHint({
      typedText: 'Mateao',
      expected: '马特奥',
      accepted: ["Mǎtè'ào", 'Mateao'],
      language: 'zh',
      tier: 2,
    });
    expect(zhPlan.isRomanizedMode).toBe(true);
    expect(zhPlan.hasWrongSuffix).toBe(false);
    expect(zhPlan.toneCoaching?.hasToneMismatch).toBe(true);
    expect(zhPlan.toneCoaching?.expectedWord).toBe("Mǎtè'ào");

    const { unmount: unmountZh } = render(
      <FreeRecallHintBar
        plan={zhPlan}
        hintTier={2}
        ghostFaded={false}
        isAnimating={false}
        answerDir="ltr"
      />
    );
    expect(screen.getByTestId('free-recall-tone-coaching')).toHaveTextContent("Mǎtè'ào");
    expect(screen.queryByTestId('free-recall-mismatch-note')).not.toBeInTheDocument();
    unmountZh();
    cleanup();

    // 2. Vietnamese: "xin chao" vs "Xin chào!"
    const viPlan = resolveFreeRecallHint({
      typedText: 'xin chao',
      expected: 'Xin chào!',
      accepted: ['Xin chào!', 'xin chao'],
      language: 'vi',
      tier: 2,
    });
    expect(viPlan.hasWrongSuffix).toBe(false);
    expect(viPlan.toneCoaching?.hasToneMismatch).toBe(true);
    expect(viPlan.toneCoaching?.expectedWord).toBe('chào');

    const { unmount: unmountVi } = render(
      <FreeRecallHintBar
        plan={viPlan}
        hintTier={2}
        ghostFaded={false}
        isAnimating={false}
        answerDir="ltr"
      />
    );
    expect(screen.getByTestId('free-recall-tone-coaching')).toHaveTextContent('chào');
    expect(screen.queryByTestId('free-recall-mismatch-note')).not.toBeInTheDocument();
    unmountVi();
    cleanup();

    // 3. Accented Romance (es): "nino" vs "niño"
    const esPlan = resolveFreeRecallHint({
      typedText: 'nino',
      expected: 'niño',
      accepted: ['niño', 'nino'],
      language: 'es',
      tier: 2,
    });
    expect(esPlan.hasWrongSuffix).toBe(false);
    expect(esPlan.toneCoaching?.hasToneMismatch).toBe(true);
    expect(esPlan.toneCoaching?.expectedWord).toBe('niño');

    const { unmount: unmountEs } = render(
      <FreeRecallHintBar
        plan={esPlan}
        hintTier={2}
        ghostFaded={false}
        isAnimating={false}
        answerDir="ltr"
      />
    );
    expect(screen.getByTestId('free-recall-tone-coaching')).toHaveTextContent('niño');
    expect(screen.queryByTestId('free-recall-mismatch-note')).not.toBeInTheDocument();
    unmountEs();
  });

  it('[PT-105] (S2-004) triggers 4500ms hung speechSynthesis marimba cadence rescue, LessonArena toast, and stopSpeech() cleanup', async () => {
    vi.useFakeTimers();
    const { MockAudioContext, oscTypes, stopSpies } = createMockAudioContextWithTracking();
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: MockAudioContext,
    });

    const { cancelSpy } = installMockSpeechSynthesis({
      voices: [
        {
          name: 'Spanish Mock',
          lang: 'es-MX',
          localService: true,
          default: true,
          voiceURI: 'es-mx',
        } as SpeechSynthesisVoice,
      ],
      autoComplete: 'hang',
    });

    const listenEx = COURSES.es.units[0].nodes
      .flatMap((n) => n.exercises)
      .find((e): e is ListenDecodeExercise => e.type === 'listen_decode')!;
    const testNode: MapNode = {
      ...COURSES.es.units[0].nodes[0],
      id: 'pt105-watchdog-node',
      exercises: [listenEx],
    };

    const rescueBefore = getSpeechRuntimeState().watchdogRescueCount ?? 0;
    const { unmount } = render(
      <LessonArena node={testNode} language="es" onExit={vi.fn()} />
    );

    // Trigger spoken utterance that hangs forever
    let speechOutcome: Awaited<ReturnType<typeof speakPhrase>> | null = null;
    act(() => {
      void speakPhrase({
        text: '¡Buenos días!',
        language: 'es',
        phonetic: 'BWEH-nohs DEE-ahs',
      }).then((out) => {
        speechOutcome = out;
      });
    });

    expect(getSpeechRuntimeState().isSpeaking).toBe(true);
    expect(getSpeechRuntimeState().watchdogTriggered).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4600);
    });

    expect(speechOutcome).toEqual({
      usedNativeVoice: false,
      fallbackActive: true,
      localeUsed: 'es-MX',
      watchdogTriggered: true,
    });
    expect(cancelSpy).toHaveBeenCalled();
    expect(getSpeechRuntimeState().watchdogTriggered).toBe(true);
    expect(getSpeechRuntimeState().watchdogRescueCount).toBe(rescueBefore + 1);
    expect(getSpeechRuntimeState().isSpeaking).toBe(false);
    expect(screen.getByText('Marimba Phonetic Guide Active!')).toBeInTheDocument();
    expect(oscTypes.length).toBeGreaterThan(0);
    for (const wave of oscTypes) {
      expect(['sine', 'triangle']).toContain(wave);
    }

    // stopSpeech() stops active marimba phonetic cadence cleanly
    act(() => {
      stopSpeech();
    });
    expect(stopSpies.some((spy) => spy.mock.calls.length > 0)).toBe(true);

    // Subsequent speakPhrase resets watchdogTriggered while retaining monotonic watchdogRescueCount
    act(() => {
      void speakPhrase({ text: 'Hola', language: 'es', phonetic: 'OH-lah' });
    });
    expect(getSpeechRuntimeState().watchdogTriggered).toBe(false);
    expect(getSpeechRuntimeState().watchdogRescueCount).toBe(rescueBefore + 1);

    act(() => {
      stopSpeech();
      vi.clearAllTimers();
    });
    unmount();
  });

  it('[PT-106] (S2-005) hides Study Break on all 16 base tracks and performs 1-tap mid-lesson Adult panic exit cleanly', async () => {
    // 1. Absent across all 16 base tracks
    for (const lang of VISIBLE_BASE_LANGUAGES) {
      const node = COURSES[lang].units[0].nodes[0];
      const { unmount } = render(
        <LessonArena node={node} language={lang} onExit={vi.fn()} />
      );
      expect(
        screen.queryByTestId('lesson-study-break-btn'),
        `Study Break leaked onto base language ${lang}`
      ).not.toBeInTheDocument();
      unmount();
      cleanup();
    }

    // 2. Visible on Adult track & cleanly exits lesson in 1 tap (idempotent on rapid double-click)
    installMockSpeechSynthesis({
      voices: [
        {
          name: 'English US',
          lang: 'en-US',
          localService: true,
          default: true,
          voiceURI: 'en-US',
        } as SpeechSynthesisVoice,
      ],
      autoComplete: 'hang',
    });

    vaultActions.setActiveLanguage('fr');
    const adult = vaultActions.unlockAdultMode({
      adultProfileName: 'Parent',
      initialTrack: 'ebonics',
    });
    expect(adult.adultModeActive).toBe(true);

    const { unmount: unmountApp } = render(<App />);
    const startBtn = document.querySelector<HTMLButtonElement>('button[data-node-state="active"]')!;
    expect(startBtn).not.toBeNull();
    fireEvent.click(startBtn);

    const studyBreakBtn = await screen.findByTestId('lesson-study-break-btn');
    expect(studyBreakBtn).toHaveAttribute('aria-label', 'Study Break: Return to Kid Atlas');

    act(() => {
      void speakPhrase({ text: 'Bet', language: 'ebonics', phonetic: 'bet' });
    });
    expect(getSpeechRuntimeState().isSpeaking).toBe(true);

    // Double-click Study Break rapidly -> exits cleanly once
    fireEvent.click(studyBreakBtn);
    fireEvent.click(studyBreakBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('lesson-study-break-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('return-to-kid-atlas-btn')).not.toBeInTheDocument();
      expect(screen.getByText(LANGUAGE_META.fr.landTitle)).toBeInTheDocument();
    });

    expect(getSpeechRuntimeState().isSpeaking).toBe(false);
    const updatedAdult = loadVaultFromStorage().profiles.find((p) => p.id === adult.id)!;
    expect(updatedAdult.adultModeActive).toBe(false);
    expect(updatedAdult.activeLanguage).toBe('fr');
    unmountApp();
  });

  it('[PT-107] (S2-005 / S2-007) runs 2P Family Co-Op Arcade pass-and-play turn flow and settles dual-profile stats atomically', () => {
    // 1. Single-profile vault hides Co-Op toggle
    vaultActions.deleteProfile('kid-maya');
    expect(loadVaultFromStorage().profiles).toHaveLength(1);
    const { unmount: unmountSingle } = render(
      <ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />
    );
    expect(screen.queryByTestId('arcade-coop-toggle')).not.toBeInTheDocument();
    unmountSingle();
    cleanup();

    // 2. Multi-profile vault: toggle ON, auto-swap distinct P1/P2, Play Turn 1 -> Handoff -> Turn 2 -> Finale
    vaultActions.resetVaultToDefaults();
    const { unmount } = render(<ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);

    const coopToggle = screen.getByTestId('arcade-coop-toggle');
    expect(coopToggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(coopToggle);
    expect(coopToggle).toHaveAttribute('aria-pressed', 'true');

    const p1Select = screen.getByTestId('coop-p1-select') as HTMLSelectElement;
    const p2Select = screen.getByTestId('coop-p2-select') as HTMLSelectElement;
    expect(p1Select.value).not.toBe(p2Select.value);

    // Selecting P1 === P2 cleanly swaps the partner so P1 !== P2 always
    const initialP1 = p1Select.value;
    const initialP2 = p2Select.value;
    fireEvent.change(p2Select, { target: { value: initialP1 } });
    expect(p1Select.value).toBe(initialP2);
    expect(p2Select.value).toBe(initialP1);

    // Restore P1=Leo, P2=Maya
    fireEvent.change(p1Select, { target: { value: 'kid-leo' } });
    expect(p1Select.value).toBe('kid-leo');
    expect(p2Select.value).toBe('kid-maya');

    const leoBefore = loadVaultFromStorage().profiles.find((p) => p.id === 'kid-leo')!;
    const mayaBefore = loadVaultFromStorage().profiles.find((p) => p.id === 'kid-maya')!;

    // Launch Tower Stack in 2P Co-Op
    fireEvent.click(screen.getByRole('button', { name: 'Stack Gelato' }));
    expect(screen.getByTestId('arcade-coop-turn-pill')).toHaveTextContent('P1: Leo');
    fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Drop Scoop!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    // Turn 1 finished -> Handoff screen, solo stats NOT prematurely corrupted
    const handoff = screen.getByTestId('arcade-coop-handoff');
    expect(handoff).toHaveTextContent('Pass Console to Maya!');
    const midVault = loadVaultFromStorage();
    expect(midVault.profiles.find((p) => p.id === 'kid-leo')!.stats.coopMatchesPlayed ?? 0).toBe(0);
    expect(midVault.profiles.find((p) => p.id === 'kid-leo')!.gems).toBe(leoBefore.gems);

    // Start Turn 2 -> Complete -> Family Co-Op Finale!
    fireEvent.click(screen.getByRole('button', { name: /Start Maya's Turn!/i }));
    expect(screen.getByTestId('arcade-coop-turn-pill')).toHaveTextContent('P2: Maya');
    fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Drop Scoop!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    const summary = screen.getByTestId('arcade-coop-summary');
    expect(summary).toHaveTextContent('Family Co-Op Finale!');
    expect(summary).toHaveTextContent(/Combined Team Score:/i);

    const settledVault = loadVaultFromStorage();
    const leoAfter = settledVault.profiles.find((p) => p.id === 'kid-leo')!;
    const mayaAfter = settledVault.profiles.find((p) => p.id === 'kid-maya')!;
    expect(leoAfter.stats.coopMatchesPlayed).toBe((leoBefore.stats.coopMatchesPlayed ?? 0) + 1);
    expect(mayaAfter.stats.coopMatchesPlayed).toBe((mayaBefore.stats.coopMatchesPlayed ?? 0) + 1);
    expect(leoAfter.gems).toBeGreaterThan(leoBefore.gems);
    expect(mayaAfter.gems).toBeGreaterThan(mayaBefore.gems);
    expect(leoAfter.totalXp).toBeGreaterThan(leoBefore.totalXp);
    expect(mayaAfter.totalXp).toBeGreaterThan(mayaBefore.totalXp);
    unmount();
  });

  it('[PT-108] (S2-005) enforces 2P Co-Op Kid-Safety Quarantine across Kid+Adult pairings and unlocks Adult Co-Op only when both are unlocked and active', () => {
    vaultActions.setActiveLanguage('fr');
    const adultOne = vaultActions.unlockAdultMode({
      adultProfileName: 'Alex',
      initialTrack: 'ebonics',
    });
    // Keep default kid-leo cleanly on Spanish ('es')
    vaultActions.switchProfile('kid-leo');
    vaultActions.setActiveLanguage('es');
    const vReset = JSON.parse(window.localStorage.getItem('wanderling.vault.v1')!) as {
      activeProfileId: string;
      profiles: Array<{ id: string; adultModeUnlocked?: boolean; adultModeActive?: boolean; activeLanguage: string }>;
    };
    vReset.profiles.find((p) => p.id === adultOne.id)!.adultModeActive = true;
    vReset.profiles.find((p) => p.id === adultOne.id)!.activeLanguage = 'ebonics';
    importVaultJson(JSON.stringify(vReset), 'replace');
    vaultActions.switchProfile(adultOne.id);

    // Helper: assert 0 Adult UI/vocab bleed during Co-Op turn
    const assertQuarantinedTurn = (expectedSafeLangCode: BaseLanguageCode) => {
      expect(screen.queryByText(/AAVE/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('arcade-say-it-normally-btn')).not.toBeInTheDocument();
      const targetBar = document.querySelector(`[data-language="${expectedSafeLangCode}"]`);
      expect(targetBar, `Expected quarantined target prompt in ${expectedSafeLangCode}`).not.toBeNull();
    };

    // Order A: Adult P1 (ebonics) + Kid P2 (kid-leo) -> strictly quarantined!
    const { unmount: unmountOrderA } = render(<ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: adultOne.id } });
    fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: 'kid-leo' } });
    expect(screen.queryByText(/AAVE/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Build Star Bridge' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
    assertQuarantinedTurn('fr');
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Leo's Turn!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
    assertQuarantinedTurn('es');
    unmountOrderA();
    cleanup();

    // Order B: Custom kid P1 (!adultModeUnlocked) + Adult P2 (ebonics) -> strictly quarantined!
    const customKid = vaultActions.createProfile({
      name: 'Kiddo',
      avatarId: 'colette_baker',
      bannerColor: '#059669',
      activeLanguage: 'ja',
    });
    // Ensure Adult profile remains armed in vault while Kiddo is active in Kid Atlas
    const vRaw = JSON.parse(window.localStorage.getItem('wanderling.vault.v1')!) as {
      activeProfileId: string;
      profiles: Array<{ id: string; adultModeUnlocked?: boolean; adultModeActive?: boolean; activeLanguage: string }>;
    };
    const adultEntry = vRaw.profiles.find((p) => p.id === adultOne.id)!;
    adultEntry.adultModeUnlocked = true;
    adultEntry.adultModeActive = true;
    adultEntry.activeLanguage = 'ebonics';
    importVaultJson(JSON.stringify(vRaw), 'replace');
    vaultActions.switchProfile(customKid.id);
    // Restore adultOne adultModeActive=true in raw store to stress-test P1 Kid + P2 Adult active
    const v2 = JSON.parse(window.localStorage.getItem('wanderling.vault.v1')!) as typeof vRaw;
    v2.profiles.find((p) => p.id === adultOne.id)!.adultModeActive = true;
    v2.profiles.find((p) => p.id === adultOne.id)!.activeLanguage = 'ebonics';
    importVaultJson(JSON.stringify(v2), 'replace');

    const { unmount: unmountOrderB } = render(<ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: customKid.id } });
    fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: adultOne.id } });
    expect(screen.queryByText(/AAVE/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Build Star Bridge' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
    assertQuarantinedTurn('ja');
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Alex's Turn!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
    assertQuarantinedTurn('fr');
    unmountOrderB();
    cleanup();

    // Order C: BOTH P1 and P2 have adultModeUnlocked: true + adultModeActive: true -> Adult Co-Op allowed!
    const adultTwo = vaultActions.unlockAdultMode({
      adultProfileName: 'Jordan',
      initialTrack: 'suburban',
    });
    const v3 = JSON.parse(window.localStorage.getItem('wanderling.vault.v1')!) as typeof vRaw;
    const p1Stored = v3.profiles.find((p) => p.id === adultOne.id)!;
    const p2Stored = v3.profiles.find((p) => p.id === adultTwo.id)!;
    p1Stored.adultModeUnlocked = true;
    p1Stored.adultModeActive = true;
    p1Stored.activeLanguage = 'ebonics';
    p2Stored.adultModeUnlocked = true;
    p2Stored.adultModeActive = true;
    p2Stored.activeLanguage = 'suburban';
    importVaultJson(JSON.stringify(v3), 'replace');
    vaultActions.switchProfile(adultOne.id);

    const { unmount: unmountBothAdult } = render(<ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: adultOne.id } });
    fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: adultTwo.id } });
    expect(screen.getByText(LANGUAGE_META.ebonics.pairDirectionBadge!)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Build Star Bridge' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
    expect(screen.getByTestId('arcade-say-it-normally-btn')).toBeInTheDocument();
    unmountBothAdult();
  });

  it('[PT-109] (S2-006) VirtualScriptDrawer inserts script keys at cursor across zh, ja, ar, arz, hi, bn, ru, vi within bounded 100dvh layout', () => {
    setViewportSize(375, 667);
    const scriptSampleMap: ReadonlyArray<{ lang: BaseLanguageCode; sampleKey: string }> = [
      { lang: 'zh', sampleKey: 'nǐ' },
      { lang: 'ja', sampleKey: 'あ' },
      { lang: 'ar', sampleKey: 'أ' },
      { lang: 'arz', sampleKey: 'أ' },
      { lang: 'hi', sampleKey: 'अ' },
      { lang: 'bn', sampleKey: 'অ' },
      { lang: 'ru', sampleKey: 'а' },
      { lang: 'vi', sampleKey: 'ă' },
    ];

    for (const { lang, sampleKey } of scriptSampleMap) {
      const { exercise } = findRomanizedToForeignWordBank(lang);
      const { unmount } = render(
        <WordBankView
          exercise={exercise}
          language={lang}
          compact={false}
          locked={false}
          onTurtlePlay={vi.fn()}
          onDraftChange={vi.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
      const toggle = screen.getByTestId('virtual-script-drawer-toggle');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const drawer = screen.getByTestId('virtual-script-drawer');
      const scrollPane = drawer.querySelector('.console-scroll-pane') as HTMLElement | null;
      expect(scrollPane).not.toBeNull();
      const maxH = Number.parseInt(scrollPane!.style.maxHeight || '999', 10);
      expect(maxH).toBeLessThanOrEqual(118);

      // Position cursor inside existing text and verify mid-string insertion
      const input = screen.getByLabelText('Type your translation') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'ab' } });
      input.setSelectionRange(1, 1);
      fireEvent.click(within(drawer).getByRole('button', { name: sampleKey }));
      expect(input.value).toBe(`a${sampleKey}b`);
      unmount();
      cleanup();
    }

    // Also verify BossGauntletView Free-Recall embeds VirtualScriptDrawer cleanly
    const rawBossEx = COURSES.zh.units[0].nodes
      .flatMap((n) => n.exercises)
      .find((e): e is BossGauntletExercise => e.type === 'boss_gauntlet')!;
    const wordBankBossTurn =
      COURSES.zh.units
        .flatMap((u) => u.nodes)
        .flatMap((n) => n.exercises)
        .filter((e): e is BossGauntletExercise => e.type === 'boss_gauntlet')
        .flatMap((e) => e.turns)
        .find((t) => t.mode === 'word_bank') ?? rawBossEx.turns[0];
    const bossEx: BossGauntletExercise = {
      ...rawBossEx,
      turns: [{ ...wordBankBossTurn, mode: 'word_bank', allowFreeRecall: true }],
    };
    const { unmount: unmountBoss } = render(
      <BossGauntletView
        exercise={bossEx}
        language="zh"
        compact={true}
        onTurtlePlay={vi.fn()}
        onTurnResult={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
    const bossToggle = screen.getByTestId('virtual-script-drawer-toggle');
    fireEvent.click(bossToggle);
    const bossDrawer = screen.getByTestId('virtual-script-drawer');
    const tablist = within(bossDrawer).getByRole('tablist', { name: 'Script tabs' });
    fireEvent.click(within(tablist).getByRole('tab', { name: 'Starter Hanzi' }));
    const bossInput = screen.getByLabelText('Type your boss reply') as HTMLInputElement;
    fireEvent.click(within(bossDrawer).getByRole('button', { name: '你' }));
    expect(bossInput.value).toContain('你');
    unmountBoss();
  });

  it('[PT-110] (S2-006) resolves all 21 Romance elision prefixes and Arabic proclitics with 0 blank TapHintToken glosses', () => {
    const mockGlossary = {
      ami: { translation: 'friend', phonetic: 'ah-MEE' },
      acqua: { translation: 'water', phonetic: 'AHK-wah' },
      كتاب: { translation: 'book', phonetic: 'ki-TAAB', romanized: 'kitāb' },
      يد: { translation: 'hand', phonetic: 'yad', romanized: 'yad' },
    };

    const elisionPrefixes21 = [
      "jusqu'", "lorsqu'", "puisqu'", "quest'", "quell'",
      "dell'", "dall'", "nell'", "sull'", "coll'", "all'",
      "qu'", "un'", "l'", "d'", "j'", "s'", "c'", "n'", "m'", "t'",
    ];
    expect(elisionPrefixes21).toHaveLength(21);
    for (const prefix of elisionPrefixes21) {
      const resAscii = lookupGlossaryEntry(`${prefix}ami`, mockGlossary);
      expect(resAscii, `Missing ASCII elision fallback for ${prefix}`).toBeDefined();
      expect(resAscii!.translation).toContain('friend');
      expect(resAscii!.grammarNote).toBeTruthy();

      const curly = prefix.replace("'", '’');
      const resCurly = lookupGlossaryEntry(`${curly}acqua`, mockGlossary);
      expect(resCurly, `Missing curly elision fallback for ${curly}`).toBeDefined();
    }

    const arabicProclitics = ['وال', 'بال', 'فال', 'كال', 'لال', 'لل', 'و', 'ف', 'ب', 'ل', 'ك'];
    for (const proc of arabicProclitics) {
      const hit = lookupGlossaryEntry(`${proc}كتاب`, mockGlossary);
      expect(hit, `Missing Arabic proclitic fallback for ${proc}`).toBeDefined();
      expect(hit!.translation).toContain('book');
      // < 3 Arabic letters stem guard ("يد" = 2 Arabic letters must NOT strip!)
      const shortGuard = lookupGlossaryEntry(`${proc}يد`, mockGlossary);
      expect(shortGuard, `Expected <3 Arabic letter guard to block ${proc}يد`).toBeUndefined();
    }

    // Real corpus scan across fr, it, ar, arz: 0 blank TapHintToken glosses
    for (const lang of ['fr', 'it', 'ar', 'arz'] as const) {
      for (const unit of COURSES[lang].units) {
        for (const node of unit.nodes) {
          for (const ex of node.exercises) {
            if (ex.type === 'discovery_card') {
              const card = COURSES[lang].vocabById[ex.vocabId];
              if (card) {
                const tokens = buildTapHintsFromExample(
                  card.exampleForeign,
                  card.exampleEnglish,
                  card.phonetic,
                  card
                );
                for (const tok of tokens) {
                  expect(tok.translation.trim(), `${lang}:${ex.id}:${tok.surface}`).not.toBe('');
                  expect(tok.phonetic.trim(), `${lang}:${ex.id}:${tok.surface}`).not.toBe('');
                }
              }
            } else if (ex.type === 'word_bank' && ex.direction === 'to_english') {
              for (const tok of ex.promptTokens) {
                expect(tok.translation.trim(), `${lang}:${ex.id}:${tok.surface}`).not.toBe('');
                expect(tok.phonetic.trim(), `${lang}:${ex.id}:${tok.surface}`).not.toBe('');
              }
            } else if (ex.type === 'mini_story') {
              for (const bubble of ex.bubbles) {
                for (const tok of bubble.tapHints) {
                  expect(tok.translation.trim(), `${lang}:${ex.id}:${tok.surface}`).not.toBe('');
                  expect(tok.phonetic.trim(), `${lang}:${ex.id}:${tok.surface}`).not.toBe('');
                }
              }
            } else if (ex.type === 'context_cloze' || ex.type === 'listen_decode') {
              for (const tok of ex.tapHints) {
                expect(tok.translation.trim(), `${lang}:${ex.id}:${tok.surface}`).not.toBe('');
              }
            }
          }
        }
      }
    }
  });

  it('[PT-111] (S2-007) validates scoreSrsCandidates, computeUpdatedVocabMastery, and lossless vault v1 export/replace/merge import', () => {
    const mastery: Record<string, VocabMasteryEntry> = {
      strongFresh: { strength: 5, lastReviewedISO: '2026-11-23', reviewCount: 4 },
      weakRecent: { strength: 1, lastReviewedISO: '2026-11-22', reviewCount: 1 },
      mediumStale: { strength: 3, lastReviewedISO: '2026-11-10', reviewCount: 2 },
    };
    const scored = scoreSrsCandidates(
      ['strongFresh', 'weakRecent', 'unreviewedCard', 'mediumStale', 'weakRecent'],
      mastery,
      '2026-11-23'
    );
    expect(scored.map((s) => s.vocabId)).toEqual([
      'unreviewedCard',
      'mediumStale',
      'weakRecent',
      'strongFresh',
    ]);
    expect(scored[0].priorityScore).toBe(60);
    expect(scored[1].priorityScore).toBe(46);
    expect(scored[1].daysSinceReview).toBe(13);
    expect(scored[2].priorityScore).toBe(42);

    const perfectUpdate = computeUpdatedVocabMastery(
      mastery,
      ['unreviewedCard', 'strongFresh'],
      0,
      '2026-11-23'
    );
    expect(perfectUpdate.unreviewedCard).toEqual({
      strength: 2,
      lastReviewedISO: '2026-11-23',
      reviewCount: 1,
    });
    expect(perfectUpdate.strongFresh.strength).toBe(5);
    expect(perfectUpdate.strongFresh.reviewCount).toBe(5);

    const flawedUpdate = computeUpdatedVocabMastery(mastery, ['weakRecent'], 2, '2026-11-23');
    expect(flawedUpdate.weakRecent.strength).toBe(2);
    expect(flawedUpdate.weakRecent.reviewCount).toBe(2);

    // Vault hydration, export, replace & merge import losslessness
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-srs-quest-daily',
      stars: 3,
      xpEarned: 35,
      gemsEarned: 12,
      unlockedVocabIds: ['es-u1-c1', 'es-u1-c2', 'es-u1-c3', 'es-u1-c4'],
      practicedVocabIds: ['es-u1-c1', 'es-u1-c2'],
      mistakesCount: 0,
      maxCombo: 4,
      isSrsQuest: true,
    });
    vaultActions.recordCoopArcadeSession({
      gameId: 'sky_catcher',
      playerOneId: 'kid-leo',
      playerOneScore: 140,
      playerTwoId: 'kid-maya',
      playerTwoScore: 95,
      bonusGems: 4,
      xpEarned: 25,
    });

    const exportedJson = exportVaultJson();
    const parsedExport = JSON.parse(exportedJson) as {
      profiles: Array<{
        id: string;
        stats: { srsQuestsCompleted?: number; coopMatchesPlayed?: number };
        languageProgress: Record<
          string,
          { vocabMastery?: Record<string, VocabMasteryEntry>; lastSrsQuestCompletedISO?: string }
        >;
      }>;
    };
    const leoExported = parsedExport.profiles.find((p) => p.id === 'kid-leo')!;
    expect(leoExported.stats.srsQuestsCompleted).toBe(1);
    expect(leoExported.stats.coopMatchesPlayed).toBe(1);
    expect(leoExported.languageProgress.es.vocabMastery?.['es-u1-c1'].strength).toBe(2);
    expect(leoExported.languageProgress.es.lastSrsQuestCompletedISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Merge against older save keeps higher strength, newer ISO, and max stats
    const olderIncoming = JSON.parse(exportedJson) as typeof parsedExport;
    olderIncoming.profiles[0].stats.srsQuestsCompleted = 4;
    olderIncoming.profiles[0].stats.coopMatchesPlayed = 0;
    olderIncoming.profiles[0].languageProgress.es.vocabMastery = {
      'es-u1-c1': { strength: 1, lastReviewedISO: '2026-10-01', reviewCount: 1 },
      'es-u1-c2': { strength: 5, lastReviewedISO: '2099-01-01', reviewCount: 9 },
    };
    olderIncoming.profiles[0].languageProgress.es.lastSrsQuestCompletedISO = '2026-10-01';

    vaultActions.resetVaultToDefaults();
    expect(importVaultJson(exportedJson, 'replace').ok).toBe(true);
    expect(importVaultJson(JSON.stringify(olderIncoming), 'merge').ok).toBe(true);
    const mergedLeo = loadVaultFromStorage().profiles.find((p) => p.id === 'kid-leo')!;
    expect(mergedLeo.stats.srsQuestsCompleted).toBe(4);
    expect(mergedLeo.stats.coopMatchesPlayed).toBe(1);
    expect(mergedLeo.languageProgress.es?.vocabMastery?.['es-u1-c1'].strength).toBe(2);
    expect(mergedLeo.languageProgress.es?.vocabMastery?.['es-u1-c2'].strength).toBe(5);
    expect(mergedLeo.languageProgress.es?.vocabMastery?.['es-u1-c2'].lastReviewedISO).toBe('2099-01-01');

    // Corrupt field validation guard
    const corrupt = JSON.parse(exportedJson) as Record<string, unknown>;
    ((corrupt.profiles as Array<Record<string, unknown>>)[0].languageProgress as Record<string, Record<string, unknown>>).es.vocabMastery = {
      'es-u1-c1': { strength: -3, lastReviewedISO: '', reviewCount: 1 },
    };
    expect(importVaultJson(JSON.stringify(corrupt), 'replace').ok).toBe(false);
  });

  it('[PT-112] (S2-007) AdventureMap Starlight Memory Quest CTA hides <4 stickers, launches & settles SRS Quest without inflating lessonsCompleted', async () => {
    const esVocab = COURSES.es.units[0].vocabCards.map((c) => c.id);
    expect(buildSrsReviewQuestNode('es', esVocab.slice(0, 3))).toBeNull();

    // 1. < 4 unlocked stickers -> CTA hidden
    const baseState = loadVaultFromStorage().profiles[0];
    const threeCardProgress = {
      ...baseState.languageProgress.es!,
      unlockedVocabIds: esVocab.slice(0, 3),
    };
    const { unmount: unmountHidden } = render(
      <AdventureMap
        course={COURSES.es}
        progress={threeCardProgress}
        equippedCosmetics={baseState.equippedCosmetics}
        onSelectNode={vi.fn()}
        onStartSrsQuest={vi.fn()}
      />
    );
    expect(screen.queryByTestId('map-srs-quest-btn')).not.toBeInTheDocument();
    unmountHidden();
    cleanup();

    // 2. >= 4 unlocked stickers inside App -> launches buildSrsReviewQuestNode & settles cleanly
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-u1-n-seed-chest',
      stars: 3,
      xpEarned: 15,
      gemsEarned: 10,
      unlockedVocabIds: esVocab.slice(0, 6),
      maxCombo: 0,
      isChest: true,
    });
    const beforeStats = loadVaultFromStorage().profiles[0].stats;
    expect(beforeStats.lessonsCompleted).toBe(0);
    expect(beforeStats.srsQuestsCompleted ?? 0).toBe(0);

    const questNode = buildSrsReviewQuestNode(
      'es',
      loadVaultFromStorage().profiles[0].languageProgress.es!.unlockedVocabIds,
      loadVaultFromStorage().profiles[0].languageProgress.es!.vocabMastery
    )!;
    expect(questNode).not.toBeNull();
    expect(questNode.isSrsReviewQuest).toBe(true);
    expect(questNode.exercises).toHaveLength(5);

    const { unmount } = render(<App />);
    const questBtn = screen.getByTestId('map-srs-quest-btn');
    const badge = screen.getByTestId('map-srs-quest-badge');
    expect(badge).toHaveTextContent(/stickers? due/i);

    fireEvent.click(questBtn);
    await waitFor(() => {
      expect(screen.getByText('Memory Quest')).toBeInTheDocument();
    });

    for (const ex of questNode.exercises) {
      playExerciseInDom(ex, { language: 'es' });
    }
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Starlight Memory Quest Complete!/i })
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Return to Atlas Map' }));

    await waitFor(() => {
      expect(screen.getByTestId('map-srs-quest-badge')).toHaveTextContent('Refreshed Today · Replay');
    });

    const settledLeo = loadVaultFromStorage().profiles[0];
    expect(settledLeo.stats.srsQuestsCompleted).toBe(1);
    expect(settledLeo.stats.lessonsCompleted).toBe(0);
    expect(settledLeo.languageProgress.es?.lastSrsQuestCompletedISO).toBe(
      new Date().toISOString().slice(0, 10)
    );
    expect(Object.keys(settledLeo.languageProgress.es?.vocabMastery ?? {}).length).toBeGreaterThanOrEqual(4);
    unmount();
  });

  it('[PT-113] verifies WCAG AA >= 4.5:1 contrast across all 15 palettes and clean 100dvh Sprint 2 UI across 3 viewports', () => {
    const css = readFileSync(resolve(ROOT_DIR, 'src/styles/theme.css'), 'utf8');

    // Explicit Starlight Memory Quest colors (AdventureMap.tsx)
    for (const btnBg of ['#312E81', '#4338CA', '#4F46E5']) {
      expect(contrastRatioHex('#FFFFFF', btnBg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatioHex('#EEF2FF', '#4F46E5')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatioHex('#064E3B', '#D1FAE5')).toBeGreaterThanOrEqual(4.5); // Refreshed Today
    expect(contrastRatioHex('#1E1B4B', '#FEF3C7')).toBeGreaterThanOrEqual(4.5); // Due badge
    expect(contrastRatioHex('#1E1B4B', '#E0E7FF')).toBeGreaterThanOrEqual(4.5); // All Fresh badge

    // Verify all 15 themes' semantic tokens (--tint-indigo, --tint-emerald, --tint-amber, --text-main)
    const themeSelectors = [
      ':root',
      ".app-root[data-theme='theme_cosmic_galaxy']",
      ".app-root[data-theme='theme_aurora_borealis']",
      ".app-root[data-theme='theme_starlight_indigo']",
      ".app-root[data-theme='theme_royal_velvet']",
      ".app-root[data-theme='theme_sunset_plaza']",
      ".app-root[data-theme='theme_candy_sakura']",
      ".app-root[data-theme='theme_ocean_lagoon']",
      ".app-root[data-theme='theme_alpine_meadow']",
      ".app-root[data-theme='theme_kyoto_matcha']",
      ".app-root[data-theme='theme_sahara_mirage']",
      ".app-root[data-theme='theme_emerald_rainforest']",
      ".app-root[data-theme='theme_neon_night_market']",
      ".app-root[data-theme='theme_nordic_fjord']",
      ".app-root[data-theme='theme_laureate_imperial']",
    ];
    expect(themeSelectors).toHaveLength(15);

    const extractBlock = (selector: string): string => {
      const idx = css.indexOf(selector);
      expect(idx, `Missing CSS block ${selector}`).toBeGreaterThanOrEqual(0);
      const braceStart = css.indexOf('{', idx);
      const braceEnd = css.indexOf('}', braceStart);
      return css.slice(braceStart, braceEnd + 1);
    };
    const readVar = (block: string, fallback: string, varName: string): string => {
      const m = new RegExp(`${varName}\\s*:\\s*([^;]+);`).exec(block);
      if (m) return m[1].trim();
      const mf = new RegExp(`${varName}\\s*:\\s*([^;]+);`).exec(fallback);
      return mf ? mf[1].trim() : '';
    };

    const rootBlock = extractBlock(':root');
    for (const sel of themeSelectors) {
      const block = extractBlock(sel);
      const modalBgRaw = readVar(block, rootBlock, '--modal-bg');
      const modalRgb = parseRgbOrHex(modalBgRaw) ?? [255, 255, 255];
      const textMain = parseRgbOrHex(readVar(block, rootBlock, '--text-main'));
      const cardSoft = compositeOver(readVar(block, rootBlock, '--card-soft-bg'), modalRgb);
      expect(textMain, `${sel} --text-main`).not.toBeNull();
      expect(contrastRatioRgb(textMain!, cardSoft), `${sel} text-main on card-soft-bg`).toBeGreaterThanOrEqual(4.5);

      for (const tint of ['indigo', 'emerald', 'amber'] as const) {
        const bg = compositeOver(readVar(block, rootBlock, `--tint-${tint}-bg`), cardSoft);
        const ink = parseRgbOrHex(readVar(block, rootBlock, `--tint-${tint}-ink`));
        expect(ink, `${sel} --tint-${tint}-ink`).not.toBeNull();
        expect(
          contrastRatioRgb(ink!, bg),
          `${sel} --tint-${tint}-ink on --tint-${tint}-bg`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }

    // Render Sprint 2 UI cleanly across 3 viewports & dark/light themes
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const [themeId, vp] of [
      ['default', { w: 1440, h: 900 }],
      ['theme_cosmic_galaxy', { w: 768, h: 1024 }],
      ['theme_neon_night_market', { w: 375, h: 667 }],
    ] as const) {
      setViewportSize(vp.w, vp.h);
      vaultActions.completeMapNode({
        language: 'es',
        nodeId: 'es-pt113-seed',
        stars: 3,
        xpEarned: 10,
        gemsEarned: 1000,
        unlockedVocabIds: COURSES.es.units[0].vocabCards.slice(0, 5).map((c) => c.id),
        maxCombo: 0,
        isChest: true,
      });
      if (themeId !== 'default') {
        vaultActions.buyAndEquipCosmetic(themeId);
      }
      const { unmount } = render(<App />);
      expect(screen.getByTestId('map-srs-quest-btn')).toBeInTheDocument();
      expect(screen.getByTestId('map-srs-quest-badge')).toBeInTheDocument();
      unmount();
      cleanup();

      const { unmount: unmountDrawer } = render(
        <div className="app-root" data-theme={themeId} style={{ height: `${vp.h}px` }}>
          <VirtualScriptDrawer language="zh" compact={vp.w < 680} onInsertChar={vi.fn()} />
        </div>
      );
      fireEvent.click(screen.getByTestId('virtual-script-drawer-toggle'));
      expect(screen.getByTestId('virtual-script-drawer')).toBeInTheDocument();
      unmountDrawer();
      cleanup();
    }
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('[PT-114] survives chaos rapid switching across lazy languages, Adult Study Break, Co-Op aborts, and SRS Quest exits with 0 leaks or errors', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);

    try {
      const esVocab = COURSES.es.units[0].vocabCards.slice(0, 5).map((c) => c.id);
      vaultActions.completeMapNode({
        language: 'es',
        nodeId: 'es-pt114-seed',
        stars: 3,
        xpEarned: 10,
        gemsEarned: 50,
        unlockedVocabIds: esVocab,
        maxCombo: 0,
        isChest: true,
      });

      const { unmount } = render(<App />);

      // Rapid language switches
      for (const lang of ['ja', 'ar', 'zh', 'vi', 'es'] as const) {
        act(() => {
          vaultActions.setActiveLanguage(lang);
        });
      }
      expect(screen.getByText(LANGUAGE_META.es.landTitle)).toBeInTheDocument();

      // Launch SRS Quest and abort before completion -> no completion leak
      fireEvent.click(screen.getByTestId('map-srs-quest-btn'));
      await waitFor(() => expect(screen.getByText('Memory Quest')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Exit lesson' }));
      expect(loadVaultFromStorage().profiles[0].stats.srsQuestsCompleted ?? 0).toBe(0);

      // Unlock Adult Mode, enter Adult lesson, mash Study Break twice
      act(() => {
        vaultActions.unlockAdultMode({ adultProfileName: 'Chaos Parent', initialTrack: 'corp_trades' });
      });
      await waitFor(() =>
        expect(document.querySelector('button[data-node-state="active"]')).not.toBeNull()
      );
      fireEvent.click(document.querySelector('button[data-node-state="active"]')!);
      const sbBtn = await screen.findByTestId('lesson-study-break-btn');
      fireEvent.click(sbBtn);
      fireEvent.click(sbBtn);
      await waitFor(() => expect(screen.queryByTestId('lesson-study-break-btn')).not.toBeInTheDocument());
      expect(loadVaultFromStorage().profiles.find((p) => p.name === 'Chaos Parent')?.adultModeActive).toBe(false);

      // Switch to Arcade, toggle 2P Co-Op, play Turn 1, abort at Handoff -> coopMatchesPlayed must remain 0
      fireEvent.click(screen.getByRole('button', { name: 'Arcade' }));
      fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
      fireEvent.click(screen.getByRole('button', { name: 'Stack Gelato' }));
      fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
      expect(screen.getByTestId('arcade-coop-handoff')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));
      expect(screen.queryByTestId('arcade-coop-handoff')).not.toBeInTheDocument();
      expect(loadVaultFromStorage().profiles.every((p) => (p.stats.coopMatchesPlayed ?? 0) === 0)).toBe(true);

      // Switch language back & unmount cleanly
      act(() => {
        vaultActions.setActiveLanguage('es');
      });
      unmount();

      expect(getSpeechRuntimeState().isSpeaking).toBe(false);
      expect(unhandled).toHaveLength(0);
      expect(errSpy).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('[PT-115] verifies bundle chunk budget <= 500 KiB, zero root-relative/external URLs, and zero Unicode flag emojis across repo', () => {
    ensureBuiltDist();

    const indexHtml = readFileSync(resolve(DIST_DIR, 'index.html'), 'utf8');
    expect(indexHtml).not.toMatch(/["']\/(?:assets|icons|manifest\.json|sw\.js)/i);
    expect(indexHtml).not.toMatch(/<(?:script|link|img)\b[^>]*\b(?:src|href)\s*=\s*["']https?:\/\//i);
    expect(indexHtml).not.toMatch(/rel=["'][^"']*modulepreload[^"']*["'][^>]*href=["'][^"']*(?:adult-mashup-|course-(?!es-))/i);

    const assetsDir = resolve(DIST_DIR, 'assets');
    const oversizedChunks: string[] = [];
    for (const file of readdirSync(assetsDir)) {
      if (!/\.(js|mjs)$/i.test(file)) continue;
      const size = statSync(join(assetsDir, file)).size;
      if (size > MAX_JS_CHUNK_BYTES) {
        oversizedChunks.push(`${file} (${(size / 1024).toFixed(1)} KiB)`);
      }
    }
    expect(oversizedChunks, `Oversized JS chunks > 500 KiB: ${oversizedChunks.join(', ')}`).toEqual([]);

    const manifest = JSON.parse(readFileSync(resolve(DIST_DIR, 'sw-precache-manifest.json'), 'utf8')) as {
      cacheVersion: string;
      assets: string[];
    };
    expect(manifest.cacheVersion).toBe('wanderling-cache-v8');
    for (const asset of manifest.assets) {
      expect(asset.startsWith('./')).toBe(true);
      expect(asset).not.toMatch(/^https?:\/\//i);
    }

    // Zero Unicode regional indicator flag emojis across src/, public/, tests/, README.md
    const filesToScan = [
      ...walkFilesRecursive(resolve(ROOT_DIR, 'src')),
      ...walkFilesRecursive(resolve(ROOT_DIR, 'public')),
      ...walkFilesRecursive(resolve(ROOT_DIR, 'tests')),
      resolve(ROOT_DIR, 'README.md'),
    ];
    const flagHits: string[] = [];
    for (const filePath of filesToScan) {
      if (!existsSync(filePath)) continue;
      const content = readFileSync(filePath, 'utf8');
      if (UNICODE_FLAG_RE.test(content)) {
        flagHits.push(relative(ROOT_DIR, filePath));
      }
    }
    expect(flagHits, `Unicode flag emojis found in: ${flagHits.join(', ')}`).toEqual([]);
  });
});
