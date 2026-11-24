import '@testing-library/jest-dom/vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import * as speechModule from '../src/audio/speechEngine';
import { SKY_CATCHER_TUNING, SkyCatcherArcade } from '../src/components/arcade/SkyCatcherArcade';
import { BossGauntletView } from '../src/components/lesson/BossGauntletView';
import { ContextClozeView } from '../src/components/lesson/ContextClozeView';
import { DiscoveryCardView } from '../src/components/lesson/DiscoveryCardView';
import { LessonArena } from '../src/components/lesson/LessonArena';
import { ListenDecodeView } from '../src/components/lesson/ListenDecodeView';
import { MiniStoryView } from '../src/components/lesson/MiniStoryView';
import { PairMatchRushView } from '../src/components/lesson/PairMatchRushView';
import { TapHintText } from '../src/components/lesson/TapHintText';
import { WordBankTray } from '../src/components/lesson/WordBankTray';
import { WordBankView } from '../src/components/lesson/WordBankView';
import { AdventureMap } from '../src/components/map/AdventureMap';
import { CompanionShop } from '../src/components/meta/CompanionShop';
import { LeagueAndBadges } from '../src/components/meta/LeagueAndBadges';
import { PhrasebookVault } from '../src/components/meta/PhrasebookVault';
import { ProfileVaultModal } from '../src/components/shell/ProfileVaultModal';
import { TopHud } from '../src/components/shell/TopHud';
import { getCourse } from '../src/curriculum';
import { createDefaultVault, loadVaultFromStorage, vaultActions } from '../src/store/useVaultStore';
import {
  FREE_RECALL_BONUS_GEMS,
  FREE_RECALL_BONUS_XP,
  LANGUAGE_LIST,
  LANGUAGE_META,
  type BossGauntletExercise,
  type ContextClozeExercise,
  type ListenDecodeExercise,
  type MapNode,
  type MiniStoryExercise,
  type PairMatchRushExercise,
  type TapHintToken,
  type WordBankExercise,
} from '../src/types/contracts';

