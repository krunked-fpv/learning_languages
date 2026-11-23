import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Lock,
  RotateCcw,
  Shuffle,
  Sparkles,
  Turtle,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { FlagIcon } from '../../art/FlagIcon';
import { VocabIllustration } from '../../art/VocabIllustration';
import { getCourse } from '../../curriculum';
import { playSfx, speakPhrase } from '../../audio';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import { ensureAccessibleButtonBg, useCompactViewport } from '../lesson/lessonHelpers';
import { SayItNormallyButton } from '../lesson/SayItNormallyButton';
import { safeVaultActions } from '../shell/vaultSafeActions';
import { useEnsureAdultCurriculum } from '../shell/adultCurriculumSync';
import {
  ALL_LANGUAGE_LIST,
  GENDER_BADGE_META,
  LANGUAGE_LIST,
  LANGUAGE_META,
  PROFICIENCY_TIERS,
  PROFICIENCY_TIER_META,
  isAdultLanguage,
  resolveUnitProficiencyTier,
  type LanguageCode,
  type ProficiencyTier,
  type VocabCard,
} from '../../types/contracts';

export function PhrasebookVault() {
  const { activeProfile } = useVaultStore();
  const compact = useCompactViewport();
  const isAdultModeActive = Boolean(activeProfile.adultModeActive);
  const safeInitialLang: LanguageCode =
    !isAdultModeActive && isAdultLanguage(activeProfile.activeLanguage)
      ? (activeProfile.lastBaseLanguage ?? 'en')
      : activeProfile.activeLanguage;
  const [viewLang, setViewLang] = useState<LanguageCode>(safeInitialLang);
  const [tierFilter, setTierFilter] = useState<'all' | ProficiencyTier>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOffOpen, setShowOffOpen] = useState(false);
  const [deckIndex, setDeckIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<string[] | null>(null);

  useEffect(() => {
    setViewLang(safeInitialLang);
    setTierFilter('all');
    setUnitFilter('all');
  }, [safeInitialLang]);

  const effectiveViewLang: LanguageCode =
    !isAdultModeActive && isAdultLanguage(viewLang) ? safeInitialLang : viewLang;
  const visibleLanguages = isAdultModeActive ? ALL_LANGUAGE_LIST : LANGUAGE_LIST;

  const adultRegistryVersion = useEnsureAdultCurriculum(isAdultModeActive, effectiveViewLang);
  const viewLangMeta = LANGUAGE_META[effectiveViewLang];
  const langDir = viewLangMeta.dir;
  const course = useMemo(
    () => getCourse(effectiveViewLang),
    [effectiveViewLang, adultRegistryVersion]
  );
  const courseUnits = useMemo(() => course?.units ?? [], [course]);
  const langProgress = activeProfile.languageProgress[effectiveViewLang];
  const unlockedSet = useMemo(
    () => new Set(langProgress?.unlockedVocabIds ?? []),
    [langProgress?.unlockedVocabIds]
  );

  const allCards = useMemo(
    () => courseUnits.flatMap((unit) => unit.vocabCards),
    [courseUnits]
  );

  const visibleUnitTabs = useMemo(
    () =>
      courseUnits.filter((u) => {
        if (tierFilter === 'all') return true;
        const unitTier = u.proficiencyTier ?? resolveUnitProficiencyTier(u.order);
        return unitTier === tierFilter;
      }),
    [courseUnits, tierFilter]
  );

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courseUnits
      .filter((u) => {
        const unitTier = u.proficiencyTier ?? resolveUnitProficiencyTier(u.order);
        if (tierFilter !== 'all' && unitTier !== tierFilter) return false;
        return unitFilter === 'all' || u.id === unitFilter;
      })
      .map((u) => ({
        ...u,
        cards: u.vocabCards.filter((card) => {
          if (!q) return true;
          return (
            card.foreignWithArticle.toLowerCase().includes(q) ||
            card.english.toLowerCase().includes(q) ||
            card.phonetic.toLowerCase().includes(q) ||
            Boolean(card.romanized?.toLowerCase().includes(q))
          );
        }),
      }))
      .filter((u) => u.cards.length > 0);
  }, [course.units, tierFilter, unitFilter, searchQuery]);

  const unlockedCards = useMemo(
    () => allCards.filter((c) => unlockedSet.has(c.id)),
    [allCards, unlockedSet]
  );

  const showOffDeck: VocabCard[] = useMemo(() => {
    if (!shuffledOrder) return unlockedCards;
    const byId = new Map(unlockedCards.map((c) => [c.id, c]));
    return shuffledOrder.map((id) => byId.get(id)).filter((c): c is VocabCard => Boolean(c));
  }, [unlockedCards, shuffledOrder]);

  const activeFlashcard = showOffDeck[deckIndex] ?? null;

  useEffect(() => {
    if (!showOffOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowOffOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showOffOpen]);

  const openShowOff = () => {
    playSfx('button_click');
    setDeckIndex(0);
    setCardFlipped(false);
    setShuffledOrder(null);
    setShowOffOpen(true);
  };

  const shuffleDeck = () => {
    playSfx('flip_card');
    const ids = unlockedCards.map((c) => c.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = ids[i];
      ids[i] = ids[j];
      ids[j] = tmp;
    }
    setShuffledOrder(ids);
    setDeckIndex(0);
    setCardFlipped(false);
  };

  return (
    <section
      aria-label="Living Phrasebook"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 7 : 10,
        overflow: 'hidden',
      }}
    >
      {/* Top Banner */}
      <div
        className="tactile-card"
        style={{
          padding: compact ? '8px 10px' : '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 200px', minWidth: 0 }}>
          <div
            style={{
              width: compact ? 32 : 40,
              height: compact ? 32 : 40,
              borderRadius: 12,
              background: 'var(--lang-tint)',
              border: '2px solid var(--lang-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--lang-primary)',
              flexShrink: 0,
            }}
          >
            <BookOpen size={compact ? 17 : 20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: compact ? '0.98rem' : '1.2rem', fontWeight: 900, color: 'var(--text-main)' }}>
              Living Phrasebook Sticker-Book
            </h1>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                overflowWrap: 'break-word',
              }}
            >
              {viewLangMeta.name}: {unlockedCards.length} / {allCards.length} Stickers Collected
              {isAdultModeActive && viewLangMeta.pairDirectionBadge
                ? ` · ${viewLangMeta.pairDirectionBadge}`
                : ''}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="tactile-btn tactile-btn-amber"
          style={{ padding: compact ? '6px 10px' : '9px 16px', fontSize: compact ? '0.78rem' : '0.92rem' }}
          onClick={openShowOff}
        >
          <Sparkles size={15} />
          <span>Family Show-Off Mode</span>
        </button>
      </div>

      {/* Filters: 16-Language Strip + CEFR Tier Filter Pills + Search + U1..U16 Tabs */}
      <div
        className="tactile-card"
        style={{
          padding: compact ? '7px 9px' : '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? 5 : 7,
          flexShrink: 0,
        }}
      >
        <div
          role="group"
          aria-label="Filter phrasebook by language"
          className="console-scroll-pane-x"
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'nowrap',
            alignItems: 'center',
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: 2,
          }}
        >
          {visibleLanguages.map((lang) => {
            const isSelected = lang === effectiveViewLang;
            const meta = LANGUAGE_META[lang];
            return (
              <button
                key={lang}
                type="button"
                aria-pressed={isSelected}
                className="tactile-btn"
                style={{
                  padding: '4px 9px',
                  background: isSelected ? 'var(--tint-indigo-bg)' : 'var(--tile-bg)',
                  borderColor: isSelected ? meta.accentPalette.primary : 'var(--card-border)',
                  fontSize: '0.78rem',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
                onClick={() => {
                  playSfx('button_click');
                  setViewLang(lang);
                  setTierFilter('all');
                  setUnitFilter('all');
                }}
              >
                <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                  <FlagIcon language={lang} size={18} />
                </span>
                <span>{meta.name}</span>
              </button>
            );
          })}
        </div>

        {/* CEFR Proficiency Tier Filter Pills */}
        <div
          role="group"
          aria-label="Filter phrasebook by CEFR tier"
          className="console-scroll-pane-x"
          style={{
            display: 'flex',
            gap: 5,
            flexWrap: 'nowrap',
            alignItems: 'center',
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: 1,
          }}
        >
          <button
            type="button"
            aria-pressed={tierFilter === 'all'}
            className={`tactile-tile ${tierFilter === 'all' ? 'is-selected' : ''}`}
            style={{ padding: '3px 10px', fontSize: '0.74rem', whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => {
              playSfx('tile_tap');
              setTierFilter('all');
              setUnitFilter('all');
            }}
          >
            All Tiers
          </button>
          {PROFICIENCY_TIERS.map((tier) => {
            const meta = PROFICIENCY_TIER_META[tier];
            const isSelected = tierFilter === tier;
            return (
              <button
                key={tier}
                type="button"
                aria-pressed={isSelected}
                className={`tactile-tile ${isSelected ? 'is-selected' : ''}`}
                style={{
                  padding: '3px 10px',
                  fontSize: '0.74rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  borderColor: isSelected ? meta.badgeColor : undefined,
                }}
                onClick={() => {
                  playSfx('tile_tap');
                  setTierFilter(tier);
                  setUnitFilter('all');
                }}
              >
                {meta.cefrLabel} · {meta.title}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            className="themed-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search words or meanings..."
            aria-label="Search phrasebook"
            style={{
              flex: '1 1 150px',
              minWidth: 0,
              maxWidth: compact ? '100%' : 240,
              padding: '5px 10px',
              fontSize: '0.8rem',
            }}
          />

          <div
            className="console-scroll-pane-x"
            style={{
              display: 'flex',
              gap: 5,
              flexWrap: 'nowrap',
              alignItems: 'center',
              overflowX: 'auto',
              overflowY: 'hidden',
              flex: '1 1 200px',
              paddingBottom: 2,
            }}
          >
            <button
              type="button"
              className={`tactile-tile ${unitFilter === 'all' ? 'is-selected' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.74rem', whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={() => setUnitFilter('all')}
            >
              All Units
            </button>
            {visibleUnitTabs.map((u) => (
              <button
                key={u.id}
                type="button"
                title={`Unit ${u.order}: ${u.title}`}
                aria-label={`Unit ${u.order}: ${u.title}`}
                className={`tactile-tile ${unitFilter === u.id ? 'is-selected' : ''}`}
                style={{ padding: '4px 9px', fontSize: '0.74rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                onClick={() => setUnitFilter(u.id)}
              >
                U{u.order}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Internally Bounded Sticker Grid */}
      <div className="console-scroll-pane" style={{ flex: '1 1 auto', paddingRight: 4 }}>
        {filteredUnits.length === 0 ? (
          <div className="tactile-card" style={{ padding: 24, textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
            {allCards.length === 0
              ? isAdultLanguage(effectiveViewLang)
                ? `Loading ${viewLangMeta.name} stickers...`
                : 'No vocabulary stickers loaded for this course yet.'
              : 'No stickers matched your search filter.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
            {filteredUnits.map((unit) => {
              const unitTier = unit.proficiencyTier ?? resolveUnitProficiencyTier(unit.order);
              const unitTierMeta = PROFICIENCY_TIER_META[unitTier];
              return (
                <div key={unit.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingLeft: 4, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: ensureAccessibleButtonBg(unit.themeColor),
                        color: '#ffffff',
                        fontSize: '0.76rem',
                        fontWeight: 900,
                      }}
                    >
                      Unit {unit.order}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: unitTierMeta.surfaceTint,
                        border: `1.5px solid ${unitTierMeta.badgeColor}`,
                        color: '#0f172a',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                      }}
                    >
                      {unitTierMeta.cefrLabel}
                    </span>
                    <h2 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: 'var(--text-main)' }}>
                      {unit.title} — {unit.culturalLandmark}
                    </h2>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(225px, 1fr))',
                      gap: 10,
                    }}
                  >
                    {unit.cards.map((card) => {
                      const isUnlocked = unlockedSet.has(card.id);
                      const genderMeta = GENDER_BADGE_META[card.gender];

                      if (!isUnlocked) {
                        return (
                          <div
                            key={card.id}
                            className="tactile-card"
                            style={{
                              padding: 12,
                              background: 'var(--card-soft-bg)',
                              borderStyle: 'dashed',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              textAlign: 'center',
                              minHeight: 165,
                            }}
                          >
                            <div style={{ filter: 'grayscale(1)', opacity: 0.25 }}>
                              <VocabIllustration
                                illustrationKey={card.illustrationKey}
                                language={effectiveViewLang}
                                size={60}
                              />
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 900, color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                              <Lock size={13} /> Mystery Sticker
                            </div>
                            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                              Complete Unit {unit.order} lessons to collect!
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={card.id}
                          className="tactile-card"
                          style={{
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            background: 'var(--card-bg)',
                            minWidth: 0,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
                            <span
                              className="gender-pill"
                              style={{
                                backgroundColor: genderMeta.bgColor,
                                color: genderMeta.textColor,
                                borderColor: genderMeta.borderColor,
                              }}
                            >
                              {genderMeta.shortLabel}
                            </span>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="tactile-btn tactile-btn-soft"
                                style={{ padding: '4px 7px', fontSize: '0.72rem', borderRadius: 10 }}
                                aria-label={`Speak ${card.bareForeign}`}
                                onClick={() => {
                                  void speakPhrase({
                                    text: card.foreignWithArticle || card.bareForeign,
                                    language: effectiveViewLang,
                                    phonetic: card.phonetic,
                                    speed: 'normal',
                                  });
                                }}
                              >
                                <Volume2 size={12} /> 1.0x
                              </button>
                              <button
                                type="button"
                                className="tactile-btn tactile-btn-soft"
                                style={{ padding: '4px 7px', fontSize: '0.72rem', borderRadius: 10 }}
                                aria-label={`Speak ${card.bareForeign} slowly`}
                                onClick={() => {
                                  vaultActions.recordTurtlePlay();
                                  void speakPhrase({
                                    text: card.foreignWithArticle || card.bareForeign,
                                    language: effectiveViewLang,
                                    phonetic: card.phonetic,
                                    slow: true,
                                    speed: 'slow',
                                  });
                                }}
                              >
                                <Turtle size={12} /> 0.65x
                              </button>
                              <button
                                type="button"
                                className="tactile-btn tactile-btn-soft"
                                style={{ padding: '4px 7px', fontSize: '0.72rem', borderRadius: 10 }}
                                aria-label={`Speak ${card.bareForeign} fluently`}
                                onClick={() => {
                                  safeVaultActions.recordFluentPlay();
                                  void speakPhrase({
                                    text: card.foreignWithArticle || card.bareForeign,
                                    language: effectiveViewLang,
                                    phonetic: card.phonetic,
                                    speed: 'fluent',
                                  });
                                }}
                              >
                                <Zap size={11} /> 1.12x
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                              <VocabIllustration
                                illustrationKey={card.illustrationKey}
                                language={effectiveViewLang}
                                size={64}
                              />
                            </span>
                            <div style={{ minWidth: 0, flex: 1, overflowWrap: 'break-word' }}>
                              <div
                                dir={langDir}
                                style={{
                                  fontSize: '1.02rem',
                                  fontWeight: 900,
                                  color: 'var(--text-main)',
                                  lineHeight: langDir === 'rtl' ? 1.5 : 1.25,
                                  overflowWrap: 'break-word',
                                }}
                              >
                                {card.foreignWithArticle}
                              </div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', overflowWrap: 'break-word' }}>
                                {card.english}
                              </div>
                              {card.romanized ? (
                                <div style={{ fontSize: '0.77rem', fontWeight: 700, color: 'var(--text-muted)', overflowWrap: 'break-word' }}>
                                  {card.romanized}
                                </div>
                              ) : null}
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--lang-primary)', overflowWrap: 'break-word' }}>
                                {card.phonetic}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              padding: '6px 9px',
                              borderRadius: 12,
                              background: 'var(--card-soft-bg)',
                              border: '1px solid var(--card-border)',
                              fontSize: '0.76rem',
                              minWidth: 0,
                              overflowWrap: 'break-word',
                            }}
                          >
                            <div
                              dir={langDir}
                              style={{
                                fontWeight: 800,
                                color: 'var(--text-main)',
                                lineHeight: langDir === 'rtl' ? 1.5 : 1.35,
                              }}
                            >
                              {card.exampleForeign}
                            </div>
                            {card.exampleRomanized ? (
                              <div style={{ fontWeight: 700, color: 'var(--lang-primary)' }}>
                                {card.exampleRomanized}
                              </div>
                            ) : null}
                            <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                              {card.exampleEnglish}
                            </div>
                          </div>

                          <SayItNormallyButton
                            language={effectiveViewLang}
                            dialectAText={card.foreignWithArticle}
                            dialectBText={card.english}
                            explicitPlain={card.plainEnglish}
                            registerNote={card.registerNote}
                            secondaryDialectAText={card.exampleForeign}
                            secondaryDialectBText={card.exampleEnglish}
                            secondaryExplicitPlain={card.examplePlainEnglish}
                            resetKey={card.id}
                            size="sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Family Show-Off Mode Interactive Flashcard Spotlight */}
      {showOffOpen ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Family Show-Off Flashcard Spotlight"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowOffOpen(false);
          }}
        >
          <div className="modal-card" style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} color="#f59e0b" />
                <strong style={{ fontSize: '1.15rem' }}>Family Show-Off Mode</strong>
              </div>
              <button
                type="button"
                className="tactile-btn tactile-btn-soft"
                style={{ padding: 7, borderRadius: 12 }}
                aria-label="Close Family Show-Off Mode"
                onClick={() => setShowOffOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {!activeFlashcard ? (
              <div style={{ padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                  No {viewLangMeta.name} stickers unlocked yet!
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Complete Lesson 1 on the Atlas Map to collect your first stickers and show them off
                  to your family!
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                  <span>
                    Card {deckIndex + 1} of {showOffDeck.length}
                  </span>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-soft"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={shuffleDeck}
                  >
                    <Shuffle size={14} /> Shuffle
                  </button>
                </div>

                {/* Tactile Flip Card */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    playSfx('flip_card');
                    setCardFlipped((f) => !f);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      playSfx('flip_card');
                      setCardFlipped((f) => !f);
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                    padding: compact ? 14 : 22,
                    borderRadius: 24,
                    borderTopWidth: 3,
                    borderRightWidth: 3,
                    borderLeftWidth: 3,
                    borderBottomWidth: 6,
                    borderStyle: 'solid',
                    borderColor: 'var(--lang-primary)',
                    background: cardFlipped ? 'var(--tint-amber-bg)' : 'var(--card-soft-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: compact ? 8 : 10,
                    textAlign: 'center',
                    minHeight: compact ? 188 : 240,
                    justifyContent: 'center',
                    overflowWrap: 'break-word',
                    minWidth: 0,
                  }}
                >
                  {!cardFlipped ? (
                    <>
                      <VocabIllustration
                        illustrationKey={activeFlashcard.illustrationKey}
                        language={effectiveViewLang}
                        size={compact ? 92 : 120}
                      />
                      <div
                        dir={langDir}
                        style={{
                          fontSize: compact ? '1.3rem' : '1.65rem',
                          fontWeight: 900,
                          color: 'var(--text-main)',
                          lineHeight: langDir === 'rtl' ? 1.5 : 1.25,
                          maxWidth: '100%',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {activeFlashcard.foreignWithArticle}
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                        {effectiveViewLang === 'en'
                          ? 'Tap card to flip & reveal meaning clue!'
                          : viewLangMeta.translationLanguageLabel
                            ? `Tap card to flip & reveal ${viewLangMeta.translationLanguageLabel}!`
                            : 'Tap card to flip & reveal English!'}
                      </div>
                    </>
                  ) : (
                    <>
                      <span
                        className="gender-pill"
                        style={{
                          backgroundColor: GENDER_BADGE_META[activeFlashcard.gender].bgColor,
                          color: GENDER_BADGE_META[activeFlashcard.gender].textColor,
                          borderColor: GENDER_BADGE_META[activeFlashcard.gender].borderColor,
                        }}
                      >
                        {GENDER_BADGE_META[activeFlashcard.gender].label}
                      </span>
                      <div
                        style={{
                          fontSize: compact ? '1.22rem' : '1.55rem',
                          fontWeight: 900,
                          color: 'var(--tint-amber-ink)',
                          maxWidth: '100%',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {activeFlashcard.english}
                      </div>
                      {activeFlashcard.romanized ? (
                        <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--lang-primary)' }}>
                          {activeFlashcard.romanized}
                        </div>
                      ) : null}
                      <div style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        Say: {activeFlashcard.phonetic}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          padding: '8px 12px',
                          borderRadius: 14,
                          background: 'var(--card-bg)',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          maxWidth: '100%',
                          overflowWrap: 'break-word',
                        }}
                      >
                        <div dir={langDir}>{activeFlashcard.exampleForeign}</div>
                        {activeFlashcard.exampleRomanized ? (
                          <div style={{ fontSize: '0.78rem', color: 'var(--lang-primary)' }}>
                            {activeFlashcard.exampleRomanized}
                          </div>
                        ) : null}
                        <div style={{ color: 'var(--text-muted)' }}>{activeFlashcard.exampleEnglish}</div>
                      </div>
                    </>
                  )}
                </div>

                <SayItNormallyButton
                  language={effectiveViewLang}
                  dialectAText={activeFlashcard.foreignWithArticle}
                  dialectBText={activeFlashcard.english}
                  explicitPlain={activeFlashcard.plainEnglish}
                  registerNote={activeFlashcard.registerNote}
                  secondaryDialectAText={activeFlashcard.exampleForeign}
                  secondaryDialectBText={activeFlashcard.exampleEnglish}
                  secondaryExplicitPlain={activeFlashcard.examplePlainEnglish}
                  resetKey={activeFlashcard.id}
                  size="sm"
                />

                {/* Audio + Navigation Controls */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-primary"
                    onClick={() => {
                      void speakPhrase({
                        text: activeFlashcard.foreignWithArticle || activeFlashcard.bareForeign,
                        language: effectiveViewLang,
                        phonetic: activeFlashcard.phonetic,
                        speed: 'normal',
                      });
                    }}
                  >
                    <Volume2 size={16} /> 1.0x Speak
                  </button>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-amber"
                    onClick={() => {
                      vaultActions.recordTurtlePlay();
                      void speakPhrase({
                        text: activeFlashcard.foreignWithArticle || activeFlashcard.bareForeign,
                        language: effectiveViewLang,
                        phonetic: activeFlashcard.phonetic,
                        slow: true,
                        speed: 'slow',
                      });
                    }}
                  >
                    <Turtle size={16} /> 0.65x Slow
                  </button>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-indigo"
                    onClick={() => {
                      safeVaultActions.recordFluentPlay();
                      void speakPhrase({
                        text: activeFlashcard.foreignWithArticle || activeFlashcard.bareForeign,
                        language: effectiveViewLang,
                        phonetic: activeFlashcard.phonetic,
                        speed: 'fluent',
                      });
                    }}
                  >
                    <Zap size={15} /> 1.12x Fluent
                  </button>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-soft"
                    onClick={() => {
                      playSfx('flip_card');
                      setCardFlipped((f) => !f);
                    }}
                  >
                    <RotateCcw size={16} /> Flip
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-soft"
                    onClick={() => {
                      playSfx('button_click');
                      setCardFlipped(false);
                      setDeckIndex((i) => (i - 1 + showOffDeck.length) % showOffDeck.length);
                    }}
                  >
                    <ChevronLeft size={18} /> Previous
                  </button>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-success"
                    onClick={() => {
                      playSfx('correct_chime');
                      setCardFlipped(false);
                      setDeckIndex((i) => (i + 1) % showOffDeck.length);
                    }}
                  >
                    <span>Next Card</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
