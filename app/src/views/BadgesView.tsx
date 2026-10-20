import React from 'react';
import { Student } from '../types.ts';
import { BADGES, computeStreak, lvl } from '../utils/logic.ts';

interface BadgesViewProps {
  student: Student;
  onBack: () => void;
}

export const BadgesView: React.FC<BadgesViewProps> = ({ student, onBack }) => {
  const streak = computeStreak(student.dz || []);
  const info = lvl(student.p || 0);
  const earned = new Set(BADGES.filter((b) => b.cur(student) >= b.goal).map((b) => b.id));

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <button
        onClick={onBack}
        className="font-bold text-xs text-[var(--pri)] cursor-pointer flex items-center gap-1 hover:underline"
      >
        ‹ Geri
      </button>

      <h1 className="text-2xl font-black font-heading text-[var(--ink)]">Başarımlarım 🏆</h1>

      {/* Üst özet kartları */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-[var(--line)] p-3 text-center" style={{ backgroundColor: 'var(--card)' }}>
          <div className="text-2xl">🔥</div>
          <div className="text-xl font-black text-[var(--ink)]">{streak}</div>
          <div className="text-[10px] font-bold text-[var(--mute)] uppercase">Günlük Seri</div>
        </div>
        <div className="rounded-2xl border border-[var(--line)] p-3 text-center" style={{ backgroundColor: 'var(--card)' }}>
          <div className="text-2xl">🏅</div>
          <div className="text-xl font-black text-[var(--ink)]">{info.level}</div>
          <div className="text-[10px] font-bold text-[var(--mute)] uppercase">Seviye</div>
        </div>
        <div className="rounded-2xl border border-[var(--line)] p-3 text-center" style={{ backgroundColor: 'var(--card)' }}>
          <div className="text-2xl">⭐</div>
          <div className="text-xl font-black text-[var(--ink)]">{info.points}</div>
          <div className="text-[10px] font-bold text-[var(--mute)] uppercase">Puan</div>
        </div>
      </div>

      {/* Seviye barı */}
      <div className="rounded-2xl border border-[var(--line)] p-4" style={{ backgroundColor: 'var(--card)' }}>
        <div className="flex justify-between text-[11px] font-bold text-[var(--mute)] mb-1.5">
          <span>Seviye {info.level}</span>
          <span>
            {info.intoLevel}/{info.needed} puan
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-[var(--line)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${info.pct}%`, backgroundColor: 'var(--pri)' }}
          />
        </div>
        <p className="text-[11px] text-[var(--mute)] mt-2">
          Test çözmeye devam! Her geçen test isabet başına 5 puan kazandırır; konuları tamamlamak +20 bonus verir.
        </p>
      </div>

      {/* Rozetler */}
      <div className="grid grid-cols-2 gap-2.5">
        {BADGES.map((b) => {
          const cur = Math.min(b.cur(student), b.goal);
          const done = cur >= b.goal;
          return (
            <div
              key={b.id}
              className={`rounded-2xl border p-3 ${done ? '' : 'opacity-60'}`}
              style={{
                backgroundColor: done ? 'var(--okbg)' : 'var(--card)',
                borderColor: done ? 'var(--ok)/40' : 'var(--line)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{done ? b.ic : '🔒'}</span>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-[var(--ink)] truncate">{b.t}</div>
                  <div className="text-[10px] text-[var(--mute)] truncate">{b.d}</div>
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((cur / b.goal) * 100)}%`,
                    backgroundColor: done ? 'var(--ok)' : 'var(--sun)',
                  }}
                />
              </div>
              <div className="text-[10px] font-bold text-[var(--mute)] mt-1 text-right">
                {cur}/{b.goal}
              </div>
            </div>
          );
        })}
      </div>

      {earned.size === 0 && (
        <p className="text-center text-xs text-[var(--mute)] pb-4">
          İlk rozetini kazanmak için bir konu testi çöz — başarılar seni bekliyor! 💪
        </p>
      )}
    </div>
  );
};
