import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Gem, Heart, MessageSquareQuote, Play, RotateCcw, Sparkles, Star, Volume2, WifiOff, X } from 'lucide-react';
import { AvatarBadge } from '../../art/AvatarBadge';
import { playSfx, speakPhrase } from '../../audio';
import * as core from '../../core';
import * as curriculum from '../../curriculum';
import { getArcadeLexicon } from '../../curriculum';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import {
  LANGUAGE_META,
  isAdultLanguage,
  isDefaultKidProfileId,
  type AdultLanguageCode,
  type ArcadeLanternItem,
  type ArcadeProficiencyTier,
  type BaseCourseLoadState,
  type BaseLanguageCode,
  type CompanionId,
  type KidProfile,
  type LanguageCode,
  type ProficiencyTier,
} from '../../types/contracts';
import { MascotStage } from '../characters/MascotStage';
import { ConfettiBurst } from '../fx/JuiceEngine';
import { StarlightHintButton } from '../lesson/StarlightHintButton';
import { useHintEngine } from '../lesson/useHintEngine';

export const FALLBACK_ARCADE_LEXICON: Record<LanguageCode, ArcadeLanternItem[]> = {
  es: [
    { id: 'fb-es-1', language: 'es', foreign: 'hola', english: 'hello', phonetic: 'OH-lah', illustrationKey: 'wave_hello' },
    { id: 'fb-es-2', language: 'es', foreign: 'el agua', english: 'the water', phonetic: 'el AH-gwah', illustrationKey: 'water_carafe' },
    { id: 'fb-es-3', language: 'es', foreign: 'el sol', english: 'the sun', phonetic: 'el SOHL', illustrationKey: 'morning_sun' },
    { id: 'fb-es-4', language: 'es', foreign: 'el gato', english: 'the cat', phonetic: 'el GAH-toh', illustrationKey: 'cozy_cat' },
    { id: 'fb-es-5', language: 'es', foreign: 'la manzana', english: 'the apple', phonetic: 'lah mahn-SAH-nah', illustrationKey: 'fresh_apple' },
    { id: 'fb-es-6', language: 'es', foreign: 'el pan', english: 'the bread', phonetic: 'el PAHN', illustrationKey: 'warm_bread' },
    { id: 'fb-es-7', language: 'es', foreign: 'el queso', english: 'the cheese', phonetic: 'el KEH-soh', illustrationKey: 'golden_cheese' },
    { id: 'fb-es-8', language: 'es', foreign: 'la luna', english: 'the moon', phonetic: 'lah LOO-nah', illustrationKey: 'crescent_moon' },
  ],
  fr: [
    { id: 'fb-fr-1', language: 'fr', foreign: 'bonjour', english: 'hello', phonetic: 'bon-ZHOOR', illustrationKey: 'wave_hello' },
    { id: 'fb-fr-2', language: 'fr', foreign: "l'eau", english: 'the water', phonetic: 'LOH', illustrationKey: 'water_carafe' },
    { id: 'fb-fr-3', language: 'fr', foreign: 'le croissant', english: 'the croissant', phonetic: 'luh kwah-SAHN', illustrationKey: 'flaky_pastry' },
    { id: 'fb-fr-4', language: 'fr', foreign: 'le chat', english: 'the cat', phonetic: 'luh SHAH', illustrationKey: 'cozy_cat' },
    { id: 'fb-fr-5', language: 'fr', foreign: 'la pomme', english: 'the apple', phonetic: 'lah POHM', illustrationKey: 'fresh_apple' },
    { id: 'fb-fr-6', language: 'fr', foreign: 'le pain', english: 'the bread', phonetic: 'luh PAN', illustrationKey: 'warm_bread' },
    { id: 'fb-fr-7', language: 'fr', foreign: 'le soleil', english: 'the sun', phonetic: 'luh soh-LAY', illustrationKey: 'morning_sun' },
    { id: 'fb-fr-8', language: 'fr', foreign: 'la lune', english: 'the moon', phonetic: 'lah LOON', illustrationKey: 'crescent_moon' },
  ],
  de: [
    { id: 'fb-de-1', language: 'de', foreign: 'hallo', english: 'hello', phonetic: 'HAH-loh', illustrationKey: 'wave_hello' },
    { id: 'fb-de-2', language: 'de', foreign: 'das Wasser', english: 'the water', phonetic: 'dahs VAH-ser', illustrationKey: 'water_carafe' },
    { id: 'fb-de-3', language: 'de', foreign: 'das Brot', english: 'the bread', phonetic: 'dahs BROHT', illustrationKey: 'warm_bread' },
    { id: 'fb-de-4', language: 'de', foreign: 'die Katze', english: 'the cat', phonetic: 'dee KAHT-suh', illustrationKey: 'cozy_cat' },
    { id: 'fb-de-5', language: 'de', foreign: 'der Apfel', english: 'the apple', phonetic: 'dair AHP-fel', illustrationKey: 'fresh_apple' },
    { id: 'fb-de-6', language: 'de', foreign: 'die Sonne', english: 'the sun', phonetic: 'dee ZOH-nuh', illustrationKey: 'morning_sun' },
    { id: 'fb-de-7', language: 'de', foreign: 'der Zug', english: 'the train', phonetic: 'dair TSOOG', illustrationKey: 'express_train' },
    { id: 'fb-de-8', language: 'de', foreign: 'der Mond', english: 'the moon', phonetic: 'dair MOHNT', illustrationKey: 'crescent_moon' },
  ],
  it: [
    { id: 'fb-it-1', language: 'it', foreign: 'ciao', english: 'hello', phonetic: 'CHOW', illustrationKey: 'wave_hello' },
    { id: 'fb-it-2', language: 'it', foreign: "l'acqua", english: 'the water', phonetic: 'LAHK-wah', illustrationKey: 'water_carafe' },
    { id: 'fb-it-3', language: 'it', foreign: 'il gelato', english: 'the gelato', phonetic: 'eel jeh-LAH-toh', illustrationKey: 'sweet_gelato' },
    { id: 'fb-it-4', language: 'it', foreign: 'il gatto', english: 'the cat', phonetic: 'eel GAHT-toh', illustrationKey: 'cozy_cat' },
    { id: 'fb-it-5', language: 'it', foreign: 'la mela', english: 'the apple', phonetic: 'lah MEH-lah', illustrationKey: 'fresh_apple' },
    { id: 'fb-it-6', language: 'it', foreign: 'il pane', english: 'the bread', phonetic: 'eel PAH-neh', illustrationKey: 'warm_bread' },
    { id: 'fb-it-7', language: 'it', foreign: 'il sole', english: 'the sun', phonetic: 'eel SOH-leh', illustrationKey: 'morning_sun' },
    { id: 'fb-it-8', language: 'it', foreign: 'la luna', english: 'the moon', phonetic: 'lah LOO-nah', illustrationKey: 'crescent_moon' },
  ],
  pt: [
    { id: 'fb-pt-1', language: 'pt', foreign: 'olá', english: 'hello', phonetic: 'oh-LAH', illustrationKey: 'wave_hello' },
    { id: 'fb-pt-2', language: 'pt', foreign: 'a água', english: 'the water', phonetic: 'ah AH-gwah', illustrationKey: 'water_carafe' },
    { id: 'fb-pt-3', language: 'pt', foreign: 'o pão', english: 'the bread', phonetic: 'oo POWN', illustrationKey: 'warm_bread' },
    { id: 'fb-pt-4', language: 'pt', foreign: 'o gato', english: 'the cat', phonetic: 'oo GAH-too', illustrationKey: 'cozy_cat' },
    { id: 'fb-pt-5', language: 'pt', foreign: 'a maçã', english: 'the apple', phonetic: 'ah mah-SAHN', illustrationKey: 'fresh_apple' },
    { id: 'fb-pt-6', language: 'pt', foreign: 'o sol', english: 'the sun', phonetic: 'oo SOHL', illustrationKey: 'morning_sun' },
    { id: 'fb-pt-7', language: 'pt', foreign: 'a lua', english: 'the moon', phonetic: 'ah LOO-ah', illustrationKey: 'crescent_moon' },
    { id: 'fb-pt-8', language: 'pt', foreign: 'o trem', english: 'the train', phonetic: 'oo TRENG', illustrationKey: 'express_train' },
  ],
  en: [
    { id: 'fb-en-1', language: 'en', foreign: 'Hello!', english: 'Friendly greeting wave', phonetic: 'heh-LOH', illustrationKey: 'wave_hello' },
    { id: 'fb-en-2', language: 'en', foreign: 'fresh water', english: 'Cool clear drink in a pitcher', phonetic: 'fresh WAW-ter', illustrationKey: 'water_carafe' },
    { id: 'fb-en-3', language: 'en', foreign: 'warm bread', english: 'Toasty loaf from the bakery', phonetic: 'worm bred', illustrationKey: 'warm_bread' },
    { id: 'fb-en-4', language: 'en', foreign: 'the cozy cat', english: 'Purring whiskered nap buddy', phonetic: 'thuh KOH-zee kat', illustrationKey: 'cozy_cat' },
    { id: 'fb-en-5', language: 'en', foreign: 'crisp apple', english: 'Crunchy red orchard fruit', phonetic: 'krisp AP-uhl', illustrationKey: 'fresh_apple' },
    { id: 'fb-en-6', language: 'en', foreign: 'bright sun', english: 'Golden daytime star in the sky', phonetic: 'bryt sun', illustrationKey: 'morning_sun' },
    { id: 'fb-en-7', language: 'en', foreign: 'crescent moon', english: 'Silver night-sky lantern curve', phonetic: 'KRES-uhnt moon', illustrationKey: 'crescent_moon' },
    { id: 'fb-en-8', language: 'en', foreign: 'express train', english: 'Fast railway ride on steel tracks', phonetic: 'ik-SPRES trayn', illustrationKey: 'express_train' },
  ],
  zh: [
    { id: 'fb-zh-1', language: 'zh', foreign: '你好', english: 'hello', phonetic: 'NEE how', romanized: 'nǐ hǎo', illustrationKey: 'wave_hello' },
    { id: 'fb-zh-2', language: 'zh', foreign: '水', english: 'water', phonetic: 'shway', romanized: 'shuǐ', illustrationKey: 'water_carafe' },
    { id: 'fb-zh-3', language: 'zh', foreign: '面包', english: 'bread', phonetic: 'myen-BOW', romanized: 'miànbāo', illustrationKey: 'warm_bread' },
    { id: 'fb-zh-4', language: 'zh', foreign: '小猫', english: 'little cat', phonetic: 'shyow mow', romanized: 'xiǎo māo', illustrationKey: 'cozy_cat' },
    { id: 'fb-zh-5', language: 'zh', foreign: '苹果', english: 'apple', phonetic: 'ping-GWOH', romanized: 'píngguǒ', illustrationKey: 'fresh_apple' },
    { id: 'fb-zh-6', language: 'zh', foreign: '太阳', english: 'the sun', phonetic: 'tye-yahng', romanized: 'tàiyáng', illustrationKey: 'morning_sun' },
    { id: 'fb-zh-7', language: 'zh', foreign: '月亮', english: 'the moon', phonetic: 'yweh-lyahng', romanized: 'yuèliang', illustrationKey: 'crescent_moon' },
    { id: 'fb-zh-8', language: 'zh', foreign: '火车', english: 'train', phonetic: 'hwoh-chuh', romanized: 'huǒchē', illustrationKey: 'express_train' },
  ],
  ja: [
    { id: 'fb-ja-1', language: 'ja', foreign: 'こんにちは', english: 'hello', phonetic: 'kohn-nee-chee-wah', romanized: 'konnichiwa', illustrationKey: 'wave_hello' },
    { id: 'fb-ja-2', language: 'ja', foreign: 'みず', english: 'water', phonetic: 'mee-zoo', romanized: 'mizu', illustrationKey: 'water_carafe' },
    { id: 'fb-ja-3', language: 'ja', foreign: 'パン', english: 'bread', phonetic: 'pahn', romanized: 'pan', illustrationKey: 'warm_bread' },
    { id: 'fb-ja-4', language: 'ja', foreign: 'ねこ', english: 'cat', phonetic: 'neh-koh', romanized: 'neko', illustrationKey: 'cozy_cat' },
    { id: 'fb-ja-5', language: 'ja', foreign: 'りんご', english: 'apple', phonetic: 'reen-goh', romanized: 'ringo', illustrationKey: 'fresh_apple' },
    { id: 'fb-ja-6', language: 'ja', foreign: 'たいよう', english: 'the sun', phonetic: 'tye-yoh', romanized: 'taiyō', illustrationKey: 'morning_sun' },
    { id: 'fb-ja-7', language: 'ja', foreign: 'つき', english: 'the moon', phonetic: 'tsoo-kee', romanized: 'tsuki', illustrationKey: 'crescent_moon' },
    { id: 'fb-ja-8', language: 'ja', foreign: 'でんしゃ', english: 'train', phonetic: 'dehn-shah', romanized: 'densha', illustrationKey: 'express_train' },
  ],
  hi: [
    { id: 'fb-hi-1', language: 'hi', foreign: 'नमस्ते', english: 'hello', phonetic: 'nah-mahs-TEH', romanized: 'namaste', illustrationKey: 'wave_hello' },
    { id: 'fb-hi-2', language: 'hi', foreign: 'पानी', english: 'water', phonetic: 'PAH-nee', romanized: 'paani', illustrationKey: 'water_carafe' },
    { id: 'fb-hi-3', language: 'hi', foreign: 'रोटी', english: 'bread', phonetic: 'ROH-tee', romanized: 'roti', illustrationKey: 'warm_bread' },
    { id: 'fb-hi-4', language: 'hi', foreign: 'बिल्ली', english: 'cat', phonetic: 'BIL-lee', romanized: 'billi', illustrationKey: 'cozy_cat' },
    { id: 'fb-hi-5', language: 'hi', foreign: 'सेब', english: 'apple', phonetic: 'SEHB', romanized: 'seb', illustrationKey: 'fresh_apple' },
    { id: 'fb-hi-6', language: 'hi', foreign: 'सूरज', english: 'the sun', phonetic: 'SOO-raj', romanized: 'sooraj', illustrationKey: 'morning_sun' },
    { id: 'fb-hi-7', language: 'hi', foreign: 'चाँद', english: 'the moon', phonetic: 'CHAHND', romanized: 'chaand', illustrationKey: 'crescent_moon' },
    { id: 'fb-hi-8', language: 'hi', foreign: 'रेलगाड़ी', english: 'train', phonetic: 'rehl-GAH-ree', romanized: 'relgaadi', illustrationKey: 'express_train' },
  ],
  bn: [
    { id: 'fb-bn-1', language: 'bn', foreign: 'নমস্কার', english: 'hello', phonetic: 'noh-mohsh-KAR', romanized: 'nomoshkar', illustrationKey: 'wave_hello' },
    { id: 'fb-bn-2', language: 'bn', foreign: 'জল', english: 'water', phonetic: 'JOHL', romanized: 'jol', illustrationKey: 'water_carafe' },
    { id: 'fb-bn-3', language: 'bn', foreign: 'রুটি', english: 'bread', phonetic: 'ROO-tee', romanized: 'ruti', illustrationKey: 'warm_bread' },
    { id: 'fb-bn-4', language: 'bn', foreign: 'বিড়াল', english: 'cat', phonetic: 'bee-RAHL', romanized: 'biral', illustrationKey: 'cozy_cat' },
    { id: 'fb-bn-5', language: 'bn', foreign: 'আপেল', english: 'apple', phonetic: 'ah-PEL', romanized: 'apel', illustrationKey: 'fresh_apple' },
    { id: 'fb-bn-6', language: 'bn', foreign: 'সূর্য', english: 'the sun', phonetic: 'SHOOR-joh', romanized: 'shurjo', illustrationKey: 'morning_sun' },
    { id: 'fb-bn-7', language: 'bn', foreign: 'চাঁদ', english: 'the moon', phonetic: 'CHAHND', romanized: 'chaand', illustrationKey: 'crescent_moon' },
    { id: 'fb-bn-8', language: 'bn', foreign: 'ট্রেন', english: 'train', phonetic: 'TREN', romanized: 'tren', illustrationKey: 'express_train' },
  ],
  ar: [
    { id: 'fb-ar-1', language: 'ar', foreign: 'مرحباً', english: 'hello', phonetic: 'mar-HA-ban', romanized: 'marḥaban', illustrationKey: 'wave_hello' },
    { id: 'fb-ar-2', language: 'ar', foreign: 'الماء', english: 'the water', phonetic: 'al-MAA', romanized: "al-mā'", illustrationKey: 'water_carafe' },
    { id: 'fb-ar-3', language: 'ar', foreign: 'الخبز', english: 'the bread', phonetic: 'al-KHUBZ', romanized: 'al-khubz', illustrationKey: 'warm_bread' },
    { id: 'fb-ar-4', language: 'ar', foreign: 'القط', english: 'the cat', phonetic: 'al-QITT', romanized: 'al-qiṭṭ', illustrationKey: 'cozy_cat' },
    { id: 'fb-ar-5', language: 'ar', foreign: 'التفاحة', english: 'the apple', phonetic: 'at-tuf-FAA-ha', romanized: 'at-tuffāḥah', illustrationKey: 'fresh_apple' },
    { id: 'fb-ar-6', language: 'ar', foreign: 'الشمس', english: 'the sun', phonetic: 'ash-SHAMS', romanized: 'ash-shams', illustrationKey: 'morning_sun' },
    { id: 'fb-ar-7', language: 'ar', foreign: 'القمر', english: 'the moon', phonetic: 'al-QA-mar', romanized: 'al-qamar', illustrationKey: 'crescent_moon' },
    { id: 'fb-ar-8', language: 'ar', foreign: 'القطار', english: 'the train', phonetic: 'al-qi-TAAR', romanized: 'al-qiṭār', illustrationKey: 'express_train' },
  ],
  arz: [
    { id: 'fb-arz-1', language: 'arz', foreign: 'إزيك', english: 'how are you?', phonetic: 'ez-ZAY-yak', romanized: 'izzayyak', illustrationKey: 'wave_hello' },
    { id: 'fb-arz-2', language: 'arz', foreign: 'صباح الفل', english: 'bright morning', phonetic: 'sa-BAH el-FULL', romanized: 'sabah el-full', illustrationKey: 'morning_sun' },
    { id: 'fb-arz-3', language: 'arz', foreign: 'مية', english: 'water', phonetic: 'MAY-ya', romanized: 'mayya', illustrationKey: 'water_carafe' },
    { id: 'fb-arz-4', language: 'arz', foreign: 'عيش', english: 'bread', phonetic: 'AYSH', romanized: 'eish', illustrationKey: 'warm_bread' },
    { id: 'fb-arz-5', language: 'arz', foreign: 'جبنة', english: 'cheese', phonetic: 'GEB-na', romanized: 'gebna', illustrationKey: 'golden_cheese' },
    { id: 'fb-arz-6', language: 'arz', foreign: 'قطة', english: 'cat', phonetic: 'OT-ta', romanized: 'otta', illustrationKey: 'cozy_cat' },
    { id: 'fb-arz-7', language: 'arz', foreign: 'قطر', english: 'train', phonetic: 'ATR', romanized: 'atr', illustrationKey: 'express_train' },
    { id: 'fb-arz-8', language: 'arz', foreign: 'شاطر', english: 'great job', phonetic: 'SHA-ter', romanized: 'shater', illustrationKey: 'starlight_trophy' },
  ],
  ru: [
    { id: 'fb-ru-1', language: 'ru', foreign: 'привет', english: 'hello', phonetic: 'pree-VYET', romanized: 'privet', illustrationKey: 'wave_hello' },
    { id: 'fb-ru-2', language: 'ru', foreign: 'вода', english: 'water', phonetic: 'vah-DAH', romanized: 'voda', illustrationKey: 'water_carafe' },
    { id: 'fb-ru-3', language: 'ru', foreign: 'хлеб', english: 'bread', phonetic: 'KHLEP', romanized: 'khleb', illustrationKey: 'warm_bread' },
    { id: 'fb-ru-4', language: 'ru', foreign: 'кошка', english: 'cat', phonetic: 'KOHSH-kah', romanized: 'koshka', illustrationKey: 'cozy_cat' },
    { id: 'fb-ru-5', language: 'ru', foreign: 'яблоко', english: 'apple', phonetic: 'YAH-blah-kah', romanized: 'yabloko', illustrationKey: 'fresh_apple' },
    { id: 'fb-ru-6', language: 'ru', foreign: 'солнце', english: 'the sun', phonetic: 'SOHN-tseh', romanized: 'solntse', illustrationKey: 'morning_sun' },
    { id: 'fb-ru-7', language: 'ru', foreign: 'луна', english: 'the moon', phonetic: 'loo-NAH', romanized: 'luna', illustrationKey: 'crescent_moon' },
    { id: 'fb-ru-8', language: 'ru', foreign: 'поезд', english: 'train', phonetic: 'POH-yest', romanized: 'poyezd', illustrationKey: 'express_train' },
  ],
  id: [
    { id: 'fb-id-1', language: 'id', foreign: 'halo', english: 'hello', phonetic: 'HAH-loh', illustrationKey: 'wave_hello' },
    { id: 'fb-id-2', language: 'id', foreign: 'air', english: 'water', phonetic: 'AH-eer', illustrationKey: 'water_carafe' },
    { id: 'fb-id-3', language: 'id', foreign: 'roti', english: 'bread', phonetic: 'ROH-tee', illustrationKey: 'warm_bread' },
    { id: 'fb-id-4', language: 'id', foreign: 'kucing', english: 'cat', phonetic: 'KOO-ching', illustrationKey: 'cozy_cat' },
    { id: 'fb-id-5', language: 'id', foreign: 'apel', english: 'apple', phonetic: 'AH-pel', illustrationKey: 'fresh_apple' },
    { id: 'fb-id-6', language: 'id', foreign: 'matahari', english: 'the sun', phonetic: 'mah-tah-HAH-ree', illustrationKey: 'morning_sun' },
    { id: 'fb-id-7', language: 'id', foreign: 'bulan', english: 'the moon', phonetic: 'BOO-lahn', illustrationKey: 'crescent_moon' },
    { id: 'fb-id-8', language: 'id', foreign: 'kereta api', english: 'train', phonetic: 'keh-REH-tah AH-pee', illustrationKey: 'express_train' },
  ],
  vi: [
    { id: 'fb-vi-1', language: 'vi', foreign: 'xin chào', english: 'hello', phonetic: 'seen chow', illustrationKey: 'wave_hello' },
    { id: 'fb-vi-2', language: 'vi', foreign: 'nước', english: 'water', phonetic: 'nuh-uhk', illustrationKey: 'water_carafe' },
    { id: 'fb-vi-3', language: 'vi', foreign: 'bánh mì', english: 'bread', phonetic: 'bahn mee', illustrationKey: 'warm_bread' },
    { id: 'fb-vi-4', language: 'vi', foreign: 'con mèo', english: 'cat', phonetic: 'kohn meh-oh', illustrationKey: 'cozy_cat' },
    { id: 'fb-vi-5', language: 'vi', foreign: 'quả táo', english: 'apple', phonetic: 'kwah tow', illustrationKey: 'fresh_apple' },
    { id: 'fb-vi-6', language: 'vi', foreign: 'mặt trời', english: 'the sun', phonetic: 'maht choy', illustrationKey: 'morning_sun' },
    { id: 'fb-vi-7', language: 'vi', foreign: 'mặt trăng', english: 'the moon', phonetic: 'maht chahng', illustrationKey: 'crescent_moon' },
    { id: 'fb-vi-8', language: 'vi', foreign: 'tàu hỏa', english: 'train', phonetic: 'tow hwah', illustrationKey: 'express_train' },
  ],
  sw: [
    { id: 'fb-sw-1', language: 'sw', foreign: 'jambo', english: 'hello', phonetic: 'JAHM-boh', illustrationKey: 'wave_hello' },
    { id: 'fb-sw-2', language: 'sw', foreign: 'maji', english: 'water', phonetic: 'MAH-jee', illustrationKey: 'water_carafe' },
    { id: 'fb-sw-3', language: 'sw', foreign: 'mkate', english: 'bread', phonetic: 'mm-KAH-teh', illustrationKey: 'warm_bread' },
    { id: 'fb-sw-4', language: 'sw', foreign: 'paka', english: 'cat', phonetic: 'PAH-kah', illustrationKey: 'cozy_cat' },
    { id: 'fb-sw-5', language: 'sw', foreign: 'tofaa', english: 'apple', phonetic: 'toh-FAH-ah', illustrationKey: 'fresh_apple' },
    { id: 'fb-sw-6', language: 'sw', foreign: 'jua', english: 'the sun', phonetic: 'JOO-ah', illustrationKey: 'morning_sun' },
    { id: 'fb-sw-7', language: 'sw', foreign: 'mwezi', english: 'the moon', phonetic: 'MWEH-zee', illustrationKey: 'crescent_moon' },
    { id: 'fb-sw-8', language: 'sw', foreign: 'treni', english: 'train', phonetic: 'TREH-nee', illustrationKey: 'express_train' },
  ],
  ebonics: [
    {
      id: 'fb-eb-1',
      language: 'ebonics',
      foreign: "What's good?",
      english: "How's it going, buddy?",
      phonetic: 'wuhts GOOD',
      illustrationKey: 'wave_hello',
      exampleForeign: "Yo fam, what's good at the cookout?",
      exampleEnglish: "Hey friend, how's everything going at the barbecue?",
      examplePhonetic: 'yoh fam, wuhts GOOD at thuh COOK-owt',
      plainEnglish: 'Hello, how are you doing today?',
    },
    {
      id: 'fb-eb-2',
      language: 'ebonics',
      foreign: 'No cap',
      english: 'Honestly, for real',
      phonetic: 'noh KAP',
      illustrationKey: 'thumbs_yes',
      exampleForeign: 'That playlist was fire, no cap!',
      exampleEnglish: 'Those songs were genuinely terrific!',
      examplePhonetic: 'that PLAY-list wuz FYR, noh KAP',
      plainEnglish: 'I am telling the complete truth without exaggeration.',
    },
    {
      id: 'fb-eb-3',
      language: 'ebonics',
      foreign: 'Say less',
      english: 'Sounds like a plan!',
      phonetic: 'say LESS',
      illustrationKey: 'friendly_handshake',
      exampleForeign: 'You bringing plates? Say less, I got you.',
      exampleEnglish: 'Bringing tableware? Consider it handled!',
      examplePhonetic: 'yoo BRING-in playts? say LESS, y gaht yoo',
      plainEnglish: 'I understand completely and agree to the plan.',
    },
    {
      id: 'fb-eb-4',
      language: 'ebonics',
      foreign: 'Low-key',
      english: 'Quietly kinda nice',
      phonetic: 'LOH-kee',
      illustrationKey: 'calm_lotus',
      exampleForeign: "I'm low-key excited for Sunday dinner.",
      exampleEnglish: "I'm subtly looking forward to dinner on Sunday.",
      examplePhonetic: 'ym LOH-kee ik-SY-ted for SUN-day DIN-er',
      plainEnglish: 'Secretly, modestly, or to a moderate degree.',
    },
    {
      id: 'fb-eb-5',
      language: 'ebonics',
      foreign: 'My bad',
      english: 'Whoopsie-daisy, sorry!',
      phonetic: 'my BAD',
      illustrationKey: 'helping_hands',
      exampleForeign: 'Oh, my bad, I spilled the punch!',
      exampleEnglish: 'Oh dear, pardon me for tipping the beverage!',
      examplePhonetic: 'oh, my BAD, y spild thuh punch',
      plainEnglish: 'I apologize; that mistake was my fault.',
    },
    {
      id: 'fb-eb-6',
      language: 'ebonics',
      foreign: "I'm dead",
      english: 'That is hilarious!',
      phonetic: 'ym DED',
      illustrationKey: 'happy_smile',
      exampleForeign: "Wait till you see that clip, I'm dead!",
      exampleEnglish: 'Just wait until you see that video, what a hoot!',
      examplePhonetic: 'wayt til yoo see that klip, ym DED',
      plainEnglish: 'I find that extremely funny.',
    },
    {
      id: 'fb-eb-7',
      language: 'ebonics',
      foreign: 'Finna bounce',
      english: 'About to head out',
      phonetic: 'FIN-uh BOWNSS',
      illustrationKey: 'explorer_boots',
      exampleForeign: 'Traffic picking up, so we finna bounce soon.',
      exampleEnglish: 'Commute is building, so we are heading off shortly.',
      examplePhonetic: 'TRAF-ik PIK-in up, soh wee FIN-uh BOWNSS soon',
      plainEnglish: 'I am preparing to leave very soon.',
    },
    {
      id: 'fb-eb-8',
      language: 'ebonics',
      foreign: "Bussin'",
      english: 'Remarkably scrumptious!',
      phonetic: 'BUH-sin',
      illustrationKey: 'delicious_sparkles',
      exampleForeign: "Grandma's peach cobbler is straight bussin' today!",
      exampleEnglish: "Nana's baked fruit dessert is out of this world!",
      examplePhonetic: 'GRAN-mahz peech KAHB-ler iz strayt BUH-sin tuh-DAY',
      plainEnglish: 'This food tastes exceptionally good.',
    },
  ],
  suburban: [
    {
      id: 'fb-sb-1',
      language: 'suburban',
      foreign: 'Howdy, neighbor!',
      english: "What's good, fam?",
      phonetic: 'HOW-dee NAY-ber',
      illustrationKey: 'wave_hello',
      exampleForeign: 'Howdy, neighbor, lovely morning for mowing!',
      exampleEnglish: "What's good, fam, sun out early for the yard!",
      examplePhonetic: 'HOW-dee NAY-ber, LUV-lee MOR-ning for MOH-ing',
      plainEnglish: 'Hello, friendly person who lives nearby.',
    },
    {
      id: 'fb-sb-2',
      language: 'suburban',
      foreign: 'Living the dream',
      english: "Out here survivin'",
      phonetic: 'LIV-ing thuh DREEM',
      illustrationKey: 'sunny_weather',
      exampleForeign: 'Just out here living the dream on a Tuesday.',
      exampleEnglish: "Man, I'm just tryna make it through Tuesday.",
      examplePhonetic: 'just owt heer LIV-ing thuh DREEM on uh TOOZ-day',
      plainEnglish: 'I am enduring a routine workday with polite optimism.',
    },
    {
      id: 'fb-sb-3',
      language: 'suburban',
      foreign: "Let's circle back",
      english: "We gon' revisit that",
      phonetic: 'lets SER-kul BAK',
      illustrationKey: 'compass_map',
      exampleForeign: "Great thought, let's circle back after lunch.",
      exampleEnglish: "Bet, we gon' run that back after we eat.",
      examplePhonetic: 'grayt thawt, lets SER-kul BAK AF-ter lunch',
      plainEnglish: 'Let us discuss this topic again later.',
    },
    {
      id: 'fb-sb-4',
      language: 'suburban',
      foreign: 'Ope, scoot past ya',
      english: 'My bad, tryna slide thru',
      phonetic: 'ohp SKOOT past yuh',
      illustrationKey: 'direction_left_right',
      exampleForeign: 'Ope, scoot past ya right quick to grab ranch.',
      exampleEnglish: 'My bad, let me squeeze right past for the sauce.',
      examplePhonetic: 'ohp SKOOT past yuh ryt kwik too grab ranch',
      plainEnglish: 'Excuse me while I walk past you in a narrow space.',
    },
    {
      id: 'fb-sb-5',
      language: 'suburban',
      foreign: 'That hits the spot',
      english: "That right there is bussin'",
      phonetic: 'that HITS thuh SPAHT',
      illustrationKey: 'delicious_sparkles',
      exampleForeign: 'Sparkling seltzer on the deck? That hits the spot!',
      exampleEnglish: 'Cold fizzy drink on the porch? Straight bussin!',
      examplePhonetic: 'SPARK-ling SELT-ser on thuh dek? that HITS thuh SPAHT',
      plainEnglish: 'This snack or drink is very satisfying right now.',
    },
    {
      id: 'fb-sb-6',
      language: 'suburban',
      foreign: 'Well, would ya look at that',
      english: "Bruh, you seein' this?",
      phonetic: 'wel WOOD yuh LOOK at that',
      illustrationKey: 'magnifying_discovery',
      exampleForeign: 'Well, would ya look at that lawn striping!',
      exampleEnglish: 'Bruh, check out how clean that yard cut is!',
      examplePhonetic: 'wel WOOD yuh LOOK at that lawn STRY-ping',
      plainEnglish: 'That is a mild surprise worth observing.',
    },
    {
      id: 'fb-sb-7',
      language: 'suburban',
      foreign: 'Time to hit the hay',
      english: "I'm 'bout to crash",
      phonetic: 'tym too HIT thuh HAY',
      illustrationKey: 'cozy_bed',
      exampleForeign: 'Early tee time tomorrow, time to hit the hay.',
      exampleEnglish: "Got an early morning, I'm 'bout to crash.",
      examplePhonetic: 'ER-lee tee tym tuh-MAR-oh, tym too HIT thuh HAY',
      plainEnglish: 'It is late and I am going to sleep now.',
    },
    {
      id: 'fb-sb-8',
      language: 'suburban',
      foreign: 'No worries at all, sport!',
      english: 'You straight, my guy!',
      phonetic: 'noh WUR-eez at AWL sport',
      illustrationKey: 'friendly_handshake',
      exampleForeign: 'No worries at all, sport, happens to the best!',
      exampleEnglish: 'You straight, my guy, everybody slips up!',
      examplePhonetic: 'noh WUR-eez at AWL sport, HAP-enz too thuh best',
      plainEnglish: 'Do not worry about that minor mistake; everything is fine.',
    },
  ],
  corp_trades: [
    {
      id: 'fb-ct-1',
      language: 'corp_trades',
      foreign: "Let's circle back",
      english: "We ain't touchin' that today",
      phonetic: 'lets SER-kul bak',
      illustrationKey: 'compass_map',
      exampleForeign: "Let's circle back after lunch on this trench.",
      exampleEnglish: "We ain't touchin' that ditch before noon, boss.",
      examplePhonetic: 'lets SER-kul bak AF-ter lunch on this trench',
      plainEnglish: 'We are postponing this task until an unspecified later date.',
    },
    {
      id: 'fb-ct-2',
      language: 'corp_trades',
      foreign: 'Bandwidth is tight',
      english: "My crew's already slammed",
      phonetic: 'BAND-with iz tyt',
      illustrationKey: 'calendar_milestone',
      exampleForeign: 'Honestly, my bandwidth is tight till Friday afternoon.',
      exampleEnglish: "Honestly, my crew's slammed till Friday quittin' time.",
      examplePhonetic: 'AH-nest-lee, my BAND-with iz tyt til FRY-day',
      plainEnglish: 'Everyone here already has too much work to take on more.',
    },
    {
      id: 'fb-ct-3',
      language: 'corp_trades',
      foreign: 'Synergize cross-functionally',
      english: 'Help the sparkies haul wire',
      phonetic: 'SIN-er-jyz kross-FUNK-shun-uh-lee',
      illustrationKey: 'helping_hands',
      exampleForeign: 'Can we synergize cross-functionally by the breaker box?',
      exampleEnglish: "Can y'all help the electricians pull wire today?",
      examplePhonetic: 'kan wee SIN-er-jyz by thuh BRAY-ker boks',
      plainEnglish: 'Different teams need to help each other finish the physical job.',
    },
    {
      id: 'fb-ct-4',
      language: 'corp_trades',
      foreign: 'Quick EOD touchpoint',
      english: 'Four-forty-five tailgate gripe',
      phonetic: 'kwik ee-oh-dee TUCH-poynt',
      illustrationKey: 'lightning_wit',
      exampleForeign: 'Sending a quick EOD touchpoint before you pack tools.',
      exampleEnglish: 'Gonna corner ya by the truck before shift ends.',
      examplePhonetic: 'SEND-ing uh kwik ee-oh-dee TUCH-poynt',
      plainEnglish: 'A brief end-of-day conversation right before everyone goes home.',
    },
    {
      id: 'fb-ct-5',
      language: 'corp_trades',
      foreign: 'Suboptimal deliverable',
      english: 'This drywall looks crooked',
      phonetic: 'sub-AHP-tuh-mul dih-LIV-er-uh-bul',
      illustrationKey: 'architect_blueprint',
      exampleForeign: 'Folks, this wall feels like a suboptimal deliverable.',
      exampleEnglish: "Boys, this sheetrock's wavy as a country road.",
      examplePhonetic: 'fawks, this wawl iz uh sub-AHP-tuh-mul dih-LIV-er-uh-bul',
      plainEnglish: 'The finished work does not meet quality standards and needs repair.',
    },
    {
      id: 'fb-ct-6',
      language: 'corp_trades',
      foreign: 'Unpack the core ask',
      english: 'Just tell me what broke',
      phonetic: 'un-PAK thuh kor ask',
      illustrationKey: 'magnifying_discovery',
      exampleForeign: "Let's unpack the core ask before we order lumber.",
      exampleEnglish: 'Quit the riddle and say which pipe busted.',
      examplePhonetic: 'lets un-PAK thuh kor ask bih-FOR lum-ber',
      plainEnglish: 'Please state the main problem or request in simple terms.',
    },
    {
      id: 'fb-ct-7',
      language: 'corp_trades',
      foreign: 'Retention pizza morale',
      english: 'Cold pepperoni instead of overtime',
      phonetic: 'rih-TEN-shun PEET-zuh mor-AL',
      illustrationKey: 'golden_cheese',
      exampleForeign: "HR approved retention pizza morale for Saturday's pour.",
      exampleEnglish: 'Front office bought two pies instead of raise money.',
      examplePhonetic: 'aych-ahr uh-PROOVD rih-TEN-shun PEET-zuh mor-AL',
      plainEnglish: 'Management bought inexpensive pizza instead of offering higher pay.',
    },
    {
      id: 'fb-ct-8',
      language: 'corp_trades',
      foreign: 'Take this offline',
      english: 'Meet me by the toolbox',
      phonetic: 'tayk this AWF-lyn',
      illustrationKey: 'debate_podium',
      exampleForeign: "Great pushback, let's take this offline near loading bay.",
      exampleEnglish: "Cool speech, come talk by the trailer where it's quiet.",
      examplePhonetic: 'grayt PUSH-bak, lets tayk this AWF-lyn',
      plainEnglish: 'Let us continue this disagreement privately after the group meeting.',
    },
  ],
  midwest_northeast: [
    {
      id: 'fb-mn-1',
      language: 'midwest_northeast',
      foreign: 'Ope, sneak right past ya',
      english: 'Move it or lose it, pal!',
      phonetic: 'ohp, sneek ryt past yuh',
      illustrationKey: 'direction_left_right',
      exampleForeign: 'Ope, sneak right past ya for the last bagel!',
      exampleEnglish: "Yo, out the way—I'm grabbin' that everything bagel!",
      examplePhonetic: 'ohp, sneek ryt past yuh for thuh last BAY-gul',
      plainEnglish: 'Excuse me, please step aside so I can pass through.',
    },
    {
      id: 'fb-mn-2',
      language: 'midwest_northeast',
      foreign: 'Welp, interesting parking job',
      english: 'Who taught ya, a pigeon?',
      phonetic: 'welp, IN-tres-ting PAR-king jahb',
      illustrationKey: 'express_train',
      exampleForeign: 'Welp, interesting parking job across two whole spaces!',
      exampleEnglish: "Are you kiddin' me across the crosswalk? Fuggedaboutit!",
      examplePhonetic: 'welp, IN-tres-ting PAR-king jahb uh-KROSS too spay-sez',
      plainEnglish: 'Your vehicle is parked very poorly across the painted lines.',
    },
    {
      id: 'fb-mn-3',
      language: 'midwest_northeast',
      foreign: 'Slap knees and say welp',
      english: "I'm walkin' out the door now",
      phonetic: 'slap neez and say welp',
      illustrationKey: 'explorer_boots',
      exampleForeign: 'Time to slap knees and say welp before midnight.',
      exampleEnglish: "Alright, I'm out—catch ya on the avenue!",
      examplePhonetic: 'tym too slap neez and say welp bih-FOR MID-nyt',
      plainEnglish: 'I am announcing politely that it is finally time for me to leave.',
    },
    {
      id: 'fb-mn-4',
      language: 'midwest_northeast',
      foreign: "That's different",
      english: 'Fuggedaboutit, total garbage',
      phonetic: 'thats DIF-er-ent',
      illustrationKey: 'gentle_no',
      exampleForeign: "Your lukewarm soup? Well, that's different for sure!",
      exampleEnglish: 'This lukewarm soup is dead to me, fuggedaboutit!',
      examplePhonetic: 'wel, thats DIF-er-ent for shur',
      plainEnglish: 'I really dislike this dish and will not eat it again.',
    },
    {
      id: 'fb-mn-5',
      language: 'midwest_northeast',
      foreign: 'You betcha, no trouble!',
      english: "Done deal, stop yappin'!",
      phonetic: 'yoo BECH-uh, noh TRUB-ul',
      illustrationKey: 'friendly_handshake',
      exampleForeign: 'You betcha, no trouble hauling three coolers up!',
      exampleEnglish: "Consider it done, quit sayin' thank you already!",
      examplePhonetic: 'yoo BECH-uh, noh TRUB-ul HAW-ling three KOO-lerz',
      plainEnglish: 'You are welcome; I was happy to help without any fuss.',
    },
    {
      id: 'fb-mn-6',
      language: 'midwest_northeast',
      foreign: 'No, you go ahead first',
      english: "Hit the gas or I'm honkin'!",
      phonetic: 'noh, yoo goh uh-HED ferst',
      illustrationKey: 'city_park',
      exampleForeign: 'At this four-way stop, no, you go ahead first!',
      exampleEnglish: "It's your right-of-way, pal—step on the pedal!",
      examplePhonetic: 'at this four-way stahp, noh yoo goh uh-HED ferst',
      plainEnglish: 'Please drive through the intersection now because it is your turn.',
    },
    {
      id: 'fb-mn-7',
      language: 'midwest_northeast',
      foreign: 'Brought ya some hotdish',
      english: 'Grabbed bagels and schmear',
      phonetic: 'brawt yuh sum HAHT-dish',
      illustrationKey: 'warm_bread',
      exampleForeign: 'Popped over and brought ya some hotdish in foil!',
      exampleEnglish: 'Stopped by the deli and grabbed bagels and schmear!',
      examplePhonetic: 'pahpt OH-ver and brawt yuh sum HAHT-dish',
      plainEnglish: 'I brought over some comforting homemade food to share.',
    },
    {
      id: 'fb-mn-8',
      language: 'midwest_northeast',
      foreign: "Oh, it's just a breeze",
      english: "Freezin' my face off on 8th",
      phonetic: 'oh, its just uh breez',
      illustrationKey: 'winter_coat',
      exampleForeign: "Wind off Lake Superior? Oh, it's just a breeze!",
      exampleEnglish: "Ten degrees on the corner—my ears are fallin' off!",
      examplePhonetic: 'wind awf layk soo-PEER-ee-er? oh, its just uh breez',
      plainEnglish: 'The outdoor wind is extremely cold today.',
    },
  ],
  south_genz: [
    {
      id: 'fb-sg-1',
      language: 'south_genz',
      foreign: 'Well bless his heart',
      english: 'Bro is cooked, zero aura',
      phonetic: 'wel bles hiz hart',
      illustrationKey: 'theater_comedy_masks',
      exampleForeign: 'Well bless his heart, he tried parallel parking again.',
      exampleEnglish: 'Bro lost a thousand aura points on that curb, no cap.',
      examplePhonetic: 'wel bles hiz hart, hee tryd PAR-uh-lel PAR-king',
      plainEnglish: 'He tried his best, though the result was quite unfortunate.',
    },
    {
      id: 'fb-sg-2',
      language: 'south_genz',
      foreign: "Ain't that just precious",
      english: 'Lowkey cringe NPC behavior',
      phonetic: 'aynt that just PRESH-us',
      illustrationKey: 'clever_fox_lantern',
      exampleForeign: "Livestreaming in line? Ain't that just precious, sugar!",
      exampleEnglish: 'Doing TikTok dances in the aisle is straight NPC behavior!',
      examplePhonetic: 'aynt that just PRESH-us, SHUG-er',
      plainEnglish: 'That public behavior is embarrassing and socially awkward.',
    },
    {
      id: 'fb-sg-3',
      language: 'south_genz',
      foreign: 'Sweet as sugar pie',
      english: 'Main-character energy, respectfully',
      phonetic: 'sweet az SHUG-er py',
      illustrationKey: 'ceremonial_tea_set',
      exampleForeign: "Bring that pitcher, you're sweet as sugar pie today!",
      exampleEnglish: "Respectfully, you're eating with that sweet tea drip!",
      examplePhonetic: 'yur sweet az SHUG-er py tuh-DAY',
      plainEnglish: 'You are being remarkably charming and confident today.',
    },
    {
      id: 'fb-sg-4',
      language: 'south_genz',
      foreign: 'Hold my sweet tea',
      english: 'Watch me cook, no cap',
      phonetic: 'hohld my sweet tee',
      illustrationKey: 'lightning_wit',
      exampleForeign: 'Hold my sweet tea while I settle this casserole!',
      exampleEnglish: 'Wait, let me cook real quick, respectfully!',
      examplePhonetic: 'hohld my sweet tee wyl eye SET-ul this',
      plainEnglish: 'Stand back and watch while I handle this situation myself.',
    },
    {
      id: 'fb-sg-5',
      language: 'south_genz',
      foreign: "That dog won't hunt",
      english: "Chat, that's straight delulu",
      phonetic: 'that dawg wohnt hunt',
      illustrationKey: 'playful_dog',
      exampleForeign: "Lukewarm biscuits? Honey, that dog won't hunt!",
      exampleEnglish: 'Chat, that take is straight delulu and ratioed!',
      examplePhonetic: 'HUN-ee, that dawg wohnt hunt',
      plainEnglish: 'That proposal is unrealistic and will definitely not work.',
    },
    {
      id: 'fb-sg-6',
      language: 'south_genz',
      foreign: "Y'all come sit a spell",
      english: 'Hop in the group-chat lobby',
      phonetic: 'yawl kum sit uh spel',
      illustrationKey: 'cozy_home',
      exampleForeign: "Porch swings are open—y'all come sit a spell!",
      exampleEnglish: 'Hop in the voice call and chill for a sec!',
      examplePhonetic: 'porch swingz ar OH-pen—yawl kum sit uh spel',
      plainEnglish: 'Everyone is welcome to sit down and relax together for a while.',
    },
    {
      id: 'fb-sg-7',
      language: 'south_genz',
      foreign: "Fixin' to go yonder",
      english: 'Finna lock in and dip',
      phonetic: 'FIK-sin too goh YAHN-der',
      illustrationKey: 'see_you_soon',
      exampleForeign: "Grab your sunhat, we're fixin' to go yonder!",
      exampleEnglish: "Bet, we're finna dip to the other spot!",
      examplePhonetic: 'weer FIK-sin too goh YAHN-der',
      plainEnglish: 'We are getting ready to depart for another destination.',
    },
    {
      id: 'fb-sg-8',
      language: 'south_genz',
      foreign: "I'll pray for ya",
      english: "Sending thoughts, you're cooked",
      phonetic: 'yl pray for yuh',
      illustrationKey: 'warm_teacup',
      exampleForeign: "White sneakers in red clay? I'll pray for ya!",
      exampleEnglish: "Zero survival instincts on the timeline, it's over!",
      examplePhonetic: 'wyt SNEE-kerz in red klay? yl pray for yuh',
      plainEnglish: 'You made an unwise decision and I wish you good luck.',
    },
  ],
  cali_country: [
    {
      id: 'fb-cc-1',
      language: 'cali_country',
      foreign: 'My cortisol is spiked',
      english: "I'm plumb tuckered out",
      phonetic: 'my KOR-tih-zawl iz spykt',
      illustrationKey: 'feelings_weather',
      exampleForeign: 'Skipping my oat latte means my cortisol is spiked!',
      exampleEnglish: "Haulin' firewood since dawn got me plumb tuckered out!",
      examplePhonetic: 'my KOR-tih-zawl iz spykt',
      plainEnglish: 'I feel stressed and physically exhausted right now.',
    },
    {
      id: 'fb-cc-2',
      language: 'cali_country',
      foreign: 'Adaptogenic cold-plunge',
      english: "Jumpin' in the icy creek",
      phonetic: 'uh-dap-tuh-JEN-ik kohld-plunj',
      illustrationKey: 'water_carafe',
      exampleForeign: 'Dawn starts with an adaptogenic cold-plunge in Malibu.',
      exampleEnglish: "Wrecked my shins hoppin' in the creek at sunrise!",
      examplePhonetic: 'uh-dap-tuh-JEN-ik kohld-plunj in MAL-uh-boo',
      plainEnglish: 'Submerging oneself briefly in freezing water to feel alert.',
    },
    {
      id: 'fb-cc-3',
      language: 'cali_country',
      foreign: 'Protect my sacred bandwidth',
      english: 'Leave me alone on the porch',
      phonetic: 'pruh-TEKT my SAY-kred BAND-with',
      illustrationKey: 'calm_lotus',
      exampleForeign: 'Please protect my sacred bandwidth until noon breathwork.',
      exampleEnglish: "Don't holler at me till I finish my porch coffee!",
      examplePhonetic: 'pleez pruh-TEKT my SAY-kred BAND-with',
      plainEnglish: 'Please give me quiet personal time without any interruptions.',
    },
    {
      id: 'fb-cc-4',
      language: 'cali_country',
      foreign: 'Holding space for vibes',
      english: "Waitin' on the smoker ribs",
      phonetic: 'HOHL-ding spays for vybz',
      illustrationKey: 'campfire_story',
      exampleForeign: 'We are holding space for vibes by the canyon fire.',
      exampleEnglish: "Just watchin' hickory smoke curl over the tailgate!",
      examplePhonetic: 'wee ar HOHL-ding spays for vybz',
      plainEnglish: 'Sitting calmly together and enjoying the peaceful atmosphere.',
    },
    {
      id: 'fb-cc-5',
      language: 'cali_country',
      foreign: 'Raw-water biohack',
      english: "Drinkin' straight from the spring",
      phonetic: 'raw WAW-ter BY-oh-hak',
      illustrationKey: 'crystal_beaker',
      exampleForeign: 'Paid nineteen bucks for a raw-water biohack bottle!',
      exampleEnglish: "Boy, that's just holler spring water in fancy glass!",
      examplePhonetic: 'payd nyn-teen buks for uh raw WAW-ter BY-oh-hak',
      plainEnglish: 'Drinking untreated natural spring water for perceived health benefits.',
    },
    {
      id: 'fb-cc-6',
      language: 'cali_country',
      foreign: 'Realign your root chakra',
      english: 'Hit it with duct tape',
      phonetic: 'ree-uh-LYN yor root SHAH-kruh',
      illustrationKey: 'sprouting_seedling',
      exampleForeign: 'A sound-bath gong will realign your root chakra fast.',
      exampleEnglish: 'Slap some silver duct tape on that fender and ride!',
      examplePhonetic: 'uh sownd-bath gawng wil ree-uh-LYN yor root SHAH-kruh',
      plainEnglish: 'Apply a quick, practical fix so everything functions smoothly again.',
    },
    {
      id: 'fb-cc-7',
      language: 'cali_country',
      foreign: 'Organic sourdough starter',
      english: "Granny's skillet cornbread",
      phonetic: 'or-GAN-ik SOW-er-doh STAR-ter',
      illustrationKey: 'warm_bread',
      exampleForeign: 'I named my organic sourdough starter after my aura.',
      exampleEnglish: "Nothing beats Granny's cast-iron cornbread with butter!",
      examplePhonetic: 'eye naymd my or-GAN-ik SOW-er-doh STAR-ter',
      plainEnglish: 'Traditional homemade baked bread passed down as a kitchen specialty.',
    },
    {
      id: 'fb-cc-8',
      language: 'cali_country',
      foreign: 'Silent Malibu sound-bath',
      english: 'Listening to creek bullfrogs',
      phonetic: 'SY-lent MAL-uh-boo SOWND-bath',
      illustrationKey: 'sunny_mountain',
      exampleForeign: 'Booked a silent Malibu sound-bath for deep grounding.',
      exampleEnglish: 'We got free bullfrog concerts down by the holler!',
      examplePhonetic: 'bookt uh SY-lent MAL-uh-boo SOWND-bath',
      plainEnglish: 'Sitting quietly outside while listening to soothing ambient sounds.',
    },
  ],
  stoner_tactical: [
    {
      id: 'fb-st-1',
      language: 'stoner_tactical',
      foreign: "Yo, it's all chill",
      english: 'Copy that, perimeter secure',
      phonetic: 'yoh, its awl chil',
      illustrationKey: 'thumbs_yes',
      exampleForeign: "Dropped your deck? Yo, it's all chill, bro!",
      exampleEnglish: 'Copy that, lawn sector alpha is locked and level!',
      examplePhonetic: 'yoh, its awl chil, broh',
      plainEnglish: 'Everything is under control and there is no reason to worry.',
    },
    {
      id: 'fb-st-2',
      language: 'stoner_tactical',
      foreign: 'Late-night taco drive-thru',
      english: 'Execute covert snack extraction',
      phonetic: 'layt-nyt TAH-koh dryv-throo',
      illustrationKey: 'crispy_treat',
      exampleForeign: "Dude, who's down for a late-night taco drive-thru?",
      exampleEnglish: 'Deploy for covert snack extraction at 0-dark-thirty!',
      examplePhonetic: 'dood, hooz down for uh layt-nyt TAH-koh dryv-throo',
      plainEnglish: 'Going out late at night specifically to buy fast food.',
    },
    {
      id: 'fb-st-3',
      language: 'stoner_tactical',
      foreign: 'Clouds are sky pillows',
      english: 'Zero-ceiling tactical overcast',
      phonetic: 'klowdz ar sky PIL-ohz',
      illustrationKey: 'crescent_moon',
      exampleForeign: 'Whoa man, clouds are sky pillows floating overhead.',
      exampleEnglish: 'Tactical weather briefing: forty percent cloud cover!',
      examplePhonetic: 'woh man, klowdz ar sky PIL-ohz',
      plainEnglish: 'The sky is covered in thick, soft-looking clouds today.',
    },
    {
      id: 'fb-st-4',
      language: 'stoner_tactical',
      foreign: 'Shred the gnarly half-pipe',
      english: 'Precision-edge the cul-de-sac turf',
      phonetic: 'shred thuh NAR-lee haf-pyp',
      illustrationKey: 'bicycle_ride',
      exampleForeign: 'Grab your wax and shred the gnarly half-pipe today!',
      exampleEnglish: 'Calibrate the trimmer and edge the driveway perimeter!',
      examplePhonetic: 'grab yor waks and shred thuh NAR-lee haf-pyp',
      plainEnglish: 'Spending the afternoon doing an active outdoor hobby with high focus.',
    },
    {
      id: 'fb-st-5',
      language: 'stoner_tactical',
      foreign: 'Dude, totally spaced out',
      english: 'Radio silence at 0-dark-thirty',
      phonetic: 'dood, TOH-tul-ee spayst owt',
      illustrationKey: 'night_stars',
      exampleForeign: 'My bad bro, dude, totally spaced out on the curb!',
      exampleEnglish: 'Comms check failed—unit went dark at 0-dark-thirty!',
      examplePhonetic: 'dood, TOH-tul-ee spayst owt',
      plainEnglish: 'I momentarily forgot what I was doing and stopped paying attention.',
    },
    {
      id: 'fb-st-6',
      language: 'stoner_tactical',
      foreign: 'Kickflip over the sprinkler',
      english: 'Breach laser-measured Bermuda grass',
      phonetic: 'KIK-flip OH-ver thuh SPRINK-ler',
      illustrationKey: 'horizon_telescope',
      exampleForeign: 'Watch me land a kickflip over the sprinkler head!',
      exampleEnglish: 'Alert! Bogey breaching the laser-measured perimeter!',
      examplePhonetic: 'wach mee land uh KIK-flip OH-ver thuh SPRINK-ler',
      plainEnglish: 'Performing a skateboard trick across a carefully maintained front lawn.',
    },
    {
      id: 'fb-st-7',
      language: 'stoner_tactical',
      foreign: 'Cosmic couch-lock zone',
      english: 'Standby recovery on the recliner',
      phonetic: 'KAHZ-mik kowch-lahk zohn',
      illustrationKey: 'cozy_bed',
      exampleForeign: 'Three cheesy burritos triggered cosmic couch-lock zone.',
      exampleEnglish: 'Commander entering tactical recovery mode on recliner!',
      examplePhonetic: 'three CHEE-zee bur-EE-tohz TRIG-erd KAHZ-mik kowch-lahk zohn',
      plainEnglish: 'Resting motionless on comfortable living room furniture after a large meal.',
    },
    {
      id: 'fb-st-8',
      language: 'stoner_tactical',
      foreign: 'Good vibes only, dude',
      english: 'Maintain neighborhood morale green',
      phonetic: 'good vybz OHN-lee, dood',
      illustrationKey: 'happy_smile',
      exampleForeign: 'No HOA stress here—good vibes only, dude!',
      exampleEnglish: 'Hold formation and keep cul-de-sac morale green!',
      examplePhonetic: 'noh aych-oh-ay stres heer—good vybz OHN-lee, dood',
      plainEnglish: 'Let us keep the social atmosphere friendly, calm, and cooperative.',
    },
  ],
};

