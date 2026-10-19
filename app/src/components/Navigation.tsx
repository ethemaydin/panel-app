import React from 'react';
import { UserRole } from '../types.ts';

interface NavigationProps {
  role: UserRole;
  currentTab: string;
  onTabChange: (tab: string) => void;
  unreadCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  role,
  currentTab,
  onTabChange,
  unreadCount = 0,
}) => {
  const tabs =
    role === 't'
      ? [
          { id: 'stu', icon: '👥', label: 'Öğrenci' },
          { id: 'cal', icon: '🗓️', label: 'Takvim' },
          { id: 'home', icon: '📚', label: 'Dersler' },
          { id: 'roll', icon: '✅', label: 'Yoklama' },
          { id: 'news', icon: '🔔', label: 'Bildirim' },
          { id: 'acc', icon: '⚙️', label: 'Hesap' },
        ]
      : [
          { id: 'home', icon: '📚', label: 'Dersler' },
          { id: 'cal', icon: '🗓️', label: 'Takvim' },
          { id: 'hw', icon: '📝', label: 'Ödevler' },
          { id: 'news', icon: '🔔', label: 'Bildirim' },
          { id: 'acc', icon: '⚙️', label: 'Hesap' },
        ];

  return (
    <nav
      className="flex-none flex items-stretch border-t select-none transition-colors duration-200"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--line)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            data-tab={tab.id}
            aria-current={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 px-0.5 relative transition-all cursor-pointer ${
              isActive ? 'text-[var(--pri)] font-extrabold' : 'text-[var(--mute)] font-medium hover:text-[var(--ink)]'
            }`}
          >
            <span className="text-xl leading-none relative">
              {tab.icon}
              {tab.id === 'news' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-[var(--pri)] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--card)]">
                  {unreadCount}
                </span>
              )}
            </span>
            <span className="text-[11px] mt-1 tracking-tight truncate max-w-full">
              {tab.label}
            </span>
            {isActive && (
              <span
                className="absolute bottom-0 w-8 h-1 rounded-t-full transition-all"
                style={{ backgroundColor: 'var(--pri)' }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};
