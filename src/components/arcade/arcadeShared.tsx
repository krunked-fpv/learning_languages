import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Gem, Heart, Play, RotateCcw, Sparkles, Star, Volume2, X } from 'lucide-react';
import { playSfx, speakPhrase } from '../../audio';
import { getArcadeLexicon } from '../../curriculum';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import {
  LANGUAGE_META,
  type ArcadeLanternItem,
  type ArcadeProficiencyTier,
  type CompanionId,
  type LanguageCode,
  type ProficiencyTier,
} from '../../types/contracts';
import { MascotStage } from '../characters/MascotStage';
import { ConfettiBurst } from '../fx/JuiceEngine';

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
};

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

  let fontSize: string;
  if (density === 'tight') {
    if (isCompact) {
      if (effectiveLen <= 8) fontSize = isTallScript ? '0.78rem' : '0.74rem';
      else if (effectiveLen <= 14) fontSize = '0.68rem';
      else if (effectiveLen <= 22) fontSize = '0.62rem';
      else fontSize = '0.58rem';
    } else {
      if (effectiveLen <= 10) fontSize = isTallScript ? '0.96rem' : '0.9rem';
      else if (effectiveLen <= 16) fontSize = '0.82rem';
      else if (effectiveLen <= 24) fontSize = '0.74rem';
      else fontSize = '0.68rem';
    }
  } else if (density === 'large') {
    if (isCompact) {
      if (effectiveLen <= 10) fontSize = isTallScript ? '1rem' : '0.92rem';
      else if (effectiveLen <= 18) fontSize = '0.82rem';
      else fontSize = '0.74rem';
    } else {
      if (effectiveLen <= 12) fontSize = isTallScript ? '1.18rem' : '1.08rem';
      else if (effectiveLen <= 20) fontSize = '0.96rem';
      else fontSize = '0.86rem';
    }
  } else {
    if (isCompact) {
      if (effectiveLen <= 10) fontSize = isTallScript ? '0.84rem' : '0.78rem';
      else if (effectiveLen <= 18) fontSize = '0.72rem';
      else fontSize = '0.66rem';
    } else {
      if (effectiveLen <= 12) fontSize = isTallScript ? '0.94rem' : '0.88rem';
      else if (effectiveLen <= 20) fontSize = '0.8rem';
      else fontSize = '0.74rem';
    }
  }

  return {
    fontFamily: 'var(--font-display)',
    fontWeight: 900,
    fontSize,
    lineHeight: 1.35,
    color,
    textAlign,
    maxWidth: '100%',
    minWidth: 0,
    whiteSpace: 'normal',
    overflowWrap: isCjk ? 'anywhere' : 'break-word',
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

export function recordArcadeRunResult(params: {
  gameId: string;
  score: number;
  heartsWon: number;
  bonusGems: number;
  xpEarned: number;
}): void {
  type RecordWithXp = (input: {
    gameId: string;
    score: number;
    heartsWon: number;
    bonusGems: number;
    xpEarned?: number;
  }) => void;
  (vaultActions.recordArcadeGameResult as RecordWithXp)(params);
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

export function useArcadeDeck(arcadeTier: ArcadeProficiencyTier = 'sprout'): {
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
  const language = activeProfile.activeLanguage;
  const tierMeta = ARCADE_TIER_META[arcadeTier];

  const rawLexicon = useMemo(() => {
    try {
      type GetArcadeLexiconCompat = (
        lang: LanguageCode,
        unlockedVocabIds: readonly string[],
        currentUnitIndex: number,
        tier?: ArcadeProficiencyTier
      ) => ArcadeLanternItem[];

      const items = (getArcadeLexicon as GetArcadeLexiconCompat)(
        language,
        activeProgress?.unlockedVocabIds ?? [],
        activeProgress?.currentUnitIndex ?? 0,
        arcadeTier
      );
      return items.length >= 8 ? items : FALLBACK_ARCADE_LEXICON[language];
    } catch {
      return FALLBACK_ARCADE_LEXICON[language];
    }
  }, [language, activeProgress?.unlockedVocabIds, activeProgress?.currentUnitIndex, arcadeTier]);

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
        const unitIdx = activeProgress?.currentUnitIndex ?? 0;
        const unlockedCount = activeProgress?.unlockedVocabIds?.length ?? 0;
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

    const unitIdx = activeProgress?.currentUnitIndex ?? 0;
    const unlockedCount = activeProgress?.unlockedVocabIds?.length ?? 0;
    if (arcadeTier === 'sprout' && unitIdx === 0 && unlockedCount < 13) {
      return {
        lexicon: rawLexicon,
        targetLexicon: rawLexicon.slice(0, Math.min(13, rawLexicon.length)),
      };
    }
    return { lexicon: rawLexicon, targetLexicon: rawLexicon };
  }, [rawLexicon, arcadeTier, activeProgress?.currentUnitIndex, activeProgress?.unlockedVocabIds?.length]);

  const bestScoreFor = (gameId: string): number => {
    const mapScore = activeProfile.arcadeHighScores?.[gameId] ?? 0;
    if (gameId === 'starlight_choir') {
      return Math.max(mapScore, activeProfile.secretArcadeBestScore ?? 0);
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
  const langMeta = LANGUAGE_META[language];

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
        padding: isCompact ? '6px 10px' : '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: isCompact ? 6 : 8,
        flexWrap: 'wrap',
        borderRadius: 16,
        borderColor: borderColor ?? 'var(--lang-primary, #f59e0b)',
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
            fontSize: isCompact ? '0.7rem' : '0.8rem',
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
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: isCompact
              ? targetItem.english.length > 22
                ? '0.86rem'
                : '0.96rem'
              : '1.1rem',
            lineHeight: 1.25,
            color: 'var(--text-main, #1e1b4b)',
            maxWidth: '100%',
            overflowWrap: 'break-word',
          }}
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
              fontSize: isCompact ? '0.68rem' : '0.76rem',
              fontWeight: 800,
              lineHeight: 1.35,
              maxWidth: '100%',
              overflowWrap: 'break-word',
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
            fontSize: isCompact ? '0.68rem' : '0.76rem',
            fontWeight: 800,
            lineHeight: 1.35,
            maxWidth: '100%',
            overflowWrap: 'break-word',
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
            fontSize: isCompact ? '0.64rem' : '0.7rem',
            fontWeight: 800,
            lineHeight: 1.35,
            flexShrink: 0,
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
  isCompact: boolean;
  emblem?: ReactNode;
  buttonClass?: string;
  onStart: () => void;
}) {
  const { activeProfile } = useVaultStore();
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <MascotStage
          companionId={companionId}
          pose="happy"
          equippedCosmetics={companionId === 'pip' ? activeProfile.equippedCosmetics : undefined}
          size={isCompact ? 92 : 124}
          badgeText={badgeText}
        />
        {emblem ? <div style={{ flexShrink: 0 }}>{emblem}</div> : null}
      </div>

      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: isCompact ? '1.15rem' : '1.4rem',
          fontWeight: 900,
          color: 'var(--text-main, #1e1b4b)',
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: 0,
          maxWidth: 480,
          fontSize: isCompact ? '0.82rem' : '0.92rem',
          fontWeight: 700,
          color: 'var(--text-muted, #475569)',
          lineHeight: 1.38,
        }}
      >
        {description}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: 999,
            background: '#fffbeb',
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderLeftWidth: 2,
            borderBottomWidth: 3,
            borderStyle: 'solid',
            borderColor: '#f59e0b',
            color: '#b45309',
            fontSize: '0.78rem',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
          }}
        >
          Best Score: {bestScore}
        </span>
        {tierMeta ? (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: tierMeta.bgColor,
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderLeftWidth: 2,
              borderBottomWidth: 3,
              borderStyle: 'solid',
              borderColor: tierMeta.borderColor,
              color: tierMeta.textColor,
              fontSize: '0.78rem',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
            }}
          >
            {tierMeta.label} ({tierMeta.cefrLabel}) · {tierMeta.paceLabel} Pace · {tierMeta.rewardLabel} Rewards
          </span>
        ) : null}
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
  const { activeProfile } = useVaultStore();
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
          equippedCosmetics={companionId === 'pip' ? activeProfile.equippedCosmetics : undefined}
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