interface LengthFontBucket {
  maxLen: number;
  compact: string;
  regular: string;
}

const FOREIGN_FONT_BUCKETS: Record<'tight' | 'normal' | 'large', readonly LengthFontBucket[]> = {
  tight: [
    { maxLen: 8, compact: 'clamp(0.68rem, 2.1vw, 0.75rem)', regular: 'clamp(0.8rem, 1.15vw, 0.9rem)' },
    { maxLen: 14, compact: 'clamp(0.62rem, 1.9vw, 0.69rem)', regular: 'clamp(0.74rem, 1.05vw, 0.84rem)' },
    { maxLen: 22, compact: 'clamp(0.58rem, 1.7vw, 0.64rem)', regular: 'clamp(0.68rem, 0.96vw, 0.76rem)' },
    { maxLen: 32, compact: 'clamp(0.54rem, 1.55vw, 0.59rem)', regular: 'clamp(0.62rem, 0.88vw, 0.7rem)' },
    { maxLen: 44, compact: 'clamp(0.51rem, 1.45vw, 0.56rem)', regular: 'clamp(0.58rem, 0.82vw, 0.65rem)' },
    { maxLen: Infinity, compact: 'clamp(0.49rem, 1.35vw, 0.53rem)', regular: 'clamp(0.55rem, 0.78vw, 0.61rem)' },
  ],
  normal: [
    { maxLen: 10, compact: 'clamp(0.72rem, 2.2vw, 0.8rem)', regular: 'clamp(0.82rem, 1.2vw, 0.9rem)' },
    { maxLen: 18, compact: 'clamp(0.66rem, 1.95vw, 0.73rem)', regular: 'clamp(0.75rem, 1.1vw, 0.84rem)' },
    { maxLen: 26, compact: 'clamp(0.6rem, 1.75vw, 0.67rem)', regular: 'clamp(0.69rem, 1vw, 0.76rem)' },
    { maxLen: 38, compact: 'clamp(0.55rem, 1.6vw, 0.61rem)', regular: 'clamp(0.63rem, 0.92vw, 0.7rem)' },
    { maxLen: Infinity, compact: 'clamp(0.52rem, 1.5vw, 0.57rem)', regular: 'clamp(0.59rem, 0.85vw, 0.65rem)' },
  ],
  large: [
    { maxLen: 10, compact: 'clamp(0.8rem, 2.4vw, 0.92rem)', regular: 'clamp(0.95rem, 1.4vw, 1.08rem)' },
    { maxLen: 18, compact: 'clamp(0.72rem, 2.15vw, 0.82rem)', regular: 'clamp(0.86rem, 1.25vw, 0.98rem)' },
    { maxLen: 26, compact: 'clamp(0.65rem, 1.9vw, 0.73rem)', regular: 'clamp(0.76rem, 1.1vw, 0.87rem)' },
    { maxLen: 36, compact: 'clamp(0.59rem, 1.7vw, 0.67rem)', regular: 'clamp(0.68rem, 1vw, 0.78rem)' },
    { maxLen: Infinity, compact: 'clamp(0.54rem, 1.55vw, 0.61rem)', regular: 'clamp(0.63rem, 0.92vw, 0.72rem)' },
  ],
};

