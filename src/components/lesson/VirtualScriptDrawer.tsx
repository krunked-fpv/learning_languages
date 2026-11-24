import { useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Languages } from 'lucide-react';
import { playSfx } from '../../audio';
import { LANGUAGE_META, type LanguageCode, type TextDirection } from '../../types/contracts';

export interface VirtualScriptDrawerProps {
  language: LanguageCode;
  compact?: boolean;
  disabled?: boolean;
  open?: boolean;
  inlineCollapsed?: boolean;
  onOpenChange?: (open: boolean) => void;
  onInsertChar: (value: string) => void;
}

interface ScriptTabSpec {
  id: string;
  label: string;
  dir: TextDirection;
  keys: readonly string[];
}

const ZH_TABS: readonly ScriptTabSpec[] = [
  {
    id: 'zh_pinyin',
    label: 'Pinyin & Syllables',
    dir: 'ltr',
    keys: [
      'nǐ', 'hǎo', 'xiè', 'xie', 'zài', 'jiàn', 'mā', 'chá',
      'qǐng', 'wǒ', 'shì', 'bù',
      'ā', 'á', 'ǎ', 'à',
      'ē', 'é', 'ě', 'è',
      'ī', 'í', 'ǐ', 'ì',
      'ō', 'ó', 'ǒ', 'ò',
      'ū', 'ú', 'ǔ', 'ù',
      'ǖ', 'ǘ', 'ǚ', 'ǜ',
    ],
  },
  {
    id: 'zh_hanzi',
    label: 'Starter Hanzi',
    dir: 'ltr',
    keys: ['你', '好', '谢', '再', '见', '妈', '茶', '水', '早', '晚', '请', '我', '是', '不', '猫', '狗'],
  },
];

const JA_TABS: readonly ScriptTabSpec[] = [
  {
    id: 'ja_hira',
    label: 'Hiragana + Macrons',
    dir: 'ltr',
    keys: [
      'ā', 'ī', 'ū', 'ē', 'ō', 'っ', 'ん', 'ー',
      'あ', 'い', 'う', 'え', 'お',
      'か', 'き', 'く', 'け', 'こ',
      'さ', 'し', 'す', 'せ', 'そ',
      'た', 'ち', 'つ', 'て', 'と',
      'な', 'に', 'ぬ', 'ね', 'の',
      'は', 'ひ', 'ふ', 'へ', 'ほ',
      'ま', 'み', 'む', 'め', 'も',
      'や', 'ゆ', 'よ', 'ら', 'り', 'る', 'れ', 'ろ', 'わ', 'を',
    ],
  },
  {
    id: 'ja_kata',
    label: 'Katakana',
    dir: 'ltr',
    keys: [
      'ア', 'イ', 'ウ', 'エ', 'オ',
      'カ', 'キ', 'ク', 'ケ', 'コ',
      'サ', 'シ', 'ス', 'セ', 'ソ',
      'タ', 'チ', 'ツ', 'テ', 'ト',
      'ナ', 'ニ', 'ヌ', 'ネ', 'ノ',
      'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',
      'マ', 'ミ', 'ム', 'メ', 'モ',
      'ヤ', 'ユ', 'ヨ', 'ラ', 'リ', 'ル', 'レ', 'ロ', 'ワ', 'ヲ', 'ン', 'ッ', 'ー',
    ],
  },
];

const AR_TABS: readonly ScriptTabSpec[] = [
  {
    id: 'ar_core',
    label: 'Arabic + Hamza',
    dir: 'rtl',
    keys: [
      'أ', 'إ', 'آ', 'ة', 'ى', 'ئ', 'ؤ', 'ء', '؟',
      'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز',
      'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك',
      'ل', 'م', 'ن', 'ه', 'و', 'ي',
    ],
  },
  {
    id: 'ar_harakat',
    label: 'Harakat',
    dir: 'rtl',
    keys: ['َ', 'ُ', 'ِ', 'ً', 'ٌ', 'ٍ', 'ّ', 'ْ', 'لا', '،', '؛'],
  },
];

