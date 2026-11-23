import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { stopSpeech } from '../../src/audio';
import { ArcadeHub } from '../../src/components/arcade/ArcadeHub';
import { CafeOrderRushArcade } from '../../src/components/arcade/CafeOrderRushArcade';
import { ConstellationMemoryArcade } from '../../src/components/arcade/ConstellationMemoryArcade';
import { MeteorBlasterArcade } from '../../src/components/arcade/MeteorBlasterArcade';
import { RhythmChefArcade } from '../../src/components/arcade/RhythmChefArcade';
import { SkyCatcherArcade } from '../../src/components/arcade/SkyCatcherArcade';
import { StarlightBridgeArcade } from '../../src/components/arcade/StarlightBridgeArcade';
import { StarlightSecretGame } from '../../src/components/arcade/StarlightSecretGame';
import { TowerStackArcade } from '../../src/components/arcade/TowerStackArcade';
import { TrainSwitcherArcade } from '../../src/components/arcade/TrainSwitcherArcade';
import { ARCADE_TIER_META } from '../../src/components/arcade/arcadeShared';
import { getArcadeLexicon } from '../../src/curriculum';
import { loadVaultFromStorage, vaultActions } from '../../src/store/useVaultStore';
import {
  LANGUAGE_META,
  type ArcadeProficiencyTier,
  type BaseLanguageCode,
  type CompanionId,
} from '../../src/types/contracts';

interface ArcadeCabinetTestSpec {
  gameId: string;
  launchButtonName: string | RegExp;
  startButtonName: RegExp;
  playTurn: () => void;
  finishButtonName: string | RegExp;
  completeHeading: string;
  exitSummaryButtonName: string;
  renderDirect: (tier: ArcadeProficiencyTier, onExit: () => void) => JSX.Element;
}

