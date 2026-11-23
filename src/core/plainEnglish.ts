import { isAdultLanguage, type AdultLanguageCode, type LanguageCode } from '../types/contracts';

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

const DEFAULT_LABEL = 'Normal English';

const DIALECT_PREFIX_RE =
  /^(?:suburban|aave|ebonics|corporate(?:\s+linkedin)?|linkedin|blue-?collar(?:\s+trades)?|trades|jobsite|midwest(?:\s+nice)?|northeast(?:\s+direct)?|southern(?:\s+polite-?shade)?|deep\s+south|gen-?z(?:\s+brainrot)?|cali(?:\s+woo-?woo)?(?:\s+wellness)?|wellness|appalachian(?:\s+country)?|country|stoner(?:\s*\/\s*skater)?(?:\s+chill)?|skater(?:\s+chill)?|tactical(?:\s+lawn-?ops)?(?:\s+dad)?|normal\s+english|plain\s+english)\s*:\s*/i;

const INSTRUCTION_PREFIX_RE =
  /^(?:translate\s+to\s+[^:]+|assemble(?:\s+in\s+[^:]+)?|pick\s+the\s+(?:iconic|exact|best)\s+[^:]+|choose)\s*:\s*/i;

const GRAMMAR_JARGON_RE =
  /\b(?:copula|aspect\s+marker|pronoun|classifier|particle|conjugat\w*|syntax|determiner|noun-?class|imperative|plural\s+form|singular\s+noun|vowel\s+sound)\b/i;

const FUNCTION_STOPWORDS = new Set<string>([
  'the', 'a', 'an', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'as', 'into', 'onto',
  'and', 'or', 'but', 'so', 'if', 'it', 'its', "it's", 'this', 'that', 'these', 'those',
  'i', "i'm", 'im', 'you', "you're", 'youre', 'we', "we're", 'they', "they're",
  'he', 'she', 'me', 'my', 'our', 'your', 'his', 'her', 'their', 'us', 'them',
  'not', 'no', 'do', 'does', 'did', "don't", 'dont', 'can', 'could', 'will', 'would',
  'should', 'must', 'may', 'might', 'just', 'up', 'down', 'out', 'off', 'over', 'all',
  'very', 'really', 'quite', 'rather', 'actually', 'simply', 'completely',
  'here', 'there', 'what', 'who', 'when', 'where', 'why', 'how', 'which',
  'let', "let's", 'lets', 'get', 'got', 'go', 'going', 'have', 'has', 'had', 'make', 'say',
  'one', 'two', 'now', 'then', 'too', 'also', 'even', 'only', 'still', 'about', 'than', 'well',
  'before', 'after', 'since', 'until', 'during', 'without', 'through', 'across', 'around',
  'between', 'against', 'under', 'above', 'behind', 'near', 'because', 'while', 'although',
  'though', 'unless', 'despite', 'among', 'within', 'outside', 'inside', 'toward', 'towards',
  'away', 'back', 'some', 'any', 'every', 'each', 'many', 'much', 'more', 'most', 'other',
  'another', 'such', 'both', 'few', 'own', 'same',
]);

