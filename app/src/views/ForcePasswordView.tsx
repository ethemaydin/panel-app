import React, { useState } from 'react';
import { updatePassword } from '../lib/supabase.ts';

interface ForcePasswordViewProps {
  currentPassword: string;
  onSubmit: (newPw: string) => void;
}

export const ForcePasswordView: React.FC<ForcePasswordViewProps> = ({ currentPassword, onSubmit }) => {
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (newPw.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (newPw !== confirmPw) {
      setError('Şifreler aynı değil.');
      return;
    }
    if (newPw === currentPassword) {
      setError('Yeni şifre eski şifreden farklı olmalı.');
      return;
    }

    setLoading(true);
    try {
      // Supabase Auth ile şifre değiştir
      const { error: authError } = await updatePassword(newPw);
      
      if (authError) {
        setError(authError.message || 'Şifre değiştirilemedi.');
        setLoading(false);
        return;
      }

      // Local state'i güncelle
      onSubmit(newPw);
    } catch (err) {
      setError('Bağlantı hatası. Tekrar dene.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔐</div>
          <h2 className="text-xl font-bold text-[var(--ink)]">Yeni şifre belirle</h2>
          <p className="text-sm text-[var(--mute)] mt-1">
            Hesabının güvenliği için yeni bir şifre oluşturmalısın.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-2xl border shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          <label className="block text-xs font-bold mb-2">
            Yeni şifre
            <input
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              disabled={loading}
              placeholder="En az 6 karakter"
              className="w-full mt-1 p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pri)]"
            />
          </label>

          <label className="block text-xs font-bold mb-2">
            Şifreyi tekrar yaz
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              disabled={loading}
              placeholder="Aynı şifreyi tekrar yaz"
              className="w-full mt-1 p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pri)]"
            />
          </label>

          {error && (
            <p className="text-xs font-bold text-[var(--bad)] min-h-6 my-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl font-extrabold text-sm transition-all cursor-pointer shadow-md hover:brightness-105 active:scale-98 disabled:opacity-60"
            style={{ backgroundColor: 'var(--pri)', color: 'var(--onpri)' }}
          >
            {loading ? 'Kaydediliyor…' : 'Şifreyi kaydet'}
          </button>
        </form>
      </div>
    </div>
  );
};
