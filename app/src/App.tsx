/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Student,
  Topic,
  WordItem,
  Homework,
  ClassGroup,
  LessonSchedule,
  NotificationItem,
  BroadcastMessage,
  Question,
} from './types.ts';
import {
  loadDatabase,
  saveDatabase,
  genId,
} from './utils/storage.ts';
import { syncStudentProgress, syncFromSupabase, loadIdMap } from './utils/supabaseSync.ts';
import { supabase } from './lib/supabase.ts';
import {
  shuf,
  today,
  wstat,
  psize,
  pn,
  setHwRecord,
  dedupeOptions,
  quizPoints,
  lvl,
  iso,
} from './utils/logic.ts';
import { AndroidFrame } from './components/AndroidFrame.tsx';
import { Navigation } from './components/Navigation.tsx';
import { Toast, ToastData } from './components/Toast.tsx';
import { CelebrationModal, CelebrationData } from './components/CelebrationModal.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Views
import { LoginView } from './views/LoginView.tsx';
import { ForcePasswordView } from './views/ForcePasswordView.tsx';
import { HomeView } from './views/HomeView.tsx';
import { TopicView } from './views/TopicView.tsx';
import { SubTopicView } from './views/SubTopicView.tsx';
import { QuizView } from './views/QuizView.tsx';
import { QuizResultView } from './views/QuizResultView.tsx';
import { FlashcardsView } from './views/FlashcardsView.tsx';
import { HomeworkView } from './views/HomeworkView.tsx';
import { WritingHomeworkView } from './views/WritingHomeworkView.tsx';
import { CalendarView } from './views/CalendarView.tsx';
import { NotificationsView } from './views/NotificationsView.tsx';
import { AccountView } from './views/AccountView.tsx';
import { BadgesView } from './views/BadgesView.tsx';
import { LeaderboardView } from './views/LeaderboardView.tsx';

// Teacher Views
import { StudentsView } from './views/StudentsView.tsx';
import { StudentDetailView } from './views/StudentDetailView.tsx';
import { ClassesEditorView } from './views/ClassesEditorView.tsx';
import { TeacherCalendarView } from './views/TeacherCalendarView.tsx';
import { LessonEditorView } from './views/LessonEditorView.tsx';
import { AttendanceView } from './views/AttendanceView.tsx';
import { TeacherCoursesView } from './views/TeacherCoursesView.tsx';
import { TopicEditorView } from './views/TopicEditorView.tsx';
import { SubTopicEditorView } from './views/SubTopicEditorView.tsx';
import { HomeworkEditorView } from './views/HomeworkEditorView.tsx';
import { TeacherNotificationsView } from './views/TeacherNotificationsView.tsx';

type ScreenState =
  | { screen: 'main' }
  | { screen: 'topic'; id: string }
  | { screen: 'sub'; id: string; sid: string }
  | { screen: 'quiz'; key: string; name: string; qs: Question[]; hwId?: number }
  | { screen: 'res'; key: string; name: string; score: number; total: number; hwId?: number }
  | { screen: 'cards'; deck: WordItem[] }
  | { screen: 'write'; hwId: number }
  | { screen: 'stu-detail'; studentId: string }
  | { screen: 'cls' }
  | { screen: 'ted'; id: string }
  | { screen: 'sed'; id: string; sid: string }
  | { screen: 'hed'; hwId: number }
  | { screen: 'led'; lid: number; oc?: number | null }
  | { screen: 'badges' }
  | { screen: 'rank' };

/** Referans alınan içerik bulunamadığında gösterilen güvenli ara ekran. */
const MissingScreen: React.FC<{ label: string; onBack: () => void }> = ({ label, onBack }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
    <span className="text-5xl">🧭</span>
    <h2 className="text-lg font-black text-[var(--ink)]">{label} bulunamadı</h2>
    <p className="text-xs text-[var(--mute)] max-w-xs">
      Bu içerik silinmiş olabilir ya da henüz cihazına ulaşmadı. Ana ekrandan tekrar deneyebilirsin.
    </p>
    <button
      type="button"
      onClick={onBack}
      className="py-3 px-6 rounded-xl font-extrabold text-sm text-white cursor-pointer shadow-md"
      style={{ backgroundColor: 'var(--pri)' }}
    >
      ‹ Ana ekran
    </button>
  </div>
);

