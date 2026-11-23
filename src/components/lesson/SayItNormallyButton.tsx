import { useEffect, useMemo, useState } from 'react';
import { MessageSquareQuote, Volume2 } from 'lucide-react';
import { playSfx, speakPhrase } from '../../audio';
import * as core from '../../core';
import {
  isAdultLanguage,
  type LanguageCode,
} from '../../types/contracts';

export interface PlainEnglishRequest {
  language: LanguageCode;
  dialectAText?: string;
  dialectBText?: string;
  explicitPlain?: string;
  registerNote?: string;
  nuanceNote?: string;
  avoidTerms?: readonly string[];
}

export interface PlainEnglishResult {
  spokenText: string;
  displayLine: string;
  label: string;
}

interface CorePlainEnglishExports {
  decodeToNormalEnglish?: (req: PlainEnglishRequest) => PlainEnglishResult;
}

const extCore = core as typeof core & CorePlainEnglishExports;

const STOPWORD_TERMS = new Set<string>([
  'a',
  'an',
  'the',
  'to',
  'of',
  'in',
  'on',
  'at',
  'for',
  'with',
  'and',
  'or',
  'but',
  'is',
  'am',
  'are',
  'was',
  'were',
  'be',
  'it',
  'this',
  'that',
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'my',
  'your',
  'our',
  'me',
  'do',
  'does',
  'did',
  'not',
  'no',
  'so',
  'if',
  'as',
  'up',
  'out',
  'all',
  'just',
  'very',
  'have',
  'has',
  'had',
  'will',
  'can',
  'could',
  'would',
  'should',
]);