const CLUE_FONT_BUCKETS: Record<'prompt' | 'tile' | 'card' | 'cloze', readonly LengthFontBucket[]> = {
  prompt: [
    { maxLen: 18, compact: 'clamp(0.84rem, 2.5vw, 0.96rem)', regular: 'clamp(0.98rem, 1.45vw, 1.14rem)' },
    { maxLen: 28, compact: 'clamp(0.76rem, 2.25vw, 0.86rem)', regular: 'clamp(0.88rem, 1.3vw, 1.02rem)' },
    { maxLen: 40, compact: 'clamp(0.7rem, 2.05vw, 0.78rem)', regular: 'clamp(0.8rem, 1.15vw, 0.92rem)' },
    { maxLen: Infinity, compact: 'clamp(0.64rem, 1.85vw, 0.72rem)', regular: 'clamp(0.74rem, 1.05vw, 0.84rem)' },
  ],
  tile: [
    { maxLen: 16, compact: 'clamp(0.74rem, 2.3vw, 0.86rem)', regular: 'clamp(0.9rem, 1.35vw, 1.04rem)' },
    { maxLen: 24, compact: 'clamp(0.68rem, 2vw, 0.76rem)', regular: 'clamp(0.8rem, 1.18vw, 0.92rem)' },
    { maxLen: 34, compact: 'clamp(0.61rem, 1.8vw, 0.69rem)', regular: 'clamp(0.72rem, 1.05vw, 0.82rem)' },
    { maxLen: 46, compact: 'clamp(0.56rem, 1.65vw, 0.63rem)', regular: 'clamp(0.66rem, 0.96vw, 0.76rem)' },
    { maxLen: Infinity, compact: 'clamp(0.52rem, 1.5vw, 0.58rem)', regular: 'clamp(0.62rem, 0.9vw, 0.71rem)' },
  ],
  card: [
    { maxLen: 18, compact: 'clamp(0.6rem, 1.85vw, 0.68rem)', regular: 'clamp(0.74rem, 1.05vw, 0.82rem)' },
    { maxLen: 28, compact: 'clamp(0.55rem, 1.65vw, 0.61rem)', regular: 'clamp(0.66rem, 0.95vw, 0.74rem)' },
    { maxLen: 40, compact: 'clamp(0.51rem, 1.5vw, 0.56rem)', regular: 'clamp(0.6rem, 0.86vw, 0.68rem)' },
    { maxLen: Infinity, compact: 'clamp(0.48rem, 1.4vw, 0.52rem)', regular: 'clamp(0.56rem, 0.8vw, 0.62rem)' },
  ],
  cloze: [
    { maxLen: 24, compact: 'clamp(0.78rem, 2.3vw, 0.88rem)', regular: 'clamp(0.96rem, 1.4vw, 1.1rem)' },
    { maxLen: 38, compact: 'clamp(0.72rem, 2.05vw, 0.8rem)', regular: 'clamp(0.88rem, 1.28vw, 1rem)' },
    { maxLen: 54, compact: 'clamp(0.66rem, 1.85vw, 0.74rem)', regular: 'clamp(0.8rem, 1.15vw, 0.92rem)' },
    { maxLen: Infinity, compact: 'clamp(0.61rem, 1.7vw, 0.68rem)', regular: 'clamp(0.74rem, 1.05vw, 0.85rem)' },
  ],
};

