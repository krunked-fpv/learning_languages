import '@testing-library/jest-dom/vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { FlagIcon } from '../src/art/FlagIcon';
import { VOCAB_ILLUSTRATIONS, VocabIllustration } from '../src/art/VocabIllustration';
import * as audioModule from '../src/audio';
import { stopSpeech } from '../src/audio';
import { ArcadeHub } from '../src/components/arcade/ArcadeHub';
import { CafeOrderRushArcade } from '../src/components/arcade/CafeOrderRushArcade';
import { ConstellationMemoryArcade } from '../src/components/arcade/ConstellationMemoryArcade';
import { StarlightBridgeArcade } from '../src/components/arcade/StarlightBridgeArcade';
import { FALLBACK_ARCADE_LEXICON, resolveArcadePlainEnglish } from '../src/components/arcade/arcadeShared';
import { BossGauntletView } from '../src/components/lesson/BossGauntletView';
import { ContextClozeView } from '../src/components/lesson/ContextClozeView';
import { DiscoveryCardView } from '../src/components/lesson/DiscoveryCardView';
import { LessonArena } from '../src/components/lesson/LessonArena';
import { ListenDecodeView } from '../src/components/lesson/ListenDecodeView';
import { MiniStoryView } from '../src/components/lesson/MiniStoryView';
import { PairMatchRushView } from '../src/components/lesson/PairMatchRushView';
import { WordBankView } from '../src/components/lesson/WordBankView';
import {
  buildTapHintsFromExample,
  joinWordBankTokens,
  splitTapHintsAroundBlank,
} from '../src/components/lesson/lessonHelpers';
import { AdventureMap } from '../src/components/map/AdventureMap';
import { RegionalScenery } from '../src/components/map/RegionalScenery';
import { PhrasebookVault } from '../src/components/meta/PhrasebookVault';
import { ProfileVaultModal } from '../src/components/shell/ProfileVaultModal';
import { TopHud } from '../src/components/shell/TopHud';
import { decodeToNormalEnglish, gradeAnswer } from '../src/core';
import {
  COURSES,
  buildTierCheckpointNode,
  ensureAdultCourseLoaded,
  ensureAllAdultCoursesLoaded,
  getAdultCourse,
  getAdultRegistryVersion,
  getArcadeLexicon,
  getCourse,
  getNodeById,
  getPlayableNodeExercises,
  getUnitById,
  isAdultTrackLoaded,
  subscribeAdultRegistry,
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
  ADULT_EASTER_EGG_LANGUAGES,
  ADULT_MASHUP_LANGUAGES,
  ALL_LANGUAGE_LIST,
  CLASSIC_ADULT_LANGUAGES,
  ILLUSTRATION_KEYS,
  LANGUAGE_LIST,
  LANGUAGE_META,
  PROFICIENCY_TIERS,
  isAdultLanguage,
  isAdultMashupLanguage,
  isDefaultKidProfileId,
  resolveUnitProficiencyTier,
  type AdultLanguageCode,
  type BossGauntletExercise,
  type ContextClozeExercise,
  type DiscoveryCardExercise,
  type ListenDecodeExercise,
  type MapNode,
  type MiniStoryExercise,
  type PairMatchRushExercise,
  type SaveVault,
  type TapHintToken,
  type WordBankExercise,
} from '../src/types/contracts';

const ROOT_DIR = resolve(__dirname, '..');
const UNICODE_FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]/u;
const BANNED_ALCOHOL_RE =
  /\b(wine|beer|vino|cerveza|bier|vin|birra|alcohol|champagne|cocktail|vodka|whiskey|tequila|pub|tavern)\b/i;
const CLEAN_COMPARE_RE =
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
  return raw.toLowerCase().replace(CLEAN_COMPARE_RE, '');
}

function assertValidTapHints(tokens: readonly TapHintToken[], context: string): void {
  expect(tokens.length, `${context}: tapHints must be non-empty`).toBeGreaterThan(0);
  for (const token of tokens) {
    expect(token.surface.trim(), `${context}: empty surface`).not.toBe('');
    expect(token.normalizedId.trim(), `${context}: empty normalizedId`).not.toBe('');
    expect(token.translation.trim(), `${context}: empty translation for "${token.surface}"`).not.toBe('');
    expect(token.phonetic.trim(), `${context}: empty phonetic for "${token.surface}"`).not.toBe('');
    expect(token.speakText.trim(), `${context}: empty speakText for "${token.surface}"`).not.toBe('');
  }
}

function unlockAndSelectAdultTrack(track: AdultLanguageCode, name = 'Atlas Explorer') {
  const profile = vaultActions.unlockAdultMode({
    adultProfileName: name,
    initialTrack: track,
  });
  vaultActions.setActiveLanguage(track);
  return profile;
}