const FALLBACK_SLANG_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^(?:Suburban|AAVE|Corporate|Trades|Midwest|Northeast|South|Gen-Z|Cali|Country|Stoner|Tactical)\s*:\s*/i, ''],
  [/\bcircle back\b/gi, 'revisit this later'],
  [/\bunpack bandwidth\b/gi, 'check if anyone has time'],
  [/\bsuboptimal deliverable\b/gi, 'unfinished work item'],
  [/\bquick sync\b/gi, 'brief meeting'],
  [/\balignment\b/gi, 'agreement'],
  [/\bbefore EOD\b/gi, 'before the end of the workday'],
  [/\bain't\b/gi, 'is not'],
  [/\by'all\b|\byall\b/gi, 'everyone'],
  [/\bno cap\b/gi, 'honestly'],
  [/\bdeadass\b/gi, 'completely serious'],
  [/\blow[- ]?key\b/gi, 'quietly'],
  [/\bhigh[- ]?key\b/gi, 'openly'],
  [/\bdelulu\b/gi, 'unrealistic'],
  [/\bnegative aura\b/gi, 'awkward impression'],
  [/\bcooked\b/gi, 'in trouble'],
  [/\bbless (?:his|her|their|your) (?:sweet )?(?:little )?heart\b/gi, 'that person is struggling noticeably'],
  [/\bope\b,?\s*/gi, 'excuse me, '],
  [/\bfuggedaboutit\b|\bfuhgeddaboudit\b/gi, 'do not worry about it'],
  [/\bcold[- ]?plunge\b/gi, 'ice bath'],
  [/\badaptogenic\b/gi, 'herbal'],
  [/\bworn slap out\b/gi, 'exhausted'],
  [/\b0[- ]dark[- ]thirty\b/gi, 'very early in the morning'],
  [/\bperimeter breach\b/gi, 'unauthorized step onto the lawn'],
  [/\btrippin'?/gi, 'overreacting'],
  [/\bfixin'?\b/gi, 'about to'],
];

function escapeRegExp(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskAvoidTerms(text: string, avoidTerms?: readonly string[]): string {
  if (!avoidTerms || avoidTerms.length === 0) return text;
  let masked = text;
  for (const rawTerm of avoidTerms) {
    const clean = rawTerm.trim().replace(/^[^\w]+|[^\w]+$/g, '');
    if (clean.length < 2) continue;
    const normalized = clean.toLowerCase();
    if (!normalized || STOPWORD_TERMS.has(normalized)) continue;
    const re = new RegExp(`\\b${escapeRegExp(clean)}\\b`, 'gi');
    masked = masked.replace(re, 'that expression');
  }
  return masked.replace(/\s+/g, ' ').trim();
}

function localFallbackDecode(req: PlainEnglishRequest): PlainEnglishResult {
  const label = 'Normal English:';
  const rawBase =
    req.explicitPlain?.trim() ||
    req.dialectBText?.trim() ||
    req.dialectAText?.trim() ||
    req.registerNote?.trim() ||
    req.nuanceNote?.trim() ||
    'Standard everyday communication.';

  let cleaned = rawBase;
  for (const [pattern, replacement] of FALLBACK_SLANG_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (
    !req.explicitPlain &&
    req.dialectAText &&
    !req.dialectBText &&
    req.nuanceNote &&
    cleaned === req.dialectAText.trim()
  ) {
    cleaned = req.nuanceNote.trim();
  }

  const safeText = maskAvoidTerms(cleaned, req.avoidTerms) || 'Everyday standard English phrasing.';
  const spokenText = safeText.endsWith('.') || safeText.endsWith('!') || safeText.endsWith('?')
    ? safeText
    : `${safeText}.`;

  return {
    spokenText,
    displayLine: safeText,
    label,
  };
}

export function resolvePlainEnglish(req: PlainEnglishRequest): PlainEnglishResult {
  if (typeof extCore.decodeToNormalEnglish === 'function') {
    return extCore.decodeToNormalEnglish(req);
  }
  return localFallbackDecode(req);
}

export interface SayItNormallyButtonProps {
  language: LanguageCode;
  dialectAText?: string;
  dialectBText?: string;
  explicitPlain?: string;
  registerNote?: string;
  nuanceNote?: string;
  avoidTerms?: readonly string[];
  secondaryDialectAText?: string;
  secondaryDialectBText?: string;
  secondaryExplicitPlain?: string;
  resetKey?: string;
  size?: 'sm' | 'md';
}

export function SayItNormallyButton({
  language,
  dialectAText,
  dialectBText,
  explicitPlain,
  registerNote,
  nuanceNote,
  avoidTerms,
  secondaryDialectAText,
  secondaryDialectBText,
  secondaryExplicitPlain,
  resetKey,
  size = 'md',
}: SayItNormallyButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [resetKey, language, dialectAText, dialectBText, explicitPlain]);

  const decoded = useMemo(() => {
    const primary = resolvePlainEnglish({
      language,
      dialectAText,
      dialectBText,
      explicitPlain,
      registerNote,
      nuanceNote,
      avoidTerms,
    });

    if (!secondaryDialectAText && !secondaryDialectBText && !secondaryExplicitPlain) {
      return primary;
    }

    const secondary = resolvePlainEnglish({
      language,
      dialectAText: secondaryDialectAText,
      dialectBText: secondaryDialectBText,
      explicitPlain: secondaryExplicitPlain,
      avoidTerms,
    });

    const combinedDisplay =
      secondary.displayLine && secondary.displayLine !== primary.displayLine
        ? `${primary.displayLine} — In a sentence: ${secondary.displayLine}`
        : primary.displayLine;
    const combinedSpoken =
      secondary.spokenText && secondary.spokenText !== primary.spokenText
        ? `${primary.spokenText} ${secondary.spokenText}`
        : primary.spokenText;

    return {
      label: primary.label || 'Normal English:',
      displayLine: combinedDisplay,
      spokenText: combinedSpoken,
    };
  }, [
    language,
    dialectAText,
    dialectBText,
    explicitPlain,
    registerNote,
    nuanceNote,
    avoidTerms,
    secondaryDialectAText,
    secondaryDialectBText,
    secondaryExplicitPlain,
  ]);

  // Strict Kid Atlas quarantine: never render on any of the 16 base languages
  if (!isAdultLanguage(language)) {
    return null;
  }

  const isSmall = size === 'sm';

  const handleToggle = () => {
    playSfx('button_click');
    if (!open) {
      setOpen(true);
      void speakPhrase({
        text: decoded.spokenText,
        language: 'en',
        speed: 'normal',
      });
    } else {
      setOpen(false);
    }
  };

  return (
    <div className="normal-english-decoder">
      <button
        type="button"
        data-testid="say-it-normally-btn"
        aria-expanded={open}
        className="tactile-btn tactile-btn-soft normal-english-btn"
        style={{
          padding: isSmall ? '4px 9px' : '6px 12px',
          fontSize: isSmall ? '0.72rem' : '0.78rem',
          borderRadius: isSmall ? 11 : 13,
        }}
        onClick={handleToggle}
      >
        <MessageSquareQuote size={isSmall ? 13 : 15} style={{ flexShrink: 0 }} />
        <span>Say It Normally in English</span>
      </button>

      {open ? (
        <div
          role="note"
          data-testid="plain-english-callout"
          aria-label="Normal English translation"
          className="plain-english-callout"
        >
          <div className="plain-english-callout-body">
            <strong>{`${(decoded.label || 'Normal English').replace(/:+$/, '')}:`}</strong>{' '}
            <span>{decoded.displayLine}</span>
          </div>
          <button
            type="button"
            className="tactile-btn tactile-btn-soft"
            style={{
              padding: '3px 7px',
              borderRadius: 9,
              fontSize: '0.7rem',
              flexShrink: 0,
            }}
            aria-label="Replay normal English audio"
            onClick={() => {
              playSfx('button_click');
              void speakPhrase({
                text: decoded.spokenText,
                language: 'en',
                speed: 'normal',
              });
            }}
          >
            <Volume2 size={13} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