const ARCADE_SPECS: readonly ArcadeCabinetTestSpec[] = [
  {
    gameId: 'sky_catcher',
    launchButtonName: 'Play Sky-Catcher',
    startButtonName: /Start 45s Fiesta!/i,
    playTurn: () => {
      fireEvent.click(screen.getByRole('button', { name: 'Move Pip left' }));
      fireEvent.click(screen.getByRole('button', { name: 'Move Pip right' }));
    },
    finishButtonName: /Claim \+\d+ Hearts/i,
    completeHeading: 'Sky-Catcher Complete!',
    exitSummaryButtonName: 'Back to Atlas Map',
    renderDirect: (tier, onExit) => <SkyCatcherArcade arcadeTier={tier} onExit={onExit} />,
  },
  {
    gameId: 'meteor_blaster',
    launchButtonName: 'Launch Blaster',
    startButtonName: /Launch Starfighter!/i,
    playTurn: () => {
      fireEvent.click(screen.getByRole('button', { name: /Lane 1/i }));
      fireEvent.click(screen.getByRole('button', { name: /Lane 2/i }));
      fireEvent.click(screen.getByRole('button', { name: /Lane 3/i }));
    },
    finishButtonName: 'Finish',
    completeHeading: 'Cosmic Meteor Blaster Complete!',
    exitSummaryButtonName: 'Back to Arcade Hub',
    renderDirect: (tier, onExit) => <MeteorBlasterArcade arcadeTier={tier} onExit={onExit} />,
  },
  {
    gameId: 'tower_stack',
    launchButtonName: 'Stack Gelato',
    startButtonName: /Start Stacking!/i,
    playTurn: () => {
      fireEvent.click(screen.getByRole('button', { name: /Drop Scoop!/i }));
    },
    finishButtonName: 'Finish',
    completeHeading: 'Gelato & Pastry Tower Complete!',
    exitSummaryButtonName: 'Back to Arcade Hub',
    renderDirect: (tier, onExit) => <TowerStackArcade arcadeTier={tier} onExit={onExit} />,
  },
  {
    gameId: 'constellation_memory',
    launchButtonName: 'Chart Stars',
    startButtonName: /Chart the Stars!/i,
    playTurn: () => {
      fireEvent.click(screen.getByRole('button', { name: 'Star card 1' }));
      fireEvent.click(screen.getByRole('button', { name: 'Star card 2' }));
    },
    finishButtonName: 'Claim Rewards',
    completeHeading: 'Constellation Memory Complete!',
    exitSummaryButtonName: 'Back to Arcade Hub',
    renderDirect: (tier, onExit) => <ConstellationMemoryArcade arcadeTier={tier} onExit={onExit} />,
  },
  {
    gameId: 'train_switcher',
    launchButtonName: 'Switch Tracks',
    startButtonName: /Start Express Shift!/i,
    playTurn: () => {
      fireEvent.click(screen.getByRole('button', { name: /Track 1/i }));
      fireEvent.click(screen.getByRole('button', { name: /Track 2/i }));
    },
    finishButtonName: 'Finish',
    completeHeading: 'Alpine Express Switcher Complete!',
    exitSummaryButtonName: 'Back to Arcade Hub',
    renderDirect: (tier, onExit) => <TrainSwitcherArcade arcadeTier={tier} onExit={onExit} />,
  },
  {
    gameId: 'rhythm_chef',
    launchButtonName: 'Play Rhythm',
    startButtonName: /Start Kitchen Beat!/i,
    playTurn: () => {
      fireEvent.click(screen.getByRole('button', { name: /Pad 1/i }));
    },
    finishButtonName: 'Finish',
    completeHeading: 'Beat Kitchen Rhythm Complete!',
    exitSummaryButtonName: 'Back to Arcade Hub',
    renderDirect: (tier, onExit) => <RhythmChefArcade arcadeTier={tier} onExit={onExit} />,
  },
  {
    gameId: 'cafe_order_rush',
    launchButtonName: 'Serve Café Rush',
    startButtonName: /Start Café Rush!/i,
    playTurn: () => {
      fireEvent.click(screen.getByRole('button', { name: /Platter 1/i }));
    },
    finishButtonName: 'Finish',
    completeHeading: 'Polyglot Café Order Rush Complete!',
    exitSummaryButtonName: 'Back to Arcade Hub',
    renderDirect: (tier, onExit) => <CafeOrderRushArcade arcadeTier={tier} onExit={onExit} />,
  },
  {
    gameId: 'starlight_bridge',
    launchButtonName: 'Build Star Bridge',
    startButtonName: /Start Bridge Sprint!/i,
    playTurn: () => {
      fireEvent.click(screen.getByRole('button', { name: /Plank 1/i }));
    },
    finishButtonName: 'Finish',
    completeHeading: 'Starlight Bridge Complete!',
    exitSummaryButtonName: 'Back to Arcade Hub',
    renderDirect: (tier, onExit) => <StarlightBridgeArcade arcadeTier={tier} onExit={onExit} />,
  },
  {
    gameId: 'starlight_choir',
    launchButtonName: /Play Starlight Critter Choir!/i,
    startButtonName: /Start Critter Choir!/i,
    playTurn: () => {
      const targetStrong = screen
        .getByText('POP SONG-BUBBLE:')
        .parentElement?.querySelector('strong');
      expect(targetStrong).toBeTruthy();
    },
    finishButtonName: 'Claim Rewards',
    completeHeading: 'Encore! Starlight Critter Choir Complete!',
    exitSummaryButtonName: 'Back to Arcade Hub',
    renderDirect: (tier, onExit) => <StarlightSecretGame arcadeTier={tier} onExit={onExit} />,
  },
];

const TIERS: readonly ArcadeProficiencyTier[] = ['sprout', 'voyager', 'master'];

