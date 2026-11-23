import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SPEECH_LOCALE_MAP, stopSpeech } from '../../src/audio';
import { LessonArena } from '../../src/components/lesson/LessonArena';
import { LeagueAndBadges } from '../../src/components/meta/LeagueAndBadges';
import { PhrasebookVault } from '../../src/components/meta/PhrasebookVault';
import {
  applyDailyPracticeStreak,
  calculateLessonRewards,
  gradeAnswer,
  resolveFreeRecallHint,
  resolveLeagueTierForXp,
} from '../../src/core';
import { buildTapHintsFromExample } from '../../src/components/lesson/lessonHelpers';
import {
  COURSES,
  buildTierCheckpointNode,
  getPlayableNodeExercises,
} from '../../src/curriculum';
import { loadVaultFromStorage, vaultActions } from '../../src/store/useVaultStore';
import {
  FREE_RECALL_BONUS_GEMS,
  FREE_RECALL_BONUS_XP,
  LANGUAGE_LIST,
  MAX_HEART_CONTAINERS,
  XP_BOOSTER_CHARGES_PER_BUY,
  type BaseLanguageCode,
  type LessonExercise,
  type MapNode,
  type ProficiencyTier,
  type WordBankExercise,
} from '../../src/types/contracts';
import {
  clickTokensInTray,
  installMockSpeechSynthesis,
  playExerciseInDom,
  requireButtonByText,
} from './helpers';

interface ForgivingRecallSample {
  submitted: string;
  expected: string;
  accepted?: string[];
  expectAccentCoaching: boolean;
}

const FORGIVING_RECALL_SAMPLES: Record<BaseLanguageCode, ForgivingRecallSample> = {
  es: {
    submitted: 'Buenos dias',
    expected: '¡Buenos días!',
    expectAccentCoaching: true,
  },
  fr: {
    submitted: "l ' eau fraiche",
    expected: 'l’eau fraîche',
    expectAccentCoaching: true,
  },
  de: {
    submitted: 'Schoene Gruesse',
    expected: 'Schöne Grüße',
    expectAccentCoaching: true,
  },
  it: {
    submitted: "un ' amica caffe",
    expected: 'un’amica caffè',
    expectAccentCoaching: true,
  },
  pt: {
    submitted: 'maca e pao',
    expected: 'maçã e pão',
    expectAccentCoaching: true,
  },
  en: {
    submitted: '“It’s a bright morning!”',
    expected: "It's a bright morning!",
    expectAccentCoaching: false,
  },
  zh: {
    submitted: '我 喜 欢 苹 果',
    expected: '我喜欢苹果',
    accepted: ['Wǒ xǐhuan píngguǒ'],
    expectAccentCoaching: false,
  },
  ja: {
    submitted: 'お や す み 友 達',
    expected: 'おやすみ友達',
    accepted: ['oyasumi tōmodachi'],
    expectAccentCoaching: false,
  },
  hi: {
    submitted: 'चांद और बडा',
    expected: 'चाँद और बड़ा',
    expectAccentCoaching: true,
  },
  bn: {
    submitted: 'চাংদ ও বড',
    expected: 'চাঁদ ও বড়',
    expectAccentCoaching: true,
  },
  ar: {
    submitted: 'مرحبا اهلا بك',
    expected: 'مَرْحَباً أَهْلاً بِكَ',
    expectAccentCoaching: true,
  },
  arz: {
    submitted: 'ازيك يا قهوه',
    expected: 'إزيك يا قهوة',
    expectAccentCoaching: true,
  },
  ru: {
    submitted: 'теплая елка',
    expected: 'тёплая ёлка',
    expectAccentCoaching: true,
  },
  id: {
    submitted: 'terima kasih teman-teman',
    expected: 'Terima kasih, teman-teman!',
    expectAccentCoaching: false,
  },
  vi: {
    submitted: 'xin chao ban',
    expected: 'Xin chào bạn!',
    expectAccentCoaching: true,
  },
  sw: {
    submitted: '“Habari gani?”',
    expected: 'Habari gani?',
    expectAccentCoaching: false,
  },
};

