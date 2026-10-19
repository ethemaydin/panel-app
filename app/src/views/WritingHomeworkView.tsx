import React, { useState } from 'react';
import { Homework, Student } from '../types.ts';
import { hs } from '../utils/logic.ts';

interface WritingHomeworkViewProps {
  homework: Homework;
  student: Student;
  onBack: () => void;
  onSubmit: (text: string) => void;
}

export const WritingHomeworkView: React.FC<WritingHomeworkViewProps> = ({
  homework,
  student,
  onBack,
  onSubmit,
}) => {
  const result = hs(homework, student);
  const [text, setText] = useState(result.text || '');
  const [errorMsg, setErrorMsg] = useState('');
  const isSent = !!result.text;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length < 4) {
      setErrorMsg('En az bir tam cümle yazmalısın (en az 4 kelime).');
      return;
    }
    onSubmit(text.trim());
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <button
        id="b"
        onClick={onBack}
        className="font-bold text-xs text-[var(--pri)] cursor-pointer flex items-center gap-1 hover:underline"
      >
        ‹ Ödevler
      </button>

      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          📝 {homework.t}
        </h1>
        <p className="text-xs text-[var(--mute)] mt-0.5">
          {homework.d || 'Cümlelerini yaz ve öğretmenine gönder.'}
          {homework.due ? ` · Teslim: ${homework.due}` : ''}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 rounded-3xl border space-y-3 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <label className="block text-xs font-bold text-[var(--ink)]">
          Cevabın
          <textarea
            id="wx"
            rows={7}
            readOnly={isSent}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="I am a student. I live in Konya. My favorite subject is English..."
            className="w-full mt-1.5 p-3 rounded-2xl border border-[var(--line)] bg-[var(--bg)] text-sm leading-relaxed text-[var(--ink)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pri)] resize-none"
          />
        </label>

        {errorMsg && (
          <p id="wm" className="text-xs font-bold text-[var(--bad)] min-h-4">
            {errorMsg}
          </p>
        )}

        {isSent ? (
          <div className="p-3 rounded-xl bg-[var(--okbg)] border border-[var(--ok)]/30 text-xs font-extrabold text-[var(--ok)] text-center">
            ✅ Öğretmenine gönderildi.
          </div>
        ) : (
          <button
            type="submit"
            id="ws"
            className="w-full py-4 px-4 rounded-2xl font-extrabold text-sm text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--pri)' }}
          >
            Gönder
          </button>
        )}
      </form>
    </div>
  );
};