const EXACT_PHRASE_DECODER: Readonly<Record<string, string>> = {
  // Ebonics / AAVE & Suburban shared Vol. 1 staples
  "what's good": 'How are you doing today?',
  'whats good': 'How are you doing today?',
  'yo my guy': 'Hello, my friend.',
  "i'm straight": 'I am doing fine and do not need anything else, thank you.',
  'im straight': 'I am doing fine and do not need anything else, thank you.',
  bet: 'Understood. I agree to that plan.',
  'for real': 'Seriously, without any exaggeration.',
  'no cap': 'I am speaking honestly without exaggerating.',
  'no-cap': 'I am speaking honestly without exaggerating.',
  nocap: 'I am speaking honestly without exaggerating.',
  'say less': 'I understand completely; no further explanation is needed.',
  'my bad': 'That was my mistake, and I apologize.',
  'you good': 'Are you alright, or is everything okay?',
  'catch you later': 'Goodbye until we speak again.',
  'catch ya later': 'Goodbye until we speak again.',
  'the plate': 'A generous serving of freshly cooked food.',
  "bussin'": 'This food tastes exceptionally delicious.',
  bussin: 'This food tastes exceptionally delicious.',
  "chillin'": 'Relaxing comfortably with nothing urgent to do.',
  chillin: 'Relaxing comfortably with nothing urgent to do.',
  "wildin'": 'Behaving in an unusually chaotic or reckless manner.',
  wildin: 'Behaving in an unusually chaotic or reckless manner.',
  deadass: 'I am being one hundred percent serious.',
  'dead-ass': 'I am being one hundred percent serious.',
  finna: 'About to begin doing something immediately.',
  steady: 'Doing something persistently and without interruption.',
  lowkey: 'Quietly, modestly, or without drawing attention.',
  'low-key': 'Quietly, modestly, or without drawing attention.',
  'low key': 'Quietly, modestly, or without drawing attention.',
  highkey: 'Openly, noticeably, and without hiding it.',
  'high-key': 'Openly, noticeably, and without hiding it.',
  'high key': 'Openly, noticeably, and without hiding it.',
  'vibe check': 'Assessing the emotional atmosphere of the room.',
  slaps: 'Performs or sounds exceptionally well.',
  'big brain': 'An unusually clever or well-reasoned solution.',
  'pull up': 'Arrive at the agreed meeting location.',
  'at the crib': 'At someone’s home or residence.',
  brick: 'Uncomfortably cold outdoor air temperature.',
  'howdy neighbor': 'Good morning to the person living next door.',
  'living the dream': 'Busy and tired, yet maintaining polite cheerfulness.',
  "can't complain": 'Things are satisfactory enough that I will not grumble.',
  'fair enough': 'That point is reasonable, and I accept it.',
  'right on': 'I agree enthusiastically.',
  'my bad sport': 'I apologize for that minor mistake, friend.',
  'have a good one': 'I hope the rest of your day goes pleasantly.',
  'sounds like a plan': 'Your proposed schedule works well for me.',
  'you betcha': 'You are very welcome, or certainly yes.',
  'circle back': 'Follow up on this topic at a later time.',
  'per my last email': 'Please read the earlier message in which I already answered this.',
  'zero bandwidth': 'I have no remaining time or mental energy for additional tasks today.',
  'this bad boy': 'This object or appliance, regarded with noticeable pride.',
  'dad joke': 'An intentionally obvious pun told with quiet self-satisfaction.',
  'cul-de-sac': 'A quiet residential dead-end street with a circular turnaround.',
  'cul de sac': 'A quiet residential dead-end street with a circular turnaround.',

  // Corp <-> Trades
  eod: 'Before the end of the standard workday.',
  'suboptimal deliverable': 'An unsatisfactory work assignment.',
  'quick sync': 'A brief, unscheduled meeting.',
  'pizza-party retention initiative':
    'Offering free pizza instead of raising wages or reducing workload.',
  'stay outta the trench': 'Stay out of the active excavation area for safety.',
  'stay out of the trench': 'Stay out of the active excavation area for safety.',
  'grab a monster': 'Drink a caffeinated beverage to get through the shift.',
  synergy: 'Multiple people cooperating efficiently on the same task.',
  'push-back': 'Objections or resistance to a proposed plan.',
  pushback: 'Objections or resistance to a proposed plan.',
  'buy-in': 'Genuine agreement and support from everyone involved.',
  buyin: 'Genuine agreement and support from everyone involved.',
  'cross-functional': 'Involving cooperation across multiple separate departments.',
  'blue-collar': 'Skilled physical trade or construction labor.',
  'above my pay grade': 'A decision that belongs to a more senior manager.',

  // Midwest <-> Northeast
  ope: 'Excuse me; I nearly bumped into you.',
  welp: 'It is time to end this visit and begin preparing to leave.',
  'four-way': 'A four-way traffic intersection where drivers must take turns.',
  'four way': 'A four-way traffic intersection where drivers must take turns.',
  fuggedaboutit: 'Do not worry about it at all, or that is out of the question.',
  fuhgeddaboudit: 'Do not worry about it at all, or that is out of the question.',
  'forget about it': 'Do not worry about it at all, or that is out of the question.',
  'move it or lose it pal': 'Please move forward immediately because you are blocking traffic.',
  'interesting parking job': 'Your vehicle is parked very poorly and is obstructing others.',

  // South <-> Gen-Z
  'bless his heart':
    'He made a regrettable choice, so I am offering polite pity instead of a direct insult.',
  'bless her heart':
    'She made a regrettable choice, so I am offering polite pity instead of a direct insult.',
  'bless your heart': 'I am expressing polite sympathy mixed with gentle disapproval.',
  'bless his sweet little heart':
    'He is clearly out of his depth, though I am phrasing it politely.',
  'bro is fully cooked':
    'That person is in serious, unavoidable trouble due to their own actions.',
  'bro is cooked': 'That person is in serious trouble due to their own actions.',
  'negative aura': 'A noticeable loss of social composure or credibility.',
  delulu: 'Unrealistic and out of touch with reality.',
  'npc behavior': 'Predictable, robotic, or socially oblivious behavior.',
  'brain-rot': 'Mental fatigue from watching too many repetitive internet videos.',
  'brain rot': 'Mental fatigue from watching too many repetitive internet videos.',
  brainrot: 'Mental fatigue from watching too many repetitive internet videos.',
  'gen-z': 'The generation of young adults raised with smartphones and short-form video.',
  'gen z': 'The generation of young adults raised with smartphones and short-form video.',
  genz: 'The generation of young adults raised with smartphones and short-form video.',

  // Cali Wellness <-> Appalachian Country
  'cold-plunge': 'Brief immersion in very cold water to reduce stress or soreness.',
  'cold plunge': 'Brief immersion in very cold water to reduce stress or soreness.',
  coldplunge: 'Brief immersion in very cold water to reduce stress or soreness.',
  'sound-bath': 'Lying quietly while resonant metal bowls are played for relaxation.',
  'sound bath': 'Lying quietly while resonant metal bowls are played for relaxation.',
  soundbath: 'Lying quietly while resonant metal bowls are played for relaxation.',
  'woo-woo': 'Unconventional spiritual or pseudoscientific wellness language.',
  'woo woo': 'Unconventional spiritual or pseudoscientific wellness language.',
  woowoo: 'Unconventional spiritual or pseudoscientific wellness language.',
  'yee-yee': 'An enthusiastic rural exclamation of excitement.',
  'yee yee': 'An enthusiastic rural exclamation of excitement.',
  yeeyee: 'An enthusiastic rural exclamation of excitement.',
  'worn slap out': 'Completely physically exhausted.',
  'over yonder': 'Over there, a short distance away.',
  'i reckon': 'I suppose or conclude.',

  // Stoner/Skater Chill <-> Tactical Dad
  '0-dark-thirty': 'Very late at night or extremely early before sunrise.',
  'zero-dark-thirty': 'Very late at night or extremely early before sunrise.',
  'drive-thru': 'A restaurant lane where you order food without leaving your car.',
  'drive thru': 'A restaurant lane where you order food without leaving your car.',
  drivethru: 'A restaurant lane where you order food without leaving your car.',
  'half-pipe': 'A U-shaped ramp designed for skateboarding.',
  'half pipe': 'A U-shaped ramp designed for skateboarding.',
  halfpipe: 'A U-shaped ramp designed for skateboarding.',
  'copy that': 'I heard and understood your message.',
  'stand down': 'Relax and stop treating a minor issue as an emergency.',
  munchies: 'A strong late-night craving for snack foods.',
  gnarly: 'Impressively intense or noticeably unpleasant, depending on context.',
  stoked: 'Very happy and enthusiastic.',
};

