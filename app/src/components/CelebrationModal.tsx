import React from 'react';
import { psize, pn } from '../utils/logic.ts';
import { getPuzzlePieceStyles } from '../utils/puzzle.ts';

export interface CelebrationData {
  title: string;
  message: string;
  puzzleId?: number;
}

interface CelebrationModalProps {
  data: CelebrationData | null;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  const confettiIcons = ['🎉', '✨', '🎊', '💜', '⭐', '🌸', '🎈', '🏆'];
  const tot = data.puzzleId ? psize(data.puzzleId) : 0;
  const cols = tot === 4 ? 2 : 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#280A0F]/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${(i * 17) % 96}%`,
              animationDelay: `${((i * 13) % 20) / 10}s`,
              fontSize: `${16 + (i % 4) * 6}px`,
            }}
          >
            {confettiIcons[i % confettiIcons.length]}
          </span>
        ))}
      </div>

      <div
        className="w-full max-w-[380px] rounded-3xl p-6 text-center relative z-10 shadow-2xl border"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--line)',
          color: 'var(--ink)',
        }}
      >
        <h2 className="text-2xl font-extrabold mb-1 font-heading text-[var(--pri)]">
          {data.title}
        </h2>
        <p className="text-sm text-[var(--mute)] mb-4">{data.message}</p>

        {data.puzzleId && (
          <div className="mb-4">
            <div
              className="grid gap-1 rounded-2xl overflow-hidden w-full aspect-[5/3] my-2 shadow-sm border border-[var(--line)]"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
            >
              {Array.from({ length: tot }).map((_, idx) => (
                <div
                  key={idx}
                  className="w-full h-full"
                  style={getPuzzlePieceStyles(data.puzzleId!, idx, true)}
                />
              ))}
            </div>
            <p className="text-xs font-bold text-[var(--mute)]">
              {pn(data.puzzleId)} yapbozunu tamamladın!
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm transition-all cursor-pointer shadow-md hover:brightness-105 active:scale-98"
          style={{
            backgroundColor: 'var(--pri)',
            color: 'var(--onpri)',
          }}
        >
          Harika! 💜
        </button>
      </div>
    </div>
  );
};
