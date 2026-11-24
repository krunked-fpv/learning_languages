import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MascotStage } from '../src/components/characters/MascotStage';
import { FlagIcon } from '../src/art/FlagIcon';
import { AvatarBadge } from '../src/art/AvatarBadge';
import { VocabIllustration } from '../src/art/VocabIllustration';
import {
  SkyCatcherEmblem,
  MeteorBlasterEmblem,
  TrainSwitcherEmblem,
  CafeOrderRushEmblem,
} from '../src/components/arcade/ArcadeEmblems';

const ROOT = resolve(__dirname, '..');
const SRC_DIR = join(ROOT, 'src');

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkFiles(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

describe('Cozy ASMR Storybook Art Direction & Offline Guardrail Gate', () => {
  it('defines all 10 core Art Bible CSS custom properties across all 15 palettes (:root + 14 themes)', () => {
    const css = readFileSync(join(SRC_DIR, 'styles', 'theme.css'), 'utf8');
    const requiredTokens = [
      '--ink-warm',
      '--ink-soft',
      '--paper-base',
      '--paper-shade',
      '--paper-grain-opacity',
      '--key-light',
      '--ambient-fill',
      '--lantern-glow',
      '--gild',
      '--shadow-tint',
    ];
    for (const token of requiredTokens) {
      const matches = css.match(new RegExp(`${token}\\s*:`, 'g')) ?? [];
      expect(matches.length, `${token} must appear in :root + 14 theme blocks`).toBeGreaterThanOrEqual(15);
    }
  });

  it('contains zero external https:// URLs, zero Unicode flag emojis, and zero UTF-8 BOMs across src/**', () => {
    const files = walkFiles(SRC_DIR);
    const httpsViolations: string[] = [];
    const flagViolations: string[] = [];
    const bomViolations: string[] = [];

    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (text.charCodeAt(0) === 0xfeff) {
        bomViolations.push(file);
      }
      const urls = text.match(/https:\/\/[^\s'"`<>)]+/g) ?? [];
      if (urls.length > 0) {
        httpsViolations.push(`${file}: ${urls.slice(0, 2).join(', ')}`);
      }
      if (/[\u{1F1E6}-\u{1F1FF}]/u.test(text)) {
        flagViolations.push(file);
      }
    }

    expect(bomViolations).toEqual([]);
    expect(httpsViolations).toEqual([]);
    expect(flagViolations).toEqual([]);
  });

  it('enforces cozy ASMR audio invariants in synthEngine.ts (attacks >= 5ms, no harsh waveforms, valid UTF-8 punctuation)', () => {
    const synth = readFileSync(join(SRC_DIR, 'audio', 'synthEngine.ts'), 'utf8');
    expect(synth.match(/attack:\s*0\.00[0-4]\b/g) ?? []).toEqual([]);
    expect(synth.match(/['"](square|sawtooth)['"]/g) ?? []).toEqual([]);
    expect(synth).toContain('¡!¿?');
    expect(synth).toContain('。？！');
    expect(synth).toContain('،؟؛');
  });

  it('produces zero duplicate SVG <defs> IDs when mounting multiple companions, flags, avatars, vocab stickers, and arcade emblems', () => {
    const { container } = render(
      <div>
        <MascotStage
          companionId="pip"
          pose="idle"
          equippedCosmetics={{ hat: 'hat_explorer_beret', glasses: 'glasses_starlight_frames' }}
        />
        <MascotStage
          companionId="mateo"
          pose="idle"
          equippedCosmetics={{ hat: 'hat_fiesta_sombrero', cape: 'cape_traveler_cloak' }}
        />
        <MascotStage
          companionId="colette"
          pose="idle"
          equippedCosmetics={{ hat: 'hat_sakura_crown', aura: 'aura_fireflies' }}
        />
        <MascotStage
          companionId="benni"
          pose="idle"
          equippedCosmetics={{ hat: 'hat_alpine_tyrolean', prop: 'prop_compass_astrolabe' }}
        />
        <MascotStage
          companionId="luca"
          pose="idle"
          equippedCosmetics={{ hat: 'hat_laureate_wreath', pet: 'pet_origami_crane' }}
        />
        <FlagIcon language="es" />
        <FlagIcon language="es" />
        <FlagIcon language="ja" />
        <FlagIcon language="fr" />
        <AvatarBadge avatarId="pip_explorer" />
        <AvatarBadge avatarId="pip_explorer" />
        <VocabIllustration illustrationKey="wave_hello" />
        <VocabIllustration illustrationKey="wave_hello" />
        <SkyCatcherEmblem />
        <SkyCatcherEmblem />
        <MeteorBlasterEmblem />
        <TrainSwitcherEmblem />
        <CafeOrderRushEmblem />
      </div>
    );

    const ids = Array.from(container.querySelectorAll('svg defs [id]')).map((el) => el.id);
    expect(ids.length).toBeGreaterThan(20);
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) duplicates.push(id);
      seen.add(id);
    }
    expect(duplicates).toEqual([]);
  });
});