describe('After-Hours Atlas Vol. 2: Great American Culture Clash & Say It Normally in English', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    stopSpeech();
  });

  afterEach(() => {
    vi.useRealTimers();
    stopSpeech();
    cleanup();
    vi.restoreAllMocks();
  });

  it('1) preserves base-game non-regression, Vol. 1 classics, zero flags/URLs, and lazy mashup registry contracts', async () => {
    expect(LANGUAGE_LIST).toHaveLength(16);
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
    expect(Object.keys(VOCAB_ILLUSTRATIONS)).toHaveLength(112);

    let totalUnits = 0;
    let totalNodes = 0;
    for (const baseLang of LANGUAGE_LIST) {
      const course = COURSES[baseLang];
      expect(course.units).toHaveLength(16);
      totalUnits += course.units.length;
      const nodes = course.units.flatMap((u) => u.nodes);
      expect(nodes).toHaveLength(112);
      totalNodes += nodes.length;
      for (const card of Object.values(course.vocabById)) {
        const text = `${card.foreignWithArticle} ${card.bareForeign} ${card.english} ${card.exampleForeign} ${card.exampleEnglish}`;
        expect(BANNED_ALCOHOL_RE.test(text), `Base card ${card.id} leaked alcohol term`).toBe(false);
      }
    }
    expect(totalUnits).toBe(256);
    expect(totalNodes).toBe(1792);

    // Vol. 1 classics remain synchronously bundled & intact
    expect(getAdultCourse('ebonics').units).toHaveLength(16);
    expect(getAdultCourse('suburban').units).toHaveLength(16);

    // Lazy registry APIs load all 5 mashups cleanly and expose version subscriptions
    const listener = vi.fn();
    const unsub = subscribeAdultRegistry(listener);
    const versionBefore = getAdultRegistryVersion();
    expect(versionBefore).toBeGreaterThanOrEqual(0);
    await ensureAllAdultCoursesLoaded();
    for (const mashup of ADULT_MASHUP_LANGUAGES) {
      expect(isAdultTrackLoaded(mashup)).toBe(true);
      const loaded = await ensureAdultCourseLoaded(mashup);
      expect(loaded.units).toHaveLength(16);
    }
    unsub();

    // Zero Unicode flag emojis across src/, public/, scripts/, tests/, index.html, README.md
    const filesToScan = [
      ...walkFiles(resolve(ROOT_DIR, 'src'), /\.(ts|tsx|css|js|json|svg)$/i),
      ...walkFiles(resolve(ROOT_DIR, 'public'), /\.(js|json|html|svg|txt)$/i),
      ...walkFiles(resolve(ROOT_DIR, 'scripts'), /\.(js|mjs|ts)$/i),
      ...walkFiles(resolve(ROOT_DIR, 'tests'), /\.(ts|tsx|js|json)$/i),
      resolve(ROOT_DIR, 'index.html'),
      resolve(ROOT_DIR, 'README.md'),
    ];
    for (const filePath of filesToScan) {
      const content = readFileSync(filePath, 'utf8');
      expect(UNICODE_FLAG_RE.test(content), `Unicode flag emoji found in ${filePath}`).toBe(false);
    }

    // Zero external https:// or http:// URLs in adultMode/
    const adultFiles = walkFiles(resolve(ROOT_DIR, 'src/curriculum/adultMode'), /\.(ts|tsx)$/i);
    expect(adultFiles.length).toBeGreaterThan(10);
    for (const filePath of adultFiles) {
      const content = readFileSync(filePath, 'utf8');
      expect(content, `External URL leaked into ${filePath}`).not.toMatch(/https?:\/\//i);
    }
  });

  it('2) enforces strict Kid Mode quarantine on Leo & Maya and zero Adult/Say-It-Normally leakage on all 16 base languages', () => {
    for (const kidId of ['kid-leo', 'kid-maya'] as const) {
      vaultActions.switchProfile(kidId);
      for (const mashup of ADULT_MASHUP_LANGUAGES) {
        vaultActions.setActiveLanguage(mashup);
        vaultActions.setAdultModeActive(true);
        const snap = loadVaultFromStorage().profiles.find((p) => p.id === kidId)!;
        expect(isDefaultKidProfileId(snap.id)).toBe(true);
        expect(snap.adultModeUnlocked).toBe(false);
        expect(snap.adultModeActive).toBe(false);
        expect(isAdultLanguage(snap.activeLanguage)).toBe(false);
        expect(snap.languageProgress[mashup]).toBeUndefined();
      }
    }

    vaultActions.switchProfile('kid-leo');

    // TopHud Switch Language dialog has exact 16 base buttons and zero After-Hours/mashup entries
    const hud = render(
      <TopHud
        onOpenProfileModal={vi.fn()}
        onOpenArcade={vi.fn()}
        canInstallApp={false}
        onInstallApp={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Active language:/i }));
    const langDialog = screen.getByRole('dialog', { name: 'Switch Language' });
    expect(within(langDialog).getAllByRole('button')).toHaveLength(16);
    expect(within(langDialog).queryByText(/After-Hours/i)).not.toBeInTheDocument();
    for (const adultCode of ADULT_EASTER_EGG_LANGUAGES) {
      expect(langDialog.querySelector(`svg[data-flag="${adultCode}"]`)).not.toBeInTheDocument();
    }
    hud.unmount();

    // PhrasebookVault hides Adult tracks and Say It Normally in English button
    const pb = render(<PhrasebookVault />);
    const pbFilter = screen.getByRole('group', { name: 'Filter phrasebook by language' });
    expect(within(pbFilter).getAllByRole('button')).toHaveLength(16);
    expect(screen.queryByTestId('say-it-normally-btn')).not.toBeInTheDocument();
    pb.unmount();

    // ProfileVaultModal creator picker strictly shows 16 base languages
    const pm = render(<ProfileVaultModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ New Kid Explorer/i }));
    const creatorLangs = screen.getByRole('group', { name: 'Pick Starting Language' });
    expect(within(creatorLangs).getAllByRole('button')).toHaveLength(16);
    pm.unmount();

    // ArcadeHub hides Adult tracks and arcade-say-it-normally-btn
    const arc = render(<ArcadeHub onExitToMap={vi.fn()} />);
    expect(screen.queryByTestId('arcade-say-it-normally-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arcade-direction-badge')).not.toBeInTheDocument();
    for (const adultCode of ADULT_EASTER_EGG_LANGUAGES) {
      expect(document.querySelector(`svg[data-flag="${adultCode}"]`)).not.toBeInTheDocument();
    }
    arc.unmount();

    // Zero Say It Normally leakage across ALL 16 base languages in lesson views + CafeOrderRush/StarlightBridge
    for (const baseLang of LANGUAGE_LIST) {
      const course = COURSES[baseLang];
      const unit1 = course.units[0];
      const wbEx = unit1.nodes[0].exercises.find((e): e is WordBankExercise => e.type === 'word_bank')!;
      const wb = render(
        <WordBankView
          exercise={wbEx}
          language={baseLang}
          compact={false}
          locked={false}
          onTurtlePlay={vi.fn()}
          onDraftChange={vi.fn()}
        />
      );
      expect(screen.queryByTestId('say-it-normally-btn')).not.toBeInTheDocument();
      wb.unmount();
    }

    // Check remaining 6 lesson views on Spanish ('es') & English ('en')
    for (const baseLang of ['es', 'en'] as const) {
      const course = COURSES[baseLang];
      const discEx = course.units[0].nodes[0].exercises.find(
        (e): e is DiscoveryCardExercise => e.type === 'discovery_card'
      )!;
      const clozeEx = course.units[8].nodes[0].exercises.find(
        (e): e is ContextClozeExercise => e.type === 'context_cloze'
      )!;
      const ldEx = course.units[0].nodes[0].exercises.find(
        (e): e is ListenDecodeExercise => e.type === 'listen_decode'
      )!;
      const pmEx = course.units[0].nodes[0].exercises.find(
        (e): e is PairMatchRushExercise => e.type === 'pair_match_rush'
      )!;
      const storyEx = course.units[0].nodes[4].exercises.find(
        (e): e is MiniStoryExercise => e.type === 'mini_story'
      )!;
      const bossEx = course.units[0].nodes[6].exercises.find(
        (e): e is BossGauntletExercise => e.type === 'boss_gauntlet'
      )!;

      const r1 = render(
        <DiscoveryCardView
          exercise={discEx}
          language={baseLang}
          vocabCard={course.vocabById[discEx.vocabId]}
          compact={false}
          onTurtlePlay={vi.fn()}
        />
      );
      expect(screen.queryByTestId('say-it-normally-btn')).not.toBeInTheDocument();
      r1.unmount();

      const r2 = render(
        <ContextClozeView
          exercise={clozeEx}
          language={baseLang}
          compact={false}
          locked={false}
          revealed={false}
          onTurtlePlay={vi.fn()}
          onDraftChange={vi.fn()}
        />
      );
      expect(screen.queryByTestId('say-it-normally-btn')).not.toBeInTheDocument();
      r2.unmount();

      const r3 = render(
        <ListenDecodeView
          exercise={ldEx}
          language={baseLang}
          compact={false}
          locked={false}
          revealed={false}
          onTurtlePlay={vi.fn()}
          onDraftChange={vi.fn()}
        />
      );
      expect(screen.queryByTestId('say-it-normally-btn')).not.toBeInTheDocument();
      r3.unmount();

      const r4 = render(
        <PairMatchRushView exercise={pmEx} language={baseLang} compact={false} onComplete={vi.fn()} />
      );
      expect(screen.queryByTestId('say-it-normally-btn')).not.toBeInTheDocument();
      r4.unmount();

      const r5 = render(
        <MiniStoryView
          exercise={storyEx}
          language={baseLang}
          compact={false}
          onTurtlePlay={vi.fn()}
          onComplete={vi.fn()}
        />
      );
      expect(screen.queryByTestId('say-it-normally-btn')).not.toBeInTheDocument();
      r5.unmount();

      const r6 = render(
        <BossGauntletView
          exercise={bossEx}
          language={baseLang}
          compact={false}
          onTurtlePlay={vi.fn()}
          onTurnResult={vi.fn()}
          onComplete={vi.fn()}
        />
      );
      expect(screen.queryByTestId('say-it-normally-btn')).not.toBeInTheDocument();
      r6.unmount();
    }

    // Even when an adult profile exists, if adultModeActive=false (disarmed), ArcadeHub & TopHud hide Adult UI
    const adult = unlockAndSelectAdultTrack('corp_trades', 'Quarantine Tester');
    vaultActions.setAdultModeActive(false);
    const disarmedState = loadVaultFromStorage().profiles.find((p) => p.id === adult.id)!;
    expect(disarmedState.adultModeActive).toBe(false);

    const disarmedArc = render(<ArcadeHub onExitToMap={vi.fn()} />);
    expect(screen.queryByTestId('arcade-say-it-normally-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arcade-direction-badge')).not.toBeInTheDocument();
    disarmedArc.unmount();

    const disarmedCafe = render(<CafeOrderRushArcade onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Start Café Rush!/i }));
    expect(screen.queryByTestId('arcade-say-it-normally-btn')).not.toBeInTheDocument();
    disarmedCafe.unmount();
  });

  it('3) verifies full curriculum, art, scenery, checkpoint, and 9-cabinet Arcade parity across all 5 Vol. 2 mashups', async () => {
    await ensureAllAdultCoursesLoaded();

    const globalIds = new Set<string>();
    for (const baseLang of LANGUAGE_LIST) {
      const c = COURSES[baseLang];
      Object.keys(c.vocabById).forEach((id) => globalIds.add(id));
      c.units.forEach((u) => {
        globalIds.add(u.id);
        u.nodes.forEach((n) => {
          globalIds.add(n.id);
          n.exercises.forEach((ex) => globalIds.add(ex.id));
        });
      });
    }
    for (const classic of CLASSIC_ADULT_LANGUAGES) {
      const c = getAdultCourse(classic);
      Object.keys(c.vocabById).forEach((id) => globalIds.add(id));
      c.units.forEach((u) => {
        globalIds.add(u.id);
        u.nodes.forEach((n) => {
          globalIds.add(n.id);
          n.exercises.forEach((ex) => globalIds.add(ex.id));
        });
      });
    }

    const validIllustrations = new Set<string>(ILLUSTRATION_KEYS);
    const mashupOrder = [...ADULT_MASHUP_LANGUAGES];

    for (const lang of mashupOrder) {
      const course = getCourse(lang);
      expect(getAdultCourse(lang)).toBe(course);
      expect(course.language).toBe(lang);
      expect(course.meta.isAdultOnly).toBe(true);
      expect(course.meta.isMashup).toBe(true);
      expect(course.meta.dialectA).toBeTruthy();
      expect(course.meta.dialectB).toBeTruthy();
      expect(course.units).toHaveLength(16);

      const cards = Object.values(course.vocabById);
      expect(cards.length, `${lang} card count`).toBeGreaterThanOrEqual(150);

      let nodeCount = 0;
      let contextClozeCount = 0;
      let freeRecallWbCount = 0;
      let freeRecallBossCount = 0;
      const seenWbKeys = new Set<string>();
      const seenListenKeys = new Set<string>();
      const coveredTiers = new Set<string>();

      for (let idx = 0; idx < course.units.length; idx++) {
        const unit = course.units[idx];
        const expectedTier = resolveUnitProficiencyTier(unit.order);
        expect(unit.order).toBe(idx + 1);
        expect(unit.proficiencyTier).toBe(expectedTier);
        expect(globalIds.has(unit.id), `Duplicate unit id ${unit.id}`).toBe(false);
        globalIds.add(unit.id);
        expect(getUnitById(lang, unit.id)).toBe(unit);
        coveredTiers.add(expectedTier);

        for (const card of unit.vocabCards) {
          expect(globalIds.has(card.id), `Duplicate card id ${card.id}`).toBe(false);
          globalIds.add(card.id);
          expect(card.language).toBe(lang);
          expect(validIllustrations.has(card.illustrationKey)).toBe(true);
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
        expect(lessons).toHaveLength(4);
        expect(stories).toHaveLength(1);
        expect(chests).toHaveLength(1);
        expect(bosses).toHaveLength(1);

        for (const node of unit.nodes) {
          nodeCount += 1;
          expect(globalIds.has(node.id), `Duplicate node id ${node.id}`).toBe(false);
          globalIds.add(node.id);
          expect(getNodeById(lang, node.id)).toBe(node);

          for (const ex of node.exercises) {
            expect(globalIds.has(ex.id), `Duplicate exercise id ${ex.id}`).toBe(false);
            globalIds.add(ex.id);
            if (ex.type === 'word_bank') {
              const key = `${ex.promptText.trim().toLowerCase()}||${ex.expectedSentence.trim().toLowerCase()}`;
              expect(seenWbKeys.has(key), `${lang}:${ex.id} duplicate WordBank`).toBe(false);
              seenWbKeys.add(key);
              if (ex.allowFreeRecall) freeRecallWbCount += 1;
            } else if (ex.type === 'listen_decode') {
              const lk = ex.audioText.trim().toLowerCase();
              expect(seenListenKeys.has(lk), `${lang}:${ex.id} duplicate ListenDecode`).toBe(false);
              seenListenKeys.add(lk);
            } else if (ex.type === 'context_cloze') {
              contextClozeCount += 1;
            }
          }

          const poolExercises =
            node.nodeType === 'chest'
              ? node.exercises
              : [...node.exercises, ...getPlayableNodeExercises(lang, node.id, [], false)];

          for (const ex of poolExercises) {
            if (ex.type === 'word_bank') {
              if (ex.direction === 'to_english') {
                assertValidTapHints(ex.promptTokens, `${lang}:${ex.id}`);
              }
              const assembled = joinWordBankTokens(ex.targetTokens);
              const res = gradeAnswer({
                submitted: assembled,
                expected: ex.expectedSentence,
                accepted: ex.acceptedSentences,
                language: lang,
              });
              expect(res.isCorrect, `${lang}:${ex.id} WordBank failed grader`).toBe(true);
            } else if (ex.type === 'context_cloze') {
              assertValidTapHints(ex.tapHints, `${lang}:${ex.id}`);
              expect(ex.choices).toContain(ex.expectedBlank);
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
                `${lang}:${ex.id} ListenDecode failed grader`
              ).toBe(true);
            } else if (ex.type === 'mini_story') {
              expect(ex.bubbles.length).toBeGreaterThanOrEqual(4);
              expect(ex.decisions.length).toBeGreaterThanOrEqual(1);
              expect(ex.decisions.every((d) => d.options.some((o) => o.isCorrect))).toBe(true);
              ex.bubbles.forEach((b) => assertValidTapHints(b.tapHints, `${lang}:${ex.id}:${b.id}`));
            } else if (ex.type === 'boss_gauntlet') {
              expect(ex.companionId).toBe(LANGUAGE_META[lang].companionId);
              expect(ex.turns.length).toBeGreaterThanOrEqual(3);
              for (const t of ex.turns) {
                assertValidTapHints(t.tapHints, `${lang}:${ex.id}:${t.id}`);
                if (t.allowFreeRecall) freeRecallBossCount += 1;
                const cand =
                  t.mode === 'choice' ? t.expectedAnswer : joinWordBankTokens(t.targetTokens ?? []);
                expect(
                  gradeAnswer({
                    submitted: cand,
                    expected: t.expectedAnswer,
                    accepted: t.acceptedAnswers,
                    language: lang,
                  }).isCorrect,
                  `${lang}:${ex.id}:${t.id} Boss turn failed grader`
                ).toBe(true);
              }
            }
          }
        }
      }

      expect(nodeCount).toBe(112);
      expect(Array.from(coveredTiers).sort()).toEqual([...PROFICIENCY_TIERS].sort());
      expect(contextClozeCount).toBeGreaterThanOrEqual(32);
      expect(freeRecallWbCount).toBeGreaterThan(0);
      expect(freeRecallBossCount).toBeGreaterThan(0);

      for (const tier of ['A2', 'B1', 'B2', 'C1_C2'] as const) {
        const cp = buildTierCheckpointNode(lang, tier);
        expect(cp.checkpointTargetTier).toBe(tier);
        expect(cp.exercises).toHaveLength(5);
        expect(getPlayableNodeExercises(lang, cp.id, [], false)).toHaveLength(5);
      }

      // FlagIcon + VocabIllustration flair + RegionalScenery diorama + AdventureMap rendering
      const flagRender = render(<FlagIcon language={lang} size={36} />);
      expect(document.querySelector(`svg[data-flag="${lang}"]`)).toBeInTheDocument();
      flagRender.unmount();

      const hasFlairOrOverride = Object.values(course.vocabById).slice(0, 12);
      let sawOverride = false;
      let sawFlair = false;
      for (const sampleCard of hasFlairOrOverride) {
        const artRender = render(
          <VocabIllustration illustrationKey={sampleCard.illustrationKey} language={lang} size={90} />
        );
        if (document.querySelector(`[data-adult-override="${lang}"]`)) sawOverride = true;
        if (document.querySelector(`[data-adult-flair="${lang}"]`)) sawFlair = true;
        artRender.unmount();
        if (sawOverride && sawFlair) break;
      }
      if (!sawOverride || !sawFlair) {
        for (const fallbackKey of ILLUSTRATION_KEYS) {
          const artRender = render(
            <VocabIllustration illustrationKey={fallbackKey} language={lang} size={90} />
          );
          if (document.querySelector(`[data-adult-override="${lang}"]`)) sawOverride = true;
          if (document.querySelector(`[data-adult-flair="${lang}"]`)) sawFlair = true;
          artRender.unmount();
          if (sawOverride && sawFlair) break;
        }
      }
      expect(sawOverride, `${lang} missing data-adult-override`).toBe(true);
      expect(sawFlair, `${lang} missing data-adult-flair`).toBe(true);

      const sceneryRender = render(
        <RegionalScenery language={lang} unitOrder={1} proficiencyTier="A1" />
      );
      expect(document.querySelector(`[data-adult-diorama="${lang}"]`)).toBeInTheDocument();
      sceneryRender.unmount();

      const profile = unlockAndSelectAdultTrack(lang, `Playtest ${lang}`);
      const mapRender = render(
        <AdventureMap
          course={course}
          progress={profile.languageProgress[lang]!}
          equippedCosmetics={{}}
          onSelectNode={vi.fn()}
        />
      );
      expect(screen.getByText(course.meta.pairDirectionBadge!)).toBeInTheDocument();
      mapRender.unmount();

      // Arcade deck isolation + fallback lexicon parity
      expect(FALLBACK_ARCADE_LEXICON[lang].length).toBeGreaterThanOrEqual(8);
      for (const item of FALLBACK_ARCADE_LEXICON[lang]) {
        expect(item.language).toBe(lang);
        expect(validIllustrations.has(item.illustrationKey)).toBe(true);
        expect(item.plainEnglish?.trim().length).toBeGreaterThan(5);
      }
      const deck = getArcadeLexicon(lang, [], 15, 'voyager');
      expect(deck.length).toBeGreaterThanOrEqual(16);
      expect(deck.every((item) => item.language === lang)).toBe(true);
    }

    // Launch and complete all 9 Arcade cabinets on a Vol. 2 mashup with long slang phrases & zero console errors
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    unlockAndSelectAdultTrack('south_genz', 'Arcade Mashup Tester');
    expect(vaultActions.unlockSecretArcade()).toBe(true);

    render(<ArcadeHub onExitToMap={vi.fn()} />);
    expect(screen.getByTestId('arcade-direction-badge')).toHaveTextContent(
      LANGUAGE_META.south_genz.pairDirectionBadge!
    );

    const cabinetFlows: ReadonlyArray<{ openBtn: RegExp; startBtn: RegExp; endBtn: RegExp; backBtn: RegExp }> = [
      { openBtn: /^Play Sky-Catcher$/i, startBtn: /Start 45s Fiesta!/i, endBtn: /Claim \+\d+ Hearts/i, backBtn: /Back to Atlas Map/i },
      { openBtn: /^Launch Blaster$/i, startBtn: /Launch Starfighter!/i, endBtn: /^Finish$/i, backBtn: /Back to Arcade Hub/i },
      { openBtn: /^Stack Gelato$/i, startBtn: /Start Stacking!/i, endBtn: /^Finish$/i, backBtn: /Back to Arcade Hub/i },
      { openBtn: /^Chart Stars$/i, startBtn: /Chart the Stars!/i, endBtn: /Claim Rewards/i, backBtn: /Back to Arcade Hub/i },
      { openBtn: /^Switch Tracks$/i, startBtn: /Start Express Shift!/i, endBtn: /^Finish$/i, backBtn: /Back to Arcade Hub/i },
      { openBtn: /^Play Rhythm$/i, startBtn: /Start Kitchen Beat!/i, endBtn: /^Finish$/i, backBtn: /Back to Arcade Hub/i },
      { openBtn: /^Serve Café Rush$/i, startBtn: /Start Café Rush!/i, endBtn: /^Finish$/i, backBtn: /Back to Arcade Hub/i },
      { openBtn: /^Build Star Bridge$/i, startBtn: /Start Bridge Sprint!/i, endBtn: /^Finish$/i, backBtn: /Back to Arcade Hub/i },
      { openBtn: /Play Starlight Critter Choir!/i, startBtn: /Start Critter Choir!/i, endBtn: /Claim Rewards/i, backBtn: /Back to Arcade Hub/i },
    ];

    for (const flow of cabinetFlows) {
      fireEvent.click(screen.getByRole('button', { name: flow.openBtn }));
      fireEvent.click(screen.getByRole('button', { name: flow.startBtn }));
      fireEvent.click(screen.getByRole('button', { name: flow.endBtn }));
      fireEvent.click(screen.getByRole('button', { name: flow.backBtn }));
    }

    expect(errSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  }, 60_000);

  it('4) validates "Say It Normally in English" across all 7 Adult tracks, all 8 lesson/meta paths, Arcade cabinets, and spoiler safety', async () => {
    await ensureAllAdultCoursesLoaded();
    const speakSpy = vi.spyOn(audioModule, 'speakPhrase').mockResolvedValue({
      usedNativeVoice: true,
      fallbackActive: false,
      localeUsed: 'en-US',
    });

    // Core decoder across all 7 tracks + editorial prefix stripping + spoiler masking
    const sampleInputs: Record<AdultLanguageCode, { dialectA: string; dialectB: string }> = {
      ebonics: { dialectA: "Bet, we ain't trippin', no cap.", dialectB: 'Suburban: Understood, we are calm.' },
      suburban: { dialectA: "Let's circle back before EOD.", dialectB: "AAVE: We gon' talk later." },
      corp_trades: {
        dialectA: "Let's circle back and unpack bandwidth on this suboptimal deliverable before EOD.",
        dialectB: "Boss, ain't happening before Friday.",
      },
      midwest_northeast: {
        dialectA: 'Ope, let me just sneak right past ya there!',
        dialectB: 'Yo, move it or lose it, pal—fuggedaboutit!',
      },
      south_genz: {
        dialectA: "Well bless his sweet little heart, he's doin' his best, sugar.",
        dialectB: 'Bro is fully cooked, negative aura, delulu NPC behavior, no cap.',
      },
      cali_country: {
        dialectA: 'My cortisol is spiked, I need an adaptogenic cold-plunge and sound-bath.',
        dialectB: "I'm worn slap out, gonna fire up the smoker.",
      },
      stoner_tactical: {
        dialectA: "Whoa dude, pass the Doritos at the half-pipe, it's all chill.",
        dialectB: 'Copy that, perimeter breach, execute snack extraction at 0-dark-thirty!',
      },
    };

    for (const lang of ADULT_EASTER_EGG_LANGUAGES) {
      const res = decodeToNormalEnglish({
        language: lang,
        dialectAText: sampleInputs[lang].dialectA,
        dialectBText: sampleInputs[lang].dialectB,
      });
      expect(res.label).toBe('Normal English');
      expect(res.displayLine.trim().length).toBeGreaterThan(10);
      expect(res.spokenText.trim().length).toBeGreaterThan(10);
      expect(res.displayLine).not.toMatch(/^(?:Suburban|AAVE)\s*:/i);
    }

    // Spoiler masking even when explicitPlain contains the blank/target term
    const maskedExplicit = decodeToNormalEnglish({
      language: 'south_genz',
      explicitPlain: 'That person is totally cooked after skipping the sound-bath.',
      avoidTerms: ['cooked', 'sound-bath'],
    });
    expect(maskedExplicit.displayLine.toLowerCase()).not.toContain('cooked');
    expect(maskedExplicit.displayLine.toLowerCase()).not.toContain('sound-bath');

    // UI Verification across ALL 7 Adult tracks in DiscoveryCardView + PhrasebookVault + ArcadeHub
    for (const lang of ADULT_EASTER_EGG_LANGUAGES) {
      const course = getCourse(lang);
      const card = course.units[0].vocabCards[0];
      const discEx: DiscoveryCardExercise = { type: 'discovery_card', id: `plain-disc-${lang}`, vocabId: card.id };

      speakSpy.mockClear();
      const d = render(
        <DiscoveryCardView
          exercise={discEx}
          language={lang}
          vocabCard={card}
          compact={false}
          onTurtlePlay={vi.fn()}
        />
      );
      fireEvent.click(screen.getByTestId('say-it-normally-btn'));
      const callout = screen.getByTestId('plain-english-callout');
      expect(callout.textContent?.trim().length).toBeGreaterThan(15);
      expect(speakSpy).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'en', speed: 'normal', text: expect.any(String) })
      );
      d.unmount();
    }

    // All remaining 7 Adult UI paths on a Vol. 2 mashup (corp_trades & south_genz)
    const southCourse = getCourse('south_genz');
    const adult = unlockAndSelectAdultTrack('south_genz', 'Plain English Explorer');
    vaultActions.completeMapNode({
      language: 'south_genz',
      nodeId: 'sg-u1-n1',
      stars: 3,
      xpEarned: 35,
      gemsEarned: 15,
      unlockedVocabIds: southCourse.units[0].vocabCards.slice(0, 3).map((c) => c.id),
      maxCombo: 4,
    });

    const allNodes = southCourse.units.flatMap((u) => u.nodes);
    const wbEx = allNodes
      .flatMap((n) => n.exercises)
      .find((e): e is WordBankExercise => e.type === 'word_bank')!;
    const clozeEx = allNodes
      .flatMap((n) => n.exercises)
      .find((e): e is ContextClozeExercise => e.type === 'context_cloze')!;
    const ldEx = allNodes
      .flatMap((n) => n.exercises)
      .find((e): e is ListenDecodeExercise => e.type === 'listen_decode')!;
    const pmEx = allNodes
      .flatMap((n) => n.exercises)
      .find((e): e is PairMatchRushExercise => e.type === 'pair_match_rush')!;
    const storyEx = allNodes
      .flatMap((n) => n.exercises)
      .find((e): e is MiniStoryExercise => e.type === 'mini_story')!;
    const bossEx = allNodes
      .flatMap((n) => n.exercises)
      .find((e): e is BossGauntletExercise => e.type === 'boss_gauntlet')!;

    // WordBankView (spoiler-safe before reveal)
    const wbStrictEx: WordBankExercise = {
      ...wbEx,
      id: 'spoiler-wb-test',
      direction: 'to_foreign',
      promptText: 'They are completely unrealistic.',
      targetTokens: ['delulu'],
      plainEnglish: 'That person is totally delulu today.',
    };
    const wb = render(
      <WordBankView
        exercise={wbStrictEx}
        language="south_genz"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('say-it-normally-btn'));
    expect(screen.getByTestId('plain-english-callout').textContent?.toLowerCase()).not.toContain('delulu');
    wb.unmount();

    // ContextClozeView (spoiler-safe before reveal -> full plain after reveal)
    const clozeStrictEx: ContextClozeExercise = {
      ...clozeEx,
      id: 'spoiler-cloze-test',
      expectedBlank: 'cooked',
      choices: ['cooked', 'blessed', 'quiet'],
      plainEnglish: 'Honestly, that guy is totally cooked right now.',
    };
    const cl = render(
      <ContextClozeView
        exercise={clozeStrictEx}
        language="south_genz"
        compact={false}
        locked={false}
        revealed={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('say-it-normally-btn'));
    expect(screen.getByTestId('plain-english-callout').textContent?.toLowerCase()).not.toContain('cooked');
    cl.unmount();

    // ListenDecodeView, PairMatchRushView, MiniStoryView, BossGauntletView
    for (const viewRender of [
      () =>
        render(
          <ListenDecodeView
            exercise={ldEx}
            language="south_genz"
            compact={false}
            locked={false}
            revealed={false}
            onTurtlePlay={vi.fn()}
            onDraftChange={vi.fn()}
          />
        ),
      () =>
        render(
          <PairMatchRushView exercise={pmEx} language="south_genz" compact={false} onComplete={vi.fn()} />
        ),
      () =>
        render(
          <MiniStoryView
            exercise={storyEx}
            language="south_genz"
            compact={false}
            onTurtlePlay={vi.fn()}
            onComplete={vi.fn()}
          />
        ),
      () =>
        render(
          <BossGauntletView
            exercise={bossEx}
            language="south_genz"
            compact={false}
            onTurtlePlay={vi.fn()}
            onTurnResult={vi.fn()}
            onComplete={vi.fn()}
          />
        ),
    ]) {
      speakSpy.mockClear();
      const r = viewRender();
      const btn = screen.getAllByTestId('say-it-normally-btn')[0];
      fireEvent.click(btn);
      expect(screen.getByTestId('plain-english-callout').textContent?.trim().length).toBeGreaterThan(10);
      expect(speakSpy).toHaveBeenCalledWith(expect.objectContaining({ language: 'en', speed: 'normal' }));
      r.unmount();
    }

    // PhrasebookVault cards + Show-Off spotlight
    const pb = render(<PhrasebookVault />);
    fireEvent.click(screen.getAllByTestId('say-it-normally-btn')[0]);
    expect(screen.getByTestId('plain-english-callout').textContent?.trim().length).toBeGreaterThan(10);
    fireEvent.click(screen.getByRole('button', { name: /Family Show-Off Mode/i }));
    const modal = screen.getByRole('dialog', { name: 'Family Show-Off Flashcard Spotlight' });
    fireEvent.click(within(modal).getByTestId('say-it-normally-btn'));
    expect(within(modal).getByTestId('plain-english-callout').textContent?.trim().length).toBeGreaterThan(10);
    pb.unmount();

    // ArcadeHub + TargetPromptBar/Arcade cabinets across Adult Mode
    expect(loadVaultFromStorage().profiles.find((p) => p.id === adult.id)?.adultModeActive).toBe(true);
    const hub = render(<ArcadeHub onExitToMap={vi.fn()} />);
    speakSpy.mockClear();
    fireEvent.click(screen.getByTestId('arcade-say-it-normally-btn'));
    expect(screen.getByTestId('arcade-plain-english-callout').textContent?.trim().length).toBeGreaterThan(10);
    expect(speakSpy).toHaveBeenCalledWith(expect.objectContaining({ language: 'en', speed: 'normal' }));
    hub.unmount();

    // Standalone cabinets with custom headers (CafeOrderRushArcade, StarlightBridgeArcade, ConstellationMemoryArcade)
    for (const cab of [
      () => {
        const r = render(<CafeOrderRushArcade onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /Start Café Rush!/i }));
        return r;
      },
      () => {
        const r = render(<StarlightBridgeArcade onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
        return r;
      },
      () => {
        const r = render(<ConstellationMemoryArcade onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /Chart the Stars!/i }));
        return r;
      },
    ]) {
      speakSpy.mockClear();
      const r = cab();
      fireEvent.click(screen.getByTestId('arcade-say-it-normally-btn'));
      expect(screen.getByTestId('arcade-plain-english-callout').textContent?.trim().length).toBeGreaterThan(10);
      expect(speakSpy).toHaveBeenCalledWith(expect.objectContaining({ language: 'en', speed: 'normal' }));
      r.unmount();
    }

    // Verify resolveArcadePlainEnglish resolves non-empty plainEnglish on all 56 Adult fallback entries
    for (const adultLang of ADULT_EASTER_EGG_LANGUAGES) {
      for (const item of FALLBACK_ARCADE_LEXICON[adultLang]) {
        const plain = resolveArcadePlainEnglish(item);
        expect(plain.displayLine.trim().length).toBeGreaterThan(5);
      }
    }
  });

  it('5) enforces slang grader forgiveness across all 7 Adult tracks (both LessonArena directions) while keeping base "en" strict', async () => {
    await ensureAllAdultCoursesLoaded();

    const slangCases: Array<{ submitted: string; expected: string }> = [
      { submitted: "fixin'", expected: 'fixing' },
      { submitted: 'fixin', expected: 'fixing' },
      { submitted: 'fixing', expected: "fixin'" },
      { submitted: "doin'", expected: 'doin' },
      { submitted: 'doin', expected: 'doing' },
      { submitted: "y'all", expected: 'yall' },
      { submitted: 'yall', expected: "y'all" },
      { submitted: 'lemme', expected: 'let me' },
      { submitted: 'let me', expected: 'lemme' },
      { submitted: "ain't", expected: 'aint' },
      { submitted: 'aint', expected: "ain't" },
      { submitted: "gon'", expected: 'gonna' },
      { submitted: 'gon', expected: 'gonna' },
      { submitted: 'gonna', expected: "gon'" },
      { submitted: 'no-cap', expected: 'no cap' },
      { submitted: 'no cap', expected: 'no-cap' },
      { submitted: 'cold-plunge', expected: 'cold plunge' },
      { submitted: 'cold plunge', expected: 'cold-plunge' },
      { submitted: '0-dark-thirty', expected: 'zero-dark-thirty' },
      { submitted: 'fuggedaboutit', expected: 'forget about it' },
      { submitted: 'fuhgeddaboudit', expected: 'forget about it' },
    ];

    for (const lang of ADULT_EASTER_EGG_LANGUAGES) {
      for (const c of slangCases) {
        const res = gradeAnswer({ submitted: c.submitted, expected: c.expected, language: lang });
        expect(res.isCorrect, `${lang}: "${c.submitted}" vs "${c.expected}"`).toBe(true);
        expect(res.heartPenalty, `${lang}: "${c.submitted}" penalty`).toBe(0);
        expect(res.accentCoaching?.friendlyTip.trim().length).toBeGreaterThan(5);
      }
    }

    // Strictness preserved on base 'en'
    const strictEnCases = [
      { submitted: 'fixin', expected: 'fixing' },
      { submitted: "fixin'", expected: 'fixing' },
      { submitted: 'yall', expected: "y'all" },
      { submitted: 'lemme', expected: 'let me' },
      { submitted: 'aint', expected: "ain't" },
      { submitted: 'gon', expected: 'gonna' },
      { submitted: 'no cap', expected: 'no-cap' },
      { submitted: 'cold plunge', expected: 'cold-plunge' },
    ];
    for (const c of strictEnCases) {
      const res = gradeAnswer({ submitted: c.submitted, expected: c.expected, language: 'en' });
      expect(res.isCorrect, `Base 'en' unexpectedly forgave "${c.submitted}"`).toBe(false);
      expect(res.heartPenalty).toBe(1);
    }

    // Verify LessonArena grades a mashup to_english exercise using forgiving mashup rules (not strict 'en')
    unlockAndSelectAdultTrack('corp_trades', 'Grader Check');
    const customNode: MapNode = {
      id: 'ct-grader-verify',
      unitId: 'corp_trades-u1',
      order: 1,
      nodeType: 'lesson',
      title: 'Slang Grader Trial',
      subtitle: 'Verify bidirectional mashup grading',
      xpReward: 20,
      gemReward: 5,
      rewardVocabIds: ['ct-u1-c1'],
      exercises: [
        {
          type: 'word_bank',
          id: 'ct-wb-slang-forgive',
          direction: 'to_english',
          promptText: "Let's circle back on that.",
          promptTokens: [],
          expectedSentence: "Boss, we ain't fixin' that today",
          acceptedSentences: ["Boss, we ain't fixin' that today"],
          targetTokens: ['Boss,', 'we', "ain't", "fixin'", 'that', 'today'],
          distractorTokens: ['maybe'],
          phoneticHint: 'bos wee aynt FIK-sin',
          vocabIds: ['ct-u1-c1'],
        },
      ],
    };
    render(<LessonArena node={customNode} language="corp_trades" onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Type Instead/i }));
    fireEvent.change(screen.getByLabelText('Type your translation'), {
      target: { value: 'Boss we aint fixing that today' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.queryByText(/Almost there!/i)).not.toBeInTheDocument();
    expect(loadVaultFromStorage().profiles.find((p) => p.name === 'Grader Check')?.hearts).toBe(5);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Slang Grader Trial Complete!')).toBeInTheDocument();
  });

  it('6) migrates legacy v1 and Vol. 1 Adult saves without progress loss, renders 7-track 18+ modal, and supports 1-tap Study-Break quick-bounce', async () => {
    await ensureAllAdultCoursesLoaded();

    // 1. Vol. 1 Adult save JSON missing all 5 new mashup keys hydrates cleanly via loadVaultFromStorage and importVaultJson
    const vol1Save = createDefaultVault();
    const vol1Adult = structuredClone(vol1Save.profiles[0]);
    vol1Adult.id = 'adult-vol1-veteran';
    vol1Adult.name = 'Vol. 1 Veteran';
    vol1Adult.activeLanguage = 'ebonics';
    vol1Adult.lastBaseLanguage = 'ja';
    vol1Adult.adultModeUnlocked = true;
    vol1Adult.adultModeActive = true;
    vol1Adult.languageProgress.es.completedNodeIds = ['es-u1-n1'];
    vol1Adult.languageProgress.ebonics = {
      completedNodeIds: ['eb-u1-n1', 'eb-u1-n2'],
      nodeStars: { 'eb-u1-n1': 3, 'eb-u1-n2': 2 },
      unlockedVocabIds: ['eb-u1-c1'],
      claimedChestIds: ['eb-u1-n6'],
      currentUnitIndex: 2,
      xpEarned: 120,
      seenExerciseIds: ['eb-u1-n1-ex1'],
      unlockedTiers: ['A2'],
    };
    vol1Adult.languageProgress.suburban = {
      completedNodeIds: ['sb-u1-n1'],
      nodeStars: { 'sb-u1-n1': 3 },
      unlockedVocabIds: ['sb-u1-c1'],
      claimedChestIds: [],
      currentUnitIndex: 1,
      xpEarned: 55,
      seenExerciseIds: [],
      unlockedTiers: [],
    };
    vol1Save.profiles.push(vol1Adult);
    vol1Save.activeProfileId = vol1Adult.id;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vol1Save));
    const hydrated = loadVaultFromStorage();
    const vet = hydrated.profiles.find((p) => p.id === 'adult-vol1-veteran')!;
    expect(vet.languageProgress.es.completedNodeIds).toEqual(['es-u1-n1']);
    expect(vet.languageProgress.ebonics?.completedNodeIds).toEqual(['eb-u1-n1', 'eb-u1-n2']);
    expect(vet.languageProgress.suburban?.xpEarned).toBe(55);
    for (const mashup of ADULT_MASHUP_LANGUAGES) {
      expect(vet.languageProgress[mashup]).toBeDefined();
      expect(vet.languageProgress[mashup]?.completedNodeIds).toEqual([]);
    }

    // Export & import (replace + merge) preserves Vol. 1 & Vol. 2 mashup progress cleanly
    const json = exportVaultJson(hydrated);
    vaultActions.resetVaultToDefaults();
    expect(importVaultJson(json, 'replace').ok).toBe(true);
    const afterReplace = loadVaultFromStorage().profiles.find((p) => p.id === 'adult-vol1-veteran')!;
    expect(afterReplace.languageProgress.ebonics?.xpEarned).toBe(120);
    for (const mashup of ADULT_MASHUP_LANGUAGES) {
      expect(afterReplace.languageProgress[mashup]).toBeDefined();
    }

    // Merge mode hydrates incoming Vol. 1 save + combines mashup progress cleanly
    const incomingMerge = JSON.parse(json) as SaveVault;
    const incomingVet = incomingMerge.profiles.find((p) => p.id === 'adult-vol1-veteran')!;
    incomingVet.languageProgress.ebonics!.xpEarned = 180;
    incomingVet.languageProgress.corp_trades = {
      completedNodeIds: ['ct-u1-n1'],
      nodeStars: { 'ct-u1-n1': 3 },
      unlockedVocabIds: ['ct-u1-c1'],
      claimedChestIds: [],
      currentUnitIndex: 1,
      xpEarned: 35,
      seenExerciseIds: [],
      unlockedTiers: [],
    };
    expect(importVaultJson(JSON.stringify(incomingMerge), 'merge').ok).toBe(true);
    const afterMerge = loadVaultFromStorage().profiles.find((p) => p.id === 'adult-vol1-veteran')!;
    expect(afterMerge.languageProgress.ebonics?.xpEarned).toBe(180);
    expect(afterMerge.languageProgress.corp_trades?.completedNodeIds).toContain('ct-u1-n1');

    // Legacy v1 save (no adult flags, no lastBaseLanguage) keeps Leo & Maya quarantined
    const legacy = createDefaultVault() as SaveVault;
    for (const p of legacy.profiles) {
      delete p.adultModeUnlocked;
      delete p.adultModeActive;
      delete p.lastBaseLanguage;
    }
    expect(importVaultJson(JSON.stringify(legacy), 'replace').ok).toBe(true);
    for (const p of loadVaultFromStorage().profiles) {
      expect(p.adultModeUnlocked).toBe(false);
      expect(p.adultModeActive).toBe(false);
      expect(p.languageProgress.corp_trades).toBeUndefined();
    }

    // 2. Unlocking from Maya ('fr') via ProfileVaultModal 7-tap modal -> seeds lastBaseLanguage='fr', renders all 5 mashups
    vaultActions.resetVaultToDefaults();
    vaultActions.switchProfile('kid-maya');
    const onClose = vi.fn();
    const modalRender = render(<ProfileVaultModal onClose={onClose} />);
    const badge = screen.getByTestId('atlas-version-easter-egg');
    for (let i = 0; i < 7; i++) fireEvent.click(badge);

    const confirmDialog = screen.getByRole('dialog', { name: 'After-Hours Atlas 18+ Confirmation' });
    expect(within(confirmDialog).getByText(/Original Vernacular/i)).toBeInTheDocument();
    expect(within(confirmDialog).getByText(/American Culture Clash/i)).toBeInTheDocument();
    for (const code of ADULT_EASTER_EGG_LANGUAGES) {
      expect(confirmDialog.querySelector(`svg[data-flag="${code}"]`)).toBeInTheDocument();
    }

    // Select South <-> Gen-Z mashup and unlock
    const sgBtn = confirmDialog.querySelector('svg[data-flag="south_genz"]')?.closest('button');
    expect(sgBtn).toBeTruthy();
    fireEvent.click(sgBtn!);
    fireEvent.click(
      within(confirmDialog).getByRole('button', { name: /I am 18\+.*Unlock After-Hours Atlas/i })
    );
    expect(onClose).toHaveBeenCalled();
    modalRender.unmount();

    const adultProfile = loadVaultFromStorage().profiles.find((p) => p.adultModeUnlocked)!;
    expect(adultProfile.activeLanguage).toBe('south_genz');
    expect(adultProfile.lastBaseLanguage).toBe('fr');

    // Switching across mashups preserves lastBaseLanguage='fr' and Flip Direction cycles mashups cleanly
    const hudRender = render(
      <TopHud
        onOpenProfileModal={vi.fn()}
        onOpenArcade={vi.fn()}
        canInstallApp={false}
        onInstallApp={vi.fn()}
      />
    );
    const quickBtn = screen.getByTestId('return-to-kid-atlas-btn');
    expect(quickBtn).toHaveAttribute('aria-label', 'Return to Kid Atlas');
    expect(quickBtn).toHaveTextContent(/Back to French/i);
    expect(quickBtn.querySelector('svg[data-flag="fr"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Active language:/i }));
    const switchDialog = screen.getByRole('dialog', { name: 'Switch Language' });
    expect(within(switchDialog).getByText(/Original Pair/i)).toBeInTheDocument();
    expect(within(switchDialog).getByText(/American Culture Clash/i)).toBeInTheDocument();
    const popQuick = within(switchDialog).getByTestId('popover-return-to-kid-atlas-btn');
    expect(popQuick).toHaveAttribute('aria-label', 'Return to Kid Atlas');
    expect(popQuick).toHaveTextContent(/Back to French/i);
    expect(popQuick.querySelector('svg[data-flag="fr"]')).toBeInTheDocument();

    const beforeFlip = loadVaultFromStorage().profiles.find((p) => p.id === adultProfile.id)!.activeLanguage;
    fireEvent.click(within(switchDialog).getByRole('button', { name: /Flip Direction/i }));
    const afterFlip = loadVaultFromStorage().profiles.find((p) => p.id === adultProfile.id)!.activeLanguage;
    expect(afterFlip).not.toBe(beforeFlip);
    expect(isAdultMashupLanguage(afterFlip)).toBe(true);
    expect(loadVaultFromStorage().profiles.find((p) => p.id === adultProfile.id)!.lastBaseLanguage).toBe('fr');

    // 1-tap quick-bounce restores 'fr' and disarms adultModeActive
    fireEvent.click(screen.getByTestId('return-to-kid-atlas-btn'));
    const bounced = loadVaultFromStorage().profiles.find((p) => p.id === adultProfile.id)!;
    expect(bounced.adultModeActive).toBe(false);
    expect(bounced.activeLanguage).toBe('fr');
    hudRender.unmount();

    // Selecting any base language ('de') directly from TopHud while Adult Mode is active bounces & disarms in 1 tap
    vaultActions.setAdultModeActive(true);
    const hud2 = render(
      <TopHud
        onOpenProfileModal={vi.fn()}
        onOpenArcade={vi.fn()}
        canInstallApp={false}
        onInstallApp={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Active language:/i }));
    const dlg2 = screen.getByRole('dialog', { name: 'Switch Language' });
    fireEvent.click(within(dlg2).getByRole('button', { name: /German/i }));
    const afterBaseClick = loadVaultFromStorage().profiles.find((p) => p.id === adultProfile.id)!;
    expect(afterBaseClick.adultModeActive).toBe(false);
    expect(afterBaseClick.activeLanguage).toBe('de');
    expect(afterBaseClick.lastBaseLanguage).toBe('de');
    hud2.unmount();

    // Also render full App on a mashup to confirm reactive hydration & zero crash
    vaultActions.setAdultModeActive(true);
    vaultActions.setActiveLanguage('cali_country');
    const appRender = render(<App />);
    await waitFor(() => {
      expect(document.querySelector('[data-adult-diorama="cali_country"]')).toBeInTheDocument();
    });
    appRender.unmount();
  });
});
