import React from 'react';
import { Homework, Student, Topic } from '../types.ts';
import { hwDone, hs, isHwVisible } from '../utils/logic.ts';

interface HomeworkViewProps {
  student: Student;
  allHomeworks: Homework[];
  allTopics: Topic[];
  onStartWriting: (hwId: number) => void;
  onStartQuiz: (key: string, hwId?: number) => void;
}

export const HomeworkView: React.FC<HomeworkViewProps> = ({
  student,
  allHomeworks,
  allTopics,
  onStartWriting,
  onStartQuiz,
}) => {
  // Filter homeworks assigned to this student
  // NOT: eski kodda `|| true` vardı; bu filtre tamamen etkisiz bırakıyordu ve
  // öğretmenin belirli öğrencilere/sınıflara atadığı ödevler herkese görünüyordu.
  const mine = allHomeworks.filter((h) => isHwVisible(h, student));

  const pending = mine.filter((h) => !hwDone(h, student));
  const done = mine.filter((h) => hwDone(h, student));

  const renderCard = (h: Homework) => {
    const isDone = hwDone(h, student);
    const result = hs(h, student);
    const linkedTopic = allTopics.find((t) => t.id === h.topic);

    let typeLabel = '✏️ Alıştırma';
    if (h.type === 'write') typeLabel = '📝 Yazılı ödev';
    if (h.type === 'test') typeLabel = '🧪 Test';

    let descText = h.d || 'Ödevi tamamlayınız.';
    if (h.type === 'ex' && linkedTopic) {
      descText = `${linkedTopic.q.length} soru · ${linkedTopic.t}`;
    } else if (h.type === 'test') {
      descText = `${h.q.length} soru`;
    }

    return (
      <div
        key={h.id}
        className={`p-4 rounded-2xl border transition-all shadow-sm ${
          !isDone
            ? 'border-[var(--pri)] shadow-[0_4px_16px_rgba(216,6,33,0.14)]'
            : 'border-[var(--line)] opacity-95'
        }`}
        style={{ backgroundColor: 'var(--card)' }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
              !isDone
                ? 'bg-[var(--sun)] text-[#14213D]'
                : 'bg-[var(--okbg)] text-[var(--ok)]'
            }`}
          >
            {isDone ? '✓ Tamamlandı' : `📌 Yapılacak · ${h.due || 'Süre yok'}`}
          </span>
          {isDone && h.type !== 'write' && result.score != null && (
            <span className="text-xs font-black text-[var(--ok)]">
              En iyi: %{result.score}
            </span>
          )}
        </div>

        <div className="text-sm font-bold text-[var(--ink)]">
          <span className="text-[var(--mute)] mr-1 font-semibold">{typeLabel}:</span>
          {h.t || 'Ödev'}
        </div>

        <p className="text-xs text-[var(--mute)] mt-0.5 line-clamp-2">
          {descText}
        </p>

        <button
          type="button"
          onClick={() => {
            if (h.type === 'write') {
              onStartWriting(h.id);
            } else if (h.type === 'test') {
              onStartQuiz(`hw${h.id}`, h.id);
            } else {
              onStartQuiz(h.topic || (allTopics[0] ? allTopics[0].id : ''), h.id);
            }
          }}
          className={`w-full mt-3 py-3 px-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-sm active:scale-98 ${
            isDone
              ? 'border border-[var(--line)] hover:bg-[var(--line)]/20'
              : 'text-white hover:brightness-105 shadow-md'
          }`}
          style={
            isDone
              ? { backgroundColor: 'var(--card)', color: 'var(--ink)' }
              : { backgroundColor: 'var(--pri)' }
          }
        >
          {isDone
            ? h.type === 'write'
              ? 'Gönderimi gör'
              : 'Tekrar çöz'
            : h.type === 'write'
            ? 'Yaz ve gönder'
            : 'Başla'}
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          Ödevler
        </h1>
        <p className="text-xs text-[var(--mute)]">
          {pending.length > 0
            ? `${pending.length} bekleyen ödev`
            : 'Harika, tüm ödevler tamam 🎉'}
        </p>
      </div>

      {/* Pending Homework List */}
      <div className="space-y-3">
        {pending.map(renderCard)}
        {pending.length === 0 && (
          <div
            className="p-6 rounded-2xl border text-center shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <span className="text-3xl block mb-1">🎉</span>
            <b className="text-sm text-[var(--ink)]">Bekleyen ödevin yok</b>
            <p className="text-xs text-[var(--mute)] mt-0.5">
              Tüm ödevlerini başarıyla teslim ettin.
            </p>
          </div>
        )}
      </div>

      {/* Done Homework List */}
      {done.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
            Tamamlananlar ✅
          </h3>
          {done.map(renderCard)}
        </div>
      )}

      {/* Extra practice section */}
      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Ekstra Alıştırma
        </h3>
        {allTopics.map((t) => (
          <button
            key={t.id}
            onClick={() => onStartQuiz(t.id)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left cursor-pointer transition-all hover:border-[var(--pri)] shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <span className="w-10 h-10 rounded-xl bg-[var(--bg)] flex items-center justify-center text-lg flex-none border border-[var(--line)]">
              {t.ic}
            </span>
            <div className="flex-1 min-w-0">
              <b className="block text-xs font-bold text-[var(--ink)] truncate">
                {t.t}
              </b>
              <span className="text-[11px] text-[var(--mute)]">
                {t.q.length} soru
              </span>
            </div>
            <span className="text-xs font-bold text-[var(--pri)]">Başla ›</span>
          </button>
        ))}
      </div>
    </div>
  );
};
