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
import {
  GENDER_BADGE_META,
  LANGUAGE_LIST,
  LANGUAGE_META,
  type LanguageCode,
  type VocabCard,
} from '../../types/contracts';

export function PhrasebookVault() {
  const { activeProfile } = useVaultStore();
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

  const course = getCourse(viewLang);
  const langProgress = activeProfile.languageProgress[viewLang];
  const unlockedSet = useMemo(
    () => new Set(langProgress.unlockedVocabIds),
    [langProgress.unlockedVocabIds]
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
            card.phonetic.toLowerCase().includes(q)
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
    <section aria-label="Living Phrasebook" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Banner */}
      <div
        className="tactile-card"
        style={{
          padding: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              background: 'var(--lang-tint)',
              border: '2px solid var(--lang-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--lang-primary)',
            }}
          >
            <BookOpen size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
              Living Phrasebook Sticker-Book
            </h1>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#475569' }}>
              {LANGUAGE_META[viewLang].name}: {unlockedCards.length} / {allCards.length} Stickers
              Collected
            </div>
          </div>
        </div>

        <button
          type="button"
          className="tactile-btn tactile-btn-hero tactile-btn-amber"
          onClick={openShowOff}
        >
          <Sparkles size={18} />
          <span>Family Show-Off Mode</span>
        </button>
      </div>

      {/* Filters: Language + Unit + Search */}
      <div
        className="tactile-card"
        style={{
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {LANGUAGE_LIST.map((lang) => {
            const isSelected = lang === viewLang;
            const meta = LANGUAGE_META[lang];
            return (
              <button
                key={lang}
                type="button"
                className="tactile-btn"
                style={{
                  padding: '7px 12px',
                  background: isSelected ? meta.accentPalette.surfaceTint : '#ffffff',
                  borderColor: isSelected ? meta.accentPalette.primary : '#cbd5e1',
                  fontSize: '0.88rem',
                }}
                onClick={() => {
                  playSfx('button_click');
                  setViewLang(lang);
                  setUnitFilter('all');
                }}
              >
                <FlagIcon language={lang} size={22} />
                <span>{meta.name}</span>
              </button>
            );
          })}

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search words or meanings..."
            aria-label="Search phrasebook"
            style={{
              marginLeft: 'auto',
              flex: '1 1 200px',
              maxWidth: 280,
              padding: '8px 12px',
              borderRadius: 14,
              border: '2px solid #cbd5e1',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`tactile-tile ${unitFilter === 'all' ? 'is-selected' : ''}`}
            style={{ padding: '5px 11px', fontSize: '0.8rem' }}
            onClick={() => setUnitFilter('all')}
          >
            All Units
          </button>
          {course.units.map((u) => (
            <button
              key={u.id}
              type="button"
              className={`tactile-tile ${unitFilter === u.id ? 'is-selected' : ''}`}
              style={{ padding: '5px 11px', fontSize: '0.8rem' }}
              onClick={() => setUnitFilter(u.id)}
            >
              Unit {u.order}: {u.title}
            </button>
          ))}
        </div>
      </div>

      {/* Unit Sticker Grids */}
      {filteredUnits.length === 0 ? (
        <div className="tactile-card" style={{ padding: 28, textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
          {allCards.length === 0
            ? 'No vocabulary stickers loaded for this course yet.'
            : 'No stickers matched your search filter.'}
        </div>
      ) : (
        filteredUnits.map((unit) => (
          <div key={unit.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: unit.themeColor,
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                }}
              >
                Unit {unit.order}
              </span>
              <h2 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 900 }} className="shell-dark-text-zone">
                {unit.title} — {unit.culturalLandmark}
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: 12,
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
                        padding: 14,
                        background: '#f8fafc',
                        borderStyle: 'dashed',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        textAlign: 'center',
                        minHeight: 196,
                      }}
                    >
                      <div style={{ filter: 'grayscale(1)', opacity: 0.25 }}>
                        <VocabIllustration
                          illustrationKey={card.illustrationKey}
                          language={viewLang}
                          size={72}
                        />
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 900, color: '#64748b', fontSize: '0.86rem' }}>
                        <Lock size={14} /> Mystery Sticker
                      </div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8' }}>
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
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
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
                          style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 10 }}
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
                          style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 10 }}
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
                        size={68}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e1b4b' }}>
                          {card.foreignWithArticle}
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                          {card.english}
                        </div>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#4f46e5' }}>
                          {card.phonetic}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '6px 9px',
                        borderRadius: 12,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ fontWeight: 800, color: '#1e1b4b' }}>{card.exampleForeign}</div>
                      <div style={{ fontWeight: 600, color: '#64748b' }}>{card.exampleEnglish}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

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
                <div style={{ fontWeight: 700, color: '#64748b', fontSize: '0.88rem' }}>
                  Complete Lesson 1 on the Atlas Map to collect your first stickers and show them off
                  to your family!
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>
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
                    background: cardFlipped
                      ? 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)'
                      : 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'center',
                    minHeight: 260,
                    justifyContent: 'center',
                  }}
                >
                  {!cardFlipped ? (
                    <>
                      <VocabIllustration
                        illustrationKey={activeFlashcard.illustrationKey}
                        language={viewLang}
                        size={128}
                      />
                      <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#1e1b4b' }}>
                        {activeFlashcard.foreignWithArticle}
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b' }}>
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
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#92400e' }}>
                        {activeFlashcard.english}
                      </div>
                      <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#312e81' }}>
                        Say: {activeFlashcard.phonetic}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          padding: '8px 12px',
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.8)',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                        }}
                      >
                        <div>{activeFlashcard.exampleForeign}</div>
                        <div style={{ color: '#475569' }}>{activeFlashcard.exampleEnglish}</div>
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
