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

    const hintRes = gradeAnswer({
      submitted: 'el nombre',
      expected: 'el nombre',
      language: 'es',
      expectedArticle: 'Use "el" for masculine noun "nombre".',
    });
    expect(hintRes.articleCoaching).toEqual({
      article: 'Grammar Tip',
      gender: 'invariant',
      note: 'Use "el" for masculine noun "nombre".',
    });
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

  it('strips international punctuation (CJK 。？！，、・「」『』（）, Arabic ،؟؛ + tatweel, Indic danda ।॥)', () => {
    const cases = [
      { submitted: '你好，朋友！', expected: '你好朋友', lang: 'zh' as const },
      { submitted: '「おはよう。」', expected: 'おはよう', lang: 'ja' as const },
      { submitted: 'مرحباً، يا صديقي؟', expected: 'مرحباً يا صديقي', lang: 'ar' as const },
      { submitted: 'صبــــاح الفل؛', expected: 'صباح الفل', lang: 'arz' as const },
      { submitted: 'नमस्ते।', expected: 'नमस्ते', lang: 'hi' as const },
      { submitted: 'নমস্কার॥', expected: 'নমস্কার', lang: 'bn' as const },
    ];

    for (const c of cases) {
      const res = gradeAnswer({
        submitted: c.submitted,
        expected: c.expected,
        language: c.lang,
      });
      expect(res.isCorrect, `Intl punctuation failed for ${c.submitted}`).toBe(true);
      expect(res.exactMatch, `Intl punctuation exactMatch failed for ${c.submitted}`).toBe(true);
      expect(res.heartPenalty).toBe(0);
    }

    expect(normalizeAnswer('  「你好、世界！」  ')).toBe('你好、世界');
    expect(normalizeAnswer('  مرحــــباً،؟؛  ')).toBe('مرحباً');
    expect(normalizeAnswer('  नमस्ते।॥  ')).toBe('नमस्ते');
  });

  it('handles Vietnamese đ -> d and stacked diacritics, Portuguese nasal/cedilla/circumflex, and Russian ё -> е (while keeping й distinct)', () => {
    // Vietnamese exact
    const viExact = gradeAnswer({
      submitted: 'Tiếng Việt',
      expected: 'Tiếng Việt',
      language: 'vi',
    });
    expect(viExact.isCorrect).toBe(true);
    expect(viExact.exactMatch).toBe(true);
    expect(viExact.heartPenalty).toBe(0);

    // Vietnamese forgiving: đ -> d and stacked \u1E00-\u1EFF diacritics
    expect(normalizeAnswer('đường phố', { stripAccents: true })).toBe('duong pho');
    const viCases = [
      { submitted: 'tieng viet', expected: 'Tiếng Việt', mustHighlight: ['ế', 'ệ'] },
      { submitted: 'duong pho', expected: 'đường phố', mustHighlight: ['đ', 'ờ', 'ố'] },
      { submitted: 'ca phe sua da', expected: 'cà phê sữa đá', mustHighlight: ['à', 'ê', 'ữ', 'đ'] },
      { submitted: 'banh mi', expected: 'bánh mì', mustHighlight: ['á', 'ì'] },
      { submitted: 'mot con meo', expected: 'một con mèo', mustHighlight: ['ộ', 'è'] },
    ];
    for (const c of viCases) {
      const res = gradeAnswer({
        submitted: c.submitted,
        expected: c.expected,
        language: 'vi',
      });
      expect(res.isCorrect, `vi forgiving failed for ${c.submitted}`).toBe(true);
      expect(res.exactMatch).toBe(false);
      expect(res.heartPenalty).toBe(0);
      expect(res.accentCoaching).toBeDefined();
      for (const h of c.mustHighlight) {
        expect(res.accentCoaching!.highlightedChars, `Missing "${h}" for "${c.submitted}"`).toContain(h);
      }
    }

    // Portuguese: ã, õ, ç, â, ê, ô
    const ptCases = [
      { submitted: 'maca', expected: 'maçã', mustHighlight: ['ç', 'ã'] },
      { submitted: 'coracoes', expected: 'corações', mustHighlight: ['ç', 'õ'] },
      { submitted: 'voce', expected: 'você', mustHighlight: ['ê'] },
      { submitted: 'onibus', expected: 'ônibus', mustHighlight: ['ô'] },
      { submitted: 'pao', expected: 'pão', mustHighlight: ['ã'] },
    ];
    for (const c of ptCases) {
      const res = gradeAnswer({
        submitted: c.submitted,
        expected: c.expected,
        language: 'pt',
      });
      expect(res.isCorrect, `pt forgiving failed for ${c.submitted}`).toBe(true);
      expect(res.exactMatch).toBe(false);
      expect(res.heartPenalty).toBe(0);
      expect(res.accentCoaching).toBeDefined();
      for (const h of c.mustHighlight) {
        expect(res.accentCoaching!.highlightedChars).toContain(h);
      }
      expect(res.accentCoaching!.friendlyTip.length).toBeGreaterThan(10);
    }

    // Russian: ё exact vs е forgiving, and й MUST NOT collapse to и
    const ruExact = gradeAnswer({ submitted: 'звёзды', expected: 'звёзды', language: 'ru' });
    expect(ruExact.isCorrect).toBe(true);
    expect(ruExact.exactMatch).toBe(true);
    expect(ruExact.heartPenalty).toBe(0);

    const ruForgiving = gradeAnswer({ submitted: 'звезды', expected: 'звёзды', language: 'ru' });
    expect(ruForgiving.isCorrect).toBe(true);
    expect(ruForgiving.exactMatch).toBe(false);
    expect(ruForgiving.heartPenalty).toBe(0);
    expect(ruForgiving.accentCoaching?.highlightedChars).toContain('ё');

    const ruYodMismatch = gradeAnswer({ submitted: 'мои', expected: 'мой', language: 'ru' });
    expect(ruYodMismatch.isCorrect).toBe(false);
    expect(ruYodMismatch.heartPenalty).toBe(1);
  });

  it('handles Arabic optional harakat, alef variants, teh marbuta/alef maksura, spaceless CJK, and romanized/Pinyin/Romaji accepted coaching', () => {
    // Arabic harakat & alef/teh-marbuta/alef-maksura variants
    const arExact = gradeAnswer({ submitted: 'مرحباً!', expected: 'مرحباً', language: 'ar' });
    expect(arExact.isCorrect).toBe(true);
    expect(arExact.exactMatch).toBe(true);

    const arHarakaForgiving = gradeAnswer({ submitted: 'مرحبا', expected: 'مرحباً', language: 'ar' });
    expect(arHarakaForgiving.isCorrect).toBe(true);
    expect(arHarakaForgiving.exactMatch).toBe(false);
    expect(arHarakaForgiving.heartPenalty).toBe(0);
    expect(arHarakaForgiving.accentCoaching).toBeDefined();

    const arAlefMaksuraForgiving = gradeAnswer({
      submitted: 'الي الحديقه',
      expected: 'إلى الحديقة',
      language: 'ar',
    });
    expect(arAlefMaksuraForgiving.isCorrect).toBe(true);
    expect(arAlefMaksuraForgiving.exactMatch).toBe(false);
    expect(arAlefMaksuraForgiving.heartPenalty).toBe(0);
    expect(arAlefMaksuraForgiving.accentCoaching?.highlightedChars).toEqual(
      expect.arrayContaining(['إ', 'ى', 'ة'])
    );

    const arTatweelExact = gradeAnswer({
      submitted: 'صبــــاح الفل',
      expected: 'صباح الفل',
      language: 'arz',
    });
    expect(arTatweelExact.isCorrect).toBe(true);
    expect(arTatweelExact.exactMatch).toBe(true);
    expect(arTatweelExact.heartPenalty).toBe(0);

    const arzVariant = gradeAnswer({
      submitted: 'اهلا بيك',
      expected: 'أهلاً بيك',
      language: 'arz',
    });
    expect(arzVariant.isCorrect).toBe(true);
    expect(arzVariant.exactMatch).toBe(false);
    expect(arzVariant.heartPenalty).toBe(0);

    // Spaceless CJK collapse (both zh & ja) while preserving non-CJK word spaces
    const zhSpaceless = gradeAnswer({
      submitted: '你好 朋友',
      expected: '你好，朋友！',
      language: 'zh',
    });
    expect(zhSpaceless.isCorrect).toBe(true);
    expect(zhSpaceless.exactMatch).toBe(true);
    expect(zhSpaceless.heartPenalty).toBe(0);

    const jaSpaceless = gradeAnswer({
      submitted: 'こんにちは ともだち',
      expected: 'こんにちは、ともだち！',
      language: 'ja',
    });
    expect(jaSpaceless.isCorrect).toBe(true);
    expect(jaSpaceless.exactMatch).toBe(true);
    expect(jaSpaceless.heartPenalty).toBe(0);

    const cjkWrong = gradeAnswer({ submitted: '你好 小猫', expected: '你好，朋友！', language: 'zh' });
    expect(cjkWrong.isCorrect).toBe(false);
    expect(cjkWrong.heartPenalty).toBe(1);

    const latinSpacePreserved = gradeAnswer({
      submitted: 'goodmorning',
      expected: 'good morning',
      language: 'en',
    });
    expect(latinSpacePreserved.isCorrect).toBe(false);
    expect(latinSpacePreserved.heartPenalty).toBe(1);

    // Pinyin & Romaji accepted answers with tone/macron coaching
    const pinyinForgiving = gradeAnswer({
      submitted: 'ni hao',
      expected: '你好！',
      accepted: ['Nǐ hǎo'],
      language: 'zh',
    });
    expect(pinyinForgiving.isCorrect).toBe(true);
    expect(pinyinForgiving.exactMatch).toBe(false);
    expect(pinyinForgiving.heartPenalty).toBe(0);
    expect(pinyinForgiving.accentCoaching?.highlightedChars).toEqual(
      expect.arrayContaining(['ǐ', 'ǎ'])
    );

    const romajiForgiving = gradeAnswer({
      submitted: 'ohayo',
      expected: 'おはよう',
      accepted: ['Ohayō'],
      language: 'ja',
    });
    expect(romajiForgiving.isCorrect).toBe(true);
    expect(romajiForgiving.exactMatch).toBe(false);
    expect(romajiForgiving.heartPenalty).toBe(0);
    expect(romajiForgiving.accentCoaching?.highlightedChars).toContain('ō');

    expect(joinWordBankTokens(['你好', '，', '朋友', '！'])).toBe('你好，朋友！');
    expect(joinWordBankTokens(['مرحباً', '،', 'صديقي', '؟'])).toBe('مرحباً، صديقي؟');
  });

  it('provides language-specific ARTICLE_META coaching across all 16 languages', () => {
    const samples = [
      { lang: 'es' as const, article: 'los', gender: 'plural' as const },
      { lang: 'fr' as const, article: "l'", gender: 'invariant' as const },
      { lang: 'de' as const, article: 'das', gender: 'neuter' as const },
      { lang: 'it' as const, article: 'gli', gender: 'plural' as const },
      { lang: 'pt' as const, article: 'umas', gender: 'plural' as const },
      { lang: 'en' as const, article: 'an', gender: 'invariant' as const },
      { lang: 'zh' as const, article: '个', gender: 'invariant' as const },
      { lang: 'ja' as const, article: 'は', gender: 'invariant' as const },
      { lang: 'hi' as const, article: 'की', gender: 'feminine' as const },
      { lang: 'bn' as const, article: 'টা', gender: 'invariant' as const },
      { lang: 'ar' as const, article: 'هذا', gender: 'masculine' as const },
      { lang: 'arz' as const, article: 'دي', gender: 'feminine' as const },
      { lang: 'ru' as const, article: 'моё', gender: 'neuter' as const },
      { lang: 'id' as const, article: 'seekor', gender: 'invariant' as const },
      { lang: 'vi' as const, article: 'quả', gender: 'invariant' as const },
      { lang: 'sw' as const, article: 'wa-', gender: 'plural' as const },
    ];

    for (const s of samples) {
      const res = gradeAnswer({
        submitted: 'ok',
        expected: 'ok',
        language: s.lang,
        expectedArticle: s.article,
      });
      expect(res.articleCoaching, `Missing articleCoaching for ${s.lang}:${s.article}`).toBeDefined();
      expect(res.articleCoaching!.article).toBe(s.article);
      expect(res.articleCoaching!.gender).toBe(s.gender);
      expect(res.articleCoaching!.note).not.toContain('introduces this noun in');
    }
  });

  it('grades multi-clause C1/C2 sentences cleanly across Latin, CJK (，；。), Arabic (،؛), and Indic (।॥) punctuation without false heart penalties', () => {
    const exactMultiClauseCases = [
      {
        submitted: 'Although the voyage was long, we arrived safely; moreover — we learned much!',
        expected: 'Although the voyage was long — we arrived safely; moreover, we learned much.',
        lang: 'en' as const,
      },
      {
        submitted: 'Aunque llovía mucho, seguimos adelante; sin embargo, llegamos a tiempo.',
        expected: 'Aunque llovía mucho — seguimos adelante: sin embargo, llegamos a tiempo',
        lang: 'es' as const,
      },
      {
        submitted: "C'est pourquoi j'aime l'aventure — l'horizon s'ouvre, et l'espoir grandit!",
        expected: "C'est pourquoi j' aime l' aventure, l'horizon s'ouvre; et l'espoir grandit",
        lang: 'fr' as const,
      },
      {
        submitted: "Anche se l'amica era stanca, continuò — d'altronde, l'idea era brillante.",
        expected: "Anche se l' amica era stanca; continuò, d' altronde l' idea era brillante",
        lang: 'it' as const,
      },
      {
        submitted: 'Obwohl die Straße lang war — fanden wir große Freude; alle lächelten.',
        expected: 'Obwohl die Straße lang war, fanden wir große Freude — alle lächelten!',
        lang: 'de' as const,
      },
      {
        submitted: '虽然路很远，但是我们坚持下去了；最后，大家都笑了！',
        expected: '虽然路很远；但是我们坚持下去了 — 最后大家都笑了。',
        lang: 'zh' as const,
      },
      {
        submitted: '道は遠かったけれども、みんなで協力しました；そして、夢が叶いました！',
        expected: '道は遠かったけれども；みんなで協力しました。そして夢が叶いました',
        lang: 'ja' as const,
      },
      {
        submitted: 'رغم أن الطريق طويل، واصلنا الرحلة؛ وفي النهاية، وصلنا إلى القمة؟',
        expected: 'رغم أن الطريق طويل؛ واصلنا الرحلة، وفي النهاية وصلنا إلى القمة',
        lang: 'ar' as const,
      },
      {
        submitted: 'مع إن المشوار كان طويل، كملنا الرحلة؛ وفي الآخر فرحنا جداً!',
        expected: 'مع إن المشوار كان طويل؛ كملنا الرحلة، وفي الآخر فرحنا جداً',
        lang: 'arz' as const,
      },
      {
        submitted: 'हालांकि रास्ता लंबा था, हमने हिम्मत नहीं हारी। अंत में हम सफल हुए॥',
        expected: 'हालांकि रास्ता लंबा था; हमने हिम्मत नहीं हारी — अंत में हम सफल हुए',
        lang: 'hi' as const,
      },
      {
        submitted: 'পথ দীর্ঘ হলেও আমরা থামিনি। অবশেষে আমরা সফল হয়েছি॥',
        expected: 'পথ দীর্ঘ হলেও আমরা থামিনি; অবশেষে আমরা সফল হয়েছি',
        lang: 'bn' as const,
      },
    ];

    for (const c of exactMultiClauseCases) {
      const res = gradeAnswer({
        submitted: c.submitted,
        expected: c.expected,
        language: c.lang,
      });
      expect(res.isCorrect, `Multi-clause grade failed for "${c.submitted}"`).toBe(true);
      expect(res.exactMatch, `Multi-clause exactMatch failed for "${c.submitted}"`).toBe(true);
      expect(res.heartPenalty).toBe(0);
    }
  });

  it('supports diacritic-forgiving free-recall grading on multi-clause B2/C1/C2 sentences with structured AccentCoaching', () => {
    const forgivingFreeRecallCases = [
      {
        submitted: 'Aunque llovia mucho, el nino sonrio; mas vale tarde que nunca',
        expected: 'Aunque llovía mucho, el niño sonrió; más vale tarde que nunca.',
        lang: 'es' as const,
        highlights: ['í', 'ñ', 'ó', 'á'],
      },
      {
        submitted: "C'est une idee brillante; neanmoins, l'etre humain prefere la serenite",
        expected: "C'est une idée brillante; néanmoins, l'être humain préfère la sérénité.",
        lang: 'fr' as const,
        highlights: ['é', 'ê', 'è'],
      },
      {
        submitted: 'Grosse Traume brauchen Geduld — fur die Zukunft offnen wir neue Turen',
        expected: 'Große Träume brauchen Geduld — für die Zukunft öffnen wir neue Türen.',
        lang: 'de' as const,
        highlights: ['ß', 'ä', 'ü', 'ö'],
      },
      {
        submitted: 'Embora a viagem seja longa, a esperanca nao desaparece; o coracao segue firme',
        expected: 'Embora a viagem seja longa, a esperança não desaparece; o coração segue firme.',
        lang: 'pt' as const,
        highlights: ['ç', 'ã'],
      },
      {
        submitted: 'Duong di tuy dai nhung chung ta van kien tri; thanh cong se den',
        expected: 'Đường đi tuy dài nhưng chúng ta vẫn kiên trì; thành công sẽ đến.',
        lang: 'vi' as const,
        highlights: ['đ', 'ờ', 'à'],
      },
      {
        submitted: 'Звезды сияют ярко; тем не менее, мы продолжаем путь вперед',
        expected: 'Звёзды сияют ярко; тем не менее, мы продолжаем путь вперёд.',
        lang: 'ru' as const,
        highlights: ['ё'],
      },
      {
        submitted: 'رغم ان الرحله طويله، فان الصبر مفتاح الفرج',
        expected: 'رغم أن الرحلة طويلة، فإن الصبر مفتاح الفرج.',
        lang: 'ar' as const,
        highlights: ['أ', 'ة', 'إ'],
      },
      {
        submitted: 'yi zhi du xiu — shuang shuang cheng dui',
        expected: '一枝独秀 — 双双成对',
        accepted: ['yī zhī dú xiù — shuāng shuāng chéng duì'],
        lang: 'zh' as const,
        highlights: ['ī', 'ú'],
      },
    ];

    for (const c of forgivingFreeRecallCases) {
      const res = gradeAnswer({
        submitted: c.submitted,
        expected: c.expected,
        accepted: c.accepted,
        language: c.lang,
      });
      expect(res.isCorrect, `Forgiving free-recall failed for "${c.submitted}"`).toBe(true);
      expect(res.exactMatch).toBe(false);
      expect(res.heartPenalty).toBe(0);
      expect(res.accentCoaching, `Missing accentCoaching for "${c.submitted}"`).toBeDefined();
      for (const h of c.highlights) {
        expect(res.accentCoaching!.highlightedChars).toContain(h);
      }
      expect(res.accentCoaching!.friendlyTip.trim().length).toBeGreaterThan(10);
    }

    // Wrong multi-clause answer must still fail with heartPenalty: 1
    const wrongMulti = gradeAnswer({
      submitted: 'Aunque llovia mucho, nos fuimos a dormir inmediatamente',
      expected: 'Aunque llovía mucho, seguimos adelante con alegría.',
      language: 'es',
    });
    expect(wrongMulti.isCorrect).toBe(false);
    expect(wrongMulti.heartPenalty).toBe(1);
  });
});
