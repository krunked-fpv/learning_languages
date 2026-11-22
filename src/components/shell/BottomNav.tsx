import { BookOpen, Compass, Gamepad2, ShoppingBag, Trophy } from 'lucide-react';
import { playSfx } from '../../audio';
import { LANGUAGE_META, type LanguageCode } from '../../types/contracts';

export type NavTabId = 'map' | 'phrasebook' | 'arcade' | 'leagues' | 'shop';

export interface BottomNavProps {
  activeTab: NavTabId;
  unlockedPhraseCount: number;
  activeLanguage: LanguageCode;
  onSelectTab: (tab: NavTabId) => void;
}

export function BottomNav({
  activeTab,
  unlockedPhraseCount,
  activeLanguage,
  onSelectTab,
}: BottomNavProps) {
  const langMeta = LANGUAGE_META[activeLanguage];

  const items: Array<{
    id: NavTabId;
    label: string;
    icon: typeof Compass;
    badge?: number;
  }> = [
    { id: 'map', label: 'Atlas Map', icon: Compass },
    { id: 'phrasebook', label: 'Phrasebook', icon: BookOpen, badge: unlockedPhraseCount },
    { id: 'arcade', label: 'Arcade', icon: Gamepad2 },
    { id: 'leagues', label: 'Leagues & Badges', icon: Trophy },
    { id: 'shop', label: 'Gem Shop', icon: ShoppingBag },
  ];

  return (
    <nav className="responsive-nav" aria-label="Main navigation">
      <div className="nav-brand-desktop">
        <div style={{ fontSize: '1.22rem', fontWeight: 900, color: 'var(--lang-primary)' }}>
          Wanderling
        </div>
        <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--nav-ink)' }}>
          {langMeta.landTitle}
        </div>
      </div>

      <div className="nav-items-list">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item-btn ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                playSfx('button_click');
                onSelectTab(item.id);
              }}
            >
              <Icon size={20} />
              <span className="nav-item-label">{item.label}</span>
              {typeof item.badge === 'number' ? (
                <span className="nav-count-badge" aria-label={`${item.badge} unlocked`}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
