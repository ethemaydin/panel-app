import React, { useState } from 'react';
import { Student, ClassGroup, Topic } from '../types.ts';
import { rate, miss, prog, stv } from '../utils/logic.ts';

interface StudentsViewProps {
  students: Student[];
  classes: ClassGroup[];
  allTopics: Topic[];
  sessions: string[];
  onOpenClassEditor: () => void;
  onSelectStudent: (studentId: string) => void;
  onCreateStudent: (newStudent: Partial<Student>) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  classes,
  allTopics,
  sessions,
  onOpenClassEditor,
  onSelectStudent,
  onCreateStudent,
}) => {
  const [classFilter, setClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newStudentCreatedIndex, setNewStudentCreatedIndex] = useState<number | null>(null);

  // New student form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [classId, setClassId] = useState(classes[0]?.id || 'c1');
  const [level, setLevel] = useState('A1');
  const [errorMsg, setErrorMsg] = useState('');

  const LV = ['A1', 'A2', 'B1', 'B2', 'C1'];

  const handleGeneratePassword = () => {
    setPassword(Math.random().toString(36).slice(2, 8));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const n = name.trim();
    const em = email.trim().toLowerCase();
    const p = password.trim();

    if (!n || !em.includes('@') || p.length < 4) {
      setErrorMsg('Ad, geçerli e-posta ve en az 4 karakterli şifre gerekli.');
      return;
    }
    if (students.some((s) => s.e.toLowerCase() === em)) {
      setErrorMsg('Bu e-posta zaten kayıtlı.');
      return;
    }

    onCreateStudent({
      n,
      e: em,
      pw: p,
      c: classId,
      lv: level,
      goal: 10,
      kn: [],
      must: true,
      p: 0,
      a: '-'.repeat(sessions.length),
      h: {},
      cp: [],
      td: {},
      sd: {},
      nxt: 0,
      tc: 0,
      wl: 0,
      tpass: {},
    });

    setNewStudentCreatedIndex(students.length);
    setName('');
    setEmail('');
    setPassword('');
  };

  const filtered = students.filter((s) => {
    if (classFilter !== 'all' && s.c !== classFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.n.toLowerCase().includes(q) || s.e.toLowerCase().includes(q);
    }
    return true;
  });

  const getClassName = (cid: string) => {
    return (classes.find((c) => c.id === cid) || { n: 'Sınıfsız' }).n;
  };

  const createdStudent =
    newStudentCreatedIndex !== null && students[newStudentCreatedIndex]
      ? students[newStudentCreatedIndex]
      : null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
            Öğrenciler
          </h1>
          <p className="text-xs text-[var(--mute)]">{students.length} kayıtlı öğrenci</p>
        </div>
        <button
          type="button"
          id="ce"
          onClick={onOpenClassEditor}
          className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:border-[var(--pri)] cursor-pointer"
        >
          ⚙️ Sınıflar
        </button>
      </div>

      {/* Created student banner */}
      {createdStudent && (
        <div
          className="p-4 rounded-2xl border-2 border-[var(--ok)] text-xs space-y-1.5 animate-in fade-in"
          style={{ backgroundColor: 'var(--card)' }}
        >
          <b className="text-sm font-extrabold text-[var(--ok)] block">
            ✅ {createdStudent.n} için hesap oluşturuldu
          </b>
          <p className="text-[var(--ink)]">
            E-posta: <b>{createdStudent.e}</b>
            <br />
            Şifre: <b>{createdStudent.pw}</b>
          </p>
          <a
            href={`mailto:${createdStudent.e}?subject=English Base Giriş Bilgilerin&body=Merhaba ${createdStudent.n}, English Base giriş bilgilerin: E-posta: ${createdStudent.e}, Şifre: ${createdStudent.pw}`}
            className="block text-center rounded-xl py-2 px-3 font-bold text-xs mt-2 no-underline text-white bg-[var(--pri)] hover:brightness-105"
          >
            ✉️ Bilgileri e-postayla gönder
          </a>
        </div>
      )}

      {/* Class filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setClassFilter('all')}
          className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
            classFilter === 'all'
              ? 'bg-[var(--pri)] text-[var(--onpri)] border-[var(--pri)] shadow-sm'
              : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink)]'
          }`}
        >
          Tümü ({students.length})
        </button>
        {classes.map((c) => {
          const count = students.filter((s) => s.c === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setClassFilter(c.id)}
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                classFilter === c.id
                  ? 'bg-[var(--pri)] text-[var(--onpri)] border-[var(--pri)] shadow-sm'
                  : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink)]'
              }`}
            >
              {c.n} ({count})
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <input
        id="sq"
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="🔍 Öğrenci ara (ad ya da e-posta)..."
        className="w-full p-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] text-xs font-semibold text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pri)]"
      />

      {/* Students list */}
      <div className="space-y-2">
        {filtered.map((s) => {
          const originalIndex = students.indexOf(s);
          const missed = miss(s);
          const progressPct = prog(s, allTopics);

          return (
            <button
              key={s.id}
              data-i={s.id}
              onClick={() => onSelectStudent(s.id)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:border-[var(--pri)] shadow-sm ${
                s.off ? 'opacity-50' : ''
              }`}
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
            >
              <span
                className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white flex-none ${
                  missed >= 3 ? 'bg-[var(--bad)]' : 'bg-[var(--ok)]'
                }`}
              >
                {s.n[0]}
              </span>
              <div className="flex-1 min-w-0">
                <b className="block text-sm font-bold text-[var(--ink)] truncate">
                  {s.n} {s.off ? '· pasif' : ''}
                </b>
                <span className="text-xs text-[var(--mute)]">
                  {getClassName(s.c)} · İlerleme %{progressPct} · {missed} devamsızlık
                </span>
              </div>
              <span className="text-xs font-bold text-[var(--pri)]">›</span>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div
            className="p-6 rounded-2xl border text-center text-xs text-[var(--mute)] shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            Aramanıza uygun öğrenci bulunamadı.
          </div>
        )}
      </div>

      {/* New Student Registration Form */}
      <div className="pt-2 space-y-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Yeni Öğrenci Hesabı
        </h3>

        <form
          onSubmit={handleCreate}
          className="p-4 rounded-3xl border space-y-2.5 shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          <label className="block text-xs font-bold text-[var(--ink)]">
            Ad Soyad
            <input
              id="ns"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Ahmet Yılmaz"
              className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-semibold text-[var(--ink)]"
            />
          </label>

          <label className="block text-xs font-bold text-[var(--ink)]">
            E-posta
            <input
              id="ne"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ahmet@ornek.com"
              className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-semibold text-[var(--ink)]"
            />
          </label>

          <label className="block text-xs font-bold text-[var(--ink)]">
            Şifre
            <div className="flex gap-2 mt-1">
              <input
                id="npw"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 4 karakter"
                className="flex-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-mono font-bold text-[var(--ink)]"
              />
              <button
                id="gp"
                type="button"
                onClick={handleGeneratePassword}
                className="px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--card)] text-xs font-bold text-[var(--pri)] cursor-pointer hover:bg-[var(--bg)]"
              >
                Oluştur
              </button>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-[var(--ink)]">
              Sınıf
              <select
                id="nl"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.n}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-[var(--ink)]">
              Seviye
              <select
                id="nv"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
              >
                {LV.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {errorMsg && (
            <p id="sm" className="text-xs font-bold text-[var(--bad)] min-h-4">
              {errorMsg}
            </p>
          )}

          <button
            id="as"
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl font-extrabold text-xs text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--pri)' }}
          >
            Hesabı oluştur
          </button>
        </form>
      </div>
    </div>
  );
};
