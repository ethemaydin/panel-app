import type { Student, Homework, Question, Topic, StudentProgress } from '../types.ts';

export const shuf = <T>(a: T[]): T[] => {
  // Fisher–Yates: uniform karıştırma (sort+Math.random dağılımı bozuyordu)
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

/** Tekrar eden seçenekleri temizler (kelime testlerinde çift şık oluşmasını önler). */
export const dedupeOptions = (opts: string[]): string[] => Array.from(new Set(opts.map((o) => o.trim())));

export const ans = (q: Question): string => {
  if (q.k === 'listen') return q.s;
  if (q.k === 'mc') return q.c || (q.a !== undefined ? q.o[q.a] : q.o[0]);
  if (q.k === 'fill') return Array.isArray(q.a) ? q.a[0] : q.a;
  if (q.k === 'order') return q.w.join(' ');
  return '';
};

export const rate = (s: Student): number => {
  const A = [...(s.a || '')].filter((c) => c !== '-');
  // Hiç yoklama alınmadıysa %100 yanıltıcıdır; 0 döner.
  return A.length ? Math.round((A.filter((c) => c !== 'y').length / A.length) * 100) : 0;
};

export const miss = (s: Student): number => {
  return [...s.a].filter((c) => c === 'y').length;
};

export const hwRecord = (h: Homework, s: Student): StudentProgress => {
  // Tamamen saf: öğrenci nesnesini asla mutlemez (React state bozulmasını önler).
  return s.h?.[h.id] || { score: null, text: '' };
};

/** @deprecated Eski çağrılarla uyumluluk — artık saf sürüm. */
export const hs = hwRecord;

/** Bir öğrencinin belirli bir ödev kaydını (varsa) güvenli biçimde günceller; yeni student nesnesi döner. */
export const setHwRecord = (
  s: Student,
  hwId: number,
  patch: Partial<StudentProgress>
): Student => {
  const cur = s.h?.[hwId] || { score: null, text: '' };
  return { ...s, h: { ...(s.h || {}), [hwId]: { ...cur, ...patch } } };
};

/** Ödev teslim tarihi için "yakın" değeri döner (ISO 'YYYY-MM-DD' ya da serbest metin). */
export const dueSortKey = (due: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) return due;
  const map: Record<string, string> = {
    bugün: iso(new Date()),
    'today': iso(new Date()),
    yarın: iso(new Date(Date.now() + 86400000)),
    tomorrow: iso(new Date(Date.now() + 86400000)),
  };
  const k = (due || '').trim().toLowerCase();
  return map[k] || '9999-12-31';
};

/** Teslim tarihini görüntülenebilir çevirir. */
export const fmtDue = (due: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return due;
  const trMonths = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const [y, m, d] = due.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(target) - startOf(now)) / 86400000);
  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Yarın';
  if (diffDays < 0) return `Geçti (${d} ${trMonths[m - 1]} ${y})`;
  return `${d} ${trMonths[m - 1]} ${y}`;
};

export const hwDone = (h: Homework, s: Student): boolean => {
  const r = hwRecord(h, s);
  if (h.type === 'write') return !!r.text;
  // Test ödevlerinde soru yoksa "tamamlandı" sayılamaz ama görünür olmalı;
  // ex tipinde konu soruları kullanılır.
  const passScore = h.type === 'ex' ? 60 : h.pass != null ? h.pass : 60;
  return r.score != null && r.score >= passScore;
};

/** Ödevin türüne göre öğrenciye görünürlük filtresi (|| true bug'ı kaldırıldı). */
export const isHwVisible = (h: Homework, s: Student): boolean => {
  if (!h.to || h.to.length === 0) return true; // hedefsiz ödev = herkese açık
  return h.to.includes(s.id);
};

export const psize = (id: number): number => (id <= 10 ? 4 : 10);

