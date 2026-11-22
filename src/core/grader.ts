import {
  LANGUAGE_META,
  type AccentCoaching,
  type ArticleCoaching,
  type GenderCategory,
  type GradeRequest,
  type GradeResult,
  type LanguageCode,
} from '../types/contracts';

export interface NormalizeOptions {
  stripAccents?: boolean;
  expandGerman?: boolean;
}

const ELISION_SPACING_REGEX =
  /(?<=^|[\s'"«„(—–,;:\-])(c|d|j|l|m|n|s|t|v|qu|jusqu|lorsqu|puisqu|quelqu|presqu|aujourd|un|dell|all|dall|nell|sull|coll|pell|quest|quell|anch|ch|gl|bell|buon|sant|grand|pover|mezz|qualcos|nient|com|dov|cos|quant|tant|tutt|altr|molt|poc|senz|sott)(?:\s+'\s*|\s*'\s+)(?=[a-z\u00C0-\u024F])/gi;

const EDGE_PUNCTUATION_REGEX =
  /^[¡!¿?.,;:"“”„«»‹›()。？！，、；：・「」『』（）【】《》〈〉—–―…،؟؛।॥()[\]\s]+|[¡!¿?.,;:"“”„«»‹›()。？！，、；：・「」『』（）【】《》〈〉—–―…،؟؛।॥()[\]\s]+$/g;
const SENTENCE_PUNCTUATION_REGEX =
  /[¡!¿?.,;:"“”„«»‹›()。？！，、；：・「」『』（）【】《》〈〉—–―…،؟؛।॥()[\]]/g;
const CJK_INTER_SPACE_REGEX =
  /(?<=[\u3005\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])\s+(?=[\u3005\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])/g;
const ARABIC_HARAKAT_REGEX = /[\u064B-\u065F\u0670]/g;
const SPECIAL_ACCENT_CHAR_REGEX =
  /[\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u1E00-\u1EFF\u0451\u0401\u064B-\u065F\u0670أإآٱىة]/;

/**
 * Collapses whitespace strictly between adjacent CJK/Kana characters so tile-joined
 * Mandarin and Japanese answers match spaceless target strings cleanly.
 */
function collapseCjkSpaces(text: string): string {
  return text.replace(CJK_INTER_SPACE_REGEX, '');
}

/**
 * Strips combining diacritics (preserving Russian "й"), normalizes Vietnamese "đ",
 * and folds Arabic harakat/alef/alef-maksura/teh-marbuta variants for forgiving grading.
 */
function stripDiacriticsAndVariants(text: string): string {
  return text
    .split('й')
    .map((segment) =>
      segment.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
    )
    .join('й')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/đ/g, 'd')
    .replace(ARABIC_HARAKAT_REGEX, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

export function normalizeAnswer(input: string, options: NormalizeOptions = {}): string {
  if (!input) return '';

  let text = input
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u0640/g, '');

  if (options.expandGerman) {
    text = text
      .replace(/ß/g, 'ss')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue');
  }

  if (options.stripAccents) {
    text = stripDiacriticsAndVariants(text);
  }

  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(EDGE_PUNCTUATION_REGEX, '').trim();
  text = text.replace(ELISION_SPACING_REGEX, "$1'");
  text = collapseCjkSpaces(text.replace(/\s+/g, ' ').trim());

  return text;
}

function stripSentencePunctuation(normalized: string): string {
  return collapseCjkSpaces(
    normalized
      .replace(/--+/g, ' ')
      .replace(/(?<=^|\s)-(?=\s|$)/g, ' ')
      .replace(SENTENCE_PUNCTUATION_REGEX, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function normalizeGermanMixed(input: string): string {
  return stripSentencePunctuation(
    normalizeAnswer(input, { stripAccents: true }).replace(/ß/g, 'ss')
  );
}

function matchesExact(submittedRaw: string, candidateRaw: string): boolean {
  const normSub = normalizeAnswer(submittedRaw);
  const normCand = normalizeAnswer(candidateRaw);
  if (!normSub || !normCand) return normSub === normCand && normCand.length > 0;
  if (normSub === normCand) return true;
  return stripSentencePunctuation(normSub) === stripSentencePunctuation(normCand);
}

function matchesAccentForgiving(
  submittedRaw: string,
  candidateRaw: string,
  language: LanguageCode
): boolean {
  const subStripped = stripSentencePunctuation(
    normalizeAnswer(submittedRaw, { stripAccents: true })
  );
  const candStripped = stripSentencePunctuation(
    normalizeAnswer(candidateRaw, { stripAccents: true })
  );
  if (!subStripped || !candStripped) return false;
  if (subStripped === candStripped) return true;

  if (language === 'de') {
    const subExpanded = stripSentencePunctuation(
      normalizeAnswer(submittedRaw, { stripAccents: true, expandGerman: true })
    );
    const candExpanded = stripSentencePunctuation(
      normalizeAnswer(candidateRaw, { stripAccents: true, expandGerman: true })
    );
    if (subExpanded === candExpanded) return true;

    const subMixed = normalizeGermanMixed(submittedRaw);
    const candMixed = normalizeGermanMixed(candidateRaw);
    if (subMixed === candMixed) {
      return true;
    }

    const subExpWords = subExpanded.split(' ');
    const candExpWords = candExpanded.split(' ');
    const subMixWords = subMixed.split(' ');
    const candMixWords = candMixed.split(' ');
    if (
      subExpWords.length === candExpWords.length &&
      subMixWords.length === candMixWords.length
    ) {
      let allMatch = true;
      for (let i = 0; i < subExpWords.length; i++) {
        if (subExpWords[i] !== candExpWords[i] && subMixWords[i] !== candMixWords[i]) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) return true;
    }
  }

  return false;
}

function countSpecialChars(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of text) {
    if (SPECIAL_ACCENT_CHAR_REGEX.test(ch)) {
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
  }
  return counts;
}

function takeMatchingChars(
  chars: readonly string[],
  handled: Set<string>,
  predicate: (ch: string) => boolean
): string[] {
  const matched = chars.filter((ch) => !handled.has(ch) && predicate(ch));
  matched.forEach((ch) => handled.add(ch));
  return matched;
}

function buildFriendlyAccentTip(
  chars: readonly string[],
  extraOnly: boolean,
  language?: LanguageCode
): string {
  if (extraOnly) {
    if (chars.length > 0 && chars.every((c) => /[\u064B-\u065F\u0670]/.test(c))) {
      return `Great answer! Note that this spelling omits the optional vowel marks (${chars.join(' ')}).`;
    }
    const list = chars.join(', ');
    return `Almost exact! Remember this spelling uses plain letters instead of ${list}.`;
  }
  if (chars.length === 0) {
    return 'Great answer! Keep an eye on the accent marks to make it letter-perfect.';
  }

  const tips: string[] = [];
  const handled = new Set<string>();

  if (takeMatchingChars(chars, handled, (c) => c === 'ñ').length > 0) {
    tips.push("Watch for the tilde on ñ (pronounced 'ny', like in canyon).");
  }
  if (takeMatchingChars(chars, handled, (c) => c === 'ß').length > 0) {
    tips.push("In German, ß (Eszett) makes a crisp 'ss' sound.");
  }
  const umlauts = takeMatchingChars(chars, handled, (c) => c === 'ä' || c === 'ö' || c === 'ü');
  if (umlauts.length > 0) {
    tips.push(`Those two dots (umlaut) on ${umlauts.join(', ')} shape the vowel sound.`);
  }
  if (takeMatchingChars(chars, handled, (c) => c === 'ç').length > 0) {
    tips.push("The little hook under ç (cedilla) keeps the 's' sound soft.");
  }
  if (takeMatchingChars(chars, handled, (c) => c === 'đ').length > 0) {
    tips.push("In Vietnamese, đ (d with crossbar) makes a crisp 'd' sound.");
  }
  const nasals = takeMatchingChars(chars, handled, (c) => c === 'ã' || c === 'õ');
  if (nasals.length > 0) {
    tips.push(
      `Watch for the nasal tilde (~) on ${nasals.join(', ')} — it gives the vowel a warm nasal sound.`
    );
  }
  if (language === 'vi') {
    const viChars = takeMatchingChars(chars, handled, (c) =>
      /[\u00C0-\u024F\u1E00-\u1EFF]/.test(c)
    );
    if (viChars.length > 0) {
      tips.push(
        `Watch the Vietnamese vowel and tone marks on ${viChars.join(', ')} — they shape both the vowel sound and its pitch!`
      );
    }
  } else {
    const circumflexes = takeMatchingChars(
      chars,
      handled,
      (c) => c === 'â' || c === 'ê' || c === 'ô'
    );
    if (circumflexes.length > 0) {
      tips.push(
        `Notice the circumflex (^) on ${circumflexes.join(', ')} — it marks a closed, stressed vowel sound.`
      );
    }
  }
  if (takeMatchingChars(chars, handled, (c) => c === 'ё').length > 0) {
    tips.push("In Russian, ё makes a 'yo' sound — watch for the two dots above е!");
  }
  const harakat = takeMatchingChars(chars, handled, (c) => /[\u064B-\u065F\u0670]/.test(c));
  if (harakat.length > 0) {
    tips.push(
      `Watch the short vowel marks (harakat: ${harakat.join(' ')}) — they guide how each Arabic syllable sounds.`
    );
  }
  const alefs = takeMatchingChars(chars, handled, (c) => /[أإآٱ]/.test(c));
  if (alefs.length > 0) {
    tips.push(
      `Watch for the hamza or maddah mark on ${alefs.join(', ')} — it guides the glottal stop or long 'aa' sound.`
    );
  }
  if (takeMatchingChars(chars, handled, (c) => c === 'ة').length > 0) {
    tips.push(
      'Notice ة (teh marbuta) with two dots at the end — it marks a feminine or special noun ending.'
    );
  }
  if (takeMatchingChars(chars, handled, (c) => c === 'ى').length > 0) {
    tips.push(
      "Notice ى (alef maksura, dotless at the end) — it sounds like a soft 'aa' ending rather than 'ee'."
    );
  }
  if (language === 'zh') {
    const pinyinTones = takeMatchingChars(chars, handled, (c) =>
      /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(c)
    );
    if (pinyinTones.length > 0) {
      tips.push(
        `Notice the Pinyin tone marks on ${pinyinTones.join(', ')} — they guide how your voice stays level, rises, dips, or drops!`
      );
    }
  } else if (language === 'ja') {
    const macrons = takeMatchingChars(chars, handled, (c) => /[āēīōū]/.test(c));
    if (macrons.length > 0) {
      tips.push(
        `Notice the macron bar on ${macrons.join(', ')} — hold that vowel sound a little longer!`
      );
    }
  }

  const remaining = chars.filter((c) => !handled.has(c));
  if (remaining.length > 0) {
    tips.push(`Notice the accent on ${remaining.join(', ')} — it guides the stress and tone.`);
  }

  return `Great job! ${tips.join(' ')}`;
}

function buildAccentCoaching(
  expectedCandidate: string,
  submittedRaw: string,
  language: LanguageCode
): AccentCoaching {
  const normCand = normalizeAnswer(expectedCandidate);
  const normSub = normalizeAnswer(submittedRaw);
  const candCounts = countSpecialChars(normCand);
  const subCounts = countSpecialChars(normSub);

  const missingOrSubstituted: string[] = [];
  for (const [ch, candCount] of candCounts.entries()) {
    const subCount = subCounts.get(ch) ?? 0;
    if (subCount < candCount) {
      missingOrSubstituted.push(ch);
    }
  }

  let extraOnly = false;
  let highlightedChars = missingOrSubstituted;
  if (highlightedChars.length === 0) {
    const extras: string[] = [];
    for (const [ch, subCount] of subCounts.entries()) {
      const candCount = candCounts.get(ch) ?? 0;
      if (subCount > candCount) {
        extras.push(ch);
      }
    }
    if (extras.length > 0) {
      highlightedChars = extras;
      extraOnly = true;
    }
  }

  return {
    expected: expectedCandidate,
    submitted: submittedRaw.trim() || submittedRaw,
    highlightedChars,
    friendlyTip: buildFriendlyAccentTip(highlightedChars, extraOnly, language),
  };
}

const ARTICLE_META: Record<
  LanguageCode,
  Record<string, { gender: GenderCategory; note: string }>
> = {
  es: {
    el: { gender: 'masculine', note: '"el" is the masculine "the" in Spanish.' },
    la: { gender: 'feminine', note: '"la" is the feminine "the" in Spanish.' },
    los: { gender: 'plural', note: '"los" is the masculine plural "the" in Spanish.' },
    las: { gender: 'plural', note: '"las" is the feminine plural "the" in Spanish.' },
    un: { gender: 'masculine', note: '"un" means "a / an" for masculine nouns in Spanish.' },
    una: { gender: 'feminine', note: '"una" means "a / an" for feminine nouns in Spanish.' },
    unos: { gender: 'plural', note: '"unos" means "some" for masculine plural nouns in Spanish.' },
    unas: { gender: 'plural', note: '"unas" means "some" for feminine plural nouns in Spanish.' },
  },
  fr: {
    le: { gender: 'masculine', note: '"le" is the masculine "the" in French.' },
    la: { gender: 'feminine', note: '"la" is the feminine "the" in French.' },
    "l'": {
      gender: 'invariant',
      note: '"l\'" replaces "le" or "la" before a vowel or silent h in French.',
    },
    les: { gender: 'plural', note: '"les" is the plural "the" in French.' },
    un: { gender: 'masculine', note: '"un" means "a / an" for masculine nouns in French.' },
    une: { gender: 'feminine', note: '"une" means "a / an" for feminine nouns in French.' },
    des: { gender: 'plural', note: '"des" means "some" for plural nouns in French.' },
  },
  de: {
    der: { gender: 'masculine', note: '"der" is the masculine "the" in German.' },
    die: { gender: 'feminine', note: '"die" is the feminine (or plural) "the" in German.' },
    das: { gender: 'neuter', note: '"das" is the neuter "the" in German.' },
    ein: { gender: 'masculine', note: '"ein" means "a / an" for masculine or neuter nouns in German.' },
    eine: { gender: 'feminine', note: '"eine" means "a / an" for feminine nouns in German.' },
  },
  it: {
    il: { gender: 'masculine', note: '"il" is the standard masculine "the" in Italian.' },
    lo: {
      gender: 'masculine',
      note: '"lo" is the masculine "the" before s+consonant, z, gn, or ps in Italian.',
    },
    la: { gender: 'feminine', note: '"la" is the feminine "the" in Italian.' },
    "l'": { gender: 'invariant', note: '"l\'" replaces "il" or "la" before a vowel in Italian.' },
    i: { gender: 'plural', note: '"i" is the masculine plural "the" in Italian.' },
    gli: {
      gender: 'plural',
      note: '"gli" is the masculine plural "the" before vowels, z, or s+consonant in Italian.',
    },
    le: { gender: 'plural', note: '"le" is the feminine plural "the" in Italian.' },
    un: { gender: 'masculine', note: '"un" means "a / an" for masculine nouns in Italian.' },
    uno: { gender: 'masculine', note: '"uno" means "a / an" before s+consonant or z in Italian.' },
    una: { gender: 'feminine', note: '"una" means "a / an" for feminine nouns in Italian.' },
    "un'": {
      gender: 'feminine',
      note: '"un\'" means "a / an" before feminine nouns starting with a vowel in Italian.',
    },
  },
  pt: {
    o: { gender: 'masculine', note: '"o" is the masculine "the" in Portuguese.' },
    a: { gender: 'feminine', note: '"a" is the feminine "the" in Portuguese.' },
    os: { gender: 'plural', note: '"os" is the masculine plural "the" in Portuguese.' },
    as: { gender: 'plural', note: '"as" is the feminine plural "the" in Portuguese.' },
    um: { gender: 'masculine', note: '"um" means "a / an" for masculine nouns in Portuguese.' },
    uma: { gender: 'feminine', note: '"uma" means "a / an" for feminine nouns in Portuguese.' },
    uns: { gender: 'plural', note: '"uns" means "some" for masculine plural nouns in Portuguese.' },
    umas: { gender: 'plural', note: '"umas" means "some" for feminine plural nouns in Portuguese.' },
  },
  en: {
    the: {
      gender: 'invariant',
      note: '"the" is the definite article in English for specific singular or plural nouns.',
    },
    a: {
      gender: 'invariant',
      note: '"a" means "one / any" before words starting with a consonant sound.',
    },
    an: {
      gender: 'invariant',
      note: '"an" replaces "a" before words starting with a vowel sound for smooth speaking.',
    },
    some: {
      gender: 'plural',
      note: '"some" introduces plural or uncountable nouns in English.',
    },
  },
  zh: {
    个: {
      gender: 'invariant',
      note: '"个 (gè)" is the everyday Mandarin classifier / measure word for people and general things.',
    },
    杯: {
      gender: 'invariant',
      note: '"杯 (bēi)" is the classifier for cups or glasses of a drink.',
    },
    本: {
      gender: 'invariant',
      note: '"本 (běn)" is the classifier used when counting books and notebooks.',
    },
    只: {
      gender: 'invariant',
      note: '"只 (zhī)" is a friendly classifier used for many animals and birds.',
    },
    条: {
      gender: 'invariant',
      note: '"条 (tiáo)" is the classifier for long, narrow things like fish, rivers, or roads.',
    },
    张: {
      gender: 'invariant',
      note: '"张 (zhāng)" is the classifier for flat things like maps, tickets, or paper.',
    },
    颗: {
      gender: 'invariant',
      note: '"颗 (kē)" is the classifier for small round things like stars or fruits.',
    },
    的: {
      gender: 'invariant',
      note: '"的 (de)" connects a describer or owner to a noun (like "\'s" or "of").',
    },
    吗: {
      gender: 'invariant',
      note: '"吗 (ma)" goes at the end of a sentence to turn it into a yes/no question!',
    },
  },
  ja: {
    は: {
      gender: 'invariant',
      note: '"は (wa)" is the topic particle showing what the sentence is about ("as for...").',
    },
    が: {
      gender: 'invariant',
      note: '"が (ga)" is the subject particle spotlighting who or what does something.',
    },
    を: {
      gender: 'invariant',
      note: '"を (o)" marks the direct object receiving an action.',
    },
    の: {
      gender: 'invariant',
      note: '"の (no)" links two nouns to show belonging or description (like "\'s" or "of").',
    },
    に: {
      gender: 'invariant',
      note: '"に (ni)" is the particle for destination, time, or target.',
    },
    で: {
      gender: 'invariant',
      note: '"で (de)" marks the place where an action happens or the tool used.',
    },
    か: {
      gender: 'invariant',
      note: '"か (ka)" at the end of a sentence makes it a polite question!',
    },
    お: {
      gender: 'invariant',
      note: '"お (o-)" is a gentle honorific prefix placed before native Japanese nouns.',
    },
    ご: {
      gender: 'invariant',
      note: '"ご (go-)" is a polite prefix often paired with respectful or family nouns.',
    },
  },
  hi: {
    का: {
      gender: 'masculine',
      note: '"का (kaa)" is a postposition meaning "of" before a masculine singular noun in Hindi.',
    },
    की: {
      gender: 'feminine',
      note: '"की (kii)" is a postposition meaning "of" before a feminine noun in Hindi.',
    },
    के: {
      gender: 'plural',
      note: '"के (ke)" is a postposition meaning "of" before masculine plural or oblique nouns.',
    },
    एक: {
      gender: 'invariant',
      note: '"एक (ek)" means "one" and introduces a single noun (Hindi has no separate "the").',
    },
    में: {
      gender: 'invariant',
      note: '"में (mein)" is a postposition meaning "in / inside" placed after the noun.',
    },
    को: {
      gender: 'invariant',
      note: '"को (ko)" is a postposition meaning "to / for" placed after a noun or pronoun.',
    },
    जी: {
      gender: 'invariant',
      note: '"जी (jii)" is a warm, respectful honorific added after names or polite words.',
    },
    क्या: {
      gender: 'invariant',
      note: '"क्या (kyaa)" means "what" and also starts yes/no questions in Hindi.',
    },
  },
  bn: {
    টা: {
      gender: 'invariant',
      note: '"-টা (-ta)" attaches to the end of a Bengali noun like "the" or "one specific".',
    },
    টি: {
      gender: 'invariant',
      note: '"-টি (-ti)" is a gentle noun suffix classifier meaning "the / one".',
    },
    একটা: {
      gender: 'invariant',
      note: '"একটা (ekta)" means "a / an / one" for everyday objects in Bengali.',
    },
    একটি: {
      gender: 'invariant',
      note: '"একটি (ekti)" is a polite or storybook way to say "a / an / one" in Bengali.',
    },
    জন: {
      gender: 'invariant',
      note: '"জন (jon)" is the special Bengali classifier used when counting people.',
    },
    এর: {
      gender: 'invariant',
      note: '"-এর (-er)" attaches to a noun to mean "of / \'s".',
    },
    কি: {
      gender: 'invariant',
      note: '"কি (ki)" is the Bengali question particle for yes/no questions.',
    },
  },
  ar: {
    ال: {
      gender: 'invariant',
      note: '"الـ (al-)" attaches to the front of a noun to mean "the" in Arabic (no separate word for "a").',
    },
    الـ: {
      gender: 'invariant',
      note: '"الـ (al-)" is the Arabic definite prefix meaning "the" attached directly to the noun.',
    },
    ة: {
      gender: 'feminine',
      note: '"ـة (teh marbuta)" at the end of an Arabic noun usually marks feminine gender.',
    },
    هذا: {
      gender: 'masculine',
      note: '"هذا (haadhaa)" means "this" for masculine singular nouns in Arabic.',
    },
    هذه: {
      gender: 'feminine',
      note: '"هذه (haadhihi)" means "this" for feminine singular nouns in Arabic.',
    },
    في: {
      gender: 'invariant',
      note: '"في (fii)" is a preposition meaning "in / inside" in Arabic.',
    },
    من: {
      gender: 'invariant',
      note: '"من (min)" is a preposition meaning "from" in Arabic.',
    },
    هل: {
      gender: 'invariant',
      note: '"هل (hal)" starts a yes/no question in Modern Standard Arabic.',
    },
  },
  arz: {
    ال: {
      gender: 'invariant',
      note: '"الـ (il- / el-)" attaches to the front of a noun to mean "the" in Egyptian Arabic.',
    },
    الـ: {
      gender: 'invariant',
      note: '"الـ (il- / el-)" is the Egyptian Arabic definite prefix meaning "the".',
    },
    ة: {
      gender: 'feminine',
      note: '"ـة (teh marbuta)" at the end usually marks a feminine noun in Egyptian Arabic.',
    },
    ده: {
      gender: 'masculine',
      note: '"ده (da)" means "this" for masculine nouns and follows the noun in Egyptian Arabic.',
    },
    دي: {
      gender: 'feminine',
      note: '"دي (di)" means "this" for feminine nouns and follows the noun in Egyptian Arabic.',
    },
    دول: {
      gender: 'plural',
      note: '"دول (dool)" means "these" for plural nouns in Egyptian Arabic.',
    },
    بتاع: {
      gender: 'masculine',
      note: '"بتاع (bitaa\')" links a masculine noun to its owner ("of / belonging to").',
    },
    بتاعة: {
      gender: 'feminine',
      note: '"بتاعة (bitaa\'it)" links a feminine noun to its owner ("of / belonging to").',
    },
    في: {
      gender: 'invariant',
      note: '"في (fi)" means "in / there is" in Egyptian Arabic.',
    },
  },
  ru: {
    мой: {
      gender: 'masculine',
      note: '"мой (moy)" means "my" for masculine nouns (Russian has no "a" or "the").',
    },
    моя: {
      gender: 'feminine',
      note: '"моя (moya)" means "my" for feminine nouns (often ending in -а or -я).',
    },
    моё: {
      gender: 'neuter',
      note: '"моё (moyo)" means "my" for neuter nouns (often ending in -о or -е).',
    },
    мои: {
      gender: 'plural',
      note: '"мои (moi)" means "my" for plural nouns in Russian.',
    },
    это: {
      gender: 'neuter',
      note: '"это (eto)" means "this is / it is" when introducing nouns in Russian.',
    },
    в: { gender: 'invariant', note: '"в (v)" means "in / into" in Russian.' },
    на: { gender: 'invariant', note: '"на (na)" means "on / at" in Russian.' },
    и: { gender: 'invariant', note: '"и (i)" means "and" in Russian.' },
  },
  id: {
    sebuah: {
      gender: 'invariant',
      note: '"sebuah" is an Indonesian classifier meaning "a / one" for objects and places.',
    },
    seekor: {
      gender: 'invariant',
      note: '"seekor" is the classifier meaning "a / one" specifically for animals!',
    },
    seorang: {
      gender: 'invariant',
      note: '"seorang" is the classifier meaning "a / one" when introducing people.',
    },
    ini: {
      gender: 'invariant',
      note: '"ini" means "this" and comes right after the noun in Indonesian.',
    },
    itu: {
      gender: 'invariant',
      note: '"itu" means "that" (or "the" in context) and comes after the noun.',
    },
    di: { gender: 'invariant', note: '"di" means "at / in / on" for locations in Indonesian.' },
    yang: {
      gender: 'invariant',
      note: '"yang" links a noun to its description ("the one that is...").',
    },
  },
  vi: {
    con: {
      gender: 'invariant',
      note: '"con" is the Vietnamese classifier used before animals (and some lively things).',
    },
    cái: {
      gender: 'invariant',
      note: '"cái" is the common Vietnamese classifier used before everyday objects.',
    },
    quả: {
      gender: 'invariant',
      note: '"quả" is the Vietnamese classifier for fruits and round things.',
    },
    trái: {
      gender: 'invariant',
      note: '"trái" is a classifier for fruits and round objects in Vietnamese.',
    },
    chiếc: {
      gender: 'invariant',
      note: '"chiếc" is a classifier for single items, vehicles, or leaves in Vietnamese.',
    },
    quyển: {
      gender: 'invariant',
      note: '"quyển" is the classifier used for books and notebooks in Vietnamese.',
    },
    cuốn: {
      gender: 'invariant',
      note: '"cuốn" is a classifier for books and rolled or bound items in Vietnamese.',
    },
    người: {
      gender: 'invariant',
      note: '"người" introduces people and professions in Vietnamese.',
    },
    một: {
      gender: 'invariant',
      note: '"một" means "one / a / an" before a classifier and noun in Vietnamese.',
    },
    của: {
      gender: 'invariant',
      note: '"của" means "of / belonging to" and follows the noun.',
    },
  },
  sw: {
    'm-': {
      gender: 'invariant',
      note: '"m-" (plural "wa-") is the Swahili noun-class prefix for people and living beings.',
    },
    'wa-': {
      gender: 'plural',
      note: '"wa-" is the plural noun-class prefix matching singular "m-" for people in Swahili.',
    },
    'ki-': {
      gender: 'invariant',
      note: '"ki-" (plural "vi-") is the Swahili noun-class prefix for objects and languages.',
    },
    'vi-': {
      gender: 'plural',
      note: '"vi-" is the plural prefix matching singular "ki-" in Swahili.',
    },
    'ny-': {
      gender: 'invariant',
      note: '"n- / ny-" starts many animal and everyday nouns in Swahili (same singular and plural).',
    },
    'ma-': {
      gender: 'plural',
      note: '"ma-" marks many plural nouns for fruits, places, and natural things in Swahili.',
    },
    hii: {
      gender: 'invariant',
      note: '"hii" means "this" and comes after N-class nouns in Swahili.',
    },
    huyu: {
      gender: 'invariant',
      note: '"huyu" means "this" for people and animal nouns in Swahili.',
    },
    na: { gender: 'invariant', note: '"na" means "and" or "with" in Swahili.' },
  },
};

function computeArticleCoaching(
  expectedArticle: string | undefined,
  language: LanguageCode
): ArticleCoaching | undefined {
  const trimmed = expectedArticle?.trim();
  if (!trimmed) return undefined;

  const key = trimmed
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'");
  const entry = ARTICLE_META[language]?.[key];
  if (entry) {
    return {
      article: trimmed,
      gender: entry.gender,
      note: entry.note,
    };
  }
  if (/\s/.test(trimmed) || trimmed.length > 8) {
    return {
      article: 'Grammar Tip',
      gender: 'invariant',
      note: trimmed,
    };
  }
  return {
    article: trimmed,
    gender: 'invariant',
    note: `"${trimmed}" introduces this noun in ${LANGUAGE_META[language].name}.`,
  };
}

export function gradeAnswer(req: GradeRequest): GradeResult {
  const normalizedSubmitted = normalizeAnswer(req.submitted);
  const normalizedExpected = normalizeAnswer(req.expected);
  const articleCoaching = computeArticleCoaching(req.expectedArticle, req.language);

  if (!normalizedSubmitted) {
    return {
      isCorrect: false,
      exactMatch: false,
      normalizedSubmitted,
      normalizedExpected,
      heartPenalty: 1,
      ...(articleCoaching ? { articleCoaching } : {}),
    };
  }

  const candidates = [req.expected, ...(req.accepted ?? [])].filter(
    (c) => typeof c === 'string' && c.trim().length > 0
  );

  for (const candidate of candidates) {
    if (matchesExact(req.submitted, candidate)) {
      return {
        isCorrect: true,
        exactMatch: true,
        normalizedSubmitted,
        normalizedExpected,
        heartPenalty: 0,
        ...(articleCoaching ? { articleCoaching } : {}),
      };
    }
  }

  for (const candidate of candidates) {
    if (matchesAccentForgiving(req.submitted, candidate, req.language)) {
      return {
        isCorrect: true,
        exactMatch: false,
        normalizedSubmitted,
        normalizedExpected,
        heartPenalty: 0,
        accentCoaching: buildAccentCoaching(candidate, req.submitted, req.language),
        ...(articleCoaching ? { articleCoaching } : {}),
      };
    }
  }

  return {
    isCorrect: false,
    exactMatch: false,
    normalizedSubmitted,
    normalizedExpected,
    heartPenalty: 1,
    ...(articleCoaching ? { articleCoaching } : {}),
  };
}
