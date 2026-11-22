import { describe, expect, it } from 'vitest';
import { joinWordBankTokens } from '../src/components/lesson/lessonHelpers';
import { gradeAnswer, normalizeAnswer } from '../src/core';

describe('Challenge 2: Adversarial Grader (Diacritics, Elisions, Smart Quotes, Punctuation)', () => {
  it('accepts exact matches with mixed casing, Unicode NFD decomposition, and edge punctuation', () => {
    const cases = [
      { submitted: 'niño', expected: 'niño', lang: 'es' as const },
      { submitted: 'NIÑO', expected: 'niño', lang: 'es' as const },
      { submitted: 'nin\u0303o', expected: 'niño', lang: 'es' as const },
      { submitted: '¡Hola!', expected: 'hola', lang: 'es' as const },
      { submitted: '¿Cómo estás?', expected: 'cómo estás', lang: 'es' as const },
      { submitted: 'garçon', expected: 'garçon', lang: 'fr' as const },
      { submitted: 'für', expected: 'für', lang: 'de' as const },
      { submitted: 'Straße', expected: 'Straße', lang: 'de' as const },
      { submitted: 'caffè', expected: 'caffè', lang: 'it' as const },
      { submitted: '  ¡Buenos días,; !  ', expected: 'Buenos días', lang: 'es' as const },
    ];

    for (const c of cases) {
      const res = gradeAnswer({
        submitted: c.submitted,
        expected: c.expected,
        language: c.lang,
      });
      expect(res.isCorrect, `${c.submitted} vs ${c.expected}`).toBe(true);
      expect(res.exactMatch, `${c.submitted} vs ${c.expected}`).toBe(true);
      expect(res.heartPenalty).toBe(0);
      expect(res.accentCoaching).toBeUndefined();
    }
  });

  it('passes missing-accent answers with zero heart penalty AND structured accentCoaching', () => {
    const cases = [
      {
        submitted: 'nino',
        expected: 'niño',
        lang: 'es' as const,
        expectedHighlight: 'ñ',
      },
      {
        submitted: 'garcon',
        expected: 'garçon',
        lang: 'fr' as const,
        expectedHighlight: 'ç',
      },
      {
        submitted: 'fur',
        expected: 'für',
        lang: 'de' as const,
        expectedHighlight: 'ü',
      },
      {
        submitted: 'fuer',
        expected: 'für',
        lang: 'de' as const,
        expectedHighlight: 'ü',
      },
      {
        submitted: 'strasse',
        expected: 'Straße',
        lang: 'de' as const,
        expectedHighlight: 'ß',
      },
      {
        submitted: 'caffe',
        expected: 'caffè',
        lang: 'it' as const,
        expectedHighlight: 'è',
      },
      {
        submitted: 'Kaese',
        expected: 'Käse',
        lang: 'de' as const,
        expectedHighlight: 'ä',
      },
      {
        submitted: 'Hoernchen',
        expected: 'Hörnchen',
        lang: 'de' as const,
        expectedHighlight: 'ö',
      },
      {
        submitted: 'Enchante!',
        expected: 'Enchanté',
        lang: 'fr' as const,
        expectedHighlight: 'é',
      },
    ];

    for (const c of cases) {
      const res = gradeAnswer({
        submitted: c.submitted,
        expected: c.expected,
        language: c.lang,
      });
      expect(res.isCorrect, `Expected pass for "${c.submitted}" vs "${c.expected}"`).toBe(true);
      expect(res.exactMatch, `Expected exactMatch=false for "${c.submitted}" vs "${c.expected}"`).toBe(false);
      expect(res.heartPenalty).toBe(0);
      expect(res.accentCoaching, `Missing accentCoaching for "${c.submitted}"`).toBeDefined();
      expect(res.accentCoaching!.highlightedChars.length).toBeGreaterThan(0);
      expect(res.accentCoaching!.highlightedChars).toContain(c.expectedHighlight);
      expect(res.accentCoaching!.friendlyTip.trim().length).toBeGreaterThan(10);
      expect(res.accentCoaching!.expected).toBe(c.expected);
    }
  });

  it('normalizes French and Italian elisions, space-after-apostrophe tile joins, and smart curly quotes', () => {
    const elisionCases = [
      { submitted: "l'eau", expected: "l'eau", lang: 'fr' as const },
      { submitted: "l' eau", expected: "l'eau", lang: 'fr' as const },
      { submitted: 'l’eau', expected: "l'eau", lang: 'fr' as const },
      { submitted: 'l’ eau', expected: "l'eau", lang: 'fr' as const },
      { submitted: "c'est", expected: "c'est", lang: 'fr' as const },
      { submitted: "c' est", expected: "c'est", lang: 'fr' as const },
      { submitted: 'C’EST!', expected: "c'est", lang: 'fr' as const },
      { submitted: "j'aime", expected: "j'aime", lang: 'fr' as const },
      { submitted: "j' aime", expected: "j'aime", lang: 'fr' as const },
      { submitted: 'j’aime', expected: "j'aime", lang: 'fr' as const },
      { submitted: "l'acqua", expected: "l'acqua", lang: 'it' as const },
      { submitted: "l' acqua", expected: "l'acqua", lang: 'it' as const },
      { submitted: 'l’acqua', expected: "l'acqua", lang: 'it' as const },
      { submitted: "un'amica", expected: "un'amica", lang: 'it' as const },
      { submitted: "un' amica", expected: "un'amica", lang: 'it' as const },
      { submitted: 'un’amica', expected: "un'amica", lang: 'it' as const },
    ];

    for (const c of elisionCases) {
      const res = gradeAnswer({
        submitted: c.submitted,
        expected: c.expected,
        language: c.lang,
      });
      expect(res.isCorrect, `${c.submitted} vs ${c.expected}`).toBe(true);
      expect(res.exactMatch, `${c.submitted} vs ${c.expected}`).toBe(true);
      expect(res.heartPenalty).toBe(0);
    }

    // Combined elision spacing + missing diacritic coaching
    const comboRes = gradeAnswer({
      submitted: "c' e un caffe",
      expected: "c'è un caffè",
      language: 'it',
    });
    expect(comboRes.isCorrect).toBe(true);
    expect(comboRes.exactMatch).toBe(false);
    expect(comboRes.heartPenalty).toBe(0);
    expect(comboRes.accentCoaching?.highlightedChars).toContain('è');

    // Word-bank tile joiner handles apostrophe tiles without spurious space
    expect(joinWordBankTokens(["l'", 'eau'])).toBe("l'eau");
    expect(joinWordBankTokens(["c'", 'est', 'super', '!'])).toBe("c'est super!");
    expect(joinWordBankTokens(["un'", 'amica'])).toBe("un'amica");
    expect(joinWordBankTokens(['¡', 'Hola', ',', 'amigo', '!'])).toBe('¡Hola, amigo!');
  });

  it('normalizes mixed German ß/ss + umlaut variants cleanly', () => {
    expect(normalizeAnswer('  ¡Straße, bitte!  ', { expandGerman: true, stripAccents: true })).toBe(
      'strasse, bitte'
    );
    const mixed = gradeAnswer({
      submitted: 'grosse Kase',
      expected: 'große Käse',
      language: 'de',
    });
    expect(mixed.isCorrect).toBe(true);
    expect(mixed.exactMatch).toBe(false);
    expect(mixed.heartPenalty).toBe(0);
    expect(mixed.accentCoaching?.highlightedChars).toEqual(expect.arrayContaining(['ß', 'ä']));
  });

  it('provides articleCoaching across all 4 languages when expectedArticle is supplied', () => {
    expect(
      gradeAnswer({ submitted: 'el sol', expected: 'el sol', language: 'es', expectedArticle: 'el' })
        .articleCoaching?.gender
    ).toBe('masculine');
    expect(
      gradeAnswer({ submitted: "l'eau", expected: "l'eau", language: 'fr', expectedArticle: "l'" })
        .articleCoaching?.article
    ).toBe("l'");
    expect(
      gradeAnswer({ submitted: 'das Brot', expected: 'das Brot', language: 'de', expectedArticle: 'das' })
        .articleCoaching?.gender
    ).toBe('neuter');
    expect(
      gradeAnswer({ submitted: "un'amica", expected: "un'amica", language: 'it', expectedArticle: "un'" })
        .articleCoaching?.gender
    ).toBe('feminine');
  });

  it('fails genuinely wrong, empty, and punctuation-only answers with heartPenalty: 1', () => {
    const wrongCases = [
      { submitted: 'adios', expected: 'hola', lang: 'es' as const },
      { submitted: 'le pain', expected: "l'eau", lang: 'fr' as const },
      { submitted: 'der Hund', expected: 'die Katze', lang: 'de' as const },
      { submitted: 'il gatto', expected: 'il gelato', lang: 'it' as const },
      { submitted: '', expected: 'hola', lang: 'es' as const },
      { submitted: '   ¡!¿?   ', expected: 'hola', lang: 'es' as const },
    ];

    for (const c of wrongCases) {
      const res = gradeAnswer({
        submitted: c.submitted,
        expected: c.expected,
        language: c.lang,
      });
      expect(res.isCorrect, `Expected failure for "${c.submitted}" vs "${c.expected}"`).toBe(false);
      expect(res.exactMatch).toBe(false);
      expect(res.heartPenalty).toBe(1);
    }
  });
});