export default function App() {
  const [db, setDb] = useState(loadDatabase);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('eb_session_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('home');
  const [screenState, setScreenState] = useState<ScreenState>({ screen: 'main' });
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto');
  const [lastScores, setLastScores] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<ToastData | null>(null);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  // Sync database with localStorage
  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  // Sync user session
  useEffect(() => {
    if (user) {
      localStorage.setItem('eb_session_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('eb_session_user');
    }
  }, [user]);

  // Apply theme
  useEffect(() => {
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Show Toast
  const showToast = useCallback((title: string, message: string) => {
    setToast({ title, message });
    setTimeout(() => {
      setToast((cur) => (cur?.title === title ? null : cur));
    }, 6000);
  }, []);

  // Show Celebration
  const showCelebration = useCallback((title: string, message: string, puzzleId?: number) => {
    setCelebration({ title, message, puzzleId });
  }, []);

  // Periodic notifications ticker (every 15s)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      // Deliver scheduled broadcasts
      setDb((prev) => {
        let changed = false;
        let allNewNotifs: NotificationItem[] = [];
        const updatedBroadcasts = prev.broadcasts.map((b) => {
          if (!b.sent && b.when && b.when <= now) {
            changed = true;
            // Create notification for targets
            const newNotifs: NotificationItem[] = b.to.map((sid) => ({
              si: sid,
              t: `🔔 ${b.t}`,
              m: b.m,
              at: new Date(),
            }));
            allNewNotifs = [...allNewNotifs, ...newNotifs];
            return { ...b, sent: true, sentAt: new Date() };
          }
          return b;
        });

        if (changed) {
          // prev mutasyonu kaldırıldı: çift bildirim gönderimine yol açıyordu
          return { ...prev, broadcasts: updatedBroadcasts, notifications: [...allNewNotifs, ...prev.notifications] };
        }
        return prev;
      });
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  // Otomatik içerik yenileme: öğretmenin/panelin eklediği veriler oturum açıkken de görünsün
  // (60 sn polling + Supabase realtime — login anındaki tek senkron sorunu burada çözüldü)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const refreshContent = async () => {
      try {
        const fresh = await syncFromSupabase(loadDatabase());
        if (cancelled) return;
        setDb((prev) => {
          // Öğrenci ilerlemesi lokalde tutulur; içerik tabloları sunucudan gelir
          const merged = {
            ...prev,
            classes: fresh.classes,
            words: fresh.words,
            topics: fresh.topics,
            homeworks: fresh.homeworks,
            notifications: fresh.notifications,
            students: prev.students.map((ps) => {
              const fs = fresh.students.find((x) => x.id === ps.id);
              return fs ? { ...ps, tp: fs.tp } : ps; // sadece erişim listesi senkronlanır
            }),
          };
          saveDatabase(merged);
          return merged;
        });
      } catch (err) {
        console.warn('İçerik yenileme başarısız (çevrimdışı olabilir):', err);
      }
    };

    const poll = setInterval(refreshContent, 60_000);
    refreshContent();

    // Realtime: panelde bir içerik değiştiği anda debounce ile çek
    let rtCleanup: (() => void) | null = null;
    (async () => {
      if (cancelled) return;
      try {
        let debounce: ReturnType<typeof setTimeout> | null = null;
        const onChange = () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(refreshContent, 1500);
        };
        ['topics', 'subtopics', 'questions', 'words', 'homework', 'homework_targets', 'topic_access', 'notifications'].forEach((table) => {
          supabase
            .channel(`rt-${table}`)
            .on('postgres_changes', { schema: 'public', event: '*', table }, onChange)
            .subscribe();
        });
        rtCleanup = () => {
          if (debounce) clearTimeout(debounce);
          supabase.removeAllChannels();
        };
      } catch {
        /* realtime yoksa polling zaten çalışıyor */
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (rtCleanup) rtCleanup();
    };
  }, [user]);

  // Handlers for Students Puzzle & Completion (öğrenci STABİL id'si ile çalışır)
  const addPuzzlePiece = (studentId: string) => {
    setDb((prev) => {
      const idx = prev.students.findIndex((x) => x.id === studentId);
      if (idx < 0) return prev;
      const students = [...prev.students];
      const s = { ...students[idx] };

      s.act = s.act ? { ...s.act } : { id: ++s.nxt, n: 0 };
      s.act.n++;

      const targetPieces = psize(s.act.id);
      if (s.act.n >= targetPieces) {
        s.cp = [...s.cp, s.act.id];
        const completedId = s.act.id;
        s.act = null;
        showCelebration('🧩 Yapboz tamamlandı!', pn(completedId), completedId);
      } else {
        showToast('🧩 Yeni yapboz parçası!', `${pn(s.act.id)} · ${s.act.n}/${targetPieces}`);
      }

      students[idx] = s;
      return { ...prev, students };
    });
  };

  const handleWordLearned = (wordId: number) => {
    if (!user || user.role !== 's' || !user.si) return;
    const sid = user.si;

    setDb((prev) => {
      const idx = prev.students.findIndex((x) => x.id === sid);
      if (idx < 0) return prev;
      const students = [...prev.students];
      let s = { ...students[idx] };

      if (!s.kn.includes(wordId)) {
        s.kn = [...s.kn, wordId];
        s.wl = (s.wl || 0) + 1;
        if (s.wl % 10 === 0) {
          setTimeout(() => addPuzzlePiece(sid), 500);
        }
      }

      const d = wstat({ ...s });
      s.day = { d: d.d, n: d.n + 1 };

      // Günlük seri (streak): bugün çalışılan günler listesine işlenir
      const dzToday = iso(new Date());
      if (!(s.dz || []).includes(dzToday)) {
        s.dz = [...(s.dz || []), dzToday];
      }

      students[idx] = s;
      return { ...prev, students };
    });
  };

  const handleCompleteTopic = (topicId: string) => {
    if (!user || user.role !== 's' || !user.si) return;
    const sid = user.si;

    setDb((prev) => {
      const idx = prev.students.findIndex((x) => x.id === sid);
      if (idx < 0) return prev;
      const students = [...prev.students];
      const s = { ...students[idx] };
      const topic = prev.topics.find((t) => t.id === topicId);
      if (!topic || s.td[topicId]) return prev;

      s.td = { ...s.td, [topicId]: true };
      const nextId = ++s.nxt;
      s.cp = [...s.cp, nextId];

      // Konu bitirme bonusu: +20 puan
      const beforeLvl = lvl(s.p || 0).level;
      s.p = (s.p || 0) + 20;
      if (lvl(s.p).level > beforeLvl) {
        setTimeout(
          () => showCelebration(`🏅 Seviye ${lvl(s.p).level}!`, `Toplam ${s.p} puana ulaştın.`),
          1200
        );
      }

      students[idx] = s;

      showCelebration('🎉 Konu tamamlandı!', topic.t, nextId);
      return { ...prev, students };
    });
  };

  const handleSubTopicDone = (topicId: string, subId: string) => {
    if (!user || user.role !== 's' || !user.si) return;
    const sid = user.si;

    setDb((prev) => {
      const idx = prev.students.findIndex((x) => x.id === sid);
      if (idx < 0) return prev;
      const students = [...prev.students];
      const s = { ...students[idx] };
      s.sd = { ...s.sd, [subId]: true };

      const topic = prev.topics.find((t) => t.id === topicId);
      if (topic) {
        const subs = topic.subs || [];
        const allSubsDone = subs.length > 0 && subs.every((sub) => s.sd[sub.id]);
        const testPassed = !topic.q.length || (s.tpass && s.tpass[topicId]);
        if (allSubsDone && testPassed && !s.td[topicId]) {
          setTimeout(() => handleCompleteTopic(topicId), 300);
        }
      }

      students[idx] = s;
      return { ...prev, students };
    });
  };

  const handleQuizFinish = (key: string, name: string, score: number, total: number, hwId?: number) => {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    setLastScores((prev) => ({ ...prev, [key]: pct }));

    if (user && user.role === 's' && user.si) {
      const sid = user.si;
      setDb((prev) => {
        const idx = prev.students.findIndex((x) => x.id === sid);
        if (idx < 0) return prev;
        const students = [...prev.students];
        let s = { ...students[idx] };

        // If topic test passed
        const topic = prev.topics.find((t) => t.id === key);
        if (topic && pct >= 60) {
          s.tpass = { ...s.tpass, [topic.id]: true };
          const subs = topic.subs || [];
          const allSubsDone = subs.every((sub) => s.sd[sub.id]);
          if (allSubsDone && !s.td[topic.id]) {
            setTimeout(() => handleCompleteTopic(topic.id), 500);
          }
        }

        // Puan + seviye sistemi: geçilen her test puan kazandırır
        const gained = quizPoints(score, total);
        if (gained > 0) {
          const before = lvl(s.p || 0).level;
          s.p = (s.p || 0) + gained;
          const after = lvl(s.p).level;
          if (after > before) {
            setTimeout(
              () => showCelebration(`🏅 Seviye ${after}!`, `Tebrikler, yeni seviyeye ulaştın. Toplam ${s.p} puan.`),
              800
            );
          }
        }
        if (pct === 100 && total > 0) s.bd = { ...s.bd, perfect: true };

        // Günlük seri: test çözmek de "çalışma" sayılır
        if (total > 0) {
          const dzToday = iso(new Date());
          if (!(s.dz || []).includes(dzToday)) s.dz = [...(s.dz || []), dzToday];
        }

        // Test count tracker for puzzle piece (each 5 test passes)
        s.cnt = s.cnt || {};
        const countKey = `${key}|${today()}`;
        if (pct >= 60 && !s.cnt[countKey]) {
          s.cnt = { ...s.cnt, [countKey]: 1 };
          s.tc = (s.tc || 0) + 1;
          if (s.tc % 5 === 0) {
            setTimeout(() => addPuzzlePiece(sid), 500);
          }
        }

        // If tied to homework — immütatif güncelleme
        if (hwId) {
          const hw = prev.homeworks.find((h) => h.id === hwId);
          if (hw) {
            const curHw = s.h?.[hwId] || { score: null, text: '' };
            s = setHwRecord(s, hwId, { score: Math.max(curHw.score || 0, pct) });
          }
        }

        students[idx] = s;
        return { ...prev, students };
      });
    }

    setScreenState({
      screen: 'res',
      key,
      name,
      score,
      total,
      hwId,
    });
  };

  // Helper to build quiz questions
  const getQuizQuestions = (key: string, hwId?: number): { name: string; qs: Question[] } => {
    if (key.startsWith('hw') || hwId) {
      const id = hwId || Number(key.replace('hw', ''));
      const h = db.homeworks.find((x) => x.id === id);
      return {
        name: h?.t || 'Ödev Testi',
        qs: shuf(h?.q || []),
      };
    }
    if (key === 'mix') {
      const allQs = db.topics.flatMap((t) => t.q);
      return {
        name: 'Karışık deneme',
        qs: shuf(allQs).slice(0, 10),
      };
    }
    if (key === 'word') {
      const currentLevel = currentStudent?.lv || 'A1';
      const words = db.words.filter((w) => w.lv === currentLevel);
      const generatedQs: Question[] = shuf(words)
        .slice(0, 8)
        .map((w) => {
          const wrongOptions = shuf(words.filter((x) => x.id !== w.id))
            .slice(0, 3)
            .map((x) => x.tr);
          const allOptions = dedupeOptions(shuf([w.tr, ...wrongOptions]));
          return {
            k: 'mc' as const,
            q: `“${w.e}” ne demek?`,
            o: allOptions,
            c: w.tr,
          };
        });
      return {
        name: 'Kelime avcısı',
        qs: generatedQs,
      };
    }

    const topic = db.topics.find((t) => t.id === key);
    return {
      name: topic ? `${topic.t} testi` : 'Test',
      qs: shuf(topic?.q || []),
    };
  };

  // Current student object (stabil id ile bulunur)
  const currentStudent =
    user && user.role === 's' && user.si ? db.students.find((s) => s.id === user.si) || null : null;

  // ---- Güvenli ekran yardımcıları: find(...)! çökme noktaları kaldırıldı ----
  const goMain = () => setScreenState({ screen: 'main' });
  const missingRef = (label: string) => {
    showToast('İçerik bulunamadı', `${label} artık mevcut değil ya da henüz senkronize edilmedi.`);
    goMain();
  };
  const topicOf = (id: string) => db.topics.find((t) => t.id === id);
  const homeworkOf = (id: number) => db.homeworks.find((h) => h.id === id);

  // Konu erişim yetkisini Supabase topic_access tablosuna kalıcı yaz (best-effort)
  const persistTopicAccess = (studentId: string, localTopicIds: string[]) => {
    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        const map = loadIdMap();
        // local topic id -> supabase uuid
        const sbTopicIds = localTopicIds
          .map((lid) => Object.entries(map.topics).find(([_, l]) => l === lid)?.[0])
          .filter(Boolean) as string[];
        // Öğrencinin supabase profil id'sini e-posta üzerinden bul
        const stu = db.students.find((x) => x.id === studentId);
        if (!stu?.e) return;
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', stu.e.toLowerCase())
          .maybeSingle();
        if (!prof) return;
        await supabase.from('topic_access').delete().eq('student_id', prof.id);
        if (sbTopicIds.length) {
          await supabase
            .from('topic_access')
            .insert(sbTopicIds.map((tid) => ({ student_id: prof.id, topic_id: tid })));
        }
      } catch (err) {
        console.warn('topic_access senkronu başarısız (çevrimdışı olabilir):', err);
      }
    })();
  };

  // Öğrenci ilerlemesini Supabase'e kaydet (debounce) — state updater içinde yan etki yerine temiz effect
  useEffect(() => {
    if (!currentStudent) return;
    const t = setTimeout(() => syncStudentProgress(currentStudent), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentStudent?.kn,
    currentStudent?.td,
    currentStudent?.sd,
    currentStudent?.cp,
    currentStudent?.h,
    currentStudent?.wl,
    currentStudent?.tc,
  ]);

  return (
    <ErrorBoundary>
    <AndroidFrame theme={theme}>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <CelebrationModal
        data={celebration}
        onClose={() => setCelebration(null)}
      />

      {/* Main View Router */}
      <main id="view" className="flex-1 flex flex-col overflow-hidden" aria-live="polite">
        {!user ? (
          <LoginView
            students={db.students}
            onDbUpdate={(newDb) => setDb(newDb)}
            onLogin={(newUser) => {
              const fullUser: User = {
                ...newUser,
                phone: '',
                nf: { lesson: true, hw: true, news: true },
              };
              setUser(fullUser);
              setActiveTab(newUser.role === 't' ? 'stu' : 'home');
              setScreenState({ screen: 'main' });
            }}
          />
        ) : user.role === 's' && currentStudent?.must ? (
          <ForcePasswordView
            currentPassword={user.pw}
            onSubmit={(newPw) => {
              const sid = user.si;
              setDb((prev) => {
                const idx = prev.students.findIndex((x) => x.id === sid);
                if (idx < 0) return prev;
                const students = [...prev.students];
                students[idx] = { ...students[idx], pw: newPw, must: false };
                return { ...prev, students };
              });
              setUser({ ...user, pw: newPw });
              // Şifre değişikliğini Supabase profiline de işle (tek yönlü lokal güncelleme veri kaybına yol açıyordu)
              (async () => {
                try {
                            const { data: { user: authUser } } = await supabase.auth.getUser();
                  if (authUser) {
                    await supabase
                      .from('profiles')
                      .update({ must_change_password: false })
                      .eq('id', authUser.id);
                  }
                } catch {}
              })();
              showToast('Şifre Belirlendi', 'Yeni şifreniz başarıyla kaydedildi.');
            }}
          />
        ) : screenState.screen === 'quiz' ? (
          <QuizView
            quizKey={screenState.key}
            name={screenState.name}
            questions={screenState.qs}
            onExit={() => setScreenState({ screen: 'main' })}
            onFinish={(score, total) =>
              handleQuizFinish(screenState.key, screenState.name, score, total, screenState.hwId)
            }
          />
        ) : screenState.screen === 'res' ? (
          <QuizResultView
            name={screenState.name}
            score={screenState.score}
            total={screenState.total}
            isTopicTest={db.topics.some((t) => t.id === screenState.key)}
            isHomework={!!screenState.hwId}
            onRetry={() => {
              const quiz = getQuizQuestions(screenState.key, screenState.hwId);
              setScreenState({
                screen: 'quiz',
                key: screenState.key,
                name: quiz.name,
                qs: quiz.qs,
                hwId: screenState.hwId,
              });
            }}
            onBack={() => setScreenState({ screen: 'main' })}
          />
        ) : screenState.screen === 'cards' ? (
          currentStudent && screenState.deck.length > 0 ? (
            <FlashcardsView
              deck={screenState.deck}
              student={currentStudent}
              onExit={() => setScreenState({ screen: 'main' })}
              onWordKnown={handleWordLearned}
            />
          ) : (
            <MissingScreen onBack={goMain} label="Kelime kartları" />
          )
        ) : screenState.screen === 'topic' ? (() => {
          const t = topicOf(screenState.id);
          return t && currentStudent ? (
            <TopicView
              topic={t}
              student={currentStudent}
              onBack={() => setScreenState({ screen: 'main' })}
              onOpenSubTopic={(sid) =>
                setScreenState({ screen: 'sub', id: screenState.id, sid })
              }
              onStartQuiz={(topicId) => {
                const quiz = getQuizQuestions(topicId);
                if (!quiz.qs.length) {
                  showToast('Test hazır değil', 'Bu konuda henüz soru yok.');
                  return;
                }
                setScreenState({
                  screen: 'quiz',
                  key: topicId,
                  name: quiz.name,
                  qs: quiz.qs,
                });
              }}
            />
          ) : (
            <MissingScreen onBack={goMain} label="Konu" />
          );
        })() : screenState.screen === 'sub' ? (() => {
            const t = topicOf(screenState.id);
            const sub = t?.subs?.find((x) => x.id === screenState.sid);
            return t && sub && currentStudent ? (
              <SubTopicView
                topic={t}
                subTopic={sub}
                student={currentStudent}
                onBack={() => setScreenState({ screen: 'topic', id: screenState.id })}
                onMarkComplete={() => {
                  handleSubTopicDone(screenState.id, screenState.sid);
                  setScreenState({ screen: 'topic', id: screenState.id });
                }}
              />
            ) : (
              <MissingScreen onBack={goMain} label="Alt konu" />
            );
          })() : screenState.screen === 'write' ? (() => {
            const hw = homeworkOf(screenState.hwId);
            return hw && currentStudent ? (
              <WritingHomeworkView
                homework={hw}
                student={currentStudent}
                onBack={() => setScreenState({ screen: 'main' })}
                onSubmit={(text) => {
                  const sid = user.si!;
                  setDb((prev) => {
                    const idx = prev.students.findIndex((x) => x.id === sid);
                    if (idx < 0) return prev;
                    const s = { ...prev.students[idx] };
                    s.h = {
                      ...s.h,
                      [screenState.hwId]: { score: null, text },
                    };
                    const students = [...prev.students];
                    students[idx] = s;
                    return { ...prev, students };
                  });
                  showToast('Ödev Teslim Edildi', 'Yazılı ödeviniz öğretmeninize iletildi.');
                  setScreenState({ screen: 'main' });
                }}
              />
            ) : (
              <MissingScreen onBack={goMain} label="Ödev" />
            );
          })() : screenState.screen === 'ted' ? (() => {
            const t = topicOf(screenState.id);
            return t ? (
          <TopicEditorView
            topic={t}
            classes={db.classes}
            students={db.students}
            onBack={() => setScreenState({ screen: 'main' })}
            onSave={(updated) => {
              setDb((prev) => ({
                ...prev,
                topics: prev.topics.map((t) => (t.id === updated.id ? updated : t)),
              }));
              showToast('Kaydedildi', 'Konu içeriği güncellendi.');
            }}
            onDelete={(tid) => {
              setDb((prev) => ({
                ...prev,
                topics: prev.topics.filter((t) => t.id !== tid),
              }));
              setScreenState({ screen: 'main' });
              showToast('Silindi', 'Konu başarıyla silindi.');
            }}
            onOpenSubTopicEditor={(sid) =>
              setScreenState({ screen: 'sed', id: screenState.id, sid })
            }
            onAddSubTopic={() => {
              const newSub = {
                id: `s${Date.now()}`,
                t: 'Yeni alt konu',
                exp: '',
                imgs: [],
              };
              setDb((prev) => ({
                ...prev,
                topics: prev.topics.map((t) =>
                  t.id === screenState.id
                    ? { ...t, subs: [...(t.subs || []), newSub] }
                    : t
                ),
              }));
              setScreenState({ screen: 'sed', id: screenState.id, sid: newSub.id });
            }}
            onUpdateStudentPermissions={(studentId, newTopics) => {
              setDb((prev) => {
                const idx = prev.students.findIndex((x) => x.id === studentId);
                if (idx < 0) return prev;
                const students = [...prev.students];
                students[idx] = {
                  ...students[idx],
                  tp: newTopics,
                };
                return { ...prev, students };
              });
              // Yetkiyi Supabase topic_access tablosuna da yaz — sadece localStorage'a
              // yazmak öğretmenin verdiği erişimi öğrencinin diğer cihazına/paneline taşımıyordu.
              persistTopicAccess(studentId, newTopics);
            }}
          />
            ) : (
              <MissingScreen onBack={goMain} label="Konu düzenleme" />
            );
          })() : screenState.screen === 'sed' ? (() => {
            const t = topicOf(screenState.id);
            const sub = t?.subs?.find((x) => x.id === screenState.sid);
            return t && sub ? (
          <SubTopicEditorView
            topic={t}
            subTopic={sub}
            onBack={() => setScreenState({ screen: 'ted', id: screenState.id })}
            onSave={(updated) => {
              setDb((prev) => ({
                ...prev,
                topics: prev.topics.map((t) =>
                  t.id === screenState.id
                    ? {
                        ...t,
                        subs: t.subs.map((s) => (s.id === updated.id ? updated : s)),
                      }
                    : t
                ),
              }));
              showToast('Kaydedildi', 'Alt konu güncellendi.');
            }}
            onDelete={(sid) => {
              setDb((prev) => ({
                ...prev,
                topics: prev.topics.map((t) =>
                  t.id === screenState.id
                    ? { ...t, subs: t.subs.filter((s) => s.id !== sid) }
                    : t
                ),
              }));
              setScreenState({ screen: 'ted', id: screenState.id });
              showToast('Silindi', 'Alt konu silindi.');
            }}
          />
            ) : (
              <MissingScreen onBack={goMain} label="Alt konu düzenleme" />
            );
          })() : screenState.screen === 'hed' ? (() => {
            const hw = homeworkOf(screenState.hwId);
            return hw ? (
          <HomeworkEditorView
            homework={hw}
            students={db.students}
            classes={db.classes}
            allTopics={db.topics}
            onBack={() => setScreenState({ screen: 'main' })}
            onSave={(updated) => {
              setDb((prev) => ({
                ...prev,
                homeworks: prev.homeworks.map((h) => (h.id === updated.id ? updated : h)),
              }));
              showToast('Kaydedildi', 'Ödev güncellendi.');
            }}
            onDelete={(hid) => {
              setDb((prev) => ({
                ...prev,
                homeworks: prev.homeworks.filter((h) => h.id !== hid),
              }));
              setScreenState({ screen: 'main' });
              showToast('Silindi', 'Ödev silindi.');
            }}
          />
            ) : (
              <MissingScreen onBack={goMain} label="Ödev düzenleme" />
            );
          })() : screenState.screen === 'led' ? (() => {
            const lesson = db.lessons.find((l) => l.id === screenState.lid);
            return lesson ? (
          <LessonEditorView
            lesson={lesson}
            occurrenceTime={screenState.oc}
            students={db.students}
            classes={db.classes}
            onBack={() => setScreenState({ screen: 'main' })}
            onSave={(updated) => {
              setDb((prev) => ({
                ...prev,
                lessons: prev.lessons.map((l) => (l.id === updated.id ? updated : l)),
              }));
              showToast('Kaydedildi', 'Ders programı güncellendi.');
            }}
            onDelete={(lid) => {
              setDb((prev) => ({
                ...prev,
                lessons: prev.lessons.filter((l) => l.id !== lid),
              }));
              setScreenState({ screen: 'main' });
              showToast('Silindi', 'Ders silindi.');
            }}
          />
            ) : (
              <MissingScreen onBack={goMain} label="Ders düzenleme" />
            );
          })() : screenState.screen === 'stu-detail' ? (() => {
            const stu = db.students.find((x) => x.id === screenState.studentId);
            return stu ? (
          <StudentDetailView
            student={stu}
            classes={db.classes}
            allTopics={db.topics}
            allWords={db.words}
            sessions={db.sessions}
            onBack={() => setScreenState({ screen: 'main' })}
            onUpdateStudent={(updated) => {
              setDb((prev) => {
                const idx = prev.students.findIndex((x) => x.id === updated.id);
                if (idx < 0) return prev;
                const students = [...prev.students];
                students[idx] = updated;
                return { ...prev, students };
              });
              showToast('Güncellendi', `${updated.n} bilgileri kaydedildi.`);
            }}
          />
            ) : (
              <MissingScreen onBack={goMain} label="Öğrenci detayı" />
            );
          })() : screenState.screen === 'badges' ? (
          currentStudent ? (
          <BadgesView student={currentStudent} onBack={() => setScreenState({ screen: 'main' })} />
          ) : (
            <MissingScreen onBack={goMain} label="Başarımlar" />
          )
        ) : screenState.screen === 'rank' ? (
          <LeaderboardView
            students={db.students}
            classes={db.classes}
            currentStudentId={user?.role === 's' ? user.si : undefined}
            classFilter={user?.role === 's' ? currentStudent?.c : undefined}
            onBack={() => setScreenState({ screen: 'main' })}
          />
        ) : screenState.screen === 'cls' ? (
          <ClassesEditorView
            classes={db.classes}
            students={db.students}
            onBack={() => setScreenState({ screen: 'main' })}
            onSaveClassNames={(updated) => {
              setDb((prev) => ({ ...prev, classes: updated }));
              showToast('Kaydedildi', 'Sınıf adları güncellendi.');
            }}
            onAddClass={(name) => {
              setDb((prev) => ({
                ...prev,
                classes: [...prev.classes, { id: `c${Date.now()}`, n: name }],
              }));
              showToast('Eklendi', `${name} sınıfı oluşturuldu.`);
            }}
            onDeleteClass={(cid) => {
              setDb((prev) => ({
                ...prev,
                classes: prev.classes.filter((c) => c.id !== cid),
              }));
              showToast('Silindi', 'Sınıf silindi.');
            }}
          />
        ) : (
          /* Main Tab Routing */
          <>
            {user.role === 's' && currentStudent && (
              <>
                {activeTab === 'home' && (
                  <HomeView
                    student={currentStudent}
                    allTopics={db.topics}
                    allWords={db.words}
                    lastScores={lastScores}
                    onOpenTopic={(id) => setScreenState({ screen: 'topic', id })}
                    onStartQuiz={(key) => {
                      const quiz = getQuizQuestions(key);
                      setScreenState({
                        screen: 'quiz',
                        key,
                        name: quiz.name,
                        qs: quiz.qs,
                      });
                    }}
                    onStartCards={() => {
                      const levelWords = db.words.filter((w) => w.lv === currentStudent.lv);
                      const targetCount = currentStudent.goal;
                      const pool = [
                        ...shuf(levelWords.filter((w) => !currentStudent.kn.includes(w.id))),
                        ...shuf(levelWords.filter((w) => currentStudent.kn.includes(w.id))),
                      ];
                      // Havuz boşsa (seviyeye uygun kelime yok) deck'i undefined
                      // elemanlarla doldurmak FlashcardsView'da çökmeye yol açıyordu.
                      if (!pool.length) {
                        showToast('Kelime yok', 'Seviyene uygun kelime henüz eklenmemiş.');
                        return;
                      }
                      const deck = Array.from(
                        { length: Math.min(targetCount, pool.length) },
                        (_, i) => pool[i % pool.length],
                      ).filter(Boolean);
                      setScreenState({ screen: 'cards', deck });
                    }}
                    onUpdateGoal={(newGoal) => {
                      const sid = user.si!;
                      setDb((prev) => {
                        const idx = prev.students.findIndex((x) => x.id === sid);
                        if (idx < 0) return prev;
                        const students = [...prev.students];
                        students[idx] = { ...students[idx], goal: newGoal };
                        return { ...prev, students };
                      });
                    }}
                    onUpdateReminder={(on, time) => {
                      const sid = user.si!;
                      setDb((prev) => {
                        const idx = prev.students.findIndex((x) => x.id === sid);
                        if (idx < 0) return prev;
                        const students = [...prev.students];
                        students[idx] = {
                          ...students[idx],
                          rem: { on, time },
                        };
                        return { ...prev, students };
                      });
                      if (on) showToast('Hatırlatıcı Açıldı', `Her gün saat ${time} için hatırlandı.`);
                    }}
                    onOpenBadges={() => setScreenState({ screen: 'badges' })}
                    onOpenLeaderboard={() => setScreenState({ screen: 'rank' })}
                  />
                )}

                {activeTab === 'cal' && (
                  <CalendarView
                    student={currentStudent}
                    allLessons={db.lessons}
                    sessions={db.sessions}
                  />
                )}

                {activeTab === 'hw' && (
                  <HomeworkView
                    student={currentStudent}
                    allHomeworks={db.homeworks}
                    allTopics={db.topics}
                    onStartWriting={(hwId) => setScreenState({ screen: 'write', hwId })}
                    onStartQuiz={(key, hwId) => {
                      const quiz = getQuizQuestions(key, hwId);
                      setScreenState({
                        screen: 'quiz',
                        key,
                        name: quiz.name,
                        qs: quiz.qs,
                        hwId,
                      });
                    }}
                  />
                )}

                {activeTab === 'news' && (
                  <NotificationsView
                    notifications={db.notifications}
                    studentId={user.si}
                  />
                )}

                {activeTab === 'acc' && (
                  <AccountView
                    user={user}
                    students={db.students}
                    classes={db.classes}
                    theme={theme}
                    onUpdateUser={(updated) => {
                      setUser((cur) => (cur ? { ...cur, ...updated } : null));
                      if ((updated.name || updated.email) && user.si) {
                        const sid = user.si;
                        setDb((prev) => {
                          const idx = prev.students.findIndex((x) => x.id === sid);
                          if (idx < 0) return prev;
                          const students = [...prev.students];
                          students[idx] = {
                            ...students[idx],
                            n: updated.name || students[idx].n,
                            e: updated.email || students[idx].e,
                          };
                          return { ...prev, students };
                        });
                      }
                      showToast('Güncellendi', 'Hesap bilgileri kaydedildi.');
                    }}
                    onUpdateStudentAvatar={(av) => {
                      const sid = user.si!;
                      setDb((prev) => {
                        const idx = prev.students.findIndex((x) => x.id === sid);
                        if (idx < 0) return prev;
                        const students = [...prev.students];
                        students[idx] = {
                          ...students[idx],
                          av,
                        };
                        return { ...prev, students };
                      });
                    }}
                    onSetTheme={setTheme}
                    onLogout={async () => {
                      try {
                                        await supabase.auth.signOut();
                      } catch {}
                      setUser(null);
                      setScreenState({ screen: 'main' });
                    }}
                    onDeleteAccount={() => {
                      const sid = user.si;
                      setDb((prev) => ({
                        ...prev,
                        students: prev.students.filter((x) => x.id !== sid),
                      }));
                      setUser(null);
                      setScreenState({ screen: 'main' });
                    }}
                  />
                )}
              </>
            )}

            {user.role === 't' && (
              <>
                {activeTab === 'stu' && (
                  <StudentsView
                    students={db.students}
                    classes={db.classes}
                    allTopics={db.topics}
                    sessions={db.sessions}
                    onOpenClassEditor={() => setScreenState({ screen: 'cls' })}
                    onSelectStudent={(studentId) =>
                      setScreenState({ screen: 'stu-detail', studentId })
                    }
                    onCreateStudent={(newStudent) => {
                      setDb((prev) => ({
                        ...prev,
                        students: [
                          ...prev.students,
                          { ...(newStudent as Student), id: (newStudent as Student).id || genId() },
                        ],
                      }));
                      showToast('Hesap Hazır', `${newStudent.n} hesabı başarıyla oluşturuldu.`);
                    }}
                  />
                )}

                {activeTab === 'cal' && (
                  <TeacherCalendarView
                    lessons={db.lessons}
                    notifications={db.notifications}
                    onOpenLesson={(lid, oc) =>
                      setScreenState({ screen: 'led', lid, oc })
                    }
                    onNewLesson={() => {
                      const newLesson: LessonSchedule = {
                        id: Date.now(),
                        t: 'Yeni ders',
                        d: new Date().toISOString().split('T')[0],
                        h: '18:00',
                        rep: false,
                        stu: [],
                      };
                      setDb((prev) => ({
                        ...prev,
                        lessons: [...prev.lessons, newLesson],
                      }));
                      setScreenState({ screen: 'led', lid: newLesson.id });
                    }}
                  />
                )}

                {activeTab === 'home' && (
                  <TeacherCoursesView
                    topics={db.topics}
                    words={db.words}
                    homeworks={db.homeworks}
                    students={db.students}
                    onOpenTopicEditor={(id) => setScreenState({ screen: 'ted', id })}
                    onNewTopic={() => {
                      const newTopic: Topic = {
                        id: `x${Date.now()}`,
                        ic: '📘',
                        t: 'Yeni konu',
                        d: 'Kısa açıklama',
                        exp: '',
                        lv: 'A1',
                        ex: [],
                        words: [],
                        q: [],
                        subs: [],
                      };
                      setDb((prev) => ({
                        ...prev,
                        topics: [...prev.topics, newTopic],
                      }));
                      setScreenState({ screen: 'ted', id: newTopic.id });
                    }}
                    onSaveWord={(word) => {
                      setDb((prev) => {
                        if (word.id) {
                          return {
                            ...prev,
                            words: prev.words.map((w) => (w.id === word.id ? { ...w, ...word } as WordItem : w)),
                          };
                        }
                        const newWord: WordItem = {
                          id: Date.now(),
                          e: word.e!,
                          tr: word.tr!,
                          ph: word.ph || '',
                          ex: word.ex || '',
                          lv: word.lv || 'A1',
                        };
                        return { ...prev, words: [...prev.words, newWord] };
                      });
                      showToast('Kelime Kaydedildi', `${word.e} listeye eklendi.`);
                    }}
                    onDeleteWord={(wid) => {
                      setDb((prev) => ({
                        ...prev,
                        words: prev.words.filter((w) => w.id !== wid),
                      }));
                      showToast('Silindi', 'Kelime silindi.');
                    }}
                    onOpenHomeworkEditor={(hwId) => setScreenState({ screen: 'hed', hwId })}
                    onNewHomework={() => {
                      const newHw: Homework = {
                        id: Date.now(),
                        t: 'Yeni ödev',
                        d: '',
                        due: '',
                        type: 'write',
                        topic: '',
                        q: [],
                        to: db.students.map((s) => s.id),
                      };
                      setDb((prev) => ({
                        ...prev,
                        homeworks: [newHw, ...prev.homeworks],
                      }));
                      setScreenState({ screen: 'hed', hwId: newHw.id });
                    }}
                  />
                )}

                {activeTab === 'roll' && (
                  <AttendanceView
                    students={db.students}
                    classes={db.classes}
                    sessions={db.sessions}
                    sessionClasses={db.sessionClasses}
                    onSaveAttendance={(classId, sessionKey, attendanceMap) => {
                      const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
                      const todayLabel = `${new Date().getDate()} ${months[new Date().getMonth()]}`;

                      setDb((prev) => {
                        let newSessions = [...prev.sessions];
                        let newSessionClasses = [...prev.sessionClasses];

                        if (sessionKey === 'new') {
                          newSessions.push(todayLabel);
                          newSessionClasses.push(classId);
                        }

                        // Id tabanlı, immütatif güncelleme (yerinde mutasyon yerine)
                        const updatedStudents = prev.students.map((s) => {
                          const attMap = attendanceMap as Record<string, string>;
                          if (sessionKey === 'new') {
                            if (s.c === classId && !s.off) {
                              return { ...s, a: s.a + (attMap[s.id] || 'g') };
                            }
                            return { ...s, a: s.a + '-' };
                          }
                          if (s.c === classId && attMap[s.id]) {
                            const k = Number(sessionKey);
                            return { ...s, a: s.a.slice(0, k) + attMap[s.id] + s.a.slice(k + 1) };
                          }
                          return s;
                        });

                        return {
                          ...prev,
                          sessions: newSessions,
                          sessionClasses: newSessionClasses,
                          students: updatedStudents,
                        };
                      });

                      showToast('Yoklama Kaydedildi', 'Katılım durumları deftere işlendi.');
                    }}
                  />
                )}

                {activeTab === 'news' && (
                  <TeacherNotificationsView
                    students={db.students}
                    classes={db.classes}
                    broadcasts={db.broadcasts}
                    onSendMessage={(t, m, to, when) => {
                      const targetIds = to as string[];
                      const newBroadcast: BroadcastMessage = {
                        id: Date.now(),
                        t,
                        m,
                        to: targetIds,
                        when,
                        sent: when === null,
                        sentAt: when === null ? new Date() : undefined,
                      };

                      setDb((prev) => {
                        const newNotifs: NotificationItem[] =
                          when === null
                            ? targetIds.map((si: string) => ({
                                si,
                                t: `🔔 ${t}`,
                                m,
                                at: new Date(),
                              }))
                            : [];

                        return {
                          ...prev,
                          broadcasts: [newBroadcast, ...prev.broadcasts],
                          notifications: [...newNotifs, ...prev.notifications],
                        };
                      });

                      showToast(
                        when === null ? 'Gönderildi' : 'Planlandı',
                        `${to.length} öğrenciye ${when === null ? 'iletildi' : 'planlandı'}.`
                      );
                    }}
                    onDeliverNow={(msgId) => {
                      setDb((prev) => {
                        const targetBroadcast = prev.broadcasts.find((b) => b.id === msgId);
                        if (!targetBroadcast) return prev;

                        const newNotifs: NotificationItem[] = targetBroadcast.to.map((si) => ({
                          si,
                          t: `🔔 ${targetBroadcast.t}`,
                          m: targetBroadcast.m,
                          at: new Date(),
                        }));

                        return {
                          ...prev,
                          notifications: [...newNotifs, ...prev.notifications],
                          broadcasts: prev.broadcasts.map((b) =>
                            b.id === msgId ? { ...b, sent: true, sentAt: new Date() } : b
                          ),
                        };
                      });
                      showToast('İletildi', 'Bildirim öğrencilere anında ulaştırıldı.');
                    }}
                    onDeleteBroadcast={(msgId) => {
                      setDb((prev) => ({
                        ...prev,
                        broadcasts: prev.broadcasts.filter((b) => b.id !== msgId),
                      }));
                      showToast('Kaldırıldı', 'Bildirim silindi.');
                    }}
                  />
                )}

                {activeTab === 'acc' && (
                  <AccountView
                    user={user}
                    students={db.students}
                    classes={db.classes}
                    theme={theme}
                    onUpdateUser={(updated) => {
                      setUser((cur) => (cur ? { ...cur, ...updated } : null));
                      showToast('Güncellendi', 'Öğretmen profili güncellendi.');
                    }}
                    onUpdateStudentAvatar={() => {}}
                    onSetTheme={setTheme}
                    onLogout={async () => {
                      try {
                                        await supabase.auth.signOut();
                      } catch {}
                      setUser(null);
                      setScreenState({ screen: 'main' });
                    }}
                    onDeleteAccount={() => {
                      setUser(null);
                      setScreenState({ screen: 'main' });
                    }}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Navigation Bar at Bottom */}
      {user && screenState.screen === 'main' && (
        <Navigation
          role={user.role}
          currentTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setScreenState({ screen: 'main' });
          }}
          unreadCount={
            user.role === 's'
              ? db.notifications.filter((n) => n.si === user.si).length
              : 0
          }
        />
      )}
    </AndroidFrame>
    </ErrorBoundary>
  );
}
