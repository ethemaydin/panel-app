import React, { useState } from 'react';
import { WordItem, Student } from '../types.ts';
import { wstat } from '../utils/logic.ts';
import { sp } from '../utils/speech.ts';

interface FlashcardsViewProps {
  deck: WordItem[];
  student: Student;
  onExit: () => void;
  onWordKnown: (wordId: number) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  deck: initialDeck,
  student,
  onExit,
  onWordKnown,
}) => {
  const [deck, setDeck] = useState<WordItem[]>(initialDeck);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [gotCount, setGotCount] = useState(0);

  const total = deck.length;
  const isFinished = index >= total;
  const day = wstat(student);

  if (isFinished) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col justify-between text-center">
        <div className="space-y-4 pt-6">
          <div className="text-7xl font-black font-heading text-[var(--pri)] leading-none">
            {gotCount}/{total}
          </div>
          <h2 className="text-2xl font-black font-heading text-[var(--ink)]">
            Bugünkü seri bitti! 🎉
          </h2>
          <p className="text-sm font-semibold text-[var(--mute)]">
            Bugün toplam {day.n}/{student.goal} kelime çalıştın.
          </p>
        </div>

        <button
          id="bk"
          onClick={onExit}
          className="w-full py-4 px-4 rounded-2xl font-extrabold text-sm transition-all shadow-md text-white hover:brightness-105 active:scale-98 cursor-pointer"
          style={{ backgroundColor: 'var(--pri)' }}
        >
          Kelimelere dön
        </button>
      </div>
    );
  }

  const currentWord = deck[index];

  const handleKnown = () => {
    onWordKnown(currentWord.id);
    setGotCount((g) => g + 1);
    setIndex((i) => i + 1);
    setIsFlipped(false);
  };

  const handleRepeat = () => {
    // Move current word to end of deck
    const updated = [...deck];
    const [removed] = updated.splice(index, 1);
    updated.push(removed);
    setDeck(updated);
    setIsFlipped(false);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Top bar & progress */}
        <div>
          <button
            id="b"
            onClick={onExit}
            className="font-bold text-xs text-[var(--pri)] cursor-pointer flex items-center gap-1 hover:underline mb-2"
          >
            ‹ Çık
          </button>
          <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden">
            <div
              className="h-full bg-[var(--pri)] rounded-full transition-all duration-300"
              style={{ width: `${(index / total) * 100}%` }}
            />
          </div>
          <p className="text-xs font-bold text-[var(--mute)] mt-1.5 flex justify-between">
            <span>{index + 1} / {total}</span>
            <span className="bg-[var(--sun)] text-[#14213D] px-2 py-0.5 rounded text-[10px] font-extrabold">
              {currentWord.lv}
            </span>
          </p>
        </div>

        {/* 3D Flashcard element */}
        <button
          id="cd"
          type="button"
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full min-h-[240px] rounded-3xl p-6 text-center flex flex-col items-center justify-center cursor-pointer shadow-lg transition-transform duration-200 active:scale-98 text-white"
          style={{ backgroundColor: 'var(--pri)' }}
        >
          {isFlipped ? (
            <div className="space-y-2">
              <div className="text-3xl font-black font-heading">{currentWord.tr}</div>
              <div className="text-base font-bold opacity-90">{currentWord.e}</div>
              {currentWord.ex && (
                <div className="text-sm font-semibold opacity-85 pt-3 border-t border-white/20 italic">
                  “{currentWord.ex}”
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl font-black font-heading">{currentWord.e}</div>
              {currentWord.ph && (
                <div className="text-sm font-mono opacity-85">/{currentWord.ph}/</div>
              )}
              <div className="text-xs font-bold opacity-75 pt-3">
                Anlamı ve örneği için dokun 👆
              </div>
            </div>
          )}
        </button>

        {/* Pronunciation speech button */}
        <button
          id="sp2"
          type="button"
          onClick={() => sp(currentWord.e)}
          className="w-full py-3 px-4 rounded-xl border border-[var(--line)] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:border-[var(--pri)]"
          style={{ backgroundColor: 'var(--card)', color: 'var(--ink)' }}
        >
          <span>🔊</span>
          <span>Kelimeyi dinle ({currentWord.e})</span>
        </button>

        {isFlipped && currentWord.ex && (
          <button
            id="sp3"
            type="button"
            onClick={() => sp(currentWord.ex)}
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--line)] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:border-[var(--pri)]"
            style={{ backgroundColor: 'var(--card)', color: 'var(--ink)' }}
          >
            <span>🔊</span>
            <span>Cümleyi dinle</span>
          </button>
        )}
      </div>

      {/* Action buttons when flipped */}
      {isFlipped ? (
        <div className="flex gap-2 pt-4">
          <button
            id="re"
            type="button"
            onClick={handleRepeat}
            className="flex-1 py-3.5 px-3 rounded-2xl border font-bold text-xs transition-all shadow-sm cursor-pointer hover:bg-[var(--line)]/30 active:scale-98"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--line)',
              color: 'var(--ink)',
            }}
          >
            Tekrar göster
          </button>
          <button
            id="ok"
            type="button"
            onClick={handleKnown}
            className="flex-1 py-3.5 px-3 rounded-2xl font-black text-xs text-white shadow-md transition-all cursor-pointer hover:brightness-105 active:scale-98"
            style={{ backgroundColor: 'var(--ok)' }}
          >
            Biliyorum ✓
          </button>
        </div>
      ) : (
        <div className="text-center py-2 text-xs font-medium text-[var(--mute)]">
          Kartın arkasını görmek için karta dokunun
        </div>
      )}
    </div>
  );
};
