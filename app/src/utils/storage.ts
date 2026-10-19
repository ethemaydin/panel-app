import { Student, ClassGroup, Topic, WordItem, Homework, LessonSchedule, NotificationItem, BroadcastMessage, StudentProgress } from '../types.ts';

export const LOGO =
  'data:image/png;base64,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';

export const INITIAL_CLASSES: ClassGroup[] = [
  { id: 'c1', n: '1. Sınıf' },
  { id: 'c2', n: '2. Sınıf' },
];

export const INITIAL_SESSIONS: string[] = [];
export const INITIAL_SESSION_CLASSES: (string | null)[] = [];

export interface AppDatabase {
  students: Student[];
  classes: ClassGroup[];
  sessions: string[];
  sessionClasses: (string | null)[];
  topics: Topic[];
  words: WordItem[];
  homeworks: Homework[];
  lessons: LessonSchedule[];
  notifications: NotificationItem[];
  broadcasts: BroadcastMessage[];
}

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_HOMEWORKS: Homework[] = [];

export const INITIAL_LESSONS: LessonSchedule[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const STORAGE_KEY = 'eb_android_data_v4';

export const INITIAL_TOPICS: Topic[] = [
  {
    id: 'greet',
    ic: '👋',
    t: 'Greetings',
    d: 'Selamlaşma ve tanışma',
    lv: 'A1',
    exp: 'Tanışırken önce selam verilir, sonra isim söylenir. “Nice to meet you” tanıştığımıza memnun olduğumuzu söyler; karşı taraf genelde “Nice to meet you, too” der.',
    ex: [
      ['Hello, I’m Elif.', 'Merhaba, ben Elif.'],
      ['Nice to meet you.', 'Tanıştığımıza memnun oldum.'],
      ['See you tomorrow.', 'Yarın görüşürüz.'],
    ],
    words: [
      ['hello', 'merhaba'],
      ['goodbye', 'hoşça kal'],
      ['please', 'lütfen'],
      ['thank you', 'teşekkür ederim'],
      ['good morning', 'günaydın'],
      ['good night', 'iyi geceler'],
      ['sorry', 'özür dilerim'],
      ['welcome', 'hoş geldin'],
    ],
    q: [
      { k: 'mc', q: '“Tanıştığıma memnun oldum” hangisi?', o: ['See you later', 'Nice to meet you', 'Good night'], a: 1 },
      { k: 'fill', q: 'Hello, I ___ Elif.', h: '“Ben Elif’im” cümlesini tamamla', a: 'am' },
      { k: 'order', q: '“Yarın görüşürüz.”', w: ['See', 'you', 'tomorrow'] },
      { k: 'listen', s: 'Nice to meet you', o: ['Nice to meet you', 'Thank you', 'Good morning'] },
    ],
    subs: [
      {
        id: 'greets1',
        t: 'Konu anlatımı',
        exp: 'Tanışırken önce selam verilir, sonra isim söylenir. “Nice to meet you” tanıştığımıza memnun olduğumuzu söyler; karşı taraf genelde “Nice to meet you, too” der.',
        imgs: [],
      },
    ],
  },
  {
    id: 'tobe',
    ic: '🙋',
    t: 'To Be (am / is / are)',
    d: 'Kendini tanıtmanın temeli',
    lv: 'A1',
    exp: 'Ben için am, o için is, sen / biz / siz / onlar için are kullanırız. Olumsuz yapmak için sonuna not ekleriz: She is not (isn’t) a teacher.',
    ex: [
      ['I am a student.', 'Ben bir öğrenciyim.'],
      ['She is from Konya.', 'O Konya’lı.'],
      ['They are at school.', 'Onlar okulda.'],
    ],
    words: [
      ['student', 'öğrenci'],
      ['teacher', 'öğretmen'],
      ['school', 'okul'],
      ['from', '-den / -dan'],
      ['friend', 'arkadaş'],
      ['family', 'aile'],
      ['happy', 'mutlu'],
      ['tired', 'yorgun'],
    ],
    q: [
      { k: 'mc', q: 'They ___ my friends.', o: ['is', 'are', 'am'], a: 1 },
      { k: 'fill', q: 'She ___ from Konya.', h: 'am / is / are', a: 'is' },
      { k: 'order', q: '“Ben bir öğrenciyim.”', w: ['I', 'am', 'a', 'student'] },
      { k: 'listen', s: 'She is a teacher', o: ['She is a teacher', 'He is a student', 'They are teachers'] },
    ],
    subs: [
      {
        id: 'tobes1',
        t: 'Konu anlatımı',
        exp: 'Ben için am, o için is, sen / biz / siz / onlar için are kullanırız. Olumsuz yapmak için sonuna not ekleriz: She is not (isn’t) a teacher.',
        imgs: [],
      },
    ],
  },
  {
    id: 'routine',
    ic: '⏰',
    t: 'Daily Routines',
    d: 'Günlük hayat (Present Simple)',
    lv: 'A2',
    exp: 'Her gün yaptığımız işler için Present Simple kullanırız. I, you, we, they ile fiil aynen kalır; he, she, it ile fiile -s eklenir: She wakes up at seven.',
    ex: [
      ['I wake up at seven.', 'Yedide uyanırım.'],
      ['He goes to work by bus.', 'İşe otobüsle gider.'],
      ['We eat dinner at eight.', 'Sekizde akşam yemeği yeriz.'],
    ],
    words: [
      ['wake up', 'uyanmak'],
      ['breakfast', 'kahvaltı'],
      ['work', 'iş / çalışmak'],
      ['sleep', 'uyumak'],
      ['get up', 'kalkmak'],
      ['dinner', 'akşam yemeği'],
      ['study', 'ders çalışmak'],
      ['every day', 'her gün'],
    ],
    q: [
      { k: 'mc', q: 'She ___ breakfast at eight.', o: ['eat', 'eats', 'eating'], a: 1 },
      { k: 'fill', q: 'He ___ to school every day.', h: 'go fiilini doğru şekilde yaz', a: 'goes' },
      { k: 'order', q: '“Yedide uyanırım.”', w: ['I', 'wake', 'up', 'at', 'seven'] },
      { k: 'listen', s: 'I wake up at seven', o: ['I wake up at seven', 'I go to work', 'I sleep at seven'] },
    ],
    subs: [
      {
        id: 'routines1',
        t: 'Konu anlatımı',
        exp: 'Her gün yaptığımız işler için Present Simple kullanırız. I, you, we, they ile fiil aynen kalır; he, she, it ile fiile -s eklenir: She wakes up at seven.',
        imgs: [],
      },
    ],
  },
  {
    id: 'food',
    ic: '🍎',
    t: 'Food & Drink',
    d: 'Yiyecek, içecek ve sipariş verme',
    lv: 'A2',
    exp: 'Bir şey isterken “I’d like …” kibar bir kalıptır. Sayılabilen şeyler için a / an, sayılamayanlar (water, bread) için some kullanırız.',
    ex: [
      ['I’d like a coffee, please.', 'Bir kahve rica ediyorum.'],
      ['Can I have some water?', 'Biraz su alabilir miyim?'],
      ['The bill, please.', 'Hesap lütfen.'],
    ],
    words: [
      ['water', 'su'],
      ['bread', 'ekmek'],
      ['bill', 'hesap'],
      ['menu', 'menü'],
      ['coffee', 'kahve'],
      ['milk', 'süt'],
      ['apple', 'elma'],
      ['hungry', 'aç'],
    ],
    q: [
      { k: 'mc', q: '“Hesap lütfen” hangisi?', o: ['The menu, please.', 'The bill, please.', 'Some water, please.'], a: 1 },
      { k: 'fill', q: 'Can I have ___ water?', h: '“biraz” anlamındaki kelimeyi yaz', a: 'some' },
      { k: 'order', q: '“Bir kahve rica ediyorum.”', w: ['I’d', 'like', 'a', 'coffee', 'please'] },
      { k: 'listen', s: 'Can I have some water', o: ['Can I have some water', 'I like some bread', 'The bill please'] },
    ],
    subs: [
      {
        id: 'foods1',
        t: 'Konu anlatımı',
        exp: 'Bir şey isterken “I’d like …” kibar bir kalıptır. Sayılabilen şeyler için a / an, sayılamayanlar (water, bread) için some kullanırız.',
        imgs: [],
      },
    ],
  },
];

export const INITIAL_WORDS: WordItem[] = [
  { id: 1, e: 'hello', tr: 'merhaba', ph: 'heh-LOH', ex: 'Hello, my name is Elif.', lv: 'A1' },
  { id: 2, e: 'teacher', tr: 'öğretmen', ph: 'TEE-cher', ex: 'My teacher is very kind.', lv: 'A1' },
  { id: 3, e: 'water', tr: 'su', ph: 'WAW-ter', ex: 'I drink water every day.', lv: 'A1' },
  { id: 4, e: 'book', tr: 'kitap', ph: 'buk', ex: 'This book is interesting.', lv: 'A1' },
  { id: 5, e: 'friend', tr: 'arkadaş', ph: 'frend', ex: 'She is my best friend.', lv: 'A1' },
  { id: 6, e: 'breakfast', tr: 'kahvaltı', ph: 'BREK-fust', ex: 'I eat breakfast at eight.', lv: 'A1' },
  { id: 7, e: 'weather', tr: 'hava durumu', ph: 'WEDH-er', ex: 'The weather is nice today.', lv: 'A2' },
  { id: 8, e: 'borrow', tr: 'ödünç almak', ph: 'BOR-oh', ex: 'Can I borrow your pen?', lv: 'A2' },
  { id: 9, e: 'invite', tr: 'davet etmek', ph: 'in-VYT', ex: 'I invite her to my party.', lv: 'A2' },
  { id: 10, e: 'achieve', tr: 'başarmak', ph: 'uh-CHEEV', ex: 'She worked hard to achieve her goal.', lv: 'B1' },
  { id: 11, e: 'improve', tr: 'geliştirmek', ph: 'im-PROOV', ex: 'I want to improve my English.', lv: 'B1' },
  { id: 12, e: 'reliable', tr: 'güvenilir', ph: 'ri-LY-uh-bul', ex: 'He is a reliable friend.', lv: 'B2' },
  { id: 13, e: 'significant', tr: 'önemli', ph: 'sig-NIF-i-kunt', ex: 'There was a significant change.', lv: 'B2' },
  { id: 14, e: 'meticulous', tr: 'titiz', ph: 'muh-TIK-yuh-lus', ex: 'She is meticulous about details.', lv: 'C1' },
  { id: 15, e: 'ambiguous', tr: 'belirsiz', ph: 'am-BIG-yoo-us', ex: 'The answer was ambiguous.', lv: 'C1' },
  // Extra vocabulary
  { id: 100, e: 'apple', tr: 'elma', ph: 'AP-ul', ex: 'I eat an apple.', lv: 'A1' },
  { id: 101, e: 'house', tr: 'ev', ph: 'hows', ex: 'My house is small.', lv: 'A1' },
  { id: 102, e: 'mother', tr: 'anne', ph: 'MUDH-er', ex: 'My mother cooks well.', lv: 'A1' },
  { id: 103, e: 'happy', tr: 'mutlu', ph: 'HAP-ee', ex: 'I am happy today.', lv: 'A1' },
  { id: 104, e: 'school', tr: 'okul', ph: 'skool', ex: 'I go to school.', lv: 'A1' },
  { id: 105, e: 'red', tr: 'kırmızı', ph: 'red', ex: 'The car is red.', lv: 'A1' },
  { id: 106, e: 'travel', tr: 'seyahat etmek', ph: 'TRAV-ul', ex: 'I like to travel by train.', lv: 'A2' },
  { id: 107, e: 'market', tr: 'pazar', ph: 'MAR-kit', ex: 'We buy fruit at the market.', lv: 'A2' },
  { id: 108, e: 'expensive', tr: 'pahalı', ph: 'ik-SPEN-siv', ex: 'This bag is expensive.', lv: 'A2' },
  { id: 109, e: 'ticket', tr: 'bilet', ph: 'TIK-it', ex: 'I need a ticket.', lv: 'A2' },
  { id: 110, e: 'ready', tr: 'hazır', ph: 'RED-ee', ex: 'Are you ready?', lv: 'A2' },
  { id: 111, e: 'cheap', tr: 'ucuz', ph: 'cheep', ex: 'The hotel is cheap.', lv: 'A2' },
  { id: 112, e: 'decision', tr: 'karar', ph: 'di-SIZH-un', ex: 'It was a difficult decision.', lv: 'B1' },
  { id: 113, e: 'environment', tr: 'çevre', ph: 'in-VY-run-munt', ex: 'We must protect the environment.', lv: 'B1' },
  { id: 114, e: 'opportunity', tr: 'fırsat', ph: 'op-er-TOO-ni-tee', ex: 'This is a great opportunity.', lv: 'B1' },
  { id: 115, e: 'ability', tr: 'yetenek', ph: 'uh-BIL-i-tee', ex: 'She has the ability to learn fast.', lv: 'B1' },
  { id: 116, e: 'recommend', tr: 'tavsiye etmek', ph: 'rek-uh-MEND', ex: 'I recommend this book.', lv: 'B1' },
  { id: 117, e: 'assume', tr: 'varsaymak', ph: 'uh-SOOM', ex: 'I assume he will come.', lv: 'B2' },
  { id: 118, e: 'consequence', tr: 'sonuç', ph: 'KON-si-kwuns', ex: 'Every action has a consequence.', lv: 'B2' },
  { id: 119, e: 'sufficient', tr: 'yeterli', ph: 'suh-FISH-unt', ex: 'We have sufficient time.', lv: 'B2' },
  { id: 120, e: 'negotiate', tr: 'müzakere etmek', ph: 'ni-GOH-shee-ayt', ex: 'They negotiate the price.', lv: 'B2' },
  { id: 121, e: 'evidence', tr: 'kanıt', ph: 'EV-i-duns', ex: 'There is no evidence.', lv: 'B2' },
  { id: 122, e: 'ubiquitous', tr: 'her yerde bulunan', ph: 'yoo-BIK-wi-tus', ex: 'Smartphones are ubiquitous.', lv: 'C1' },
  { id: 123, e: 'resilient', tr: 'dirençli', ph: 'ri-ZIL-yunt', ex: 'She is a resilient person.', lv: 'C1' },
  { id: 124, e: 'nuance', tr: 'ince fark', ph: 'NOO-ahns', ex: 'He noticed the nuance.', lv: 'C1' },
  { id: 125, e: 'scrutinize', tr: 'incelemek', ph: 'SKROO-tuh-nyz', ex: 'They scrutinize every detail.', lv: 'C1' },
  { id: 126, e: 'ephemeral', tr: 'geçici', ph: 'ih-FEM-er-ul', ex: 'Fame is often ephemeral.', lv: 'C1' },
];

const isoDay = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Prototype data removed

export const genId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

/** Eski (v1) verileri stabil id tabanlı yeni şemaya taşır. */
export function migrateDb(raw: any): AppDatabase {
  const base: AppDatabase = {
    students: raw?.students || INITIAL_STUDENTS,
    classes: raw?.classes || INITIAL_CLASSES,
    sessions: raw?.sessions || INITIAL_SESSIONS,
    sessionClasses: raw?.sessionClasses || INITIAL_SESSION_CLASSES,
    topics: raw?.topics || INITIAL_TOPICS,
    words: raw?.words || INITIAL_WORDS,
    homeworks: raw?.homeworks || INITIAL_HOMEWORKS,
    lessons: raw?.lessons || INITIAL_LESSONS,
    notifications: raw?.notifications || INITIAL_NOTIFICATIONS,
    broadcasts: raw?.broadcasts || [],
  };

  // 1) Öğrencilere eksikse id ata; e-posta ile kararlı eşleme yap (indeks kayması sorununu önler)
  const emailToId = new Map<string, string>();
  for (const s of base.students) {
    if (!s.id) s.id = genId();
    const em = String(s.e || '').toLowerCase();
    if (em) emailToId.set(em, s.id);
  }
  // Mevcut id'si olan öğrenciler için de e-posta haritasını tazele (çakışma olmasın)
  const resolveStudent = (ref: unknown): string | null => {
    if (typeof ref === 'string') return base.students.some((x) => x.id === ref) ? ref : null;
    if (typeof ref === 'number' && base.students[ref]) return base.students[ref].id;
    return null;
  };

  // 2) Ödev atamaları (to[]) ve öğrenci ödev kayıtları (h{}) referans düzeltmesi
  for (const h of base.homeworks) {
    h.to = (h.to || []).map(resolveStudent).filter((x): x is string => !!x);
  }
  for (const s of base.students) {
    const nextH: Record<string, StudentProgress> = {};
    for (const [k, v] of Object.entries(s.h || {})) {
      nextH[k] = v; // Homework.id sayısal; JS nesne anahtarı zaten string
    }
    s.h = nextH;
  }

  // 3) Ders katılımcıları (stu[])
  for (const l of base.lessons) {
    l.stu = (l.stu || []).map(resolveStudent).filter((x): x is string => !!x);
  }

  // 4) Bildirim hedefleri (si) ve yayın hedefleri (to)
  base.notifications = (base.notifications || [])
    .map((n) => ({ ...n, si: n.si === 't' ? ('t' as const) : (n.si ? resolveStudent(n.si as any) : null) }))
    .filter((n): n is NotificationItem => n.si !== null);
  base.broadcasts = (base.broadcasts || []).map((b) => ({
    ...b,
    to: (b.to || []).map(resolveStudent).filter((x): x is string => !!x),
  }));

  return base;
}

function loadDatabaseSync(): AppDatabase {
  if (typeof window === 'undefined') {
    return {
      students: INITIAL_STUDENTS,
      classes: INITIAL_CLASSES,
      sessions: INITIAL_SESSIONS,
      sessionClasses: INITIAL_SESSION_CLASSES,
      topics: INITIAL_TOPICS,
      words: INITIAL_WORDS,
      homeworks: INITIAL_HOMEWORKS,
      lessons: INITIAL_LESSONS,
      notifications: INITIAL_NOTIFICATIONS,
      broadcasts: [],
    };
  }

  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // v1 verisi varsa bir kez taşı
      const v1 = localStorage.getItem('eb_android_data_v1');
      if (v1) {
        raw = v1;
      }
    }
    if (raw) {
      return migrateDb(JSON.parse(raw));
    }
  } catch (err) {
    console.warn('Could not read from localStorage, using defaults', err);
  }

  return {
    students: INITIAL_STUDENTS,
    classes: INITIAL_CLASSES,
    sessions: INITIAL_SESSIONS,
    sessionClasses: INITIAL_SESSION_CLASSES,
    topics: INITIAL_TOPICS,
    words: INITIAL_WORDS,
    homeworks: INITIAL_HOMEWORKS,
    lessons: INITIAL_LESSONS,
    notifications: INITIAL_NOTIFICATIONS,
    broadcasts: [],
  };
}

export function loadDatabase(): AppDatabase {
  return loadDatabaseSync();
}

/** Supabase senkronu için asenkron sürüm (auth oturumu açıldıktan sonra çağrılabilir). */
export async function loadDatabaseAsync(): Promise<AppDatabase> {
  return loadDatabaseSync();
}

export function saveDatabase(data: AppDatabase): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Could not save to localStorage', err);
  }
}
