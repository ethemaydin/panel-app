import React, { useState } from 'react';
import { Homework, Student, ClassGroup, Topic, Question } from '../types.ts';
import { hwDone, hs } from '../utils/logic.ts';

interface HomeworkEditorViewProps {
  homework: Homework;
  students: Student[];
  classes: ClassGroup[];
  allTopics: Topic[];
  onBack: () => void;
  onSave: (updated: Homework) => void;
  onDelete: (hwId: number) => void;
}

export const HomeworkEditorView: React.FC<HomeworkEditorViewProps> = ({
  homework,
  students,
  classes,
  allTopics,
  onBack,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState(homework.t);
  const [desc, setDesc] = useState(homework.d || '');
  const [due, setDue] = useState(homework.due);
  const [type, setType] = useState<'write' | 'ex' | 'test'>(homework.type);
  const [topicId, setTopicId] = useState(homework.topic || allTopics[0]?.id || '');
  const [passScore, setPassScore] = useState<number>(homework.pass ?? 60);
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([...(homework.to || [])]);
  const [questions, setQuestions] = useState<Question[]>([...(homework.q || [])]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // New question form state
  const [newQText, setNewQText] = useState('');
  const [newCorrect, setNewCorrect] = useState('');
  const [newWrong1, setNewWrong1] = useState('');
  const [newWrong2, setNewWrong2] = useState('');

  const handleSave = () => {
    onSave({
      ...homework,
      t: title.trim() || 'Ödev',
      d: desc.trim(),
      due: due.trim(),
      type,
      topic: topicId,
      pass: passScore,
      to: assignedStudentIds,
      q: questions,
    });
  };

  const handleAddQuestion = () => {
    const q = newQText.trim();
    const a = newCorrect.trim();
    const w1 = newWrong1.trim();
    const w2 = newWrong2.trim();
    const opts = [a, w1, w2].filter(Boolean);

    if (!q || !a || opts.length < 2) return;

    setQuestions([
      ...questions,
      {
        k: 'mc',
        q,
        o: opts.sort(() => Math.random() - 0.5),
        c: a,
      },
    ]);

    setNewQText('');
    setNewCorrect('');
    setNewWrong1('');
    setNewWrong2('');
  };

  const toggleStudent = (studentId: string) => {
    if (assignedStudentIds.includes(studentId)) {
      setAssignedStudentIds(assignedStudentIds.filter((id) => id !== studentId));
    } else {
      setAssignedStudentIds([...assignedStudentIds, studentId]);
    }
  };

  const selectEntireClass = (classId: string) => {
    const classStudentIds = students
      .filter((s) => s.c === classId)
      .map((s) => s.id);
    const combined = Array.from(new Set([...assignedStudentIds, ...classStudentIds]));
    setAssignedStudentIds(combined);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <button
        id="b"
        onClick={() => {
          handleSave();
          onBack();
        }}
        className="font-bold text-xs text-[var(--pri)] cursor-pointer flex items-center gap-1 hover:underline"
      >
        ‹ Ödevler
      </button>

      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          Ödevi Düzenle
        </h1>
        <p className="text-xs text-[var(--mute)]">
          Ödev içeriğini, hedef kitleyi ve gelen yanıtları incele
        </p>
      </div>

      <div
        className="p-4 rounded-3xl border space-y-3 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <label className="block text-xs font-bold text-[var(--ink)]">
          Ödev başlığı
          <input
            id="h1"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kendini 3 cümleyle tanıt"
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
          />
        </label>

        <label className="block text-xs font-bold text-[var(--ink)]">
          Açıklama / Yönergeler
          <textarea
            id="h2"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Öğrencinin dikkat etmesi gerekenler..."
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] resize-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-bold text-[var(--ink)]">
            Teslim günü
            <input
              id="h3"
              type="text"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              placeholder="Pazartesi, 18 Ekim vb."
              className="w-full mt-1 p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
            />
          </label>

          <label className="block text-xs font-bold text-[var(--ink)]">
            Ödev tipi
            <select
              id="h4"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full mt-1 p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
            >
              <option value="write">Yazılı ödev</option>
              <option value="test">Kendi hazırladığım test</option>
              <option value="ex">Konu alıştırması</option>
            </select>
          </label>
        </div>

        {type === 'test' && (
          <label className="block text-xs font-bold text-[var(--ink)]">
            Geçme notu (%)
            <input
              id="hp"
              type="number"
              min={0}
              max={100}
              value={passScore}
              onChange={(e) => setPassScore(Number(e.target.value))}
              className="w-full mt-1 p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
            />
          </label>
        )}

        {type === 'ex' && (
          <label className="block text-xs font-bold text-[var(--ink)]">
            Bağlı konu
            <select
              id="h5"
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full mt-1 p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
            >
              {allTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ic} {t.t}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Test Questions if type is test */}
      {type === 'test' && (
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
            Sorular ({questions.length})
          </h3>
          <div
            className="p-3.5 rounded-2xl border space-y-2 shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <div className="space-y-1 divide-y divide-[var(--line)]">
              {questions.map((q, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--ink)] pr-2">{q.q}</span>
                  <button
                    type="button"
                    data-hq={idx}
                    onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                    className="text-base p-1 hover:opacity-75 cursor-pointer flex-none"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[var(--line)] space-y-2">
              <input
                id="q1"
                type="text"
                value={newQText}
                onChange={(e) => setNewQText(e.target.value)}
                placeholder="Soru..."
                className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
              />
              <input
                id="q2"
                type="text"
                value={newCorrect}
                onChange={(e) => setNewCorrect(e.target.value)}
                placeholder="Doğru cevap..."
                className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
              />
              <input
                id="q3"
                type="text"
                value={newWrong1}
                onChange={(e) => setNewWrong1(e.target.value)}
                placeholder="Yanlış cevap 1..."
                className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
              />
              <input
                id="q4"
                type="text"
                value={newWrong2}
                onChange={(e) => setNewWrong2(e.target.value)}
                placeholder="Yanlış cevap 2 (isteğe bağlı)..."
                className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
              />
              <button
                id="qad"
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-2 px-3 rounded-xl border border-[var(--line)] font-bold text-xs text-[var(--ink)] hover:bg-[var(--bg)] cursor-pointer"
              >
                Soruyu ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target students selection */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Kime Verilecek? ({assignedStudentIds.length} öğrenci seçildi)
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
                <b className="text-xs font-bold text-[var(--ink)]">{cls.n}</b>
                <button
                  type="button"
                  data-sa={cls.id}
                  onClick={() => selectEntireClass(cls.id)}
                  className="text-[11px] font-bold text-[var(--pri)] px-2 py-0.5 rounded-lg border border-[var(--line)] hover:bg-[var(--bg)] cursor-pointer"
                >
                  Sınıfı seç
                </button>
              </div>

              {classStudents.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center justify-between py-1 text-xs font-bold cursor-pointer hover:opacity-80"
                >
                  <span>{s.n}</span>
                  <input
                    type="checkbox"
                    data-hs={s.id}
                    checked={assignedStudentIds.includes(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="w-4 h-4 accent-[var(--pri)] rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>
          );
        })}
      </div>

      {/* Submissions by students */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Gelen Cevaplar
        </h3>
        <div
          className="p-3.5 rounded-2xl border space-y-2.5 shadow-sm divide-y divide-[var(--line)]"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          {assignedStudentIds.map((studentId) => {
            const s = students.find((st) => st.id === studentId);
            if (!s) return null;
            const r = hs(homework, s);
            const isDone = hwDone(homework, s);

            return (
              <div key={s.e} className="pt-2 first:pt-0 text-xs">
                <div className="flex justify-between items-center">
                  <b className="text-sm font-bold text-[var(--ink)]">{s.n}</b>
                  <span className="font-bold">
                    {isDone ? '✅ Tamam' : '⏳ Bekliyor'}
                    {r.score != null ? ` · %${r.score}` : ''}
                  </span>
                </div>
                {r.text && (
                  <div className="mt-1.5 p-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] font-medium text-[var(--ink)] whitespace-pre-wrap">
                    “{r.text}”
                  </div>
                )}
              </div>
            );
          })}
          {assignedStudentIds.length === 0 && (
            <div className="text-xs text-[var(--mute)] py-2 text-center">
              Henüz öğrenci seçilmedi.
            </div>
          )}
        </div>
      </div>

      <button
        id="hsv"
        type="button"
        onClick={() => {
          handleSave();
          onBack();
        }}
        className="w-full py-4 px-4 rounded-2xl font-extrabold text-sm text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
        style={{ backgroundColor: 'var(--pri)' }}
      >
        Kaydet
      </button>

      <button
        id="hdl"
        type="button"
        onClick={() => {
          if (!deleteConfirm) {
            setDeleteConfirm(true);
            return;
          }
          onDelete(homework.id);
        }}
        className="w-full text-center py-2 text-xs font-bold text-[var(--bad)] cursor-pointer hover:underline"
      >
        {deleteConfirm ? 'Emin misin? Silmek için tekrar bas.' : 'Ödevi sil'}
      </button>
    </div>
  );
};