function pickBucketFontSize(
  buckets: readonly LengthFontBucket[],
  length: number,
  isCompact: boolean
): string {
  const matched = buckets.find((b) => length <= b.maxLen) ?? buckets[buckets.length - 1];
  return isCompact ? matched.compact : matched.regular;
}

export function getArcadeClueTextStyle(
  text: string,
  options: {
    isCompact?: boolean;
    variant?: 'prompt' | 'tile' | 'card' | 'cloze';
    color?: string;
    textAlign?: 'center' | 'start';
  } = {}
): CSSProperties {
  const { isCompact = false, variant = 'tile', color, textAlign = 'center' } = options;
  const fontSize = pickBucketFontSize(CLUE_FONT_BUCKETS[variant], text.length, isCompact);

  return {
    fontFamily: 'var(--font-display)',
    fontWeight: 900,
    fontSize,
    lineHeight: text.length > 26 ? 1.16 : 1.24,
    color,
    textAlign,
    maxWidth: '100%',
    minWidth: 0,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    wordBreak: 'normal',
  };
}

export function getArcadeForeignTextStyle(
  language: LanguageCode,
  text: string,
  options: {
    isCompact?: boolean;
    density?: 'tight' | 'normal' | 'large';
    color?: string;
    textAlign?: 'center' | 'start';
  } = {}
): CSSProperties {
  const { isCompact = false, density = 'normal', color, textAlign = 'center' } = options;
  const meta = LANGUAGE_META[language];
  const isCjk = meta.scriptType === 'hanzi' || meta.scriptType === 'japanese';
  const isTallScript =
    isCjk ||
    meta.scriptType === 'arabic' ||
    meta.scriptType === 'devanagari' ||
    meta.scriptType === 'bengali';

  const widthFactor = isCjk ? 1.65 : meta.scriptType === 'cyrillic' ? 1.15 : isTallScript ? 1.1 : 1;
  const effectiveLen = text.length * widthFactor;

  let fontSize = pickBucketFontSize(FOREIGN_FONT_BUCKETS[density], effectiveLen, isCompact);
  if (isTallScript && effectiveLen <= 10) {
    if (density === 'tight') {
      fontSize = isCompact ? 'clamp(0.72rem, 2.2vw, 0.78rem)' : 'clamp(0.86rem, 1.25vw, 0.96rem)';
    } else if (density === 'large') {
      fontSize = isCompact ? 'clamp(0.88rem, 2.6vw, 1rem)' : 'clamp(1.04rem, 1.5vw, 1.18rem)';
    } else {
      fontSize = isCompact ? 'clamp(0.76rem, 2.3vw, 0.85rem)' : 'clamp(0.88rem, 1.3vw, 0.96rem)';
    }
  }

  const isMultiLineLatin =
    meta.scriptType === 'latin' && language !== 'vi' && effectiveLen > 20;

  return {
    fontFamily: 'var(--font-display)',
    fontWeight: 900,
    fontSize,
    lineHeight: isMultiLineLatin ? (effectiveLen > 32 ? 1.14 : 1.2) : 1.35,
    color,
    textAlign,
    maxWidth: '100%',
    minWidth: 0,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    wordBreak: 'normal',
    paddingBlock: 2,
  };
}

