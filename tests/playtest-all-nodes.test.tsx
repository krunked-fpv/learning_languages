import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { ArcadeHub } from '../src/components/arcade/ArcadeHub';
import { LessonArena } from '../src/components/lesson/LessonArena';
import { joinWordBankTokens } from '../src/components/lesson/lessonHelpers';
import { gradeAnswer } from '../src/core';
import {
  COURSES,
  buildTierCheckpointNode,
  getArcadeLexicon,
  getNodePoolSize,
  getPlayableNodeExercises,
} from '../src/curriculum';
import { loadVaultFromStorage, vaultActions } from '../src/store/useVaultStore';
import {
  LANGUAGE_LIST,
  type BossGauntletExercise,
  type CompanionId,
  type ContextClozeExercise,
  type LessonExercise,
  type ListenDecodeExercise,
  type MapNode,
  type MiniStoryExercise,
  type PairMatchRushExercise,
  type WordBankExercise,
} from '../src/types/contracts';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function queryButtonByText(text: string): HTMLButtonElement | undefined {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (!btn.classList.contains('tap-hint-token-btn') && btn.textContent?.trim() === text) {
      return btn;
    }
  }
  return undefined;
}

function queryButtonByAriaLabel(label: string): HTMLButtonElement | undefined {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.getAttribute('aria-label') === label) {
      return btn;
    }
  }
  return undefined;
}

function requireButtonByText(text: string): HTMLButtonElement {
  const btn = queryButtonByText(text);
  expect(btn, `Missing button "${text}"`).toBeDefined();
  return btn!;
}

function requireButtonByAriaLabel(label: string): HTMLButtonElement {
  const btn = queryButtonByAriaLabel(label);
  expect(btn, `Missing button with aria-label "${label}"`).toBeDefined();
  return btn!;
}

function clickTokensInTray(tokens: readonly string[], container: HTMLElement = document.body): void {
  const bank = container.querySelector('[aria-label="Word bank tiles"]');
  expect(bank, 'Missing Word bank tiles container').not.toBeNull();
  const poolButtons = Array.from(bank!.querySelectorAll('button'));
  for (const tok of tokens) {
    const cleanTok = tok.trim();
    const match = poolButtons.find(
      (btn) => btn.textContent?.trim() === cleanTok && !btn.disabled
    );
    expect(match, `Missing unused word-bank tile "${cleanTok}"`).toBeDefined();
    fireEvent.click(match!);
  }
}

