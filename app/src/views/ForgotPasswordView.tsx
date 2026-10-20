import React, { useState } from 'react';
import { requestPasswordReset, updatePassword, hasRecoverySession, supabase } from '../lib/supabase.ts';

export type ForgotMode = 'request' | 'done' | 'setnew';

interface Props {
  onBack: () => void;
  /** Yeni şifre başarıyla değiştiğinde çağrılır (kullanıcı girişe döner). */
  onDone?: () => void;
}

/**
 * "Şifremi unuttum" akışı:
 * 1) E-posta ile sıfırlama bağlantısı iste
 * 2) Bağlantı açıldığında (URL'de type=recovery) Supabase recovery oturumu oluşturur
 *    → bu ekran yeni şifre belirleme formuna geçer.
 */
export const ForgotPasswordView: React.FC<Props> = ({ onBack, onDone }) => {
  const isRecoveryUrl = /type=recovery/.test(location.hash);
  const [mode, setMode] = useState<ForgotMode>(isRecoveryUrl ? 'setnew' : 'request');
  const [email, setEmail] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // URL hash'te recovery varsa ama oturum yoksa (bağlantı eski/tekrar kullanılmış)
  React.useEffect(() => {
    if (!isRecoveryUrl) return;
    let alive = true;
    hasRecoverySession().then((has) => {
      if (!alive) return;
      if (!has) {
        setMode('request');
        setErr('Sıfırlama bağlantısı geçersiz ya da zaten kullanılmış. Yeniden iste.');
      }
    });
    return () => { alive = false; };
  }, [isRecoveryUrl]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const em = email.trim().toLowerCase();
    if (!em.includes('@')) { setErr('Geçerli bir e-posta yaz.'); return; }
    setBusy(true);
    try {
      const { error } = await requestPasswordReset(em);
      if (error) {
        setErr(error.message.includes('rate limit')
          ? 'Çok fazla istek gönderdin. Biraz sonra tekrar dene.'
          : error.message);
      } else {
        setMode('done');
      }
    } catch {
      setErr('Bağlantı hatası. İnternetini kontrol et.');
    } finally {
      setBusy(false);
    }
  };

  const handleSetNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (pw1.length < 8) { setErr('Yeni şifre en az 8 karakter olmalı.'); return; }
    if (pw1 !== pw2) { setErr('Şifreler aynı değil.'); return; }
    setBusy(true);
    try {
      const { error } = await updatePassword(pw1);
      if (error) {
        setErr(error.message.includes('session') || error.message.toLowerCase().includes('auth')
          ? 'Oturum süresi doldu. Bağlantıyı e-postadaki linkten yeniden aç.'
          : error.message);
        return;
      }
      // Panel SQL uyumu (hata H): protect_profile tetikleyicisi, kullanıcının kendi
      // profilinde must_change_password'u değiştirmesini "Bu alan değiştirilemez"
      // diyerek REDDEDER. Bayrak temizliği app'ten yapılmaz; şifre zaten değiştiği için
      // öğrenci bir sonraki girişte ForcePassword ekranıyla karşılaşmaz (must bayrağı
      // lokalde LoginView'de profilden okunur ve panelden gelen true değeri yalnızca
      // admin/öğretmen set_password akışıyla sıfırlanır).
      history.replaceState(null, '', location.pathname);
      await supabase.auth.signOut(); // temiz oturumla tekrar giriş yapsın
      onDone?.();
    } catch {
      setErr('Şifre değiştirilemedi. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full mt-1 p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pri)]';

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col justify-between">
      <div>
        <div className="text-center pt-2 mb-4">
          <h2 className="text-xl font-bold font-heading text-[var(--pri)] mb-0.5">
            {mode === 'setnew' ? 'Yeni şifreni belirle' : 'Şifremi unuttum'}
          </h2>
          <p className="text-sm text-[var(--mute)]">
            {mode === 'request' && 'Kayıtlı e-postana sıfırlama bağlantısı gönderelim.'}
            {mode === 'done' && 'E-postanı kontrol et.'}
            {mode === 'setnew' && 'En az 8 karakterli yeni bir şifre seç.'}
          </p>
        </div>

        {mode === 'request' && (
          <form
            onSubmit={handleRequest}
            className="p-4 rounded-2xl border shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <label className="block text-xs font-bold mb-2">
              E-posta
              <input
                id="fem"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                placeholder="ornek@eposta.com"
                className={inputCls}
              />
            </label>
            {err && <p id="ferr" className="text-xs font-bold my-1 text-[var(--bad)]">{err}</p>}
            <button
              type="submit"
              id="fsend"
              disabled={busy}
              className="w-full mt-2 py-3.5 px-4 rounded-xl font-extrabold text-sm transition-all cursor-pointer shadow-md active:scale-98 disabled:opacity-60"
              style={{ backgroundColor: 'var(--pri)', color: 'var(--onpri)' }}
            >
              {busy ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-xs text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
            >
              ← Giriş ekranına dön
            </button>
          </form>
        )}

        {mode === 'done' && (
          <div
            className="p-4 rounded-2xl border shadow-sm text-center"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <p className="text-sm font-bold mb-1">📧 {email}</p>
            <p className="text-xs text-[var(--mute)] mb-3">
              Sıfırlama bağlantısı gönderildi. Gelen kutunu (ve spam klasörünü) kontrol et.
              Bağlantıya tıklayınca bu ekranda yeni şifreni belirleyebilirsin.
            </p>
            {err && <p className="text-xs font-bold my-1 text-[var(--bad)]">{err}</p>}
            <button
              type="button"
              id="fagain"
              onClick={() => { setMode('request'); setErr(''); }}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs cursor-pointer border border-[var(--line)] text-[var(--ink)]"
            >
              Tekrar gönder
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-xs text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
            >
              ← Giriş ekranına dön
            </button>
          </div>
        )}

        {mode === 'setnew' && (
          <form
            onSubmit={handleSetNew}
            className="p-4 rounded-2xl border shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <label className="block text-xs font-bold mb-2">
              Yeni şifre
              <input
                id="fpw1"
                type="password"
                autoComplete="new-password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                disabled={busy}
                placeholder="••••••••"
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-bold mb-2">
              Yeni şifre (tekrar)
              <input
                id="fpw2"
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                disabled={busy}
                placeholder="••••••••"
                className={inputCls}
              />
            </label>
            {err && <p id="ferr" className="text-xs font-bold my-1 text-[var(--bad)]">{err}</p>}
            <button
              type="submit"
              id="fset"
              disabled={busy}
              className="w-full mt-2 py-3.5 px-4 rounded-xl font-extrabold text-sm transition-all cursor-pointer shadow-md active:scale-98 disabled:opacity-60"
              style={{ backgroundColor: 'var(--pri)', color: 'var(--onpri)' }}
            >
              {busy ? 'Kaydediliyor…' : 'Şifreyi değiştir'}
            </button>
          </form>
        )}
      </div>

      <div className="text-[11px] text-[var(--mute)] text-center pt-4 pb-2">
        Sorun yaşarsan öğretmeninle WhatsApp'tan iletişime geç.
      </div>
    </div>
  );
};
