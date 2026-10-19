import React, { useState } from 'react';
import { Topic, ClassGroup, Student, Question } from '../types.ts';
import { stv } from '../utils/logic.ts';

interface TopicEditorViewProps {
  topic: Topic;
  classes: ClassGroup[];
  students: Student[];
  onBack: () => void;
  onSave: (updated: Topic) => void;
  onDelete: (topicId: string) => void;
  onOpenSubTopicEditor: (subId: string) => void;
  onAddSubTopic: () => void;
  onUpdateStudentPermissions: (studentId: string, newTopicList: string[]) => void;
}

export const TopicEditorView: React.FC<TopicEditorViewProps> = ({
  topic,
  classes,
  students,
  onBack,
  onSave,
  onDelete,
  onOpenSubTopicEditor,
  onAddSubTopic,
  onUpdateStudentPermissions,
}) => {
  const [ic, setIc] = useState(topic.ic);
  const [level, setLevel] = useState(topic.lv || 'A1');
  const [title, setTitle] = useState(topic.t);
  const [desc, setDesc] = useState(topic.d);
  const [exp, setExp] = useState(topic.exp);
  const [fromDate, setFromDate] = useState(topic.from || '');
  const [untilDate, setUntilDate] = useState(topic.until || '');
  const [feedback, setFeedback] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Examples state
  const [examples, setExamples] = useState<[string, string][]>([...topic.ex]);
  const [newExEn, setNewExEn] = useState('');
  const [newExTr, setNewExTr] = useState('');

  // Words state
  const [words, setWords] = useState<[string, string][]>([...topic.words]);
  const [newWordEn, setNewWordEn] = useState('');
  const [newWordTr, setNewWordTr] = useState('');

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([...topic.q]);
  const [qType, setQType] = useState<'mc' | 'fill' | 'order' | 'listen'>('mc');
  const [f1, setF1] = useState('');
  const [f2, setF2] = useState('');
  const [f3, setF3] = useState('');
  const [f4, setF4] = useState('');
  const [qError, setQError] = useState('');

  const LV = ['A1', 'A2', 'B1', 'B2', 'C1'];

  const handleSaveInfo = () => {
    if (!title.trim()) {
      setFeedback('Başlık boş olamaz.');
      return;
    }

    const updated: Topic = {
      ...topic,
      ic: ic.trim() || '📘',
      lv: level,
      t: title.trim(),
      d: desc.trim(),
      exp: exp.trim(),
      from: fromDate || undefined,
      until: untilDate || undefined,
      ex: examples,
      words: words,
      q: questions,
    };

    onSave(updated);
    setFeedback('Kaydedildi ✓');
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleAddExample = () => {
    if (newExEn.trim() && newExTr.trim()) {
      setExamples([...examples, [newExEn.trim(), newExTr.trim()]]);
      setNewExEn('');
      setNewExTr('');
    }
  };

  const handleAddWord = () => {
    if (newWordEn.trim() && newWordTr.trim()) {
      setWords([...words, [newWordEn.trim(), newWordTr.trim()]]);
      setNewWordEn('');
      setNewWordTr('');
    }
  };

  const handleAddQuestion = () => {
    setQError('');
    if (qType === 'mc') {
      if (!f1.trim() || !f2.trim() || !f3.trim() || !f4.trim()) {
        setQError('Tüm alanları doldurunuz.');
        return;
      }
      const q: Question = {
        k: 'mc',
        q: f1.trim(),
        o: [f2.trim(), f3.trim(), f4.trim()].sort(() => Math.random() - 0.5),
        c: f2.trim(),
      };
      setQuestions([...questions, q]);
    } else if (qType === 'fill') {
      if (!f1.includes('___') || !f2.trim()) {
        setQError('Cümlede ___ olmalı ve doğru cevap yazılmalıdır.');
        return;
      }
      const q: Question = {
        k: 'fill',
        q: f1.trim(),
        h: f3.trim() || undefined,
        a: f2.trim().toLowerCase(),
      };
      setQuestions([...questions, q]);
    } else if (qType === 'order') {
      const w = f2.trim().split(/\s+/).filter(Boolean);
      if (!f1.trim() || w.length < 2) {
        setQError('Türkçe cümle ve en az 2 kelimelik İngilizce cümle yazınız.');
        return;
      }
      const q: Question = {
        k: 'order',
        q: `“${f1.trim()}”`,
        w,
      };
      setQuestions([...questions, q]);
    } else if (qType === 'listen') {
      if (!f2.trim() || !f3.trim() || !f4.trim()) {
        setQError('Tüm alanları doldurunuz.');
        return;
      }
      const q: Question = {
        k: 'listen',
        s: f2.trim(),
        o: [f2.trim(), f3.trim(), f4.trim()].sort(() => Math.random() - 0.5),
      };
      setQuestions([...questions, q]);
    }

    setF1('');
    setF2('');
    setF3('');
    setF4('');
  };

  const setStudentVisibility = (studentId: string, isChecked: boolean) => {
    const s = students.find((x) => x.id === studentId)!;
    const cur = stv(s, [topic]);
    const updated = isChecked
      ? Array.from(new Set([...cur, topic.id]))
      : cur.filter((id) => id !== topic.id);
    onUpdateStudentPermissions(studentId, updated);
  };

  const toggleClassVisibility = (classId: string) => {
    const classStudents = students.filter((s) => s.c === classId);
    const allChecked =
      classStudents.length > 0 &&
      classStudents.every((s) => stv(s, [topic]).includes(topic.id));

    classStudents.forEach((s) => {
      setStudentVisibility(s.id, !allChecked);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <button
        id="b"
        onClick={onBack}
        className="font-bold text-xs text-[var(--pri)] cursor-pointer flex items-center gap-1 hover:underline"
      >
        ‹ Konular
      </button>

      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)] flex items-center gap-2">
          <span>{topic.ic}</span>
          <span>{topic.t}</span>
        </h1>
        <p className="text-xs text-[var(--mute)]">Konu bilgilerini ve test sorularını düzenle</p>
      </div>

      {/* Info Card */}
      <div
        className="p-4 rounded-3xl border space-y-3 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-bold text-[var(--ink)]">
            Emoji
            <input
              id="ei"
              type="text"
              value={ic}
              onChange={(e) => setIc(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
            />
          </label>

          <label className="block text-xs font-bold text-[var(--ink)]">
            Seviye
            <select
              id="el"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
            >
              {LV.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-xs font-bold text-[var(--ink)]">
          Başlık
          <input
            id="et"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
          />
        </label>

        <label className="block text-xs font-bold text-[var(--ink)]">
          Kısa açıklama
          <input
            id="ed"
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium text-[var(--ink)]"
          />
        </label>

        <label className="block text-xs font-bold text-[var(--ink)]">
          Konu anlatımı
          <textarea
            id="ee"
            rows={4}
            value={exp}
            onChange={(e) => setExp(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium text-[var(--ink)] leading-relaxed resize-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-bold text-[var(--ink)]">
            Başlangıç tarihi
            <input
              id="vf"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full mt-1 p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
            />
          </label>
          <label className="block text-xs font-bold text-[var(--ink)]">
            Bitiş tarihi
            <input
              id="vu"
              type="date"
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
              className="w-full mt-1 p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
            />
          </label>
        </div>

        {feedback && (
          <p id="em1" className="text-xs font-bold text-[var(--ok)] text-center">
            {feedback}
          </p>
        )}

        <button
          id="es"
          type="button"
          onClick={handleSaveInfo}
          className="w-full py-3 px-4 rounded-xl font-extrabold text-xs text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
          style={{ backgroundColor: 'var(--pri)' }}
        >
          Kaydet
        </button>
      </div>

      {/* Permissions per student and class */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Hangi Öğrenciler Görsün?
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
                  data-ta={cls.id}
                  onClick={() => toggleClassVisibility(cls.id)}
                  className="text-[11px] font-bold text-[var(--pri)] px-2 py-0.5 rounded-lg border border-[var(--line)] hover:bg-[var(--bg)] cursor-pointer"
                >
                  Sınıfı seç / kaldır
                </button>
              </div>

              {classStudents.map((s) => {
                const isChecked = stv(s, [topic]).includes(topic.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center justify-between py-1 text-xs font-bold cursor-pointer hover:opacity-80"
                  >
                    <span>{s.n}</span>
                    <input
                      type="checkbox"
                      data-tv={s.id}
                      checked={isChecked}
                      onChange={(e) => setStudentVisibility(s.id, e.target.checked)}
                      className="w-4 h-4 accent-[var(--pri)] rounded cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Subtopics */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Alt Konular ({(topic.subs || []).length})
        </h3>
        <div
          className="p-3.5 rounded-2xl border space-y-2 shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          {(topic.subs || []).map((sub) => (
            <button
              key={sub.id}
              data-sed={sub.id}
              onClick={() => onOpenSubTopicEditor(sub.id)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold cursor-pointer hover:border-[var(--pri)]"
            >
              <span>{sub.t}</span>
              <span className="text-[var(--pri)] font-bold">Düzenle ›</span>
            </button>
          ))}
          <button
            id="sba"
            type="button"
            onClick={onAddSubTopic}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[var(--pri)] text-xs font-bold text-[var(--pri)] hover:bg-[var(--pri)]/5 cursor-pointer"
          >
            + Alt konu ekle
          </button>
        </div>
      </div>

      {/* Example Sentences */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Örnek Cümleler ({examples.length})
        </h3>
        <div
          className="p-3.5 rounded-2xl border space-y-2 shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          <div className="space-y-1 divide-y divide-[var(--line)]">
            {examples.map((item, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-[var(--ink)]">{item[0]}</div>
                  <div className="text-[var(--mute)]">{item[1]}</div>
                </div>
                <button
                  type="button"
                  data-x={idx}
                  onClick={() => setExamples(examples.filter((_, i) => i !== idx))}
                  className="text-base p-1 hover:opacity-75 cursor-pointer"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[var(--line)] space-y-2">
            <input
              id="xe"
              type="text"
              value={newExEn}
              onChange={(e) => setNewExEn(e.target.value)}
              placeholder="İngilizce cümle..."
              className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium text-[var(--ink)]"
            />
            <input
              id="xt"
              type="text"
              value={newExTr}
              onChange={(e) => setNewExTr(e.target.value)}
              placeholder="Türkçe çevirisi..."
              className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium text-[var(--ink)]"
            />
            <button
              id="xa"
              type="button"
              onClick={handleAddExample}
              className="w-full py-2 px-3 rounded-xl border border-[var(--line)] font-bold text-xs text-[var(--ink)] hover:bg-[var(--bg)] cursor-pointer"
            >
              Cümle ekle
            </button>
          </div>
        </div>
      </div>

      {/* Words */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Kelimeler ({words.length})
        </h3>
        <div
          className="p-3.5 rounded-2xl border space-y-2 shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          <div className="space-y-1 divide-y divide-[var(--line)]">
            {words.map((item, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[var(--ink)]">{item[0]}</span>
                  <span className="text-[var(--mute)] ml-2">· {item[1]}</span>
                </div>
                <button
                  type="button"
                  data-w={idx}
                  onClick={() => setWords(words.filter((_, i) => i !== idx))}
                  className="text-base p-1 hover:opacity-75 cursor-pointer"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[var(--line)] space-y-2">
            <input
              id="we2"
              type="text"
              value={newWordEn}
              onChange={(e) => setNewWordEn(e.target.value)}
              placeholder="İngilizce kelime..."
              className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium text-[var(--ink)]"
            />
            <input
              id="wt2"
              type="text"
              value={newWordTr}
              onChange={(e) => setNewWordTr(e.target.value)}
              placeholder="Türkçe anlamı..."
              className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium text-[var(--ink)]"
            />
            <button
              id="wa2"
              type="button"
              onClick={handleAddWord}
              className="w-full py-2 px-3 rounded-xl border border-[var(--line)] font-bold text-xs text-[var(--ink)] hover:bg-[var(--bg)] cursor-pointer"
            >
              Kelime ekle
            </button>
          </div>
        </div>
      </div>

      {/* Test Questions */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Test Soruları ({questions.length})
        </h3>
        <div
          className="p-3.5 rounded-2xl border space-y-2 shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          <div className="space-y-1 divide-y divide-[var(--line)]">
            {questions.map((q, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between text-xs">
                <div className="pr-2">
                  <span className="font-bold text-[var(--ink)]">
                    {q.k === 'listen' ? `🎧 ${q.s}` : q.q}
                  </span>
                  <span className="text-[10px] text-[var(--mute)] ml-1.5 font-bold uppercase">
                    ({q.k})
                  </span>
                </div>
                <button
                  type="button"
                  data-q={idx}
                  onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                  className="text-base p-1 hover:opacity-75 cursor-pointer flex-none"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[var(--line)] space-y-2">
            <b className="text-xs font-bold text-[var(--ink)] block">Yeni Soru Ekle</b>
            <select
              id="qk"
              value={qType}
              onChange={(e) => setQType(e.target.value as any)}
              className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
            >
              <option value="mc">Çoktan seçmeli</option>
              <option value="fill">Boşluk doldurma</option>
              <option value="order">Cümle kurma</option>
              <option value="listen">Dinleme</option>
            </select>

            {qType === 'mc' && (
              <>
                <input
                  id="f1"
                  type="text"
                  value={f1}
                  onChange={(e) => setF1(e.target.value)}
                  placeholder="Soru metni..."
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
                <input
                  id="f2"
                  type="text"
                  value={f2}
                  onChange={(e) => setF2(e.target.value)}
                  placeholder="Doğru cevap..."
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
                <input
                  id="f3"
                  type="text"
                  value={f3}
                  onChange={(e) => setF3(e.target.value)}
                  placeholder="Yanlış cevap 1..."
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
                <input
                  id="f4"
                  type="text"
                  value={f4}
                  onChange={(e) => setF4(e.target.value)}
                  placeholder="Yanlış cevap 2..."
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
              </>
            )}

            {qType === 'fill' && (
              <>
                <input
                  id="f1"
                  type="text"
                  value={f1}
                  onChange={(e) => setF1(e.target.value)}
                  placeholder="Cümle (boşluk için ___ yazın)..."
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
                <input
                  id="f2"
                  type="text"
                  value={f2}
                  onChange={(e) => setF2(e.target.value)}
                  placeholder="Doğru cevap..."
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
                <input
                  id="f3"
                  type="text"
                  value={f3}
                  onChange={(e) => setF3(e.target.value)}
                  placeholder="İpucu (isteğe bağlı)..."
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
              </>
            )}

            {qType === 'order' && (
              <>
                <input
                  id="f1"
                  type="text"
                  value={f1}
                  onChange={(e) => setF1(e.target.value)}
                  placeholder="Türkçe cümle..."
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
                <input
                  id="f2"
                  type="text"
                  value={f2}
                  onChange={(e) => setF2(e.target.value)}
                  placeholder="İngilizce cümle (kelimeler karışık verilir)..."
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
              </>
            )}

            {qType === 'listen' && (
              <>
                <input
                  id="f2"
                  type="text"
                  value={f2}
                  onChange={(e) => setF2(e.target.value)}
                  placeholder="Seslendirilecek doğru cümle..."
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
                <input
                  id="f3"
                  type="text"
                  value={f3}
                  onChange={(e) => setF3(e.target.value)}
                  placeholder="Yanlış seçenek 1..."
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
                <input
                  id="f4"
                  type="text"
                  value={f4}
                  onChange={(e) => setF4(e.target.value)}
                  placeholder="Yanlış seçenek 2..."
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
              </>
            )}

            {qError && <p id="qm2" className="text-xs font-bold text-[var(--bad)]">{qError}</p>}

            <button
              id="qa2"
              type="button"
              onClick={handleAddQuestion}
              className="w-full py-2.5 px-3 rounded-xl border border-[var(--line)] font-bold text-xs text-[var(--ink)] hover:bg-[var(--bg)] cursor-pointer"
            >
              Soruyu ekle
            </button>
          </div>
        </div>
      </div>

      {/* Delete Topic Button */}
      <button
        id="dt"
        type="button"
        onClick={() => {
          if (!deleteConfirm) {
            setDeleteConfirm(true);
            return;
          }
          onDelete(topic.id);
        }}
        className="w-full text-center py-2 text-xs font-bold text-[var(--bad)] cursor-pointer hover:underline"
      >
        {deleteConfirm ? 'Emin misin? Silmek için tekrar bas.' : 'Konuyu sil'}
      </button>
    </div>
  );
};