export const pn = (id: number): string => {
  const prefixes = ['Sakin', 'Loş', 'Sessiz', 'Yumuşak', 'Derin', 'Bulutlu', 'Gizemli', 'Dingin'];
  const suffixes = ['Gece', 'Vadi', 'Deniz', 'Dağlar', 'Göl', 'Şafak', 'Orman', 'Ufuk'];
  const prefix = prefixes[id % 8];
  const suffix = suffixes[(id * 3 + Math.floor(id / 8)) % 8];
  return `${prefix} ${suffix} #${id}`;
};

export const today = (): string => new Date().toDateString();

export const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const pzInit = (s: Student): void => {
  s.cp = s.cp || [];
  s.td = s.td || {};
  s.sd = s.sd || {};
  s.kn = s.kn || [];
  s.h = s.h || {};
  s.a = s.a ?? '';
  s.tp = s.tp || undefined;
  s.nxt = s.nxt || s.cp.length;
  s.tc = s.tc || 0;
  s.wl = s.wl || 0;
  s.tpass = s.tpass || {};
};

/** Bir topic'i her alanı dolu olacak şekilde normalleştirir (eksik veri → çökme olmaz). */
export const normTopic = (t: any): Topic => ({
  ...(t as Topic),
  ic: t?.ic || '📘',
  t: t?.t || 'Konu',
  d: t?.d || '',
  exp: t?.exp || '',
  lv: t?.lv || 'A1',
  ex: Array.isArray(t?.ex) ? t.ex : [],
  words: Array.isArray(t?.words) ? t.words : [],
  q: Array.isArray(t?.q) ? t.q : [],
  subs: Array.isArray(t?.subs) ? t.subs : [],
});

/** Öğrenciyi tüm zorunlu alanlarla normalize eder (Supabase/eski kayıt kaynaklı eksikleri kapatır). */
export const normStudent = (s: any): Student => ({
  ...(s as Student),
  id: s?.id || genIdSafe(),
  n: s?.n || 'Öğrenci',
  a: typeof s?.a === 'string' ? s.a : '',
  h: s?.h && typeof s.h === 'object' ? s.h : {},
  kn: Array.isArray(s?.kn) ? s.kn : [],
  cp: Array.isArray(s?.cp) ? s.cp : [],
  td: s?.td && typeof s.td === 'object' ? s.td : {},
  sd: s?.sd && typeof s.sd === 'object' ? s.sd : {},
  tpass: s?.tpass && typeof s.tpass === 'object' ? s.tpass : {},
  nxt: Number(s?.nxt) || 0,
  tc: Number(s?.tc) || 0,
  wl: Number(s?.wl) || 0,
  goal: Number(s?.goal) || 10,
  p: Number(s?.p) || 0,
});

const genIdSafe = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const wstat = (s: Student): { d: string; n: number } => {
  if (!s.day || s.day.d !== today()) {
    s.day = { d: today(), n: 0 };
  }
  return s.day;
};

export const okDate = (x: { from?: string; until?: string }): boolean => {
  const d = iso(new Date());
  return (!x.from || x.from <= d) && (!x.until || d <= x.until);
};

export const stv = (s: Student, allTopics: Topic[]): string[] => {
  return s.tp || allTopics.filter((t) => t.lv === s.lv).map((t) => t.id);
};

export const prog = (s: Student, allTopics: Topic[]): number => {
  pzInit(s);
  const v = allTopics.filter((t) => stv(s, allTopics).includes(t.id) && okDate(t));
  return v.length ? Math.round((v.filter((t) => s.td[t.id]).length / v.length) * 100) : 0;
};