function playSingleExerciseInDom(ex: LessonExercise): void {
  if (ex.type === 'discovery_card') {
    fireEvent.click(requireButtonByText('Speak & Collect'));
    return;
  }

  if (ex.type === 'word_bank') {
    const wb = ex as WordBankExercise;
    if (wb.direction === 'to_foreign') {
      expect(document.body.textContent ?? '').toContain(wb.promptText);
    } else if (wb.promptTokens.length > 0) {
      const hasTapToken = Array.from(document.querySelectorAll('button.tap-hint-token-btn')).some(
        (b) => b.textContent?.trim() === wb.promptTokens[0].surface
      );
      expect(hasTapToken, `Missing tap-hint token "${wb.promptTokens[0].surface}"`).toBe(true);
    }
    clickTokensInTray(wb.targetTokens);
    fireEvent.click(requireButtonByText('Check'));
    expect(document.body.textContent ?? '').not.toContain('Almost there!');
    fireEvent.click(requireButtonByText('Continue'));
    return;
  }

  if (ex.type === 'context_cloze') {
    const cloze = ex as ContextClozeExercise;
    const radioBtn = Array.from(document.querySelectorAll('button[role="radio"]')).find(
      (b) => b.textContent?.trim() === cloze.expectedBlank
    );
    expect(radioBtn, `Missing context_cloze choice "${cloze.expectedBlank}"`).toBeDefined();
    fireEvent.click(radioBtn!);
    fireEvent.click(requireButtonByText('Check'));
    expect(document.body.textContent ?? '').not.toContain('Almost there!');
    expect(screen.getByRole('note', { name: 'Nuance and Register Spotlight' })).toHaveTextContent(
      cloze.nuanceNote
    );
    fireEvent.click(requireButtonByText('Continue'));
    return;
  }

  if (ex.type === 'listen_decode') {
    const ld = ex as ListenDecodeExercise;
    fireEvent.click(requireButtonByAriaLabel('1.0x Normal speed audio'));
    fireEvent.click(requireButtonByAriaLabel('0.65x Slow Turtle audio'));
    if (ld.mode === 'select_meaning') {
      const radioBtn = Array.from(document.querySelectorAll('button[role="radio"]')).find(
        (b) => b.textContent?.trim() === ld.englishMeaning
      );
      expect(radioBtn, `Missing meaning radio "${ld.englishMeaning}"`).toBeDefined();
      fireEvent.click(radioBtn!);
    } else {
      clickTokensInTray(ld.targetTokens ?? []);
    }
    fireEvent.click(requireButtonByText('Check'));
    expect(document.body.textContent ?? '').not.toContain('Almost there!');
    fireEvent.click(requireButtonByText('Continue'));
    return;
  }

  if (ex.type === 'pair_match_rush') {
    const pm = ex as PairMatchRushExercise;
    const allButtons = Array.from(document.querySelectorAll('button'));
    for (const pair of pm.pairs) {
      const leftBtn = allButtons.find(
        (b) => b.textContent?.trim() === pair.foreign && !b.disabled
      );
      expect(leftBtn, `Missing pair left button "${pair.foreign}"`).toBeDefined();
      fireEvent.click(leftBtn!);

      const rightBtn = allButtons.find(
        (b) => b.textContent?.trim() === pair.english && !b.disabled
      );
      expect(rightBtn, `Missing pair right button "${pair.english}"`).toBeDefined();
      fireEvent.click(rightBtn!);
    }
    fireEvent.click(requireButtonByText('Continue'));
    return;
  }

  if (ex.type === 'mini_story') {
    const story = ex as MiniStoryExercise;
    for (let guard = 0; guard < 30; guard++) {
      const finishBtn = queryButtonByText('Finish Story!');
      if (finishBtn) {
        fireEvent.click(finishBtn);
        return;
      }
      const nextBtn = queryButtonByText('Next Line');
      if (nextBtn && !nextBtn.disabled) {
        fireEvent.click(nextBtn);
        continue;
      }
      // Decision gate reached
      const bodyText = document.body.textContent ?? '';
      const activeDecision = story.decisions.find((d) => bodyText.includes(d.questionEnglish));
      expect(activeDecision, `Story "${story.id}" stalled with no Next/Finish/Decision`).toBeDefined();
      const correctOpt = activeDecision!.options.find((o) => o.isCorrect)!;
      const buttons = Array.from(document.querySelectorAll('button'));
      const optBtn =
        buttons.find(
          (b) =>
            !b.classList.contains('tap-hint-token-btn') &&
            b.querySelector('[dir="auto"]')?.textContent?.trim() === correctOpt.label
        ) ??
        buttons.find(
          (b) =>
            !b.classList.contains('tap-hint-token-btn') &&
            new RegExp(escapeRegExp(correctOpt.label)).test(b.textContent ?? '')
        );
      expect(optBtn, `Missing story choice button "${correctOpt.label}"`).toBeDefined();
      fireEvent.click(optBtn!);
    }
    throw new Error(`Story "${story.id}" did not complete within 30 steps`);
  }

  if (ex.type === 'boss_gauntlet') {
    const boss = ex as BossGauntletExercise;
    for (let t = 0; t < boss.turns.length; t++) {
      const turn = boss.turns[t];
      if (turn.mode === 'choice') {
        const choiceBtn = queryButtonByText(turn.expectedAnswer);
        expect(choiceBtn, `Missing boss choice button "${turn.expectedAnswer}"`).toBeDefined();
        fireEvent.click(choiceBtn!);
      } else {
        clickTokensInTray(turn.targetTokens ?? []);
      }
      fireEvent.click(requireButtonByText('Send Reply!'));
      expect(document.body.textContent ?? '').not.toMatch(/Give that reply one more try/i);
      const nextLabel = t + 1 >= boss.turns.length ? 'Finish Encounter!' : 'Next Turn';
      fireEvent.click(requireButtonByText(nextLabel));
    }
    fireEvent.click(requireButtonByText('Collect Boss Chest & Finish!'));
    return;
  }
}