interface RewriteRule {
  pattern: RegExp;
  replacement: string;
}

const PHRASE_REWRITE_RULES: readonly RewriteRule[] = [
  // Multi-word idioms & signature clauses (longest first)
  {
    pattern: /\bwell,?\s+bless\s+(?:his|her|their)\s+sweet\s+little\s+heart\b/gi,
    replacement: 'To speak politely despite obvious disappointment, that person',
  },
  {
    pattern: /\bbless\s+(?:his|her|their|your)\s+(?:sweet\s+little\s+)?heart\b/gi,
    replacement: 'with polite sympathy for a questionable decision',
  },
  {
    pattern: /\b(?:let['’]?s|let\s+us)\s+circle\s+back\s+and\s+unpack\s+bandwidth\b/gi,
    replacement: 'Let us revisit this later when we check our available schedule time',
  },
  {
    pattern: /\bunpack\s+bandwidth\b/gi,
    replacement: 'review available schedule time and workload',
  },
  {
    pattern: /\bcircle\s+back\b/gi,
    replacement: 'follow up later',
  },
  {
    pattern: /\btouch\s+base\b/gi,
    replacement: 'check in briefly',
  },
  {
    pattern: /\btake\s+(?:this|it)\s+offline\b/gi,
    replacement: 'discuss this privately later',
  },
  {
    pattern: /\bper\s+my\s+last\s+email\b/gi,
    replacement: 'as already explained in my earlier message',
  },
  {
    pattern: /\bbefore\s+eod\b/gi,
    replacement: 'before the end of the workday',
  },
  {
    pattern: /\bby\s+eod\b/gi,
    replacement: 'by the end of the workday',
  },
  {
    pattern: /\b(?:at|around)\s+(?:0|zero)[\s-]+dark[\s-]+thirty\b/gi,
    replacement: 'very late at night or early before sunrise',
  },
  {
    pattern: /\b(?:0|zero)[\s-]+dark[\s-]+thirty\b/gi,
    replacement: 'very late at night',
  },
  {
    pattern: /\bstraight\s+delulu\s+npc\s+behavior\b/gi,
    replacement: 'completely unrealistic and socially oblivious behavior',
  },
  {
    pattern: /\bdelulu\s+npc\s+behavior\b/gi,
    replacement: 'unrealistic and robotic behavior',
  },
  {
    pattern: /\bnpc\s+behavior\b/gi,
    replacement: 'predictable and oblivious behavior',
  },
  {
    pattern: /\bfully\s+cooked\b/gi,
    replacement: 'in serious, irreversible trouble',
  },
  {
    pattern: /\bnegative\s+aura\b/gi,
    replacement: 'noticeable social embarrassment',
  },
  {
    pattern: /\bwhat\s+the\s+good\s+lord\s+saw\s+fit\s+to\s+give\s+(?:him|her|them)\b/gi,
    replacement: 'limited natural ability',
  },
  {
    pattern: /\bope,?\s+let\s+me\s+just\s+(?:sneak|scooch)\s+right\s+past\s+ya\b/gi,
    replacement: 'excuse me, I would like to walk past you',
  },
  {
    pattern: /\blet\s+me\s+just\s+(?:sneak|scooch)\s+right\s+past\s+ya\b/gi,
    replacement: 'excuse me, I need to walk past you',
  },
  {
    pattern: /\b(?:sneak|scooch)\s+right\s+past\s+ya\b/gi,
    replacement: 'step past you briefly',
  },
  {
    pattern: /\binteresting\s+parking\s+job\b/gi,
    replacement: 'poorly parked vehicle',
  },
  {
    pattern: /\bmove\s+it\s+or\s+lose\s+it\b/gi,
    replacement: 'please move forward immediately',
  },
  {
    pattern: /\bfuggedaboutit|fuhgeddaboudit|fuhgeddaboutit\b/gi,
    replacement: 'do not worry about it at all',
  },
  {
    pattern: /\bclouds\s+are\s+just\s+sky\s+pillows\b/gi,
    replacement: 'the clouds look peaceful while I daydream',
  },
  {
    pattern: /\bcode\s+red\s+perimeter\s+breach\s+on\s+the\s+bermuda\s+grass\b/gi,
    replacement: 'urgent alert: someone has stepped onto the front lawn',
  },
  {
    pattern: /\bcode\s+red\s+perimeter\s+breach\b/gi,
    replacement: 'urgent alert: someone has walked onto the yard',
  },
  {
    pattern: /\bperimeter\s+breach\b/gi,
    replacement: 'unauthorized entry onto the lawn',
  },
  {
    pattern: /\bexecute\s+snack\s+extraction\b/gi,
    replacement: 'go pick up some snacks',
  },
  {
    pattern: /\bworn\s+slap\s+out\b/gi,
    replacement: 'completely exhausted',
  },
  {
    pattern: /\bhit\s+it\s+with\s+wd-?40\s+or\s+duct\s+tape\b/gi,
    replacement: 'repair it with lubricant or heavy-duty adhesive tape',
  },
  {
    pattern: /\bfire\s+up\s+the\s+smoker\b/gi,
    replacement: 'start cooking slowly on the outdoor barbecue',
  },
  {
    pattern: /\bcortisol\s+is\s+(?:totally\s+)?spiked\b/gi,
    replacement: 'stress levels are very high',
  },
  {
    pattern: /\badaptogenic\s+cold[\s-]*plunge\b/gi,
    replacement: 'cold water immersion paired with an herbal drink',
  },
  {
    pattern: /\bq3\s+alignment\b/gi,
    replacement: 'the third-quarter planning meeting',
  },
  {
    pattern: /\bholding\s+space\b/gi,
    replacement: 'listening calmly without interrupting',
  },
  {
    pattern: /\bnervous[\s-]+system\s+regulation\b/gi,
    replacement: 'calming down from stress',
  },
  {
    pattern: /\bfor-you\s+swamp|\bfor-you\s+page|\bfyp\b/gi,
    replacement: 'algorithmic social media video feed',
  },
  {
    pattern: /\bpizza-party\s+retention\s+initiative\b/gi,
    replacement: 'offering free pizza to raise morale instead of changing pay or hours',
  },
  {
    pattern: /\b4:45\s*pm\s+friday\s+quick\s+sync\b/gi,
    replacement: 'an unscheduled late-Friday afternoon meeting',
  },
  {
    pattern: /\bquick\s+sync\b/gi,
    replacement: 'brief meeting',
  },
  {
    pattern: /\bsuboptimal\s+deliverable\b/gi,
    replacement: 'unsatisfactory work item',
  },
  {
    pattern: /\bgrab\s+a\s+monster\b/gi,
    replacement: 'drink an energy beverage',
  },
  {
    pattern: /\b(?:stay\s+)?outta\s+the\s+trench\b/gi,
    replacement: 'stay safely away from the active work excavation',
  },
  {
    pattern: /\babove\s+my\s+pay\s+grade\b/gi,
    replacement: 'a decision outside my level of authority',
  },
  {
    pattern: /\blow-hanging\s+fruit\b/gi,
    replacement: 'easy tasks to finish quickly',
  },
  {
    pattern: /\bmove\s+the\s+needle\b/gi,
    replacement: 'produce a measurable improvement',
  },
  {
    pattern: /\bzero\s+bandwidth\b/gi,
    replacement: 'no available time or mental energy',
  },
  {
    pattern: /\bliving\s+the\s+dream\b/gi,
    replacement: 'busy with work while remaining polite',
  },
  {
    pattern: /\byou\s+betcha\b/gi,
    replacement: 'certainly',
  },
  {
    pattern: /\bmy\s+bad\b/gi,
    replacement: 'my mistake',
  },
  {
    pattern: /\bno[\s-]*cap\b|\bnocap\b/gi,
    replacement: 'honestly',
  },
  {
    pattern: /\bfor\s+real\b|\bforreal\b/gi,
    replacement: 'genuinely',
  },
  {
    pattern: /\bsay\s+less\b/gi,
    replacement: 'understood completely',
  },
  {
    pattern: /\bat\s+the\s+crib\b/gi,
    replacement: 'at home',
  },
  {
    pattern: /\bpull\s+up\b/gi,
    replacement: 'arrive',
  },
  {
    pattern: /\bcopy\s+that\b/gi,
    replacement: 'understood',
  },
  {
    pattern: /\bstand\s+down\b/gi,
    replacement: 'relax',
  },
  {
    pattern: /\bover\s+yonder\b/gi,
    replacement: 'over there',
  },
  {
    pattern: /\bi\s+reckon\b/gi,
    replacement: 'I suppose',
  },
  {
    pattern: /\bain['’]?t\s+happening\b/gi,
    replacement: 'that is not happening',
  },

  // Compound slang nouns & modifiers
  { pattern: /\bcold[\s-]*plunge\b|\bcoldplunge\b/gi, replacement: 'cold water immersion' },
  { pattern: /\bsound[\s-]*bath\b|\bsoundbath\b/gi, replacement: 'meditative resonant bowl session' },
  { pattern: /\bdrive[\s-]*thru\b|\bdrivethru\b/gi, replacement: 'car service lane' },
  { pattern: /\bhalf[\s-]*pipe\b|\bhalfpipe\b/gi, replacement: 'U-shaped skateboarding ramp' },
  { pattern: /\bblue[\s-]*collar\b|\bbluecollar\b/gi, replacement: 'skilled trade' },
  { pattern: /\bcross[\s-]*functional\b|\bcrossfunctional\b/gi, replacement: 'interdepartmental' },
  { pattern: /\bfour[\s-]*way\b|\bfourway\b/gi, replacement: 'four-way intersection' },
  { pattern: /\bwoo[\s-]*woo\b|\bwoowoo\b/gi, replacement: 'unproven wellness jargon' },
  { pattern: /\byee[\s-]*yee\b|\byeeyee\b/gi, replacement: 'enthusiastic rural cheering' },
  { pattern: /\bbrain[\s-]*rot\b|\bbrainrot\b/gi, replacement: 'mental fatigue from repetitive online videos' },
  { pattern: /\bpush[\s-]*back\b|\bpushback\b/gi, replacement: 'objections' },
  { pattern: /\bbuy[\s-]*in\b|\bbuyin\b/gi, replacement: 'mutual agreement' },
  { pattern: /\bfollow[\s-]*up\b|\bfollowup\b/gi, replacement: 'follow up' },
  { pattern: /\bcheck[\s-]*in\b|\bcheckin\b/gi, replacement: 'brief check-in' },

  // Regional contractions & formal standard expansion
  { pattern: /\bi['’]?m\b/gi, replacement: 'I am' },
  { pattern: /\byou['’]?re\b/gi, replacement: 'you are' },
  { pattern: /\bwe['’]?re\b/gi, replacement: 'we are' },
  { pattern: /\bthey['’]?re\b/gi, replacement: 'they are' },
  { pattern: /\bhe['’]?s\b/gi, replacement: 'he is' },
  { pattern: /\bshe['’]?s\b/gi, replacement: 'she is' },
  { pattern: /\bit['’]?s\b/gi, replacement: 'it is' },
  { pattern: /\blet['’]?s\b/gi, replacement: 'let us' },
  { pattern: /\bcan['’]?t\b/gi, replacement: 'cannot' },
  { pattern: /\bwon['’]?t\b/gi, replacement: 'will not' },
  { pattern: /\bdon['’]?t\b/gi, replacement: 'do not' },
  { pattern: /\bdidn['’]?t\b/gi, replacement: 'did not' },
  { pattern: /\bisn['’]?t\b/gi, replacement: 'is not' },
  { pattern: /\baren['’]?t\b/gi, replacement: 'are not' },
  { pattern: /\b(?:fixin['’]?|fixing)\s+to\b/gi, replacement: 'about to' },
  { pattern: /\bfinna\b/gi, replacement: 'about to' },
  { pattern: /\by['’]?all\b/gi, replacement: 'everyone' },
  { pattern: /\bi\s+ain['’]?t\b/gi, replacement: 'I am not' },
  { pattern: /\b(you|we|they)\s+ain['’]?t\b/gi, replacement: '$1 are not' },
  { pattern: /\bain['’]?t\b/gi, replacement: 'is not' },
  { pattern: /\b(I\s+am|you\s+are|we\s+are|they\s+are|he\s+is|she\s+is|it\s+is)\s+gon(?:na|['’])?(?![a-z0-9])/gi, replacement: '$1 going to' },
  { pattern: /\bi\s+gon(?:na|['’])?(?![a-z0-9])/gi, replacement: 'I am going to' },
  { pattern: /\b(you|we|they)\s+gon(?:na|['’])?(?![a-z0-9])/gi, replacement: '$1 are going to' },
  { pattern: /\b(he|she|it)\s+gon(?:na|['’])?(?![a-z0-9])/gi, replacement: '$1 is going to' },
  { pattern: /\bgon(?:na|['’])(?![a-z0-9])/gi, replacement: 'going to' },
  { pattern: /\bgon(?![a-z0-9])/gi, replacement: 'going to' },
  { pattern: /\blemme\b/gi, replacement: 'let me' },
  { pattern: /\bgimme\b/gi, replacement: 'give me' },
  { pattern: /\bwanna\b/gi, replacement: 'want to' },
  { pattern: /\boutta\b/gi, replacement: 'out of' },
  { pattern: /\bkinda\b/gi, replacement: 'somewhat' },
  { pattern: /\bsorta\b/gi, replacement: 'somewhat' },
  { pattern: /\byous\b/gi, replacement: 'all of you' },

  // Dropped-g & informal verbs (trailing apostrophe-safe boundaries)
  { pattern: /\bbussin['’]?(?![a-z0-9])/gi, replacement: 'delicious' },
  { pattern: /\bstraight\s+wildin['’]?(?![a-z0-9])/gi, replacement: 'acting completely recklessly' },
  { pattern: /\bwildin['’]?(?![a-z0-9])/gi, replacement: 'acting recklessly' },
  { pattern: /\btrippin['’]?(?![a-z0-9])/gi, replacement: 'overreacting' },
  { pattern: /\bchillin['’]?(?![a-z0-9])/gi, replacement: 'relaxing' },
  { pattern: /\bfixin['’]?(?![a-z0-9])/gi, replacement: 'preparing' },
  { pattern: /\bdoin['’]?(?![a-z0-9])/gi, replacement: 'doing' },
  { pattern: /\bgoin['’]?(?![a-z0-9])/gi, replacement: 'going' },
  { pattern: /\bworkin['’]?(?![a-z0-9])/gi, replacement: 'working' },
  { pattern: /\btalkin['’]?(?![a-z0-9])/gi, replacement: 'talking' },
  { pattern: /\bmovin['’]?(?![a-z0-9])/gi, replacement: 'moving' },
  { pattern: /\bcookin['’]?(?![a-z0-9])/gi, replacement: 'cooking' },
  { pattern: /\blivin['’]?(?![a-z0-9])/gi, replacement: 'living' },
  { pattern: /\bnothin['’]?(?![a-z0-9])/gi, replacement: 'nothing' },
  { pattern: /\bsomethin['’]?(?![a-z0-9])/gi, replacement: 'something' },
  { pattern: /\banythin['’]?(?![a-z0-9])/gi, replacement: 'anything' },
  { pattern: /\beverythin['’]?(?![a-z0-9])/gi, replacement: 'everything' },
  { pattern: /\b([a-z]{2,})in['’](?![a-z0-9])/gi, replacement: '$1ing' },

  // Single-word slang & subculture buzzwords
  { pattern: /\bope,?\s*/gi, replacement: 'excuse me, ' },
  { pattern: /\bwelp,?\s*/gi, replacement: 'well then, ' },
  { pattern: /\bwhoa\s+dude,?\s*/gi, replacement: 'excuse me, friend, ' },
  { pattern: /\byo,?\s+(?=please|move|listen|check|hey|hold|wait|stop)/gi, replacement: 'Excuse me, ' },
  { pattern: /^man,\s*/gi, replacement: 'Honestly, ' },
  { pattern: /\bdead[\s-]*ass\b/gi, replacement: 'completely seriously' },
  { pattern: /\blow[\s-]*key\b/gi, replacement: 'quietly' },
  { pattern: /\bhigh[\s-]*key\b/gi, replacement: 'very noticeably' },
  { pattern: /\bdelulu\b/gi, replacement: 'unrealistic' },
  { pattern: /\bcooked\b/gi, replacement: 'in serious trouble' },
  { pattern: /\baura\b/gi, replacement: 'social impression' },
  { pattern: /\brizz\b/gi, replacement: 'social charm' },
  { pattern: /\bnpc\b/gi, replacement: 'oblivious person' },
  { pattern: /\bmid\b/gi, replacement: 'mediocre' },
  { pattern: /\bsus\b/gi, replacement: 'suspicious' },
  { pattern: /\bslaps\b/gi, replacement: 'is exceptionally good' },
  { pattern: /\bbandwidth\b/gi, replacement: 'available schedule time' },
  { pattern: /\bsynergy\b/gi, replacement: 'team cooperation' },
  { pattern: /\bdeliverable\b/gi, replacement: 'assigned task' },
  { pattern: /\bsuboptimal\b/gi, replacement: 'unsatisfactory' },
  { pattern: /\beod\b/gi, replacement: 'the end of the workday' },
  { pattern: /\balignment\b/gi, replacement: 'mutual agreement' },
  { pattern: /\bcrib\b/gi, replacement: 'home' },
  { pattern: /\bkicks\b/gi, replacement: 'sneakers' },
  { pattern: /\bfam\b/gi, replacement: 'friends' },
  { pattern: /\bdawg\b/gi, replacement: 'friend' },
  { pattern: /\bhomies\b/gi, replacement: 'close friends' },
  { pattern: /\bhomie\b/gi, replacement: 'close friend' },
  { pattern: /\bmeemaw\b/gi, replacement: 'grandmother' },
  { pattern: /\bholler\b/gi, replacement: 'mountain valley' },
  { pattern: /\bcrick\b/gi, replacement: 'small stream' },
  { pattern: /\bmunchies\b/gi, replacement: 'late-night snack cravings' },
  { pattern: /\bgnarly\b/gi, replacement: 'intense' },
  { pattern: /\bstoked\b/gi, replacement: 'very enthusiastic' },
  { pattern: /\btactical\b/gi, replacement: 'overly methodical' },
  { pattern: /\bperimeter\b/gi, replacement: 'yard boundary' },
  { pattern: /\bcortisol\b/gi, replacement: 'stress levels' },
  { pattern: /\bbodega\b/gi, replacement: 'corner grocery store' },
  { pattern: /\bhotdish\b/gi, replacement: 'baked casserole' },
  { pattern: /\bbrick\b/gi, replacement: 'freezing cold' },
  { pattern: /\bsugar\b/gi, replacement: 'friend' },
  { pattern: /\bpal\b/gi, replacement: 'stranger' },
  { pattern: /\bdude\b/gi, replacement: 'friend' },
  { pattern: /\bbro\b/gi, replacement: 'that person' },
  { pattern: /\bchat\b/gi, replacement: 'everyone listening' },
  { pattern: /\bboss\b/gi, replacement: 'supervisor' },
  { pattern: /\bchill\b/gi, replacement: 'relaxed' },
  { pattern: /\bvibes\b/gi, replacement: 'mood' },
  { pattern: /\bvibe\b/gi, replacement: 'atmosphere' },
  { pattern: /\brespectfully\b/gi, replacement: 'to be candid' },
];

const SPOILER_SYNONYM_MAP: Readonly<Record<string, string>> = {
  cap: 'exaggeration',
  nocap: 'truthfully',
  'no-cap': 'truthfully',
  bet: 'agreed',
  bussin: 'delicious',
  "bussin'": 'delicious',
  wildin: 'chaotic',
  "wildin'": 'chaotic',
  chillin: 'relaxing',
  "chillin'": 'relaxing',
  trippin: 'overreacting',
  "trippin'": 'overreacting',
  fixin: 'preparing',
  "fixin'": 'preparing',
  crib: 'residence',
  kicks: 'footwear',
  plate: 'meal serving',
  tea: 'beverage',
  shade: 'indirect criticism',
  aura: 'impression',
  cooked: 'in trouble',
  delulu: 'unrealistic',
  npc: 'bystander',
  brainrot: 'mental fatigue',
  'brain-rot': 'mental fatigue',
  ope: 'pardon me',
  welp: 'alright then',
  pal: 'acquaintance',
  yous: 'you folks',
  fuggedaboutit: 'never mind that',
  fuhgeddaboudit: 'never mind that',
  bandwidth: 'schedule availability',
  synergy: 'teamwork',
  deliverable: 'project item',
  suboptimal: 'inadequate',
  eod: 'closing time',
  trench: 'excavation pit',
  drywall: 'wallboard',
  monster: 'caffeinated drink',
  pushback: 'resistance',
  'push-back': 'resistance',
  buyin: 'approval',
  'buy-in': 'approval',
  cortisol: 'stress',
  'cold-plunge': 'ice bath',
  coldplunge: 'ice bath',
  'sound-bath': 'bell meditation',
  soundbath: 'bell meditation',
  woowoo: 'mystical',
  'woo-woo': 'mystical',
  yeeyee: 'spirited',
  'yee-yee': 'spirited',
  yonder: 'at a distance',
  reckon: 'suppose',
  holler: 'mountain hollow',
  crick: 'stream',
  smoker: 'outdoor cooker',
  duct: 'repair',
  tape: 'adhesive strip',
  perimeter: 'outer edge',
  rangefinder: 'measuring gauge',
  tactical: 'methodical',
  munchies: 'snack cravings',
  gnarly: 'extreme',
  stoked: 'delighted',
  chill: 'calm',
  'half-pipe': 'skate ramp',
  halfpipe: 'skate ramp',
  'drive-thru': 'car window service',
  drivethru: 'car window service',
  '0-dark-thirty': 'before dawn',
  'zero-dark-thirty': 'before dawn',
  lowkey: 'quietly',
  'low-key': 'quietly',
  highkey: 'openly',
  'high-key': 'openly',
  deadass: 'seriously',
  finna: 'about to',
  steady: 'consistently',
  vibe: 'mood',
  vibes: 'atmosphere',
  slaps: 'excels',
  mid: 'average',
  fire: 'remarkable',
  sus: 'questionable',
  flex: 'boast',
  ghosted: 'ignored',
  salty: 'resentful',
  clutch: 'timely',
  brick: 'freezing',
  soup: 'broth',
  biscuits: 'baked rolls',
  meet: 'gather',
  grab: 'fetch',
  check: 'inspect',
  hold: 'retain',
  keep: 'maintain',
  save: 'reserve',
  move: 'shift',
  drive: 'operate a vehicle',
  park: 'leave a car stopped',
  pass: 'hand over',
  stay: 'remain',
  bro: 'person',
  dude: 'companion',
  boss: 'supervisor',
  sugar: 'friend',
  chat: 'listeners',
  thing: 'item',
  available: 'open',
  schedule: 'calendar',
  time: 'hours',
  workday: 'business day',
};

const TRACK_FALLBACK_LINES: Record<AdultLanguageCode, string> = {
  ebonics: 'This is an informal everyday expression meaning things are good or understood.',
  suburban: 'This is a polite suburban phrasing expressing friendly agreement or mild understatement.',
  corp_trades: 'This expresses a practical workplace request or jobsite reality in plain terms.',
  midwest_northeast: 'This expresses polite indirectness or direct bluntness about an everyday situation.',
  south_genz: 'This contrasts polite Southern phrasing with modern online slang commentary.',
  cali_country: 'This contrasts urban wellness terminology with plainspoken rural practicality.',
  stoner_tactical: 'This contrasts relaxed casual speech with overly serious household planning.',
};

function stripEditorialPrefixes(raw: string): string {
  let text = raw.trim();
  for (let i = 0; i < 3; i++) {
    const next = text
      .replace(DIALECT_PREFIX_RE, '')
      .replace(INSTRUCTION_PREFIX_RE, '')
      .trim();
    if (next === text) break;
    text = next;
  }
  return text.replace(/^[""'‘’]+|[""'‘’]+$/g, '').trim();
}

function normalizePhraseLookupKey(raw: string): string {
  return stripEditorialPrefixes(raw)
    .toLowerCase()
    .replace(/[\u2018\u2019`]/g, "'")
    .replace(/[¡!¿?.,;:"“”()[\]—–-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractQuotedMeaningFromNote(note?: string): string | null {
  if (!note) return null;
  const trimmed = note.trim();
  if (!trimmed || GRAMMAR_JARGON_RE.test(trimmed)) return null;
  const meansMatch = /\bmeans?\s+"([^"]{4,140})"/i.exec(trimmed);
  if (meansMatch?.[1]) {
    return meansMatch[1].trim();
  }
  return null;
}

function applyPhraseRewrites(input: string): string {
  let text = stripEditorialPrefixes(input)
    .replace(/_{2,}/g, 'that missing detail')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s*[—–]\s*/g, '; ');

  for (const rule of PHRASE_REWRITE_RULES) {
    text = text.replace(rule.pattern, rule.replacement);
  }

  return text
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/,\s*,+/g, ', ')
    .replace(/;\s*;/g, '; ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskAvoidTerms(text: string, avoidTerms?: readonly string[]): string {
  if (!avoidTerms || avoidTerms.length === 0) return text;

  const replacementLookup = new Map<string, string>();
  const patterns: string[] = [];

  for (const rawTerm of avoidTerms) {
    if (typeof rawTerm !== 'string') continue;
    const cleaned = rawTerm
      .trim()
      .replace(/[\u2018\u2019`]/g, "'")
      .replace(/^[¡!¿?.,;:"'()[\]\-]+|[¡!¿?.,;:"'()[\]\-]+$/g, '')
      .toLowerCase();
    if (!cleaned || cleaned.length < 2 || FUNCTION_STOPWORDS.has(cleaned)) continue;

    const noApos = cleaned.replace(/'/g, '');
    const spaced = cleaned.replace(/-/g, ' ');
    for (const variant of new Set([cleaned, noApos, spaced])) {
      if (!variant || variant.length < 2 || FUNCTION_STOPWORDS.has(variant)) continue;
      if (!replacementLookup.has(variant)) {
        const syn =
          SPOILER_SYNONYM_MAP[variant] ??
          SPOILER_SYNONYM_MAP[cleaned] ??
          SPOILER_SYNONYM_MAP[noApos] ??
          'that detail';
        replacementLookup.set(variant, syn);
        patterns.push(escapeRegExp(variant));
      }
    }
  }

  if (patterns.length === 0) return text;
  patterns.sort((a, b) => b.length - a.length);
  const combinedRe = new RegExp(`(?<![a-z0-9])(?:${patterns.join('|')})(?![a-z0-9])`, 'gi');

  return text
    .replace(combinedRe, (match) => {
      const key = match.toLowerCase();
      return replacementLookup.get(key) ?? 'that detail';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function finalizePlainSentence(raw: string): string {
  let clean = raw
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!clean) return '';
  clean = clean
    .replace(/([.!?]\s+)([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  if (!/[.!?]$/.test(clean)) {
    clean += '.';
  }
  return clean;
}

function scorePlainness(original: string, rewritten: string): number {
  let score = rewritten.length >= 12 ? 10 : 4;
  if (rewritten !== original) score += 5;
  if (
    !/\b(?:ain['’]?t|gonna|finna|y['’]?all|ope|welp|delulu|cooked|bussin|gnarly|eod)\b/i.test(
      rewritten
    )
  ) {
    score += 10;
  }
  if (/\s/.test(rewritten)) score += 4;
  return score;
}

function decodeCandidate(
  candidate: string,
  noteHint: string | null
): { text: string; score: number } {
  const cleaned = stripEditorialPrefixes(candidate);
  const lookupKey = normalizePhraseLookupKey(cleaned);
  const exact = EXACT_PHRASE_DECODER[lookupKey];
  if (exact) {
    return { text: exact, score: 100 };
  }

  const rewritten = applyPhraseRewrites(cleaned);
  const wordCount = rewritten.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 3 && noteHint) {
    return { text: noteHint, score: 60 };
  }

  return {
    text: rewritten,
    score: scorePlainness(cleaned, rewritten),
  };
}

/**
 * Translates After-Hours dialect or mashup phrases into deadpan, crystal-clear
 * standard English for display and `en` text-to-speech playback, with optional
 * spoiler masking for interactive exercises.
 */
export function decodeToNormalEnglish(req: PlainEnglishRequest): PlainEnglishResult {
  if (req.explicitPlain && req.explicitPlain.trim().length > 0) {
    const cleanedExplicit = stripEditorialPrefixes(req.explicitPlain);
    const masked = maskAvoidTerms(cleanedExplicit, req.avoidTerms);
    const finalText =
      finalizePlainSentence(masked) ||
      (isAdultLanguage(req.language)
        ? TRACK_FALLBACK_LINES[req.language]
        : 'This phrase means the everyday standard equivalent.');
    return {
      label: DEFAULT_LABEL,
      spokenText: finalText,
      displayLine: finalText,
    };
  }

  const noteHint =
    extractQuotedMeaningFromNote(req.registerNote) ??
    extractQuotedMeaningFromNote(req.nuanceNote);

  const candidates = [req.dialectBText, req.dialectAText]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((text) => decodeCandidate(text, noteHint));

  let bestText = '';
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    bestText = candidates[0].text;
  } else if (noteHint) {
    bestText = noteHint;
  } else if (isAdultLanguage(req.language)) {
    bestText = TRACK_FALLBACK_LINES[req.language];
  } else {
    bestText = 'This phrase expresses a standard everyday meaning.';
  }

  const masked = maskAvoidTerms(bestText, req.avoidTerms);
  const finalSentence =
    finalizePlainSentence(masked) ||
    (isAdultLanguage(req.language)
      ? TRACK_FALLBACK_LINES[req.language]
      : 'This phrase expresses a standard everyday meaning.');

  return {
    label: DEFAULT_LABEL,
    spokenText: finalSentence,
    displayLine: finalSentence,
  };
}