const ROOT_DIR = resolve(__dirname, '..');

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(full, out);
    } else if (/\.(ts|tsx|css)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('Challenge 6: UI/CSS/Component Static & DOM Red-Team Audit', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('enforces static hygiene: zero TODO/FIXME, dead onClick={() => {}}, Coming Soon UI placeholders, or external CDN URLs across src/', () => {
    const srcFiles = walkTsFiles(resolve(ROOT_DIR, 'src'));
    for (const filePath of srcFiles) {
      const text = readFileSync(filePath, 'utf8');
      expect(text, `TODO/FIXME found in ${filePath}`).not.toMatch(/\b(TODO|FIXME|HACK|XXX)\b/);
      expect(text, `Dead empty onClick found in ${filePath}`).not.toMatch(
        /onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/
      );
      if (!filePath.includes(`${join('src', 'curriculum')}`)) {
        expect(text, `"Coming Soon" placeholder found in ${filePath}`).not.toMatch(/coming\s+soon/i);
      }
      // Only allow SVG namespace URI, zero external CDN/API/font hotlinks
      const urls = text.match(/https?:\/\/[^\s"'`)]+/gi) ?? [];
      for (const u of urls) {
        expect(u, `Unexpected external URL "${u}" in ${filePath}`).toBe('http://www.w3.org/2000/svg');
      }
    }
  });

  it('locks .lesson-arena-shell to strict 100dvh flex-column overflow-hidden with internal stage scroll', () => {
    const css = readFileSync(resolve(ROOT_DIR, 'src/styles/theme.css'), 'utf8');
    expect(css).not.toMatch(/@import\s+url\(/i);

    const shellBlock = css.match(/\.lesson-arena-shell\s*\{[\s\S]*?\}/)?.[0] ?? '';
    expect(shellBlock).toContain('height: 100dvh');
    expect(shellBlock).toContain('max-height: 100dvh');
    expect(shellBlock).toContain('overflow: hidden');
    expect(shellBlock).toContain('display: flex');
    expect(shellBlock).toContain('flex-direction: column');

    const stageBlock = css.match(/\.lesson-arena-stage\s*\{[\s\S]*?\}/)?.[0] ?? '';
    expect(stageBlock).toContain('flex: 1 1 auto');
    expect(stageBlock).toContain('min-height: 0');
    expect(stageBlock).toContain('overflow-y: auto');

    expect(css).toContain('max-height: calc(100dvh - 28px)');
    expect(css).toContain('max-width: calc(100vw - 16px)');
    expect(css).toMatch(/\[dir='rtl'\]\s*\{[^}]*line-height:\s*1\.5/s);
    expect(css).toContain('.console-scroll-pane-x');
    expect(css).toContain('Noto Sans Arabic');
    expect(css).toContain('Noto Sans SC');
    expect(css).toContain('Noto Sans JP');
    expect(css).toContain('Noto Sans Devanagari');
    expect(css).toContain('Noto Sans Bengali');
  });

  it('renders TopHud with custom SVG flags, switches languages, toggles audio, and shows conditional Install App button', () => {
    const onOpenProfile = vi.fn();
    const onOpenArcade = vi.fn();
    const onInstall = vi.fn();

    const { rerender } = render(
      <TopHud
        onOpenProfileModal={onOpenProfile}
        onOpenArcade={onOpenArcade}
        canInstallApp={false}
        onInstallApp={onInstall}
      />
    );

    expect(screen.queryByRole('button', { name: /Install App/i })).not.toBeInTheDocument();

    const langBtn = screen.getByRole('button', { name: /Active language: Spanish/i });
    expect(langBtn.querySelector('svg[data-flag="es"]')).toBeInTheDocument();

    fireEvent.click(langBtn);
    const dialog = screen.getByRole('dialog', { name: 'Switch Language' });
    fireEvent.click(within(dialog).getByRole('button', { name: /French/i }));
    expect(screen.getByRole('button', { name: /Active language: French/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Switch Language' })).not.toBeInTheDocument();

    // Audio popover open + Escape close
    fireEvent.click(screen.getByRole('button', { name: 'Sound and volume settings' }));
    const audioDialog = screen.getByRole('dialog', { name: 'Audio Volume' });
    fireEvent.click(within(audioDialog).getByRole('button', { name: 'Sound On' }));
    expect(within(audioDialog).getByRole('button', { name: 'Muted' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Audio Volume' })).not.toBeInTheDocument();

    // Install App appears conditionally when canInstallApp=true
    rerender(
      <TopHud
        onOpenProfileModal={onOpenProfile}
        onOpenArcade={onOpenArcade}
        canInstallApp
        onInstallApp={onInstall}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Install App/i }));
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it('opens and closes TapHintText word popovers cleanly with translation, phonetics, and tips', () => {
    const tokens: TapHintToken[] = [
      {
        surface: "l'eau",
        normalizedId: 'leau',
        translation: 'the water',
        phonetic: 'LOH',
        articleNote: "Elided article l' before vowel",
        speakText: "l'eau",
      },
      {
        surface: 'fraîche',
        normalizedId: 'fraiche',
        translation: 'fresh',
        phonetic: 'FREHSH',
        accentNote: 'î keeps the vowel crisp',
        speakText: 'fraîche',
      },
    ];

    render(<TapHintText tokens={tokens} language="fr" />);
    const tokenBtn = screen.getByRole('button', { name: "l'eau" });
    fireEvent.click(tokenBtn);

    const popover = screen.getByRole('dialog', { name: "Word hint for l'eau" });
    expect(popover).toHaveTextContent('the water');
    expect(popover).toHaveTextContent('LOH');
    expect(popover).toHaveTextContent("Elided article l' before vowel");

    fireEvent.click(screen.getByRole('button', { name: 'Close word hint' }));
    expect(screen.queryByRole('dialog', { name: "Word hint for l'eau" })).not.toBeInTheDocument();

    // Reopen and close via Escape
    fireEvent.click(screen.getByRole('button', { name: 'fraîche' }));
    expect(screen.getByRole('dialog', { name: 'Word hint for fraîche' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Word hint for fraîche' })).not.toBeInTheDocument();
  });

  it('completes LessonArena with Type-Instead accent coaching AND recovers from 0 hearts via SkyCatcherArcade', () => {
    // Construct a minimal node with 1 to_foreign word_bank containing diacritic
    const wordBankEx: WordBankExercise = {
      type: 'word_bank',
      id: 'redteam-wb-1',
      direction: 'to_foreign',
      promptText: 'Good morning!',
      promptTokens: [],
      expectedSentence: '¡Buenos días!',
      acceptedSentences: ['¡Buenos días!', 'Buenos días'],
      targetTokens: ['¡Buenos', 'días!'],
      distractorTokens: ['noches'],
      phoneticHint: 'BWEH-nohs DEE-ahs',
      vocabIds: ['es-u1-c2'],
    };

    const node: MapNode = {
      id: 'redteam-node-1',
      unitId: 'es-u1',
      order: 1,
      nodeType: 'lesson',
      title: 'Red-Team Trial',
      subtitle: 'Accent & zero-heart audit',
      xpReward: 20,
      gemReward: 5,
      exercises: [wordBankEx],
      rewardVocabIds: ['es-u1-c2'],
    };

    // Drain 4 of 5 hearts before mounting LessonArena so 1 mistake triggers Zero-Heart Recovery Modal
    for (let i = 0; i < 4; i++) {
      vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
    }

    const onExit = vi.fn();
    render(<LessonArena node={node} language="es" onExit={onExit} />);
    expect(screen.getByLabelText('1 of 5 hearts')).toBeInTheDocument();

    // Switch to Type Instead and submit a genuinely wrong answer
    fireEvent.click(screen.getByRole('button', { name: /Type Instead/i }));
    const input = screen.getByLabelText('Type your translation') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'buenas noches' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    // Hearts dropped to 0 -> Zero-Heart Recovery Modal appears immediately!
    const rechargeDialog = screen.getByRole('dialog', { name: 'Recharge Hearts' });
    expect(rechargeDialog).toHaveTextContent('Pip’s Hearts Need a Recharge!');

    // Launch Sky-Catcher Fiesta recovery inline
    fireEvent.click(
      within(rechargeDialog).getByRole('button', {
        name: /Play Sky-Catcher Fiesta to Recharge Hearts!/i,
      })
    );
    expect(screen.getByRole('region', { name: 'Sky-Catcher Fiesta Arcade' })).toBeInTheDocument();

    // Move Pip via Left/Right & Arrow keys, then claim hearts
    fireEvent.click(screen.getByRole('button', { name: 'Move Pip left' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Pip right' }));
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyUp(window, { key: 'ArrowLeft' });
    fireEvent.click(screen.getByRole('button', { name: /Claim \+\d+ Hearts/i }));

    expect(screen.getByText('Sky-Catcher Complete!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resume Lesson!' }));

    // Back in LessonArena with restored hearts; now answer with missing accent ("Buenos dias") -> Accent Spotlight!
    expect(screen.queryByRole('dialog', { name: 'Recharge Hearts' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Type Instead/i }));
    const inputRetry = screen.getByLabelText('Type your translation');
    fireEvent.change(inputRetry, { target: { value: 'Buenos dias' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByText(/Accent Spotlight!/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Red-Team Trial Complete!')).toBeInTheDocument();
  });

  it('renders PhrasebookVault search, unlocked stickers, and Family Show-Off Mode flip deck', () => {
    // Unlock 2 Spanish stickers first
    const esCard1 = getCourse('es').units[0].vocabCards[0];
    const esCard2 = getCourse('es').units[0].vocabCards[1];
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-u1-n1',
      stars: 3,
      xpEarned: 25,
      gemsEarned: 10,
      unlockedVocabIds: [esCard1.id, esCard2.id],
      maxCombo: 2,
    });

    render(<PhrasebookVault />);
    expect(screen.getByText(/2 \/ \d+ Stickers Collected/i)).toBeInTheDocument();

    // Open Family Show-Off Mode and flip/advance deck
    fireEvent.click(screen.getByRole('button', { name: /Family Show-Off Mode/i }));
    const modal = screen.getByRole('dialog', { name: 'Family Show-Off Flashcard Spotlight' });
    expect(modal).toHaveTextContent(esCard1.foreignWithArticle);
    fireEvent.click(within(modal).getByRole('button', { name: 'Flip' }));
    expect(modal).toHaveTextContent(esCard1.english);
    fireEvent.click(within(modal).getByRole('button', { name: /Next Card/i }));
    expect(modal).toHaveTextContent(esCard2.foreignWithArticle);
    fireEvent.click(within(modal).getByRole('button', { name: 'Close Family Show-Off Mode' }));
    expect(screen.queryByRole('dialog', { name: 'Family Show-Off Flashcard Spotlight' })).not.toBeInTheDocument();

    // Search filter unmatched state
    const search = screen.getByLabelText('Search phrasebook');
    fireEvent.change(search, { target: { value: 'zzzznonexistent' } });
    expect(screen.getByText('No stickers matched your search filter.')).toBeInTheDocument();
  });

  it('renders CompanionShop preview, cosmetic buy & equip, Streak Shield purchase, and ProfileVaultModal', () => {
    render(<App />);

    // Navigate to Gem Shop via BottomNav
    fireEvent.click(screen.getByRole('button', { name: /Gem Shop/i }));
    expect(screen.getByText('Streak Freeze Shield')).toBeInTheDocument();

    // Preview Starlight Wizard Hat -> updates MascotStage data-equipped-cosmetics
    fireEvent.click(screen.getByRole('button', { name: 'Preview Starlight Wizard Hat' }));
    const stage = document.querySelector('[data-companion="pip"]');
    expect(stage?.getAttribute('data-equipped-cosmetics')).toContain('hat_starlight_wizard');

    // Buy & Equip Montmartre Explorer Beret (35 gems -> 45 left)
    fireEvent.click(screen.getByRole('button', { name: /Buy & Equip \(35\)/i }));
    expect(screen.getByText('Unlocked & equipped Montmartre Explorer Beret!')).toBeInTheDocument();

    // Buy Streak Shield (45 gems -> 0 left)
    fireEvent.click(screen.getByRole('button', { name: /Buy Shield \(45 Gems\)/i }));
    expect(screen.getByText('Streak Freeze Shield added to your pack!')).toBeInTheDocument();

    // Open ProfileVaultModal and test profile creation & corrupt JSON import error handling
    fireEvent.click(screen.getByRole('button', { name: /Switch kid profile/i }));
    const profileModal = screen.getByRole('dialog', { name: 'Explorer Profiles and Save Vault' });
    fireEvent.click(within(profileModal).getByRole('button', { name: /\+ New Kid Explorer/i }));
    fireEvent.change(within(profileModal).getByLabelText('New explorer name'), {
      target: { value: 'Aria' },
    });
    fireEvent.click(within(profileModal).getByRole('button', { name: 'Create Explorer' }));
    expect(within(profileModal).getByText('Welcome aboard, Aria!')).toBeInTheDocument();

    // Paste corrupt JSON -> shows error feedback
    fireEvent.click(within(profileModal).getByRole('button', { name: 'Paste JSON' }));
    fireEvent.change(within(profileModal).getByLabelText('Paste save JSON'), {
      target: { value: '{broken' },
    });
    fireEvent.click(within(profileModal).getByRole('button', { name: 'Import Pasted JSON' }));
    expect(within(profileModal).getByRole('status')).toHaveTextContent(/Invalid JSON syntax/i);

    fireEvent.click(within(profileModal).getByRole('button', { name: 'Close profiles modal' }));
    expect(
      screen.queryByRole('dialog', { name: 'Explorer Profiles and Save Vault' })
    ).not.toBeInTheDocument();
  });

  it('runs standalone SkyCatcherArcade ready -> playing -> summary flow cleanly', () => {
    const onExit = vi.fn();
    render(<SkyCatcherArcade onExit={onExit} />);
    fireEvent.click(screen.getByRole('button', { name: /Start 45s Fiesta!/i }));
    expect(screen.getByText('CATCH:')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Claim \+\d+ Hearts/i }));
    expect(screen.getByText('Sky-Catcher Complete!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Atlas Map' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('speaks target foreign word aloud on initial spawn, subsequent target spawns, and missed-target respawns in SkyCatcherArcade', () => {
    const speakSpy = vi
      .spyOn(speechModule, 'speakPhrase')
      .mockResolvedValue({ usedNativeVoice: false, fallbackActive: true });
    const stopSpy = vi.spyOn(speechModule, 'stopSpeech').mockImplementation(() => {});

    let fakeNow = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow);

    let rafCb: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCb = cb;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
      rafCb = null;
    });

    const stepFrames = (count: number, dtMs = 40) => {
      for (let i = 0; i < count; i += 1) {
        if (!rafCb) break;
        const cb = rafCb;
        rafCb = null;
        fakeNow += dtMs;
        act(() => {
          cb(fakeNow);
        });
      }
    };

    expect(SKY_CATCHER_TUNING.initialLanternSpeed).toBeLessThanOrEqual(16);
    expect(SKY_CATCHER_TUNING.lanternMinSpeed + SKY_CATCHER_TUNING.lanternSpeedRange).toBeLessThanOrEqual(18.5);

    const { container } = render(<SkyCatcherArcade arcadeTier="sprout" onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Start 45s Fiesta!/i }));

    // 1. Initial target lantern spawns & speaks immediately
    expect(speakSpy).toHaveBeenCalledTimes(1);
    const firstReq = speakSpy.mock.calls[0][0];
    expect(firstReq).toEqual(
      expect.objectContaining({
        language: 'es',
        speed: 'normal',
      })
    );
    expect(firstReq.text.trim().length).toBeGreaterThan(0);
    expect(firstReq.phonetic?.trim().length).toBeGreaterThan(0);
    expect(screen.getByTestId('sky-catcher-voice-cue')).toBeInTheDocument();

    // 2. Slower pace: after 3.5s (87 * 40ms = 3.48s), initial lantern is still descending and not yet caught
    stepFrames(87, 40);
    expect(screen.getByText('Catches: 0')).toBeInTheDocument();

    // Step until Pip (centered at x=50%) catches the initial lantern
    stepFrames(35, 40);
    expect(screen.getByText('Catches: 1')).toBeInTheDocument();

    // 3. Step ~0.6s more for the next target lantern to spawn and speak aloud
    stepFrames(16, 40);
    expect(speakSpy).toHaveBeenCalledTimes(2);
    const secondReq = speakSpy.mock.calls[1][0];
    expect(secondReq.language).toBe('es');
    expect(secondReq.text).not.toBe(firstReq.text);

    // 4. Move Pip away from the spawned 2nd target lantern so it drifts past uncaught and respawns
    const lanterns = Array.from(container.querySelectorAll<HTMLElement>('.arcade-sky-lantern'));
    const secondLantern = lanterns.find((el) => el.textContent?.includes(secondReq.text));
    const secondX = secondLantern ? parseFloat(secondLantern.style.left) : 50;
    const dodgeBtnName = secondX >= 50 ? 'Move Pip left' : 'Move Pip right';
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: dodgeBtnName }));
    }

    // Advance up to 11s until the 2nd target drifts past y >= 105 and respawns at the top
    for (let i = 0; i < 275 && speakSpy.mock.calls.length < 3; i += 1) {
      stepFrames(1, 40);
    }
    expect(speakSpy).toHaveBeenCalledTimes(3);
    expect(speakSpy.mock.calls[2][0]).toEqual(
      expect.objectContaining({
        text: secondReq.text,
        language: 'es',
        speed: 'normal',
      })
    );

    // 5. Finishing the round stops any active speech cleanly
    fireEvent.click(screen.getByRole('button', { name: /Claim \+\d+ Hearts/i }));
    expect(stopSpy).toHaveBeenCalled();
  });

  it('exercises standalone CompanionShop filters/unequip and ProfileVaultModal last-profile delete guard', () => {
    const { unmount } = render(<CompanionShop />);
    fireEvent.click(screen.getByRole('button', { name: 'UI Themes' }));
    expect(screen.getByText('Starlight Indigo Theme')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Buy & Equip \(60\)/i }));
    expect(screen.getByText('Unlocked & equipped Starlight Indigo Theme!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unequip' }));
    expect(screen.getByText('Unequipped Starlight Indigo Theme.')).toBeInTheDocument();
    unmount();

    const onClose = vi.fn();
    render(<ProfileVaultModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete profile Maya' }));
    const deleteLeo = screen.getByRole('button', { name: 'Delete profile Leo' });
    expect(deleteLeo).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close profiles modal' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('plays real MiniStory, PairMatchRush, BossGauntlet, AdventureMap, and LeagueAndBadges without errors', () => {
    const frCourse = getCourse('fr');
    const unit1 = frCourse.units[0];

    // 1. AdventureMap node gating + active Pip cosmetics
    const onSelectNode = vi.fn();
    const defaultProfile = createDefaultVault().profiles[1]; // Maya (fr)
    const { unmount: unmountMap } = render(
      <AdventureMap
        course={frCourse}
        progress={defaultProfile.languageProgress.fr}
        equippedCosmetics={{ hat: 'hat_explorer_beret' }}
        onSelectNode={onSelectNode}
      />
    );
    const firstNodeBtn = document.querySelector(`[data-node-id="${unit1.nodes[0].id}"]`)!;
    const secondNodeBtn = document.querySelector(`[data-node-id="${unit1.nodes[1].id}"]`)!;
    expect(firstNodeBtn.getAttribute('data-node-state')).toBe('active');
    expect(secondNodeBtn.getAttribute('data-node-state')).toBe('locked');
    expect(secondNodeBtn).toBeDisabled();
    fireEvent.click(firstNodeBtn);
    expect(onSelectNode).toHaveBeenCalledWith(unit1.nodes[0]);
    unmountMap();

    // 2. Real MiniStory progression & decision handling
    const storyNode = unit1.nodes.find((n) => n.nodeType === 'story')!;
    const storyEx = storyNode.exercises[0] as MiniStoryExercise;
    const onStoryComplete = vi.fn();
    const { unmount: unmountStory } = render(
      <MiniStoryView
        exercise={storyEx}
        language="fr"
        compact={false}
        onTurtlePlay={vi.fn()}
        onComplete={onStoryComplete}
      />
    );
    for (let step = 0; step < 30; step++) {
      const finishBtn = screen.queryByRole('button', { name: 'Finish Story!' });
      if (finishBtn) {
        fireEvent.click(finishBtn);
        break;
      }
      const nextBtn = screen.queryByRole('button', { name: 'Next Line' });
      if (nextBtn && !(nextBtn as HTMLButtonElement).disabled) {
        fireEvent.click(nextBtn);
        continue;
      }
      // Decision gate reached: pick the correct option
      const bubbleIndex = Math.min(step, storyEx.bubbles.length - 1);
      const dec =
        storyEx.decisions.find((d) =>
          screen.queryByText(new RegExp(d.questionEnglish.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        ) ?? storyEx.decisions[0];
      const correctOpt = dec.options.find((o) => o.isCorrect)!;
      fireEvent.click(screen.getByRole('button', { name: new RegExp(correctOpt.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }));
      void bubbleIndex;
    }
    expect(onStoryComplete).toHaveBeenCalledTimes(1);
    unmountStory();

    // 3. Real PairMatchRush board matching
    const rushEx = unit1.nodes
      .flatMap((n) => n.exercises)
      .find((e): e is PairMatchRushExercise => e.type === 'pair_match_rush')!;
    const onRushComplete = vi.fn();
    const { unmount: unmountRush } = render(
      <PairMatchRushView
        exercise={rushEx}
        language="fr"
        compact={false}
        onComplete={onRushComplete}
      />
    );
    for (const pair of rushEx.pairs) {
      fireEvent.click(screen.getByRole('button', { name: pair.foreign }));
      fireEvent.click(screen.getByRole('button', { name: pair.english }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onRushComplete).toHaveBeenCalledWith(
      expect.objectContaining({ maxRushCombo: rushEx.pairs.length })
    );
    unmountRush();

    // 4. Real BossGauntlet multi-turn clear
    const bossNode = unit1.nodes.find((n) => n.nodeType === 'boss')!;
    const bossEx = bossNode.exercises[0] as BossGauntletExercise;
    const onBossComplete = vi.fn();
    const { unmount: unmountBoss } = render(
      <BossGauntletView
        exercise={bossEx}
        language="fr"
        compact={false}
        onTurtlePlay={vi.fn()}
        onTurnResult={vi.fn()}
        onComplete={onBossComplete}
      />
    );
    for (let t = 0; t < bossEx.turns.length; t++) {
      const turn = bossEx.turns[t];
      if (turn.mode === 'choice') {
        fireEvent.click(screen.getByRole('button', { name: turn.expectedAnswer }));
      } else {
        const bank = screen.getByLabelText('Word bank tiles');
        const tiles = Array.from(bank.querySelectorAll('button'));
        for (const tok of turn.targetTokens ?? []) {
          const btn = tiles.find(
            (b) => b.textContent?.trim() === tok && !(b as HTMLButtonElement).disabled
          );
          expect(btn, `Missing boss tile "${tok}"`).toBeDefined();
          fireEvent.click(btn!);
        }
      }
      fireEvent.click(screen.getByRole('button', { name: 'Send Reply!' }));
      const advanceName = t + 1 >= bossEx.turns.length ? 'Finish Encounter!' : 'Next Turn';
      fireEvent.click(screen.getByRole('button', { name: advanceName }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Collect Boss Chest & Finish!' }));
    expect(onBossComplete).toHaveBeenCalledWith(bossEx.rewardChestGems);
    unmountBoss();

    // 5. LeagueAndBadges renders all 24 badges and all 8 league tiers
    render(<LeagueAndBadges />);
    expect(screen.getByText(/Expedition Badges \(0 \/ 24\)/i)).toBeInTheDocument();
    expect(screen.getByText('Grand Polyglot Laureate')).toBeInTheDocument();
    expect(screen.getByText('Amethyst Symposium')).toBeInTheDocument();
    expect(screen.getByText('Emerald Diplomat')).toBeInTheDocument();
    expect(screen.getByText('Laureate Legend')).toBeInTheDocument();
  });

  it('renders all 16 SVG flags and bounded pickers in TopHud, PhrasebookVault, and ProfileVaultModal', () => {
    const onOpenProfile = vi.fn();
    const onOpenArcade = vi.fn();
    const onInstall = vi.fn();

    // 1. TopHud 2-col 16-language Expedition Grid switcher
    const { unmount: unmountHud } = render(
      <TopHud
        onOpenProfileModal={onOpenProfile}
        onOpenArcade={onOpenArcade}
        canInstallApp={false}
        onInstallApp={onInstall}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Active language: Spanish/i }));
    const langDialog = screen.getByRole('dialog', { name: 'Switch Language' });
    expect(langDialog.querySelector('.console-scroll-pane')).toBeInTheDocument();

    for (const lang of LANGUAGE_LIST) {
      const flagSvg = langDialog.querySelector(`svg[data-flag="${lang}"]`);
      expect(flagSvg, `TopHud switcher missing SVG flag for ${lang}`).toBeInTheDocument();
      expect(within(langDialog).getAllByText(LANGUAGE_META[lang].name).length).toBeGreaterThanOrEqual(1);
    }

    fireEvent.click(within(langDialog).getByRole('button', { name: /Egyptian Arabic/i }));
    expect(screen.getByRole('button', { name: /Active language: Egyptian Arabic/i })).toBeInTheDocument();
    unmountHud();

    // 2. PhrasebookVault horizontal scroll strip with all 16 SVG flags + RTL cards
    const arCard = getCourse('ar').units[0].vocabCards[0];
    vaultActions.completeMapNode({
      language: 'ar',
      nodeId: 'ar-u1-n1',
      stars: 3,
      xpEarned: 25,
      gemsEarned: 10,
      unlockedVocabIds: [arCard.id],
      maxCombo: 2,
    });
    vaultActions.setActiveLanguage('ar');

    const { unmount: unmountVault } = render(<PhrasebookVault />);
    const filterGroup = screen.getByRole('group', { name: 'Filter phrasebook by language' });
    expect(filterGroup).toHaveClass('console-scroll-pane-x');
    for (const lang of LANGUAGE_LIST) {
      expect(
        filterGroup.querySelector(`svg[data-flag="${lang}"]`),
        `PhrasebookVault missing SVG flag for ${lang}`
      ).toBeInTheDocument();
      expect(within(filterGroup).getByText(LANGUAGE_META[lang].name)).toBeInTheDocument();
    }

    // Unlocked Arabic card & Show-Off flashcard carry dir="rtl"
    const rtlForeignEls = document.querySelectorAll('[dir="rtl"]');
    expect(rtlForeignEls.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Family Show-Off Mode/i }));
    const showOffModal = screen.getByRole('dialog', { name: 'Family Show-Off Flashcard Spotlight' });
    expect(showOffModal.querySelector('[dir="rtl"]')).toHaveTextContent(arCard.foreignWithArticle);
    fireEvent.click(within(showOffModal).getByRole('button', { name: 'Close Family Show-Off Mode' }));
    unmountVault();

    // 3. ProfileVaultModal 16-language starting-language picker inside bounded .modal-card
    render(<ProfileVaultModal onClose={vi.fn()} />);
    const modalCard = document.querySelector('.modal-card') as HTMLElement;
    expect(modalCard).toBeInTheDocument();
    expect(modalCard.querySelector('.console-scroll-pane')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /\+ New Kid Explorer/i }));
    const pickerGroup = screen.getByRole('group', { name: 'Pick Starting Language' });
    for (const lang of LANGUAGE_LIST) {
      expect(
        pickerGroup.querySelector(`svg[data-flag="${lang}"]`),
        `ProfileVaultModal missing SVG flag for ${lang}`
      ).toBeInTheDocument();
    }
    fireEvent.change(screen.getByLabelText('New explorer name'), { target: { value: 'Zayd' } });
    fireEvent.click(within(pickerGroup).getByRole('button', { name: /Egyptian Arabic/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Explorer' }));
    expect(screen.getByText('Welcome aboard, Zayd!')).toBeInTheDocument();
  });

  it('enforces RTL dir="rtl" on ar/arz and LTR dir="ltr" on non-RTL scripts across TapHintText and all lesson views', () => {
    // 1. TapHintText RTL wrapper vs LTR popover
    const arTokens: TapHintToken[] = [
      {
        surface: 'مرحباً',
        normalizedId: 'marhaban',
        translation: 'Hello',
        phonetic: 'mar-HA-ban',
        romanized: 'marḥaban',
        speakText: 'مرحباً',
      },
    ];
    const { container: tapRtlContainer, unmount: unmountTapRtl } = render(
      <TapHintText tokens={arTokens} language="ar" />
    );
    expect(tapRtlContainer.querySelector('span[dir="rtl"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'مرحباً' }));
    const hintDialog = screen.getByRole('dialog', { name: 'Word hint for مرحباً' });
    expect(hintDialog).toHaveAttribute('dir', 'ltr');
    expect(hintDialog.querySelector('strong[dir="rtl"]')).toHaveTextContent('مرحباً');
    expect(hintDialog).toHaveTextContent('marḥaban');
    unmountTapRtl();

    // 2. DiscoveryCardView RTL on arz & LTR on ja
    const arzCard = getCourse('arz').units[0].vocabCards[0];
    const { container: discArz, unmount: unmountDiscArz } = render(
      <DiscoveryCardView
        exercise={{ type: 'discovery_card', id: 'disc-arz', vocabId: arzCard.id }}
        language="arz"
        vocabCard={arzCard}
        compact={false}
        onTurtlePlay={vi.fn()}
      />
    );
    expect(discArz.querySelectorAll('[dir="rtl"]').length).toBeGreaterThanOrEqual(2);
    unmountDiscArz();

    const jaCard = getCourse('ja').units[0].vocabCards[0];
    const { container: discJa, unmount: unmountDiscJa } = render(
      <DiscoveryCardView
        exercise={{ type: 'discovery_card', id: 'disc-ja', vocabId: jaCard.id }}
        language="ja"
        vocabCard={jaCard}
        compact={false}
        onTurtlePlay={vi.fn()}
      />
    );
    expect(discJa.querySelector('[dir="rtl"]')).toBeNull();
    unmountDiscJa();

    // 3. WordBankView RTL on ar (both to_english and to_foreign + Type Instead)
    const arNodes = getCourse('ar').units[0].nodes;
    const arExercises = arNodes.flatMap((n) => n.exercises);
    const arToEn = arExercises.find(
      (ex): ex is WordBankExercise => ex.type === 'word_bank' && ex.direction === 'to_english'
    )!;
    const arToFr = arExercises.find(
      (ex): ex is WordBankExercise => ex.type === 'word_bank' && ex.direction === 'to_foreign'
    )!;

    const { container: wbEnCont, unmount: unmountWbEn } = render(
      <WordBankView
        exercise={arToEn}
        language="ar"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    expect(wbEnCont.querySelector('[dir="rtl"]')).toBeInTheDocument();
    expect(screen.getByLabelText('Word bank tiles')).toHaveAttribute('dir', 'ltr');
    unmountWbEn();

    const { unmount: unmountWbFr } = render(
      <WordBankView
        exercise={arToFr}
        language="ar"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Answer tray')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByLabelText('Word bank tiles')).toHaveAttribute('dir', 'rtl');
    fireEvent.click(screen.getByRole('button', { name: /Type Instead/i }));
    expect(screen.getByLabelText('Type your translation')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByLabelText('Accent character bar')).toHaveAttribute('dir', 'rtl');
    unmountWbFr();

    // 4. ListenDecodeView (assemble_heard) RTL on arz
    const arzAssemble = getCourse('arz').units[0].nodes
      .flatMap((n) => n.exercises)
      .find((ex): ex is ListenDecodeExercise => ex.type === 'listen_decode' && ex.mode === 'assemble_heard')!;
    const { container: listenCont, unmount: unmountListen } = render(
      <ListenDecodeView
        exercise={arzAssemble}
        language="arz"
        compact={false}
        locked={false}
        revealed
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Word bank tiles')).toHaveAttribute('dir', 'rtl');
    expect(listenCont.querySelector('[dir="rtl"]')).toBeInTheDocument();
    unmountListen();

    // 5. PairMatchRushView, MiniStoryView, BossGauntletView RTL on arz/ar
    const arzRush = getCourse('arz').units[0].nodes
      .flatMap((n) => n.exercises)
      .find((ex): ex is PairMatchRushExercise => ex.type === 'pair_match_rush')!;
    const { container: rushCont, unmount: unmountRush } = render(
      <PairMatchRushView exercise={arzRush} language="arz" compact={false} onComplete={vi.fn()} />
    );
    expect(rushCont.querySelectorAll('button[dir="rtl"]').length).toBeGreaterThanOrEqual(4);
    unmountRush();

    const arStory = getCourse('ar').units[0].nodes.find((n) => n.nodeType === 'story')!
      .exercises[0] as MiniStoryExercise;
    const { container: storyCont, unmount: unmountStory } = render(
      <MiniStoryView
        exercise={arStory}
        language="ar"
        compact={false}
        onTurtlePlay={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    expect(storyCont.querySelector('[dir="rtl"]')).toBeInTheDocument();
    unmountStory();

    const arzBoss = getCourse('arz').units[0].nodes.find((n) => n.nodeType === 'boss')!
      .exercises[0] as BossGauntletExercise;
    const { container: bossCont } = render(
      <BossGauntletView
        exercise={arzBoss}
        language="arz"
        compact={false}
        onTurtlePlay={vi.fn()}
        onTurnResult={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    expect(bossCont.querySelector('[dir="rtl"]')).toBeInTheDocument();
  });

  it('triggers Accent Spotlight coaching via Type Instead for Vietnamese, Portuguese, Russian, Arabic, and Mandarin Pinyin inside LessonArena', () => {
    const cases = [
      {
        lang: 'vi' as const,
        expected: 'Tiếng Việt',
        accepted: ['Tiếng Việt'],
        typed: 'Tieng Viet',
      },
      {
        lang: 'pt' as const,
        expected: 'maçã',
        accepted: ['maçã'],
        typed: 'maca',
      },
      {
        lang: 'ru' as const,
        expected: 'звёзды',
        accepted: ['звёзды'],
        typed: 'звезды',
      },
      {
        lang: 'ar' as const,
        expected: 'مرحباً',
        accepted: ['مرحباً'],
        typed: 'مرحبا',
      },
      {
        lang: 'zh' as const,
        expected: '你好！',
        accepted: ['Nǐ hǎo'],
        typed: 'ni hao',
      },
    ];

    for (const c of cases) {
      vaultActions.resetVaultToDefaults();
      vaultActions.setActiveLanguage(c.lang);
      const node: MapNode = {
        id: `test-accent-${c.lang}`,
        unitId: `${c.lang}-u1`,
        order: 1,
        nodeType: 'lesson',
        title: `${c.lang} Accent Trial`,
        subtitle: 'Coaching test',
        xpReward: 20,
        gemReward: 5,
        exercises: [
          {
            type: 'word_bank',
            id: `wb-accent-${c.lang}`,
            direction: 'to_foreign',
            promptText: 'Test clue',
            promptTokens: [],
            expectedSentence: c.expected,
            acceptedSentences: c.accepted,
            targetTokens: [c.expected],
            distractorTokens: ['extra'],
            phoneticHint: 'test',
            vocabIds: [],
          },
        ],
        rewardVocabIds: [],
      };

      const { unmount } = render(<LessonArena node={node} language={c.lang} onExit={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /Type Instead/i }));
      fireEvent.change(screen.getByLabelText('Type your translation'), { target: { value: c.typed } });
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
      expect(screen.getByText(/Accent Spotlight!/i), `Missing Accent Spotlight for ${c.lang}`).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByText(`${node.title} Complete!`)).toBeInTheDocument();
      unmount();
      cleanup();
    }
  });

  it('plays ContextClozeView inside LessonArena with bridge Peek toggle, 1.12x fluent speech, Nuance Spotlight, and clozeSolved tracking', () => {
    const u9Cloze = getCourse('es').units[8].nodes
      .flatMap((n) => n.exercises)
      .find((ex): ex is ContextClozeExercise => ex.type === 'context_cloze')!;
    expect(u9Cloze).toBeDefined();

    const clozeNode: MapNode = {
      id: 'test-cloze-b1',
      unitId: 'es-u9',
      order: 1,
      nodeType: 'lesson',
      proficiencyTier: 'B1',
      title: 'Storyweaver Cloze Trial',
      subtitle: 'Context nuance verification',
      xpReward: 40,
      gemReward: 20,
      exercises: [u9Cloze],
      rewardVocabIds: u9Cloze.vocabIds,
    };

    render(<LessonArena node={clozeNode} language="es" onExit={vi.fn()} />);

    // B1 bridge mode hides phonetics until Peek Phonetic / Romanized is toggled
    const peekBtn = screen.getByRole('button', { name: /Peek Phonetic \/ Romanized/i });
    fireEvent.click(peekBtn);
    expect(screen.getByRole('button', { name: /Hide Phonetic \/ Romanized/i })).toBeInTheDocument();

    // 1.12x Fluent speed audio increments fluentPlaysCount
    fireEvent.click(screen.getByRole('button', { name: '1.12x Fluent speed audio' }));
    expect(loadVaultFromStorage().profiles[0].stats.fluentPlaysCount).toBe(1);

    // Choose expectedBlank and check
    fireEvent.click(screen.getByRole('radio', { name: u9Cloze.expectedBlank }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    const spotlight = screen.getByRole('note', { name: 'Nuance and Register Spotlight' });
    expect(spotlight).toHaveTextContent(u9Cloze.nuanceNote);
    expect(loadVaultFromStorage().profiles[0].stats.clozeSolved).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(`${clozeNode.title} Complete!`)).toBeInTheDocument();

    // Verify standalone ContextClozeView also renders Arabic RTL cleanly
    cleanup();
    const arCloze = getCourse('ar').units[12].nodes
      .flatMap((n) => n.exercises)
      .find((ex): ex is ContextClozeExercise => ex.type === 'context_cloze')!;
    const { container } = render(
      <ContextClozeView
        exercise={arCloze}
        language="ar"
        compact={false}
        locked={false}
        revealed
        scaffoldingMode="bridge"
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument();
  });

  it('supports C1+ dense WordBankTray chips, Keyboard Free-Recall mode with helperAccents & bonus XP/Gems, and Zero-Heart Elixir recovery', () => {
    // 1. Dense chip tray when >= 9 tokens
    const denseTokens = Array.from({ length: 10 }, (_, i) => `tok${i + 1}`);
    const { unmount: unmountTray } = render(
      <WordBankTray
        seed="dense-test"
        targetTokens={denseTokens}
        distractorTokens={['extra1', 'extra2']}
        selectedTileUids={[]}
        onChangeSelected={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Answer tray')).toHaveAttribute('data-dense', 'true');
    expect(document.querySelectorAll('.word-bank-chip.is-dense').length).toBeGreaterThanOrEqual(10);
    unmountTray();
    cleanup();

    // 2. C1_C2 Keyboard Free-Recall on WordBank + Zero-Heart Elixir Recovery
    const frEx: WordBankExercise = {
      type: 'word_bank',
      id: 'free-recall-es-c1',
      direction: 'to_foreign',
      promptText: 'The key proverb shines today!',
      promptTokens: [],
      expectedSentence: 'El niño escribió una canción',
      acceptedSentences: ['El niño escribió una canción'],
      targetTokens: ['El', 'niño', 'escribió', 'una', 'canción'],
      distractorTokens: ['ayer'],
      phoneticHint: 'el NEE-nyoh',
      allowFreeRecall: true,
      vocabIds: [],
    };
    const c1Node: MapNode = {
      id: 'es-u16-test',
      unitId: 'es-u16',
      order: 1,
      nodeType: 'lesson',
      proficiencyTier: 'C1_C2',
      title: 'Laureate Recall Trial',
      subtitle: 'Free-recall & elixir check',
      xpReward: 65,
      gemReward: 35,
      exercises: [frEx],
      rewardVocabIds: [],
    };

    // Leave 1 heart so 1 mistake triggers Zero-Heart Modal, with default 80 gems (> 35g Elixir)
    for (let i = 0; i < 4; i++) {
      vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
    }
    render(<LessonArena node={c1Node} language="es" onExit={vi.fn()} />);

    // Open Keyboard Free-Recall mode
    const recallBtn = screen.getByRole('button', { name: /Keyboard Free-Recall/i });
    fireEvent.click(recallBtn);
    expect(screen.getByText(/Keyboard Free-Recall Active!/i)).toBeInTheDocument();

    // Submit wrong answer -> 0 hearts -> Zero-Heart Recovery Modal offers Buy & Use Heart Refill Elixir (35 Gems)
    const input = screen.getByLabelText('Type your translation');
    fireEvent.change(input, { target: { value: 'respuesta equivocada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    const rechargeDialog = screen.getByRole('dialog', { name: 'Recharge Hearts' });
    fireEvent.click(within(rechargeDialog).getByRole('button', { name: /Buy & Use Heart Refill Elixir \(35 Gems\)/i }));
    expect(screen.queryByRole('dialog', { name: 'Recharge Hearts' })).not.toBeInTheDocument();
    expect(loadVaultFromStorage().profiles[0].hearts).toBe(5);

    // WordBankView stays in free-recall typing mode after Elixir refill
    const retryInput = screen.getByLabelText('Type your translation') as HTMLInputElement;
    fireEvent.change(retryInput, { target: { value: 'El ni' } });
    fireEvent.click(within(screen.getByLabelText('Accent character bar')).getByRole('button', { name: 'ñ' }));
    expect(retryInput.value).toBe('El niñ');
    fireEvent.change(retryInput, { target: { value: 'El niño escribio una cancion' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByText(/Free-Recall \+ Accent Spotlight!/i)).toBeInTheDocument();
    expect(loadVaultFromStorage().profiles[0].stats.freeRecallSolved).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(`${c1Node.title} Complete!`)).toBeInTheDocument();
    const afterVictoryProfile = loadVaultFromStorage().profiles[0];
    expect(afterVictoryProfile.totalXp).toBe(65 + 2 + FREE_RECALL_BONUS_XP);
    expect(afterVictoryProfile.gems).toBe(80 - 35 + 35 + FREE_RECALL_BONUS_GEMS);
  });

  it('exercises CompanionShop Companion Switcher (5 companions), Props/Pets slots, Power-Ups, Avatars, TopHud 2x XP/8 hearts, ProfileVaultModal pack, and PhrasebookVault CEFR tier filters', () => {
    // Give plenty of gems to buy props, pets, Heart Crystal, 2x XP Booster, and Avatar crest
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-seed-shop',
      stars: 3,
      xpEarned: 30,
      gemsEarned: 700,
      unlockedVocabIds: ['es-u1-c1', getCourse('es').units[8].vocabCards[0].id],
      maxCombo: 2,
    });

    const { unmount: unmountApp } = render(<App />);

    // Navigate to Gem Shop
    fireEvent.click(screen.getByRole('button', { name: /Gem Shop/i }));
    expect(screen.getByRole('region', { name: 'Companion Gem Shop' })).toBeInTheDocument();

    // Switch preview pedestal across Mateo, Colette, Benni, Luca, Pip
    const switcher = screen.getByRole('group', { name: 'Preview companion switcher' });
    fireEvent.click(within(switcher).getByRole('button', { name: 'Mateo' }));
    expect(document.querySelector('[data-companion="mateo"]')).toBeInTheDocument();
    fireEvent.click(within(switcher).getByRole('button', { name: 'Colette' }));
    expect(document.querySelector('[data-companion="colette"]')).toBeInTheDocument();
    fireEvent.click(within(switcher).getByRole('button', { name: 'Benni' }));
    expect(document.querySelector('[data-companion="benni"]')).toBeInTheDocument();
    fireEvent.click(within(switcher).getByRole('button', { name: 'Luca' }));
    expect(document.querySelector('[data-companion="luca"]')).toBeInTheDocument();

    // Buy & equip a Prop and a Pet and check MascotStage data-equipped-cosmetics
    fireEvent.click(screen.getByRole('button', { name: 'Props' }));
    expect(screen.getByText('Campfire Explorer Ukulele')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Buy & Equip \(70\)/i }));
    expect(document.querySelector('[data-companion="luca"]')?.getAttribute('data-equipped-cosmetics')).toContain('prop_explorer_ukulele');

    fireEvent.click(screen.getByRole('button', { name: 'Pets' }));
    expect(screen.getByText('Origami Sky Crane')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Buy & Equip \(90\)/i }));
    expect(document.querySelector('[data-companion="luca"]')?.getAttribute('data-equipped-cosmetics')).toContain('pet_origami_crane');

    // Buy Power-Ups: Heart Refill Elixir (pack +1), Heart Container Crystal (maxHearts 5 -> 6), 2x XP Booster (+3 charges)
    fireEvent.click(screen.getByRole('button', { name: 'Power-Ups' }));
    fireEvent.click(screen.getByRole('button', { name: /Buy Elixir \(35 Gems\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Upgrade Heart \(110 Gems\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Buy \+3 Charges \(65 Gems\)/i }));

    // TopHud immediately shows 2x XP Booster badge (3 charges) and 6 of 6 Hearts!
    expect(screen.getByLabelText('2x XP Booster: 3 charges remaining')).toBeInTheDocument();
    expect(screen.getByLabelText('Hearts: 6 of 6')).toBeInTheDocument();

    // Unlock Avatar crest in Avatars shelf
    fireEvent.click(screen.getByRole('button', { name: 'Avatars' }));
    fireEvent.click(screen.getAllByRole('button', { name: /Unlock Crest \(60 Gems\)/i })[0]);
    expect(loadVaultFromStorage().profiles[0].avatarId).toBe('origami_crane_crest');

    // ProfileVaultModal displays Elixirs, 2x XP charges, and newly unlocked Origami Crane avatar
    fireEvent.click(screen.getByRole('button', { name: /Switch kid profile/i }));
    const profileModal = screen.getByRole('dialog', { name: 'Explorer Profiles and Save Vault' });
    expect(profileModal).toHaveTextContent('Elixirs: 1');
    expect(profileModal).toHaveTextContent('2x XP: 3');
    expect(within(profileModal).getByRole('button', { name: /Origami Crane$/i })).toBeInTheDocument();
    fireEvent.click(within(profileModal).getByRole('button', { name: 'Close profiles modal' }));

    // PhrasebookVault CEFR Proficiency Tier filter pills & 1.12x fluent audio
    fireEvent.click(screen.getByRole('button', { name: /Phrasebook/i }));
    const tierFilterGroup = screen.getByRole('group', { name: 'Filter phrasebook by CEFR tier' });
    expect(within(tierFilterGroup).getByRole('button', { name: /All Tiers/i })).toBeInTheDocument();
    expect(within(tierFilterGroup).getByRole('button', { name: /B1 · Storyweaver/i })).toBeInTheDocument();
    expect(within(tierFilterGroup).getByRole('button', { name: /C1\+ · Polyglot Laureate/i })).toBeInTheDocument();

    // Filter to B1 Storyweaver -> shows U9, U10, U11 only
    fireEvent.click(within(tierFilterGroup).getByRole('button', { name: /B1 · Storyweaver/i }));
    expect(screen.getByRole('button', { name: /^Unit 9:/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Unit 1:/i })).not.toBeInTheDocument();

    // Click 1.12x fluent speech button on unlocked Unit 9 card
    const b1Card = getCourse('es').units[8].vocabCards[0];
    fireEvent.click(screen.getByRole('button', { name: `Speak ${b1Card.bareForeign} fluently` }));
    expect(loadVaultFromStorage().profiles[0].stats.fluentPlaysCount).toBe(1);

    unmountApp();
  });
});
