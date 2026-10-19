import React from 'react';
import { LessonSchedule, Student } from '../types.ts';
import { rate, miss } from '../utils/logic.ts';

interface CalendarViewProps {
  student: Student;
  allLessons: LessonSchedule[];
  sessions: string[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  student,
  allLessons,
  sessions,
}) => {
  const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const p2 = (n: number) => String(n).padStart(2, '0');
  const fmt = (x: Date) =>
    `${x.getDate()}.${x.getMonth() + 1} ${DAYS[x.getDay()]} · ${p2(x.getHours())}:${p2(x.getMinutes())}`;

  const at = (l: LessonSchedule) => {
    const [y, m, d] = l.d.split('-').map(Number);
    const [H, M] = l.h.split(':').map(Number);
    return new Date(y, m - 1, d, H, M);
  };

  const isoDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const occ = (l: LessonSchedule) => {
    const b = at(l);
    const now = Date.now() - 36e5;
    const o: Date[] = [];
    if (isNaN(b.getTime())) return o;
    if (!l.rep) {
      if (b.getTime() >= now) o.push(b);
    } else {
      const w = Math.max(0, Math.floor((now - b.getTime()) / 6048e5));
      for (let i = w; i < w + 4; i++) {
        const x = new Date(b);
        x.setDate(b.getDate() + 7 * i);
        if (x.getTime() >= now && !(l.skip || []).includes(isoDate(x))) {
          o.push(x);
        }
      }
    }
    return o;
  };

  // Student's lessons
  const myLessons = allLessons
    .filter((l) => l.stu.length === 0 || l.stu.includes(student.id))
    .flatMap((l) => occ(l).filter((x) => x.getTime() < Date.now() + 14 * 864e5).map((x) => ({ l, x })))
    .sort((a, b) => a.x.getTime() - b.x.getTime());

  const attendanceRate = rate(student);
  const missedCount = miss(student);
  const LBL: Record<string, string> = { g: 'Geldi', y: 'Yok', i: 'İzinli' };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          Ders Programı
        </h1>
        <p className="text-xs text-[var(--mute)]">
          Önümüzdeki 14 günlük canlı ders takvimin
        </p>
      </div>

      {/* Lesson List */}
      <div className="space-y-2">
        {myLessons.map(({ l, x }, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl border shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <span className="inline-block bg-[var(--sun)] text-[#14213D] rounded-full px-2.5 py-0.5 text-xs font-extrabold mb-1">
              {fmt(x)}
            </span>
            <div className="text-base font-extrabold text-[var(--ink)]">
              {l.t}
            </div>
          </div>
        ))}

        {myLessons.length === 0 && (
          <div
            className="p-6 rounded-2xl border text-center text-xs text-[var(--mute)] shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            Yaklaşan ders bulunmuyor.
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--mute)] text-center">
        Dersten 30 dk ve 10 dk önce bildirim alırsın.
      </p>

      {/* Attendance Block */}
      <div className="pt-2 space-y-3">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Devam Durumun
        </h3>

        <div
          className="p-4 rounded-2xl border shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          <div className="flex justify-between items-baseline">
            <h2 className="text-3xl font-black font-heading text-[var(--ink)]">
              %{attendanceRate} katılım
            </h2>
            <span className="text-xs font-bold text-[var(--mute)]">
              {missedCount} derse gelmedin
            </span>
          </div>

          <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden my-2.5">
            <div
              className="h-full bg-[var(--ok)] rounded-full transition-all duration-300"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>

          {missedCount >= 3 && (
            <div className="mt-2 p-2.5 rounded-xl border border-[var(--bad)]/40 bg-[var(--badbg)] text-xs font-bold text-[var(--bad)]">
              Devamsızlığın arttı. Lütfen öğretmenine yaz.
            </div>
          )}
        </div>

        {/* Attendance chips */}
        <div className="space-y-1">
          <span className="text-xs font-bold text-[var(--mute)]">Ders ders:</span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[...student.a].map((c, k) => {
              if (c === '-') return null;
              let chipColor = 'bg-[var(--line)] text-[var(--mute)]';
              if (c === 'g') chipColor = 'bg-[var(--okbg)] text-[var(--ok)] font-extrabold';
              if (c === 'y') chipColor = 'bg-[var(--badbg)] text-[var(--bad)] font-extrabold';

              return (
                <span
                  key={k}
                  className={`inline-flex flex-col items-center px-2.5 py-1 rounded-xl text-xs shadow-sm border border-[var(--line)] ${chipColor}`}
                >
                  <span>{LBL[c] || c}</span>
                  <small className="text-[10px] opacity-75 font-mono">
                    {sessions[k] || `Ders ${k + 1}`}
                  </small>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
