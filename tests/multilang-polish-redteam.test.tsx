import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import * as speechModule from '../src/audio';
import { CafeOrderRushArcade } from '../src/components/arcade/CafeOrderRushArcade';
import { SkyCatcherArcade } from '../src/components/arcade/SkyCatcherArcade';
import { StarlightBridgeArcade, extractBlankFromExample } from '../src/components/arcade/StarlightBridgeArcade';
import { ContextClozeView } from '../src/components/lesson/ContextClozeView';
import { DiscoveryCardView } from '../src/components/lesson/DiscoveryCardView';
import { LessonArena } from '../src/components/lesson/LessonArena';
import { PairMatchRushView } from '../src/components/lesson/PairMatchRushView';
import { TapHintText } from '../src/components/lesson/TapHintText';
import { WordBankTray } from '../src/components/lesson/WordBankTray';
import { WordBankView } from '../src/components/lesson/WordBankView';
import {
  buildTapHintsFromExample,
  joinWordBankTokens,
  splitTapHintsAroundBlank,
} from '../src/components/lesson/lessonHelpers';
import { PhrasebookVault } from '../src/components/meta/PhrasebookVault';
import { ProfileVaultModal } from '../src/components/shell/ProfileVaultModal';
import { gradeAnswer } from '../src/core';
import {
  COURSES,
  buildTierCheckpointNode,
  getArcadeLexicon,
  getCourse,
  getPlayableNodeExercises,
} from '../src/curriculum';
import { loadVaultFromStorage, vaultActions } from '../src/store/useVaultStore';
import {
  LANGUAGE_LIST,
  XP_BOOSTER_CHARGES_PER_BUY,
  type ContextClozeExercise,
  type MapNode,
  type PairMatchRushExercise,
  type TapHintToken,
  type WordBankExercise,
} from '../src/types/contracts';