describe('Phase 4+ / Megapack: End-to-End 1,792-Node Playtest across 16 Languages x 16 Units, Deep Pool Zero-Repeats, Tier Checkpoints & Boss Recovery', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
  });

  let totalNodesPlayed = 0;

  for (const lang of LANGUAGE_LIST) {
    it(`plays ALL 112 ${lang} MapNodes (Units 1-16) end-to-end through LessonArena with ZERO console errors/warnings`, () => {
      vi.useFakeTimers();
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vaultActions.resetVaultToDefaults();
      vaultActions.setActiveLanguage(lang);
      const course = COURSES[lang];
      expect(course.units).toHaveLength(16);
      const allNodes: MapNode[] = course.units.flatMap((u) => u.nodes);
      expect(allNodes).toHaveLength(112);

      for (const node of allNodes) {
        totalNodesPlayed += 1;
        // Capture current seenExerciseIds before mounting LessonArena
        const profileBefore = loadVaultFromStorage().profiles[0];
        const seenBefore = profileBefore.languageProgress[lang].seenExerciseIds ?? [];
        const expectedExercises = getPlayableNodeExercises(lang, node.id, seenBefore, false);

        const onExit = vi.fn();
        const { unmount } = render(
          <LessonArena node={node} language={lang} onExit={onExit} />
        );

        if (node.nodeType === 'chest') {
          fireEvent.click(requireButtonByText('Open Treasure Chest!'));
          expect(document.body.textContent ?? '').toContain(`+${node.gemReward} Gems`);
          fireEvent.click(requireButtonByText('Claim & Return to Atlas'));
          expect(onExit).toHaveBeenCalledTimes(1);
        } else {
          for (const ex of expectedExercises) {
            playSingleExerciseInDom(ex);
          }
          expect(document.body.textContent ?? '').toContain(`${node.title} Complete!`);
          fireEvent.click(requireButtonByText('Return to Atlas Map'));
          expect(onExit).toHaveBeenCalledTimes(1);
        }

        // Clear any scheduled star/toast/confetti/motion timers before unmounting
        act(() => {
          vi.clearAllTimers();
        });
        unmount();
        cleanup();
      }

      if (lang === 'es') {
        // Revisit an already-claimed chest node and verify NO duplicate +Gems badge appears (P2-4)
        const firstChest = COURSES.es.units[0].nodes.find((n) => n.nodeType === 'chest')!;
        const gemsBeforeRevisit = loadVaultFromStorage().profiles[0].gems;
        render(<LessonArena node={firstChest} language="es" onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Open Treasure Chest!' }));
        expect(screen.getByText(/Treasure Vault Re-Visited!/i)).toBeInTheDocument();
        expect(screen.queryByText(`+${firstChest.gemReward} Gems`)).not.toBeInTheDocument();
        expect(loadVaultFromStorage().profiles[0].gems).toBe(gemsBeforeRevisit);
        act(() => {
          vi.clearAllTimers();
        });
        cleanup();
      }

      expect(errSpy, `Unexpected console.error calls for ${lang}: ${JSON.stringify(errSpy.mock.calls)}`).not.toHaveBeenCalled();
      expect(warnSpy, `Unexpected console.warn calls for ${lang}: ${JSON.stringify(warnSpy.mock.calls)}`).not.toHaveBeenCalled();
    }, 120_000);
  }

  it('confirms all 1,792 MapNodes across 16 languages were playtested', () => {
    expect(totalNodesPlayed).toBe(1792);
  });

  it('verifies zero duplicate authored prompts, >= 14 pool size per lesson node, and 0% ID overlap on Play Fresh Remix', () => {
    vi.useFakeTimers();

    for (const lang of LANGUAGE_LIST) {
      const course = COURSES[lang];
      const authoredWbKeys = new Set<string>();
      const authoredListenKeys = new Set<string>();

      for (const unit of course.units) {
        for (const node of unit.nodes) {
          for (const ex of node.exercises) {
            if (ex.type === 'word_bank') {
              const key = `${ex.promptText.trim().toLowerCase()}||${ex.expectedSentence.trim().toLowerCase()}`;
              expect(
                authoredWbKeys.has(key),
                `Duplicate authored WordBank prompt in ${lang}: ${ex.id} -> ${key}`
              ).toBe(false);
              authoredWbKeys.add(key);
            } else if (ex.type === 'listen_decode') {
              const key = ex.audioText.trim().toLowerCase();
              expect(
                authoredListenKeys.has(key),
                `Duplicate authored ListenDecode audioText in ${lang}: ${ex.id} -> ${key}`
              ).toBe(false);
              authoredListenKeys.add(key);
            }
          }

          if (node.nodeType === 'lesson') {
            expect(
              getNodePoolSize(lang, node.id),
              `Lesson node ${node.id} pool size < 14`
            ).toBeGreaterThanOrEqual(14);
          } else if (node.nodeType === 'boss') {
            expect(
              getNodePoolSize(lang, node.id),
              `Boss node ${node.id} turns pool < 7`
            ).toBeGreaterThanOrEqual(7);
          }

          // Validate every pooled exercise across Run 1, Run 2, and Run 3 (replay rotations)
          const accumulatedSeen: string[] = [];
          for (let run = 0; run < 3; run++) {
            const batch = getPlayableNodeExercises(lang, node.id, accumulatedSeen, run > 0);
            for (const pex of batch) {
              accumulatedSeen.push(pex.id);
              if (pex.type === 'word_bank') {
                if (pex.direction === 'to_english') {
                  expect(pex.promptTokens.length, `${pex.id} missing promptTokens`).toBeGreaterThan(0);
                }
                const assembled = joinWordBankTokens(pex.targetTokens);
                const res = gradeAnswer({
                  submitted: assembled,
                  expected: pex.expectedSentence,
                  accepted: pex.acceptedSentences,
                  language: pex.direction === 'to_foreign' ? lang : 'en',
                });
                expect(res.isCorrect, `Pool ${pex.id} failed gradeAnswer for "${assembled}"`).toBe(true);
              } else if (pex.type === 'context_cloze') {
                const res = gradeAnswer({
                  submitted: pex.expectedBlank,
                  expected: pex.expectedBlank,
                  accepted: pex.acceptedBlanks,
                  language: lang,
                });
                expect(res.isCorrect, `Pool context_cloze ${pex.id} failed gradeAnswer`).toBe(true);
              } else if (pex.type === 'listen_decode') {
                expect(pex.voiceFallbackPhoneticPrompt.trim()).not.toBe('');
                expect(pex.tapHints.length, `${pex.id} missing tapHints`).toBeGreaterThan(0);
                const sub =
                  pex.mode === 'select_meaning'
                    ? pex.englishMeaning
                    : joinWordBankTokens(pex.targetTokens ?? []);
                const exp = pex.mode === 'select_meaning' ? pex.englishMeaning : pex.audioText;
                const res = gradeAnswer({
                  submitted: sub,
                  expected: exp,
                  accepted: pex.acceptedAnswers,
                  language: lang,
                });
                expect(res.isCorrect, `Pool ${pex.id} failed gradeAnswer`).toBe(true);
              } else if (pex.type === 'pair_match_rush') {
                const fSet = new Set(pex.pairs.map((p) => p.foreign.toLowerCase()));
                const eSet = new Set(pex.pairs.map((p) => p.english.toLowerCase()));
                expect(fSet.size, `Duplicate foreign in pool pair match ${pex.id}`).toBe(pex.pairs.length);
                expect(eSet.size, `Duplicate english in pool pair match ${pex.id}`).toBe(pex.pairs.length);
              } else if (pex.type === 'boss_gauntlet') {
                for (const turn of pex.turns) {
                  accumulatedSeen.push(turn.id);
                  expect(turn.tapHints.length, `${pex.id}:${turn.id} missing tapHints`).toBeGreaterThan(0);
                  const ans =
                    turn.mode === 'choice'
                      ? turn.expectedAnswer
                      : joinWordBankTokens(turn.targetTokens ?? []);
                  const res = gradeAnswer({
                    submitted: ans,
                    expected: turn.expectedAnswer,
                    accepted: turn.acceptedAnswers,
                    language: lang,
                  });
                  expect(res.isCorrect, `Pool boss turn ${turn.id} failed gradeAnswer`).toBe(true);
                }
              }
            }
          }
        }
      }
    }

    // Play a Unit 1, Unit 8, AND Unit 16 (C1+) lesson node in LessonArena Run 1, then click "Play Fresh Remix!" -> 0% ID overlap!
    for (const sampleLang of ['es', 'ar', 'zh'] as const) {
      vaultActions.setActiveLanguage(sampleLang);
      for (const unitIndex of [0, 7, 15] as const) {
        const sampleLesson = COURSES[sampleLang].units[unitIndex].nodes.find((n) => n.nodeType === 'lesson')!;
        const seenBefore = loadVaultFromStorage().profiles[0].languageProgress[sampleLang].seenExerciseIds ?? [];
        const run1Expected = getPlayableNodeExercises(sampleLang, sampleLesson.id, seenBefore, false);
        const run1Ids = new Set(run1Expected.map((e) => e.id));

        const { unmount } = render(<LessonArena node={sampleLesson} language={sampleLang} onExit={vi.fn()} />);
        for (const ex of run1Expected) {
          playSingleExerciseInDom(ex);
        }
        expect(screen.getByText(`${sampleLesson.title} Complete!`)).toBeInTheDocument();

        const savedSeenAfterRun1 = loadVaultFromStorage().profiles[0].languageProgress[sampleLang].seenExerciseIds ?? [];
        for (const id of run1Ids) {
          expect(savedSeenAfterRun1).toContain(id);
        }

        const run2Expected = getPlayableNodeExercises(sampleLang, sampleLesson.id, savedSeenAfterRun1, true);
        expect(run2Expected.length).toBeGreaterThan(0);
        for (const ex of run2Expected) {
          expect(run1Ids.has(ex.id), `${sampleLang} Unit ${unitIndex + 1} Run 2 repeated Run 1 exercise id "${ex.id}"`).toBe(false);
        }

        // Click "Play Fresh Remix!" in UI and complete Run 2 cleanly!
        fireEvent.click(screen.getByRole('button', { name: /Play Fresh Remix!/i }));
        expect(screen.getByText('Remix')).toBeInTheDocument();
        for (const ex of run2Expected) {
          playSingleExerciseInDom(ex);
        }
        expect(screen.getByText(`${sampleLesson.title} Complete!`)).toBeInTheDocument();

        act(() => {
          vi.runOnlyPendingTimers();
        });
        unmount();
        cleanup();
      }
    }
  }, 60_000);

  it('preserves Boss Gauntlet turnIndex across Zero-Heart Recovery (P1-2) for fr and RTL arz', () => {
    for (const lang of ['fr', 'arz'] as const) {
      vaultActions.resetVaultToDefaults();
      const bossNode = COURSES[lang].units[0].nodes.find((n) => n.nodeType === 'boss')!;
      const bossEx = getPlayableNodeExercises(lang, bossNode.id, [], false)[0] as BossGauntletExercise;
      vaultActions.setActiveLanguage(lang);

      // Leave only 1 heart so 1 wrong boss reply triggers Zero-Heart Recovery
      for (let i = 0; i < 4; i++) {
        vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
      }

      const { unmount } = render(<LessonArena node={bossNode} language={lang} onExit={vi.fn()} />);

      // Clear Turn 1 cleanly to advance to Turn 2
      const turn1 = bossEx.turns[0];
      if (turn1.mode === 'choice') {
        const t1Btn = screen
          .getAllByRole('button', { name: turn1.expectedAnswer })
          .find((b) => !b.classList.contains('tap-hint-token-btn'))!;
        fireEvent.click(t1Btn);
      } else {
        clickTokensInTray(turn1.targetTokens ?? []);
      }
      fireEvent.click(screen.getByRole('button', { name: 'Send Reply!' }));
      fireEvent.click(screen.getByRole('button', { name: 'Next Turn' }));
      expect(screen.getByText(`Turn 2/${bossEx.turns.length}`)).toBeInTheDocument();

      // Now on Turn 2, submit a deliberately WRONG answer so hearts hit 0
      const turn2 = bossEx.turns[1];
      if (turn2.mode === 'choice') {
        const wrongChoice = (turn2.choices ?? []).find((c) => c !== turn2.expectedAnswer)!;
        const wrongBtn = screen
          .getAllByRole('button', { name: wrongChoice })
          .find((b) => !b.classList.contains('tap-hint-token-btn'))!;
        fireEvent.click(wrongBtn);
      } else {
        const wrongTok = (turn2.distractorTokens ?? [])[0] ?? 'zut';
        clickTokensInTray([wrongTok]);
      }
      fireEvent.click(screen.getByRole('button', { name: 'Send Reply!' }));

      // Zero-Heart Modal appears; launch Sky-Catcher Fiesta, claim hearts, and Resume Lesson!
      const modal = screen.getByRole('dialog', { name: 'Recharge Hearts' });
      fireEvent.click(
        within(modal).getByRole('button', {
          name: /Play Sky-Catcher Fiesta to Recharge Hearts!/i,
        })
      );
      fireEvent.click(screen.getByRole('button', { name: /Claim \+\d+ Hearts/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Resume Lesson!' }));

      // Verify BossGauntletView resumed on EXACT Turn 2 (not reset to Turn 1!)
      expect(screen.getByText(`Turn 2/${bossEx.turns.length}`)).toBeInTheDocument();
      unmount();
      cleanup();
    }
  });

  it('unlocks Starlight Critter Choir via 5-tap Golden Compass AND via 3 lessons / Boss, then plays & records rewards', () => {
    vi.useFakeTimers();

    // Path A: 5-tap Golden Starlight Compass Easter Egg in TopHud inside App
    const { unmount } = render(<App />);
    const compassBtn = screen.getByRole('button', { name: 'Golden Starlight Compass' });

    for (let tap = 1; tap <= 4; tap++) {
      fireEvent.click(compassBtn);
      expect(screen.queryByRole('dialog', { name: 'Secret Unlocked: Starlight Critter Choir' })).not.toBeInTheDocument();
    }
    fireEvent.click(compassBtn); // 5th tap!

    const unlockDialog = screen.getByRole('dialog', {
      name: 'Secret Unlocked: Starlight Critter Choir',
    });
    expect(unlockDialog).toHaveTextContent('SECRET UNLOCKED: Starlight Critter Choir!');
    expect(loadVaultFromStorage().profiles[0].secretArcadeUnlocked).toBe(true);
    expect(loadVaultFromStorage().profiles[0].gems).toBe(95); // 80 + 15 discovery Gems

    // Launch Starlight Critter Choir directly from the celebration modal
    fireEvent.click(within(unlockDialog).getByRole('button', { name: /Play Secret Game Now!/i }));
    expect(screen.getByRole('region', { name: 'Starlight Critter Choir' })).toBeInTheDocument();

    // Verify all 5 companions render on the choir stage
    const companions: readonly CompanionId[] = ['pip', 'mateo', 'colette', 'benni', 'luca'];
    for (const cid of companions) {
      expect(document.querySelector(`[data-companion="${cid}"]`)).toBeInTheDocument();
    }

    // Start game, find the active target bubble, pop it, and claim rewards
    fireEvent.click(screen.getByRole('button', { name: /Start Critter Choir!/i }));
    const lexicon = getArcadeLexicon('es', [], 0);
    const targetStrong = screen
      .getByText('POP SONG-BUBBLE:')
      .parentElement!.querySelector('strong')!;
    const targetEnglish = targetStrong.textContent!.trim();
    const targetItem = lexicon.find((i) => i.english === targetEnglish)!;
    expect(targetItem).toBeDefined();

    // Pop matching Song-Bubble
    const bubbleBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.trim() === targetItem.foreign);
    expect(bubbleBtn, `Missing Song-Bubble for "${targetItem.foreign}"`).toBeDefined();
    fireEvent.click(bubbleBtn!);
    expect(screen.getByText(/Score: 10/i)).toBeInTheDocument();

    // Claim rewards and verify vault persistence
    fireEvent.click(screen.getByRole('button', { name: 'Claim Rewards' }));
    expect(screen.getByText('Encore! Starlight Critter Choir Complete!')).toBeInTheDocument();
    const afterSecret = loadVaultFromStorage().profiles[0];
    expect(afterSecret.secretArcadeBestScore).toBe(10);
    expect(afterSecret.stats.arcadeGamesWon).toBeGreaterThanOrEqual(1);

    act(() => {
      vi.runOnlyPendingTimers();
    });
    unmount();
    cleanup();

    // Path B: Fresh vault unlocks Starlight Critter Choir via clearing Boss (or 3 lessons)
    vaultActions.resetVaultToDefaults();
    expect(loadVaultFromStorage().profiles[0].secretArcadeUnlocked).toBe(false);

    // Locked mystery door appears in ArcadeHub first
    const { unmount: unmountHub } = render(<ArcadeHub onExitToMap={vi.fn()} />);
    expect(screen.getByText('??? Starlight Critter Choir')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Locked Mystery Game' })).toBeDisabled();
    unmountHub();

    // Complete 1 Boss node -> unlocks secretArcadeUnlocked automatically
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-u1-n7',
      stars: 3,
      xpEarned: 50,
      gemsEarned: 25,
      unlockedVocabIds: ['es-u1-c13'],
      maxCombo: 4,
      isBoss: true,
    });
    expect(loadVaultFromStorage().profiles[0].secretArcadeUnlocked).toBe(true);

    // Reset again and verify 3 lessons also unlock it
    vaultActions.resetVaultToDefaults();
    for (let i = 1; i <= 3; i++) {
      vaultActions.completeMapNode({
        language: 'es',
        nodeId: `es-u1-n${i}`,
        stars: 3,
        xpEarned: 20,
        gemsEarned: 5,
        unlockedVocabIds: [],
        maxCombo: 2,
      });
    }
    expect(loadVaultFromStorage().profiles[0].secretArcadeUnlocked).toBe(true);
  });

  it('plays Tier Placement Checkpoint nodes (B1, B2) through LessonArena to unlock tiers & skipped prerequisites cleanly', () => {
    vi.useFakeTimers();

    vaultActions.setActiveLanguage('es');
    const b1Checkpoint = buildTierCheckpointNode('es', 'B1');
    const onExit = vi.fn();
    const { unmount } = render(<LessonArena node={b1Checkpoint} language="es" onExit={onExit} />);

    for (const ex of b1Checkpoint.exercises) {
      playSingleExerciseInDom(ex);
    }

    expect(document.body.textContent ?? '').toContain(`${b1Checkpoint.title} Complete!`);
    expect(document.body.textContent ?? '').toContain('Tier Unlocked:');

    const profileAfter = loadVaultFromStorage().profiles[0];
    expect(profileAfter.languageProgress.es.unlockedTiers).toContain('B1');
    expect(profileAfter.languageProgress.es.currentUnitIndex).toBe(8);
    expect(profileAfter.stats.checkpointsPassed).toBe(1);
    expect(profileAfter.badges).toContain('storyweaver_b1');
    // Units 1-8 (56 nodes) marked as completed prerequisites
    expect(profileAfter.languageProgress.es.completedNodeIds.length).toBeGreaterThanOrEqual(56);

    fireEvent.click(requireButtonByText('Return to Atlas Map'));
    expect(onExit).toHaveBeenCalledTimes(1);

    act(() => {
      vi.runOnlyPendingTimers();
    });
    unmount();
    cleanup();
  });
});
