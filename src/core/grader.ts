import {
  LANGUAGE_META,
  isAdultLanguage,
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
  /[\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u02BE\u02BF\u1E00-\u1EFF\u0451\u0401\u064B-\u065F\u0670\u0901\u093C\u0958-\u095F\u0981\u09BC\u09DC\u09DD\u09DFأإآٱىة]/;
const AFTER_HOURS_CASUAL_PUNCT_REGEX = /[~*•·\\/|_+]/g;

// Valid base Mandarin Pinyin syllables (without tone marks; ü normalized from v / u:).
const VALID_PINYIN_SYLLABLES: ReadonlySet<string> = new Set([
  'a', 'ai', 'an', 'ang', 'ao', 'e', 'ei', 'en', 'eng', 'er', 'o', 'ou',
  'ba', 'bai', 'ban', 'bang', 'bao', 'bei', 'ben', 'beng', 'bi', 'bian', 'biao', 'bie', 'bin', 'bing', 'bo', 'bu',
  'pa', 'pai', 'pan', 'pang', 'pao', 'pei', 'pen', 'peng', 'pi', 'pian', 'piao', 'pie', 'pin', 'ping', 'po', 'pou', 'pu',
  'ma', 'mai', 'man', 'mang', 'mao', 'me', 'mei', 'men', 'meng', 'mi', 'mian', 'miao', 'mie', 'min', 'ming', 'miu', 'mo', 'mou', 'mu',
  'fa', 'fan', 'fang', 'fei', 'fen', 'feng', 'fiao', 'fo', 'fou', 'fu',
  'da', 'dai', 'dan', 'dang', 'dao', 'de', 'dei', 'den', 'deng', 'di', 'dia', 'dian', 'diao', 'die', 'ding', 'diu', 'dong', 'dou', 'du', 'duan', 'dui', 'dun', 'duo',
  'ta', 'tai', 'tan', 'tang', 'tao', 'te', 'tei', 'teng', 'ti', 'tian', 'tiao', 'tie', 'ting', 'tong', 'tou', 'tu', 'tuan', 'tui', 'tun', 'tuo',
  'na', 'nai', 'nan', 'nang', 'nao', 'ne', 'nei', 'nen', 'neng', 'ni', 'nian', 'niang', 'niao', 'nie', 'nin', 'ning', 'niu', 'nong', 'nou', 'nu', 'nuan', 'nun', 'nuo', 'nü', 'nüe',
  'la', 'lai', 'lan', 'lang', 'lao', 'le', 'lei', 'leng', 'li', 'lia', 'lian', 'liang', 'liao', 'lie', 'lin', 'ling', 'liu', 'lo', 'long', 'lou', 'lu', 'luan', 'lun', 'luo', 'lü', 'lüe',
  'ga', 'gai', 'gan', 'gang', 'gao', 'ge', 'gei', 'gen', 'geng', 'gong', 'gou', 'gu', 'gua', 'guai', 'guan', 'guang', 'gui', 'gun', 'guo',
  'ka', 'kai', 'kan', 'kang', 'kao', 'ke', 'kei', 'ken', 'keng', 'kong', 'kou', 'ku', 'kua', 'kuai', 'kuan', 'kuang', 'kui', 'kun', 'kuo',
  'ha', 'hai', 'han', 'hang', 'hao', 'he', 'hei', 'hen', 'heng', 'hong', 'hou', 'hu', 'hua', 'huai', 'huan', 'huang', 'hui', 'hun', 'huo',
  'ji', 'jia', 'jian', 'jiang', 'jiao', 'jie', 'jin', 'jing', 'jiong', 'jiu', 'ju', 'juan', 'jue', 'jun',
  'qi', 'qia', 'qian', 'qiang', 'qiao', 'qie', 'qin', 'qing', 'qiong', 'qiu', 'qu', 'quan', 'que', 'qun',
  'xi', 'xia', 'xian', 'xiang', 'xiao', 'xie', 'xin', 'xing', 'xiong', 'xiu', 'xu', 'xuan', 'xue', 'xun',
  'zha', 'zhai', 'zhan', 'zhang', 'zhao', 'zhe', 'zhei', 'zhen', 'zheng', 'zhi', 'zhong', 'zhou', 'zhu', 'zhua', 'zhuai', 'zhuan', 'zhuang', 'zhui', 'zhun', 'zhuo',
  'cha', 'chai', 'chan', 'chang', 'chao', 'che', 'chen', 'cheng', 'chi', 'chong', 'chou', 'chu', 'chua', 'chuai', 'chuan', 'chuang', 'chui', 'chun', 'chuo',
  'sha', 'shai', 'shan', 'shang', 'shao', 'she', 'shei', 'shen', 'sheng', 'shi', 'shou', 'shu', 'shua', 'shuai', 'shuan', 'shuang', 'shui', 'shun', 'shuo',
  'ran', 'rang', 'rao', 're', 'ren', 'reng', 'ri', 'rong', 'rou', 'ru', 'rua', 'ruan', 'rui', 'run', 'ruo',
  'za', 'zai', 'zan', 'zang', 'zao', 'ze', 'zei', 'zen', 'zeng', 'zi', 'zong', 'zou', 'zu', 'zuan', 'zui', 'zun', 'zuo',
  'ca', 'cai', 'can', 'cang', 'cao', 'ce', 'cei', 'cen', 'ceng', 'ci', 'cong', 'cou', 'cu', 'cuan', 'cui', 'cun', 'cuo',
  'sa', 'sai', 'san', 'sang', 'sao', 'se', 'sen', 'seng', 'si', 'song', 'sou', 'su', 'suan', 'sui', 'sun', 'suo',
  'ya', 'yan', 'yang', 'yao', 'ye', 'yi', 'yin', 'ying', 'yo', 'yong', 'you', 'yu', 'yuan', 'yue', 'yun',
  'wa', 'wai', 'wan', 'wang', 'wei', 'wen', 'weng', 'wo', 'wu',
]);

const PINYIN_TONE_VOWELS: Readonly<Record<string, readonly [string, string, string, string, string]>> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  A: ['A', 'Ā', 'Á', 'Ǎ', 'À'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  E: ['E', 'Ē', 'É', 'Ě', 'È'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  I: ['I', 'Ī', 'Í', 'Ǐ', 'Ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  O: ['O', 'Ō', 'Ó', 'Ǒ', 'Ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  U: ['U', 'Ū', 'Ú', 'Ǔ', 'Ù'],
  ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
  Ü: ['Ü', 'Ǖ', 'Ǘ', 'Ǚ', 'Ǜ'],
};

const PINYIN_TOKEN_RE = /(?:[A-Za-z\u00C0-\u024F\u1E00-\u1EFF0-9]|(?<=[uU]):)+/g;

function normalizePinyinForLookup(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/u:/g, 'ü')
    .replace(/v/g, 'ü')
    .normalize('NFD')
    .replace(/u\u0308[\u0300-\u036f]*/g, 'ü')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC');
}

function isValidPinyinSyllableUnit(raw: string, allowErhua: boolean): boolean {
  const norm = normalizePinyinForLookup(raw);
  if (VALID_PINYIN_SYLLABLES.has(norm)) return true;
  if (allowErhua && norm.length > 2 && norm.endsWith('r')) {
    const stem = norm.slice(0, -1);
    return stem !== 'e' && /[aeiouvün]$/.test(stem) && VALID_PINYIN_SYLLABLES.has(stem);
  }
  return false;
}

function segmentPinyinLetterRun(letters: string, allowTrailingErhua: boolean): string[] | null {
  const n = letters.length;
  if (n === 0) return null;
  const dp: Array<string[] | null> = new Array<string[] | null>(n + 1).fill(null);
  dp[0] = [];
  for (let i = 0; i < n; i += 1) {
    const prev = dp[i];
    if (!prev) continue;
    for (let len = 1; len <= 7 && i + len <= n; len += 1) {
      const slice = letters.slice(i, i + len);
      const atEnd = i + len === n;
      if (isValidPinyinSyllableUnit(slice, allowTrailingErhua && atEnd)) {
        const nextCandidate = [...prev, slice];
        const existing = dp[i + len];
        if (!existing || nextCandidate.length <= existing.length) {
          dp[i + len] = nextCandidate;
        }
      }
    }
  }
  return dp[n];
}

function stripToneFromPinyinChar(ch: string): string {
  if (ch === 'ü' || ch === 'Ü') return ch;
  const nfd = ch.normalize('NFD');
  if (nfd.startsWith('u\u0308') || nfd.startsWith('U\u0308')) {
    return ch === ch.toUpperCase() ? 'Ü' : 'ü';
  }
  const base = nfd.replace(/[\u0300-\u036f]/g, '').normalize('NFC');
  return base || ch;
}

function applyToneToSinglePinyinSyllable(rawSyllable: string, tone: number): string {
  const normalizedUmlaut = rawSyllable
    .replace(/u:/g, 'ü')
    .replace(/U:/g, 'Ü')
    .replace(/v/g, 'ü')
    .replace(/V/g, 'Ü')
    .normalize('NFC');

  const normLookup = normalizePinyinForLookup(normalizedUmlaut);
  const isErhuaSuffix =
    !VALID_PINYIN_SYLLABLES.has(normLookup) &&
    normLookup.length > 2 &&
    normLookup.endsWith('r');
  const stem = isErhuaSuffix ? normalizedUmlaut.slice(0, -1) : normalizedUmlaut;
  const erhuaTail = isErhuaSuffix ? normalizedUmlaut.slice(-1) : '';

  const chars = Array.from(stem);
  const baseLower = chars.map((ch) => stripToneFromPinyinChar(ch).toLowerCase());

  if (tone === 0 || tone === 5) {
    return `${chars.map(stripToneFromPinyinChar).join('')}${erhuaTail}`;
  }

  let targetIndex = baseLower.indexOf('a');
  if (targetIndex === -1) {
    targetIndex = baseLower.indexOf('e');
  }
  if (targetIndex === -1) {
    for (let i = 0; i < baseLower.length - 1; i += 1) {
      if (baseLower[i] === 'o' && baseLower[i + 1] === 'u') {
        targetIndex = i;
        break;
      }
    }
  }
  if (targetIndex === -1) {
    for (let i = baseLower.length - 1; i >= 0; i -= 1) {
      if (baseLower[i] === 'i' || baseLower[i] === 'o' || baseLower[i] === 'u' || baseLower[i] === 'ü') {
        targetIndex = i;
        break;
      }
    }
  }

  if (targetIndex === -1) {
    return `${stem}${erhuaTail}`;
  }

  const baseChar = stripToneFromPinyinChar(chars[targetIndex]);
  const toneRow = PINYIN_TONE_VOWELS[baseChar];
  if (!toneRow) {
    return `${stem}${erhuaTail}`;
  }
  chars[targetIndex] = toneRow[tone];
  return `${chars.join('')}${erhuaTail}`;
}

function parseNumericPinyinToken(token: string): { converted: string; hasNumeric: boolean } {
  if (!/[0-9]/.test(token)) {
    return { converted: token, hasNumeric: false };
  }
  // Reject tokens starting with digits, multi-digit numbers, or tones outside 0-5.
  if (/^[0-9]|[6-9]|\d{2,}/.test(token)) {
    return { converted: token, hasNumeric: false };
  }

  const segments: Array<{ letters: string; tone: number }> = [];
  const segRe = /([A-Za-z\u00C0-\u024F\u1E00-\u1EFF:]+)([0-5])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = segRe.exec(token)) !== null) {
    if (match.index !== lastIndex) {
      return { converted: token, hasNumeric: false };
    }
    segments.push({ letters: match[1], tone: Number(match[2]) });
    lastIndex = segRe.lastIndex;
  }

  if (segments.length === 0) {
    return { converted: token, hasNumeric: false };
  }

  const trailing = token.slice(lastIndex);
  if (/[0-9]/.test(trailing)) {
    return { converted: token, hasNumeric: false };
  }

  const parts: string[] = [];
  for (const seg of segments) {
    const syllables = segmentPinyinLetterRun(seg.letters, true);
    if (!syllables || syllables.length === 0) {
      return { converted: token, hasNumeric: false };
    }
    const lastIdx = syllables.length - 1;
    for (let i = 0; i < lastIdx; i += 1) {
      parts.push(syllables[i]);
    }
    parts.push(applyToneToSinglePinyinSyllable(syllables[lastIdx], seg.tone));
  }

  if (trailing.length > 0) {
    if (trailing === 'r' || trailing === 'R') {
      parts.push(trailing);
    } else {
      const trailingSyllables = segmentPinyinLetterRun(trailing, true);
      if (!trailingSyllables || trailingSyllables.length === 0) {
        return { converted: token, hasNumeric: false };
      }
      parts.push(trailing);
    }
  }

  return { converted: parts.join(''), hasNumeric: true };
}

