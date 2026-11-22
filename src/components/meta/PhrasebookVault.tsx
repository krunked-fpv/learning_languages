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
} from 'lucide-react';
import { FlagIcon } from '../../art/FlagIcon';
import { VocabIllustration } from '../../art/VocabIllustration';
import { getCourse } from '../../curriculum';
import { playSfx, speakPhrase } from '../../audio';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import { useCompactViewport } from '../lesson/lessonHelpers';
import {
  GENDER_BADGE_META,
  LANGUAGE_LIST,
  LANGUAGE_META,
  type LanguageCode,
  type VocabCard,
} from '../../types/contracts';

export function PhrasebookVault() {
  const { activeProfile } = useVaultStore();
  const compact = useCompactViewport();
  const [viewLang, setViewLang] = useState<LanguageCode>(activeProfile.activeLanguage);
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOffOpen, setShowOffOpen] = useState(false);
  const [deckIndex, setDeckIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<string[] | null>(null);

  useEffect(() => {
    setViewLang(activeProfile.activeLanguage);
    setUnitFilter('all');
  }, [activeProfile.activeLanguage]);

  const viewLangMeta = LANGUAGE_META[viewLang];
  const langDir = viewLangMeta.dir;
  const course = getCourse(viewLang);
  const langProgress = activeProfile.languageProgress[viewLang];
  const unlockedSet = useMemo(
    () => new Set(langProgress?.unlockedVocabIds ?? []),
    [langProgress?.unlockedVocabIds]
  );

  const allCards = useMemo(
    () => course.units.flatMap((unit) => unit.vocabCards),
    [course]
  );

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return course.units
      .filter((u) => unitFilter === 'all' || u.id === unitFilter)
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
  }, [course.units, unitFilter, searchQuery]);

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
        gap: 10,
        overflow: 'hidden',
      }}
    >
      {/* Top Banner */}
      <div
        className="tactile-card"
        style={{
          padding: compact ? '9px 12px' : '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: compact ? 34 : 40,
              height: compact ? 34 : 40,
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
            <BookOpen size={compact ? 18 : 20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: compact ? '1.04rem' : '1.2rem', fontWeight: 900, color: 'var(--text-main)' }}>
              Living Phrasebook Sticker-Book
            </h1>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              {viewLangMeta.name}: {unlockedCards.length} / {allCards.length} Stickers Collected
            </div>
          </div>
        </div>

        <button
          type="button"
          className="tactile-btn tactile-btn-amber"
          style={{ padding: compact ? '7px 12px' : '9px 16px', fontSize: compact ? '0.82rem' : '0.92rem' }}
          onClick={openShowOff}
        >
          <Sparkles size={16} />
          <span>Family Show-Off Mode</span>
        </button>
      </div>

      {/* Filters: 16-Language Horizontal Scroll Strip + Search + U1..U8 Tabs */}
      <div
        className="tactile-card"
        style={{
          padding: compact ? '8px 10px' : '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
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
          {LANGUAGE_LIST.map((lang) => {
            const isSelected = lang === viewLang;
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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            className="themed-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search words or meanings..."
            aria-label="Search phrasebook"
            style={{
              flex: '1 1 160px',
              minWidth: 0,
              maxWidth: compact ? '100%' : 240,
              padding: '6px 10px',
              fontSize: '0.82rem',
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
              style={{ padding: '4px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={() => setUnitFilter('all')}
            >
              All Units
            </button>
            {course.units.map((u) => (
              <button
                key={u.id}
                type="button"
                title={`Unit ${u.order}: ${u.title}`}
                aria-label={`Unit ${u.order}: ${u.title}`}
                className={`tactile-tile ${unitFilter === u.id ? 'is-selected' : ''}`}
                style={{ padding: '4px 9px', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
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
              ? 'No vocabulary stickers loaded for this course yet.'
              : 'No stickers matched your search filter.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
            {filteredUnits.map((unit) => (
              <div key={unit.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: unit.themeColor,
                      color: '#ffffff',
                      fontSize: '0.76rem',
                      fontWeight: 900,
                    }}
                  >
                    Unit {unit.order}
                  </span>
                  <h2 style={{ margin: 0, fontSize: '1.04rem', fontWeight: 900, color: 'var(--text-main)' }}>
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
                            minHeight: 170,
                          }}
                        >
                          <div style={{ filter: 'grayscale(1)', opacity: 0.25 }}>
                            <VocabIllustration
                              illustrationKey={card.illustrationKey}
                              language={viewLang}
                              size={64}
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
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
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
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              type="button"
                              className="tactile-btn tactile-btn-soft"
                              style={{ padding: '4px 8px', fontSize: '0.74rem', borderRadius: 10 }}
                              aria-label={`Speak ${card.bareForeign}`}
                              onClick={() => {
                                void speakPhrase({
                                  text: card.bareForeign,
                                  language: viewLang,
                                  phonetic: card.phonetic,
                                });
                              }}
                            >
                              <Volume2 size={13} /> 1.0x
                            </button>
                            <button
                              type="button"
                              className="tactile-btn tactile-btn-soft"
                              style={{ padding: '4px 8px', fontSize: '0.74rem', borderRadius: 10 }}
                              aria-label={`Speak ${card.bareForeign} slowly`}
                              onClick={() => {
                                vaultActions.recordTurtlePlay();
                                void speakPhrase({
                                  text: card.bareForeign,
                                  language: viewLang,
                                  phonetic: card.phonetic,
                                  slow: true,
                                });
                              }}
                            >
                              <Turtle size={13} /> 0.65x
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <VocabIllustration
                            illustrationKey={card.illustrationKey}
                            language={viewLang}
                            size={64}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              dir={langDir}
                              style={{
                                fontSize: '1.02rem',
                                fontWeight: 900,
                                color: 'var(--text-main)',
                                lineHeight: langDir === 'rtl' ? 1.5 : 1.25,
                              }}
                            >
                              {card.foreignWithArticle}
                            </div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                              {card.english}
                            </div>
                            {card.romanized ? (
                              <div style={{ fontSize: '0.77rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                {card.romanized}
                              </div>
                            ) : null}
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--lang-primary)' }}>
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
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
                  No {LANGUAGE_META[viewLang].name} stickers unlocked yet!
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
                    padding: 22,
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
                    gap: 10,
                    textAlign: 'center',
                    minHeight: 240,
                    justifyContent: 'center',
                  }}
                >
                  {!cardFlipped ? (
                    <>
                      <VocabIllustration
                        illustrationKey={activeFlashcard.illustrationKey}
                        language={viewLang}
                        size={120}
                      />
                      <div
                        dir={langDir}
                        style={{
                          fontSize: '1.65rem',
                          fontWeight: 900,
                          color: 'var(--text-main)',
                          lineHeight: langDir === 'rtl' ? 1.5 : 1.25,
                        }}
                      >
                        {activeFlashcard.foreignWithArticle}
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                        Tap card to flip & reveal English!
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
                      <div style={{ fontSize: '1.55rem', fontWeight: 900, color: 'var(--tint-amber-ink)' }}>
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

                {/* Audio + Navigation Controls */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-primary"
                    onClick={() => {
                      void speakPhrase({
                        text: activeFlashcard.bareForeign,
                        language: viewLang,
                        phonetic: activeFlashcard.phonetic,
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
                        text: activeFlashcard.bareForeign,
                        language: viewLang,
                        phonetic: activeFlashcard.phonetic,
                        slow: true,
                      });
                    }}
                  >
                    <Turtle size={16} /> 0.65x Slow
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
