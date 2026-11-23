import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { stopSpeech } from '../../src/audio';
import { ArcadeHub } from '../../src/components/arcade/ArcadeHub';
import { TargetPromptBar } from '../../src/components/arcade/arcadeShared';
import { LessonArena } from '../../src/components/lesson/LessonArena';
import { AdventureMap } from '../../src/components/map/AdventureMap';
import { PhrasebookVault } from '../../src/components/meta/PhrasebookVault';
import { ProfileVaultModal } from '../../src/components/shell/ProfileVaultModal';
import { TopHud } from '../../src/components/shell/TopHud';
import { gradeAnswer } from '../../src/core';
import {
  COURSES,
  ensureAdultCourseLoaded,
  ensureAllAdultCoursesLoaded,
  getAdultCourse,
  getAdultRegistryVersion,
  getArcadeLexicon,
  getCourse,
  getPlayableNodeExercises,
  isAdultTrackLoaded,
  subscribeAdultRegistry,
} from '../../src/curriculum';
import { loadVaultFromStorage, vaultActions } from '../../src/store/useVaultStore';
import {
  ADULT_EASTER_EGG_CODES,
  ADULT_EASTER_EGG_LANGUAGES,
  ADULT_EASTER_EGG_TAP_COUNT,
  ADULT_MASHUP_LANGUAGES,
  LANGUAGE_LIST,
  LANGUAGE_META,
  isAdultLanguage,
  isDefaultKidProfileId,
  type AdultLanguageCode,
  type BossGauntletExercise,
  type KidProfile,
  type MapNode,
  type WordBankExercise,
} from '../../src/types/contracts';
import {
  clickTokensInTray,
  playExerciseInDom,
  requireButtonByText,
} from './helpers';

interface AdultTrackExpectation {
  track: AdultLanguageCode;
  ptId: string;
  slangSamples: ReadonlyArray<{ submitted: string; expected: string }>;
  gateMethod: '7-tap' | 'AFTERHOURS' | 'COOKOUT';
  baseReturnLang: 'es' | 'fr' | 'ja';
}

const ADULT_TRACK_EXPECTATIONS: readonly AdultTrackExpectation[] = [
  {
    track: 'ebonics',
    ptId: 'PT-033',
    slangSamples: [
      { submitted: 'we gonna pull up', expected: "We gon' pull up" },
      { submitted: 'lowkey', expected: 'low-key' },
    ],
    gateMethod: '7-tap',
    baseReturnLang: 'es',
  },
  {
    track: 'suburban',
    ptId: 'PT-034',
    slangSamples: [
      { submitted: 'culdesac', expected: 'cul-de-sac' },
      { submitted: 'dadjoke', expected: 'dad joke' },
    ],
    gateMethod: 'AFTERHOURS',
    baseReturnLang: 'fr',
  },
  {
    track: 'corp_trades',
    ptId: 'PT-035',
    slangSamples: [
      { submitted: 'circleback before EOD', expected: 'circle back before EOD' },
      { submitted: 'followup pushback', expected: 'follow-up push-back' },
    ],
    gateMethod: 'COOKOUT',
    baseReturnLang: 'ja',
  },
  {
    track: 'midwest_northeast',
    ptId: 'PT-036',
    slangSamples: [
      { submitted: 'fuggedaboutit', expected: 'forget about it' },
      { submitted: 'potluck checkin', expected: 'pot luck check-in' },
    ],
    gateMethod: '7-tap',
    baseReturnLang: 'es',
  },
  {
    track: 'south_genz',
    ptId: 'PT-037',
    slangSamples: [
      { submitted: "We fixin' to glowup", expected: 'We fixing to glow up' },
      { submitted: 'nocap vibin', expected: 'no cap vibing' },
    ],
    gateMethod: 'AFTERHOURS',
    baseReturnLang: 'fr',
  },
  {
    track: 'cali_country',
    ptId: 'PT-038',
    slangSamples: [
      { submitted: 'coldplunge soundbath', expected: 'cold-plunge sound bath' },
      { submitted: "We grillin' rightnow", expected: 'We grilling right now' },
    ],
    gateMethod: 'COOKOUT',
    baseReturnLang: 'ja',
  },
  {
    track: 'stoner_tactical',
    ptId: 'PT-039',
    slangSamples: [
      { submitted: '0 dark thirty perimeter', expected: 'zero dark thirty perimeter' },
      { submitted: "chillin' at the halfpipe", expected: 'chilling at the half-pipe' },
    ],
    gateMethod: '7-tap',
    baseReturnLang: 'es',
  },
];

