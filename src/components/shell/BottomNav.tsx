import { motion } from 'framer-motion';
import { BookOpen, Compass, Gamepad2, ShoppingBag, Trophy } from 'lucide-react';
import { playSfx } from '../../audio';
import type { LanguageCode } from '../../types/contracts';

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
  onSelectTab,
}: BottomNavProps) {
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
    <div className="console-dock-wrap">
      <nav className="responsive-nav" aria-label="Main navigation">
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
                {isActive ? (
                  <motion.span
                    layoutId="console-dock-pill"
                    className="nav-dock-pill"
                    transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                  />
                ) : null}
                <span className="nav-item-content">
                  <motion.span
                    animate={isActive ? { y: -1, scale: 1.1 } : { y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    style={{ display: 'inline-flex', alignItems: 'center' }}
                  >
                    <Icon size={19} />
                  </motion.span>
                  <span className="nav-item-label">{item.label}</span>
                  {typeof item.badge === 'number' ? (
                    <span className="nav-count-badge" aria-label={`${item.badge} unlocked`}>
                      {item.badge}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