const TEST_CLEAN_RE =
  /[\s¡!¿?.,;:"'’‘“”„«»‹›()[\]。？！，、；：・「」『』（）【】《》〈〉؟،؛।॥—–―…\-_\u0640]/g;

function cleanCompare(raw: string): string {
  return raw.toLowerCase().replace(TEST_CLEAN_RE, '');
}

describe('Wanderling 2.0 — Multi-Language Playtest Polish & Red-Team Regressions', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
  });

  it('Bug 1: renders CJK/Kana TapHintText and WordBankTray preview without spurious spaces while keeping Latin elisions intact', () => {
    const zhTokens: TapHintToken[] = [
      { surface: '你好', normalizedId: 'nihao', translation: 'Hello', phonetic: 'nee how', speakText: '你好' },
      { surface: '，', normalizedId: 'comma', translation: ',', phonetic: ',', speakText: '' },
      { surface: '马特奥', normalizedId: 'mateo', translation: 'Mateo', phonetic: 'mah-teh-oh', speakText: '马特奥' },
      { surface: '！', normalizedId: 'bang', translation: '!', phonetic: '!', speakText: '' },
    ];
    const { container: zhContainer, unmount: unmountZh } = render(
      <TapHintText tokens={zhTokens} language="zh" />
    );
    expect(zhContainer.textContent).toBe('你好，马特奥！');
    unmountZh();

    const jaTokens: TapHintToken[] = [
      { surface: 'おやすみ', normalizedId: 'oyasumi', translation: 'Good night', phonetic: 'oh-yah-soo-mee', speakText: 'おやすみ' },
      { surface: '友達', normalizedId: 'tomodachi', translation: 'friend', phonetic: 'toh-moh-dah-chee', speakText: '友達' },
    ];
    const { container: jaContainer, unmount: unmountJa } = render(
      <TapHintText tokens={jaTokens} language="ja" />
    );
    expect(jaContainer.textContent).toBe('おやすみ友達');
    unmountJa();

    expect(joinWordBankTokens(['我', '喜欢', '苹果'])).toBe('我喜欢苹果');
    expect(joinWordBankTokens(['你好', '，', '朋友', '！'])).toBe('你好，朋友！');
    expect(joinWordBankTokens(['おやすみ', '、', '友達', '！'])).toBe('おやすみ、友達！');
    expect(joinWordBankTokens(["l'", 'eau'])).toBe("l'eau");
    expect(joinWordBankTokens(['¡', 'Hola', ',', 'amigo', '!'])).toBe('¡Hola, amigo!');

    render(
      <WordBankTray
        seed="zh-preview-test"
        targetTokens={['我', '喜欢', '苹果']}
        selectedTileUids={['zh-preview-test::0::我', 'zh-preview-test::1::喜欢', 'zh-preview-test::2::苹果']}
        onChangeSelected={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Answer tray')).toHaveTextContent('Preview: 我喜欢苹果');
  });

  it('Bug 2: segments all 160 zh & ja DiscoveryCard examples into multiple word hints and surfaces per-word glossary translations', () => {
    for (const lang of ['zh', 'ja'] as const) {
      const course = getCourse(lang);
      const cards = Object.values(course.vocabById);
      expect(cards.length).toBeGreaterThanOrEqual(160);
      for (const card of cards) {
        const hints = buildTapHintsFromExample(
          card.exampleForeign,
          card.exampleEnglish,
          card.examplePhonetic,
          card
        );
        if (card.exampleForeign.trim().length > 4) {
          expect(
            hints.length,
            `${lang}:${card.id} collapsed "${card.exampleForeign}" into single token`
          ).toBeGreaterThan(1);
        }
        // Joined surfaces must preserve all non-whitespace characters of the original example
        const joinedClean = hints.map((h) => h.surface).join('').replace(/\s+/g, '');
        const rawClean = card.exampleForeign.replace(/\s+/g, '');
        expect(joinedClean, `${lang}:${card.id} lost chars in surface reconstruction`).toBe(rawClean);
      }
    }

    // Per-word glossary glosses in DiscoveryCardView on zh and es
    const zhCard = getCourse('zh').vocabById['zh-u1-c1']; // "¡Hola!" example has Mateo / Colette / Pip etc.
    const hints = buildTapHintsFromExample(
      zhCard.exampleForeign,
      zhCard.exampleEnglish,
      zhCard.examplePhonetic,
      zhCard
    );
    expect(hints[0].translation).not.toBe(zhCard.exampleEnglish);

    const esCard = getCourse('es').vocabById['es-u1-c1'];
    render(
      <DiscoveryCardView
        exercise={{ id: 'test-es-dc', type: 'discovery_card', vocabId: esCard.id }}
        vocabCard={esCard}
        language="es"
        compact={false}
        onTurtlePlay={vi.fn()}
      />
    );
    const wordButtons = document.querySelectorAll('button.tap-hint-token-btn');
    expect(wordButtons.length).toBeGreaterThan(1);
    fireEvent.click(wordButtons[wordButtons.length - 1]);
    // At least one non-target word should show a concise word-level translation rather than the entire sentence
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).not.toContain(esCard.exampleEnglish);
  });

  it('Bug 3: partitions ALL ContextCloze tapHints across all 16 languages with zero blank leaks and zero failed sentence reconstructions', () => {
    for (const lang of LANGUAGE_LIST) {
      const course = COURSES[lang];
      const unitNodes = course.units.flatMap((u) => u.nodes).map((node) => ({
        node,
        isCheckpoint: false,
      }));
      const checkpointNodes = (['A2', 'B1', 'B2', 'C1_C2'] as const).map((tier) => ({
        node: buildTierCheckpointNode(lang, tier),
        isCheckpoint: true,
      }));

      for (const { node, isCheckpoint } of [...unitNodes, ...checkpointNodes]) {
        const exercises = isCheckpoint
          ? node.exercises
          : getPlayableNodeExercises(lang, node.id, [], false);
        for (const ex of exercises) {
          if (ex.type !== 'context_cloze' || !ex.tapHints?.length) continue;
          const { beforeTokens, afterTokens, unmatchedTokens } = splitTapHintsAroundBlank(
            ex.sentenceBeforeBlank,
            ex.sentenceAfterBlank,
            ex.expectedBlank,
            ex.tapHints
          );
          const beforeJoined = beforeTokens.map((t) => cleanCompare(t.surface)).join('');
          const beforeClean = cleanCompare(ex.sentenceBeforeBlank);
          const allowsAttachedClitic =
            ex.sentenceBeforeBlank.length > 0 &&
            !/\s$/.test(ex.sentenceBeforeBlank) &&
            beforeClean.startsWith(beforeJoined) &&
            beforeClean.length - beforeJoined.length <= 2;
          if (!allowsAttachedClitic) {
            expect(
              beforeJoined,
              `${lang}:${ex.id} beforeTokens mismatch for "${ex.sentenceBeforeBlank}"`
            ).toBe(beforeClean);
          }
          expect(
            afterTokens.map((t) => cleanCompare(t.surface)).join(''),
            `${lang}:${ex.id} afterTokens mismatch for "${ex.sentenceAfterBlank}"`
          ).toBe(cleanCompare(ex.sentenceAfterBlank));
          expect(
            unmatchedTokens,
            `${lang}:${ex.id} leaked unmatchedTokens: ${unmatchedTokens.map((t) => t.surface).join(', ')}`
          ).toEqual([]);
        }
      }
    }

    // Visual spot-check on Arabic fused clitic+blank ("والوئام") and French curly apostrophe ("aujourd’hui")
    const arCloze = COURSES.ar.units
      .flatMap((u) => u.nodes)
      .flatMap((n) => getPlayableNodeExercises('ar', n.id, [], false))
      .find((ex): ex is ContextClozeExercise => ex.type === 'context_cloze' && ex.expectedBlank === 'الوئام')!;
    expect(arCloze).toBeDefined();

    const { unmount: unmountAr } = render(
      <ContextClozeView
        exercise={arCloze}
        language="ar"
        compact={false}
        locked={false}
        revealed={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    expect(screen.queryByText(/Peek words:/i)).not.toBeInTheDocument();
    expect(document.querySelector('button.tap-hint-token-btn')?.parentElement?.parentElement?.textContent).not.toContain('والوئام');
    unmountAr();

    const frCurlyCloze = COURSES.fr.units
      .flatMap((u) => u.nodes)
      .flatMap((n) => getPlayableNodeExercises('fr', n.id, [], false))
      .find((ex): ex is ContextClozeExercise => ex.type === 'context_cloze' && ex.expectedBlank === 'vas-tu')!;
    expect(frCurlyCloze).toBeDefined();
    render(
      <ContextClozeView
        exercise={frCurlyCloze}
        language="fr"
        compact={false}
        locked={false}
        revealed={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    expect(screen.queryByText(/Peek words:/i)).not.toBeInTheDocument();
  });

  it('Bug 4: shows accurate World Explorer English (en) labels and disables impossible clue free-recall on to_english', () => {
    const enCourse = getCourse('en');
    const u1Exercises = getPlayableNodeExercises('en', enCourse.units[0].nodes[0].id, [], false);
    const toEnEx = u1Exercises.find(
      (ex): ex is WordBankExercise => ex.type === 'word_bank' && ex.direction === 'to_english'
    )!;
    const toFrEx = u1Exercises.find(
      (ex): ex is WordBankExercise => ex.type === 'word_bank' && ex.direction === 'to_foreign'
    )!;
    expect(toEnEx).toBeDefined();
    expect(toFrEx).toBeDefined();

    const { unmount: unmountEn1 } = render(
      <WordBankView
        exercise={toEnEx}
        language="en"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    expect(screen.getByText('Match the Meaning Clue')).toBeInTheDocument();
    expect(screen.queryByText('Translate to English')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Type Instead|Keyboard Free-Recall/i })).not.toBeInTheDocument();
    unmountEn1();

    const { unmount: unmountEn2 } = render(
      <WordBankView
        exercise={toFrEx}
        language="en"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    expect(screen.getByText('Build the English Phrase')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Type Instead/i })).toBeInTheDocument();
    unmountEn2();

    // PairMatchRushView for 'en'
    const pairEx: PairMatchRushExercise = {
      id: 'en-pm-test',
      type: 'pair_match_rush',
      title: 'Word Match',
      timeBonusSeconds: 30,
      pairs: [
        { id: 'p1', foreign: 'Hello!', english: 'Friendly greeting wave', phonetic: 'heh-LOH' },
        { id: 'p2', foreign: 'Thanks!', english: 'Grateful reply', phonetic: 'thangks' },
      ],
    };
    const { unmount: unmountPm } = render(
      <PairMatchRushView exercise={pairEx} language="en" compact={false} onComplete={vi.fn()} />
    );
    expect(screen.getByText(/Match each phrase with its meaning clue/i)).toBeInTheDocument();
    expect(screen.queryByText(/English partner/i)).not.toBeInTheDocument();
    unmountPm();

    // PhrasebookVault flashcard front for 'en'
    vaultActions.setActiveLanguage('en');
    vaultActions.completeMapNode({
      language: 'en',
      nodeId: 'en-u1-n1',
      stars: 3,
      xpEarned: 20,
      gemsEarned: 5,
      unlockedVocabIds: ['en-u1-c1', 'en-u1-c2'],
      maxCombo: 2,
    });
    const { unmount: unmountPb } = render(<PhrasebookVault />);
    fireEvent.click(screen.getByRole('button', { name: /Family Show-Off Mode/i }));
    expect(screen.getByText(/Tap card to flip & reveal meaning clue!/i)).toBeInTheDocument();
    unmountPb();

    // CafeOrderRushArcade on 'en' distinguishes both directions
    vi.useFakeTimers();
    const { unmount: unmountCafe } = render(<CafeOrderRushArcade onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Start Café Rush!/i }));
    const badge = screen.getByText(/^Order: Match/i);
    expect(['Order: Match Meaning Clue', 'Order: Match English Phrase']).toContain(
      badge.textContent?.trim()
    );
    expect(badge.textContent?.trim()).not.toBe('Order: Match English');
    unmountCafe();
  });

  it('Bug 5: LessonArena grades to_english in "en", exposes Replay fallback on promptText, and uses dir="ltr" on romanized Arabic accentCoaching', () => {
    // 1. German -> English false positive guard (de expands ue->ü if graded as 'de'!)
    const deToEnNode: MapNode = {
      id: 'de-en-test-node',
      unitId: 'de-u1',
      order: 1,
      nodeType: 'lesson',
      title: 'English Grading Check',
      subtitle: 'Do not apply German umlaut folding to English targets',
      xpReward: 20,
      gemReward: 5,
      rewardVocabIds: [],
      exercises: [
        {
          id: 'wb-de-to-en',
          type: 'word_bank',
          direction: 'to_english',
          promptText: 'Die Grüsse!',
          promptTokens: [],
          targetTokens: ['The', 'greetings'],
          distractorTokens: ['smiles'],
          expectedSentence: 'The greetings',
          acceptedSentences: ['The greetings'],
          phoneticHint: 'dee GREW-seh',
          vocabIds: [],
        },
      ],
    };
    const { unmount: unmountDe } = render(
      <LessonArena node={deToEnNode} language="de" onExit={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Type Instead/i }));
    fireEvent.change(screen.getByLabelText('Type your translation'), {
      target: { value: 'The grütings' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    // Wrong English vowel should fail when graded as 'en'
    expect(screen.getByText(/Almost there!/i)).toBeInTheDocument();
    // Replay audio button uses promptText even though promptSpeakText was omitted
    expect(screen.getByRole('button', { name: 'Replay audio' })).toBeInTheDocument();
    unmountDe();

    // 2. Romanized Arabic accepted answer renders accentCoaching.expected with dir="ltr"
    const arNode: MapNode = {
      id: 'ar-bidi-test-node',
      unitId: 'ar-u1',
      order: 1,
      nodeType: 'lesson',
      title: 'Bidi Coaching Check',
      subtitle: 'LTR dir on romanized expected text',
      xpReward: 20,
      gemReward: 5,
      rewardVocabIds: [],
      exercises: [
        {
          id: 'wb-ar-to-foreign',
          type: 'word_bank',
          direction: 'to_foreign',
          promptText: 'Thank you very much for your help!',
          promptTokens: [],
          targetTokens: ['شكراً', 'جزيلاً', 'على', 'مساعدتك'],
          distractorTokens: ['اليوم'],
          expectedSentence: 'شكراً جزيلاً على مساعدتك!',
          acceptedSentences: [
            'شكراً جزيلاً على مساعدتك!',
            'Shukran jazīlan ʿalā musāʿadatik!',
          ],
          phoneticHint: 'SHUK-ran ja-ZEE-lan a-la mu-sa-a-da-TIK',
          vocabIds: [],
        },
      ],
    };
    render(<LessonArena node={arNode} language="ar" onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Type Instead/i }));
    fireEvent.change(screen.getByLabelText('Type your translation'), {
      target: { value: 'Shukran jazilan ala musaadatik' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Accent Spotlight!/i)).toBeInTheDocument();
    const expectedStrong = screen.getByText('Shukran jazīlan ʿalā musāʿadatik!');
    expect(expectedStrong).toHaveAttribute('dir', 'ltr');
  });

  it('Bug 6: Grader accepts keyboard-friendly Arabic transliteration (no ʿ/ʾ or hyphens), Pinyin apostrophe omission, and Indic chandrabindu/nukta variants', () => {
    const arRes = gradeAnswer({
      submitted: 'Shukran jazilan ala musaadatik',
      expected: 'شكراً جزيلاً على مساعدتك!',
      accepted: ['Shukran jazīlan ʿalā musāʿadatik!'],
      language: 'ar',
    });
    expect(arRes.isCorrect).toBe(true);
    expect(arRes.heartPenalty).toBe(0);

    const arHyphen = gradeAnswer({
      submitted: 'Min fadlik uridu al qalil min al ma',
      expected: 'من فضلك، أريد القليل من الماء.',
      accepted: ['Min faḍlik, urīdu al-qalīl min al-māʾ.'],
      language: 'ar',
    });
    expect(arHyphen.isCorrect).toBe(true);
    expect(arHyphen.heartPenalty).toBe(0);

    const arzRes = gradeAnswer({
      submitted: 'Mutashakkir awi ala il hadaya ig gamila di',
      expected: 'متشكر قوي على الهدايا الجميلة دي!',
      accepted: ['Mutashakkir awī ʿala il-hadāya ig-gamīla dī!'],
      language: 'arz',
    });
    expect(arzRes.isCorrect).toBe(true);
    expect(arzRes.heartPenalty).toBe(0);

    const zhRes = gradeAnswer({
      submitted: 'wan an pengyou',
      expected: '晚安，朋友！',
      accepted: ["Wǎn'ān, péngyou!"],
      language: 'zh',
    });
    expect(zhRes.isCorrect).toBe(true);
    expect(zhRes.heartPenalty).toBe(0);

    // Hindi nukta (ड़ vs ड) & chandrabindu (ँ vs ं)
    const hiNukta = gradeAnswer({ submitted: 'बडा', expected: 'बड़ा', language: 'hi' });
    expect(hiNukta.isCorrect).toBe(true);
    expect(hiNukta.exactMatch).toBe(false);
    expect(hiNukta.heartPenalty).toBe(0);

    const hiChandra = gradeAnswer({ submitted: 'हूं', expected: 'हूँ', language: 'hi' });
    expect(hiChandra.isCorrect).toBe(true);
    expect(hiChandra.heartPenalty).toBe(0);

    // Bengali nukta (ড় vs ড) & chandrabindu (ঁ vs ং)
    const bnNukta = gradeAnswer({ submitted: 'বড', expected: 'বড়', language: 'bn' });
    expect(bnNukta.isCorrect).toBe(true);
    expect(bnNukta.exactMatch).toBe(false);
    expect(bnNukta.heartPenalty).toBe(0);

    // Guard: unrelated elided words in French remain rejected
    const frWrong = gradeAnswer({ submitted: 'le pain', expected: "l'eau", language: 'fr' });
    expect(frWrong.isCorrect).toBe(false);
    expect(frWrong.heartPenalty).toBe(1);
  });

  it('Bug 7: speaks foreignWithArticle when phonetic/display includes the article across DiscoveryCard, LessonArena, and Phrasebook', () => {
    const speakSpy = vi
      .spyOn(speechModule, 'speakPhrase')
      .mockResolvedValue({ usedNativeVoice: false, fallbackActive: true });

    const esSmile = Object.values(getCourse('es').vocabById).find(
      (c) => Boolean(c.article) && c.foreignWithArticle !== c.bareForeign
    )!;
    expect(esSmile).toBeDefined();
    expect(esSmile.foreignWithArticle).not.toBe(esSmile.bareForeign);

    const { unmount: unmountDc } = render(
      <DiscoveryCardView
        exercise={{ id: 'dc-art', type: 'discovery_card', vocabId: esSmile.id }}
        vocabCard={esSmile}
        language="es"
        compact={false}
        onTurtlePlay={vi.fn()}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: `Speak ${esSmile.bareForeign} at normal speed` })
    );
    expect(speakSpy).toHaveBeenCalledWith(expect.objectContaining({ text: esSmile.foreignWithArticle }));
    unmountDc();

    speakSpy.mockClear();
    const arenaNode: MapNode = {
      id: 'es-art-node',
      unitId: 'es-u1',
      order: 1,
      nodeType: 'lesson',
      title: 'Article Audio Check',
      subtitle: 'Uses foreignWithArticle',
      xpReward: 20,
      gemReward: 5,
      rewardVocabIds: [esSmile.id],
      exercises: [{ id: 'dc-art-1', type: 'discovery_card', vocabId: esSmile.id }],
    };
    const { unmount: unmountLa } = render(
      <LessonArena node={arenaNode} language="es" onExit={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Speak & Collect' }));
    expect(speakSpy).toHaveBeenCalledWith(expect.objectContaining({ text: esSmile.foreignWithArticle }));
    unmountLa();

    speakSpy.mockClear();
    vaultActions.setActiveLanguage('es');
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-u1-n1',
      stars: 3,
      xpEarned: 20,
      gemsEarned: 5,
      unlockedVocabIds: [esSmile.id],
      maxCombo: 2,
    });
    render(<PhrasebookVault />);
    // Existing aria-label contract stays untouched ("Speak sonrisa fluently") while spoken text matches card ("la sonrisa")
    fireEvent.click(screen.getByRole('button', { name: `Speak ${esSmile.bareForeign} fluently` }));
    expect(speakSpy).toHaveBeenCalledWith(expect.objectContaining({ text: esSmile.foreignWithArticle }));
  });

  it('Bug 8: Zero-Heart Recovery SkyCatcherArcade preserves active 2x XP Booster charges while standalone Arcade still uses a charge', () => {
    vi.useFakeTimers();
    expect(vaultActions.buyXpBooster()).toBe(true);
    expect(loadVaultFromStorage().profiles[0].xpBoosterCharges).toBe(XP_BOOSTER_CHARGES_PER_BUY);

    // Heart-recovery mode MUST NOT burn a 2x XP booster charge!
    const { unmount } = render(
      <SkyCatcherArcade isHeartRecovery arcadeTier="sprout" onResumeLesson={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Claim \+\d+ Hearts/i }));
    expect(loadVaultFromStorage().profiles[0].xpBoosterCharges).toBe(XP_BOOSTER_CHARGES_PER_BUY);
    unmount();

    // Standalone Arcade DOES consume 1 charge
    render(<SkyCatcherArcade arcadeTier="sprout" onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Start 45s Fiesta!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Claim \+\d+ Hearts/i }));
    expect(loadVaultFromStorage().profiles[0].xpBoosterCharges).toBe(XP_BOOSTER_CHARGES_PER_BUY - 1);
  });

  it('Bug 9: StarlightBridgeArcade extracts sentence_cloze blanks cleanly for en, ar, bn, zh, and ja (including 1-char CJK words)', () => {
    for (const lang of ['en', 'ar', 'bn', 'zh', 'ja'] as const) {
      const sprout = getArcadeLexicon(lang, [], 15, 'sprout');
      const hits = sprout.filter((item) => extractBlankFromExample(item, lang) !== null).length;
      expect(hits / sprout.length, `${lang} sentence_cloze extraction rate too low`).toBeGreaterThanOrEqual(0.7);
    }

    // Smoke-render StarlightBridgeArcade on 'en' and 'zh'
    vi.useFakeTimers();
    vaultActions.setActiveLanguage('zh');
    render(<StarlightBridgeArcade arcadeTier="sprout" onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
    expect(screen.getByRole('region', { name: 'Starlight Bridge Cloze Builder Arcade' })).toBeInTheDocument();
  });

  it('Bug 10 & 11: preserves dark-theme --lang-tint, uses tile-selected tokens on active tap-hints, and styles disabled buttons with readable contrast', () => {
    vaultActions.buyAndEquipCosmetic('theme_cosmic_galaxy');
    const { unmount } = render(<App />);
    const root = document.querySelector('.app-root') as HTMLElement | null;
    expect(root?.getAttribute('data-theme')).toBe('theme_cosmic_galaxy');
    // Dark theme must NOT have light pastel --lang-tint stamped inline
    expect(root?.style.getPropertyValue('--lang-tint')).toBe('');
    unmount();

    const css = readFileSync(resolve(__dirname, '..', 'src/styles/theme.css'), 'utf8');
    expect(css).toMatch(/\.tap-hint-token-btn:hover,\s*\.tap-hint-token-btn\.is-open\s*\{[^}]*var\(--tile-selected-bg\)[^}]*var\(--tile-selected-ink\)/s);
    expect(css).toMatch(/\.tactile-btn-amber:disabled[\s\S]*background:\s*var\(--card-soft-bg\)/);
  });

  it('Bug 12: isolates Arabic wrong-answer Expected text in dir="rtl" and adapts Free-Recall input dir between Arabic and romanized typing', () => {
    const arNode: MapNode = {
      id: 'ar-expected-bidi-node',
      unitId: 'ar-u1',
      order: 1,
      nodeType: 'lesson',
      title: 'Arabic Bidi Guard',
      subtitle: 'Wrong answer Expected bidi + adaptive Free-Recall dir',
      xpReward: 20,
      gemReward: 5,
      rewardVocabIds: [],
      exercises: [
        {
          id: 'wb-ar-bidi',
          type: 'word_bank',
          direction: 'to_foreign',
          promptText: 'My name is Pip.',
          promptTokens: [],
          targetTokens: ['اسمي', 'هو', 'بيب'],
          distractorTokens: ['الماء'],
          expectedSentence: 'اسمي هو بيب.',
          acceptedSentences: ['اسمي هو بيب.', 'اسمي هو بيب', 'Ismī huwa Bīb.'],
          phoneticHint: 'IS-mee HOO-wa BEEB',
          vocabIds: [],
        },
      ],
    };

    render(<LessonArena node={arNode} language="ar" onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Type Instead/i }));
    const input = screen.getByLabelText('Type your translation') as HTMLInputElement;

    // Empty input preserves RTL default on ar; romanized Latin switches input dir to ltr, Arabic back to rtl
    expect(input.getAttribute('dir')).toBe('rtl');
    fireEvent.change(input, { target: { value: 'مرحباً' } });
    expect(input.getAttribute('dir')).toBe('rtl');
    fireEvent.change(input, { target: { value: 'wrong answer' } });
    expect(input.getAttribute('dir')).toBe('ltr');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Almost there!/i)).toBeInTheDocument();
    const expectedSpan = screen.getByText('اسمي هو بيب.');
    expect(expectedSpan).toHaveAttribute('dir', 'rtl');
  });

  it('Bug 13: closes ProfileVaultModal and Phrasebook Show-Off modal when Escape is pressed', () => {
    const onClose = vi.fn();
    const { unmount } = render(<ProfileVaultModal onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();

    vaultActions.setActiveLanguage('es');
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-u1-n1',
      stars: 3,
      xpEarned: 20,
      gemsEarned: 5,
      unlockedVocabIds: ['es-u1-c1'],
      maxCombo: 2,
    });
    render(<PhrasebookVault />);
    fireEvent.click(screen.getByRole('button', { name: /Family Show-Off Mode/i }));
    expect(screen.getByRole('dialog', { name: 'Family Show-Off Flashcard Spotlight' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Family Show-Off Flashcard Spotlight' })).not.toBeInTheDocument();
  });
});