function collectAdultVocabTokens(): Set<string> {
  const adultTerms = new Set<string>();
  const baseTerms = new Set<string>();
  for (const lang of LANGUAGE_LIST) {
    for (const card of Object.values(COURSES[lang].vocabById)) {
      baseTerms.add(card.foreignWithArticle.toLowerCase());
      baseTerms.add(card.english.toLowerCase());
    }
  }
  for (const track of ADULT_EASTER_EGG_LANGUAGES) {
    const course = getAdultCourse(track);
    for (const card of Object.values(course.vocabById)) {
      const f = card.foreignWithArticle.toLowerCase();
      if (!baseTerms.has(f) && f.length >= 6) {
        adultTerms.add(card.foreignWithArticle);
      }
    }
  }
  return adultTerms;
}

function assertProfileQuarantinedFromAdult(profile: KidProfile): void {
  expect(profile.adultModeUnlocked).toBe(false);
  expect(profile.adultModeActive).toBe(false);
  expect(isAdultLanguage(profile.activeLanguage)).toBe(false);
  for (const adultTrack of ADULT_EASTER_EGG_LANGUAGES) {
    expect(profile.languageProgress[adultTrack]).toBeUndefined();
  }

  // TopHud quarantine
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
  cleanup();

  // Phrasebook quarantine
  const pb = render(<PhrasebookVault />);
  const pbFilter = screen.getByRole('group', { name: 'Filter phrasebook by language' });
  expect(within(pbFilter).getAllByRole('button')).toHaveLength(16);
  for (const adultCode of ADULT_EASTER_EGG_LANGUAGES) {
    expect(pbFilter.querySelector(`svg[data-flag="${adultCode}"]`)).not.toBeInTheDocument();
  }
  pb.unmount();
  cleanup();

  // Profile modal quarantine
  const pm = render(<ProfileVaultModal onClose={vi.fn()} />);
  expect(screen.queryByRole('button', { name: /Enter After-Hours Atlas/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /\+ New Kid Explorer/i }));
  const creatorLangs = screen.getByRole('group', { name: 'Pick Starting Language' });
  expect(within(creatorLangs).getAllByRole('button')).toHaveLength(16);
  for (const adultCode of ADULT_EASTER_EGG_LANGUAGES) {
    expect(creatorLangs.querySelector(`svg[data-flag="${adultCode}"]`)).not.toBeInTheDocument();
  }
  pm.unmount();
  cleanup();

  // Map & Arcade zero Adult vocab bleed
  const activeBase = isAdultLanguage(profile.activeLanguage) ? 'es' : profile.activeLanguage;
  const course = getCourse(activeBase);
  const mapRender = render(
    <AdventureMap
      course={course}
      progress={profile.languageProgress[activeBase]}
      equippedCosmetics={profile.equippedCosmetics}
      onSelectNode={vi.fn()}
      onSelectUnit={vi.fn()}
    />
  );
  expect(document.querySelector('[data-testid="say-it-normally-btn"]')).toBeNull();
  for (const adultCode of ADULT_EASTER_EGG_LANGUAGES) {
    expect(document.body.textContent ?? '').not.toContain(LANGUAGE_META[adultCode].landTitle);
  }
  mapRender.unmount();
  cleanup();

  const arcRender = render(<ArcadeHub onExitToMap={vi.fn()} />);
  for (const adultCode of ADULT_EASTER_EGG_LANGUAGES) {
    expect(document.querySelector(`svg[data-flag="${adultCode}"]`)).not.toBeInTheDocument();
    expect(screen.queryByText(LANGUAGE_META[adultCode].pairDirectionBadge ?? '')).not.toBeInTheDocument();
  }
  const lexicon = getArcadeLexicon(activeBase, [], 0, 'master');
  const adultSignatures = collectAdultVocabTokens();
  for (const item of lexicon) {
    expect(item.language).toBe(activeBase);
    expect(adultSignatures.has(item.foreign)).toBe(false);
  }
  arcRender.unmount();
  cleanup();
}

