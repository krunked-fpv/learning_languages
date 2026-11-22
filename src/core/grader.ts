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
  /(?<=^|[\s'])(c|d|j|l|m|n|s|t|v|qu|jusqu|lorsqu|puisqu|quelqu|presqu|aujourd|un|dell|all|dall|nell|sull|coll|pell|quest|quell|anch|ch|gl|bell|buon|sant|grand|pover|mezz|qualcos|nient)\s*'\s+(?=[a-z\u00C0-\u024F])/gi;

const EDGE_PUNCTUATION_REGEX = /^[¡!¿?.,;:"“”\s]+|[¡!¿?.,;:"“”\s]+$/g;
const SENTENCE_PUNCTUATION_REGEX = /[¡!¿?.,;:"“”]/g;
const SPECIAL_LETTER_REGEX = /[^\x00-\x7F]/;

export function normalizeAnswer(input: string, options: NormalizeOptions = {}): string {
  if (!input) return '';

  let text = input
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');

  if (options.expandGerman) {
    text = text
      .replace(/ß/g, 'ss')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue');
  }

  if (options.stripAccents) {
    text = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .normalize('NFC')
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae');
  }

  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(EDGE_PUNCTUATION_REGEX, '').trim();
  text = text.replace(ELISION_SPACING_REGEX, "$1'");
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

function stripSentencePunctuation(normalized: string): string {
  return normalized.replace(SENTENCE_PUNCTUATION_REGEX, ' ').replace(/\s+/g, ' ').trim();
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
  const subStripped = stripSentencePunctuation(normalizeAnswer(submittedRaw, { stripAccents: true }));
  const candStripped = stripSentencePunctuation(normalizeAnswer(candidateRaw, { stripAccents: true }));
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

    if (normalizeGermanMixed(submittedRaw) === normalizeGermanMixed(candidateRaw)) {
      return true;
    }
  }

  return false;
}

function countSpecialChars(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of text) {
    if (SPECIAL_LETTER_REGEX.test(ch) && /[a-z\u00C0-\u024F]/i.test(ch)) {
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
  }
  return counts;
}

function buildFriendlyAccentTip(chars: readonly string[], extraOnly: boolean): string {
  if (extraOnly) {
    const list = chars.join(', ');
    return `Almost exact! Remember this spelling uses plain letters instead of ${list}.`;
  }
  if (chars.length === 0) {
    return 'Great answer! Keep an eye on the accent marks to make it letter-perfect.';
  }

  const tips: string[] = [];
  if (chars.includes('ñ')) {
    tips.push("Watch for the tilde on ñ (pronounced 'ny', like in canyon).");
  }
  if (chars.includes('ß')) {
    tips.push("In German, ß (Eszett) makes a crisp 'ss' sound.");
  }
  const umlauts = chars.filter((c) => c === 'ä' || c === 'ö' || c === 'ü');
  if (umlauts.length > 0) {
    tips.push(`Those two dots (umlaut) on ${umlauts.join(', ')} shape the vowel sound.`);
  }
  if (chars.includes('ç')) {
    tips.push("The little hook under ç (cedilla) keeps the 's' sound soft.");
  }

  const remaining = chars.filter(
    (c) => c !== 'ñ' && c !== 'ß' && c !== 'ä' && c !== 'ö' && c !== 'ü' && c !== 'ç'
  );
  if (remaining.length > 0) {
    tips.push(`Notice the accent on ${remaining.join(', ')} — it guides the stress and tone.`);
  }

  return `Great job! ${tips.join(' ')}`;
}

function buildAccentCoaching(expectedCandidate: string, submittedRaw: string): AccentCoaching {
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
    friendlyTip: buildFriendlyAccentTip(highlightedChars, extraOnly),
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
        accentCoaching: buildAccentCoaching(candidate, req.submitted),
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
