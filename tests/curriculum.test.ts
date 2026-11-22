import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VOCAB_ILLUSTRATIONS } from '../src/art/VocabIllustration';
import { joinWordBankTokens } from '../src/components/lesson/lessonHelpers';
import { gradeAnswer } from '../src/core';
import {
  COURSES,
  getArcadeLexicon,
  getCourse,
  getNodeById,
  getUnitById,
  getVocabCard,
} from '../src/curriculum';
import {
  ILLUSTRATION_KEYS,
  LANGUAGE_LIST,
  LANGUAGE_META,
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
  it('maps every single ILLUSTRATION_KEYS entry in VOCAB_ILLUSTRATIONS with zero missing or extra keys', () => {
    const expectedKeys = new Set<string>(ILLUSTRATION_KEYS);
    const implKeys = Object.keys(VOCAB_ILLUSTRATIONS);
    expect(expectedKeys.size).toBe(60);
    expect(implKeys.length).toBe(expectedKeys.size);

    for (const key of ILLUSTRATION_KEYS) {
      expect(typeof VOCAB_ILLUSTRATIONS[key], `Missing VOCAB_ILLUSTRATIONS entry for "${key}"`).toBe('function');
    }
    for (const key of implKeys) {
      expect(expectedKeys.has(key), `Unexpected extra key "${key}" in VOCAB_ILLUSTRATIONS`).toBe(true);
    }
  });

  it('contains zero Unicode regional indicator flag emojis across src/, public/, index.html, and README.md', () => {
    const targetFiles = [
      ...walkFiles(resolve(ROOT, 'src'), /\.(ts|tsx|css|js|json|svg)$/i),
      ...walkFiles(resolve(ROOT, 'public'), /\.(js|json|html|svg|txt)$/i),
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

  it('verifies all 4 courses have >= 5 units, >= 50 unique VocabCards, valid helpers, and symmetrical node structure', () => {
    const validIllustrations = new Set<string>(ILLUSTRATION_KEYS);
    const globalCardIds = new Set<string>();
    const globalUnitIds = new Set<string>();
    const globalNodeIds = new Set<string>();
    const globalExerciseIds = new Set<string>();

    for (const lang of LANGUAGE_LIST) {
      const course = COURSES[lang];
      expect(getCourse(lang)).toBe(course);
      expect(course.language).toBe(lang);
      expect(course.units.length).toBeGreaterThanOrEqual(5);

      const courseCardIds = new Set<string>();
      const usedIllustrations = new Set<string>();
      let listenMeaningCount = 0;
      let listenAssembleCount = 0;

      for (const unit of course.units) {
        expect(globalUnitIds.has(unit.id), `Duplicate unit id "${unit.id}"`).toBe(false);
        globalUnitIds.add(unit.id);
        expect(getUnitById(lang, unit.id)).toBe(unit);
        expect(unit.language).toBe(lang);
        expect(unit.vocabCards.length).toBeGreaterThan(0);

        for (const card of unit.vocabCards) {
          expect(globalCardIds.has(card.id), `Duplicate global card id "${card.id}"`).toBe(false);
          globalCardIds.add(card.id);
          courseCardIds.add(card.id);

          expect(card.language).toBe(lang);
          expect(card.unitId).toBe(unit.id);
          expect(getVocabCard(lang, card.id)).toBe(card);
          expect(card.foreignWithArticle.trim()).not.toBe('');
          expect(card.bareForeign.trim()).not.toBe('');
          expect(card.english.trim()).not.toBe('');
          expect(card.phonetic.trim(), `${card.id} missing phonetic`).not.toBe('');
          expect(card.exampleForeign.trim()).not.toBe('');
          expect(card.exampleEnglish.trim()).not.toBe('');
          expect(card.examplePhonetic.trim()).not.toBe('');
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

          for (const vid of node.rewardVocabIds) {
            expect(course.vocabById[vid], `${node.id} references unknown rewardVocabId "${vid}"`).toBeDefined();
          }

          for (const ex of node.exercises) {
            expect(globalExerciseIds.has(ex.id), `Duplicate exercise id "${ex.id}"`).toBe(false);
            globalExerciseIds.add(ex.id);

            if (ex.type === 'discovery_card') {
              expect(course.vocabById[ex.vocabId], `${ex.id} unknown vocabId "${ex.vocabId}"`).toBeDefined();
            } else if (ex.type === 'word_bank') {
              if (ex.direction === 'to_english') {
                assertValidTapHints(ex.promptTokens, ex.id);
              }
              const assembled = joinWordBankTokens(ex.targetTokens);
              const gradeLang = ex.direction === 'to_foreign' ? lang : 'es';
              const res = gradeAnswer({
                submitted: assembled,
                expected: ex.expectedSentence,
                accepted: ex.acceptedSentences,
                language: gradeLang,
              });
              expect(res.isCorrect, `${ex.id}: assembled targetTokens "${assembled}" failed grader against "${ex.expectedSentence}"`).toBe(true);

              expect(
                BANNED_ALCOHOL_RE.test(`${ex.promptText} ${ex.expectedSentence}`),
                `Banned alcohol/bar word in ${ex.id}`
              ).toBe(false);
            } else if (ex.type === 'listen_decode') {
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

                const candidateAnswer =
                  turn.mode === 'choice'
                    ? turn.expectedAnswer
                    : joinWordBankTokens(turn.targetTokens ?? []);
                if (turn.mode === 'choice') {
                  expect(turn.choices?.includes(turn.expectedAnswer), `${turn.id} choices missing expectedAnswer`).toBe(true);
                } else {
                  expect((turn.targetTokens ?? []).length).toBeGreaterThan(0);
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

      expect(courseCardIds.size, `${lang} must have >= 50 unique VocabCards`).toBeGreaterThanOrEqual(50);
      expect(Object.keys(course.vocabById).length).toBe(courseCardIds.size);
      expect(listenMeaningCount, `${lang} needs select_meaning exercises`).toBeGreaterThan(0);
      expect(listenAssembleCount, `${lang} needs assemble_heard exercises`).toBeGreaterThan(0);
      expect(usedIllustrations.size, `${lang} should cover rich variety of illustration keys`).toBeGreaterThanOrEqual(50);
    }
  });

  it('returns rich unique ArcadeLanternItems from getArcadeLexicon even for fresh profiles', () => {
    for (const lang of LANGUAGE_LIST) {
      const fresh = getArcadeLexicon(lang, [], 0);
      expect(fresh.length, `${lang} fresh arcade lexicon too small`).toBeGreaterThanOrEqual(16);

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
        expect(ILLUSTRATION_KEYS).toContain(item.illustrationKey);
      }

      // Unlocked vocab IDs from Unit 5 should be included when present
      const u5Card = COURSES[lang].units[4].vocabCards[0];
      const withUnlocked = getArcadeLexicon(lang, [u5Card.id], 0);
      expect(withUnlocked.some((item) => item.id === u5Card.id)).toBe(true);
    }
  });
});