export interface ArcadeTierMeta {
  id: ArcadeProficiencyTier;
  label: string;
  cefrLabel: string;
  paceLabel: string;
  rewardLabel: string;
  paceMultiplier: number;
  rewardMultiplier: number;
  baseXp: number;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export const ARCADE_TIER_LIST: readonly ArcadeProficiencyTier[] = ['sprout', 'voyager', 'master'];

export const ARCADE_TIER_META: Record<ArcadeProficiencyTier, ArcadeTierMeta> = {
  sprout: {
    id: 'sprout',
    label: 'Sprout',
    cefrLabel: 'A1–A2',
    paceLabel: '0.95x',
    rewardLabel: '1x',
    paceMultiplier: 0.95,
    rewardMultiplier: 1,
    baseXp: 15,
    accentColor: '#10b981',
    bgColor: '#ecfdf5',
    borderColor: '#34d399',
    textColor: '#065f46',
  },
  voyager: {
    id: 'voyager',
    label: 'Voyager',
    cefrLabel: 'B1–B2',
    paceLabel: '1.12x',
    rewardLabel: '1.5x',
    paceMultiplier: 1.12,
    rewardMultiplier: 1.5,
    baseXp: 24,
    accentColor: '#8b5cf6',
    bgColor: '#ede9fe',
    borderColor: '#a78bfa',
    textColor: '#5b21b6',
  },
  master: {
    id: 'master',
    label: 'Master',
    cefrLabel: 'C1–C2',
    paceLabel: '1.28x',
    rewardLabel: '2x',
    paceMultiplier: 1.28,
    rewardMultiplier: 2,
    baseXp: 32,
    accentColor: '#ec4899',
    bgColor: '#fce7f3',
    borderColor: '#f472b6',
    textColor: '#9d174d',
  },
};

export function computeScaledArcadeRewards(params: {
  arcadeTier: ArcadeProficiencyTier;
  baseGems: number;
  performanceUnits: number;
  baseXpBonus?: number;
}): { bonusGems: number; xpEarned: number } {
  const meta = ARCADE_TIER_META[params.arcadeTier];
  const safeBaseGems = Number.isFinite(params.baseGems) ? Math.max(0, Math.round(params.baseGems)) : 0;
  const safePerf = Number.isFinite(params.performanceUnits)
    ? Math.max(0, Math.round(params.performanceUnits))
    : 0;
  const safeXpBonus = params.baseXpBonus && Number.isFinite(params.baseXpBonus)
    ? Math.max(0, Math.round(params.baseXpBonus))
    : 0;

  return {
    bonusGems: Math.max(0, Math.round(safeBaseGems * meta.rewardMultiplier)),
    xpEarned: Math.max(10, Math.round((meta.baseXp + safePerf * 2 + safeXpBonus) * meta.rewardMultiplier)),
  };
}

export interface ArcadeCoopSettledResult {
  gameId: string;
  score: number;
  bonusGems: number;
  xpEarned: number;
  heartsWon: number;
}

export interface CoopArcadeTurnContextValue {
  turnNumber: 1 | 2;
  playerProfile: KidProfile;
  partnerProfile: KidProfile;
  languageOverride?: LanguageCode;
  kidQuarantined: boolean;
  onRoundSettled: (result: ArcadeCoopSettledResult) => void;
}

export interface ArcadeDeckOverride {
  profile?: KidProfile;
  languageOverride?: LanguageCode;
  kidQuarantined?: boolean;
}

const CoopArcadeTurnContext = createContext<CoopArcadeTurnContextValue | null>(null);

export function CoopArcadeTurnProvider({
  value,
  children,
}: {
  value: CoopArcadeTurnContextValue | null;
  children: ReactNode;
}) {
  return (
    <CoopArcadeTurnContext.Provider value={value}>
      {children}
    </CoopArcadeTurnContext.Provider>
  );
}

export function useArcadeCoopTurn(): CoopArcadeTurnContextValue | null {
  return useContext(CoopArcadeTurnContext);
}

export function useArcadeEffectiveProfile(): KidProfile {
  const { activeProfile } = useVaultStore();
  const coopTurn = useContext(CoopArcadeTurnContext);
  return coopTurn?.playerProfile ?? activeProfile;
}

export function resolveSafeBaseLanguage(
  profile?: Pick<KidProfile, 'activeLanguage' | 'lastBaseLanguage'>,
  fallbackProfile?: Pick<KidProfile, 'activeLanguage' | 'lastBaseLanguage'>
): BaseLanguageCode {
  if (profile && !isAdultLanguage(profile.activeLanguage)) {
    return profile.activeLanguage;
  }
  if (profile?.lastBaseLanguage && !isAdultLanguage(profile.lastBaseLanguage)) {
    return profile.lastBaseLanguage;
  }
  if (fallbackProfile && !isAdultLanguage(fallbackProfile.activeLanguage)) {
    return fallbackProfile.activeLanguage;
  }
  if (fallbackProfile?.lastBaseLanguage && !isAdultLanguage(fallbackProfile.lastBaseLanguage)) {
    return fallbackProfile.lastBaseLanguage;
  }
  return 'es';
}

export function recordArcadeRunResult(params: {
  gameId: string;
  score: number;
  heartsWon: number;
  bonusGems: number;
  xpEarned: number;
  preserveXpBooster?: boolean;
}): void {
  type RecordWithXp = (input: {
    gameId: string;
    score: number;
    heartsWon: number;
    bonusGems: number;
    xpEarned?: number;
    preserveXpBooster?: boolean;
  }) => void;
  (vaultActions.recordArcadeGameResult as RecordWithXp)(params);
}

/**
 * Returns a referentially stable round-settler callback so cabinets can report
 * Co-Op turn scores without tearing down active requestAnimationFrame loops.
 */
export function useArcadeCoopReport(): (params: {
  gameId: string;
  score: number;
  heartsWon: number;
  bonusGems: number;
  xpEarned: number;
  preserveXpBooster?: boolean;
}) => void {
  const coopTurn = useContext(CoopArcadeTurnContext);
  const coopTurnRef = useRef(coopTurn);
  coopTurnRef.current = coopTurn;

  return useCallback((params) => {
    const activeTurn = coopTurnRef.current;
    if (activeTurn) {
      activeTurn.onRoundSettled({
        gameId: params.gameId,
        score: params.score,
        bonusGems: params.bonusGems,
        xpEarned: params.xpEarned,
        heartsWon: params.heartsWon,
      });
      return;
    }
    recordArcadeRunResult(params);
  }, []);
}

export function CoopTurnPill({ isCompact }: { isCompact: boolean }) {
  const coopTurn = useContext(CoopArcadeTurnContext);
  if (!coopTurn) return null;

  return (
    <span
      data-testid="arcade-coop-turn-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: isCompact ? '2px 7px' : '3px 9px',
        borderRadius: 999,
        background: 'var(--tint-indigo-bg, #eef2ff)',
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderLeftWidth: 2,
        borderBottomWidth: 3,
        borderStyle: 'solid',
        borderColor: coopTurn.playerProfile.bannerColor || '#6366f1',
        color: 'var(--tint-indigo-ink, #312e81)',
        fontFamily: 'var(--font-display)',
        fontSize: isCompact ? '0.68rem' : '0.75rem',
        fontWeight: 900,
        whiteSpace: 'nowrap',
        maxWidth: isCompact ? 124 : 170,
        overflow: 'hidden',
      }}
    >
      <AvatarBadge avatarId={coopTurn.playerProfile.avatarId} size={isCompact ? 15 : 18} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        P{coopTurn.turnNumber}: {coopTurn.playerProfile.name}
      </span>
    </span>
  );
}

function matchesArcadeProficiencyTier(
  proficiencyTier: ProficiencyTier | undefined,
  arcadeTier: ArcadeProficiencyTier
): boolean {
  if (!proficiencyTier) return false;
  if (arcadeTier === 'sprout') return proficiencyTier === 'A1' || proficiencyTier === 'A2';
  if (arcadeTier === 'voyager') return proficiencyTier === 'B1' || proficiencyTier === 'B2';
  return proficiencyTier === 'C1_C2';
}

/** Returns true only when a non-default profile has After-Hours unlocked and currently active. */
export function isAdultProfileActive(
  profile?: Pick<KidProfile, 'id' | 'adultModeUnlocked' | 'adultModeActive'>
): boolean {
  return Boolean(
    profile &&
      !isDefaultKidProfileId(profile.id) &&
      profile.adultModeUnlocked &&
      profile.adultModeActive
  );
}

/** Returns true whenever an active Co-Op turn must be quarantined to safe base languages. */
export function isCoopTurnQuarantined(
  coopTurn: CoopArcadeTurnContextValue | null | undefined
): boolean {
  if (!coopTurn) return false;
  return (
    Boolean(coopTurn.kidQuarantined) ||
    !isAdultProfileActive(coopTurn.playerProfile) ||
    !isAdultProfileActive(coopTurn.partnerProfile)
  );
}

/** Resolves the effective arcade language for a player, enforcing Kid-Safety Quarantine. */
export function resolveEffectiveArcadeLanguage(
  player: Pick<
    KidProfile,
    'id' | 'activeLanguage' | 'lastBaseLanguage' | 'adultModeUnlocked' | 'adultModeActive'
  >,
  options?: {
    languageOverride?: LanguageCode;
    fallbackProfile?: Pick<KidProfile, 'activeLanguage' | 'lastBaseLanguage'>;
    kidQuarantined?: boolean;
  }
): LanguageCode {
  const rawLang = options?.languageOverride ?? player.activeLanguage;
  const isBlockedAdultAccess =
    isAdultLanguage(rawLang) &&
    (Boolean(options?.kidQuarantined) || !isAdultProfileActive(player));
  return isBlockedAdultAccess
    ? resolveSafeBaseLanguage(player, options?.fallbackProfile)
    : rawLang;
}