describe('Cohort B [PT-033..PT-046]: After-Hours Atlas Front-to-Back, Kid Quarantine & RTL Deep-Dives', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    stopSpeech();
    await ensureAllAdultCoursesLoaded();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    stopSpeech();
    cleanup();
    vi.restoreAllMocks();
  });

  for (const spec of ADULT_TRACK_EXPECTATIONS) {
    it(`[${spec.ptId}] ${spec.track}: unlocks via ${spec.gateMethod} + 18+ modal, traverses A1->C1_C2 both directions with slang/contraction grading, SayItNormallyButton & 1-tap Study Break return to ${spec.baseReturnLang}`, () => {
      vi.useFakeTimers();
      vaultActions.setActiveLanguage(spec.baseReturnLang);

      // 1. Trigger Easter Egg gate (7-tap OR AFTERHOURS OR COOKOUT) and complete 18+ modal
      const onCloseModal = vi.fn();
      const { unmount: unmountModal } = render(<ProfileVaultModal onClose={onCloseModal} />);

      if (spec.gateMethod === '7-tap') {
        const badge = screen.getByTestId('atlas-version-easter-egg');
        for (let t = 1; t < ADULT_EASTER_EGG_TAP_COUNT; t++) {
          fireEvent.click(badge);
          expect(
            screen.queryByRole('dialog', { name: 'After-Hours Atlas 18+ Confirmation' })
          ).not.toBeInTheDocument();
        }
        fireEvent.click(badge);
      } else {
        expect(ADULT_EASTER_EGG_CODES).toContain(spec.gateMethod);
        fireEvent.click(screen.getByRole('button', { name: /Atlas Keycode/i }));
        fireEvent.change(screen.getByLabelText('Atlas Keycode'), {
          target: { value: spec.gateMethod },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      }

      const confirmDialog = screen.getByRole('dialog', {
        name: 'After-Hours Atlas 18+ Confirmation',
      });
      const trackBtn = confirmDialog
        .querySelector(`svg[data-flag="${spec.track}"]`)
        ?.closest('button');
      expect(trackBtn, `Missing 18+ track button for ${spec.track}`).toBeTruthy();
      fireEvent.click(trackBtn!);
      fireEvent.click(
        within(confirmDialog).getByRole('button', {
          name: /I am 18\+.*Unlock After-Hours Atlas/i,
        })
      );
      expect(onCloseModal).toHaveBeenCalled();
      unmountModal();
      cleanup();

      const afterUnlock = loadVaultFromStorage();
      const adultProfile = afterUnlock.profiles.find((p) => p.id === afterUnlock.activeProfileId)!;
      expect(adultProfile.adultModeUnlocked).toBe(true);
      expect(adultProfile.adultModeActive).toBe(true);
      expect(adultProfile.activeLanguage).toBe(spec.track);
      expect(adultProfile.lastBaseLanguage).toBe(spec.baseReturnLang);

      // 2. Slang / contraction / closed-compound forgiving grading
      for (const sample of spec.slangSamples) {
        const res = gradeAnswer({
          submitted: sample.submitted,
          expected: sample.expected,
          language: spec.track,
        });
        expect(
          res.isCorrect,
          `${spec.track}: slang grading failed for "${sample.submitted}" vs "${sample.expected}"`
        ).toBe(true);
        expect(res.heartPenalty).toBe(0);
      }

      // 3. Full A1 -> C1_C2 traversal (16 units, 112 nodes) verifying both directions & SayItNormallyButton
      const course = getAdultCourse(spec.track);
      expect(course.units).toHaveLength(16);
      const allNodes: MapNode[] = course.units.flatMap((u) => u.nodes);
      expect(allNodes).toHaveLength(112);

      const observedDirections = new Set<WordBankExercise['direction']>();
      let sayItNormallyCount = 0;

      for (let i = 0; i < allNodes.length; i++) {
        const node = allNodes[i];
        const seen =
          loadVaultFromStorage().profiles.find((p) => p.id === adultProfile.id)
            ?.languageProgress[spec.track]?.seenExerciseIds ?? [];
        const exercises = getPlayableNodeExercises(spec.track, node.id, seen, false);
        const sampleCheck = i === 0 || i === 35 || i === 70 || i === 111;

        const { unmount } = render(<LessonArena node={node} language={spec.track} onExit={vi.fn()} />);
        if (node.nodeType === 'chest') {
          fireEvent.click(requireButtonByText('Open Treasure Chest!'));
          fireEvent.click(requireButtonByText('Claim & Return to Atlas'));
        } else {
          for (const ex of exercises) {
            playExerciseInDom(ex, {
              language: spec.track,
              verifyTapToPeek: sampleCheck,
              verifySayItNormally: sampleCheck,
              onObservedDirection: (d) => observedDirections.add(d),
              onObservedSayItNormally: () => {
                sayItNormallyCount += 1;
              },
            });
          }
          expect(document.body.textContent ?? '').toContain(`${node.title} Complete!`);
          fireEvent.click(requireButtonByText('Return to Atlas Map'));
        }
        act(() => {
          vi.clearAllTimers();
        });
        unmount();
        cleanup();
      }

      expect(observedDirections.has('to_english')).toBe(true);
      expect(observedDirections.has('to_foreign')).toBe(true);
      expect(sayItNormallyCount).toBeGreaterThanOrEqual(3);

      // 4. 1-tap Study Break return to lastBaseLanguage via TopHud button
      const hud = render(
        <TopHud
          onOpenProfileModal={vi.fn()}
          onOpenArcade={vi.fn()}
          canInstallApp={false}
          onInstallApp={vi.fn()}
        />
      );
      const returnBtn = screen.getByTestId('return-to-kid-atlas-btn');
      fireEvent.click(returnBtn);
      hud.unmount();
      cleanup();

      const afterBreak = loadVaultFromStorage().profiles.find((p) => p.id === adultProfile.id)!;
      expect(afterBreak.adultModeActive).toBe(false);
      expect(afterBreak.activeLanguage).toBe(spec.baseReturnLang);

      // BUG-015: TargetPromptBar plainOpen ("Say It Normally") must auto-reset when targetItem.id changes
      if (spec.track === 'ebonics') {
        vaultActions.switchProfile(adultProfile.id);
        vaultActions.setAdultModeActive(true);
        vaultActions.setActiveLanguage('ebonics');
        const lexicon = getArcadeLexicon('ebonics', [], 0, 'sprout');
        expect(lexicon.length).toBeGreaterThanOrEqual(2);
        const { rerender, unmount: unmountBar } = render(
          <TargetPromptBar
            label="Catch:"
            targetItem={lexicon[0]}
            language="ebonics"
            isCompact={false}
          />
        );
        const plainBtn = document.querySelector<HTMLButtonElement>('[data-testid="arcade-say-it-normally-btn"]');
        expect(plainBtn).not.toBeNull();
        fireEvent.click(plainBtn!);
        expect(plainBtn!.getAttribute('aria-expanded')).toBe('true');
        rerender(
          <TargetPromptBar
            label="Catch:"
            targetItem={lexicon[1]}
            language="ebonics"
            isCompact={false}
          />
        );
        const plainBtnAfter = document.querySelector<HTMLButtonElement>('[data-testid="arcade-say-it-normally-btn"]');
        expect(
          plainBtnAfter?.getAttribute('aria-expanded'),
          'BUG-015: TargetPromptBar left Say It Normally drawer open after targetItem.id changed'
        ).toBe('false');
        unmountBar();
        cleanup();
      }
    }, 120_000);
  }

  it('[PT-040] kid-leo: enforces strict Kid-Safety Quarantine with 0 Adult UI visibility and 0 Adult vocab bleed', () => {
    vaultActions.switchProfile('kid-leo');
    vaultActions.setActiveLanguage('ebonics');
    vaultActions.setAdultModeActive(true);
    const leo = loadVaultFromStorage().profiles.find((p) => p.id === 'kid-leo')!;
    expect(isDefaultKidProfileId(leo.id)).toBe(true);
    assertProfileQuarantinedFromAdult(leo);
  });

  it('[PT-041] kid-maya: enforces strict Kid-Safety Quarantine with 0 Adult UI visibility and 0 Adult vocab bleed', () => {
    vaultActions.switchProfile('kid-maya');
    vaultActions.setActiveLanguage('corp_trades');
    vaultActions.setAdultModeActive(true);
    const maya = loadVaultFromStorage().profiles.find((p) => p.id === 'kid-maya')!;
    expect(isDefaultKidProfileId(maya.id)).toBe(true);
    assertProfileQuarantinedFromAdult(maya);
  });

  it('[PT-042] newly created kid profile: enforces strict Kid-Safety Quarantine with 0 Adult UI visibility and 0 Adult vocab bleed', () => {
    const created = vaultActions.createProfile({
      name: 'Sammy',
      avatarId: 'luca_captain',
      bannerColor: '#059669',
      activeLanguage: 'ja',
    });
    vaultActions.setActiveLanguage('stoner_tactical');
    vaultActions.setAdultModeActive(true);
    const sammy = loadVaultFromStorage().profiles.find((p) => p.id === created.id)!;
    assertProfileQuarantinedFromAdult(sammy);
  });

  it('[PT-043] cross-profile Adult/Kid switching automatically disarms Adult Mode and keeps kid profiles untouched', async () => {
    const adult = vaultActions.unlockAdultMode({
      adultProfileName: 'Night Owl',
      initialTrack: 'south_genz',
    });
    expect(adult.adultModeActive).toBe(true);
    expect(adult.activeLanguage).toBe('south_genz');

    // Switch to Leo -> Adult Mode disarmed cleanly across vault, Leo remains strictly Spanish kid profile
    vaultActions.switchProfile('kid-leo');
    let vault = loadVaultFromStorage();
    expect(vault.activeProfileId).toBe('kid-leo');
    expect(vault.profiles.find((p) => p.id === 'kid-leo')?.activeLanguage).toBe('es');
    expect(vault.profiles.find((p) => p.id === adult.id)?.adultModeActive).toBe(false);
    expect(vault.profiles.find((p) => p.id === adult.id)?.activeLanguage).toBe('es');

    // Re-arm Adult Mode, enter App, switch to Maya via ProfileVaultModal -> UI hides Adult immediately
    vaultActions.switchProfile(adult.id);
    vaultActions.setAdultModeActive(true);
    vaultActions.setActiveLanguage('cali_country');

    const { unmount } = render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('return-to-kid-atlas-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Switch kid profile/i }));
    const dialog = screen.getByRole('dialog', { name: 'Explorer Profiles and Save Vault' });
    const dlgMaya = within(dialog)
      .getAllByRole('button', { name: /Maya/i })
      .find((b) => !/delete/i.test(b.getAttribute('aria-label') ?? b.textContent ?? ''))!;
    fireEvent.click(dlgMaya);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close profiles modal' }));

    await waitFor(() => {
      expect(screen.queryByTestId('return-to-kid-atlas-btn')).not.toBeInTheDocument();
    });
    vault = loadVaultFromStorage();
    expect(vault.activeProfileId).toBe('kid-maya');
    expect(vault.profiles.find((p) => p.id === 'kid-maya')?.activeLanguage).toBe('fr');
    expect(vault.profiles.find((p) => p.id === adult.id)?.adultModeActive).toBe(false);
    unmount();
  });

  it('[PT-044] lazy mashup hydration race checks: concurrent ensureAdultCourseLoaded + ensureAllAdultCoursesLoaded + registry reactivity', async () => {
    const listener = vi.fn();
    const unsub = subscribeAdultRegistry(listener);
    const v0 = getAdultRegistryVersion();

    // Fire overlapping concurrent loads for all 5 Vol.2 mashups simultaneously
    const [results, allResult] = await Promise.all([
      Promise.all(
        ADULT_MASHUP_LANGUAGES.map((track) =>
          Promise.all([ensureAdultCourseLoaded(track), ensureAdultCourseLoaded(track)])
        )
      ),
      Promise.all([ensureAllAdultCoursesLoaded(), ensureAllAdultCoursesLoaded()]),
    ]);

    expect(allResult).toHaveLength(2);
    results.forEach(([a, b], idx) => {
      const code = ADULT_MASHUP_LANGUAGES[idx];
      expect(isAdultTrackLoaded(code)).toBe(true);
      expect(a.units).toHaveLength(16);
      expect(b.units).toHaveLength(16);
      expect(a).toBe(b);
    });
    expect(getAdultRegistryVersion()).toBeGreaterThanOrEqual(v0);
    unsub();

    // Activate Adult Mode on a mashup and verify AdventureMap & PhrasebookVault render hydrated units without fallback emptiness
    vaultActions.unlockAdultMode({
      adultProfileName: 'Hydration Racer',
      initialTrack: 'midwest_northeast',
    });
    const { unmount } = render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('tablist', { name: 'Unit quick-jump tabs' })).toBeInTheDocument();
    });
    expect(screen.getAllByRole('tab')).toHaveLength(16);
    unmount();
  });

  for (const [ptId, rtlLang] of [
    ['PT-045', 'ar'],
    ['PT-046', 'arz'],
  ] as const) {
    it(`[${ptId}] ${rtlLang} RTL deep-dive: dir="rtl" across Map, LessonArena, Tap-to-Peek, ContextCloze, MiniStory, Boss recovery & Arcade`, () => {
      vi.useFakeTimers();
      vaultActions.resetVaultToDefaults();
      vaultActions.setActiveLanguage(rtlLang);

      const course = COURSES[rtlLang];
      expect(course.meta.dir).toBe('rtl');
      const profile = loadVaultFromStorage().profiles[0];

      // 1. Map RTL rendering
      const mapRender = render(
        <AdventureMap
          course={course}
          progress={profile.languageProgress[rtlLang]}
          equippedCosmetics={profile.equippedCosmetics}
          onSelectNode={vi.fn()}
          onSelectUnit={vi.fn()}
        />
      );
      expect(document.body.textContent ?? '').toContain(course.meta.landTitle);
      mapRender.unmount();
      cleanup();

      // 2. Traverse Unit 1 (all 7 nodes) + Unit 16 Boss + sample ContextCloze & MiniStory with RTL assertions
      const unit1Nodes = course.units[0].nodes;
      const unit16Nodes = course.units[15].nodes;
      for (const node of [...unit1Nodes, unit16Nodes[6]]) {
        const exercises = getPlayableNodeExercises(rtlLang, node.id, [], false);
        const { container, unmount } = render(
          <LessonArena node={node} language={rtlLang} onExit={vi.fn()} />
        );
        if (node.nodeType === 'chest') {
          fireEvent.click(requireButtonByText('Open Treasure Chest!'));
          fireEvent.click(requireButtonByText('Claim & Return to Atlas'));
        } else {
          expect(container.querySelectorAll('[dir="rtl"]').length).toBeGreaterThan(0);
          for (const ex of exercises) {
            playExerciseInDom(ex, {
              language: rtlLang,
              verifyTapToPeek: true,
              verifyAllListenSpeeds: ex.type === 'listen_decode',
            });
          }
          fireEvent.click(requireButtonByText('Return to Atlas Map'));
        }
        act(() => {
          vi.clearAllTimers();
        });
        unmount();
        cleanup();
      }

      // 3. Verify Boss Gauntlet Turn 2 preservation across 0-heart Sky-Catcher recovery in RTL
      vaultActions.resetVaultToDefaults();
      vaultActions.setActiveLanguage(rtlLang);
      const bossNode = course.units[0].nodes.find((n) => n.nodeType === 'boss')!;
      const bossEx = getPlayableNodeExercises(rtlLang, bossNode.id, [], false)[0] as BossGauntletExercise;
      for (let i = 0; i < 4; i++) {
        vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
      }
      const { unmount: unmountBoss } = render(
        <LessonArena node={bossNode} language={rtlLang} onExit={vi.fn()} />
      );
      const turn1 = bossEx.turns[0];
      if (turn1.mode === 'choice') {
        fireEvent.click(
          screen
            .getAllByRole('button', { name: turn1.expectedAnswer })
            .find((b) => !b.classList.contains('tap-hint-token-btn'))!
        );
      } else {
        clickTokensInTray(turn1.targetTokens ?? []);
      }
      fireEvent.click(requireButtonByText('Send Reply!'));
      fireEvent.click(requireButtonByText('Next Turn'));
      expect(screen.getByText(`Turn 2/${bossEx.turns.length}`)).toBeInTheDocument();

      const turn2 = bossEx.turns[1];
      if (turn2.mode === 'choice') {
        const wrong = (turn2.choices ?? []).find((c) => c !== turn2.expectedAnswer)!;
        fireEvent.click(
          screen
            .getAllByRole('button', { name: wrong })
            .find((b) => !b.classList.contains('tap-hint-token-btn'))!
        );
      } else {
        clickTokensInTray([(turn2.distractorTokens ?? [])[0] ?? 'خطأ']);
      }
      fireEvent.click(requireButtonByText('Send Reply!'));
      const modal = screen.getByRole('dialog', { name: 'Recharge Hearts' });
      fireEvent.click(
        within(modal).getByRole('button', {
          name: /Play Sky-Catcher Fiesta to Recharge Hearts!/i,
        })
      );
      fireEvent.click(screen.getByRole('button', { name: /Claim \+\d+ Hearts/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Resume Lesson!' }));
      expect(screen.getByText(`Turn 2/${bossEx.turns.length}`)).toBeInTheDocument();
      act(() => {
        vi.clearAllTimers();
      });
      unmountBoss();
      cleanup();

      // 4. Verify Arcade RTL rendering
      const { container: arcContainer, unmount: unmountArc } = render(
        <ArcadeHub onExitToMap={vi.fn()} />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Play Sky-Catcher' }));
      fireEvent.click(screen.getByRole('button', { name: /Start 45s Fiesta!/i }));
      expect(arcContainer.querySelectorAll('[dir="rtl"]').length).toBeGreaterThan(0);
      act(() => {
        vi.clearAllTimers();
      });
      unmountArc();
      cleanup();
    }, 30_000);
  }
});
