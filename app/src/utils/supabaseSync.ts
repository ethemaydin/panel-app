import { supabase } from '../lib/supabase.ts';
import { AppDatabase } from './storage.ts';
import { Student, ClassGroup, Topic, WordItem, Homework, SubTopic, Question } from '../types.ts';

interface IdMap {
  classes: Record<string, string>;
  topics: Record<string, string>;
  subtopics: Record<string, string>;
  students: Record<string, number>;
  words: Record<string, number>;
  homeworks: Record<string, number>;
}

const ID_MAP_KEY = 'eb_id_map';

export function loadIdMap(): IdMap {
  try {
    const raw = localStorage.getItem(ID_MAP_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { classes: {}, topics: {}, subtopics: {}, students: {}, words: {}, homeworks: {} };
}

export function saveIdMap(map: IdMap): void {
  try {
    localStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
  } catch {}
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
  return rows.map((r, idx) => {
    const localId = map.words[r.id] ?? (Object.keys(map.words).length + idx + 1);
    if (map.words[r.id] === undefined) map.words[r.id] = localId as number;
    return {
      id: localId as number,
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
    
    const topicSubs: SubTopic[] = (subs.filter((s) => s.topic_id === r.id) || []).map((s) => {
      const sid = map.subtopics[s.id] || `s${s.id.slice(0, 8)}`;
      if (!map.subtopics[s.id]) map.subtopics[s.id] = sid;
      return {
        id: sid,
        t: s.title,
        exp: s.data?.exp || s.data?.content || '',
        imgs: s.data?.imgs || [],
      };
    });
    
    const topicQuestions: Question[] = (questions.filter((q) => q.topic_id === r.id) || []).map((q) => {
      const d = q.data || {};
      if (q.kind === 'mc') {
        return { k: 'mc' as const, q: d.q || '', o: d.o || [], c: d.c };
      } else if (q.kind === 'fill') {
        return { k: 'fill' as const, q: d.q || '', h: d.h, a: d.a || '' };
      } else if (q.kind === 'order') {
        return { k: 'order' as const, q: d.q || '', w: d.w || [] };
      } else {
        return { k: 'listen' as const, s: d.s || '', o: d.o || [] };
      }
    });
    
    return {
      id: localId,
      ic: r.data?.icon || '📘',
      t: r.title,
      d: r.data?.desc || '',
      exp: r.data?.exp || '',
      lv: r.data?.level || 'A1',
      ex: [],
      words: [],
      q: topicQuestions,
      subs: topicSubs,
    };
  });
}

export async function syncFromSupabase(currentDb: AppDatabase): Promise<AppDatabase> {
  const map = loadIdMap();
  
  try {
    const { data: classesRows } = await supabase.from('classes').select('*').order('name');
    const classes = classesRows ? mapClasses(classesRows) : currentDb.classes;
    
    const { data: wordsRows } = await supabase.from('words').select('*').order('level').order('en');
    const words = wordsRows ? mapWords(wordsRows) : currentDb.words;
    
    const { data: topicsRows } = await supabase.from('topics').select('*').order('sort_order');
    const { data: subsRows } = await supabase.from('subtopics').select('*');
    const { data: questionsRows } = await supabase.from('questions').select('*');
    const topics = topicsRows ? mapTopics(topicsRows, subsRows || [], questionsRows || []) : currentDb.topics;
    
    const { data: hwRows } = await supabase.from('homework').select('*').order('created_at', { ascending: false });
    const homeworks: Homework[] = (hwRows || []).map((h, idx) => {
      const localId = map.homeworks[h.id] ?? (Object.keys(map.homeworks).length + idx + 1);
      if (map.homeworks[h.id] === undefined) map.homeworks[h.id] = localId as number;
      return {
        id: localId as number,
        t: h.title,
        d: h.body || '',
        due: h.due_date || '',
        type: 'write',
        topic: '',
        to: [],
        q: [],
      };
    });
    
    saveIdMap(map);
    
    return {
      ...currentDb,
      classes,
      words,
      topics,
      homeworks: homeworks.length > 0 ? homeworks : currentDb.homeworks,
    };
  } catch (err) {
    console.error('Supabase sync hatası:', err);
    return currentDb;
  }
}

export async function syncStudentProgress(student: Student): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const completedTopics = Object.entries(student.td || {})
      .filter(([_, done]) => done)
      .map(([localId]) => {
        const map = loadIdMap();
        const sbId = Object.entries(map.topics).find(([_, lid]) => lid === localId)?.[0];
        return sbId;
      })
      .filter(Boolean);
    
    for (const topicId of completedTopics) {
      await supabase.from('topic_complete').upsert(
        { student_id: user.id, topic_id: topicId },
        { onConflict: 'student_id,topic_id' }
      );
    }
    
    const completedSubs = Object.entries(student.sd || {})
      .filter(([_, done]) => done)
      .map(([localId]) => {
        const map = loadIdMap();
        const sbId = Object.entries(map.subtopics).find(([_, lid]) => lid === localId)?.[0];
        return sbId;
      })
      .filter(Boolean);
    
    for (const subId of completedSubs) {
      await supabase.from('subtopic_done').upsert(
        { student_id: user.id, subtopic_id: subId },
        { onConflict: 'student_id,subtopic_id' }
      );
    }
    
    const map = loadIdMap();
    for (const localWordId of student.kn || []) {
      const sbId = Object.entries(map.words).find(([_, lid]) => lid === localWordId)?.[0];
      if (sbId) {
        await supabase.from('words_learned').upsert(
          { student_id: user.id, word_id: sbId },
          { onConflict: 'student_id,word_id' }
        );
      }
    }
    
    if (student.day && student.day.n > 0) {
      await supabase.from('daily_words').upsert(
        { student_id: user.id, day: student.day.d, count: student.day.n },
        { onConflict: 'student_id,day' }
      );
    }
  } catch (err) {
    console.error('Progress sync hatası:', err);
  }
}