const HI_TABS: readonly ScriptTabSpec[] = [
  {
    id: 'hi_vowels',
    label: 'Vowels & Matras',
    dir: 'ltr',
    keys: [
      'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ',
      'ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', 'ं', 'ँ', '्', '।',
    ],
  },
  {
    id: 'hi_cons',
    label: 'Consonants',
    dir: 'ltr',
    keys: [
      'क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ',
      'ट', 'ठ', 'ड', 'ढ', 'त', 'थ', 'द', 'ध', 'न',
      'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व',
      'श', 'ष', 'स', 'ह',
    ],
  },
];

const BN_TABS: readonly ScriptTabSpec[] = [
  {
    id: 'bn_vowels',
    label: 'Vowels & Matras',
    dir: 'ltr',
    keys: [
      'অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'এ', 'ঐ', 'ও', 'ঔ',
      'া', 'ি', 'ী', 'ু', 'ূ', 'ে', 'ৈ', 'ো', 'ৌ', 'ং', 'ঁ', '্', '।',
    ],
  },
  {
    id: 'bn_cons',
    label: 'Consonants',
    dir: 'ltr',
    keys: [
      'ক', 'খ', 'গ', 'ঘ', 'চ', 'ছ', 'জ', 'ঝ',
      'ট', 'ঠ', 'ড', 'ঢ', 'ত', 'থ', 'দ', 'ধ', 'ন',
      'প', 'ফ', 'ব', 'ভ', 'ম', 'য', 'র', 'ল',
      'শ', 'ষ', 'স', 'হ', 'ড়',
    ],
  },
];

const RU_TABS: readonly ScriptTabSpec[] = [
  {
    id: 'ru_lower',
    label: 'Cyrillic',
    dir: 'ltr',
    keys: [
      'а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж', 'з', 'и', 'й',
      'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф',
      'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ы', 'ь', 'э', 'ю', 'я',
    ],
  },
  {
    id: 'ru_upper',
    label: 'Uppercase',
    dir: 'ltr',
    keys: [
      'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й',
      'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф',
      'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ы', 'Э', 'Ю', 'Я',
    ],
  },
];

const VI_TABS: readonly ScriptTabSpec[] = [
  {
    id: 'vi_tones',
    label: 'Tonal Vowels',
    dir: 'ltr',
    keys: [
      'ă', 'â', 'đ', 'ê', 'ô', 'ơ', 'ư',
      'á', 'à', 'ả', 'ã', 'ạ',
      'é', 'è', 'ẻ', 'ẽ', 'ẹ',
      'í', 'ì', 'ỉ', 'ĩ', 'ị',
      'ó', 'ò', 'ỏ', 'õ', 'ọ',
      'ú', 'ù', 'ủ', 'ũ', 'ụ',
      'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ',
    ],
  },
  {
    id: 'vi_compound',
    label: 'Compound Tones',
    dir: 'ltr',
    keys: [
      'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ',
      'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ',
      'ế', 'ề', 'ể', 'ễ', 'ệ',
      'ố', 'ồ', 'ổ', 'ỗ', 'ộ',
      'ớ', 'ờ', 'ở', 'ỡ', 'ợ',
      'ứ', 'ừ', 'ử', 'ữ', 'ự',
    ],
  },
];

const EXTRA_LATIN_KEYS: Partial<Record<LanguageCode, readonly string[]>> = {
  es: ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ü', 'Ñ'],
  fr: ['À', 'Â', 'Ç', 'É', 'È', 'Ê', 'Œ', 'œ', '’', '«', '»'],
  de: ['„', '“', '’'],
  it: ['À', 'È', 'É', 'Ì', 'Ò', 'Ù', '’'],
  pt: ['Ã', 'Õ', 'Ç', 'Á', 'É', 'Í', 'Ó', 'Ú'],
  en: ['’', '—', '"'],
  id: ['’', ','],
  sw: ['’', ','],
};

function dedupeScriptTabs(tabs: readonly ScriptTabSpec[]): readonly ScriptTabSpec[] {
  return tabs.map((tab) => ({
    ...tab,
    keys: Array.from(new Set(tab.keys)),
  }));
}

