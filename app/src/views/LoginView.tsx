import React, { useState } from 'react';
import { UserRole, Student } from '../types.ts';
import { LOGO, genId } from '../utils/storage.ts';
import { signInWithEmail, supabase } from '../lib/supabase.ts';
import { syncFromSupabase } from '../utils/supabaseSync.ts';
import { loadDatabase, AppDatabase } from '../utils/storage.ts';
import { ForgotPasswordView } from './ForgotPasswordView.tsx';

interface LoginViewProps {
  students: Student[];
  onLogin: (user: { name: string; role: UserRole; email: string; pw: string; si: string | null }) => void;
  onDbUpdate?: (db: AppDatabase) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ students, onLogin, onDbUpdate }) => {
  const [role, setRole] = useState<UserRole>('s');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  // URL'de type=recovery ile açıldıysa doğrudan şifre sıfırlama ekranı gösterilir
  const [showForgot, setShowForgot] = useState(() => /type=recovery/.test(location.hash));

  if (showForgot) {
    return (
      <ForgotPasswordView
        onBack={() => setShowForgot(false)}
        onDone={() => setShowForgot(false)}
      />
    );
  }

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    
    const em = email.trim().toLowerCase();
    const pw = password;

    if (!em.includes('@')) {
      setErrorMsg('Geçerli bir e-posta yaz.');
      setLoading(false);
      return;
    }
    if (pw.length < 4) {
      setErrorMsg('Şifre en az 4 karakter olmalı.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await signInWithEmail(em, pw);
      
      if (error) {
        setErrorMsg(error.message.includes('Invalid') ? 'E-posta veya şifre hatalı.' : error.message);
        setLoading(false);
        return;
      }
      
      if (!data.user) {
        setErrorMsg('Giriş başarısız.');
        setLoading(false);
        return;
      }
      
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profErr || !profile) {
        setErrorMsg('Profil bilgisi alınamadı.');
        setLoading(false);
        return;
      }
      
      if (!profile.active) {
        setErrorMsg('Hesabın pasif. Öğretmeninle görüş.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      const isTeacher = profile.role === 'teacher' || profile.role === 'admin';
      
      if (role === 's' && isTeacher) {
        setErrorMsg('Bu hesap öğretmen/yönetici. "Öğretmen" sekmesinden gir.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      if (role === 't' && !isTeacher) {
        setErrorMsg('Bu hesap öğrenci. "Öğrenci" sekmesinden gir.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      const currentDb = loadDatabase();
      const newDb = await syncFromSupabase(currentDb);
      if (onDbUpdate) onDbUpdate(newDb);
      
      let sId: string | null = null;
      if (role === 's') {
        const sIdx = newDb.students.findIndex((x) => x.e.toLowerCase() === em);
        if (sIdx < 0) {
          const newStudent: Student = {
            id: genId(),
            n: profile.full_name || em.split('@')[0],
            lv: profile.level || 'A1',
            p: 0,
            a: '',
            c: profile.class_id || '',
            e: em,
            pw: pw,
            h: {},
            goal: 10,
            kn: [],
            must: profile.must_change_password || false,
            off: false,
            tp: [],
            cp: [],
            td: {},
            sd: {},
            nxt: 0,
            tc: 0,
            wl: 0,
            tpass: {},
          };
          newDb.students.push(newStudent);
          sId = newStudent.id;
          if (onDbUpdate) onDbUpdate(newDb);
        } else {
          newDb.students[sIdx] = {
            ...newDb.students[sIdx],
            pw: pw,
            must: profile.must_change_password || false,
            off: !profile.active,
          };
          sId = newDb.students[sIdx].id;
          if (onDbUpdate) onDbUpdate(newDb);
        }
      }
      
      onLogin({
        name: profile.full_name || em.split('@')[0],
        role: role,
        email: em,
        pw: pw,
        si: sId,
      });
    } catch (err) {
      console.error('Login hatası:', err);
      setErrorMsg('Bağlantı hatası. İnternetini kontrol et.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col justify-between">
      <div>
        <div className="text-center pt-2 mb-4">
          <img
            src={LOGO}
            alt="English Base"
            className="w-32 max-w-[42%] h-auto rounded-3xl mx-auto mb-3 shadow-[0_8px_24px_rgba(216,6,33,0.35)] object-contain"
          />
          <h2 className="text-2xl font-bold font-heading text-[var(--pri)] mb-0.5">English Base</h2>
          <p className="text-sm text-[var(--mute)]">Hesabınla giriş yap</p>
        </div>

        <form onSubmit={handleLogin} className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}>
          <div className="flex gap-1.5 mb-3 p-1 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
            <button
              type="button"
              data-r="s"
              aria-pressed={role === 's'}
              onClick={() => { setRole('s'); setErrorMsg(''); }}
              disabled={loading}
              className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                role === 's'
                  ? 'bg-[var(--pri)] text-[var(--onpri)] shadow-sm'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              Öğrenci
            </button>
            <button
              type="button"
              data-r="t"
              aria-pressed={role === 't'}
              onClick={() => { setRole('t'); setErrorMsg(''); }}
              disabled={loading}
              className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                role === 't'
                  ? 'bg-[var(--pri)] text-[var(--onpri)] shadow-sm'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              Öğretmen
            </button>
          </div>

          <label className="block text-xs font-bold mb-2">
            E-posta
            <input
              id="em"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder={role === 's' ? 'elif@ornek.com' : 'ogretmen@englishbase.com'}
              className="w-full mt-1 p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pri)]"
            />
          </label>

          <label className="block text-xs font-bold mb-2">
            Şifre
            <input
              id="pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••"
              className="w-full mt-1 p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pri)]"
            />
          </label>

          {errorMsg && (
            <p id="er" className="text-xs font-bold min-h-6 my-1 text-[var(--bad)]">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            id="ok"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl font-extrabold text-sm transition-all cursor-pointer shadow-md hover:brightness-105 active:scale-98 disabled:opacity-60"
            style={{
              backgroundColor: 'var(--pri)',
              color: 'var(--onpri)',
            }}
          >
            {loading ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>

          <button
            type="button"
            id="fgt"
            onClick={() => setShowForgot(true)}
            disabled={loading}
            className="w-full mt-2 py-2 px-4 rounded-xl font-bold text-xs text-[var(--pri)] underline-offset-2 hover:underline cursor-pointer bg-transparent"
          >
            Şifremi unuttum
          </button>
        </form>

        <p className="text-center text-xs text-[var(--mute)] mt-4">
          Giriş bilgilerinizi öğretmeninizden temin ediniz.
        </p>

        <a
          href="https://wa.me/905518536320"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center rounded-xl py-3 px-4 font-bold text-xs mt-2 no-underline text-[#0B3D1F] bg-[#25D366] hover:brightness-105 active:scale-98 transition-all shadow-sm"
        >
          💬 WhatsApp'tan ulaş
        </a>
      </div>

      <div className="text-[11px] text-[var(--mute)] text-center pt-4 pb-2">
        Made by Ethem AYDIN
      </div>
    </div>
  );
};
