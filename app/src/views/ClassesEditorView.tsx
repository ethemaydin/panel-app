import React, { useState } from 'react';
import { ClassGroup, Student } from '../types.ts';

interface ClassesEditorViewProps {
  classes: ClassGroup[];
  students: Student[];
  onBack: () => void;
  onSaveClassNames: (updatedClasses: ClassGroup[]) => void;
  onAddClass: (className: string) => void;
  onDeleteClass: (classId: string) => void;
}

export const ClassesEditorView: React.FC<ClassesEditorViewProps> = ({
  classes,
  students,
  onBack,
  onSaveClassNames,
  onAddClass,
  onDeleteClass,
}) => {
  const [classList, setClassList] = useState<ClassGroup[]>(classes);
  const [newClassName, setNewClassName] = useState('');
  const [feedback, setFeedback] = useState<{ isOk: boolean; text: string } | null>(null);

  const handleNameChange = (id: string, newName: string) => {
    setClassList(classList.map((c) => (c.id === id ? { ...c, n: newName } : c)));
  };

  const handleSaveAll = () => {
    onSaveClassNames(classList);
    setFeedback({ isOk: true, text: 'Adlar kaydedildi ✓' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newClassName.trim();
    if (!name) return;
    onAddClass(name);
    setNewClassName('');
  };

  const handleDelete = (id: string) => {
    if (students.some((s) => s.c === id)) {
      setFeedback({ isOk: false, text: 'Önce bu sınıftaki öğrencileri başka sınıfa taşı.' });
      return;
    }
    if (classes.length < 2) {
      setFeedback({ isOk: false, text: 'En az bir sınıf olmalı.' });
      return;
    }
    onDeleteClass(id);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <button
        id="b"
        onClick={onBack}
        className="font-bold text-xs text-[var(--pri)] cursor-pointer flex items-center gap-1 hover:underline"
      >
        ‹ Öğrenciler
      </button>

      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          Sınıf Yönetimi
        </h1>
        <p className="text-xs text-[var(--mute)]">
          Sınıf adlarını düzenle veya yeni sınıf oluştur
        </p>
      </div>

      <div className="space-y-3">
        {classList.map((c) => {
          const studentCount = students.filter((s) => s.c === c.id).length;
          return (
            <div
              key={c.id}
              className="p-4 rounded-2xl border space-y-2 shadow-sm"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
            >
              <label className="block text-xs font-bold text-[var(--ink)]">
                Sınıf adı
                <input
                  type="text"
                  value={c.n}
                  onChange={(e) => handleNameChange(c.id, e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
                />
              </label>

              <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-semibold text-[var(--mute)]">
                  {studentCount} kayıtlı öğrenci
                </span>
                <button
                  type="button"
                  data-d={c.id}
                  onClick={() => handleDelete(c.id)}
                  className="text-xs font-bold text-[var(--bad)] cursor-pointer hover:underline"
                >
                  Sınıfı sil
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {feedback && (
        <p
          id="cm"
          className={`text-xs font-bold text-center ${
            feedback.isOk ? 'text-[var(--ok)]' : 'text-[var(--bad)]'
          }`}
        >
          {feedback.text}
        </p>
      )}

      <button
        id="cs"
        onClick={handleSaveAll}
        className="w-full py-3.5 px-4 rounded-xl border border-[var(--line)] font-bold text-xs shadow-sm hover:bg-[var(--line)]/30 active:scale-98 transition-all cursor-pointer"
        style={{ backgroundColor: 'var(--card)', color: 'var(--ink)' }}
      >
        Adları kaydet
      </button>

      {/* Add new class */}
      <form
        onSubmit={handleCreate}
        className="p-4 rounded-2xl border space-y-2.5 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <label className="block text-xs font-bold text-[var(--ink)]">
          Yeni sınıf
          <input
            id="cnew"
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="3. Sınıf, B1 Akşam Grubu vb."
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-semibold text-[var(--ink)]"
          />
        </label>
        <button
          type="submit"
          id="ca"
          className="w-full py-3 px-4 rounded-xl font-extrabold text-xs text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
          style={{ backgroundColor: 'var(--pri)' }}
        >
          Sınıf ekle
        </button>
      </form>
    </div>
  );
};
