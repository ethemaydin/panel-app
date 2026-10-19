import React, { useState } from 'react';
import { Topic, WordItem, Homework, Student } from '../types.ts';
import { hwDone } from '../utils/logic.ts';

interface TeacherCoursesViewProps {
  topics: Topic[];
  words: WordItem[];
  homeworks: Homework[];
  students: Student[];
  onOpenTopicEditor: (topicId: string) => void;
  onNewTopic: () => void;
  onSaveWord: (word: Partial<WordItem>) => void;
  onDeleteWord: (wordId: number) => void;
  onOpenHomeworkEditor: (hwId: number) => void;
  onNewHomework: () => void;
}

export const TeacherCoursesView: React.FC<TeacherCoursesViewProps> = ({
  topics,
  words,
  homeworks,
  students,
  onOpenTopicEditor,
  onNewTopic,
  onSaveWord,
  onDeleteWord,
  onOpenHomeworkEditor,
  onNewHomework,
}) => {
  const [subTab, setSubTab] = useState<'topics' | 'words' | 'hw'>('topics');
  const [wordLevel, setWordLevel] = useState<string>('A1');
  const [editingWordId, setEditingWordId] = useState<number | null>(null);

  // Word edit form state
  const [wordEn, setWordEn] = useState('');
  const [wordTr, setWordTr] = useState('');
  const [wordPh, setWordPh] = useState('');
  const [wordEx, setWordEx] = useState('');
  const [wordLv, setWordLv] = useState('A1');
  const [wordFeedback, setWordFeedback] = useState('');

  const LV = ['A1', 'A2', 'B1', 'B2', 'C1'];

  const handleEditWord = (w: WordItem) => {
    setEditingWordId(w.id);
    setWordEn(w.e);
    setWordTr(w.tr);
    setWordPh(w.ph);
    setWordEx(w.ex);
    setWordLv(w.lv);
    setWordFeedback('');
  };

  const handleCancelWord = () => {
    setEditingWordId(null);
    setWordEn('');
    setWordTr('');
    setWordPh('');
    setWordEx('');
    setWordFeedback('');
  };

  const handleSaveWord = () => {
    setWordFeedback('');
    const e = wordEn.trim();
    const tr = wordTr.trim();
    if (!e || !tr) {
      setWordFeedback('İngilizce ve Türkçe anlamı gerekli.');
      return;
    }

    onSaveWord({
      id: editingWordId || undefined,
      e,
      tr,
      ph: wordPh.trim(),
      ex: wordEx.trim(),
      lv: wordLv,
    });

    handleCancelWord();
  };

  const currentLevelWords = words.filter((w) => w.lv === wordLevel);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          İçerik Yönetimi
        </h1>
        <p className="text-xs text-[var(--mute)]">
          Konuları, kelime haznesini ve ödevleri düzenle
        </p>
      </div>

      {/* Segment Switcher */}
      <div
        id="ts"
        className="flex gap-1.5 p-1 rounded-xl bg-[var(--card)] border border-[var(--line)]"
      >
        <button
          type="button"
          data-s="topics"
          aria-pressed={subTab === 'topics'}
          onClick={() => setSubTab('topics')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === 'topics'
              ? 'bg-[var(--pri)] text-[var(--onpri)] shadow-sm'
              : 'text-[var(--mute)] hover:text-[var(--ink)]'
          }`}
        >
          Konular
        </button>
        <button
          type="button"
          data-s="words"
          aria-pressed={subTab === 'words'}
          onClick={() => setSubTab('words')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === 'words'
              ? 'bg-[var(--pri)] text-[var(--onpri)] shadow-sm'
              : 'text-[var(--mute)] hover:text-[var(--ink)]'
          }`}
        >
          Kelimeler
        </button>
        <button
          type="button"
          data-s="hw"
          aria-pressed={subTab === 'hw'}
          onClick={() => setSubTab('hw')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === 'hw'
              ? 'bg-[var(--pri)] text-[var(--onpri)] shadow-sm'
              : 'text-[var(--mute)] hover:text-[var(--ink)]'
          }`}
        >
          Ödevler
        </button>
      </div>

      {/* 1. Subtab: Konular */}
      {subTab === 'topics' && (
        <div className="space-y-3">
          <button
            id="nt2"
            type="button"
            onClick={onNewTopic}
            className="w-full py-3.5 px-4 rounded-2xl font-extrabold text-xs text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--pri)' }}
          >
            + Yeni konu ekle
          </button>

          <div className="space-y-2">
            {topics.map((t) => (
              <button
                key={t.id}
                data-e={t.id}
                onClick={() => onOpenTopicEditor(t.id)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:border-[var(--pri)] shadow-sm"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
              >
                <span className="w-10 h-10 rounded-xl bg-[var(--bg)] flex items-center justify-center text-lg flex-none border border-[var(--line)]">
                  {t.ic}
                </span>
                <div className="flex-1 min-w-0">
                  <b className="block text-sm font-bold text-[var(--ink)] truncate">
                    {t.t}
                  </b>
                  <span className="text-xs text-[var(--mute)]">
                    {t.q.length} soru · {t.words.length} kelime · {t.ex.length} örnek
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[var(--pri)] bg-[var(--bg)] px-2 py-0.5 rounded-md flex-none">
                  {t.lv || 'A1'} · Düzenle
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Subtab: Kelimeler */}
      {subTab === 'words' && (
        <div className="space-y-3">
          {/* Level chips */}
          <div className="flex flex-wrap gap-1.5">
            {LV.map((l) => (
              <button
                key={l}
                data-wl={l}
                onClick={() => {
                  setWordLevel(l);
                  handleCancelWord();
                }}
                className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                  wordLevel === l
                    ? 'bg-[var(--pri)] text-[var(--onpri)] border-[var(--pri)] shadow-sm'
                    : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink)]'
                }`}
              >
                {l} ({words.filter((w) => w.lv === l).length})
              </button>
            ))}
          </div>

          {/* Word List */}
          <div
            className="p-3.5 rounded-2xl border shadow-sm divide-y divide-[var(--line)]"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            {currentLevelWords.map((w) => (
              <div key={w.id} className="py-2 flex items-center justify-between text-xs">
                <div
                  data-we={w.id}
                  onClick={() => handleEditWord(w)}
                  className="flex-1 pr-2 cursor-pointer hover:opacity-80"
                >
                  <span className="font-bold text-sm text-[var(--ink)]">{w.e}</span>
                  <span className="text-[var(--mute)] ml-2">· {w.tr}</span>
                  <div className="text-[10px] text-[var(--pri)] font-bold">Dokun: düzenle</div>
                </div>
                <button
                  type="button"
                  data-wd={w.id}
                  onClick={() => onDeleteWord(w.id)}
                  className="text-base p-1 hover:opacity-75 cursor-pointer flex-none"
                >
                  🗑️
                </button>
              </div>
            ))}
            {currentLevelWords.length === 0 && (
              <div className="text-center py-4 text-xs text-[var(--mute)]">
                Bu seviyede kelime bulunmuyor.
              </div>
            )}
          </div>

          {/* Add / Edit Form */}
          <div
            className="p-4 rounded-3xl border space-y-2.5 shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
              {editingWordId ? 'Kelimeyi Düzenle' : 'Yeni Kelime Ekle'}
            </h3>

            <label className="block text-xs font-bold text-[var(--ink)]">
              Seviye
              <select
                id="wl"
                value={wordLv}
                onChange={(e) => setWordLv(e.target.value)}
                className="w-full mt-1 p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
              >
                {LV.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-[var(--ink)]">
              İngilizce
              <input
                id="w1"
                type="text"
                value={wordEn}
                onChange={(e) => setWordEn(e.target.value)}
                placeholder="Örn: book"
                className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
              />
            </label>

            <label className="block text-xs font-bold text-[var(--ink)]">
              Türkçe anlamı
              <input
                id="w2"
                type="text"
                value={wordTr}
                onChange={(e) => setWordTr(e.target.value)}
                placeholder="Örn: kitap"
                className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
              />
            </label>

            <label className="block text-xs font-bold text-[var(--ink)]">
              Okunuşu (isteğe bağlı)
              <input
                id="w3"
                type="text"
                value={wordPh}
                onChange={(e) => setWordPh(e.target.value)}
                placeholder="buk"
                className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-mono text-[var(--ink)]"
              />
            </label>

            <label className="block text-xs font-bold text-[var(--ink)]">
              Örnek cümle
              <input
                id="w4"
                type="text"
                value={wordEx}
                onChange={(e) => setWordEx(e.target.value)}
                placeholder="This book is interesting."
                className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
              />
            </label>

            {wordFeedback && (
              <p id="wm3" className="text-xs font-bold text-[var(--bad)]">
                {wordFeedback}
              </p>
            )}

            <button
              id="wsv"
              type="button"
              onClick={handleSaveWord}
              className="w-full py-3.5 px-4 rounded-xl font-extrabold text-xs text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--pri)' }}
            >
              {editingWordId ? 'Kaydet' : 'Kelimeyi ekle'}
            </button>

            {editingWordId && (
              <button
                id="wcn"
                type="button"
                onClick={handleCancelWord}
                className="w-full py-2.5 px-3 rounded-xl border border-[var(--line)] text-xs font-bold text-[var(--mute)] hover:bg-[var(--bg)] cursor-pointer"
              >
                Vazgeç
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Subtab: Ödevler */}
      {subTab === 'hw' && (
        <div className="space-y-3">
          <button
            id="nh2"
            type="button"
            onClick={onNewHomework}
            className="w-full py-3.5 px-4 rounded-2xl font-extrabold text-xs text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--pri)' }}
          >
            + Yeni ödev ekle
          </button>

          <div className="space-y-2">
            {homeworks.map((h) => {
              const assignedCount = h.to?.length || 0;
              const doneCount = (h.to || []).filter((studentId) => {
                const s = students.find((st) => st.id === studentId);
                return s && hwDone(h, s);
              }).length;

              let typeIcon = '✏️';
              if (h.type === 'write') typeIcon = '📝';
              if (h.type === 'test') typeIcon = '🧪';

              return (
                <button
                  key={h.id}
                  data-hid={h.id}
                  onClick={() => onOpenHomeworkEditor(h.id)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:border-[var(--pri)] shadow-sm"
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
                >
                  <span className="w-10 h-10 rounded-xl bg-[var(--bg)] flex items-center justify-center text-lg flex-none border border-[var(--line)]">
                    {typeIcon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <b className="block text-sm font-bold text-[var(--ink)] truncate">
                      {h.t || 'Ödev'}
                    </b>
                    <span className="text-xs text-[var(--mute)]">
                      {h.due ? `${h.due} · ` : ''}
                      {doneCount}/{assignedCount} tamamladı
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[var(--pri)]">Düzenle</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
