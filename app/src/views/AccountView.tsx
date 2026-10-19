import React, { useState } from 'react';
import { User, Student, ClassGroup } from '../types.ts';
import { pzInit, pn, psize } from '../utils/logic.ts';
import { uri, getPuzzlePieceStyles } from '../utils/puzzle.ts';

interface AccountViewProps {
  user: User;
  students: Student[];
  classes: ClassGroup[];
  theme: 'auto' | 'light' | 'dark';
  onUpdateUser: (updatedUser: Partial<User>) => void;
  onUpdateStudentAvatar: (avatar: any) => void;
  onSetTheme: (theme: 'auto' | 'light' | 'dark') => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  user,
  students,
  classes,
  theme,
  onUpdateUser,
  onUpdateStudentAvatar,
  onSetTheme,
  onLogout,
  onDeleteAccount,
}) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');
  const [infoFeedback, setInfoFeedback] = useState('');

  const [p0, setP0] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [pwFeedback, setPwFeedback] = useState<{ isOk: boolean; text: string } | null>(null);

  const [notifPreferences, setNotifPreferences] = useState(user.nf);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const student = user.role === 's' && user.si ? students.find((s) => s.id === user.si) : null;
  if (student) pzInit(student);

  const AV = ['🙂', '😎', '🦊', '🐼', '🦉', '🌸', '🌙', '⭐', '🎧', '📚'];
  const AC = ['#D80621', '#E85D9B', '#2BB6A3', '#F0A04B', '#4C8DF6', '#8A6F5B'];

  const studentClass = student
    ? (classes.find((c) => c.id === student.c)?.n || 'Sınıfsız')
    : '';

  const avatar = student?.av || {};

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setInfoFeedback('');
    const n = name.trim();
    const em = email.trim();

    if (!n) {
      setInfoFeedback('Adınızı yazınız.');
      return;
    }
    if (!em.includes('@')) {
      setInfoFeedback('Geçerli bir e-posta yazınız.');
      return;
    }

    onUpdateUser({
      name: n,
      email: em,
      phone: phone.trim(),
    });

    setInfoFeedback('Bilgileriniz kaydedildi ✓');
    setTimeout(() => setInfoFeedback(''), 3000);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwFeedback(null);

    if (p0 !== user.pw) {
      setPwFeedback({ isOk: false, text: 'Mevcut şifre yanlış.' });
      return;
    }
    if (p1.length < 4) {
      setPwFeedback({ isOk: false, text: 'Yeni şifre en az 4 karakter olmalı.' });
      return;
    }
    if (p1 !== p2) {
      setPwFeedback({ isOk: false, text: 'Yeni şifreler birbiriyle uyuşmuyor.' });
      return;
    }

    onUpdateUser({ pw: p1 });
    setP0('');
    setP1('');
    setP2('');
    setPwFeedback({ isOk: true, text: 'Şifreniz güncellendi ✓' });
    setTimeout(() => setPwFeedback(null), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateStudentAvatar({ ...avatar, img: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  // Puzzle leaderboard
  const rankList = [...students].sort(
    (a, b) => b.cp.length - a.cp.length || students.indexOf(a) - students.indexOf(b)
  );
  const myRank = student ? rankList.indexOf(student) + 1 : 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          Hesap Ayarları
        </h1>
        <p className="text-xs text-[var(--mute)]">
          Profil, yapboz koleksiyonu ve güvenlik ayarların
        </p>
      </div>

      {/* User profile card */}
      <div
        className="p-4 rounded-3xl border shadow-sm flex items-center gap-3.5"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        {avatar.img ? (
          <img
            src={avatar.img}
            alt=""
            className="w-14 h-14 rounded-full object-cover shadow-sm border border-[var(--line)] flex-none"
          />
        ) : (
          <span
            className="w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-white text-2xl shadow-sm flex-none"
            style={{ backgroundColor: avatar.col || '#D80621' }}
          >
            {avatar.emo || user.name[0]}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <b className="text-base font-extrabold text-[var(--ink)] block truncate">
            {user.name}
          </b>
          <span className="text-xs text-[var(--mute)] block truncate">
            {user.email}
          </span>
          <span className="inline-block mt-1 bg-[var(--sun)] text-[#14213D] rounded-full px-2 py-0.5 text-[10px] font-extrabold">
            {user.role === 't' ? 'Öğretmen' : `Öğrenci · ${studentClass}`}
          </span>
        </div>
      </div>

      {/* Student: Avatar selector & Puzzle collection */}
      {student && (
        <>
          {/* Avatar selector */}
          <div
            className="p-4 rounded-3xl border space-y-3 shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
              Profil Simgesi
            </h3>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] cursor-pointer hover:border-[var(--pri)]">
                📷 Fotoğraf yükle
                <input
                  id="pf"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {avatar.img && (
                <button
                  type="button"
                  id="pr"
                  onClick={() => onUpdateStudentAvatar({ ...avatar, img: null })}
                  className="text-xs font-bold text-[var(--bad)] cursor-pointer hover:underline"
                >
                  Kaldır
                </button>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[var(--mute)]">
                Emoji seç:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {AV.map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    data-em={emo}
                    onClick={() => onUpdateStudentAvatar({ ...avatar, emo, img: null })}
                    className="w-9 h-9 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-base flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[var(--mute)]">
                Arka plan rengi:
              </span>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {AC.map((c) => (
                  <button
                    key={c}
                    type="button"
                    data-co={c}
                    onClick={() => onUpdateStudentAvatar({ ...avatar, col: c })}
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Puzzle Collection & Leaderboard */}
          <div
            className="p-4 rounded-3xl border space-y-3 shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider flex justify-between items-center">
              <span>🧩 Yapbozlarım</span>
              <span className="text-[var(--pri)]">Toplam: {student.cp.length}</span>
            </h3>

            {student.act ? (
              <div className="space-y-1.5">
                <b className="text-xs text-[var(--ink)] block">
                  {pn(student.act.id)}
                </b>
                <p className="text-[11px] text-[var(--mute)]">
                  {student.act.n}/{psize(student.act.id)} parça · Her 5 başarılı test ve 10 yeni kelime 1 parça kazandırır
                </p>

                <div
                  className="grid gap-1 rounded-2xl overflow-hidden w-full aspect-[5/3] my-2 border border-[var(--line)] shadow-inner"
                  style={{
                    gridTemplateColumns: `repeat(${psize(student.act.id) === 4 ? 2 : 5}, 1fr)`,
                  }}
                >
                  {Array.from({ length: psize(student.act.id) }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-full h-full"
                      style={getPuzzlePieceStyles(student.act!.id, idx, idx < student.act!.n)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--mute)]">
                Yeni yapboz ilk başarınla otomatik başlar.
              </p>
            )}

            {student.cp.length > 0 && (
              <div className="pt-2 border-t border-[var(--line)]">
                <span className="text-xs font-bold text-[var(--ink)] block mb-1.5">
                  Tamamlanan Koleksiyon ({student.cp.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {student.cp.slice(-12).map((pid: number) => (
                    <img
                      key={pid}
                      src={uri(pid)}
                      alt={pn(pid)}
                      title={pn(pid)}
                      className="w-18 h-12 rounded-lg object-cover border border-[var(--line)] shadow-sm"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div className="pt-2 border-t border-[var(--line)] space-y-1.5">
              <span className="text-xs font-bold text-[var(--ink)] block">
                🏆 En Çok Yapboz Bitirenler
              </span>
              <div className="space-y-1">
                {rankList.slice(0, 5).map((s, idx) => {
                  const isMe = s === student;
                  return (
                    <div
                      key={s.e}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs ${
                        isMe ? 'bg-[var(--bg)] font-extrabold border border-[var(--line)]' : ''
                      }`}
                    >
                      <span className="font-mono font-bold w-4">{idx + 1}</span>
                      <span className="w-6 h-6 rounded-full bg-[var(--pri)] text-white text-[10px] font-bold flex items-center justify-center flex-none">
                        {s.n[0]}
                      </span>
                      <span className="flex-1 truncate">
                        {isMe ? 'Sen' : s.n.split(' ')[0]}
                      </span>
                      <span className="text-[var(--pri)] font-extrabold">
                        {s.cp.length} 🧩
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-[var(--mute)] text-center pt-1 font-semibold">
                Sıralamada {myRank}. sıradasın
              </p>
            </div>
          </div>
        </>
      )}

      {/* Account Info Form */}
      <form
        onSubmit={handleSaveInfo}
        className="p-4 rounded-3xl border space-y-3 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Bilgilerim
        </h3>

        <label className="block text-xs font-bold text-[var(--ink)]">
          Ad Soyad
          <input
            id="an"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] font-semibold"
          />
        </label>

        <label className="block text-xs font-bold text-[var(--ink)]">
          E-posta
          <input
            id="ae"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] font-semibold"
          />
        </label>

        <label className="block text-xs font-bold text-[var(--ink)]">
          Telefon
          <input
            id="ap"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05xx xxx xx xx"
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
          />
        </label>

        {infoFeedback && (
          <p id="m1" className="text-xs font-bold text-[var(--ok)]">
            {infoFeedback}
          </p>
        )}

        <button
          id="s1"
          type="submit"
          className="w-full py-3 px-4 rounded-xl font-extrabold text-xs text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
          style={{ backgroundColor: 'var(--pri)' }}
        >
          Bilgileri kaydet
        </button>
      </form>

      {/* Change Password Form */}
      <form
        onSubmit={handleUpdatePassword}
        className="p-4 rounded-3xl border space-y-3 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Şifre Değiştir
        </h3>

        <label className="block text-xs font-bold text-[var(--ink)]">
          Mevcut şifre
          <input
            id="p0"
            type="password"
            autoComplete="current-password"
            value={p0}
            onChange={(e) => setP0(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-mono text-[var(--ink)]"
          />
        </label>

        <label className="block text-xs font-bold text-[var(--ink)]">
          Yeni şifre
          <input
            id="p1"
            type="password"
            autoComplete="new-password"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-mono text-[var(--ink)]"
          />
        </label>

        <label className="block text-xs font-bold text-[var(--ink)]">
          Yeni şifre (tekrar)
          <input
            id="p2"
            type="password"
            autoComplete="new-password"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-mono text-[var(--ink)]"
          />
        </label>

        {pwFeedback && (
          <p
            id="m2"
            className={`text-xs font-bold ${
              pwFeedback.isOk ? 'text-[var(--ok)]' : 'text-[var(--bad)]'
            }`}
          >
            {pwFeedback.text}
          </p>
        )}

        <button
          id="s2"
          type="submit"
          className="w-full py-3 px-4 rounded-xl border border-[var(--line)] font-bold text-xs shadow-sm hover:bg-[var(--line)]/30 active:scale-98 transition-all cursor-pointer"
          style={{ backgroundColor: 'var(--card)', color: 'var(--ink)' }}
        >
          Şifreyi güncelle
        </button>
      </form>

      {/* Notifications Preferences */}
      <div
        className="p-4 rounded-3xl border space-y-2 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider mb-2">
          Bildirim Tercihleri
        </h3>

        {[
          { key: 'lesson', label: 'Ders hatırlatması (30 dk ve 10 dk önce)' },
          { key: 'hw', label: 'Yeni ödev verildiğinde' },
          { key: 'news', label: 'Genel duyurular' },
        ].map((item) => (
          <label
            key={item.key}
            className="flex items-center justify-between py-1 text-xs font-bold cursor-pointer hover:opacity-85"
          >
            <span>{item.label}</span>
            <input
              type="checkbox"
              data-k={item.key}
              checked={(notifPreferences as any)[item.key] ?? true}
              onChange={(e) => {
                const updated = {
                  ...notifPreferences,
                  [item.key]: e.target.checked,
                };
                setNotifPreferences(updated);
                onUpdateUser({ nf: updated });
              }}
              className="w-4 h-4 accent-[var(--pri)] rounded cursor-pointer"
            />
          </label>
        ))}
      </div>

      {/* Appearance / Theme */}
      <div
        className="p-4 rounded-3xl border space-y-2 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider mb-2">
          Görünüm Modu
        </h3>

        <div
          id="th"
          className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg)] border border-[var(--line)]"
        >
          {[
            { id: 'auto', label: 'Otomatik' },
            { id: 'light', label: 'Açık' },
            { id: 'dark', label: 'Koyu' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              data-t={item.id}
              aria-pressed={theme === item.id}
              onClick={() => onSetTheme(item.id as any)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                theme === item.id
                  ? 'bg-[var(--pri)] text-[var(--onpri)] shadow-sm'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logout & Delete */}
      <div className="space-y-2 pt-2">
        <button
          id="lg"
          onClick={onLogout}
          className="w-full py-3.5 px-4 rounded-2xl border border-[var(--line)] font-bold text-xs shadow-sm hover:bg-[var(--line)]/30 active:scale-98 transition-all cursor-pointer"
          style={{ backgroundColor: 'var(--card)', color: 'var(--ink)' }}
        >
          Çıkış yap
        </button>

        <button
          id="dl"
          onClick={() => {
            if (!deleteConfirm) {
              setDeleteConfirm(true);
              return;
            }
            onDeleteAccount();
          }}
          className="w-full text-center py-2 text-xs font-bold text-[var(--bad)] cursor-pointer hover:underline"
        >
          {deleteConfirm ? 'Emin misiniz? Silmek için tekrar basınız.' : 'Hesabımı sil'}
        </button>
      </div>
    </div>
  );
};
