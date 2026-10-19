import { supabase } from '../lib/supabase.ts';
import { AppDatabase } from './storage.ts';
import { Student, ClassGroup, Topic, WordItem, Homework, SubTopic, Question, NotificationItem } from '../types.ts';

interface IdMap {
  classes: Record<string, string>;
  topics: Record<string, string>;
  subtopics: Record<string, string>;
  students: Record<string, string>; // supabase uuid -> local student id
  words: Record<string, number>;
  homeworks: Record<string, number>;
}

const ID_MAP_KEY = 'eb_id_map';

export function loadIdMap(): IdMap {
  try {
    const raw = localStorage.getItem(ID_MAP_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        classes: p.classes || {},
        topics: p.topics || {},
        subtopics: p.subtopics || {},
        students: p.students || {},
        words: p.words || {},
        homeworks: p.homeworks || {},
      };
    }
  } catch {}
  return { classes: {}, topics: {}, subtopics: {}, students: {}, words: {}, homeworks: {} };
}

export function saveIdMap(map: IdMap): void {
  try {
    localStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
  } catch {}
}

// Kararlı sayısal id üretimi: UUID'den hash — sıralama değişse de id kaymaz
function stableNumericId(uuid: string, taken: Set<number>): number {
  let h = 2166136261;
  for (let i = 0; i < uuid.length; i++) {
    h ^= uuid.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let id = (Math.abs(h) % 1000000) + 1;
  while (taken.has(id)) id = (id % 1000000) + 1;
  return id;
}

// Uygulamanın sormasıyla Supabase questions.data anahtarları arasında toleranslı okuma
function pick(d: any, keys: string[]): any {
  for (const k of keys) if (d?.[k] !== undefined && d?.[k] !== null) return d[k];
  return undefined;
}

// topic/subtopic data blob'undan kelime çiftlerini ([en, tr][]) çıkarır
function extractPairs(data: any): [string, string][] {
  const raw = pick(data, ['words', 'pairs', 'ex']);
  if (!Array.isArray(raw)) return [];
  const out: [string, string][] = [];
  for (const it of raw) {
    if (Array.isArray(it) && typeof it[0] === 'string' && typeof it[1] === 'string') {
      out.push([it[0], it[1]]);
    } else if (it && typeof it === 'object' && typeof (it.en ?? it.e) === 'string' && typeof (it.tr ?? it.t) === 'string') {
      out.push([String(it.en ?? it.e), String(it.tr ?? it.t)]);
    } else if (typeof it === 'string' && it.includes('|')) {
      const [a, b] = it.split('|');
      out.push([a.trim(), b.trim()]);
    }
  }
  return out;
}

// Soru tipini güvenli eşler (bilinmeyen tipler mc fallback ile çökme üretmez)
function mapQuestion(q: any): Question | null {
  const d = q.data || {};
  const kind = String(q.kind || d.k || '').toLowerCase();
  if (kind === 'fill' || kind === 'cloze') {
    return { k: 'fill', q: d.q || '', h: d.h, a: d.a || '' };
  }
  if (kind === 'order' || kind === 'arrange') {
    return { k: 'order', q: d.q || '', w: d.w || [] };
  }
  if (kind === 'listen') {
    return { k: 'listen', s: d.s || '', o: d.o || [] };
  }
  const opts = pick(d, ['o', 'options']) || [];
  if (Array.isArray(opts) && opts.length >= 2) {
    const strs = opts.map(String);
    // Panel mc verisini {q, c: doğruCevapMetni, o: karışıkSeçenekler} olarak yazar.
    // Uygulama MultipleChoiceQuestion.c'yi STRING metin bekler (logic.ts ans() öyle okur).
    const correctText = pick(d, ['c', 'correct']);
    if (typeof correctText === 'string' && correctText) {
      return { k: 'mc', q: d.q || '', o: strs, c: correctText };
    }
    const idx = pick(d, ['answer_index', 'a']);
    if (Number.isInteger(idx) && idx >= 0 && idx < strs.length) {
      return { k: 'mc', q: d.q || '', o: strs, a: idx };
    }
    return { k: 'mc', q: d.q || '', o: strs, c: strs[0] };
  }
  return null; // eşlenemeyen soru atlanır (çökme yerine yok sayılır)
}

function mapClasses(rows: any[]): ClassGroup[] {
  const map = loadIdMap();
  return rows.map((r) => {
    const localId = map.classes[r.id] || `c${r.id.slice(0, 8)}`;
    if (!map.classes[r.id]) map.classes[r.id] = localId;
    return { id: localId, n: r.name };
  });
}

function mapWords(rows: any[]): WordItem[] {
  const map = loadIdMap();
  const taken = new Set<number>(Object.values(map.words));
  return rows.map((r) => {
    let localId = map.words[r.id];
    if (localId === undefined) {
      localId = stableNumericId(r.id, taken);
      taken.add(localId);
      map.words[r.id] = localId;
    }
    return {
      id: localId,
      e: r.en,
      tr: r.tr,
      ph: r.phonetic || '',
      ex: r.example || '',
      lv: r.level,
    };
  });
}

function mapTopics(rows: any[], subs: any[], questions: any[]): Topic[] {
  const map = loadIdMap();
  return rows.map((r) => {
    const localId = map.topics[r.id] || `x${r.id.slice(0, 8)}`;
    if (!map.topics[r.id]) map.topics[r.id] = localId;

    const topicSubs: SubTopic[] = subs.filter((s) => s.topic_id === r.id).map((s) => {
      const sid = map.subtopics[s.id] || `s${s.id.slice(0, 8)}`;
      if (!map.subtopics[s.id]) map.subtopics[s.id] = sid;
      return {
        id: sid,
        t: s.title,
        exp: pick(s.data, ['exp', 'content', 'text']) || '',
        imgs: s.data?.imgs || [],
      };
    });

    // Eski soru formatı (düz kolonlar) ve yeni format (data jsonb) birlikte tolere edilir
    const topicQuestions: Question[] = questions
      .filter((q) => q.topic_id === r.id)
      .map((q) => (q.data && Object.keys(q.data).length ? mapQuestion(q) : legacyQuestion(q)))
      .filter((q): q is Question => q !== null);

    const pairs = extractPairs(r.data);
    const examples = extractPairs({ ex: pick(r.data, ['examples', 'ex']) });

    return {
      id: localId,
      ic: pick(r.data, ['icon', 'ic']) || '📘',
      t: r.title,
      d: pick(r.data, ['desc', 'd', 'description']) || '',
      exp: pick(r.data, ['exp', 'content']) || '',
      lv: pick(r.data, ['level', 'lv']) || r.level || 'A1',
      ex: examples.length ? examples : pairs.slice(0, 5),
      words: pairs,
      q: topicQuestions,
      subs: topicSubs,
    };
  });
}

// Soruların düz-kolon eski şeması (question/options/answer/kind)
function legacyQuestion(q: any): Question | null {
  const kind = String(q.kind || '').toLowerCase();
  const optsRaw = q.options ?? q.o;
  const opts: string[] = Array.isArray(optsRaw)
    ? optsRaw.map(String)
    : typeof optsRaw === 'string'
      ? (() => { try { return JSON.parse(optsRaw).map(String); } catch { return []; } })()
      : [];
  if (kind === 'fill') {
    return { k: 'fill', q: q.question || q.q || '', h: q.hint ?? q.h, a: q.answer || q.a || '' };
  }
  if (kind === 'order') {
    const w = q.words ?? q.w;
    return { k: 'order', q: q.question || q.q || '', w: Array.isArray(w) ? w.map(String) : [] };
  }
  if (kind === 'listen') {
    return { k: 'listen', s: q.audio ?? q.s ?? '', o: opts };
  }
  if (opts.length >= 2) {
    let c = q.correct ?? q.c;
    // Uygulama mc için doğru cevabı STRING metin olarak bekler (logic.ts ans())
    if (typeof c === 'string' && c) return { k: 'mc', q: q.question || q.q || '', o: opts, c };
    const idxRaw = q.answer_index ?? q.a;
    if (Number.isInteger(idxRaw) && idxRaw >= 0 && idxRaw < opts.length) {
      return { k: 'mc', q: q.question || q.q || '', o: opts, a: idxRaw };
    }
    // answer kolonu metin ya da sayı olabilir — ikisini de tolere et
    const ansVal = q.answer;
    if (typeof ansVal === 'string') {
      if (opts.includes(ansVal)) return { k: 'mc', q: q.question || q.q || '', o: opts, c: ansVal };
      const parsed = parseInt(ansVal, 10);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed < opts.length) {
        return { k: 'mc', q: q.question || q.q || '', o: opts, a: parsed };
      }
    }
    return { k: 'mc', q: q.question || q.q || '', o: opts, c: opts[0] };
  }
  return null;
}