/**
 * Returns true when the input contains at least one valid Mandarin Pinyin syllable
 * annotated with tone digits 0-5 (while rejecting pure numbers, dates, times, or v1-like tokens).
 */
export function hasNumericPinyinSyllable(input: string): boolean {
  if (!input || !/[0-5]/.test(input)) return false;
  const matches = input.match(PINYIN_TOKEN_RE);
  if (!matches) return false;
  return matches.some((token) => parseNumericPinyinToken(token).hasNumeric);
}

/**
 * Converts numeric Mandarin Pinyin syllables (e.g. "Ni3 hao3", "nv3", "lu:4", "xie4xie5")
 * into Unicode tone-marked Pinyin while leaving non-Pinyin text, numbers, and dates untouched.
 */
export function convertNumericPinyin(input: string): string {
  if (!input || !/[0-5]/.test(input)) return input;
  return input.replace(PINYIN_TOKEN_RE, (token) => parseNumericPinyinToken(token).converted);
}

const AFTER_HOURS_CLOSED_COMPOUNDS: Readonly<Record<string, string>> = {
  lowkey: 'low key',
  highkey: 'high key',
  deadass: 'dead ass',
  culdesac: 'cul de sac',
  culdesacs: 'cul de sacs',
  circleback: 'circle back',
  circlebacks: 'circle backs',
  dadjoke: 'dad joke',
  dadjokes: 'dad jokes',
  glowup: 'glow up',
  glowups: 'glow ups',
  shoutout: 'shout out',
  shoutouts: 'shout outs',
  clapback: 'clap back',
  clapbacks: 'clap backs',
  sideeye: 'side eye',
  vibecheck: 'vibe check',
  groupchat: 'group chat',
  groupchats: 'group chats',
  cookout: 'cook out',
  cookouts: 'cook outs',
  afterhours: 'after hours',
  checkin: 'check in',
  checkins: 'check ins',
  followup: 'follow up',
  followups: 'follow ups',
  catchup: 'catch up',
  touchbase: 'touch base',
  levelup: 'level up',
  turnup: 'turn up',
  hangout: 'hang out',
  hangouts: 'hang outs',
  chillout: 'chill out',
  hookup: 'hook up',
  hookups: 'hook ups',
  throwback: 'throw back',
  throwbacks: 'throw backs',
  backyard: 'back yard',
  backyards: 'back yards',
  potluck: 'pot luck',
  potlucks: 'pot lucks',
  gameplan: 'game plan',
  gameplans: 'game plans',
  realtalk: 'real talk',
  forreal: 'for real',
  nocap: 'no cap',
  whiteboy: 'white boy',
  homeowner: 'home owner',
  homeowners: 'home owners',
  blockparty: 'block party',
  grillmaster: 'grill master',
  bandaid: 'band aid',
  bandaids: 'band aids',
  mindset: 'mind set',
  mindsets: 'mind sets',
  standup: 'stand up',
  allgood: 'all good',
  rightnow: 'right now',
  mybad: 'my bad',
  goodvibes: 'good vibes',
  lawncare: 'lawn care',
  frontporch: 'front porch',
  weekendwarrior: 'weekend warrior',
  coldplunge: 'cold plunge',
  coldplunges: 'cold plunges',
  drivethru: 'drive thru',
  drivethrus: 'drive thrus',
  halfpipe: 'half pipe',
  halfpipes: 'half pipes',
  soundbath: 'sound bath',
  soundbaths: 'sound baths',
  bluecollar: 'blue collar',
  crossfunctional: 'cross functional',
  fourway: 'four way',
  woowoo: 'woo woo',
  yeeyee: 'yee yee',
  genz: 'gen z',
  brainrot: 'brain rot',
  pushback: 'push back',
  pushbacks: 'push backs',
  buyin: 'buy in',
  buyins: 'buy ins',
  '0darkthirty': 'zero dark thirty',
  zerodarkthirty: 'zero dark thirty',
};

