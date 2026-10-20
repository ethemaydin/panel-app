import React, { useState } from 'react';
import { Student, ClassGroup, Topic, WordItem } from '../types.ts';
import { rate, miss, prog, stv, pzInit } from '../utils/logic.ts';
import { invokeAdminUsers } from '../lib/supabase.ts';
import { loadIdMap } from '../utils/supabaseSync.ts';

interface StudentDetailViewProps {
  student: Student;
  classes: ClassGroup[];
  allTopics: Topic[];
  allWords: WordItem[];
  sessions: string[];
  onBack: () => void;
  onUpdateStudent: (updated: Student) => void;
}

export const StudentDetailView: React.FC<StudentDetailViewProps> = ({
  student,
  classes,
  allTopics,
  allWords,
  sessions,
  onBack,
  onUpdateStudent,
}) => {
  const [name, setName] = useState(student.n);
  const [email, setEmail] = useState(student.e);
  const [newPassword, setNewPassword] = useState('');
  const [pwFeedback, setPwFeedback] = useState('');
  const [infoFeedback, setInfoFeedback] = useState('');

  pzInit(student);
  const LV = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const LBL: Record<string, string> = { g: 'Geldi', y: 'Yok', i: 'İzinli' };

  const currentClass = classes.find((c) => c.id === student.c)?.n || 'Sınıfsız';
  const attendanceRate = rate(student);
  const missedCount = miss(student);
  const progressPct = prog(student, allTopics);
  const levelWords = allWords.filter((w) => w.lv === student.lv);
  const visibleTopicIds = stv(student, allTopics);

  const handleLevelChange = (newLv: string) => {
    onUpdateStudent({
      ...student,
      lv: newLv,
      tp: undefined, // reset to default for level
    });
    // Panel SQL uyumu: seviye değişikliği Supabase profiles.level'e de yazılmalı.
    // Doğrudan profiles UPDATE yerine Edge Function "update_student" kullanılır;
    // protect_profile tetikleyicisi + RLS (students.edit yetkisi) doğrudan yazmayı reddeder.
    void pushProfileUpdate({ level: newLv });
  };

  const handleClassChange = (newCid: string) => {
    onUpdateStudent({
      ...student,
      c: newCid,
    });
    // Sınıf değişikliği paneldaki stats/kapsam hesaplarını etkiler → profiles.class_id güncelle.
    // Edge function tarafı students.move yetkisini ve hedef sınıf kapsamını sunucuda doğrular.
    void pushProfileUpdate({ class_id: newCid || null });
  };

  /**
   * Öğrencinin profil alanlarını Supabase'e Edge Function (admin-users / update_student)
   * üzerinden gönderir. Panelden gelen uuid eşlemesi yoksa (öğrenci henüz Supabase hesabı
   * değilse) sessizce geçer — lokal veritabanı tek kaynak olmaya devam eder.
   */
  const pushProfileUpdate = async (fields: Record<string, unknown>) => {
    try {
      const map = loadIdMap();
      const uuid = Object.keys(map.students).find((u) => map.students[u] === student.id);
      if (!uuid) return;
      const res = await invokeAdminUsers({ action: 'update_student', user_id: uuid, ...fields });
      if (res.error) setInfoFeedback(`Panele yansıtılamadı: ${res.error}`);
    } catch {
      /* çevrimdışı: lokal kayıt zaten yapıldı */
    }
  };

  const toggleTopicPermission = (topicId: string, checked: boolean) => {
    const cur = stv(student, allTopics);
    const updated = checked
      ? Array.from(new Set([...cur, topicId]))
      : cur.filter((id) => id !== topicId);
    onUpdateStudent({
      ...student,
      tp: updated,
    });
  };

  const handleSaveInfo = () => {
    const n = name.trim();
    const e = email.trim().toLowerCase();
    if (!n || !e.includes('@')) {
      setInfoFeedback('Geçerli bir ad ve e-posta yazınız.');
      return;
    }
    const emailChanged = e !== String(student.e || '').toLowerCase();
    onUpdateStudent({
      ...student,
      n,
      e,
    });
    // Panel SQL uyumu: profiles.full_name doğrudan UPDATE edilemez (protect_profile + RLS).
    // Ad için Edge Function "update_student", e-posta değişikliği için "update_email" kullanılır.
    (async () => {
      const map = loadIdMap();
      const uuid = Object.keys(map.students).find((u) => map.students[u] === student.id);
      if (!uuid) return; // öğrencinin Supabase hesabı yok — yalnızca lokal kayıt
      const res = await invokeAdminUsers({ action: 'update_student', user_id: uuid, full_name: n });
      if (res.error) {
        setInfoFeedback(`Panele yansıtılamadı: ${res.error}`);
        return;
      }
      if (emailChanged) {
        const r2 = await invokeAdminUsers({ action: 'update_email', user_id: uuid, email: e });
        if (r2.error) setInfoFeedback(`E-posta panele işlenemedi: ${r2.error}`);
      }
    })().catch(() => {});
    setInfoFeedback('Bilgiler kaydedildi ✓');
    setTimeout(() => setInfoFeedback(''), 3000);
  };

  const handleUpdatePassword = () => {
    const p = newPassword.trim();
    // Edge Function (admin-users / set_password) en az 6 karakter ister; app de aynı
    // sınırı uygulamazsa sunucu isteği reddeder ve şifre-şifre uyumsuzluğu oluşurdu.
    if (p.length < 6) {
      setPwFeedback('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    onUpdateStudent({
      ...student,
      pw: p,
      must: true,
    });
    // Supabase tarafında şifreyi yalnızca Edge Function değiştirir (auth.admin);
    // ayrıca protect_profile nedeniyle must_change_password'u app'ten yazamayız —
    // fonksiyonun set_password kolu bu bayrağı service role ile kendisi ayarlar.
    (async () => {
      const map = loadIdMap();
      const uuid = Object.keys(map.students).find((u) => map.students[u] === student.id);
      if (!uuid) return;
      const res = await invokeAdminUsers({ action: 'set_password', user_id: uuid, password: p });
      if (res.error) setPwFeedback(`Supabase'e işlenemedi: ${res.error}`);
    })().catch(() => {});
    setNewPassword('');
    setPwFeedback('Şifre güncellendi ✓');
    setTimeout(() => setPwFeedback(''), 3000);
  };

  const handleToggleActive = () => {
    const nowOff = !student.off;
    onUpdateStudent({
      ...student,
      off: nowOff,
    });
    // Panel SQL: profiles.active yalnızca students.deactivate yetkisiyle değişir;
    // auth kullanıcısının banlanması da Edge Function (set_active) tarafında yapılır.
    (async () => {
      const map = loadIdMap();
      const uuid = Object.keys(map.students).find((u) => map.students[u] === student.id);
      if (!uuid) return;
      const res = await invokeAdminUsers({ action: 'set_active', user_id: uuid, active: !nowOff });
      if (res.error) setInfoFeedback(`Pasife alma panele işlenemedi: ${res.error}`);
    })().catch(() => {});
  };

  const mailLink = `mailto:${student.e}?subject=English Base Giriş Bilgilerin&body=Merhaba ${student.n}, English Base giriş bilgilerin: E-posta: ${student.e}, Şifre: ${student.pw}`;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <button
        id="b"
        onClick={onBack}
        className="font-bold text-xs text-[var(--pri)] cursor-pointer flex items-center gap-1 hover:underline"
      >
        ‹ Öğrenciler
      </button>

      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          {student.n}
        </h1>
        <p className="text-xs text-[var(--mute)]">
          {currentClass} · {student.lv} Seviyesi
        </p>
      </div>

      {/* Progress & Attendance Card */}
      <div
        className="p-4 rounded-3xl border space-y-3 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <div>
          <div className="flex justify-between text-xs font-bold text-[var(--ink)] mb-1">
            <span>Konu İlerlemesi</span>
            <span>%{progressPct}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden">
            <div
              className="h-full bg-[var(--pri)] rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-bold text-[var(--ink)] mb-1">
            <span>Katılım Durumu</span>
            <span>
              %{attendanceRate} ({missedCount} devamsızlık)
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden">
            <div
              className="h-full bg-[var(--ok)] rounded-full transition-all duration-300"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Attendance History Chips */}
      <div className="space-y-1">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Yoklama Geçmişi
        </h3>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[...student.a].map((c, k) => {
            if (c === '-') return null;
            let chipColor = 'bg-[var(--line)] text-[var(--mute)]';
            if (c === 'g') chipColor = 'bg-[var(--okbg)] text-[var(--ok)] font-extrabold';
            if (c === 'y') chipColor = 'bg-[var(--badbg)] text-[var(--bad)] font-extrabold';

            return (
              <span
                key={k}
                className={`inline-flex flex-col items-center px-2 py-1 rounded-xl text-xs shadow-sm border border-[var(--line)] ${chipColor}`}
              >
                <span>{LBL[c] || c}</span>
                <small className="text-[10px] opacity-75 font-mono">
                  {sessions[k] || `Ders ${k + 1}`}
                </small>
              </span>
            );
          })}
        </div>
      </div>

      {/* Summary Box */}
      <div
        className="p-4 rounded-2xl border text-xs leading-relaxed space-y-1 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <b className="text-[var(--ink)] block mb-1">Özet İstatistikler</b>
        <div>📘 Konu: {Object.keys(student.td || {}).length} tamamlandı (%{progressPct})</div>
        <div>🔤 Kelime: {(student.kn || []).length}/{levelWords.length} ezberlendi</div>
        <div>🧪 Başarılı test: {student.tc || 0} adet</div>
        <div>🧩 Yapboz: {student.cp.length} tamamlandı</div>
      </div>

      {/* Level Selector */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-[var(--ink)]">
          Seviye
          <select
            id="sl"
            value={student.lv}
            onChange={(e) => handleLevelChange(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] text-xs font-bold text-[var(--ink)] cursor-pointer"
          >
            {LV.map((l) => (
              <option key={l} value={l}>
                {l} Seviyesi
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Class Selector */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-[var(--ink)]">
          Sınıf
          <select
            id="sc"
            value={student.c}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] text-xs font-bold text-[var(--ink)] cursor-pointer"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Visible Topics Toggles */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Görebildiği Konular
        </h3>
        <div
          className="p-3.5 rounded-2xl border space-y-2 shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          {allTopics.map((t) => (
            <label
              key={t.id}
              className="flex items-center justify-between py-1 text-xs font-bold cursor-pointer hover:opacity-80"
            >
              <span>
                {t.ic} {t.t}{' '}
                <small className="text-[var(--mute)]">({t.lv || 'A1'})</small>
              </span>
              <input
                type="checkbox"
                data-tp={t.id}
                checked={visibleTopicIds.includes(t.id)}
                onChange={(e) => toggleTopicPermission(t.id, e.target.checked)}
                className="w-4 h-4 accent-[var(--pri)] rounded cursor-pointer"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Account Info & Password Reset */}
      <div
        className="p-4 rounded-3xl border space-y-3 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <b className="text-xs font-bold text-[var(--ink)] block">
          Hesap Bilgileri
        </b>

        <label className="block text-xs font-bold text-[var(--ink)]">
          Ad Soyad
          <input
            id="sn"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-semibold text-[var(--ink)]"
          />
        </label>

        <label className="block text-xs font-bold text-[var(--ink)]">
          E-posta
          <input
            id="se"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-semibold text-[var(--ink)]"
          />
        </label>

        {infoFeedback && (
          <p className="text-xs font-bold text-[var(--ok)]">{infoFeedback}</p>
        )}

        <button
          type="button"
          id="ss"
          onClick={handleSaveInfo}
          className="w-full py-2.5 px-3 rounded-xl border border-[var(--line)] text-xs font-bold text-[var(--ink)] hover:bg-[var(--bg)] cursor-pointer"
        >
          Ad ve e-postayı kaydet
        </button>

        <div className="pt-2 border-t border-[var(--line)]">
          <div className="text-xs text-[var(--mute)]">Mevcut Şifre:</div>
          <div className="text-sm font-mono font-bold text-[var(--ink)] mb-2">
            {student.pw}
          </div>

          <label className="block text-xs font-bold text-[var(--ink)]">
            Yeni şifre belirle
            <input
              id="rp"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 4 karakter"
              className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-mono font-bold text-[var(--ink)]"
            />
          </label>

          {pwFeedback && (
            <p id="rm" className="text-xs font-bold text-[var(--ok)] mt-1">
              {pwFeedback}
            </p>
          )}

          <button
            type="button"
            id="rs"
            onClick={handleUpdatePassword}
            className="w-full mt-2 py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-[var(--pri)] hover:brightness-105 cursor-pointer"
          >
            Şifreyi değiştir
          </button>
        </div>

        <button
          type="button"
          id="sf"
          onClick={handleToggleActive}
          className={`w-full py-2.5 px-3 rounded-xl border font-bold text-xs cursor-pointer ${
            student.off
              ? 'border-[var(--ok)] text-[var(--ok)]'
              : 'border-[var(--bad)] text-[var(--bad)]'
          }`}
        >
          {student.off ? 'Hesabı aktifleştir' : 'Hesabı pasife al'}
        </button>
      </div>

      <a
        href={mailLink}
        className="block text-center rounded-2xl py-3.5 px-4 font-bold text-xs text-white bg-[var(--pri)] hover:brightness-105 shadow-sm no-underline"
      >
        ✉️ Bilgileri e-postayla gönder
      </a>
    </div>
  );
};
