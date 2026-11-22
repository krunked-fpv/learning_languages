import '@testing-library/jest-dom/vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { SkyCatcherArcade } from '../src/components/arcade/SkyCatcherArcade';
import { BossGauntletView } from '../src/components/lesson/BossGauntletView';
import { LessonArena } from '../src/components/lesson/LessonArena';
import { MiniStoryView } from '../src/components/lesson/MiniStoryView';
import { PairMatchRushView } from '../src/components/lesson/PairMatchRushView';
import { TapHintText } from '../src/components/lesson/TapHintText';
import { AdventureMap } from '../src/components/map/AdventureMap';
import { CompanionShop } from '../src/components/meta/CompanionShop';
import { LeagueAndBadges } from '../src/components/meta/LeagueAndBadges';
import { PhrasebookVault } from '../src/components/meta/PhrasebookVault';
import { ProfileVaultModal } from '../src/components/shell/ProfileVaultModal';
import { TopHud } from '../src/components/shell/TopHud';
import { getCourse } from '../src/curriculum';
import { createDefaultVault, vaultActions } from '../src/store/useVaultStore';
import type {
  BossGauntletExercise,
  MapNode,
  MiniStoryExercise,
  PairMatchRushExercise,
  TapHintToken,
  WordBankExercise,
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

    // 5. LeagueAndBadges renders all 12 badges and leaderboard
    render(<LeagueAndBadges />);
    expect(screen.getByText(/Expedition Badges \(0 \/ 12\)/i)).toBeInTheDocument();
  });
});