const AFTER_HOURS_DROPPED_G_WORDS: Readonly<Record<string, string>> = {
  fixin: 'fixing',
  doin: 'doing',
  goin: 'going',
  workin: 'working',
  talkin: 'talking',
  trippin: 'tripping',
  chillin: 'chilling',
  movin: 'moving',
  cookin: 'cooking',
  livin: 'living',
  nothin: 'nothing',
  somethin: 'something',
  anythin: 'anything',
  everythin: 'everything',
  bussin: 'bussing',
  wildin: 'wilding',
  smokin: 'smoking',
  comin: 'coming',
  gettin: 'getting',
  makin: 'making',
  takin: 'taking',
  lookin: 'looking',
  runnin: 'running',
  rollin: 'rolling',
  vibin: 'vibing',
  grindin: 'grinding',
  hustlin: 'hustling',
  feelin: 'feeling',
  sayin: 'saying',
  tryin: 'trying',
  playin: 'playing',
  waitin: 'waiting',
  stayin: 'staying',
  walkin: 'walking',
  sittin: 'sitting',
  puttin: 'putting',
  drivin: 'driving',
  eatin: 'eating',
  hangin: 'hanging',
  havin: 'having',
  holdin: 'holding',
  keepin: 'keeping',
  messin: 'messing',
  missin: 'missing',
  ridin: 'riding',
  seein: 'seeing',
  sleepin: 'sleeping',
  standin: 'standing',
  tellin: 'telling',
  thinkin: 'thinking',
  turnin: 'turning',
  watchin: 'watching',
  winnin: 'winning',
  grillin: 'grilling',
  mowin: 'mowing',
  fishin: 'fishing',
  huntin: 'hunting',
  truckin: 'trucking',
  tailgatin: 'tailgating',
  scrollin: 'scrolling',
  ghostin: 'ghosting',
  clockin: 'clocking',
  slackin: 'slacking',
  manifestin: 'manifesting',
  flexin: 'flexing',
  frontin: 'fronting',
  ballin: 'balling',
  stressin: 'stressing',
  steppin: 'stepping',
  jokin: 'joking',
  smilin: 'smiling',
  slidin: 'sliding',
  speakin: 'speaking',
  laughin: 'laughing',
  leavin: 'leaving',
  breakin: 'breaking',
  bringin: 'bringing',
  callin: 'calling',
  findin: 'finding',
  kickin: 'kicking',
  packin: 'packing',
  passin: 'passing',
  payin: 'paying',
  pullin: 'pulling',
  pushin: 'pushing',
  sellin: 'selling',
  showin: 'showing',
  throwin: 'throwing',
  wearin: 'wearing',
  wishin: 'wishing',
  wonderin: 'wondering',
  yellin: 'yelling',
  askin: 'asking',
};

