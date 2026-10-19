import React from 'react';

interface EBProps {
  children: React.ReactNode;
}
interface EBState {
  error: Error | null;
}

/**
 * Global hata sınırı: tek bir view'daki hata tüm uygulamayı beyaz ekrana
 * çevirmesin; kullanıcı ana ekrana dönebilsin.
 */
export class ErrorBoundary extends React.Component<EBProps, EBState> {
  state: EBState = { error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary yakaladı:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
        <span className="text-5xl">🛟</span>
        <h2 className="text-lg font-black text-[var(--ink)]">Bir şey ters gitti</h2>
        <p className="text-xs text-[var(--mute)] max-w-xs">
          Uygulama bu ekranı güvenle gösteremedi. Ana ekrana dönüp tekrar deneyebilirsin.
        </p>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            try {
              localStorage.removeItem('eb_screen_state');
            } catch {}
            window.location.reload();
          }}
          className="py-3 px-6 rounded-xl font-extrabold text-sm text-white cursor-pointer shadow-md"
          style={{ backgroundColor: 'var(--pri)' }}
        >
          Yenile & Ana Ekran
        </button>
      </div>
    );
  }
}