function readOptionalCurriculumFn<T>(key: string): T | undefined {
  try {
    if (!(key in curriculum)) return undefined;
    const candidate = (curriculum as Record<string, unknown>)[key];
    return typeof candidate === 'function' ? (candidate as T) : undefined;
  } catch {
    return undefined;
  }
}

interface LocalArcadeLoadEntry {
  loading: boolean;
  error: string | null;
}

const arcadeLoadStore = (() => {
  let snapshot: Partial<Record<LanguageCode, LocalArcadeLoadEntry>> = {};
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: (): Partial<Record<LanguageCode, LocalArcadeLoadEntry>> => snapshot,
    set: (lang: LanguageCode, entry: LocalArcadeLoadEntry | null): void => {
      const prev = snapshot[lang];
      if (!entry) {
        if (prev === undefined) return;
        const next = { ...snapshot };
        delete next[lang];
        snapshot = next;
      } else {
        if (prev && prev.loading === entry.loading && prev.error === entry.error) return;
        snapshot = { ...snapshot, [lang]: entry };
      }
      for (const listener of Array.from(listeners)) {
        listener();
      }
    },
  };
})();

const inflightArcadeLoads = new Map<LanguageCode, Promise<void>>();

function isCourseUnitsNonEmpty(language: LanguageCode): boolean {
  const getCourseFn = readOptionalCurriculumFn<
    (lang: LanguageCode) => { units?: unknown[] } | undefined
  >('getCourse');
  try {
    return (getCourseFn?.(language)?.units?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

function readOptionalBaseLoadState(language: BaseLanguageCode): BaseCourseLoadState | undefined {
  const getStateFn =
    readOptionalCurriculumFn<(lang: BaseLanguageCode) => BaseCourseLoadState>(
      'getBaseCourseLoadState'
    ) ??
    readOptionalCurriculumFn<(lang: BaseLanguageCode) => BaseCourseLoadState>('getBaseLoadState');
  if (typeof getStateFn !== 'function') return undefined;
  try {
    return getStateFn(language);
  } catch {
    return undefined;
  }
}

/**
 * Safely resolves load status (`loaded`, `loading`, `error`) for any base or adult
 * language without throwing on partial Vitest curriculum mocks.
 */
export function getArcadeLanguageLoadState(language: LanguageCode): BaseCourseLoadState {
  const local = arcadeLoadStore.getSnapshot()[language];

  if (isAdultLanguage(language)) {
    const isAdultLoadedFn = readOptionalCurriculumFn<(lang: AdultLanguageCode) => boolean>(
      'isAdultTrackLoaded'
    );
    let loaded = false;
    try {
      loaded =
        typeof isAdultLoadedFn === 'function'
          ? Boolean(isAdultLoadedFn(language))
          : isCourseUnitsNonEmpty(language);
    } catch {
      loaded = false;
    }
    if (loaded) {
      return { loaded: true, loading: false, error: null };
    }
    return {
      loaded: false,
      loading: Boolean(local?.loading),
      error: local?.loading ? null : (local?.error ?? null),
    };
  }

  const isBaseLoadedFn =
    readOptionalCurriculumFn<(lang: BaseLanguageCode) => boolean>('isBaseCourseLoaded') ??
    readOptionalCurriculumFn<(lang: BaseLanguageCode) => boolean>('isBaseTrackLoaded');
  let loadedByFn: boolean | undefined;
  if (typeof isBaseLoadedFn === 'function') {
    try {
      loadedByFn = Boolean(isBaseLoadedFn(language));
    } catch {
      loadedByFn = false;
    }
  }
  const regState = readOptionalBaseLoadState(language);
  const loadedByReg =
    regState && typeof regState.loaded === 'boolean' ? regState.loaded : undefined;
  const loadedByCourse =
    loadedByFn === undefined && loadedByReg === undefined
      ? isCourseUnitsNonEmpty(language)
      : true;

  const loaded = (loadedByFn ?? true) && (loadedByReg ?? true) && loadedByCourse;
  if (loaded) {
    return { loaded: true, loading: false, error: null };
  }

  const regError =
    !loadedByReg && typeof regState?.error === 'string' && regState.error ? regState.error : null;
  const regLoading = !loadedByReg && Boolean(regState?.loading);
  const loading = Boolean(local?.loading || regLoading);
  const error = local?.loading ? null : (local?.error ?? regError ?? null);
  return { loaded: false, loading, error };
}

function loadArcadeLanguageInternal(
  language: LanguageCode,
  allowAdultAccess: boolean,
  forceRetry: boolean
): Promise<void> {
  if (isAdultLanguage(language) && !allowAdultAccess) {
    return Promise.resolve();
  }

  const currentState = getArcadeLanguageLoadState(language);
  if (currentState.loaded) {
    arcadeLoadStore.set(language, null);
    return Promise.resolve();
  }

  const existingInflight = inflightArcadeLoads.get(language);
  if (existingInflight) {
    return existingInflight;
  }

  if (!forceRetry && (currentState.loading || currentState.error)) {
    return Promise.resolve();
  }

  const ensureFn = isAdultLanguage(language)
    ? readOptionalCurriculumFn<(lang: AdultLanguageCode) => Promise<unknown>>(
        'ensureAdultCourseLoaded'
      )
    : readOptionalCurriculumFn<(lang: BaseLanguageCode) => Promise<unknown>>(
        'ensureBaseCourseLoaded'
      );

  if (typeof ensureFn !== 'function') {
    arcadeLoadStore.set(language, null);
    return Promise.resolve();
  }

  arcadeLoadStore.set(language, { loading: true, error: null });

  const loadPromise = Promise.resolve()
    .then(() => (ensureFn as (lang: LanguageCode) => Promise<unknown>)(language))
    .then((course) => {
      const courseUnitsCount =
        (course as { units?: unknown[] } | undefined)?.units?.length ?? 0;
      const postState = getArcadeLanguageLoadState(language);
      if (postState.loaded || courseUnitsCount > 0) {
        arcadeLoadStore.set(language, null);
      } else {
        arcadeLoadStore.set(language, {
          loading: false,
          error:
            postState.error ??
            'This language is not cached for offline use yet. Reconnect and try again.',
        });
      }
    })
    .catch((err: unknown) => {
      const fallbackMsg = isAdultLanguage(language)
        ? 'Offline or unavailable — unable to load this track right now.'
        : 'Offline or unavailable — unable to load this language right now.';
      const detail = err instanceof Error && err.message ? err.message : fallbackMsg;
      arcadeLoadStore.set(language, { loading: false, error: detail });
    })
    .finally(() => {
      inflightArcadeLoads.delete(language);
    });

  inflightArcadeLoads.set(language, loadPromise);
  return loadPromise;
}

/**
 * Triggers on-demand curriculum hydration for a base or unlocked/active adult
 * language track without leaking unhandled rejections when offline.
 */
export function ensureArcadeLanguageLoaded(
  language: LanguageCode,
  allowAdultAccess: boolean
): void {
  void loadArcadeLanguageInternal(language, allowAdultAccess, false);
}

/**
 * Retries loading a failed or uncached curriculum track on user request without
 * throwing on partial curriculum mocks.
 */
export function retryArcadeLanguageLoad(
  language: LanguageCode,
  allowAdultAccess = false
): Promise<void> {
  arcadeLoadStore.set(language, null);
  return loadArcadeLanguageInternal(language, allowAdultAccess, true);
}

function useSafeRegistryVersion(
  subscribeKey: 'subscribeAdultRegistry' | 'subscribeBaseRegistry',
  versionKey: 'getAdultRegistryVersion' | 'getBaseRegistryVersion'
): number {
  const fallbackVersionRef = useRef(0);
  const subscribe = useCallback(
    (listener: () => void) => {
      const subFn = readOptionalCurriculumFn<(l: () => void) => () => void>(subscribeKey);
      if (typeof subFn !== 'function') return () => {};
      return subFn(() => {
        fallbackVersionRef.current += 1;
        listener();
      });
    },
    [subscribeKey]
  );
  const getSnapshot = useCallback(() => {
    const verFn = readOptionalCurriculumFn<() => number>(versionKey);
    const registryVer = typeof verFn === 'function' ? verFn() : 0;
    return registryVer + fallbackVersionRef.current;
  }, [versionKey]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Subscribes reactively to curriculum load state (`loaded`, `loading`, `error`)
 * for a given Arcade language so offline recovery UI updates live.
 */
export function useArcadeLanguageLoadState(
  language: LanguageCode | null | undefined
): BaseCourseLoadState {
  useSafeRegistryVersion('subscribeAdultRegistry', 'getAdultRegistryVersion');
  useSafeRegistryVersion('subscribeBaseRegistry', 'getBaseRegistryVersion');
  useSyncExternalStore(
    arcadeLoadStore.subscribe,
    arcadeLoadStore.getSnapshot,
    arcadeLoadStore.getSnapshot
  );

  if (!language) {
    return { loaded: true, loading: false, error: null };
  }
  return getArcadeLanguageLoadState(language);
}

export function useArcadeDeck(
  arcadeTier: ArcadeProficiencyTier = 'sprout',
  override?: ArcadeDeckOverride
): {
  language: LanguageCode;
  lexicon: ArcadeLanternItem[];
  targetLexicon: ArcadeLanternItem[];
  bestScoreFor: (gameId: string) => number;
  arcadeTier: ArcadeProficiencyTier;
  tierMeta: ArcadeTierMeta;
  paceMultiplier: number;
  rewardMultiplier: number;
} {
  const { activeProfile, activeProgress } = useVaultStore();
  const coopTurn = useContext(CoopArcadeTurnContext);
  const effectiveProfile = override?.profile ?? coopTurn?.playerProfile ?? activeProfile;
  const kidQuarantined =
    override?.kidQuarantined !== undefined
      ? Boolean(override.kidQuarantined)
      : isCoopTurnQuarantined(coopTurn);
  const adultRegistryVersion = useSafeRegistryVersion(
    'subscribeAdultRegistry',
    'getAdultRegistryVersion'
  );
  const baseRegistryVersion = useSafeRegistryVersion(
    'subscribeBaseRegistry',
    'getBaseRegistryVersion'
  );

  const rawLang =
    override?.languageOverride ?? coopTurn?.languageOverride ?? effectiveProfile.activeLanguage;
  const isBlockedAdultAccess =
    isAdultLanguage(rawLang) && (kidQuarantined || !isAdultProfileActive(effectiveProfile));
  const language: LanguageCode = isBlockedAdultAccess
    ? resolveSafeBaseLanguage(effectiveProfile, activeProfile)
    : rawLang;
  const progressForLanguage =
    effectiveProfile.languageProgress?.[language] ??
    (effectiveProfile.id === activeProfile.id ? activeProgress : undefined);
  const tierMeta = ARCADE_TIER_META[arcadeTier];

  // Hydrate lazy After-Hours mashup chunks when Adult Mode is unlocked & active,
  // and hydrate lazy base course chunks (`fr`, `ja`, `ar`, etc.) on demand.
  useEffect(() => {
    ensureArcadeLanguageLoaded(language, !isBlockedAdultAccess);
  }, [language, isBlockedAdultAccess]);

  const rawLexicon = useMemo(() => {
    const fallbackItems = FALLBACK_ARCADE_LEXICON[language] ?? FALLBACK_ARCADE_LEXICON.es;
    try {
      type GetArcadeLexiconCompat = (
        lang: LanguageCode,
        unlockedVocabIds: readonly string[],
        currentUnitIndex: number,
        tier?: ArcadeProficiencyTier
      ) => ArcadeLanternItem[];

      const items = (getArcadeLexicon as GetArcadeLexiconCompat)(
        language,
        progressForLanguage?.unlockedVocabIds ?? [],
        progressForLanguage?.currentUnitIndex ?? 0,
        arcadeTier
      );
      const isolatedItems = items.filter(
        (item) =>
          item.language === language &&
          (isAdultLanguage(language) || !isAdultLanguage(item.language))
      );
      return isolatedItems.length >= 8 ? isolatedItems : fallbackItems;
    } catch {
      return fallbackItems;
    }
  }, [
    language,
    progressForLanguage?.unlockedVocabIds,
    progressForLanguage?.currentUnitIndex,
    arcadeTier,
    adultRegistryVersion,
    baseRegistryVersion,
  ]);

  const { lexicon, targetLexicon } = useMemo(() => {
    const hasTierTags = rawLexicon.some((item) => item.proficiencyTier !== undefined);
    if (hasTierTags) {
      const matched = rawLexicon.filter((item) =>
        matchesArcadeProficiencyTier(item.proficiencyTier, arcadeTier)
      );
      const rest = rawLexicon.filter(
        (item) => !matchesArcadeProficiencyTier(item.proficiencyTier, arcadeTier)
      );

      if (matched.length >= 8) {
        const paddedLexicon = matched.length >= 12 ? matched : [...matched, ...rest.slice(0, 12 - matched.length)];
        const unitIdx = progressForLanguage?.currentUnitIndex ?? 0;
        const unlockedCount = progressForLanguage?.unlockedVocabIds?.length ?? 0;
        const targets =
          arcadeTier === 'sprout' && unitIdx === 0 && unlockedCount < 13
            ? matched.slice(0, Math.min(13, matched.length))
            : matched;
        return { lexicon: paddedLexicon, targetLexicon: targets };
      }

      if (matched.length > 0) {
        const prioritized = [...matched, ...rest];
        return {
          lexicon: prioritized,
          targetLexicon: matched.length >= 4 ? matched : prioritized,
        };
      }
    }

    const unitIdx = progressForLanguage?.currentUnitIndex ?? 0;
    const unlockedCount = progressForLanguage?.unlockedVocabIds?.length ?? 0;
    if (arcadeTier === 'sprout' && unitIdx === 0 && unlockedCount < 13) {
      return {
        lexicon: rawLexicon,
        targetLexicon: rawLexicon.slice(0, Math.min(13, rawLexicon.length)),
      };
    }
    return { lexicon: rawLexicon, targetLexicon: rawLexicon };
  }, [rawLexicon, arcadeTier, progressForLanguage?.currentUnitIndex, progressForLanguage?.unlockedVocabIds?.length]);

  const bestScoreFor = (gameId: string): number => {
    const mapScore = effectiveProfile.arcadeHighScores?.[gameId] ?? 0;
    if (gameId === 'starlight_choir') {
      return Math.max(mapScore, effectiveProfile.secretArcadeBestScore ?? 0);
    }
    return mapScore;
  };

  return {
    language,
    lexicon,
    targetLexicon,
    bestScoreFor,
    arcadeTier,
    tierMeta,
    paceMultiplier: tierMeta.paceMultiplier,
    rewardMultiplier: tierMeta.rewardMultiplier,
  };
}

export function useArcadeContainerMetrics() {
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  useEffect(() => {
    const updateFromWindow = () => {
      if (containerEl) {
        const rect = containerEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSize({ width: rect.width, height: rect.height });
          return;
        }
      }
      if (typeof window !== 'undefined') {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      }
    };

    updateFromWindow();

    let obs: ResizeObserver | null = null;
    if (containerEl && typeof ResizeObserver !== 'undefined') {
      obs = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (rect && rect.width > 0 && rect.height > 0) {
          setSize({ width: rect.width, height: rect.height });
        }
      });
      obs.observe(containerEl);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateFromWindow);
    }

    return () => {
      obs?.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateFromWindow);
      }
    };
  }, [containerEl]);

  const isNarrow = size.width < 720;
  const isShort = size.height < 640;
  const isCompact = isNarrow || isShort;

  return {
    containerRef: setContainerEl,
    width: size.width,
    height: size.height,
    isNarrow,
    isShort,
    isCompact,
  };
}