function setupControlledRaf() {
  let nextId = 1;
  let nowMs = 1000;
  const callbacks = new Map<number, FrameRequestCallback>();

  vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

  const rafSpy = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((cb: FrameRequestCallback) => {
      const id = nextId++;
      callbacks.set(id, cb);
      return id;
    });

  const cancelSpy = vi
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation((id: number) => {
      callbacks.delete(id);
    });

  const stepFrames = (count: number, stepMs = 45) => {
    for (let i = 0; i < count; i++) {
      nowMs += stepMs;
      const batch = Array.from(callbacks.entries());
      callbacks.clear();
      for (const [, cb] of batch) {
        cb(nowMs);
      }
    }
  };

  return { rafSpy, cancelSpy, callbacks, stepFrames };
}

function playFiveStreakDiscoFever(
  lang: BaseLanguageCode,
  tier: ArcadeProficiencyTier,
  stepFrames: (count: number, stepMs?: number) => void
): void {
  vaultActions.setActiveLanguage(lang);
  vaultActions.unlockSecretArcade();

  // Seed C1_C2 progress when running master tier so long C1_C2 prompts enter lexicon
  if (tier === 'master') {
    vaultActions.setCurrentUnitIndex(lang, 15);
  }

  const { container, unmount } = render(<StarlightSecretGame arcadeTier={tier} onExit={vi.fn()} />);

  for (const cid of ['pip', 'mateo', 'colette', 'benni', 'luca'] as const satisfies readonly CompanionId[]) {
    expect(container.querySelector(`[data-companion="${cid}"]`)).toBeInTheDocument();
  }

  fireEvent.click(screen.getByRole('button', { name: /Start Critter Choir!/i }));

  const lexicon = getArcadeLexicon(lang, [], tier === 'master' ? 15 : 0, tier);
  expect(lexicon.length).toBeGreaterThan(0);

  let streakReached = false;
  for (let round = 0; round < 5; round++) {
    act(() => {
      stepFrames(28, 45);
    });
    const targetStrong = screen
      .getByText('POP SONG-BUBBLE:')
      .parentElement!.querySelector('strong')!;
    const targetEnglish = targetStrong.textContent!.trim();
    const targetItem = lexicon.find((item) => item.english === targetEnglish);
    expect(targetItem, `${lang}/${tier}: missing lexicon item for "${targetEnglish}"`).toBeDefined();

    let bubbleBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.trim() === targetItem!.foreign);
    for (let attempt = 0; !bubbleBtn && attempt < 10; attempt++) {
      act(() => {
        stepFrames(15, 45);
      });
      bubbleBtn = screen
        .getAllByRole('button')
        .find((b) => b.textContent?.trim() === targetItem!.foreign);
    }
    expect(bubbleBtn, `${lang}/${tier}: Song-Bubble "${targetItem!.foreign}" not spawned`).toBeDefined();
    fireEvent.click(bubbleBtn!);

    if (round === 4) {
      expect(document.body.textContent ?? '').toContain('STARLIGHT DISCO FEVER! +20 pts!');
      expect(document.body.textContent ?? '').toContain('DISCO FEVER 2x!');
      expect(container.querySelector('.disco-fever-stage')).toBeInTheDocument();
      streakReached = true;
    }
  }

  expect(streakReached).toBe(true);
  if (LANGUAGE_META[lang].dir === 'rtl') {
    expect(container.querySelectorAll('[dir="rtl"]').length).toBeGreaterThan(0);
  }

  fireEvent.click(screen.getByRole('button', { name: 'Claim Rewards' }));
  expect(screen.getByText('Encore! Starlight Critter Choir Complete!')).toBeInTheDocument();
  const profile = loadVaultFromStorage().profiles[0];
  expect(profile.secretArcadeBestScore).toBeGreaterThanOrEqual(60); // 4*10 + 20 = 60
  expect(profile.arcadeHighScores?.starlight_choir).toBeGreaterThanOrEqual(60);

  act(() => {
    vi.runOnlyPendingTimers();
  });
  unmount();
  cleanup();
}

