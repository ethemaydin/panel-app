import React from 'react';
import { NotificationItem } from '../types.ts';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  studentId: string | null;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  studentId,
}) => {
  const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const p2 = (n: number) => String(n).padStart(2, '0');
  const fmt = (raw: Date | string) => {
    const x = new Date(raw);
    return `${x.getDate()}.${x.getMonth() + 1} ${DAYS[x.getDay()]} · ${p2(x.getHours())}:${p2(x.getMinutes())}`;
  };

  const myNotifs = studentId ? notifications.filter((n) => n.si === studentId) : [];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          Bildirimler
        </h1>
        <p className="text-xs text-[var(--mute)]">
          Öğretmeninden gelen duyurular ve ders hatırlatmaları
        </p>
      </div>

      <div className="space-y-2">
        {myNotifs.map((n, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl border shadow-sm space-y-1"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <div className="flex justify-between items-start">
              <b className="text-sm font-bold text-[var(--ink)]">{n.t}</b>
              <span className="text-[10px] text-[var(--mute)] font-mono">
                {fmt(n.at)}
              </span>
            </div>
            <p className="text-xs text-[var(--ink)] opacity-90 leading-relaxed">
              {n.m}
            </p>
          </div>
        ))}

        {myNotifs.length === 0 && (
          <div
            className="p-8 rounded-2xl border text-center text-xs text-[var(--mute)] shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            Henüz yeni bildiriminiz bulunmuyor.
          </div>
        )}
      </div>
    </div>
  );
};
