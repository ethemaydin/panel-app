import React, { useState } from 'react';
import { LessonSchedule, Student, ClassGroup } from '../types.ts';
import { iso } from '../utils/logic.ts';

interface LessonEditorViewProps {
  lesson: LessonSchedule;
  occurrenceTime?: number | null;
  students: Student[];
  classes: ClassGroup[];
  onBack: () => void;
  onSave: (updated: LessonSchedule) => void;
  onDelete: (lessonId: number) => void;
  onModifySingleOccurrence?: (lesson: LessonSchedule, occDate: Date, isCancel: boolean) => void;
}

export const LessonEditorView: React.FC<LessonEditorViewProps> = ({
  lesson,
  occurrenceTime,
  students,
  classes,
  onBack,
  onSave,
  onDelete,
  onModifySingleOccurrence,
}) => {
  const [title, setTitle] = useState(lesson.t);
  const [date, setDate] = useState(lesson.d);
  const [time, setTime] = useState(lesson.h);
  const [isRecurring, setIsRecurring] = useState(lesson.rep);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([...lesson.stu]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const occDate = occurrenceTime ? new Date(occurrenceTime) : null;

  const handleSave = () => {
    onSave({
      ...lesson,
      t: title.trim() || 'Ders',
      d: date,
      h: time,
      rep: isRecurring,
      stu: selectedStudentIds,
    });
  };

  const toggleStudent = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const selectEntireClass = (classId: string) => {
    const classStudentIds = students
      .filter((s) => s.c === classId)
      .map((s) => s.id);
    const combined = Array.from(new Set([...selectedStudentIds, ...classStudentIds]));
    setSelectedStudentIds(combined);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <button
        id="b"
        onClick={onBack}
        className="font-bold text-xs text-[var(--pri)] cursor-pointer flex items-center gap-1 hover:underline"
      >
        ‹ Takvim
      </button>

      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          Dersi Düzenle
        </h1>
        <p className="text-xs text-[var(--mute)]">
          Ders zamanı, tekrarlama ve katılımcı öğrencileri belirle
        </p>
      </div>

      {/* Recurrence occurrence alert card */}
      {occDate && lesson.rep && (
        <div
          className="p-4 rounded-2xl border-2 border-[var(--pri)] space-y-2 text-xs"
          style={{ backgroundColor: 'var(--card)' }}
        >
          <b className="text-sm font-bold block text-[var(--pri)]">
            {occDate.toLocaleDateString('tr-TR')} Tarihli Oturum
          </b>
          <p className="text-[var(--mute)]">
            Bu ders her hafta tekrarlayan bir programın parçasıdır.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              id="o1"
              type="button"
              onClick={() => {
                if (onModifySingleOccurrence) onModifySingleOccurrence(lesson, occDate, false);
              }}
              className="flex-1 py-2 px-2.5 rounded-xl border border-[var(--line)] font-bold text-xs cursor-pointer hover:bg-[var(--bg)]"
            >
              Yalnızca bu günü değiştir
            </button>
            <button
              id="o2"
              type="button"
              onClick={() => {
                if (onModifySingleOccurrence) onModifySingleOccurrence(lesson, occDate, true);
              }}
              className="flex-1 py-2 px-2.5 rounded-xl border border-[var(--bad)] text-[var(--bad)] font-bold text-xs cursor-pointer hover:bg-[var(--badbg)]"
            >
              Yalnızca bu günü iptal et
            </button>
          </div>
        </div>
      )}

      {/* Lesson Details Form */}
      <div
        className="p-4 rounded-3xl border space-y-3 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <label className="block text-xs font-bold text-[var(--ink)]">
          Ders adı
          <input
            id="lt"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Konuşma Kulübü, Özel Ders vb."
            className="w-full mt-1 p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm font-semibold text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pri)]"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-bold text-[var(--ink)]">
            Tarih
            <input
              id="ld"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
            />
          </label>

          <label className="block text-xs font-bold text-[var(--ink)]">
            Saat
            <input
              id="lh"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
            />
          </label>
        </div>

        <label className="flex items-center justify-between text-xs font-bold pt-1 cursor-pointer">
          <span>Her hafta tekrarla</span>
          <input
            id="lr"
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="w-5 h-5 accent-[var(--pri)] rounded cursor-pointer"
          />
        </label>
      </div>

      {/* Student selector by class */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Dersi Görecek Öğrenciler ({selectedStudentIds.length} seçildi)
        </h3>

        {classes.map((cls) => {
          const classStudents = students.filter((s) => s.c === cls.id);
          return (
            <div
              key={cls.id}
              className="p-3.5 rounded-2xl border space-y-2 shadow-sm"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
            >
              <div className="flex justify-between items-center pb-1 border-b border-[var(--line)]">
                <b className="text-xs font-extrabold text-[var(--ink)]">{cls.n}</b>
                <button
                  type="button"
                  data-sa={cls.id}
                  onClick={() => selectEntireClass(cls.id)}
                  className="text-[11px] font-bold text-[var(--pri)] px-2 py-0.5 rounded-lg border border-[var(--line)] hover:bg-[var(--bg)] cursor-pointer"
                >
                  Sınıfı seç
                </button>
              </div>

              {classStudents.map((s) => {
                const isChecked = selectedStudentIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center justify-between py-1 text-xs font-bold cursor-pointer hover:opacity-80"
                  >
                    <span>{s.n}</span>
                    <input
                      type="checkbox"
                      data-ls={s.id}
                      checked={isChecked}
                      onChange={() => toggleStudent(s.id)}
                      className="w-4 h-4 accent-[var(--pri)] rounded cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <button
        id="lsv"
        onClick={handleSave}
        className="w-full py-4 px-4 rounded-2xl font-extrabold text-sm text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
        style={{ backgroundColor: 'var(--pri)' }}
      >
        Kaydet
      </button>

      {/* Delete Button */}
      <button
        id="ldl"
        type="button"
        onClick={() => {
          if (!deleteConfirm) {
            setDeleteConfirm(true);
            return;
          }
          onDelete(lesson.id);
        }}
        className="w-full text-center py-2 text-xs font-bold text-[var(--bad)] cursor-pointer hover:underline"
      >
        {deleteConfirm
          ? 'Emin misin? Silmek için tekrar bas.'
          : lesson.rep
          ? 'Tüm haftaları sil'
          : 'Dersi sil'}
      </button>
    </div>
  );
};