describe('Cohort C [PT-047..PT-073]: 9 Arcade Mini-Games x 3 Tiers (27 Runs) & Critter Choir Disco Matrix', () => {
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

  let nextPt = 47;
  for (const spec of ARCADE_SPECS) {
    for (const tier of TIERS) {
      const ptId = `PT-${String(nextPt++).padStart(3, '0')}`;

      it(`[${ptId}] ${spec.gameId} (${tier}): runs via ArcadeHub, settles score/hearts/gems/XP via recordArcadeGameResult, and unmounts RAF/timers cleanly`, () => {
        vi.useFakeTimers();
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { rafSpy, cancelSpy, callbacks, stepFrames } = setupControlledRaf();

        vaultActions.resetVaultToDefaults();
        // Drain 2 hearts so heart settlement is observable
        vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
        vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
        expect(loadVaultFromStorage().profiles[0].hearts).toBe(3);

        // Unlock secret choir when running starlight_choir matrix entries
        if (spec.gameId === 'starlight_choir') {
          if (tier === 'sprout') {
            // Trigger 1: 5-tap Golden Starlight Compass in TopHud
            const { unmount: unmountApp } = render(<App />);
            const compassBtn = screen.getByRole('button', { name: 'Golden Starlight Compass' });
            for (let tap = 1; tap <= 4; tap++) {
              fireEvent.click(compassBtn);
              expect(
                screen.queryByRole('dialog', { name: 'Secret Unlocked: Starlight Critter Choir' })
              ).not.toBeInTheDocument();
            }
            fireEvent.click(compassBtn);
            expect(
              screen.getByRole('dialog', { name: 'Secret Unlocked: Starlight Critter Choir' })
            ).toBeInTheDocument();
            expect(loadVaultFromStorage().profiles[0].secretArcadeUnlocked).toBe(true);
            unmountApp();
            cleanup();
          } else if (tier === 'voyager') {
            // Trigger 2: 3 completed lessons
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
          } else {
            // Trigger 3: 1 Boss Gauntlet cleared
            vaultActions.completeMapNode({
              language: 'es',
              nodeId: 'es-u1-n7',
              stars: 3,
              xpEarned: 50,
              gemsEarned: 25,
              unlockedVocabIds: [],
              maxCombo: 4,
              isBoss: true,
            });
            expect(loadVaultFromStorage().profiles[0].secretArcadeUnlocked).toBe(true);
          }
        }

        const before = loadVaultFromStorage().profiles[0];
        const xpBefore = before.totalXp;
        const winsBefore = before.stats.arcadeGamesWon;

        const { unmount } = render(<ArcadeHub onExitToMap={vi.fn()} />);

        // Select tier in ArcadeHub
        const tierGroup = screen.getByRole('group', { name: 'Arcade proficiency tier' });
        const tierLabelRe = new RegExp(ARCADE_TIER_META[tier].label, 'i');
        fireEvent.click(within(tierGroup).getByRole('button', { name: tierLabelRe }));
        expect(within(tierGroup).getByRole('button', { name: tierLabelRe })).toHaveAttribute(
          'aria-pressed',
          'true'
        );

        // Launch cabinet, start run, step RAF ticks, interact, finish
        fireEvent.click(screen.getByRole('button', { name: spec.launchButtonName }));
        fireEvent.click(screen.getByRole('button', { name: spec.startButtonName }));

        // BUG-001 regression gate: TowerStack scoops must never simultaneously overlap at dead center
        if (spec.gameId === 'tower_stack' && tier === 'sprout') {
          let sawTargetNearCenter = false;
          for (let f = 0; f < 240; f++) {
            act(() => {
              stepFrames(1, 20);
            });
            const scoops = Array.from(document.querySelectorAll<HTMLDivElement>('div')).filter(
              (d) => d.style.willChange === 'left'
            );
            if (scoops.length >= 2) {
              const x0 = parseFloat(scoops[0].style.left);
              const x1 = parseFloat(scoops[1].style.left);
              if (Math.abs(x0 - 50) <= 3 || Math.abs(x1 - 50) <= 3) {
                sawTargetNearCenter = true;
                expect(
                  Math.abs(x0 - x1) >= 12 || scoops[0].style.top !== scoops[1].style.top,
                  `BUG-001: TowerStack scoops collided at center (x0=${x0.toFixed(2)}, x1=${x1.toFixed(2)}, top=${scoops[0].style.top})`
                ).toBe(true);
                break;
              }
            }
          }
          expect(sawTargetNearCenter).toBe(true);
        }

        act(() => {
          stepFrames(4, 30);
        });
        spec.playTurn();
        fireEvent.click(screen.getByRole('button', { name: spec.finishButtonName }));
        expect(screen.getByText(spec.completeHeading)).toBeInTheDocument();

        const afterRun = loadVaultFromStorage().profiles[0];
        expect(afterRun.totalXp).toBeGreaterThan(xpBefore);
        expect(afterRun.stats.arcadeGamesWon).toBe(winsBefore + 1);
        expect(typeof afterRun.arcadeHighScores?.[spec.gameId]).toBe('number');
        expect(afterRun.hearts).toBeGreaterThanOrEqual(3);

        // Verify direct recordArcadeGameResult contract
        act(() => {
          vaultActions.recordArcadeGameResult({
            gameId: spec.gameId,
            score: 999,
            heartsWon: 2,
            bonusGems: 7,
            xpEarned: 44,
          });
        });
        const afterDirect = loadVaultFromStorage().profiles[0];
        expect(afterDirect.arcadeHighScores?.[spec.gameId]).toBe(999);
        expect(afterDirect.gems).toBe(afterRun.gems + 7);
        expect(afterDirect.totalXp).toBe(afterRun.totalXp + 44);

        fireEvent.click(screen.getByRole('button', { name: spec.exitSummaryButtonName }));
        act(() => {
          vi.runOnlyPendingTimers();
        });
        unmount();
        cleanup();

        // Mid-game unmount test: ensure active RAF & timers cancel cleanly with zero leaks
        const { unmount: unmountMid } = render(spec.renderDirect(tier, vi.fn()));
        fireEvent.click(screen.getByRole('button', { name: spec.startButtonName }));
        act(() => {
          stepFrames(3, 30);
        });
        const rafCountBeforeUnmount = rafSpy.mock.calls.length;
        expect(rafCountBeforeUnmount).toBeGreaterThan(0);
        unmountMid();
        expect(cancelSpy).toHaveBeenCalled();
        expect(callbacks.size).toBe(0);
        act(() => {
          vi.runOnlyPendingTimers();
        });
        cleanup();

        // Starlight Critter Choir 5-streak Starlight Disco Fever across Latin, RTL, CJK, Indic & long prompts
        if (spec.gameId === 'starlight_choir') {
          if (tier === 'sprout') {
            playFiveStreakDiscoFever('es', 'sprout', stepFrames);
            playFiveStreakDiscoFever('zh', 'sprout', stepFrames);
          } else if (tier === 'voyager') {
            playFiveStreakDiscoFever('ar', 'voyager', stepFrames);
            playFiveStreakDiscoFever('hi', 'voyager', stepFrames);
          } else {
            playFiveStreakDiscoFever('de', 'master', stepFrames);
            playFiveStreakDiscoFever('arz', 'master', stepFrames);
          }
        }

        expect(errSpy, `${ptId} console.error: ${JSON.stringify(errSpy.mock.calls)}`).not.toHaveBeenCalled();
        expect(warnSpy, `${ptId} console.warn: ${JSON.stringify(warnSpy.mock.calls)}`).not.toHaveBeenCalled();
      }, 30_000);
    }
  }
});