function getScriptTabsForLanguage(language: LanguageCode): readonly ScriptTabSpec[] {
  switch (language) {
    case 'zh':
      return dedupeScriptTabs(ZH_TABS);
    case 'ja':
      return dedupeScriptTabs(JA_TABS);
    case 'ar':
    case 'arz':
      return dedupeScriptTabs(AR_TABS);
    case 'hi':
      return dedupeScriptTabs(HI_TABS);
    case 'bn':
      return dedupeScriptTabs(BN_TABS);
    case 'ru':
      return dedupeScriptTabs(RU_TABS);
    case 'vi':
      return dedupeScriptTabs(VI_TABS);
    default: {
      const meta = LANGUAGE_META[language];
      const baseKeys = Array.from(
        new Set([...meta.helperAccents, ...(EXTRA_LATIN_KEYS[language] ?? [])])
      );
      return dedupeScriptTabs([
        {
          id: `${language}_accents`,
          label: `${meta.name} Keys`,
          dir: meta.dir,
          keys: baseKeys,
        },
        {
          id: `${language}_punct`,
          label: 'Punctuation',
          dir: meta.dir,
          keys: ['.', ',', '!', '?', "'", '’', '-', '¡', '¿'],
        },
      ]);
    }
  }
}

export function VirtualScriptDrawer({
  language,
  compact = false,
  disabled = false,
  open,
  inlineCollapsed = false,
  onOpenChange,
  onInsertChar,
}: VirtualScriptDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const tabs = useMemo(() => getScriptTabsForLanguage(language), [language]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id ?? 'default');
  const panelId = useId();

  useEffect(() => {
    if (!isControlled) {
      setInternalOpen(false);
    }
    setActiveTabId(tabs[0]?.id ?? 'default');
  }, [language, tabs, isControlled]);

  const currentTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const handleToggle = () => {
    playSfx('tile_tap');
    const next = !isOpen;
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const isInlineRow = inlineCollapsed && !isOpen;

  return (
    <div
      data-testid="virtual-script-drawer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? 3 : 6,
        width: isInlineRow ? 'auto' : '100%',
        flexShrink: isInlineRow ? 0 : undefined,
      }}
    >
      <button
        type="button"
        data-testid="virtual-script-drawer-toggle"
        aria-expanded={isOpen}
        aria-controls={panelId}
        disabled={disabled}
        className={`tactile-btn ${isOpen ? 'tactile-btn-indigo' : 'tactile-btn-soft'}`}
        style={{
          padding: compact ? '3px 8px' : '4px 11px',
          fontSize: compact ? '0.7rem' : '0.76rem',
          borderRadius: 10,
          borderBottomWidth: compact ? 3 : undefined,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
        onClick={handleToggle}
      >
        <Languages size={13} />
        <span>Script Keys</span>
        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {isOpen && currentTab ? (
        <div
          id={panelId}
          style={{
            width: '100%',
            padding: compact ? '4px 6px' : '8px 10px',
            borderRadius: compact ? 12 : 14,
            background: 'var(--card-soft-bg)',
            border: '2px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? 3 : 6,
          }}
        >
          {tabs.length > 1 ? (
            <div
              role="tablist"
              aria-label="Script tabs"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: compact ? 4 : 5,
                flexWrap: 'wrap',
              }}
            >
              {tabs.map((tab) => {
                const selected = tab.id === currentTab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={`tactile-btn ${selected ? 'tactile-btn-primary' : 'tactile-btn-soft'}`}
                    style={{
                      padding: compact ? '2px 7px' : '3px 10px',
                      fontSize: compact ? '0.68rem' : '0.7rem',
                      borderRadius: 999,
                    }}
                    onClick={() => {
                      playSfx('tile_tap');
                      setActiveTabId(tab.id);
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div
            data-testid="virtual-script-grid"
            dir={currentTab.dir}
            className="console-scroll-pane"
            style={{
              maxHeight: compact ? 60 : 118,
              overflowY: 'auto',
              display: 'flex',
              flexWrap: 'wrap',
              gap: compact ? 3 : 5,
              justifyContent: 'center',
              padding: compact ? '1px' : '2px',
            }}
          >
            {currentTab.keys.map((ch) => (
              <button
                key={ch}
                type="button"
                className="tactile-tile"
                disabled={disabled}
                style={{
                  padding: compact ? '2px 6px' : '4px 9px',
                  fontSize: compact ? '0.82rem' : '0.9rem',
                  minWidth: compact ? 26 : 34,
                  lineHeight: currentTab.dir === 'rtl' ? 1.5 : 1.25,
                }}
                onClick={() => onInsertChar(ch)}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
