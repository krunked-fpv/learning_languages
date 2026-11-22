import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VOCAB_ILLUSTRATIONS } from '../src/art/VocabIllustration';
import { joinWordBankTokens } from '../src/components/lesson/lessonHelpers';
import { gradeAnswer, normalizeAnswer } from '../src/core';
import {
  COURSES,
  buildTierCheckpointNode,
  getArcadeLexicon,
  getCourse,
  getNodeById,
  getPlayableNodeExercises,
  getUnitById,
  getVocabCard,
} from '../src/curriculum';
import { segmentSentenceTokens } from '../src/curriculum/helpers';
import {
  ILLUSTRATION_KEYS,
  LANGUAGE_LIST,
  LANGUAGE_META,
  PROFICIENCY_TIERS,
  resolveUnitProficiencyTier,
  type ArcadeProficiencyTier,
  type ContextClozeExercise,
  type LanguageCode,
  type LessonExercise,
  type ProficiencyTier,
  type TapHintToken,
} from '../src/types/contracts';

const ROOT = resolve(__dirname, '..');
const UNICODE_FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]/u;
const BANNED_ALCOHOL_RE =
  /\b(wine|beer|vino|cerveza|bier|vin|birra|alcohol|champagne|cocktail|vodka|whiskey|tequila|pub|tavern)\b/i;

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