function makeWrongLessonNode(lang: BaseLanguageCode): MapNode {
  const firstLesson = COURSES[lang].units[0].nodes.find((n) => n.nodeType === 'lesson')!;
  const wb = firstLesson.exercises.find(
    (ex): ex is WordBankExercise => ex.type === 'word_bank'
  ) ?? {
    id: `${lang}-wrong-wb`,
    type: 'word_bank' as const,
    direction: 'to_foreign' as const,
    promptText: 'Test prompt',
    promptTokens: [],
    targetTokens: ['uno', 'dos'],
    distractorTokens: ['tres'],
    expectedSentence: 'uno dos',
    acceptedSentences: ['uno dos'],
    phoneticHint: 'test',
    vocabIds: [],
  };

  return {
    id: `${lang}-heart-drain-node`,
    unitId: firstLesson.unitId,
    order: 1,
    nodeType: 'lesson',
    title: `${lang.toUpperCase()} Heart Drain Trial`,
    subtitle: 'Adversarial heart drain & recovery check',
    xpReward: 25,
    gemReward: 10,
    exercises: [
      {
        ...wb,
        id: `${lang}-drain-ex-1`,
        distractorTokens: wb.distractorTokens.length > 0 ? wb.distractorTokens : ['wrongtok'],
      },
      {
        ...wb,
        id: `${lang}-drain-ex-2`,
      },
    ],
    rewardVocabIds: [],
  };
}

