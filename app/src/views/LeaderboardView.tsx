import React from 'react';
import { Student, ClassGroup } from '../types.ts';
import { computeStreak, lvl } from '../utils/logic.ts';

interface LeaderboardViewProps {
  students: Student[];
  classes: ClassGroup[];
  currentStudentId?: string | null;
  classFilter?: string;
  onBack: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  students,
  classes,
  currentStudentId,
  classFilter,
  onBack,
}) => {
  // Sadece aktif öğrenciler ve sınıf varsa ona göre filtrelenir
  const pool = students
    .filter((s) => !s.off)
    .filter((s) => !classFilter || s.c === classFilter)
    .map((s) => ({
      id: s.id,
      n: s.n,
      lv: s.lv,
      p: s.p || 0,
      level: lvl(s.p || 0).level,
      streak: computeStreak(s.dz || []),
      words: s.wl || 0,
      av: s.av,
    }))
    .sort((a, b) => b.p - a.p || b.streak - a.streak || b.words - a.words);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <button
        onClick={onBack}
        className="font-bold text-xs text-[var(--pri)] cursor-pointer flex items-center gap-1 hover:underline"
      >
        ‹ Geri
      </button>

      <div>
        <h1 className="text-2xl font-black font-heading text-[var(--ink)]">Lider Tablosu 🏅</h1>
        <p className="text-xs text-[var(--mute)] mt-0.5">
          Puan = geçilen testler + tamamlanan konular. Seriler sıralamada eşitliği bozar.
          {classFilter ? ` · ${classes.find((c) => c.id === classFilter)?.n || ''}` : ''}
        </p>
      </div>

      {pool.length === 0 && (
        <div className="rounded-2xl border border-[var(--line)] p-6 text-center text-sm text-[var(--mute)]" style={{ backgroundColor: 'var(--card)' }}>
          Listelenecek öğrenci yok. Öğretmenin seni sınıfa eklediğinde burada görüneceksin.
        </div>
      )}

      <div className="space-y-2">
        {pool.map((s, i) => {
          const isMe = s.id === currentStudentId;
          return (
            <div
              key={s.id}
              className={`flex items-center gap-3 rounded-2xl border p-3 ${isMe ? 'ring-2 ring-[var(--pri)]' : ''}`}
              style={{
                backgroundColor: 'var(--card)',
                borderColor: isMe ? 'var(--pri)' : 'var(--line)',
              }}
            >
              <span className="w-8 text-center text-lg font-black text-[var(--mute)]">
                {i < 3 ? MEDALS[i] : i + 1}
              </span>

              {s.av?.img ? (
                <img src={s.av.img} alt="" className="w-9 h-9 rounded-full object-cover border border-[var(--line)]" />
              ) : (
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-white text-sm"
                  style={{ backgroundColor: s.av?.col || 'var(--pri)' }}
                >
                  {s.av?.emo || s.n[0]}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-[var(--ink)] truncate">
                  {s.n} {isMe && <span className="text-[10px] text-[var(--pri)]">(sen)</span>}
                </div>
                <div className="text-[11px] text-[var(--mute)] font-semibold">
                  Seviye {s.level} · {s.lv} · 🔥 {s.streak} gün · 📖 {s.words} kelime
                </div>
              </div>

              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-black"
                style={{ backgroundColor: 'var(--sun)', color: '#14213D' }}
              >
                {s.p} ⭐
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