// Panelden gelen bildirimleri uygulama formatına çevirir (dedup için key döner)
function mapNotifications(rows: any[], map: IdMap): { items: NotificationItem[]; keys: string[] } {
  const items: NotificationItem[] = [];
  const keys: string[] = [];
  for (const n of rows) {
    const localStudentId = map.students[n.student_id];
    if (!localStudentId) continue; // bu cihazda tanınmayan öğrenci
    items.push({ si: localStudentId, t: n.title || 'Bildirim', m: n.body || '', at: n.created_at || new Date().toISOString() });
    keys.push(`${n.id ?? ''}|${localStudentId}`);
  }
  return { items, keys };
}

export async function syncFromSupabase(currentDb: AppDatabase): Promise<AppDatabase> {
  const map = loadIdMap();

  try {
    // Öğrenciler: e-posta -> profil uuid eşlemesi (topic_access/homework_targets/notifications için zorunlu)
    const studentEmails = currentDb.students.map((s) => String(s.e || '').toLowerCase()).filter(Boolean);
    if (studentEmails.length) {
      const { data: profRows } = await supabase
        .from('profiles')
        .select('id,email')
        .in('email', studentEmails);
      const byEmail = new Map<string, string>((profRows || []).map((p: any) => [String(p.email).toLowerCase(), p.id]));
      for (const s of currentDb.students) {
        const uuid = byEmail.get(String(s.e || '').toLowerCase());
        if (uuid) map.students[uuid] = s.id;
      }
    }

    const { data: classesRows } = await supabase.from('classes').select('*').order('name');
    const classes = classesRows ? mapClasses(classesRows) : currentDb.classes;

    const { data: wordsRows } = await supabase.from('words').select('*').order('level').order('en');
    const words = wordsRows ? mapWords(wordsRows) : currentDb.words;

    const { data: topicsRows } = await supabase.from('topics').select('*').order('sort_order');
    const { data: subsRows } = await supabase.from('subtopics').select('*');
    const { data: questionsRows } = await supabase.from('questions').select('*');
    const topics = topicsRows ? mapTopics(topicsRows, subsRows || [], questionsRows || []) : currentDb.topics;

    // topic_access: öğretmenin/panelin verdiği konu yetkilerini local tp listesine yaz
    let studentsWithAccess = currentDb.students;
    const uuidList = Object.keys(map.students);
    if (topicsRows && uuidList.length) {
      const { data: accessRows } = await supabase
        .from('topic_access')
        .select('student_id,topic_id')
        .in('student_id', uuidList);
      if (accessRows) {
        const perStudent: Record<string, string[]> = {};
        for (const a of accessRows) {
          const lid = map.topics[a.topic_id];
          if (!lid) continue;
          (perStudent[a.student_id] ||= []).push(lid);
        }
        studentsWithAccess = currentDb.students.map((s) => {
          const uuid = Object.keys(map.students).find((u) => map.students[u] === s.id);
          if (!uuid || !(uuid in perStudent)) return s;
          return { ...s, tp: perStudent[uuid] };
        });
      }
    }

    const { data: hwRows } = await supabase.from('homework').select('*').order('created_at', { ascending: false });
    const { data: hwTargetRows } = await supabase.from('homework_targets').select('homework_id,student_id');
    const hwTaken = new Set<number>(Object.values(map.homeworks));
    const homeworks: Homework[] = (hwRows || []).map((h) => {
      let localId = map.homeworks[h.id];
      if (localId === undefined) {
        localId = stableNumericId(h.id, hwTaken);
        hwTaken.add(localId);
        map.homeworks[h.id] = localId;
      }
      // type: yeni hw_type kolonu ya da eski data.type; bilinirse kullan, değilse soru varsa test
      const rawType = String(h.hw_type || h.data?.type || '').toLowerCase();
      const qRaw = h.questions ?? h.data?.questions;
      const qList: Question[] = Array.isArray(qRaw)
        ? qRaw.map((q: any) => (q && typeof q === 'object' ? mapQuestion({ data: q, kind: q.k || q.kind }) : null)).filter((q: any): q is Question => !!q)
        : [];
      const type: Homework['type'] =
        rawType === 'test' || rawType === 'ex' || rawType === 'write'
          ? rawType
          : qList.length > 0 ? 'test' : 'write';
      // hedef kitle: homework_targets satırları -> local öğrenci id'leri
      const to: string[] = (hwTargetRows || [])
        .filter((t: any) => t.homework_id === h.id)
        .map((t: any) => map.students[t.student_id])
        .filter(Boolean);
      const topicLocal = h.topic_id ? map.topics[h.topic_id] || '' : '';
      return {
        id: localId,
        t: h.title,
        d: h.body || '',
        due: h.due_date || '',
        type,
        topic: topicLocal,
        to,
        q: qList,
        pass: Number.isFinite(Number(h.pass ?? h.data?.pass)) ? Number(h.pass ?? h.data?.pass) : undefined,
      };
    });

    // Panelden gelen bildirimler (mükerrer ekleme yapmadan)
    const { data: notifRows } = await supabase
      .from('notifications')
      .select('id,student_id,title,body,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    let mergedNotifications = currentDb.notifications;
    if (notifRows && notifRows.length) {
      const { items } = mapNotifications(notifRows, map);
      const existingKeys = new Set(
        (currentDb.notifications || []).map((n: any) => `${n.t}|${n.m}|${n.si}`)
      );
      const fresh = items.filter((n) => !existingKeys.has(`${n.t}|${n.m}|${n.si}`));
      if (fresh.length) mergedNotifications = [...fresh, ...(currentDb.notifications || [])];
    }

    saveIdMap(map);

    return {
      ...currentDb,
      classes,
      words,
      topics,
      students: studentsWithAccess,
      homeworks: homeworks.length > 0 ? homeworks : currentDb.homeworks,
      notifications: mergedNotifications,
    };
  } catch (err) {
    console.error('Supabase sync hatası:', err);
    saveIdMap(map);
    return currentDb;
  }
}

// local id -> supabase uuid ters çevirimi (map nesnelerinde key uuid, value local id)
function reverseFind(map: Record<string, string | number>, localId: string | number): string | undefined {
  return Object.keys(map).find((k) => map[k] === localId);
}

export async function syncStudentProgress(student: Student): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const map = loadIdMap();

    // Toplu upsertler: her öğe için ayrı istek yerine tek istek (N×istek fırtınası düzeltmesi)
    const topicRows = Object.entries(student.td || {})
      .filter(([_, done]) => done)
      .map(([localId]) => ({ student_id: user.id, topic_id: reverseFind(map.topics, localId) }))
      .filter((r) => !!r.topic_id);
    if (topicRows.length) {
      await supabase.from('topic_complete').upsert(topicRows, { onConflict: 'student_id,topic_id' });
      // topic_pass: konu tamamlandıysa geçmiş sayılır (panel %60 geçiş istatistiği bunu okur)
      const passRows = topicRows.map((r) => ({ student_id: user.id, topic_id: r.topic_id, passed: true }));
      await supabase.from('topic_pass').upsert(passRows, { onConflict: 'student_id,topic_id' });
    }

    const subRows = Object.entries(student.sd || {})
      .filter(([_, done]) => done)
      .map(([localId]) => ({ student_id: user.id, subtopic_id: reverseFind(map.subtopics, localId) }))
      .filter((r) => !!r.subtopic_id);
    if (subRows.length) {
      await supabase.from('subtopic_done').upsert(subRows, { onConflict: 'student_id,subtopic_id' });
    }

    const wordRows = (student.kn || [])
      .map((localWordId) => ({ student_id: user.id, word_id: reverseFind(map.words, localWordId) }))
      .filter((r) => !!r.word_id);
    if (wordRows.length) {
      await supabase.from('words_learned').upsert(wordRows, { onConflict: 'student_id,word_id' });
    }

    if (student.day && student.day.n > 0) {
      await supabase.from('daily_words').upsert(
        { student_id: user.id, day: student.day.d, count: student.day.n },
        { onConflict: 'student_id,day' }
      );
    }

    // Test denemeleri: tpass (geçilen testler) + cnt (deneme sayıları) -> test_attempts
    const attemptRows: any[] = [];
    for (const [localTopicId, passed] of Object.entries(student.tpass || {})) {
      const sbTopic = reverseFind(map.topics, localTopicId);
      if (!sbTopic) continue;
      const attempts = student.cnt?.[localTopicId] ?? 1;
      attemptRows.push({ student_id: user.id, topic_id: sbTopic, attempts, passed: !!passed });
    }
    if (attemptRows.length) {
      await supabase.from('test_attempts').upsert(attemptRows, { onConflict: 'student_id,topic_id' });
    }

    // Ödev teslimleri: h (ödev id -> yanıt) -> homework_submissions
    const hwRows: any[] = [];
    for (const [hwIdLocal, prog] of Object.entries(student.h || {})) {
      const sbHw = reverseFind(map.homeworks, Number(hwIdLocal));
      if (!sbHw || !prog) continue;
      hwRows.push({
        homework_id: sbHw,
        student_id: user.id,
        text: prog.text || '',
        score: prog.score,
      });
    }
    if (hwRows.length) {
      await supabase.from('homework_submissions').upsert(hwRows, { onConflict: 'homework_id,student_id' });
    }
  } catch (err) {
    console.error('Progress sync hatası:', err);
  }
}