describe('Cohort A [PT-001..PT-032]: 16 Base-Language A1->C2 Campaigns, Checkpoints & Economy', () => {
  const originalSpeechSynthesis = window.speechSynthesis;
  const originalUtterance = globalThis.SpeechSynthesisUtterance;

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
  });

  LANGUAGE_LIST.forEach((lang, index) => {
    const ptNum = String(index + 1).padStart(3, '0');

    it(`[PT-${ptNum}] ${lang}: traverses A1 U1N1 -> C1_C2 U16N112 linearly with all exercise types, Tap-to-Peek, 0.95x/0.65x/1.12x Listen & Decode, Free-Recall, Phrasebook 150+, XP/Gem/Combo, Leagues & Badges`, () => {
      vi.useFakeTimers();
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const locale = SPEECH_LOCALE_MAP[lang][0];
      const speechMock = installMockSpeechSynthesis({
        voices: [
          {
            name: `Mock ${locale}`,
            lang: locale,
            localService: true,
            default: true,
            voiceURI: locale,
          } as SpeechSynthesisVoice,
        ],
        autoComplete: 'end',
      });

      vaultActions.resetVaultToDefaults();
      vaultActions.setActiveLanguage(lang);

      const course = COURSES[lang];
      expect(course.units).toHaveLength(16);
      const allNodes = course.units.flatMap((u) => u.nodes);
      expect(allNodes).toHaveLength(112);

      // Verify CEFR progression A1 -> C1_C2 across the 16 units
      expect(course.units[0].proficiencyTier).toBe('A1');
      expect(course.units[4].proficiencyTier).toBe('A2');
      expect(course.units[8].proficiencyTier).toBe('B1');
      expect(course.units[11].proficiencyTier).toBe('B2');
      expect(course.units[15].proficiencyTier).toBe('C1_C2');

      const observedTypes = new Set<LessonExercise['type']>();
      const observedDirections = new Set<WordBankExercise['direction']>();
      const observedListenSpeeds = new Set<'normal' | 'slow' | 'fluent'>();
      let freeRecallSolvedCount = 0;
      let tapToPeekChecks = 0;
      let chestsClaimed = 0;
      let mathVerifiedLessons = 0;

      for (let nodeIdx = 0; nodeIdx < allNodes.length; nodeIdx++) {
        const node = allNodes[nodeIdx];
        const profileBefore = loadVaultFromStorage().profiles[0];
        const seenBefore = profileBefore.languageProgress[lang].seenExerciseIds ?? [];
        const expectedExercises = getPlayableNodeExercises(lang, node.id, seenBefore, false);

        const isSampledCheckNode = nodeIdx === 0 || nodeIdx === 56 || nodeIdx === 105;
        let usedFreeRecallInThisNode = false;

        const onExit = vi.fn();
        const { unmount } = render(<LessonArena node={node} language={lang} onExit={onExit} />);

        if (node.nodeType === 'chest') {
          const gemsBefore = profileBefore.gems;
          const xpBefore = profileBefore.totalXp;
          fireEvent.click(requireButtonByText('Open Treasure Chest!'));
          expect(document.body.textContent ?? '').toContain(`+${node.gemReward} Gems`);
          fireEvent.click(requireButtonByText('Claim & Return to Atlas'));
          expect(onExit).toHaveBeenCalledTimes(1);
          const afterChest = loadVaultFromStorage().profiles[0];
          expect(afterChest.gems).toBe(gemsBefore + node.gemReward);
          expect(afterChest.totalXp).toBe(xpBefore + node.xpReward);
          chestsClaimed += 1;
        } else {
          const xpBefore = profileBefore.totalXp;
          const gemsBefore = profileBefore.gems;
          let expectedCombo = 0;
          let freeRecallInNode = 0;

          for (const ex of expectedExercises) {
            const tryFreeRecall =
              freeRecallSolvedCount < 5 &&
              ex.type === 'word_bank' &&
              !(lang === 'en' && ex.direction === 'to_english') &&
              !usedFreeRecallInThisNode;

            playExerciseInDom(ex, {
              language: lang,
              verifyTapToPeek: isSampledCheckNode || tapToPeekChecks < 8,
              verifyAllListenSpeeds: observedListenSpeeds.size < 3,
              useFreeRecall: tryFreeRecall,
              useFreeRecallOnBoss: node.nodeType === 'boss' && nodeIdx === 111,
              verifySayItNormally: isSampledCheckNode,
              onObservedType: (t) => observedTypes.add(t),
              onObservedDirection: (d) => observedDirections.add(d),
              onObservedListenSpeed: (s) => observedListenSpeeds.add(s),
              onObservedFreeRecall: () => {
                freeRecallSolvedCount += 1;
                freeRecallInNode += 1;
                usedFreeRecallInThisNode = true;
              },
              onObservedTapToPeek: () => {
                tapToPeekChecks += 1;
              },
            });

            if (ex.type !== 'pair_match_rush' && ex.type !== 'mini_story' && ex.type !== 'boss_gauntlet') {
              expectedCombo += 1;
            }
          }

          expect(document.body.textContent ?? '').toContain(`${node.title} Complete!`);

          // Verify XP / Gem / Combo math on clean standard lessons
          if (
            node.nodeType === 'lesson' &&
            expectedExercises.every(
              (e) => e.type !== 'pair_match_rush' && e.type !== 'boss_gauntlet'
            )
          ) {
            const profileAfterNode = loadVaultFromStorage().profiles[0];
            const expectedMath = calculateLessonRewards({
              baseXp: node.xpReward,
              baseGems: node.gemReward,
              maxCombo: expectedCombo,
              mistakesCount: 0,
              freeRecallCount: freeRecallInNode,
            });
            expect(profileAfterNode.totalXp - xpBefore).toBe(expectedMath.xpEarned);
            expect(profileAfterNode.gems - gemsBefore).toBe(expectedMath.gemsEarned);
            mathVerifiedLessons += 1;
          }

          fireEvent.click(requireButtonByText('Return to Atlas Map'));
          expect(onExit).toHaveBeenCalledTimes(1);
        }

        act(() => {
          vi.clearAllTimers();
        });
        unmount();
        cleanup();
      }

      expect(mathVerifiedLessons).toBeGreaterThan(0);
      expect(observedTypes.has('discovery_card')).toBe(true);
      expect(observedTypes.has('word_bank')).toBe(true);
      expect(observedTypes.has('listen_decode')).toBe(true);
      expect(observedTypes.has('pair_match_rush')).toBe(true);
      expect(observedTypes.has('context_cloze')).toBe(true);
      expect(observedTypes.has('mini_story')).toBe(true);
      expect(observedTypes.has('boss_gauntlet')).toBe(true);
      expect(observedDirections.has('to_english')).toBe(true);
      expect(observedDirections.has('to_foreign')).toBe(true);
      expect(observedListenSpeeds).toEqual(new Set(['normal', 'slow', 'fluent']));
      expect(tapToPeekChecks).toBeGreaterThanOrEqual(4);
      expect(freeRecallSolvedCount).toBeGreaterThanOrEqual(2);
      expect(chestsClaimed).toBeGreaterThanOrEqual(16);

      // Verify exact Web Speech API rates recorded by Listen & Decode speeds
      const recordedRates = new Set(speechMock.utterances.map((u) => u.rate));
      expect(recordedRates.has(0.95)).toBe(true);
      expect(recordedRates.has(0.65)).toBe(true);
      expect(recordedRates.has(1.12)).toBe(true);

      const finishedProfile = loadVaultFromStorage().profiles[0];
      expect(finishedProfile.languageProgress[lang].completedNodeIds).toHaveLength(112);
      expect(finishedProfile.languageProgress[lang].unlockedVocabIds.length).toBeGreaterThanOrEqual(
        150
      );
      expect(finishedProfile.stats.turtlePlaysCount).toBeGreaterThanOrEqual(1);
      expect(finishedProfile.stats.fluentPlaysCount ?? 0).toBeGreaterThanOrEqual(1);
      expect(finishedProfile.stats.freeRecallSolved ?? 0).toBeGreaterThanOrEqual(2);

      // Verify 150+ Phrasebook stickers in DOM
      const pb = render(<PhrasebookVault />);
      expect(screen.getByRole('region', { name: 'Living Phrasebook' })).toHaveTextContent(
        new RegExp(`${finishedProfile.languageProgress[lang].unlockedVocabIds.length}\\s*/\\s*\\d+ Stickers Collected`)
      );
      pb.unmount();
      cleanup();

      // Verify Leagues & Badges UI
      const expectedTier = resolveLeagueTierForXp(finishedProfile.weeklyXp, finishedProfile.leagueTier);
      expect(finishedProfile.leagueTier).toBe(expectedTier);
      for (const requiredBadge of [
        'first_hello',
        'phrasebook_collector',
        'boss_befriender',
        'chest_hunter',
        'story_reader',
        'storyweaver_b1',
        'diplomat_b2',
        'polyglot_laureate_c2',
        'starlight_master',
        'laureate_legend_xp',
      ] as const) {
        expect(finishedProfile.badges, `${lang} missing badge ${requiredBadge}`).toContain(
          requiredBadge
        );
      }

      const lb = render(<LeagueAndBadges />);
      expect(screen.getByRole('region', { name: 'Leagues and Badges' })).toHaveTextContent(
        `${finishedProfile.weeklyXp} XP`
      );
      expect(screen.getByText(/Expedition Badges/i)).toBeInTheDocument();
      lb.unmount();
      cleanup();

      expect(errSpy, `${lang} console.error: ${JSON.stringify(errSpy.mock.calls)}`).not.toHaveBeenCalled();
      expect(warnSpy, `${lang} console.warn: ${JSON.stringify(warnSpy.mock.calls)}`).not.toHaveBeenCalled();

      // Verified Sprint 1 Curriculum & Tap-to-Peek Bug Checks [BUG-007, BUG-008, BUG-009]
      if (lang === 'fr') {
        const card = COURSES.fr.units[0].vocabCards.find((c) => c.id === 'fr-u1-c5')!;
        const hints = buildTapHintsFromExample(
          card.exampleForeign,
          card.exampleEnglish,
          card.examplePhonetic,
          card
        );
        const silHint = hints.find((h) => /s['’]il/i.test(h.surface));
        expect(
          silHint?.translation,
          'BUG-007: fr Tap-to-Peek must preserve internal apostrophe for glossary lookup ("if it") instead of falling back to full sentence'
        ).toBe('if it');
      }
      if (lang === 'ru') {
        const card = COURSES.ru.units[0].vocabCards.find((c) => c.id === 'ru-u1-c9')!;
        const hints = buildTapHintsFromExample(
          card.exampleForeign,
          card.exampleEnglish,
          card.examplePhonetic,
          card
        );
        expect(
          hints.some((h) => h.surface.trim() === '—'),
          'BUG-007: ru standalone em-dash "—" must not expose a clickable full-sentence hint button'
        ).toBe(false);
      }
      if (lang === 'pt' || lang === 'arz') {
        for (const u of COURSES[lang].units) {
          for (const n of u.nodes) {
            for (const ex of n.exercises) {
              if (ex.type === 'word_bank') {
                const targetSet = new Set(ex.targetTokens.map((t) => t.trim().toLowerCase()));
                for (const d of ex.distractorTokens) {
                  expect(
                    targetSet.has(d.trim().toLowerCase()),
                    `BUG-008: ${ex.id} has duplicate/case-colliding distractor "${d}"`
                  ).toBe(false);
                }
              } else if (ex.type === 'boss_gauntlet') {
                for (const turn of ex.turns) {
                  if (!turn.targetTokens || !turn.distractorTokens) continue;
                  const targetSet = new Set(turn.targetTokens.map((t) => t.trim().toLowerCase()));
                  for (const d of turn.distractorTokens) {
                    expect(
                      targetSet.has(d.trim().toLowerCase()),
                      `BUG-008: ${turn.id} has duplicate/case-colliding distractor "${d}"`
                    ).toBe(false);
                  }
                }
              }
            }
          }
        }
      }
      if (lang === 'ar') {
        const u14n4 = COURSES.ar.units[13].nodes[3];
        const cloze = u14n4.exercises.find((e) => e.type === 'context_cloze');
        expect(cloze).toBeDefined();
        if (cloze && cloze.type === 'context_cloze') {
          expect(
            cloze.sentenceBeforeBlank.endsWith(' و'),
            'BUG-009: ar-u14-n4 ContextCloze must not sever bound proclitic "و" outside expectedBlank'
          ).toBe(false);
        }
      }
    }, 120_000);
  });

  LANGUAGE_LIST.forEach((lang, index) => {
    const ptNum = String(index + 17).padStart(3, '0');

    it(`[PT-${ptNum}] ${lang}: Tier Checkpoints A2..C1_C2, forgiving Free-Recall grading, 0-heart recovery (Sky-Catcher + Elixir), 8 Heart Crystals, 2x XP Booster & Streak Freeze`, () => {
      vi.useFakeTimers();

      // 1. All 4 Tier Placement Checkpoints (A2, B1, B2, C1_C2)
      const unlockableTiers: readonly Exclude<ProficiencyTier, 'A1'>[] = [
        'A2',
        'B1',
        'B2',
        'C1_C2',
      ];
      const inflatedCheckpoints: string[] = [];
      for (const tier of unlockableTiers) {
        vaultActions.resetVaultToDefaults();
        vaultActions.setActiveLanguage(lang);
        const cpNode = buildTierCheckpointNode(lang, tier);
        expect(cpNode.checkpointTargetTier).toBe(tier);

        const onExit = vi.fn();
        const { unmount } = render(<LessonArena node={cpNode} language={lang} onExit={onExit} />);
        for (const ex of cpNode.exercises) {
          playExerciseInDom(ex, { language: lang });
        }
        expect(document.body.textContent ?? '').toContain(`${cpNode.title} Complete!`);
        expect(document.body.textContent ?? '').toContain('Tier Unlocked:');

        const afterCp = loadVaultFromStorage().profiles[0];
        expect(afterCp.languageProgress[lang].unlockedTiers).toContain(tier);
        expect(afterCp.stats.checkpointsPassed).toBe(1);
        if (afterCp.stats.lessonsCompleted !== 0) {
          inflatedCheckpoints.push(`${tier}:lessonsCompleted=${afterCp.stats.lessonsCompleted}`);
        }
        fireEvent.click(requireButtonByText('Return to Atlas Map'));
        expect(onExit).toHaveBeenCalledTimes(1);
        act(() => {
          vi.clearAllTimers();
        });
        unmount();
        cleanup();
      }

      // 2. Forgiving Free-Recall grading (gradeAnswer + LessonArena Type-Instead)
      const sample = FORGIVING_RECALL_SAMPLES[lang];
      const gradeRes = gradeAnswer({
        submitted: sample.submitted,
        expected: sample.expected,
        accepted: sample.accepted,
        language: lang,
      });
      expect(gradeRes.isCorrect, `${lang} forgiving grade failed for "${sample.submitted}"`).toBe(true);
      expect(gradeRes.heartPenalty).toBe(0);
      if (sample.expectAccentCoaching) {
        expect(gradeRes.accentCoaching, `${lang} expected accentCoaching`).toBeDefined();
      }

      // Verify in LessonArena DOM that Type-Instead yields heartPenalty: 0 and coaching banner
      vaultActions.resetVaultToDefaults();
      vaultActions.setActiveLanguage(lang);
      const recallNode: MapNode = {
        id: `${lang}-forgiving-recall-node`,
        unitId: `${lang}-u1`,
        order: 1,
        nodeType: 'lesson',
        title: `${lang.toUpperCase()} Forgiving Recall`,
        subtitle: 'Free-Recall forgiving test',
        xpReward: 20,
        gemReward: 5,
        rewardVocabIds: [],
        exercises: [
          {
            id: `${lang}-wb-forgiving`,
            type: 'word_bank',
            direction: 'to_foreign',
            promptText: 'Forgiving recall check',
            promptTokens: [],
            targetTokens: [sample.expected],
            distractorTokens: [],
            expectedSentence: sample.expected,
            acceptedSentences: [sample.expected, ...(sample.accepted ?? [])],
            phoneticHint: 'check',
            vocabIds: [],
          },
        ],
      };

      const { unmount: unmountRecall } = render(
        <LessonArena node={recallNode} language={lang} onExit={vi.fn()} />
      );
      fireEvent.click(screen.getByRole('button', { name: /Type Instead|Keyboard Free-Recall/i }));
      fireEvent.change(screen.getByLabelText('Type your translation'), {
        target: { value: sample.submitted },
      });
      fireEvent.click(requireButtonByText('Check'));
      expect(loadVaultFromStorage().profiles[0].hearts).toBe(5);
      if (sample.expectAccentCoaching) {
        expect(document.body.textContent ?? '').toMatch(/Accent Spotlight|Free-Recall \+ Accent/i);
      } else {
        expect(document.body.textContent ?? '').toContain('Free-Recall Ace!');
      }
      fireEvent.click(requireButtonByText('Continue'));
      const afterRecall = loadVaultFromStorage().profiles[0];
      expect(afterRecall.totalXp).toBe(25 + FREE_RECALL_BONUS_XP);
      expect(afterRecall.gems).toBe(80 + 7 + FREE_RECALL_BONUS_GEMS);
      act(() => {
        vi.clearAllTimers();
      });
      unmountRecall();
      cleanup();

      // 3. Draining hearts to 0 mid-lesson -> Recover via Sky-Catcher Fiesta AND via Heart Refill Elixir
      vaultActions.resetVaultToDefaults();
      vaultActions.setActiveLanguage(lang);
      // Leave 1 heart remaining
      for (let i = 0; i < 4; i++) {
        vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
      }
      expect(loadVaultFromStorage().profiles[0].hearts).toBe(1);

      const drainNode = makeWrongLessonNode(lang);
      const drainWb = drainNode.exercises[0] as WordBankExercise;
      const { unmount: unmountSky } = render(
        <LessonArena node={drainNode} language={lang} onExit={vi.fn()} />
      );
      clickTokensInTray([drainWb.distractorTokens[0]]);
      fireEvent.click(requireButtonByText('Check'));
      expect(loadVaultFromStorage().profiles[0].hearts).toBe(0);

      const modal = screen.getByRole('dialog', { name: 'Recharge Hearts' });
      fireEvent.click(
        within(modal).getByRole('button', {
          name: /Play Sky-Catcher Fiesta to Recharge Hearts!/i,
        })
      );
      fireEvent.click(screen.getByRole('button', { name: /Claim \+\d+ Hearts/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Resume Lesson!' }));
      expect(loadVaultFromStorage().profiles[0].hearts).toBeGreaterThan(0);
      act(() => {
        vi.clearAllTimers();
      });
      unmountSky();
      cleanup();

      // Now recover from 0 hearts via Heart Refill Elixir in Zero-Heart modal
      vaultActions.resetVaultToDefaults();
      vaultActions.setActiveLanguage(lang);
      // Put 1 elixir in pack while full hearts, then drain hearts to 0
      expect(vaultActions.buyHeartElixir()).toBe(true);
      expect(loadVaultFromStorage().profiles[0].heartElixirs).toBe(1);
      for (let i = 0; i < 5; i++) {
        vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
      }
      expect(loadVaultFromStorage().profiles[0].hearts).toBe(0);

      const { unmount: unmountElixir } = render(
        <LessonArena node={drainNode} language={lang} onExit={vi.fn()} />
      );
      const elixirModal = screen.getByRole('dialog', { name: 'Recharge Hearts' });
      fireEvent.click(
        within(elixirModal).getByRole('button', { name: /^Use Heart Refill Elixir/i })
      );
      const afterElixir = loadVaultFromStorage().profiles[0];
      expect(afterElixir.hearts).toBe(afterElixir.maxHearts);
      expect(afterElixir.heartElixirs).toBe(0);
      act(() => {
        vi.clearAllTimers();
      });
      unmountElixir();
      cleanup();

      // 4. Expand Heart Container Crystal to MAX_HEART_CONTAINERS (8) + 2x XP Starlight Booster + Streak Shield
      vaultActions.resetVaultToDefaults();
      vaultActions.setActiveLanguage(lang);
      // Grant enough gems via chest completion
      vaultActions.completeMapNode({
        language: lang,
        nodeId: `${lang}-gem-seed`,
        stars: 3,
        xpEarned: 20,
        gemsEarned: 500,
        unlockedVocabIds: [],
        maxCombo: 0,
      });

      for (let h = 5; h < MAX_HEART_CONTAINERS; h++) {
        expect(vaultActions.buyHeartCrystal()).toBe(true);
      }
      expect(vaultActions.buyHeartCrystal()).toBe(false); // capped at 8
      const afterCrystals = loadVaultFromStorage().profiles[0];
      expect(afterCrystals.maxHearts).toBe(8);
      expect(afterCrystals.badges).toContain('crystal_heart_guardian');

      // Buy 2x XP Starlight Booster (+3 charges) and verify 2x XP applied & decremented
      expect(vaultActions.buyXpBooster()).toBe(true);
      expect(loadVaultFromStorage().profiles[0].xpBoosterCharges).toBe(XP_BOOSTER_CHARGES_PER_BUY);
      const xpPreBoost = loadVaultFromStorage().profiles[0].totalXp;
      vaultActions.completeMapNode({
        language: lang,
        nodeId: `${lang}-boosted-node`,
        stars: 3,
        xpEarned: 30,
        gemsEarned: 5,
        unlockedVocabIds: [],
        maxCombo: 2,
      });
      const afterBoost = loadVaultFromStorage().profiles[0];
      expect(afterBoost.totalXp - xpPreBoost).toBe(60);
      expect(afterBoost.xpBoosterCharges).toBe(XP_BOOSTER_CHARGES_PER_BUY - 1);

      // Streak Freeze Shield consumption on 1 missed calendar day (diffDays === 2)
      let streakProfile = structuredClone(afterBoost);
      streakProfile.streakDays = 4;
      streakProfile.streakShields = 2;
      streakProfile.lastPracticeISO = '2026-11-10';
      streakProfile = applyDailyPracticeStreak(streakProfile, '2026-11-12');
      expect(streakProfile.streakDays).toBe(5);
      expect(streakProfile.streakShields).toBe(1);

      // BUG-004: zh/ja Pinyin & Romaji Free-Recall Hint Bar must accept valid romanized prefixes
      if (lang === 'zh') {
        const hintPlan = resolveFreeRecallHint({
          typedText: 'Ma',
          expected: '马特奥喜欢茶。',
          accepted: ['马特奥喜欢茶。', "Mǎtè'ào xǐhuan chá."],
          language: 'zh',
          tier: 1,
        });
        expect(
          hintPlan.hasWrongSuffix,
          'BUG-004: Mandarin Free-Recall Hint Bar flagged valid Pinyin prefix "Ma" as wrong'
        ).toBe(false);
        expect(hintPlan.validWordPrefixCount).toBeGreaterThanOrEqual(1);
      }
      if (lang === 'ja') {
        const hintPlan = resolveFreeRecallHint({
          typedText: 'Oya',
          expected: 'おやすみ友達',
          accepted: ['おやすみ友達', 'oyasumi tomodachi'],
          language: 'ja',
          tier: 1,
        });
        expect(hintPlan.hasWrongSuffix, 'BUG-004: Japanese Romaji prefix flagged wrong').toBe(false);
        expect(hintPlan.validWordPrefixCount).toBeGreaterThanOrEqual(1);
      }

      expect(
        inflatedCheckpoints,
        'BUG-011: clearing Tier Placement Checkpoints must not inflate stats.lessonsCompleted'
      ).toEqual([]);
    }, 30_000);
  });
});