const AFTER_HOURS_CONTRACTIONS: Readonly<Record<string, string>> = {
  gon: 'gonna',
  lemme: 'let me',
  gimme: 'give me',
  wanna: 'want to',
  outta: 'out of',
  kinda: 'kind of',
  sorta: 'sort of',
  fuggedaboutit: 'forget about it',
  fuhgeddaboudit: 'forget about it',
  fuhgeddaboutit: 'forget about it',
  forgetaboutit: 'forget about it',
};

function expandAfterHoursCompounds(text: string): string {
  return text
    .split(' ')
    .filter(Boolean)
    .map(
      (word) =>
        AFTER_HOURS_CLOSED_COMPOUNDS[word] ??
        AFTER_HOURS_DROPPED_G_WORDS[word] ??
        AFTER_HOURS_CONTRACTIONS[word] ??
        word
    )
    .join(' ')
    .replace(/\b0\s+dark\s+thirty\b/g, 'zero dark thirty')
    .replace(/\bfugged\s+about\s+it\b/g, 'forget about it')
    .replace(/\bfuhgedda\s*boud\s*it\b/g, 'forget about it');
}

function normalizeAfterHoursBase(input: string): string {
  return stripSentencePunctuation(
    normalizeAnswer(input, { stripAccents: true }).replace(/`/g, "'")
  )
    .replace(/\b([a-z]{2,})in'(?=\s|$|-)/g, '$1ing')
    .replace(/['"]/g, '')
    .replace(AFTER_HOURS_CASUAL_PUNCT_REGEX, ' ')
    .replace(/(?<=^|\s)-+|-(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAfterHoursForms(input: string): { spaced: string; hyphenClosed: string } {
  const base = normalizeAfterHoursBase(input);
  if (!base) return { spaced: '', hyphenClosed: '' };
  const spaced = expandAfterHoursCompounds(base.replace(/-/g, ' ').replace(/\s+/g, ' ').trim());
  const hyphenClosed = expandAfterHoursCompounds(
    base.replace(/-/g, '').replace(/\s+/g, ' ').trim()
  );
  return { spaced, hyphenClosed };
}

function matchesAfterHoursForgiving(submittedRaw: string, candidateRaw: string): boolean {
  const sub = getAfterHoursForms(submittedRaw);
  const cand = getAfterHoursForms(candidateRaw);
  if (!sub.spaced || !cand.spaced) return false;
  return (
    sub.spaced === cand.spaced ||
    sub.hyphenClosed === cand.hyphenClosed ||
    sub.spaced === cand.hyphenClosed ||
    sub.hyphenClosed === cand.spaced
  );
}

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
      segment
        .normalize('NFD')
        .replace(/[\u0300-\u036f\u093C\u09BC]/g, '')
        .replace(/\u0901/g, '\u0902')
        .replace(/\u0981/g, '\u0982')
        .normalize('NFC')
    )
    .join('й')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/đ/g, 'd')
    .replace(/[\u02BE\u02BF]/g, '')
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

/**
 * Strips optional Mandarin Pinyin syllable-divider apostrophes strictly between
 * Pinyin letters (e.g. "Mǎtè'ào" -> "Mǎtèào", "Wǎn'ān" -> "Wǎnān").
 */
function stripPinyinSyllableApostrophes(text: string): string {
  return text.replace(
    /(?<=[a-z\u00C0-\u024F\u1E00-\u1EFF])'(?=[a-z\u00C0-\u024F\u1E00-\u1EFF])/g,
    ''
  );
}

function matchesExact(
  submittedRaw: string,
  candidateRaw: string,
  language?: LanguageCode
): boolean {
  const normSub = normalizeAnswer(submittedRaw);
  const normCand = normalizeAnswer(candidateRaw);
  if (!normSub || !normCand) return normSub === normCand && normCand.length > 0;
  if (normSub === normCand) return true;
  const cleanSub = stripSentencePunctuation(normSub);
  const cleanCand = stripSentencePunctuation(normCand);
  if (cleanSub === cleanCand) return true;
  if (language === 'zh') {
    return (
      stripPinyinSyllableApostrophes(cleanSub) === stripPinyinSyllableApostrophes(cleanCand)
    );
  }
  return false;
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

  // Forgivingly relax romanization syllable apostrophes (e.g. "Wǎn'ān" -> "wanan" or "wan an")
  // and clitic hyphens (e.g. "al-qalīl" -> "al qalil") for non-Latin courses.
  if (language === 'ar' || language === 'arz' || language === 'zh' || language === 'ja') {
    const relaxSpaces = (s: string) =>
      s.replace(/['-]/g, ' ').replace(/\s+/g, ' ').trim();
    const relaxCollapsed = (s: string) =>
      s.replace(/'/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    if (
      relaxSpaces(subStripped) === relaxSpaces(candStripped) ||
      relaxCollapsed(subStripped) === relaxCollapsed(candStripped) ||
      relaxSpaces(subStripped) === relaxCollapsed(candStripped) ||
      relaxCollapsed(subStripped) === relaxSpaces(candStripped)
    ) {
      return true;
    }
  }

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

  if (isAdultLanguage(language)) {
    return matchesAfterHoursForgiving(submittedRaw, candidateRaw);
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
    return 'Great answer! Watch the spacing and punctuation to make it letter-perfect.';
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

  if (takeMatchingChars(chars, handled, (c) => c === "'").length > 0) {
    tips.push(
      language === 'zh' || language === 'ja'
        ? "Watch for the syllable apostrophe (') — it keeps adjacent syllables distinct."
        : "Watch for the apostrophe (') in standard romanized spelling."
    );
  }
  if (takeMatchingChars(chars, handled, (c) => c === '-').length > 0) {
    tips.push("Watch for the hyphen (-) — it links prefixes or compound syllables cleanly.");
  }

  const remaining = chars.filter((c) => !handled.has(c));
  if (remaining.length > 0) {
    if (remaining.some((c) => /[\u02BE\u02BF]/.test(c))) {
      tips.push(
        'Watch the glottal/ʿayn transliteration marks (ʾ / ʿ) in precise Arabic romanization.'
      );
    } else if (
      remaining.some((c) =>
        /[\u0901\u093C\u0958-\u095F\u0981\u09BC\u09DC\u09DD\u09DF]/.test(c)
      )
    ) {
      tips.push(
        `Notice the nasal chandrabindu or nukta dot (${remaining.join(', ')}) — it refines the consonant or vowel resonance.`
      );
    } else {
      tips.push(`Notice the accent on ${remaining.join(', ')} — it guides the stress and tone.`);
    }
  }

  return `Great job! ${tips.join(' ')}`;
}

function buildAfterHoursCoaching(
  expectedCandidate: string,
  submittedRaw: string,
  language: LanguageCode
): AccentCoaching {
  const normCand = normalizeAnswer(expectedCandidate).replace(/`/g, "'");
  const normSub = normalizeAnswer(submittedRaw).replace(/`/g, "'");
  const candApostrophes = normCand.replace(/[^']/g, '');
  const subApostrophes = normSub.replace(/[^']/g, '');
  const hasApostropheDiff = candApostrophes !== subApostrophes;

  const cleanWithoutApostrophes = (s: string) =>
    stripSentencePunctuation(normalizeAnswer(s, { stripAccents: true }).replace(/`/g, "'"))
      .replace(/['"]/g, '')
      .replace(AFTER_HOURS_CASUAL_PUNCT_REGEX, ' ')
      .replace(/(?<=^|\s)-+|-(?=\s|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const hasCompoundOrHyphenDiff =
    cleanWithoutApostrophes(expectedCandidate) !== cleanWithoutApostrophes(submittedRaw);

  const highlightedChars: string[] = [];
  if (hasApostropheDiff) highlightedChars.push("'");
  if (hasCompoundOrHyphenDiff) highlightedChars.push('-');

  if (highlightedChars.length === 0) {
    const casualMatches = new Set([
      ...(submittedRaw.match(AFTER_HOURS_CASUAL_PUNCT_REGEX) ?? []),
      ...(expectedCandidate.match(AFTER_HOURS_CASUAL_PUNCT_REGEX) ?? []),
    ]);
    if (casualMatches.size > 0) {
      highlightedChars.push(...casualMatches);
    } else {
      highlightedChars.push('punctuation');
    }
  }

  const meta = LANGUAGE_META[language];
  const trackLabel = meta.dialectA ? `${meta.name} (${meta.dialectA})` : meta.name;

  let friendlyTip: string;
  if (hasApostropheDiff && hasCompoundOrHyphenDiff) {
    friendlyTip =
      language === 'ebonics'
        ? `Right on! You nailed the meaning — standard spelling writes "${expectedCandidate}" with its apostrophe and compound spacing.`
        : language === 'suburban'
          ? `Spot on! You got the vibe — standard suburban phrasing spells it "${expectedCandidate}" with its apostrophe and compound spacing.`
          : `Spot on! In ${trackLabel}, casual spelling and apostrophes flex naturally — the polished phrasing writes "${expectedCandidate}".`;
  } else if (hasApostropheDiff) {
    friendlyTip =
      language === 'ebonics'
        ? `Smooth! Dropping or shifting apostrophes works in everyday chat, while the classic spelling is "${expectedCandidate}".`
        : language === 'suburban'
          ? `Nice! Casual messages often drop apostrophes, while the polished spelling is "${expectedCandidate}".`
          : `Smooth! In ${trackLabel}, everyday chat often drops or shifts apostrophes, while the classic spelling is "${expectedCandidate}".`;
  } else if (hasCompoundOrHyphenDiff) {
    friendlyTip =
      language === 'ebonics'
        ? `Clean! Hyphenated, spaced, or closed all read naturally — the textbook phrasing writes "${expectedCandidate}".`
        : language === 'suburban'
          ? `Love it! Compound phrases like "${expectedCandidate}" appear hyphenated, spaced, or closed in everyday notes.`
          : `Clean! In ${trackLabel}, hyphenated, spaced, closed, or casual variants all read naturally — the textbook phrasing writes "${expectedCandidate}".`;
  } else {
    friendlyTip =
      language === 'ebonics' || language === 'suburban'
        ? `Spot on! Casual punctuation varies in everyday messages — the polished form is "${expectedCandidate}".`
        : `Spot on! In ${trackLabel}, casual punctuation varies in everyday messages — the polished form is "${expectedCandidate}".`;
  }

  return {
    expected: expectedCandidate,
    submitted: submittedRaw.trim() || submittedRaw,
    highlightedChars,
    friendlyTip,
  };
}

function buildAccentCoaching(
  expectedCandidate: string,
  submittedRaw: string,
  language: LanguageCode
): AccentCoaching | undefined {
  if (isAdultLanguage(language)) {
    return buildAfterHoursCoaching(expectedCandidate, submittedRaw, language);
  }

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

  if (
    highlightedChars.length === 0 &&
    (language === 'ar' || language === 'arz' || language === 'zh' || language === 'ja')
  ) {
    const candApostropheCount = (normCand.match(/'/g) ?? []).length;
    const subApostropheCount = (normSub.match(/'/g) ?? []).length;
    if (candApostropheCount > subApostropheCount) {
      highlightedChars.push("'");
    }
    const candHyphenCount = (normCand.match(/-/g) ?? []).length;
    const subHyphenCount = (normSub.match(/-/g) ?? []).length;
    if (candHyphenCount > subHyphenCount) {
      highlightedChars.push('-');
    }
  }

  if (highlightedChars.length === 0) {
    return undefined;
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
  ebonics: {
    the: {
      gender: 'invariant',
      note: '"the" (often pronounced "da" in casual speech) is the definite article.',
    },
    a: {
      gender: 'invariant',
      note: '"a" introduces a singular noun (and often stays "a" before vowels in fast AAVE flow).',
    },
    an: {
      gender: 'invariant',
      note: '"an" introduces a singular noun before a vowel sound.',
    },
    some: {
      gender: 'plural',
      note: '"some" introduces plural or uncountable nouns.',
    },
    da: {
      gender: 'invariant',
      note: '"da" is an informal phonetic spelling of "the" in casual AAVE.',
    },
    dis: {
      gender: 'invariant',
      note: '"dis" is a casual spoken spelling of "this".',
    },
    dat: {
      gender: 'invariant',
      note: '"dat" is a casual spoken spelling of "that".',
    },
    dem: {
      gender: 'plural',
      note: '"dem" acts as a plural demonstrative ("those / them") before nouns in AAVE.',
    },
    them: {
      gender: 'plural',
      note: '"them" works as a plural demonstrative determiner ("those") before nouns (e.g., "them kicks").',
    },
    "y'all": {
      gender: 'plural',
      note: '"y\'all" is the warm second-person plural pronoun ("all of you").',
    },
    finna: {
      gender: 'invariant',
      note: '"finna" (from "fixing to") is an AAVE immediate-future aspect marker meaning "about to".',
    },
    steady: {
      gender: 'invariant',
      note: '"steady" is an AAVE aspect marker showing ongoing, intense, or persistent action.',
    },
    be: {
      gender: 'invariant',
      note: 'Habitual "be" in AAVE expresses a recurring or customary state ("they be working").',
    },
  },
  suburban: {
    the: {
      gender: 'invariant',
      note: '"the" is the standard definite article in Suburban English.',
    },
    a: {
      gender: 'invariant',
      note: '"a" introduces a singular noun before a consonant sound.',
    },
    an: {
      gender: 'invariant',
      note: '"an" introduces a singular noun before a vowel sound.',
    },
    some: {
      gender: 'plural',
      note: '"some" introduces plural or uncountable nouns.',
    },
    this: {
      gender: 'invariant',
      note: '"this" spotlights a nearby singular item or patio topic ("this bad boy").',
    },
    that: {
      gender: 'invariant',
      note: '"that" singles out a specific noun or situation.',
    },
    these: {
      gender: 'plural',
      note: '"these" is the plural demonstrative for nearby items.',
    },
    those: {
      gender: 'plural',
      note: '"those" is the plural demonstrative for specific items.',
    },
    our: {
      gender: 'plural',
      note: '"our" is the inclusive first-person plural possessive ("our cul-de-sac / our HOA").',
    },
    per: {
      gender: 'invariant',
      note: '"per" is a classic corporate-suburban connector ("per my last email").',
    },
    zero: {
      gender: 'invariant',
      note: '"zero" serves as an emphatic determiner ("zero bandwidth").',
    },
  },
  corp_trades: {
    the: {
      gender: 'invariant',
      note: '"the" anchors both corporate slide decks ("the deliverable") and jobsite reality ("the breaker").',
    },
    a: {
      gender: 'invariant',
      note: '"a" introduces a singular noun — e.g., "a quick sync" vs. "a cold Monster."',
    },
    an: {
      gender: 'invariant',
      note: '"an" smooths into a vowel sound ("an EOD action item" or "an impact driver").',
    },
    some: {
      gender: 'plural',
      note: '"some" introduces plural or uncountable nouns ("some bandwidth" or "some wire nuts").',
    },
    per: {
      gender: 'invariant',
      note: '"per" is the passive-aggressive LinkedIn connector ("per my last email") — tradespeople translate it as "read the blueprint again."',
    },
    re: {
      gender: 'invariant',
      note: '"re" opens corporate email threads ("re: Q4 synergy") where the jobsite just yells across the trench.',
    },
    fyi: {
      gender: 'invariant',
      note: '"FYI" softens a corporate directive; on a jobsite, it means "heads up, steel coming through."',
    },
    eod: {
      gender: 'invariant',
      note: '"EOD" (end of day) in LinkedIn-speak means 4:59 PM urgent; on the jobsite, quitting time is 3:30 sharp.',
    },
    boss: {
      gender: 'invariant',
      note: '"boss" is the universal tradesman address — equal parts respect and polite warning before a Friday 4:45 PM sync.',
    },
    them: {
      gender: 'plural',
      note: '"them" works as a brisk jobsite plural determiner ("grab them toggle bolts").',
    },
    this: {
      gender: 'invariant',
      note: '"this" spotlights a slide-deck KPI or a stubborn conduit bend.',
    },
    that: {
      gender: 'invariant',
      note: '"that" singles out a specific deliverable or tagged-out panel.',
    },
    our: {
      gender: 'plural',
      note: '"our" signals cross-functional alignment in Slack or union crew solidarity on site.',
    },
  },
  midwest_northeast: {
    the: {
      gender: 'invariant',
      note: '"the" points straight to the four-way stop or the bodega counter.',
    },
    a: {
      gender: 'invariant',
      note: '"a" introduces a singular noun ("a hotdish" or "a bacon-egg-and-cheese").',
    },
    an: {
      gender: 'invariant',
      note: '"an" glides before vowel sounds ("an interesting parking job" — Midwest for a felony).',
    },
    some: {
      gender: 'plural',
      note: '"some" introduces plural or uncountable items ("some ranch" or "some attitude").',
    },
    ope: {
      gender: 'invariant',
      note: '"ope" is the mandatory Midwest collision-avoidance particle — Northeast translates it as zero syllables and a shoulder check.',
    },
    welp: {
      gender: 'invariant',
      note: '"welp" pairs with a knee-slap to launch Phase 1 of a 45-minute Midwest goodbye.',
    },
    ya: {
      gender: 'invariant',
      note: '"ya" softens direct address in the Midwest ("sneak right past ya"), whereas Northeast prefers "yous" or "pal."',
    },
    yous: {
      gender: 'plural',
      note: '"yous" is the classic Philly/Northeast plural "you" ("did yous eat yet?").',
    },
    pal: {
      gender: 'invariant',
      note: '"pal" on an East Coast turnpike is rarely friendly — it translates to Midwest "interesting choice there, friend."',
    },
    yo: {
      gender: 'invariant',
      note: '"yo" is the crisp Northeast attention particle — worth three polite Midwest "opes."',
    },
    just: {
      gender: 'invariant',
      note: '"just" is a Midwest politeness cushion ("let me just scooch right by") that softens every request.',
    },
    this: {
      gender: 'invariant',
      note: '"this" points at a lukewarm diner soup or a double-parked sedan.',
    },
    that: {
      gender: 'invariant',
      note: '"that" singles out the casserole dish or the turnpike lane-hog.',
    },
  },
  south_genz: {
    the: {
      gender: 'invariant',
      note: '"the" introduces the porch pitcher or the For-You Page algorithm.',
    },
    a: {
      gender: 'invariant',
      note: '"a" introduces a singular noun ("a sweet tea" or "a lowkey L").',
    },
    an: {
      gender: 'invariant',
      note: '"an" precedes vowel sounds ("an NPC" or "an honest-to-goodness blessing").',
    },
    some: {
      gender: 'plural',
      note: '"some" introduces plural or uncountable nouns ("some biscuits" or "some aura").',
    },
    "y'all": {
      gender: 'plural',
      note: '"y\'all" is the warm Southern second-person plural — Gen-Z translates it as "chat" or "gang."',
    },
    chat: {
      gender: 'plural',
      note: '"chat" is chronically-online Gen-Z plural address — treating bystanders like a livestream audience.',
    },
    bro: {
      gender: 'invariant',
      note: '"bro" is Gen-Z\'s universal pronoun and reaction particle ("bro is cooked").',
    },
    bless: {
      gender: 'invariant',
      note: '"bless" opens classic Southern polite-shade ("well bless his heart") — the porch twin of "bro is delulu."',
    },
    sugar: {
      gender: 'invariant',
      note: '"sugar" is Southern endearment that can either warm your soul or deliver velvet-gloved devastation.',
    },
    lowkey: {
      gender: 'invariant',
      note: '"lowkey" (or "low-key") hedges an opinion quietly — Southern translates it as "between you and the fencepost."',
    },
    no: {
      gender: 'invariant',
      note: '"no" anchors Gen-Z "no cap" (pure truth), matching Southern "Lord knows I\'m tellin\' no tale."',
    },
    this: {
      gender: 'invariant',
      note: '"this" spotlights the Sunday gossip or today\'s chaotic TikTok storytime.',
    },
    that: {
      gender: 'invariant',
      note: '"that" points out questionable porch manners or unhinged NPC behavior.',
    },
  },
  cali_country: {
    the: {
      gender: 'invariant',
      note: '"the" frames both the Erewhon tonic aisle and the holler creek.',
    },
    a: {
      gender: 'invariant',
      note: '"a" introduces a singular noun ("a cold-plunge" or "a tailgate cooler").',
    },
    an: {
      gender: 'invariant',
      note: '"an" glides before vowels ("an adaptogen" or "an old pickup").',
    },
    some: {
      gender: 'plural',
      note: '"some" introduces plural or uncountable items ("some sea moss" or "some firewood").',
    },
    "y'all": {
      gender: 'plural',
      note: '"y\'all" is warm Appalachian plural — Cali Wellness translates it as "the collective."',
    },
    our: {
      gender: 'plural',
      note: '"our" signals shared space — "our nervous-system alignment" vs. "our holler supper table."',
    },
    raw: {
      gender: 'invariant',
      note: '"raw" in Cali means unpasteurized cacao; in the holler, it means icy creek water or plain truth.',
    },
    yonder: {
      gender: 'invariant',
      note: '"yonder" is Appalachian spatial direction ("over yonder") — Cali calls it "holding space across the canyon."',
    },
    reckon: {
      gender: 'invariant',
      note: '"reckon" is the Appalachian connector for grounded intuition — the rugged cousin of "my aura is sensing."',
    },
    like: {
      gender: 'invariant',
      note: '"like" is the Cali conversational cushion padding every breathwork debrief.',
    },
    them: {
      gender: 'plural',
      note: '"them" acts as a brisk country plural determiner ("them mud boots").',
    },
    this: {
      gender: 'invariant',
      note: '"this" spotlights a sound-bath bowl or a fresh cast-iron skillet.',
    },
    that: {
      gender: 'invariant',
      note: '"that" points across the yoga deck or out past the barn.',
    },
  },
  stoner_tactical: {
    the: {
      gender: 'invariant',
      note: '"the" specifies either the skatepark half-pipe or the freshly edged perimeter.',
    },
    a: {
      gender: 'invariant',
      note: '"a" introduces a singular noun ("a kickflip" or "a tactical flashlight").',
    },
    an: {
      gender: 'invariant',
      note: '"an" smooths before vowel sounds ("an oat-milk edible" or "an early-morning perimeter sweep").',
    },
    some: {
      gender: 'plural',
      note: '"some" introduces plural or uncountable nouns ("some munchies" or "some crabgrass").',
    },
    dude: {
      gender: 'invariant',
      note: '"dude" is universal Skater Chill address — Tactical Dad translates it as "operator" or "son."',
    },
    copy: {
      gender: 'invariant',
      note: '"copy" (from "copy that") is Tactical Dad radio confirmation — Skater Chill just says "for sure, bro."',
    },
    zero: {
      gender: 'invariant',
      note: '"zero" marks Tactical Dad precision ("0-dark-thirty" / "zero perimeter breach") vs. Skater "zero stress."',
    },
    perimeter: {
      gender: 'invariant',
      note: '"perimeter" is Tactical Dad for the front yard — Skater Chill calls it "the curb spot."',
    },
    bro: {
      gender: 'invariant',
      note: '"bro" bridges relaxed couch-vibe camaraderie with garage-workbench logistics.',
    },
    tactical: {
      gender: 'invariant',
      note: '"tactical" upgrades any suburban chore (cargo shorts, mowing, grill tongs) into a classified lawn operation.',
    },
    gnarly: {
      gender: 'invariant',
      note: '"gnarly" in Skater Chill means impressively wild; Tactical Dad calls it a "high-threat terrain anomaly."',
    },
    this: {
      gender: 'invariant',
      note: '"this" points to a clean ledge trick or a calibrated weed-whacker.',
    },
    that: {
      gender: 'invariant',
      note: '"that" singles out a sketchy handrail or a rogue dandelion sector.',
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
    if (matchesExact(req.submitted, candidate, req.language)) {
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

  if (req.language === 'zh' && hasNumericPinyinSyllable(req.submitted)) {
    const converted = convertNumericPinyin(req.submitted);
    for (const candidate of candidates) {
      if (matchesExact(converted, candidate, req.language)) {
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
    const prioritizedCandidates = [
      ...candidates.filter((c) => SPECIAL_ACCENT_CHAR_REGEX.test(c)),
      ...candidates.filter((c) => !SPECIAL_ACCENT_CHAR_REGEX.test(c)),
    ];
    for (const candidate of prioritizedCandidates) {
      if (matchesAccentForgiving(converted, candidate, req.language)) {
        const accentCoaching = buildAccentCoaching(candidate, converted, 'zh');
        return {
          isCorrect: true,
          exactMatch: !accentCoaching,
          normalizedSubmitted,
          normalizedExpected,
          heartPenalty: 0,
          ...(accentCoaching ? { accentCoaching } : {}),
          ...(articleCoaching ? { articleCoaching } : {}),
        };
      }
    }
  }

  for (const candidate of candidates) {
    if (matchesAccentForgiving(req.submitted, candidate, req.language)) {
      const accentCoaching = buildAccentCoaching(candidate, req.submitted, req.language);
      return {
        isCorrect: true,
        exactMatch: !accentCoaching,
        normalizedSubmitted,
        normalizedExpected,
        heartPenalty: 0,
        ...(accentCoaching ? { accentCoaching } : {}),
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