export const hsh = (s: string): number => {
  let h = 2166136261;
  for (const c of String(s)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const esc = (s: unknown): string => {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// ---------- Puan / Seviye / Seri (English Base özgün eklentileri) ----------

/** Bir sınav sonucundan kazanılan puan: %60 altı = 0, üstü = isabet sayısı × 5. */
export const quizPoints = (score: number, total: number): number => {
  if (total <= 0) return 0;
  const pct = Math.round((score / total) * 100);
  return pct >= 60 ? score * 5 : 0;
};

/** Seviye başına gereken puan (artan maliyetli ilerleme eğrisi). */
export const LEVEL_STEP = 150;

export interface LevelInfo {
  points: number;
  level: number;
  intoLevel: number; // içinde bulunulan seviyede toplanan puan
  needed: number; // bir sonraki seviye için gereken toplam
  pct: number; // 0-100 (level barı)
}

export const lvl = (p: number): LevelInfo => {
  const pts = Math.max(0, Math.floor(Number(p) || 0));
  const level = Math.floor(pts / LEVEL_STEP) + 1;
  const intoLevel = pts % LEVEL_STEP;
  return {
    points: pts,
    level,
    intoLevel,
    needed: LEVEL_STEP,
    pct: Math.round((intoLevel / LEVEL_STEP) * 100),
  };
};

/** Ardışık gün sayısı (en sondan itibaren). Gün ISO 'YYYY-MM-DD' stringleri listesi. */
export const computeStreak = (days: string[], todayIsoStr?: string): number => {
  const set = new Set(days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)));
  if (!set.size) return 0;
  let cursor = new Date(todayIsoStr ? todayIsoStr + 'T00:00:00' : Date.now());
  // Bugün çalışılmadıysa dünden başla (seri henüz bozulmuş sayılmaz).
  if (!set.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (set.has(iso(cursor))) {
    n++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
};

/** Quiz bitişinde verilecek yıldız (0-3). */
export const starsFor = (pct: number): number => (pct >= 90 ? 3 : pct >= 75 ? 2 : pct >= 60 ? 1 : 0);

/** Rozet tanımları — başarımlar ekranı bu listeyi kullanır. */
export interface BadgeDef {
  id: string;
  ic: string;
  t: string;
  d: string;
  goal: number;
  cur: (s: Student) => number;
}

export const BADGES: BadgeDef[] = [
  { id: 'first', ic: '🚀', t: 'İlk Adım', d: 'İlk konunu tamamla', goal: 1, cur: (s) => Object.keys(s.td || {}).length },
  { id: 'scholar', ic: '🎓', t: 'Konu Bilgesi', d: '5 konu tamamla', goal: 5, cur: (s) => Object.keys(s.td || {}).length },
  { id: 'word50', ic: '📖', t: 'Kelime Avcısı', d: '50 kelime öğren', goal: 50, cur: (s) => s.wl || 0 },
  { id: 'word200', ic: '📚', t: 'Sözlük Kurucusu', d: '200 kelime öğren', goal: 200, cur: (s) => s.wl || 0 },
  { id: 'quiz10', ic: '🧠', t: 'Test Maratoncusu', d: '10 testi geç', goal: 10, cur: (s) => s.tc || 0 },
  { id: 'perfect', ic: '💯', t: 'Kusursuz', d: 'Bir testten %100 al', goal: 1, cur: (s) => (s.bd?.perfect ? 1 : 0) },
  { id: 'streak3', ic: '🔥', t: 'Üç Gün Ateşi', d: '3 gün üst üste çalış', goal: 3, cur: (s) => computeStreak(s.dz || []) },
  { id: 'streak7', ic: '⚡', t: 'Haftalık Şimşek', d: '7 gün üst üste çalış', goal: 7, cur: (s) => computeStreak(s.dz || []) },
  { id: 'puzzle1', ic: '🧩', t: 'Parça Ustası', d: 'İlk yapbozunu tamamla', goal: 1, cur: (s) => (s.cp || []).length },
  { id: 'points500', ic: '⭐', t: 'Puan Yıldızı', d: '500 puana ulaş', goal: 500, cur: (s) => s.p || 0 },
];

/** Öğrencinin kazandığı rozet id'leri. */
export const earnedBadges = (s: Student): string[] =>
  BADGES.filter((b) => b.cur(s) >= b.goal).map((b) => b.id);