describe('Challenge 1: Curriculum Symmetry, Integrity, Safety & Art Coverage', () => {
  it('maps every single ILLUSTRATION_KEYS entry (112) in VOCAB_ILLUSTRATIONS with zero missing or extra keys', () => {
    const expectedKeys = new Set<string>(ILLUSTRATION_KEYS);
    const implKeys = Object.keys(VOCAB_ILLUSTRATIONS);
    expect(expectedKeys.size).toBe(112);
    expect(implKeys.length).toBe(expectedKeys.size);

    for (const key of ILLUSTRATION_KEYS) {
      expect(typeof VOCAB_ILLUSTRATIONS[key], `Missing VOCAB_ILLUSTRATIONS entry for "${key}"`).toBe('function');
    }
    for (const key of implKeys) {
      expect(expectedKeys.has(key), `Unexpected extra key "${key}" in VOCAB_ILLUSTRATIONS`).toBe(true);
    }
  });

  it('contains zero Unicode regional indicator flag emojis across src/, public/, tests/, index.html, and README.md', () => {
    const targetFiles = [
      ...walkFiles(resolve(ROOT, 'src'), /\.(ts|tsx|css|js|json|svg)$/i),
      ...walkFiles(resolve(ROOT, 'public'), /\.(js|json|html|svg|txt)$/i),
      ...walkFiles(resolve(ROOT, 'tests'), /\.(ts|tsx|js|json)$/i),
      resolve(ROOT, 'index.html'),
      resolve(ROOT, 'README.md'),
    ];

    for (const filePath of targetFiles) {
      const content = readFileSync(filePath, 'utf8');
      expect(
        UNICODE_FLAG_RE.test(content),
        `Prohibited Unicode flag emoji found in ${filePath}`
      ).toBe(false);
    }
  });

  it('verifies all 16 courses have 16 units (256 units, 112 nodes/lang = 1,792 total), >= 150 unique VocabCards each (>= 2,400 total), A1-C2 proficiencyTier coverage, and symmetrical node structure', () => {
    expect(LANGUAGE_LIST).toHaveLength(16);
    expect(Object.keys(COURSES)).toHaveLength(16);

    const NON_LATIN_LANGS = new Set<LanguageCode>(['zh', 'ja', 'hi', 'bn', 'ar', 'arz', 'ru']);
    const RTL_LANGS = new Set<LanguageCode>(['ar', 'arz']);
    const SPACELESS_LANGS = new Set<LanguageCode>(['zh', 'ja']);

    const validIllustrations = new Set<string>(ILLUSTRATION_KEYS);
    const globalCardIds = new Set<string>();
    const globalUnitIds = new Set<string>();
    const globalNodeIds = new Set<string>();
    const globalExerciseIds = new Set<string>();
    let totalUnits = 0;
    let totalNodes = 0;

    for (const lang of LANGUAGE_LIST) {
      const course = COURSES[lang];
      expect(getCourse(lang)).toBe(course);
      expect(course.language).toBe(lang);
      expect(course.meta.dir).toBe(RTL_LANGS.has(lang) ? 'rtl' : 'ltr');
      expect(course.meta.usesSpaces).toBe(!SPACELESS_LANGS.has(lang));
      expect(course.units).toHaveLength(16);
      totalUnits += course.units.length;
      const courseNodes = course.units.flatMap((u) => u.nodes);
      expect(courseNodes).toHaveLength(112);
      totalNodes += courseNodes.length;

      const courseCardIds = new Set<string>();
      const usedIllustrations = new Set<string>();
      const authoredWordBankKeys = new Set<string>();
      const authoredListenAudioKeys = new Set<string>();
      const coveredTiers = new Set<ProficiencyTier>();
      let listenMeaningCount = 0;
      let listenAssembleCount = 0;
      let contextClozeCount = 0;
      let freeRecallBossCount = 0;

      for (const unit of course.units) {
        expect(globalUnitIds.has(unit.id), `Duplicate unit id "${unit.id}"`).toBe(false);
        globalUnitIds.add(unit.id);
        expect(getUnitById(lang, unit.id)).toBe(unit);
        expect(unit.language).toBe(lang);
        expect(unit.vocabCards.length).toBeGreaterThan(0);

        const expectedTier = resolveUnitProficiencyTier(unit.order);
        const unitTier = unit.proficiencyTier ?? expectedTier;
        expect(unitTier).toBe(expectedTier);
        coveredTiers.add(unitTier);
        if (unit.order >= 9) {
          expect(unit.proficiencyTier, `${unit.id} missing explicit proficiencyTier`).toBe(expectedTier);
        }

        for (const card of unit.vocabCards) {
          expect(globalCardIds.has(card.id), `Duplicate global card id "${card.id}"`).toBe(false);
          globalCardIds.add(card.id);
          courseCardIds.add(card.id);

          expect(card.language).toBe(lang);
          expect(card.unitId).toBe(unit.id);
          if (unit.order >= 9) {
            expect(card.proficiencyTier, `${card.id} missing explicit proficiencyTier`).toBe(expectedTier);
          }
          expect(getVocabCard(lang, card.id)).toBe(card);
          expect(card.foreignWithArticle.trim()).not.toBe('');
          expect(card.bareForeign.trim()).not.toBe('');
          expect(card.english.trim()).not.toBe('');
          expect(card.phonetic.trim(), `${card.id} missing phonetic`).not.toBe('');
          expect(card.exampleForeign.trim()).not.toBe('');
          expect(card.exampleEnglish.trim()).not.toBe('');
          expect(card.examplePhonetic.trim()).not.toBe('');
          if (NON_LATIN_LANGS.has(lang)) {
            expect(card.romanized?.trim(), `${card.id} missing romanized`).toBeTruthy();
            expect(card.exampleRomanized?.trim(), `${card.id} missing exampleRomanized`).toBeTruthy();
          }
          expect(validIllustrations.has(card.illustrationKey), `Invalid illustrationKey "${card.illustrationKey}" on ${card.id}`).toBe(true);
          usedIllustrations.add(card.illustrationKey);

          const textToCheck = [
            card.foreignWithArticle,
            card.bareForeign,
            card.english,
            card.exampleForeign,
            card.exampleEnglish,
          ].join(' ');
          expect(
            BANNED_ALCOHOL_RE.test(textToCheck),
            `Prohibited adult beverage/bar term found in card ${card.id}: "${textToCheck}"`
          ).toBe(false);
        }

        const lessons = unit.nodes.filter((n) => n.nodeType === 'lesson');
        const stories = unit.nodes.filter((n) => n.nodeType === 'story');
        const chests = unit.nodes.filter((n) => n.nodeType === 'chest');
        const bosses = unit.nodes.filter((n) => n.nodeType === 'boss');

        expect(lessons.length, `${unit.id} must have >= 4 lesson nodes`).toBeGreaterThanOrEqual(4);
        expect(stories.length, `${unit.id} must have 1 story node`).toBe(1);
        expect(chests.length, `${unit.id} must have 1 chest node`).toBe(1);
        expect(bosses.length, `${unit.id} must have 1 boss node`).toBe(1);

        expect(stories[0].exercises.some((ex) => ex.type === 'mini_story')).toBe(true);
        expect(bosses[0].exercises.some((ex) => ex.type === 'boss_gauntlet')).toBe(true);
        expect(chests[0].gemReward).toBeGreaterThan(0);
        expect(chests[0].rewardVocabIds.length).toBeGreaterThan(0);

        for (const node of unit.nodes) {
          expect(globalNodeIds.has(node.id), `Duplicate node id "${node.id}"`).toBe(false);
          globalNodeIds.add(node.id);
          expect(getNodeById(lang, node.id)).toBe(node);
          expect(node.unitId).toBe(unit.id);
          if (unit.order >= 9) {
            expect(node.proficiencyTier, `${node.id} missing proficiencyTier`).toBe(expectedTier);
          }

          for (const vid of node.rewardVocabIds) {
            expect(course.vocabById[vid], `${node.id} references unknown rewardVocabId "${vid}"`).toBeDefined();
          }

          for (const ex of node.exercises) {
            expect(globalExerciseIds.has(ex.id), `Duplicate exercise id "${ex.id}"`).toBe(false);
            globalExerciseIds.add(ex.id);

            if (ex.type === 'discovery_card') {
              expect(course.vocabById[ex.vocabId], `${ex.id} unknown vocabId "${ex.vocabId}"`).toBeDefined();
            } else if (ex.type === 'word_bank') {
              const wbKey = `${ex.promptText.trim().toLowerCase()}||${ex.expectedSentence.trim().toLowerCase()}`;
              expect(
                authoredWordBankKeys.has(wbKey),
                `Duplicate authored WordBank prompt in ${lang}: ${ex.id} -> ${wbKey}`
              ).toBe(false);
              authoredWordBankKeys.add(wbKey);

              if (ex.direction === 'to_english') {
                assertValidTapHints(ex.promptTokens, ex.id);
              }
              if (SPACELESS_LANGS.has(lang) && ex.direction === 'to_foreign') {
                expect(
                  ex.targetTokens.length,
                  `${ex.id}: CJK to_foreign sentence "${ex.expectedSentence}" collapsed into <=1 token`
                ).toBeGreaterThanOrEqual(2);
              }
              const assembled = joinWordBankTokens(ex.targetTokens);
              const gradeLang = ex.direction === 'to_foreign' ? lang : 'en';
              const res = gradeAnswer({
                submitted: assembled,
                expected: ex.expectedSentence,
                accepted: ex.acceptedSentences,
                language: gradeLang,
              });
              expect(res.isCorrect, `${ex.id}: assembled targetTokens "${assembled}" failed grader against "${ex.expectedSentence}"`).toBe(true);
              const arenaRes = gradeAnswer({
                submitted: assembled,
                expected: ex.expectedSentence,
                accepted: ex.acceptedSentences,
                language: lang,
              });
              expect(arenaRes.isCorrect, `${ex.id}: LessonArena-mode grade failed for "${assembled}"`).toBe(true);

              expect(
                BANNED_ALCOHOL_RE.test(`${ex.promptText} ${ex.expectedSentence}`),
                `Banned alcohol/bar word in ${ex.id}`
              ).toBe(false);
            } else if (ex.type === 'context_cloze') {
              contextClozeCount += 1;
              expect(
                ex.sentenceBeforeBlank.trim().length + ex.sentenceAfterBlank.trim().length,
                `${ex.id}: cloze sentence context around blank cannot be empty`
              ).toBeGreaterThan(0);
              expect(ex.fullForeignSentence.trim(), `${ex.id}: fullForeignSentence empty`).not.toBe('');
              expect(ex.englishTranslation.trim(), `${ex.id}: englishTranslation empty`).not.toBe('');
              expect(ex.phonetic.trim(), `${ex.id}: phonetic empty`).not.toBe('');
              expect(ex.nuanceNote.trim(), `${ex.id}: nuanceNote empty`).not.toBe('');
              expect(ex.choices.length, `${ex.id}: needs >=3 cloze choices`).toBeGreaterThanOrEqual(3);
              expect(ex.choices.includes(ex.expectedBlank), `${ex.id}: choices missing expectedBlank "${ex.expectedBlank}"`).toBe(true);
              assertValidTapHints(ex.tapHints, ex.id);
              if (NON_LATIN_LANGS.has(lang)) {
                expect(ex.romanized?.trim(), `${ex.id}: non-Latin cloze missing romanized`).toBeTruthy();
              }
              const res = gradeAnswer({
                submitted: ex.expectedBlank,
                expected: ex.expectedBlank,
                accepted: ex.acceptedBlanks,
                language: lang,
              });
              expect(res.isCorrect, `${ex.id}: expectedBlank "${ex.expectedBlank}" failed grader`).toBe(true);
              expect(
                BANNED_ALCOHOL_RE.test(`${ex.fullForeignSentence} ${ex.englishTranslation} ${ex.nuanceNote}`),
                `Banned alcohol/bar word in ${ex.id}`
              ).toBe(false);
            } else if (ex.type === 'listen_decode') {
              const audioKey = ex.audioText.trim().toLowerCase();
              expect(
                authoredListenAudioKeys.has(audioKey),
                `Duplicate authored ListenDecode audioText in ${lang}: ${ex.id} -> "${ex.audioText}"`
              ).toBe(false);
              authoredListenAudioKeys.add(audioKey);

              expect(ex.voiceFallbackPhoneticPrompt.trim(), `${ex.id} empty voiceFallbackPhoneticPrompt`).not.toBe('');
              expect(ex.phonetic.trim(), `${ex.id} empty phonetic`).not.toBe('');
              assertValidTapHints(ex.tapHints, ex.id);

              if (ex.mode === 'select_meaning') {
                listenMeaningCount += 1;
                expect(ex.choices && ex.choices.length >= 2, `${ex.id} needs >=2 choices`).toBe(true);
                expect(ex.choices?.includes(ex.englishMeaning), `${ex.id} choices missing englishMeaning`).toBe(true);
                const res = gradeAnswer({
                  submitted: ex.englishMeaning,
                  expected: ex.englishMeaning,
                  accepted: ex.acceptedAnswers,
                  language: lang,
                });
                expect(res.isCorrect, `${ex.id} englishMeaning failed grader`).toBe(true);
              } else {
                listenAssembleCount += 1;
                expect(ex.targetTokens && ex.targetTokens.length > 0, `${ex.id} assemble_heard needs targetTokens`).toBe(true);
                if (SPACELESS_LANGS.has(lang)) {
                  expect(
                    (ex.targetTokens ?? []).length,
                    `${ex.id}: CJK listenAssemble "${ex.audioText}" must segment into >=2 tokens`
                  ).toBeGreaterThanOrEqual(2);
                }
                const assembled = joinWordBankTokens(ex.targetTokens ?? []);
                const res = gradeAnswer({
                  submitted: assembled,
                  expected: ex.audioText,
                  accepted: ex.acceptedAnswers,
                  language: lang,
                });
                expect(res.isCorrect, `${ex.id}: assembled "${assembled}" failed grader against "${ex.audioText}"`).toBe(true);
              }

              expect(
                BANNED_ALCOHOL_RE.test(`${ex.audioText} ${ex.englishMeaning}`),
                `Banned alcohol/bar word in ${ex.id}`
              ).toBe(false);
            } else if (ex.type === 'pair_match_rush') {
              expect(ex.pairs.length).toBeGreaterThanOrEqual(4);
              const pairIds = new Set<string>();
              const pairForeigns = new Set<string>();
              const pairEnglishes = new Set<string>();
              for (const pair of ex.pairs) {
                expect(pairIds.has(pair.id), `Duplicate pair id ${pair.id}`).toBe(false);
                pairIds.add(pair.id);
                expect(pairForeigns.has(pair.foreign.toLowerCase()), `Duplicate pair foreign "${pair.foreign}" in ${ex.id}`).toBe(false);
                pairForeigns.add(pair.foreign.toLowerCase());
                expect(pairEnglishes.has(pair.english.toLowerCase()), `Duplicate pair english "${pair.english}" in ${ex.id}`).toBe(false);
                pairEnglishes.add(pair.english.toLowerCase());
                expect(pair.phonetic.trim()).not.toBe('');
                if (pair.vocabId) {
                  expect(course.vocabById[pair.vocabId]).toBeDefined();
                }
              }
            } else if (ex.type === 'mini_story') {
              expect(ex.bubbles.length).toBeGreaterThanOrEqual(4);
              expect(ex.decisions.length).toBeGreaterThanOrEqual(1);
              const bubbleIds = new Set<string>();
              for (const bubble of ex.bubbles) {
                expect(bubbleIds.has(bubble.id), `Duplicate bubble id ${bubble.id}`).toBe(false);
                bubbleIds.add(bubble.id);
                assertValidTapHints(bubble.tapHints, `${ex.id}:${bubble.id}`);
                expect(
                  BANNED_ALCOHOL_RE.test(`${bubble.foreignText} ${bubble.englishText}`),
                  `Banned alcohol/bar word in story bubble ${bubble.id}`
                ).toBe(false);
              }
              for (const dec of ex.decisions) {
                expect(dec.afterBubbleIndex).toBeGreaterThanOrEqual(0);
                expect(dec.afterBubbleIndex).toBeLessThan(ex.bubbles.length);
                expect(
                  dec.options.some((o) => o.isCorrect),
                  `${ex.id} decision after ${dec.afterBubbleIndex} has no correct option`
                ).toBe(true);
              }
            } else if (ex.type === 'boss_gauntlet') {
              expect(ex.companionId).toBe(LANGUAGE_META[lang].companionId);
              expect(ex.turns.length).toBeGreaterThanOrEqual(3);
              const turnIds = new Set<string>();
              for (const turn of ex.turns) {
                expect(turnIds.has(turn.id), `Duplicate boss turn id ${turn.id}`).toBe(false);
                turnIds.add(turn.id);
                assertValidTapHints(turn.tapHints, `${ex.id}:${turn.id}`);
                if (turn.allowFreeRecall) freeRecallBossCount += 1;

                const candidateAnswer =
                  turn.mode === 'choice'
                    ? turn.expectedAnswer
                    : joinWordBankTokens(turn.targetTokens ?? []);
                if (turn.mode === 'choice') {
                  expect(turn.choices?.includes(turn.expectedAnswer), `${turn.id} choices missing expectedAnswer`).toBe(true);
                } else {
                  expect((turn.targetTokens ?? []).length).toBeGreaterThan(0);
                  if (SPACELESS_LANGS.has(lang)) {
                    expect(
                      (turn.targetTokens ?? []).length,
                      `${ex.id}:${turn.id}: CJK boss targetTokens must segment into >=2 tokens`
                    ).toBeGreaterThanOrEqual(2);
                  }
                }
                const res = gradeAnswer({
                  submitted: candidateAnswer,
                  expected: turn.expectedAnswer,
                  accepted: turn.acceptedAnswers,
                  language: lang,
                });
                expect(res.isCorrect, `${ex.id}:${turn.id} answer "${candidateAnswer}" failed grader`).toBe(true);
                expect(
                  BANNED_ALCOHOL_RE.test(
                    `${turn.companionSayForeign} ${turn.companionSayEnglish} ${turn.expectedAnswer}`
                  ),
                  `Banned alcohol/bar word in boss turn ${turn.id}`
                ).toBe(false);
              }
            }
          }
        }
      }

      expect(Array.from(coveredTiers).sort()).toEqual([...PROFICIENCY_TIERS].sort());
      expect(courseCardIds.size, `${lang} must have >= 150 unique VocabCards`).toBeGreaterThanOrEqual(150);
      expect(Object.keys(course.vocabById).length).toBe(courseCardIds.size);
      expect(listenMeaningCount, `${lang} needs select_meaning exercises`).toBeGreaterThan(0);
      expect(listenAssembleCount, `${lang} needs assemble_heard exercises`).toBeGreaterThan(0);
      expect(contextClozeCount, `${lang} needs >= 32 context_cloze exercises across Units 9-16`).toBeGreaterThanOrEqual(32);
      expect(freeRecallBossCount, `${lang} needs allowFreeRecall B2/C1+ boss turns`).toBeGreaterThan(0);
      expect(usedIllustrations.size, `${lang} should cover >= 108 of 112 illustration keys`).toBeGreaterThanOrEqual(108);
    }

    expect(totalUnits).toBe(256);
    expect(totalNodes).toBe(1792);
    expect(globalCardIds.size).toBeGreaterThanOrEqual(2400);
  });

  it('enforces World Explorer English (en) prompt/clue separation and Egyptian Arabic (arz) vs MSA (ar) lexical divergence (>= 40%)', () => {
    // 1. English (en) clue separation across all cards, authored exercises, and pooled exercises
    const enCourse = COURSES.en;
    for (const unit of enCourse.units) {
      for (const card of unit.vocabCards) {
        expect(
          normalizeAnswer(card.english, { stripAccents: true }),
          `en card ${card.id}: english clue must differ from bareForeign`
        ).not.toBe(normalizeAnswer(card.bareForeign, { stripAccents: true }));
        expect(
          normalizeAnswer(card.english, { stripAccents: true }),
          `en card ${card.id}: english clue must differ from foreignWithArticle`
        ).not.toBe(normalizeAnswer(card.foreignWithArticle, { stripAccents: true }));
        expect(
          normalizeAnswer(card.exampleEnglish, { stripAccents: true }),
          `en card ${card.id}: exampleEnglish clue must differ from exampleForeign`
        ).not.toBe(normalizeAnswer(card.exampleForeign, { stripAccents: true }));
      }

      for (const node of unit.nodes) {
        const exercises = [
          ...node.exercises,
          ...(node.nodeType !== 'chest' ? getPlayableNodeExercises('en', node.id, [], false) : []),
        ];
        for (const ex of exercises) {
          if (ex.type === 'word_bank') {
            expect(
              normalizeAnswer(ex.promptText, { stripAccents: true }),
              `en ${ex.id}: promptText must not equal expectedSentence`
            ).not.toBe(normalizeAnswer(ex.expectedSentence, { stripAccents: true }));
          } else if (ex.type === 'context_cloze') {
            expect(
              normalizeAnswer(ex.fullForeignSentence, { stripAccents: true }),
              `en ${ex.id}: englishTranslation must not equal fullForeignSentence`
            ).not.toBe(normalizeAnswer(ex.englishTranslation, { stripAccents: true }));
          } else if (ex.type === 'listen_decode') {
            expect(
              normalizeAnswer(ex.audioText, { stripAccents: true }),
              `en ${ex.id}: audioText must not equal englishMeaning`
            ).not.toBe(normalizeAnswer(ex.englishMeaning, { stripAccents: true }));
          } else if (ex.type === 'pair_match_rush') {
            for (const pair of ex.pairs) {
              expect(
                normalizeAnswer(pair.foreign, { stripAccents: true }),
                `en ${ex.id}:${pair.id}: foreign and english match columns must differ`
              ).not.toBe(normalizeAnswer(pair.english, { stripAccents: true }));
            }
          } else if (ex.type === 'boss_gauntlet') {
            for (const turn of ex.turns) {
              expect(
                normalizeAnswer(turn.promptEnglish, { stripAccents: true }),
                `en ${ex.id}:${turn.id}: promptEnglish must differ from expectedAnswer`
              ).not.toBe(normalizeAnswer(turn.expectedAnswer, { stripAccents: true }));
            }
          }
        }
      }
    }

    // 2. Egyptian Arabic (arz) vs Modern Standard Arabic (ar) genuine lexical divergence >= 40%
    const arCards = COURSES.ar.units.flatMap((u) => u.vocabCards);
    const arzCards = COURSES.arz.units.flatMap((u) => u.vocabCards);
    expect(arCards.length).toBeGreaterThanOrEqual(150);
    expect(arzCards.length).toBeGreaterThanOrEqual(150);

    const arBareSet = new Set(arCards.map((c) => normalizeAnswer(c.bareForeign, { stripAccents: true })));
    const arExampleSet = new Set(
      arCards.map((c) => normalizeAnswer(c.exampleForeign, { stripAccents: true }))
    );

    let distinctBareCount = 0;
    let distinctExampleCount = 0;
    for (const card of arzCards) {
      const bareNorm = normalizeAnswer(card.bareForeign, { stripAccents: true });
      const exNorm = normalizeAnswer(card.exampleForeign, { stripAccents: true });
      if (!arBareSet.has(bareNorm)) distinctBareCount += 1;
      if (!arExampleSet.has(exNorm)) distinctExampleCount += 1;
    }

    const bareDivergenceRatio = distinctBareCount / arzCards.length;
    const exampleDivergenceRatio = distinctExampleCount / arzCards.length;
    expect(
      bareDivergenceRatio,
      `arz vs ar bareForeign divergence ${(bareDivergenceRatio * 100).toFixed(1)}% < 40%`
    ).toBeGreaterThanOrEqual(0.4);
    expect(
      exampleDivergenceRatio,
      `arz vs ar exampleForeign divergence ${(exampleDivergenceRatio * 100).toFixed(1)}% < 40%`
    ).toBeGreaterThanOrEqual(0.4);

    // 3. Multi-script segmentSentenceTokens sanity check on CJK & non-spaced sentences
    expect(segmentSentenceTokens('').length).toBe(0);
    for (const lang of ['zh', 'ja'] as const) {
      const firstLesson = COURSES[lang].units[0].nodes.find((n) => n.nodeType === 'lesson')!;
      const wb = firstLesson.exercises.find(
        (ex): ex is Extract<LessonExercise, { type: 'word_bank' }> =>
          ex.type === 'word_bank' && ex.direction === 'to_english'
      )!;
      expect(wb.promptTokens.length, `${lang} promptTokens should have >= 2 segmented tokens`).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns rich unique ArcadeLanternItems from getArcadeLexicon across Sprout/Voyager/Master tiers even for fresh profiles', () => {
    const tiers: readonly ArcadeProficiencyTier[] = ['sprout', 'voyager', 'master'];
    for (const lang of LANGUAGE_LIST) {
      for (const tier of tiers) {
        const fresh = getArcadeLexicon(lang, [], 0, tier);
        expect(fresh.length, `${lang}:${tier} fresh arcade lexicon too small`).toBeGreaterThanOrEqual(16);

        const ids = new Set(fresh.map((i) => i.id));
        const foreigns = new Set(fresh.map((i) => i.foreign.toLowerCase()));
        const englishes = new Set(fresh.map((i) => i.english.toLowerCase()));
        expect(ids.size).toBe(fresh.length);
        expect(foreigns.size).toBe(fresh.length);
        expect(englishes.size).toBe(fresh.length);

        for (const item of fresh) {
          expect(item.language).toBe(lang);
          expect(item.foreign.trim()).not.toBe('');
          expect(item.english.trim()).not.toBe('');
          expect(item.phonetic.trim()).not.toBe('');
          expect(item.proficiencyTier, `${lang}:${tier}:${item.id} missing proficiencyTier`).toBeDefined();
          expect(item.exampleForeign?.trim(), `${lang}:${tier}:${item.id} missing exampleForeign`).toBeTruthy();
          expect(item.exampleEnglish?.trim(), `${lang}:${tier}:${item.id} missing exampleEnglish`).toBeTruthy();
          expect(item.examplePhonetic?.trim(), `${lang}:${tier}:${item.id} missing examplePhonetic`).toBeTruthy();
          expect(ILLUSTRATION_KEYS).toContain(item.illustrationKey);
          if (lang === 'en') {
            expect(
              normalizeAnswer(item.foreign, { stripAccents: true }),
              `en arcade item ${item.id}: foreign must differ from english clue`
            ).not.toBe(normalizeAnswer(item.english, { stripAccents: true }));
          }
          if (['zh', 'ja', 'hi', 'bn', 'ar', 'arz', 'ru'].includes(lang)) {
            expect(item.romanized?.trim(), `${lang} arcade item ${item.id} missing romanized`).toBeTruthy();
            expect(item.exampleRomanized?.trim(), `${lang} arcade item ${item.id} missing exampleRomanized`).toBeTruthy();
          }
        }

        if (tier === 'sprout') {
          expect(['A1', 'A2']).toContain(fresh[0].proficiencyTier);
        } else if (tier === 'voyager') {
          expect(['B1', 'B2']).toContain(fresh[0].proficiencyTier);
        } else {
          expect(fresh[0].proficiencyTier).toBe('C1_C2');
        }
      }

      // Unlocked vocab IDs from Unit 5 should be included when present
      const u5Card = COURSES[lang].units[4].vocabCards[0];
      const withUnlocked = getArcadeLexicon(lang, [u5Card.id], 0);
      expect(withUnlocked.some((item) => item.id === u5Card.id)).toBe(true);
    }
  });

  it('enforces Linguistic Quality Gate: zero duplicate choices, zero wrong choice colliding with accepted answers, and clean token hygiene', () => {
    const ELISION_SPACE_RE =
      /\b(?:l|d|j|c|m|n|s|t|qu|un|dell|all|dall|nell|sull|quest|quell)'\s+[a-z\u00C0-\u024F]/i;

    const verifyExerciseLinguistics = (lang: (typeof LANGUAGE_LIST)[number], ex: LessonExercise, ctx: string) => {
      if (ex.type === 'word_bank') {
        expect(ex.targetTokens.length, `${ctx}: empty targetTokens`).toBeGreaterThan(0);
        for (const tok of [...ex.targetTokens, ...ex.distractorTokens]) {
          expect(tok.trim(), `${ctx}: empty/whitespace word-bank token`).not.toBe('');
          expect(tok, `${ctx}: untrimmed token "${tok}"`).toBe(tok.trim());
        }
        expect(
          ELISION_SPACE_RE.test(ex.expectedSentence),
          `${ctx}: broken space after elision in expectedSentence "${ex.expectedSentence}"`
        ).toBe(false);
        expect(
          ELISION_SPACE_RE.test(ex.promptText),
          `${ctx}: broken space after elision in promptText "${ex.promptText}"`
        ).toBe(false);
      } else if (ex.type === 'context_cloze') {
        expect(
          ELISION_SPACE_RE.test(ex.fullForeignSentence),
          `${ctx}: broken space after elision in fullForeignSentence "${ex.fullForeignSentence}"`
        ).toBe(false);
        expect(ex.choices.length, `${ctx}: context_cloze needs >=3 choices`).toBeGreaterThanOrEqual(3);
        expect(ex.choices.includes(ex.expectedBlank), `${ctx}: choices missing expectedBlank "${ex.expectedBlank}"`).toBe(true);

        const seenChoices = new Set<string>();
        for (const choice of ex.choices) {
          const norm = normalizeAnswer(choice, { stripAccents: true, expandGerman: lang === 'de' });
          expect(norm, `${ctx}: empty cloze choice`).not.toBe('');
          expect(seenChoices.has(norm), `${ctx}: duplicate cloze choice "${choice}"`).toBe(false);
          seenChoices.add(norm);

          const isExpected =
            normalizeAnswer(choice, { stripAccents: true, expandGerman: lang === 'de' }) ===
            normalizeAnswer(ex.expectedBlank, { stripAccents: true, expandGerman: lang === 'de' });
          if (!isExpected) {
            const distractorGrade = gradeAnswer({
              submitted: choice,
              expected: ex.expectedBlank,
              accepted: ex.acceptedBlanks,
              language: lang,
            });
            expect(
              distractorGrade.isCorrect,
              `${ctx}: wrong cloze choice "${choice}" collides with acceptedBlanks for "${ex.expectedBlank}"`
            ).toBe(false);
          }
        }
      } else if (ex.type === 'listen_decode') {
        expect(
          ELISION_SPACE_RE.test(ex.audioText),
          `${ctx}: broken space after elision in audioText "${ex.audioText}"`
        ).toBe(false);

        if (ex.mode === 'select_meaning' && ex.choices) {
          const seenChoices = new Set<string>();
          for (const choice of ex.choices) {
            const norm = normalizeAnswer(choice, { stripAccents: true });
            expect(norm, `${ctx}: empty choice`).not.toBe('');
            expect(seenChoices.has(norm), `${ctx}: duplicate choice "${choice}"`).toBe(false);
            seenChoices.add(norm);

            const isExpectedExact =
              normalizeAnswer(choice, { stripAccents: true }) ===
              normalizeAnswer(ex.englishMeaning, { stripAccents: true });
            if (!isExpectedExact) {
              const distractorGrade = gradeAnswer({
                submitted: choice,
                expected: ex.englishMeaning,
                accepted: ex.acceptedAnswers,
                language: lang,
              });
              expect(
                distractorGrade.isCorrect,
                `${ctx}: distractor "${choice}" collides with acceptedAnswers for "${ex.englishMeaning}"`
              ).toBe(false);
            }
          }
        } else if (ex.mode === 'assemble_heard' && ex.targetTokens) {
          for (const tok of [...ex.targetTokens, ...(ex.distractorTokens ?? [])]) {
            expect(tok.trim(), `${ctx}: empty listen token`).not.toBe('');
            expect(tok, `${ctx}: untrimmed listen token "${tok}"`).toBe(tok.trim());
          }
        }
      } else if (ex.type === 'mini_story') {
        for (const bubble of ex.bubbles) {
          expect(
            ELISION_SPACE_RE.test(bubble.foreignText),
            `${ctx}: broken space after elision in bubble ${bubble.id} "${bubble.foreignText}"`
          ).toBe(false);
        }
        for (const dec of ex.decisions) {
          const seenOpt = new Set<string>();
          for (const opt of dec.options) {
            const norm = normalizeAnswer(opt.label, { stripAccents: true });
            expect(seenOpt.has(norm), `${ctx}: duplicate story decision option "${opt.label}"`).toBe(false);
            seenOpt.add(norm);
          }
        }
      } else if (ex.type === 'boss_gauntlet') {
        for (const turn of ex.turns) {
          expect(
            ELISION_SPACE_RE.test(turn.companionSayForeign),
            `${ctx}: broken space after elision in turn ${turn.id} "${turn.companionSayForeign}"`
          ).toBe(false);
          expect(
            ELISION_SPACE_RE.test(turn.expectedAnswer),
            `${ctx}: broken space after elision in turn ${turn.id} "${turn.expectedAnswer}"`
          ).toBe(false);

          if (turn.mode === 'choice' && turn.choices) {
            const seenChoices = new Set<string>();
            for (const choice of turn.choices) {
              const norm = normalizeAnswer(choice, { stripAccents: true, expandGerman: lang === 'de' });
              expect(seenChoices.has(norm), `${ctx}:${turn.id}: duplicate boss choice "${choice}"`).toBe(false);
              seenChoices.add(norm);

              const isExpected =
                normalizeAnswer(choice, { stripAccents: true, expandGerman: lang === 'de' }) ===
                normalizeAnswer(turn.expectedAnswer, { stripAccents: true, expandGerman: lang === 'de' });
              if (!isExpected) {
                const distractorGrade = gradeAnswer({
                  submitted: choice,
                  expected: turn.expectedAnswer,
                  accepted: turn.acceptedAnswers,
                  language: lang,
                });
                expect(
                  distractorGrade.isCorrect,
                  `${ctx}:${turn.id}: wrong boss choice "${choice}" collides with acceptedAnswers`
                ).toBe(false);
              }
            }
          }
        }
      }
    };

    for (const lang of LANGUAGE_LIST) {
      const course = COURSES[lang];
      for (const unit of course.units) {
        for (const card of unit.vocabCards) {
          expect(
            ELISION_SPACE_RE.test(card.foreignWithArticle),
            `Card ${card.id}: broken space after elision "${card.foreignWithArticle}"`
          ).toBe(false);
          expect(
            ELISION_SPACE_RE.test(card.exampleForeign),
            `Card ${card.id}: broken space after elision "${card.exampleForeign}"`
          ).toBe(false);

          if (lang === 'de') {
            const singleDeNoun = /^(der|die|das|ein|eine)\s+([a-zäöüß][^\s]*)$/u.exec(
              card.foreignWithArticle.trim()
            );
            expect(
              singleDeNoun,
              `German card ${card.id} noun should be capitalized in "${card.foreignWithArticle}"`
            ).toBeNull();
          }
          if (lang === 'es') {
            expect(/\b(la|una)\s+agua\b/i.test(`${card.foreignWithArticle} ${card.exampleForeign}`)).toBe(false);
          }
          if (lang === 'it') {
            expect(/\bun['’]\s*[aeiouàèéìòù]/i.test(card.foreignWithArticle) && /\bun'\s+amico\b/i.test(card.foreignWithArticle)).toBe(false);
            expect(/\bun['’]\s+[a-z]/i.test(card.foreignWithArticle)).toBe(false);
          }
        }

        for (const node of unit.nodes) {
          for (const ex of node.exercises) {
            verifyExerciseLinguistics(lang, ex, `${lang}:authored:${ex.id}`);
          }
          if (node.nodeType !== 'chest') {
            const deepPool = getPlayableNodeExercises(lang, node.id, [], false);
            for (const ex of deepPool) {
              verifyExerciseLinguistics(lang, ex, `${lang}:pool:${node.id}:${ex.id}`);
            }
          }
        }
      }
    }
  });

  it('builds valid 5-exercise Tier Placement Checkpoint nodes (A2, B1, B2, C1_C2) across all 16 languages', () => {
    const unlockableTiers = ['A2', 'B1', 'B2', 'C1_C2'] as const;
    const ELISION_SPACE_RE =
      /\b(?:l|d|j|c|m|n|s|t|qu|un|dell|all|dall|nell|sull|quest|quell)'\s+[a-z\u00C0-\u024F]/i;

    for (const lang of LANGUAGE_LIST) {
      for (const tier of unlockableTiers) {
        const cp = buildTierCheckpointNode(lang, tier);
        expect(cp.checkpointTargetTier).toBe(tier);
        expect(cp.proficiencyTier).toBe(tier);
        expect(cp.xpReward).toBe(75);
        expect(cp.gemReward).toBe(40);
        expect(cp.exercises).toHaveLength(5);

        const pooled = getPlayableNodeExercises(lang, cp.id, [], false);
        expect(pooled).toHaveLength(5);

        for (const ex of pooled) {
          if (ex.type === 'word_bank') {
            const assembled = joinWordBankTokens(ex.targetTokens);
            const res = gradeAnswer({
              submitted: assembled,
              expected: ex.expectedSentence,
              accepted: ex.acceptedSentences,
              language: ex.direction === 'to_foreign' ? lang : 'en',
            });
            expect(res.isCorrect, `${cp.id}:${ex.id} word_bank failed grader`).toBe(true);
            if (lang === 'en') {
              expect(normalizeAnswer(ex.promptText, { stripAccents: true })).not.toBe(
                normalizeAnswer(ex.expectedSentence, { stripAccents: true })
              );
            }
            expect(ELISION_SPACE_RE.test(ex.expectedSentence)).toBe(false);
          } else if (ex.type === 'context_cloze') {
            const cloze = ex as ContextClozeExercise;
            expect(cloze.choices.includes(cloze.expectedBlank)).toBe(true);
            expect(
              gradeAnswer({
                submitted: cloze.expectedBlank,
                expected: cloze.expectedBlank,
                accepted: cloze.acceptedBlanks,
                language: lang,
              }).isCorrect
            ).toBe(true);
            if (lang === 'en') {
              expect(normalizeAnswer(cloze.fullForeignSentence, { stripAccents: true })).not.toBe(
                normalizeAnswer(cloze.englishTranslation, { stripAccents: true })
              );
            }
          } else if (ex.type === 'listen_decode') {
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
              }).isCorrect
            ).toBe(true);
          } else if (ex.type === 'pair_match_rush') {
            expect(ex.pairs.length).toBeGreaterThanOrEqual(4);
          }
        }
      }
    }
  });
});