export function pickDistinctItems(
  pool: readonly ArcadeLanternItem[],
  count: number,
  excludeIds: ReadonlySet<string> = new Set()
): ArcadeLanternItem[] {
  const filtered = pool.filter((item) => !excludeIds.has(item.id));
  const copy = [...filtered];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, count);
}

export const ARCADE_SHELL_STYLE = {
  height: '100%',
  maxHeight: '100%',
  minHeight: 0,
  width: '100%',
  maxWidth: 960,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  overflow: 'hidden',
} as const;

export const CARD_SURFACE_STYLE = {
  background: 'var(--card-bg, #ffffff)',
  color: 'var(--text-main, #1e1b4b)',
  borderTopWidth: 2,
  borderRightWidth: 2,
  borderLeftWidth: 2,
  borderBottomWidth: 4,
  borderStyle: 'solid',
  borderColor: 'var(--card-border, #cbd5e1)',
  borderRadius: 20,
  boxShadow: 'var(--card-glow, 0 8px 22px rgba(15, 23, 42, 0.08))',
} as const;

export const SOFT_BTN_STYLE = {
  background: 'var(--card-soft-bg, #f1f5f9)',
  color: 'var(--text-main, #1e1b4b)',
  borderTopWidth: 2,
  borderRightWidth: 2,
  borderLeftWidth: 2,
  borderBottomWidth: 4,
  borderStyle: 'solid',
  borderColor: 'var(--card-border, #cbd5e1)',
} as const;

export interface ArcadeHeaderBarProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  score: number;
  bestScore?: number;
  timeLeft: number;
  combo?: number;
  heartsPreview?: number;
  arcadeTier?: ArcadeProficiencyTier;
  isCompact: boolean;
  onExit?: () => void;
}

export function ArcadeHeaderBar({
  icon,
  title,
  subtitle,
  score,
  bestScore,
  timeLeft,
  combo = 0,
  heartsPreview,
  arcadeTier,
  isCompact,
  onExit,
}: ArcadeHeaderBarProps) {
  const tierMeta = arcadeTier ? ARCADE_TIER_META[arcadeTier] : null;
  return (
    <div
      style={{
        ...CARD_SURFACE_STYLE,
        flexShrink: 0,
        padding: isCompact ? '7px 10px' : '9px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexWrap: 'wrap',
        borderRadius: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, maxWidth: '100%', flex: '1 1 160px' }}>
        <div
          style={{
            width: isCompact ? 32 : 38,
            height: isCompact ? 32 : 38,
            borderRadius: 12,
            background: 'var(--card-soft-bg, #f8fafc)',
            borderTopWidth: 1.5,
            borderRightWidth: 1.5,
            borderLeftWidth: 1.5,
            borderBottomWidth: 3,
            borderStyle: 'solid',
            borderColor: 'var(--card-border, #cbd5e1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isCompact ? '0.95rem' : '1.06rem',
              fontWeight: 900,
              color: 'var(--text-main, #1e1b4b)',
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </div>
          {!isCompact ? (
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: 'var(--text-muted, #475569)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitle}
              {bestScore !== undefined ? ` • Best: ${bestScore}` : ''}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <CoopTurnPill isCompact={isCompact} />
        {tierMeta && !isCompact ? (
          <span
            style={{
              padding: '4px 9px',
              borderRadius: 999,
              background: tierMeta.bgColor,
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderLeftWidth: 2,
              borderBottomWidth: 3,
              borderStyle: 'solid',
              borderColor: tierMeta.borderColor,
              color: tierMeta.textColor,
              fontWeight: 900,
              fontSize: '0.74rem',
              fontFamily: 'var(--font-display)',
              whiteSpace: 'nowrap',
            }}
          >
            {tierMeta.label} {tierMeta.paceLabel}
          </span>
        ) : null}

        {heartsPreview !== undefined ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: isCompact ? '3px 8px' : '4px 10px',
              borderRadius: 999,
              background: '#fff1f2',
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderLeftWidth: 2,
              borderBottomWidth: 3,
              borderStyle: 'solid',
              borderColor: '#fda4af',
              color: '#be123c',
              fontWeight: 900,
              fontSize: isCompact ? '0.76rem' : '0.82rem',
              fontFamily: 'var(--font-display)',
            }}
          >
            <Heart size={13} fill="#f43f5e" /> +{heartsPreview}
          </span>
        ) : null}

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: isCompact ? '3px 8px' : '4px 10px',
            borderRadius: 999,
            background: '#fffbeb',
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderLeftWidth: 2,
            borderBottomWidth: 3,
            borderStyle: 'solid',
            borderColor: '#f59e0b',
            color: '#b45309',
            fontWeight: 900,
            fontSize: isCompact ? '0.76rem' : '0.82rem',
            fontFamily: 'var(--font-display)',
          }}
        >
          <Star size={13} fill="#f59e0b" /> {score}
          {combo >= 2 ? ` (${combo}x)` : ''}
        </span>

        <span
          style={{
            padding: isCompact ? '3px 8px' : '4px 10px',
            borderRadius: 999,
            background: '#eff6ff',
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderLeftWidth: 2,
            borderBottomWidth: 3,
            borderStyle: 'solid',
            borderColor: '#60a5fa',
            color: '#1d4ed8',
            fontWeight: 900,
            fontSize: isCompact ? '0.76rem' : '0.82rem',
            fontFamily: 'var(--font-display)',
          }}
        >
          {timeLeft}s
        </span>

        {onExit ? (
          <button
            type="button"
            className="tactile-btn"
            style={{
              ...SOFT_BTN_STYLE,
              padding: isCompact ? '4px 8px' : '5px 10px',
              fontSize: '0.78rem',
              borderRadius: 12,
            }}
            onClick={onExit}
          >
            <X size={14} />
            <span>Exit</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface ArcadePlainEnglishResult {
  spokenText: string;
  displayLine: string;
  label: string;
}

interface CorePlainEnglishHelpers {
  decodeToNormalEnglish?: (req: {
    language: LanguageCode;
    dialectAText?: string;
    dialectBText?: string;
    explicitPlain?: string;
    registerNote?: string;
    nuanceNote?: string;
    avoidTerms?: readonly string[];
  }) => ArcadePlainEnglishResult;
}

const LOCAL_PLAIN_FALLBACK_MAP: Record<string, string> = {
  "what's good": 'Hello, how are you doing today?',
  'no cap': 'I am telling the complete truth without exaggeration.',
  'say less': 'I understand completely and agree to the plan.',
  'low-key': 'Secretly, modestly, or to a moderate degree.',
  'my bad': 'I apologize; that mistake was my fault.',
  "i'm dead": 'I find that extremely funny.',
  'finna bounce': 'I am preparing to leave very soon.',
  "bussin'": 'This food tastes exceptionally good.',
  'howdy, neighbor': 'Hello, friendly person who lives nearby.',
  'living the dream': 'I am enduring a routine workday with polite optimism.',
  "let's circle back": 'Let us discuss this topic again later.',
  'ope, scoot past ya': 'Excuse me while I walk past you in a narrow space.',
  'that hits the spot': 'This snack or drink is very satisfying right now.',
  'time to hit the hay': 'It is late and I am going to sleep now.',
  'bandwidth is tight': 'Everyone here already has too much work to take on more.',
  'take this offline': 'Let us continue this discussion privately after the meeting.',
  'well bless his heart': 'He tried his best, though the result was quite unfortunate.',
  'hold my sweet tea': 'Stand back and watch while I handle this situation myself.',
  'my cortisol is spiked': 'I feel stressed and physically exhausted right now.',
  "yo, it's all chill": 'Everything is under control and there is no reason to worry.',
};

function maskPlainSpoilers(text: string, avoidTerms?: readonly string[]): string {
  if (!avoidTerms || avoidTerms.length === 0) return text;
  let masked = text;
  for (const term of avoidTerms) {
    const trimmed = term.trim();
    if (trimmed.length < 3) continue;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    masked = masked.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), 'that expression');
  }
  return masked;
}

export function isAdultArcadeActive(
  language: LanguageCode,
  profile: Pick<KidProfile, 'id' | 'adultModeUnlocked' | 'adultModeActive'>
): boolean {
  return isAdultLanguage(language) && isAdultProfileActive(profile);
}

export function resolveArcadePlainEnglish(
  item: ArcadeLanternItem,
  options: {
    avoidTerms?: readonly string[];
    dialectAText?: string;
    dialectBText?: string;
  } = {}
): ArcadePlainEnglishResult {
  const dialectA = options.dialectAText ?? item.foreign;
  const dialectB = options.dialectBText ?? item.english;
  const coreHelpers = core as typeof core & CorePlainEnglishHelpers;

  if (typeof coreHelpers.decodeToNormalEnglish === 'function') {
    const decoded = coreHelpers.decodeToNormalEnglish({
      language: item.language,
      dialectAText: dialectA,
      dialectBText: dialectB,
      explicitPlain: item.plainEnglish,
      avoidTerms: options.avoidTerms,
    });
    if (decoded?.displayLine?.trim() && decoded?.spokenText?.trim()) {
      return decoded;
    }
  }

  const cleanB = dialectB.replace(/^(?:Suburban|AAVE):\s*/i, '').trim();
  const cleanA = dialectA.replace(/^(?:Suburban|AAVE):\s*/i, '').trim();
  const lookupKey = cleanA.toLowerCase().replace(/[!?.,]+$/g, '');
  const rawPlain =
    item.plainEnglish?.trim() ||
    LOCAL_PLAIN_FALLBACK_MAP[lookupKey] ||
    (cleanB
      ? `In plain everyday English, this simply means: ${cleanB}.`
      : `In plain everyday English: ${cleanA}.`);
  const safeLine = maskPlainSpoilers(rawPlain, options.avoidTerms);
  return {
    spokenText: rawPlain,
    displayLine: safeLine,
    label: 'Normal English',
  };
}

export function ArcadePlainEnglishCallout({
  result,
  isCompact,
  onClose,
}: {
  result: ArcadePlainEnglishResult;
  isCompact: boolean;
  onClose?: () => void;
}) {
  return (
    <div
      data-testid="arcade-plain-english-callout"
      role="status"
      dir="ltr"
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        padding: isCompact ? '4px 8px' : '5px 10px',
        borderRadius: 12,
        background: 'var(--tint-indigo-bg, #eef2ff)',
        border: '1.5px solid var(--tint-indigo-border, #818cf8)',
        color: 'var(--tint-indigo-ink, #312e81)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        fontSize: isCompact ? 'clamp(0.64rem, 1.9vw, 0.72rem)' : '0.78rem',
        fontWeight: 800,
        lineHeight: 1.24,
        overflowWrap: 'anywhere',
      }}
    >
      <span style={{ minWidth: 0, flex: 1 }}>
        <strong style={{ fontWeight: 900 }}>{result.label}:</strong> {result.displayLine}
      </span>
      {onClose ? (
        <button
          type="button"
          aria-label="Hide Normal English"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: 2,
            display: 'inline-flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}

export function ArcadeSayItNormallyButton({
  item,
  language,
  isCompact,
  open,
  avoidTerms,
  dialectAText,
  dialectBText,
  onToggle,
}: {
  item: ArcadeLanternItem;
  language: LanguageCode;
  isCompact: boolean;
  open: boolean;
  avoidTerms?: readonly string[];
  dialectAText?: string;
  dialectBText?: string;
  onToggle: (nextOpen: boolean, resolved: ArcadePlainEnglishResult) => void;
}) {
  const effectiveProfile = useArcadeEffectiveProfile();
  const coopTurn = useArcadeCoopTurn();
  if (isCoopTurnQuarantined(coopTurn) || !isAdultArcadeActive(language, effectiveProfile)) {
    return null;
  }

  return (
    <button
      type="button"
      data-testid="arcade-say-it-normally-btn"
      aria-expanded={open}
      className="tactile-btn"
      style={{
        ...SOFT_BTN_STYLE,
        background: open ? 'var(--tint-indigo-bg, #eef2ff)' : 'var(--card-soft-bg, #f1f5f9)',
        borderColor: open ? 'var(--tint-indigo-border, #818cf8)' : 'var(--card-border, #cbd5e1)',
        color: open ? 'var(--tint-indigo-ink, #312e81)' : 'var(--text-main, #1e1b4b)',
        padding: isCompact ? '3px 7px' : '4px 9px',
        fontSize: isCompact ? 'clamp(0.6rem, 1.8vw, 0.68rem)' : '0.72rem',
        lineHeight: 1.2,
        borderRadius: 10,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
      onClick={() => {
        playSfx('button_click');
        const resolved = resolveArcadePlainEnglish(item, {
          avoidTerms,
          dialectAText,
          dialectBText,
        });
        const nextOpen = !open;
        if (nextOpen) {
          void speakPhrase({
            text: resolved.spokenText,
            language: 'en',
            speed: 'normal',
          });
        }
        onToggle(nextOpen, resolved);
      }}
    >
      <MessageSquareQuote size={isCompact ? 12 : 13} />
      <span>Say It Normally in English</span>
    </button>
  );
}

export function TargetPromptBar({
  label,
  targetItem,
  language,
  isCompact,
  rightContent,
  hearLabel = 'Hear',
  borderColor,
}: {
  label: string;
  targetItem: ArcadeLanternItem;
  language: LanguageCode;
  isCompact: boolean;
  rightContent?: ReactNode;
  hearLabel?: string;
  borderColor?: string;
}) {
  const effectiveProfile = useArcadeEffectiveProfile();
  const coopTurn = useArcadeCoopTurn();
  const langMeta = LANGUAGE_META[language];
  const showPlainButton =
    !isCoopTurnQuarantined(coopTurn) && isAdultArcadeActive(language, effectiveProfile);
  const [plainOpen, setPlainOpen] = useState(false);

  useEffect(() => {
    setPlainOpen(false);
  }, [targetItem.id, language]);

  const targetHint = useHintEngine({
    promptKey: `${language}::${targetItem.id}::${targetItem.foreign}`,
    mode: 'arcade_target',
    canHint: Boolean(targetItem.foreign),
    onCustomTrigger: (tier) => {
      if (tier >= 2) {
        void speakPhrase({
          text: targetItem.foreign,
          language,
          phonetic: targetItem.phonetic,
          slow: tier === 2,
          speed: tier === 2 ? 'slow' : 'normal',
        });
      }
    },
  });

  const plainResult = useMemo(
    () =>
      plainOpen && showPlainButton
        ? resolveArcadePlainEnglish(targetItem, { avoidTerms: [targetItem.foreign] })
        : null,
    [plainOpen, showPlainButton, targetItem]
  );

  return (
    <div
      data-language={language}
      data-dir={langMeta.dir}
      dir="ltr"
      style={{
        ...CARD_SURFACE_STYLE,
        flexShrink: 0,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        padding: isCompact ? '5px 9px' : '8px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: isCompact ? 4 : 6,
        borderRadius: 16,
        borderColor: borderColor ?? 'var(--lang-primary, #f59e0b)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isCompact ? 5 : 8,
          flexWrap: 'wrap',
          width: '100%',
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isCompact ? 5 : 7,
            flexWrap: 'wrap',
            minWidth: 0,
            maxWidth: '100%',
            flex: '1 1 200px',
          }}
        >
          <span
            dir="ltr"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isCompact ? '0.68rem' : '0.8rem',
              fontWeight: 900,
              color: 'var(--tint-amber-ink, #b45309)',
              letterSpacing: '0.03em',
              flexShrink: 0,
            }}
          >
            {label}
          </span>
          <strong
            dir="ltr"
            style={getArcadeClueTextStyle(targetItem.english, {
              isCompact,
              variant: 'prompt',
              color: 'var(--text-main, #1e1b4b)',
              textAlign: 'start',
            })}
          >
            {targetItem.english}
          </strong>
          {targetItem.romanized ? (
            <span
              dir="ltr"
              style={{
                padding: isCompact ? '1px 7px' : '2px 8px',
                borderRadius: 999,
                background: 'var(--tint-indigo-bg, #eef2ff)',
                border: '1px solid var(--tint-indigo-border, #c7d2fe)',
                color: 'var(--tint-indigo-ink, #3730a3)',
                fontSize: isCompact ? 'clamp(0.6rem, 1.8vw, 0.68rem)' : '0.76rem',
                fontWeight: 800,
                lineHeight: 1.3,
                maxWidth: '100%',
                overflowWrap: 'anywhere',
              }}
            >
              {targetItem.romanized}
            </span>
          ) : null}
          <span
            dir="ltr"
            style={{
              padding: isCompact ? '1px 7px' : '2px 8px',
              borderRadius: 999,
              background: 'var(--card-soft-bg, #fef3c7)',
              borderTopWidth: 1,
              borderRightWidth: 1,
              borderLeftWidth: 1,
              borderBottomWidth: 2,
              borderStyle: 'solid',
              borderColor: 'var(--card-border, #cbd5e1)',
              color: 'var(--text-muted, #475569)',
              fontSize: isCompact
                ? targetItem.phonetic.length > 26
                  ? 'clamp(0.56rem, 1.65vw, 0.64rem)'
                  : 'clamp(0.62rem, 1.85vw, 0.68rem)'
                : targetItem.phonetic.length > 32
                  ? '0.7rem'
                  : '0.76rem',
              fontWeight: 800,
              lineHeight: 1.25,
              maxWidth: '100%',
              overflowWrap: 'anywhere',
            }}
          >
            {targetItem.phonetic}
          </span>
          <span
            dir={langMeta.dir}
            style={{
              padding: isCompact ? '1px 6px' : '2px 7px',
              borderRadius: 999,
              background: 'var(--card-soft-bg, #eff6ff)',
              border: '1px solid var(--card-border, #cbd5e1)',
              color: 'var(--text-muted, #475569)',
              fontSize: isCompact ? 'clamp(0.58rem, 1.7vw, 0.64rem)' : '0.7rem',
              fontWeight: 800,
              lineHeight: 1.3,
              maxWidth: '100%',
              overflowWrap: 'anywhere',
            }}
          >
            {langMeta.nativeName}
          </span>
          <button
            type="button"
            className="tactile-btn"
            aria-label={`Hear ${targetItem.foreign}`}
            style={{
              ...SOFT_BTN_STYLE,
              padding: isCompact ? '3px 7px' : '4px 9px',
              fontSize: isCompact ? '0.7rem' : '0.74rem',
              borderRadius: 10,
              flexShrink: 0,
            }}
            onClick={() => {
              void speakPhrase({
                text: targetItem.foreign,
                language,
                phonetic: targetItem.phonetic,
              });
            }}
          >
            <Volume2 size={13} />
            <span>{hearLabel}</span>
          </button>
          {showPlainButton ? (
            <ArcadeSayItNormallyButton
              item={targetItem}
              language={language}
              isCompact={isCompact}
              open={plainOpen}
              avoidTerms={[targetItem.foreign]}
              onToggle={(nextOpen) => setPlainOpen(nextOpen)}
            />
          ) : null}
          <StarlightHintButton
            size="xs"
            hintTier={targetHint.hintTier}
            hintsUsed={targetHint.hintsUsed}
            isAnimating={targetHint.isAnimating}
            canHint={targetHint.canHint}
            onTrigger={targetHint.triggerHint}
          />
        </div>

        {rightContent ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
              maxWidth: '100%',
            }}
          >
            {rightContent}
          </div>
        ) : null}
      </div>

      {targetHint.hintTier > 0 ? (
        <div
          data-testid="arcade-target-hint"
          dir="ltr"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            padding: isCompact ? '3px 8px' : '4px 10px',
            borderRadius: 10,
            background: 'var(--starlight-recall-bg, rgba(23, 18, 58, 0.84))',
            border: '1px solid var(--starlight-border, #a78bfa)',
            color: 'var(--starlight-ink, #e0e7ff)',
            fontSize: isCompact ? '0.68rem' : '0.75rem',
            fontWeight: 800,
          }}
        >
          {targetHint.hintTier === 1 ? (
            <span>
              Starlight Whisper: Starts with “{Array.from(targetItem.foreign).slice(0, 2).join('')}…”
              ({targetItem.foreign.trim().split(/\s+/).length}{' '}
              {targetItem.foreign.trim().split(/\s+/).length === 1 ? 'word' : 'words'})
            </span>
          ) : targetHint.hintTier === 2 ? (
            <span>
              Sound Cadence: {targetItem.phonetic || targetItem.romanized || targetItem.foreign}
            </span>
          ) : (
            <span>
              Target Anchor:{' '}
              <bdi dir={langMeta.dir} style={{ fontWeight: 900 }}>
                {targetItem.foreign}
              </bdi>
            </span>
          )}
        </div>
      ) : null}

      {plainResult ? (
        <ArcadePlainEnglishCallout
          result={plainResult}
          isCompact={isCompact}
          onClose={() => setPlainOpen(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Renders the standardized WCAG AA amber Mini Offline Deck indicator pill when
 * a non-adult language's lazy course chunk failed to load offline.
 */
export function ArcadeMiniOfflineDeckPill({
  language,
  isCompact,
}: {
  language: LanguageCode;
  isCompact: boolean;
}) {
  const langLoadState = useArcadeLanguageLoadState(language);
  const showMiniOfflineDeckPill =
    !isAdultLanguage(language) &&
    Boolean(langLoadState.error) &&
    !langLoadState.loaded;

  if (!showMiniOfflineDeckPill) {
    return null;
  }

  return (
    <span
      data-testid="cabinet-mini-offline-deck-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: isCompact ? '2px 8px' : '4px 10px',
        borderRadius: 999,
        background: 'var(--tint-amber-bg, #fffbeb)',
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderLeftWidth: 2,
        borderBottomWidth: 3,
        borderStyle: 'solid',
        borderColor: 'var(--tint-amber-border, #f59e0b)',
        color: 'var(--tint-amber-ink, #92400e)',
        fontSize: isCompact ? '0.68rem' : '0.78rem',
        fontWeight: 900,
        fontFamily: 'var(--font-display)',
      }}
    >
      <WifiOff size={isCompact ? 11 : 13} aria-hidden="true" />
      <span>Mini Offline Deck · 8 Starter Cards</span>
    </span>
  );
}

export function ArcadeReadyCard({
  companionId,
  badgeText,
  title,
  description,
  startLabel,
  bestScore,
  arcadeTier,
  language,
  isCompact,
  emblem,
  buttonClass = 'tactile-btn-primary',
  onStart,
}: {
  companionId: CompanionId;
  badgeText: string;
  title: string;
  description: string;
  startLabel: string;
  bestScore: number;
  arcadeTier?: ArcadeProficiencyTier;
  language?: LanguageCode;
  isCompact: boolean;
  emblem?: ReactNode;
  buttonClass?: string;
  onStart: () => void;
}) {
  const { activeProfile } = useVaultStore();
  const coopTurn = useArcadeCoopTurn();
  const effectiveProfile = coopTurn?.playerProfile ?? activeProfile;
  const kidQuarantined = isCoopTurnQuarantined(coopTurn);
  const effectiveLanguage =
    language ??
    resolveEffectiveArcadeLanguage(effectiveProfile, {
      languageOverride: coopTurn?.languageOverride,
      fallbackProfile: activeProfile,
      kidQuarantined,
    });
  const tierMeta = arcadeTier ? ARCADE_TIER_META[arcadeTier] : null;

  return (
    <div
      style={{
        ...CARD_SURFACE_STYLE,
        flex: 1,
        minHeight: 0,
        padding: isCompact ? '10px 12px' : 22,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isCompact ? 6 : 12,
        textAlign: 'center',
        overflowY: 'auto',
      }}
    >
      {coopTurn ? (
        <div
          data-testid="arcade-coop-ready-banner"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: isCompact ? '2px 9px' : '4px 12px',
            borderRadius: 999,
            background: 'var(--tint-indigo-bg, #eef2ff)',
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderLeftWidth: 2,
            borderBottomWidth: 3,
            borderStyle: 'solid',
            borderColor: coopTurn.playerProfile.bannerColor || '#6366f1',
            color: 'var(--tint-indigo-ink, #312e81)',
            fontFamily: 'var(--font-display)',
            fontSize: isCompact ? '0.72rem' : '0.84rem',
            fontWeight: 900,
          }}
        >
          <AvatarBadge avatarId={coopTurn.playerProfile.avatarId} size={isCompact ? 16 : 22} />
          <span>
            Co-Op Turn {coopTurn.turnNumber} of 2 · {coopTurn.playerProfile.name}&apos;s Turn!
          </span>
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isCompact ? 8 : 12 }}>
        <MascotStage
          companionId={companionId}
          pose="happy"
          equippedCosmetics={companionId === 'pip' ? effectiveProfile.equippedCosmetics : undefined}
          size={isCompact ? 76 : 124}
          badgeText={badgeText}
        />
        {emblem ? <div style={{ flexShrink: 0 }}>{emblem}</div> : null}
      </div>

      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: isCompact ? '1.06rem' : '1.4rem',
          fontWeight: 900,
          color: 'var(--text-main, #1e1b4b)',
          lineHeight: 1.15,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: 0,
          maxWidth: 480,
          fontSize: isCompact ? '0.78rem' : '0.92rem',
          fontWeight: 700,
          color: 'var(--text-muted, #475569)',
          lineHeight: isCompact ? 1.3 : 1.38,
        }}
      >
        {description}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isCompact ? 5 : 8,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            padding: isCompact ? '2px 8px' : '4px 10px',
            borderRadius: 999,
            background: '#fffbeb',
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderLeftWidth: 2,
            borderBottomWidth: 3,
            borderStyle: 'solid',
            borderColor: '#f59e0b',
            color: '#b45309',
            fontSize: isCompact ? '0.7rem' : '0.78rem',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
          }}
        >
          Best Score: {bestScore}
        </span>
        {tierMeta ? (
          <span
            style={{
              padding: isCompact ? '2px 8px' : '4px 10px',
              borderRadius: 999,
              background: tierMeta.bgColor,
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderLeftWidth: 2,
              borderBottomWidth: 3,
              borderStyle: 'solid',
              borderColor: tierMeta.borderColor,
              color: tierMeta.textColor,
              fontSize: isCompact ? '0.7rem' : '0.78rem',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
            }}
          >
            {tierMeta.label} ({tierMeta.cefrLabel}) · {tierMeta.paceLabel} Pace · {tierMeta.rewardLabel} Rewards
          </span>
        ) : null}
        <ArcadeMiniOfflineDeckPill language={effectiveLanguage} isCompact={isCompact} />
      </div>

      <button
        type="button"
        className={`tactile-btn tactile-btn-hero ${buttonClass}`}
        onClick={onStart}
      >
        <Play size={18} />
        <span>{startLabel}</span>
      </button>
    </div>
  );
}

