import React from 'react';
import { LessonSchedule, NotificationItem } from '../types.ts';

interface TeacherCalendarViewProps {
  lessons: LessonSchedule[];
  notifications: NotificationItem[];
  onOpenLesson: (lessonId: number, occTime?: number | null) => void;
  onNewLesson: () => void;
}

export const TeacherCalendarView: React.FC<TeacherCalendarViewProps> = ({
  lessons,
  notifications,
  onOpenLesson,
  onNewLesson,
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

  const pastOcc = (l: LessonSchedule) => {
    const b = at(l);
    const o: Date[] = [];
    const now = Date.now();
    if (isNaN(b.getTime())) return o;
    if (!l.rep) {
      if (b.getTime() < now && b.getTime() > now - 30 * 864e5) o.push(b);
    } else {
      const w0 = Math.max(0, Math.floor((now - 30 * 864e5 - b.getTime()) / 6048e5));
      for (let i = w0; i < w0 + 6; i++) {
        const x = new Date(b);
        x.setDate(b.getDate() + 7 * i);
        if (x.getTime() >= now) break;
        if (x.getTime() > now - 30 * 864e5 && !(l.skip || []).includes(isoDate(x))) {
          o.push(x);
        }
      }
    }
    return o;
  };

  const upcoming = lessons
    .flatMap((l) => occ(l).filter((x) => x.getTime() < Date.now() + 14 * 864e5).map((x) => ({ l, x })))
    .sort((a, b) => a.x.getTime() - b.x.getTime());

  const past = lessons
    .flatMap((l) => pastOcc(l).map((x) => ({ l, x })))
    .sort((a, b) => b.x.getTime() - a.x.getTime());

  const teacherNotifs = notifications.filter((n) => n.si === 't').slice(0, 3);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          Takvim & Ders Yönetimi
        </h1>
        <p className="text-xs text-[var(--mute)]">
          Canlı ders programını düzenle ve planla
        </p>
      </div>

      {/* Teacher alerts */}
      {teacherNotifs.map((n, idx) => (
        <div
          key={idx}
          className="p-3.5 rounded-2xl border-2 border-[var(--pri)] shadow-sm text-xs"
          style={{ backgroundColor: 'var(--card)' }}
        >
          <b className="text-sm text-[var(--pri)] block mb-0.5">{n.t}</b>
          <span className="text-[var(--ink)]">{n.m}</span>
        </div>
      ))}

      {/* Upcoming Timetable */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Önümüzdeki 14 Gün
        </h3>
        {upcoming.map(({ l, x }, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onOpenLesson(l.id, x.getTime())}
            className="w-full text-left p-3.5 rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-[var(--pri)] block"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <span className="inline-block bg-[var(--sun)] text-[#14213D] rounded-full px-2.5 py-0.5 text-xs font-extrabold mb-1">
              {fmt(x)}
            </span>
            <div className="text-sm font-extrabold text-[var(--ink)]">{l.t}</div>
            <div className="text-xs text-[var(--mute)] mt-0.5 flex justify-between items-center">
              <span>{l.stu.length} öğrenci görüyor</span>
              <span className="text-[var(--pri)] font-bold">Düzenle ›</span>
            </div>
          </button>
        ))}

        {upcoming.length === 0 && (
          <div
            className="p-6 rounded-2xl border text-center text-xs text-[var(--mute)] shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            Önümüzdeki 14 günde planlanmış ders yok.
          </div>
        )}
      </div>

      {/* Past lessons list */}
      {past.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
            Geçmiş Dersler (Son 30 Gün)
          </h3>
          {past.map(({ l, x }, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onOpenLesson(l.id, x.getTime())}
              className="w-full text-left p-3 rounded-2xl border shadow-sm cursor-pointer opacity-80 hover:opacity-100 transition-all block"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
            >
              <span className="text-[11px] font-bold text-[var(--mute)] block">
                {fmt(x)}
              </span>
              <div className="text-xs font-bold text-[var(--ink)]">{l.t}</div>
            </button>
          ))}
        </div>
      )}

      {/* Lesson Templates */}
      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Tüm Tanımlı Dersler ({lessons.length})
        </h3>
        {lessons.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onOpenLesson(l.id, null)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:border-[var(--pri)] shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <span className="w-10 h-10 rounded-xl bg-[var(--bg)] flex items-center justify-center text-lg flex-none border border-[var(--line)]">
              📅
            </span>
            <div className="flex-1 min-w-0">
              <b className="block text-sm font-bold text-[var(--ink)] truncate">
                {l.t}
              </b>
              <span className="text-xs text-[var(--mute)]">
                {l.rep ? 'Her hafta' : l.d} · {l.h} · {l.stu.length} öğrenci
              </span>
            </div>
            <span className="text-xs font-bold text-[var(--pri)]">Düzenle</span>
          </button>
        ))}

        <button
          id="nl2"
          onClick={onNewLesson}
          className="w-full py-4 px-4 rounded-2xl font-extrabold text-sm text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
          style={{ backgroundColor: 'var(--pri)' }}
        >
          + Yeni ders ekle
        </button>
      </div>
    </div>
  );
};
