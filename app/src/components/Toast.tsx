import React from 'react';

export interface ToastData {
  title: string;
  message: string;
}

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  return (
    <div
      role="status"
      onClick={onClose}
      className="fixed top-12 left-1/2 -translate-x-1/2 w-[90%] max-w-[390px] z-50 p-3.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] cursor-pointer transition-all duration-300 animate-in fade-in slide-in-from-top-4"
      style={{
        backgroundColor: 'var(--ink)',
        color: 'var(--bg)',
      }}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none">🔔</span>
        <div className="flex-1 text-sm">
          <div className="font-bold text-[14px] leading-snug">{toast.title}</div>
          <div className="text-[12.5px] opacity-90 leading-tight mt-0.5">{toast.message}</div>
        </div>
      </div>
    </div>
  );
};
