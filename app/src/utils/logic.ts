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

export const hs = (h: Homework, s: Student) => {
  // Saf mutasyon: ödev kaydını döndürür; çağıran taraf güncel state'i kendisi yayar.
  if (!s.h) s.h = {};
  if (!s.h[h.id]) {
    s.h[h.id] = { score: null, text: '' };
  }
  return s.h[h.id];
};

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
  const r = hs(h, s);
  if (h.type === 'write') return !!r.text;
  const passScore = h.type === 'ex' ? 60 : h.pass != null ? h.pass : 60;
  return r.score != null && r.score >= passScore;
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
  s.nxt = s.nxt || s.cp.length;
  s.tc = s.tc || 0;
  s.wl = s.wl || 0;
  s.tpass = s.tpass || {};
};

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