export function ArcadeSummaryCard({
  companionId,
  badgeText,
  title,
  score,
  bestScore,
  heartsWon,
  bonusGems,
  xpEarned,
  arcadeTier,
  statLine,
  isCompact,
  isHeartRecovery = false,
  mascotSlot,
  playAgainLabel = 'Play Again!',
  onResumeLesson,
  onPlayAgain,
  onExit,
  exitLabel = 'Back to Arcade Hub',
}: {
  companionId: CompanionId;
  badgeText: string;
  title: string;
  score: number;
  bestScore: number;
  heartsWon: number;
  bonusGems: number;
  xpEarned?: number;
  arcadeTier?: ArcadeProficiencyTier;
  statLine: string;
  isCompact: boolean;
  isHeartRecovery?: boolean;
  mascotSlot?: ReactNode;
  playAgainLabel?: string;
  onResumeLesson?: () => void;
  onPlayAgain: () => void;
  onExit?: () => void;
  exitLabel?: string;
}) {
  const effectiveProfile = useArcadeEffectiveProfile();
  const tierMeta = arcadeTier ? ARCADE_TIER_META[arcadeTier] : null;

  return (
    <div
      style={{
        ...CARD_SURFACE_STYLE,
        flex: 1,
        minHeight: 0,
        padding: isCompact ? 14 : 22,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isCompact ? 8 : 12,
        textAlign: 'center',
        overflowY: 'auto',
      }}
    >
      <ConfettiBurst active intensity="grand" />
      {mascotSlot ?? (
        <MascotStage
          companionId={companionId}
          pose="victory_dance"
          equippedCosmetics={companionId === 'pip' ? effectiveProfile.equippedCosmetics : undefined}
          size={isCompact ? 92 : 124}
          badgeText={badgeText}
        />
      )}

      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: isCompact ? '1.15rem' : '1.38rem',
          fontWeight: 900,
          color: 'var(--text-main, #1e1b4b)',
        }}
      >
        {title}
      </h2>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span
          className="hud-pill hud-pill-static"
          style={{ background: '#fffbeb', borderColor: '#f59e0b', color: '#b45309' }}
        >
          <Star size={14} fill="#f59e0b" /> Score: {score} (Best: {Math.max(score, bestScore)})
        </span>
        <span
          className="hud-pill hud-pill-static"
          style={{ background: '#fff1f2', borderColor: '#fda4af', color: '#be123c' }}
        >
          <Heart size={14} fill="#f43f5e" /> +{heartsWon} Hearts
        </span>
        <span
          className="hud-pill hud-pill-static"
          style={{ background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }}
        >
          <Gem size={14} /> +{bonusGems} Gems
        </span>
        {xpEarned !== undefined ? (
          <span
            className="hud-pill hud-pill-static"
            style={{
              background: tierMeta?.bgColor ?? '#ecfdf5',
              borderColor: tierMeta?.borderColor ?? '#34d399',
              color: tierMeta?.textColor ?? '#065f46',
            }}
          >
            <Sparkles size={14} /> +{xpEarned} XP
          </span>
        ) : null}
      </div>

      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted, #475569)' }}>
        {statLine}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 2 }}>
        {isHeartRecovery && onResumeLesson ? (
          <button
            type="button"
            className="tactile-btn tactile-btn-hero tactile-btn-success"
            onClick={onResumeLesson}
          >
            Resume Lesson!
          </button>
        ) : (
          <button
            type="button"
            className="tactile-btn tactile-btn-hero tactile-btn-primary"
            onClick={() => {
              playSfx('button_click');
              onPlayAgain();
            }}
          >
            <RotateCcw size={17} />
            <span>{playAgainLabel}</span>
          </button>
        )}

        {onExit ? (
          <button
            type="button"
            className="tactile-btn tactile-btn-hero"
            style={SOFT_BTN_STYLE}
            onClick={onExit}
          >
            {exitLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
