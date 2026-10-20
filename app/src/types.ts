export type UserRole = 's' | 't';

/**
 * Panel SQL rol hiyerarşisi (profiles.role): 'student' | 'teacher' | 'admin'.
 * App'te 't' tek değeri teacher VE admin'i kapsıyordu — bu yüzden yönetici ile
 * öğretmen aynı rolde görünüyordu. Artık profileRole ayrımı var:
 *   - admin   → her şeyi yapar, öğretmene yetki verir (panelde)
 *   - teacher → yalnızca profiles.perms içinde işaretli yetkileri kullanır
 *   - student → öğretmen/yönetici kontrolündedir
 */
export type ProfileRole = 'student' | 'teacher' | 'admin';

/** Panel index.html PERMS dizisiyle BİREBİR aynı anahtarlar (SQL has_perm/teaches). */
export type PermKey =
  | 'students.view'
  | 'students.create'
  | 'students.edit'
  | 'students.move'
  | 'students.password'
  | 'students.deactivate'
  | 'students.delete'
  | 'classes.manage'
  | 'topics.manage'
  | 'words.manage'
  | 'homework.manage'
  | 'lessons.manage'
  | 'attendance.take'
  | 'messages.send'
  | 'stats.view'
  | 'all_classes';

export const ALL_PERMS: PermKey[] = [
  'students.view',
  'students.create',
  'students.edit',
  'students.move',
  'students.password',
  'students.deactivate',
  'students.delete',
  'classes.manage',
  'topics.manage',
  'words.manage',
  'homework.manage',
  'lessons.manage',
  'attendance.take',
  'messages.send',
  'stats.view',
  'all_classes',
];

export type Perms = Partial<Record<PermKey, boolean>>;

export interface User {
  name: string;
  role: UserRole;
  /** Supabase profiles.role ('student'|'teacher'|'admin'). Eksikse eski oturum: 't' → teacher varsayılır. */
  profileRole?: ProfileRole;
  /** Panelin öğretmene verdiği yetkiler (profiles.perms). Admin'de tümü açık kabul edilir. */
  perms?: Perms;
  email: string;
  pw: string;
  phone: string;
  nf: {
    lesson: boolean;
    hw: boolean;
    news: boolean;
  };
  si: string | null; // öğrenci kimliği (Student.id); öğretmen için null
}

/** Kullanıcının bir işlemi yapıp yapamayacağı — panel SQL has_perm() ile aynı mantık. */
export function userCan(u: Pick<User, 'role' | 'profileRole' | 'perms'> | null, p: PermKey): boolean {
  if (!u || u.role !== 't') return false;
  if (u.profileRole === 'admin') return true;
  return !!(u.perms && u.perms[p]);
}

export interface StudentAvatar {
  img?: string | null;
  emo?: string;
  col?: string;
}

export interface StudentProgress {
  score: number | null;
  text: string;
}

export interface ActivePuzzle {
  id: number;
  n: number;
}

export interface Student {
  id: string; // stabil kimlik (UUID) — indeks referanslarının yerini alır
  n: string;
  lv: string;
  p: number;
  a: string; // attendance string, e.g. "gggygg"
  c: string; // class id
  e: string; // email
  pw: string;
  h: Record<string, StudentProgress>; // ödev id -> yanıt
  goal: number;
  kn: number[]; // known word IDs
  must?: boolean; // must change password
  off?: boolean; // is inactive
  tp?: string[]; // visible topic IDs
  cp: number[]; // completed puzzle IDs
  td: Record<string, boolean>; // completed topics
  sd: Record<string, boolean>; // completed subtopics
  nxt: number; // next puzzle counter
  tc: number; // successful test count
  wl: number; // words learned count
  tpass: Record<string, boolean>; // tests passed >= pass_mark (panel ayarı)
  day?: { d: string; n: number }; // daily word study progress
  rem?: { on: boolean; time: string };
  act?: ActivePuzzle | null;
  /** Panel Edge Function (create_student) ile açılan Supabase hesabının uuid'si.
   * Yalnızca oluşturma anında id haritasını yazmak için kullanılır; kalıcı veri değil. */
  remoteStudentUuid?: string;
  av?: StudentAvatar;
  cnt?: Record<string, number>; // test count tracker
}

export type QuestionKind = 'mc' | 'fill' | 'order' | 'listen';

export interface BaseQuestion {
  k: QuestionKind;
  q?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  k: 'mc';
  q: string;
  o: string[];
  c?: string;
  a?: number;
}

export interface FillBlankQuestion extends BaseQuestion {
  k: 'fill';
  q: string;
  h?: string;
  a: string | string[];
}

export interface OrderQuestion extends BaseQuestion {
  k: 'order';
  q: string;
  w: string[];
}

export interface ListenQuestion extends BaseQuestion {
  k: 'listen';
  s: string;
  o: string[];
}

export type Question = MultipleChoiceQuestion | FillBlankQuestion | OrderQuestion | ListenQuestion;

export interface SubTopic {
  id: string;
  t: string;
  exp: string;
  from?: string;
  until?: string;
  imgs: string[];
}

export interface Topic {
  id: string;
  ic: string;
  t: string;
  d: string;
  exp: string;
  lv?: string;
  from?: string;
  until?: string;
  ex: [string, string][];
  words: [string, string][];
  q: Question[];
  subs: SubTopic[];
}

export interface WordItem {
  id: number;
  e: string;
  tr: string;
  ph: string;
  ex: string;
  lv: string;
}

export interface Homework {
  id: number;
  t: string;
  d?: string;
  due: string;
  type: 'write' | 'ex' | 'test';
  topic: string;
  score?: number | null;
  text?: string;
  to: string[]; // atanan öğrenci id'leri
  q: Question[];
  pass?: number;
}

export interface ClassGroup {
  id: string;
  n: string;
}

export interface LessonSchedule {
  id: number;
  t: string;
  d: string;
  h: string;
  rep: boolean;
  stu: string[]; // katılımcı öğrenci id'leri
  skip?: string[];
}

export interface NotificationItem {
  si: string | 't' | null; // hedef öğrenci id'si ya da 't' (öğretmen)
  t: string;
  m: string;
  at: Date | string;
}

export interface BroadcastMessage {
  id: number;
  t: string;
  m: string;
  to: string[]; // hedef öğrenci id'leri
  when: number | null;
  sent: boolean;
  sentAt?: Date | string;
}
