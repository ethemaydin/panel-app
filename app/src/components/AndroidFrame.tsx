import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Signal, Smartphone, Maximize2, Minimize2 } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  theme: 'auto' | 'light' | 'dark';
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({ children, theme }) => {
  const [timeStr, setTimeStr] = useState('12:00');
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center p-0 sm:p-4 select-none ${
        theme === 'dark' ? 'bg-[#0E0608]' : 'bg-[#180A0E]'
      } transition-colors duration-200`}
    >
      {/* Top frame controls for desktop */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-[430px] mb-2 px-2 text-xs text-[#C8A3A8]/80">
        <div className="flex items-center gap-1.5 font-semibold">
          <Smartphone size={14} className="text-[#FF4D63]" />
          <span>English Base Android v2.4</span>
        </div>
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded bg-white/5 border border-white/10"
          title={isFullScreen ? 'Telefon çerçevesine geç' : 'Tam ekrana geç'}
        >
          {isFullScreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          <span>{isFullScreen ? 'Pencere' : 'Genişlet'}</span>
        </button>
      </div>

      {/* Android Device Body */}
      <div
        className={`w-full relative flex flex-col transition-all duration-300 ${
          isFullScreen
            ? 'h-screen max-w-full rounded-none border-0'
            : 'h-[100dvh] sm:h-[860px] max-w-[430px] sm:rounded-[44px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] sm:border-[8px] sm:border-[#381F23]'
        } overflow-hidden`}
        style={{
          backgroundColor: 'var(--bg)',
          color: 'var(--ink)',
        }}
      >
        {/* Android Status Bar */}
        <div
          className="w-full flex-none flex items-center justify-between px-6 pt-3 pb-1 z-30 select-none"
          style={{ backgroundColor: 'var(--bg)' }}
        >
          <span className="text-xs font-bold tracking-tight text-[var(--ink)]">
            {timeStr}
          </span>

          {/* Front Camera Punch-hole */}
          <div className="w-4 h-4 rounded-full bg-[#000000] border border-white/10 flex items-center justify-center shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A2E]/80"></div>
          </div>

          <div className="flex items-center gap-1.5 text-[var(--ink)]">
            <Signal size={13} strokeWidth={2.5} />
            <Wifi size={13} strokeWidth={2.5} />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-extrabold">95%</span>
              <BatteryMedium size={15} strokeWidth={2.2} />
            </div>
          </div>
        </div>

        {/* Main Application Content Container */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </div>

        {/* Android Bottom Navigation Pill Bar */}
        <div
          className="w-full flex-none py-2 flex items-center justify-center z-30 select-none"
          style={{ backgroundColor: 'var(--card)' }}
        >
          <div className="w-32 h-1 bg-[var(--mute)]/40 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};
