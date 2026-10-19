import React, { useState, useEffect } from 'react';
import { Question } from '../types.ts';
import { ans, shuf } from '../utils/logic.ts';
import { sp } from '../utils/speech.ts';

interface QuizViewProps {
  quizKey: string;
  name: string;
  questions: Question[];
  onExit: () => void;
  onFinish: (score: number, total: number) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  name,
  questions,
  onExit,
  onFinish,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ isOk: boolean; text: string } | null>(null);
  const [fillVal, setFillVal] = useState('');
  const [orderPick, setOrderPick] = useState<number[]>([]);
  const [orderBank, setOrderBank] = useState<number[]>([]);

  const currentQ = questions[currentIndex];
  const total = questions.length;

  useEffect(() => {
    setIsLocked(false);
    setSelectedOpt(null);
    setFeedback(null);
    setFillVal('');

    if (currentQ && currentQ.k === 'order') {
      const bankIndices = currentQ.w.map((_, i) => i);
      setOrderBank(shuf(bankIndices));
      setOrderPick([]);
    }

    if (currentQ && currentQ.k === 'listen') {
      sp(currentQ.s);
    }
  }, [currentIndex, currentQ]);

  const handleFinishQuestion = (isOk: boolean) => {
    if (isLocked) return;
    setIsLocked(true);
    if (isOk) {
      setScore((s) => s + 1);
    }
    const correctAnswer = ans(currentQ);
    setFeedback({
      isOk,
      text: isOk ? 'Doğru! 🎉' : `Doğru cevap: ${correctAnswer}`,
    });
  };

  const handleNext = () => {
    if (currentIndex + 1 >= total) {
      onFinish(score + (feedback?.isOk ? 0 : 0), total);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleCheckFill = () => {
    if (isLocked || !currentQ || currentQ.k !== 'fill') return;
    const userVal = fillVal.trim().toLowerCase();
    const correctVals = Array.isArray(currentQ.a)
      ? currentQ.a.map((v) => v.toLowerCase())
      : [currentQ.a.toLowerCase()];
    handleFinishQuestion(correctVals.includes(userVal));
  };

  const handleCheckOrder = () => {
    if (isLocked || !currentQ || currentQ.k !== 'order') return;
    const assembled = orderPick.map((i) => currentQ.w[i]).join(' ');
    const target = currentQ.w.join(' ');
    handleFinishQuestion(assembled === target);
  };

  if (!currentQ) return null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Navigation & Progress */}
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
              style={{ width: `${(currentIndex / total) * 100}%` }}
            />
          </div>
          <p className="text-xs font-bold text-[var(--mute)] mt-1.5">
            {name} · {currentIndex + 1}/{total}
          </p>
        </div>

        {/* Question Content */}
        {/* 1. Multiple Choice & Listen */}
        {(currentQ.k === 'mc' || currentQ.k === 'listen') && (
          <div className="space-y-3">
            {currentQ.k === 'listen' ? (
              <div className="text-center py-2">
                <button
                  id="lis"
                  type="button"
                  onClick={() => sp(currentQ.s)}
                  className="px-5 py-3 rounded-2xl font-black text-sm bg-[var(--pri)] text-[var(--onpri)] shadow-md hover:brightness-105 active:scale-98 cursor-pointer transition-all"
                >
                  🔊 Dinle
                </button>
                <p className="text-xs text-[var(--mute)] mt-2">
                  Duyduğun cümleyi seç
                </p>
              </div>
            ) : (
              <div className="text-xl font-bold font-heading text-[var(--ink)] py-1">
                {currentQ.q}
              </div>
            )}

            <div className="space-y-2 pt-1">
              {currentQ.o.map((opt, k) => {
                const correctAnswer = ans(currentQ);
                let btnStyle = 'border-[var(--line)] bg-[var(--card)]';
                if (isLocked) {
                  if (opt === correctAnswer) {
                    btnStyle = 'border-[var(--ok)] bg-[var(--okbg)] text-[var(--ok)] font-extrabold';
                  } else if (selectedOpt === k) {
                    btnStyle = 'border-[var(--bad)] bg-[var(--badbg)] text-[var(--bad)]';
                  }
                } else if (selectedOpt === k) {
                  btnStyle = 'border-[var(--pri)] bg-[var(--bg)]';
                }

                return (
                  <button
                    key={k}
                    data-k={k}
                    disabled={isLocked}
                    onClick={() => {
                      if (isLocked) return;
                      setSelectedOpt(k);
                      handleFinishQuestion(opt === correctAnswer);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 font-bold text-sm transition-all shadow-sm ${btnStyle} ${
                      !isLocked ? 'cursor-pointer hover:border-[var(--pri)] active:scale-98' : ''
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Fill in the Blank */}
        {currentQ.k === 'fill' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--mute)] font-semibold">
              {currentQ.h || 'Boşluğu doldur'}
            </p>
            <div className="text-xl font-bold font-heading text-[var(--ink)] py-2 leading-relaxed flex flex-wrap items-center gap-1.5">
              <span>{currentQ.q.split('___')[0]}</span>
              <input
                id="fi"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                disabled={isLocked}
                value={fillVal}
                onChange={(e) => setFillVal(e.target.value)}
                placeholder="cevap..."
                className="w-28 px-3 py-1.5 rounded-xl border-2 border-[var(--line)] bg-[var(--card)] text-sm font-extrabold text-[var(--ink)] focus:outline-none focus:border-[var(--pri)]"
              />
              <span>{currentQ.q.split('___')[1] || ''}</span>
            </div>

            {!isLocked && (
              <button
                id="ck"
                type="button"
                onClick={handleCheckFill}
                disabled={!fillVal.trim()}
                className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm bg-[var(--pri)] text-[var(--onpri)] shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer disabled:opacity-40"
              >
                Kontrol et
              </button>
            )}
          </div>
        )}

        {/* 3. Order Words */}
        {currentQ.k === 'order' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--mute)] font-semibold">
              Cümleyi kur
            </p>
            <div className="text-xl font-bold font-heading text-[var(--ink)]">
              {currentQ.q}
            </div>

            {/* Answer slot */}
            <div
              id="ans"
              className="min-h-[58px] p-2.5 rounded-2xl border border-[var(--line)] bg-[var(--card)] flex flex-wrap gap-1.5 shadow-inner"
            >
              {orderPick.map((idx) => (
                <button
                  key={idx}
                  type="button"
                  data-p={idx}
                  disabled={isLocked}
                  onClick={() => {
                    if (isLocked) return;
                    setOrderPick(orderPick.filter((i) => i !== idx));
                  }}
                  className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--card)] font-bold text-xs shadow-sm hover:border-[var(--bad)] cursor-pointer"
                >
                  {currentQ.w[idx]}
                </button>
              ))}
              {orderPick.length === 0 && (
                <span className="text-xs text-[var(--mute)] font-medium self-center px-1">
                  Kelimelere dokunarak sırayla buraya ekle
                </span>
              )}
            </div>

            {/* Bank of choices */}
            <div id="bank" className="flex flex-wrap gap-1.5 pt-1">
              {orderBank.map((idx) => {
                const isPicked = orderPick.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    data-b={idx}
                    disabled={isLocked || isPicked}
                    onClick={() => {
                      if (isLocked || isPicked) return;
                      setOrderPick([...orderPick, idx]);
                    }}
                    className={`px-3 py-2 rounded-xl border font-bold text-xs shadow-sm transition-all ${
                      isPicked
                        ? 'opacity-30 border-[var(--line)] bg-[var(--bg)] cursor-default'
                        : 'border-[var(--line)] bg-[var(--card)] hover:border-[var(--pri)] cursor-pointer'
                    }`}
                  >
                    {currentQ.w[idx]}
                  </button>
                );
              })}
            </div>

            {!isLocked && (
              <button
                id="ck"
                type="button"
                onClick={handleCheckOrder}
                disabled={orderPick.length === 0}
                className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm bg-[var(--pri)] text-[var(--onpri)] shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer disabled:opacity-40"
              >
                Kontrol et
              </button>
            )}
          </div>
        )}

        {/* Feedback Area */}
        <div className="min-h-[28px] pt-1">
          {feedback && (
            <div
              id="fb"
              className={`font-black text-sm transition-all animate-in fade-in ${
                feedback.isOk ? 'text-[var(--ok)]' : 'text-[var(--bad)]'
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>
      </div>

      {/* Next / Finish Button */}
      <button
        id="nx"
        disabled={!isLocked}
        onClick={handleNext}
        className="w-full py-4 px-4 rounded-2xl font-extrabold text-sm transition-all shadow-md mt-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-white hover:brightness-105 active:scale-98"
        style={{ backgroundColor: 'var(--pri)' }}
      >
        {currentIndex === total - 1 ? 'Bitir' : 'Sonraki'}
      </button>
    </div>
  );
};
