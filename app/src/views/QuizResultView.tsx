import React from 'react';

interface QuizResultViewProps {
  name: string;
  score: number;
  total: number;
  isTopicTest: boolean;
  isHomework: boolean;
  onRetry: () => void;
  onBack: () => void;
}

export const QuizResultView: React.FC<QuizResultViewProps> = ({
  name,
  score,
  total,
  isTopicTest,
  isHomework,
  onRetry,
  onBack,
}) => {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const isPassed = pct >= 60;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col justify-between text-center">
      <div className="space-y-4 pt-4">
        <div className="score text-center">
          <div className="text-7xl font-black font-heading text-[var(--pri)] leading-none my-2">
            {score}/{total}
          </div>
          <h2 className="text-2xl font-black font-heading mt-3 text-[var(--ink)]">
            {isPassed ? 'Harika iş! 🎉' : 'Biraz daha tekrar edelim 💪'}
          </h2>
          <p className="text-sm font-semibold text-[var(--mute)] mt-1">
            %{pct} başarı · {name}
          </p>
        </div>

        {isTopicTest && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-bold max-w-[320px] mx-auto ${
              isPassed
                ? 'bg-[var(--okbg)] border-[var(--ok)]/30 text-[var(--ok)]'
                : 'bg-[var(--badbg)] border-[var(--bad)]/30 text-[var(--bad)]'
            }`}
          >
            {isPassed
              ? 'Konu testini geçtin ✓'
              : 'Konuyu tamamlamak için en az %60 gerekiyor. Tekrar dene!'}
          </div>
        )}
      </div>

      <div className="space-y-2.5 pt-6">
        <button
          id="ag"
          onClick={onRetry}
          className="w-full py-4 px-4 rounded-2xl font-extrabold text-sm transition-all shadow-md text-white hover:brightness-105 active:scale-98 cursor-pointer"
          style={{ backgroundColor: 'var(--pri)' }}
        >
          Testi tekrar çöz
        </button>

        <button
          id="bk"
          onClick={onBack}
          className="w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm border transition-all cursor-pointer shadow-sm hover:bg-[var(--line)]/30 active:scale-98"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--line)',
            color: 'var(--ink)',
          }}
        >
          {isHomework ? 'Ödevlere dön' : 'Derslere dön'}
        </button>
      </div>
    </div>
  );
};
