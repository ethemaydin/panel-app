import React, { useState } from 'react';
import { Student, ClassGroup, BroadcastMessage } from '../types.ts';
import { iso } from '../utils/logic.ts';

interface TeacherNotificationsViewProps {
  students: Student[];
  classes: ClassGroup[];
  broadcasts: BroadcastMessage[];
  onSendMessage: (
    title: string,
    message: string,
    targetStudentIds: string[],
    scheduledTime: number | null
  ) => void;
  onDeliverNow: (msgId: number) => void;
  onDeleteBroadcast: (msgId: number) => void;
}

export const TeacherNotificationsView: React.FC<TeacherNotificationsViewProps> = ({
  students,
  classes,
  broadcasts,
  onSendMessage,
  onDeliverNow,
  onDeleteBroadcast,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(iso(new Date()));
  const [scheduleTime, setScheduleTime] = useState('18:00');
  const [errorMsg, setErrorMsg] = useState('');

  const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const p2 = (n: number) => String(n).padStart(2, '0');
  const fmt = (raw: Date | string) => {
    const x = new Date(raw);
    return `${x.getDate()}.${x.getMonth() + 1} ${DAYS[x.getDay()]} · ${p2(x.getHours())}:${p2(x.getMinutes())}`;
  };

  const toggleStudent = (studentId: string) => {
    if (targetStudentIds.includes(studentId)) {
      setTargetStudentIds(targetStudentIds.filter((id) => id !== studentId));
    } else {
      setTargetStudentIds([...targetStudentIds, studentId]);
    }
  };

  const selectEntireClass = (classId: string) => {
    const classStudentIds = students
      .filter((s) => s.c === classId)
      .map((s) => s.id);
    const combined = Array.from(new Set([...targetStudentIds, ...classStudentIds]));
    setTargetStudentIds(combined);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const t = title.trim();
    const m = message.trim();

    if (!t || !m) {
      setErrorMsg('Başlık ve mesaj yazınız.');
      return;
    }
    if (targetStudentIds.length === 0) {
      setErrorMsg('En az bir öğrenci seçiniz.');
      return;
    }

    let when: number | null = null;
    if (isScheduled) {
      when = new Date(`${scheduleDate}T${scheduleTime}`).getTime();
      if (isNaN(when) || when <= Date.now()) {
        setErrorMsg('Planlanan zaman gelecekte bir tarih olmalıdır.');
        return;
      }
    }

    onSendMessage(t, m, targetStudentIds, when);
    setTitle('');
    setMessage('');
    setTargetStudentIds([]);
    setIsScheduled(false);
  };

  const planned = broadcasts.filter((b) => !b.sent);
  const sent = broadcasts.filter((b) => b.sent);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          Bildirim Gönder
        </h1>
        <p className="text-xs text-[var(--mute)]">
          Öğrencilere anlık veya planlı duyuru/hatırlatma ilet
        </p>
      </div>

      <form
        onSubmit={handleSend}
        className="p-4 rounded-3xl border space-y-3 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <label className="block text-xs font-bold text-[var(--ink)]">
          Başlık
          <input
            id="nt1"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Hafta Sonu Konuşma Kulübü"
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
          />
        </label>

        <label className="block text-xs font-bold text-[var(--ink)]">
          Mesaj
          <textarea
            id="nt2"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Duyuru metniniz..."
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] resize-none"
          />
        </label>

        {/* Target selection */}
        <div className="space-y-2 pt-1 border-t border-[var(--line)]">
          <span className="text-xs font-bold text-[var(--mute)] block">
            Kime Gönderilecek? ({targetStudentIds.length} seçildi)
          </span>

          {classes.map((cls) => {
            const classStudents = students.filter((s) => s.c === cls.id);
            return (
              <div
                key={cls.id}
                className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] space-y-1.5"
              >
                <div className="flex justify-between items-center pb-1 border-b border-[var(--line)]">
                  <b className="text-xs text-[var(--ink)]">{cls.n}</b>
                  <button
                    type="button"
                    data-sa={cls.id}
                    onClick={() => selectEntireClass(cls.id)}
                    className="text-[10px] font-bold text-[var(--pri)] px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--card)] cursor-pointer"
                  >
                    Sınıfı seç
                  </button>
                </div>

                {classStudents.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center justify-between text-xs font-medium cursor-pointer"
                  >
                    <span>{s.n}</span>
                    <input
                      type="checkbox"
                      data-nr={s.id}
                      checked={targetStudentIds.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="w-4 h-4 accent-[var(--pri)] rounded cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            );
          })}
        </div>

        {/* Schedule Toggle */}
        <div className="pt-1 border-t border-[var(--line)] space-y-2">
          <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
            <span>⏱️ İleri tarihli planla</span>
            <input
              id="npl"
              type="checkbox"
              checked={isScheduled}
              onChange={(e) => setIsScheduled(e.target.checked)}
              className="w-4 h-4 accent-[var(--pri)] rounded cursor-pointer"
            />
          </label>

          {isScheduled && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <input
                id="nd"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
              />
              <input
                id="nh"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
              />
            </div>
          )}
        </div>

        {errorMsg && (
          <p id="nm" className="text-xs font-bold text-[var(--bad)] min-h-4">
            {errorMsg}
          </p>
        )}

        <button
          id="nsd"
          type="submit"
          className="w-full py-3.5 px-4 rounded-xl font-extrabold text-xs text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
          style={{ backgroundColor: 'var(--pri)' }}
        >
          {isScheduled ? 'Bildirimi planla' : 'Şimdi gönder'} ({targetStudentIds.length} öğrenci)
        </button>
      </form>

      {/* Planned messages */}
      {planned.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
            Planlanan Bildirimler ({planned.length})
          </h3>
          {planned.map((g) => (
            <div
              key={g.id}
              className="p-3.5 rounded-2xl border space-y-2 shadow-sm text-xs"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
            >
              <div className="flex justify-between items-start">
                <b className="text-sm font-bold text-[var(--ink)]">{g.t}</b>
                <span className="text-[10px] text-[var(--mute)]">
                  Planlandı: {g.when ? fmt(new Date(g.when)) : ''}
                </span>
              </div>
              <p className="text-[var(--ink)] opacity-90">{g.m}</p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  data-ms={g.id}
                  onClick={() => onDeliverNow(g.id)}
                  className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--pri)] font-bold cursor-pointer"
                >
                  Şimdi gönder
                </button>
                <button
                  type="button"
                  data-mc={g.id}
                  onClick={() => onDeleteBroadcast(g.id)}
                  className="px-2.5 py-1 rounded-lg border border-[var(--bad)] text-[var(--bad)] font-bold cursor-pointer"
                >
                  İptal et
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sent messages */}
      {sent.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
            Gönderilenler ({sent.length})
          </h3>
          {sent.map((g) => (
            <div
              key={g.id}
              className="p-3 rounded-2xl border space-y-1 shadow-sm text-xs opacity-85"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
            >
              <div className="flex justify-between items-start">
                <b className="font-bold text-[var(--ink)]">{g.t}</b>
                <span className="text-[10px] text-[var(--mute)]">
                  {g.sentAt ? fmt(g.sentAt) : ''}
                </span>
              </div>
              <p className="text-[var(--ink)]">{g.m}</p>
              <div className="flex justify-between items-center text-[10px] text-[var(--mute)] pt-1">
                <span>{g.to.length} öğrenciye iletildi</span>
                <button
                  type="button"
                  data-mc={g.id}
                  onClick={() => onDeleteBroadcast(g.id)}
                  className="text-[var(--bad)] font-bold cursor-pointer hover:underline"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
