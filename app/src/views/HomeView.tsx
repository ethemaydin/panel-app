import React, { useState } from 'react';
import { Student, Topic, WordItem } from '../types.ts';
import { okDate, stv, prog, wstat, computeStreak } from '../utils/logic.ts';
import { sp } from '../utils/speech.ts';

interface HomeViewProps {
  student: Student;
  allTopics: Topic[];
  allWords: WordItem[];
  lastScores: Record<string, number>;
  onOpenTopic: (topicId: string) => void;
  onStartQuiz: (key: string) => void;
  onStartCards: () => void;
  onOpenBadges: () => void;
  onOpenLeaderboard: () => void;
  onUpdateGoal: (newGoal: number) => void;
  onUpdateReminder: (on: boolean, time: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  student,
  allTopics,
  allWords,
  lastScores,
  onOpenTopic,
  onStartQuiz,
  onStartCards,
  onOpenBadges,
  onOpenLeaderboard,
  onUpdateGoal,
  onUpdateReminder,
}) => {
  const [subTab, setSubTab] = useState<'topics' | 'tests' | 'words'>('topics');

  // Filter topics student has permission for and that are within date range
  const visibleTopicIds = stv(student, allTopics);
  const visibleTopics = allTopics.filter(
    (t) => visibleTopicIds.includes(t.id) && okDate(t)
  );

  const isTopicDone = (t: Topic) => {
    return !!(student.td && student.td[t.id]) || (lastScores[t.id] || 0) >= 60;
  };

  const doneCount = visibleTopics.filter(isTopicDone).length;
  const progressPct = visibleTopics.length
    ? Math.round((doneCount / visibleTopics.length) * 100)
    : 0;

  const nextTopic =
    visibleTopics.find((t) => !isTopicDone(t)) ||
    visibleTopics[0] || {
      id: '',
      ic: '📘',
      t: 'Henüz konu yok',
      d: '',
      exp: '',
      ex: [],
      words: [],
      q: [],
      subs: [],
    };

  // Words for this student's level
  const levelWords = allWords.filter((w) => w.lv === student.lv);
  const knownCount = levelWords.filter((w) => student.kn.includes(w.id)).length;
  const dayProgress = wstat(student);
  const goalProgressPct = Math.min(
    100,
    Math.round((dayProgress.n / student.goal) * 100)
  );

  const avatar = student.av || {};

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {/* Top Bar with Avatar and Streak */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          {avatar.img ? (
            <img
              src={avatar.img}
              alt=""
              className="w-11 h-11 rounded-full object-cover shadow-sm border border-[var(--line)]"
            />
          ) : (
            <span
              className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-white text-lg shadow-sm"
              style={{ backgroundColor: avatar.col || '#D80621' }}
            >
              {avatar.emo || student.n[0]}
            </span>
          )}
          <div>
            <h1 className="text-xl font-extrabold font-heading text-[var(--ink)] leading-tight">
              Merhaba, {student.n.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-[var(--mute)]">Bugün ne çalışalım?</p>
          </div>
        </div>

        <span className="bg-[var(--sun)] text-[#14213D] rounded-full px-3 py-1 font-bold text-xs shadow-sm flex items-center gap-1">
          <span>🧩</span>
          <span>{student.cp.length}</span>
        </span>
      </div>

      {/* Quick Stats: Streak + Shortcuts */}
      <div className="flex gap-2">
        <div
          className="flex-1 flex items-center gap-2 p-3 rounded-2xl border shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          <span className="text-xl">🔥</span>
          <div className="min-w-0">
            <b className="block text-sm font-extrabold text-[var(--ink)] leading-tight">
              {computeStreak(student.dz || [])} gün seri
            </b>
            <span className="text-[11px] text-[var(--mute)]">üst üste çalışma</span>
          </div>
        </div>
        <button
          onClick={onOpenBadges}
          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border cursor-pointer transition-all hover:border-[var(--pri)] shadow-sm active:scale-98"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          <span className="text-xl">🏅</span>
          <span className="text-xs font-bold text-[var(--ink)]">Başarımlar</span>
        </button>
        <button
          onClick={onOpenLeaderboard}
          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border cursor-pointer transition-all hover:border-[var(--pri)] shadow-sm active:scale-98"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          <span className="text-xl">🏆</span>
          <span className="text-xs font-bold text-[var(--ink)]">Sıra</span>
        </button>
      </div>

      {/* Segment Switcher */}
      <div
        id="sb"
        className="flex gap-1.5 p-1 rounded-xl bg-[var(--card)] border border-[var(--line)]"
      >
        <button
          data-s="topics"
          aria-pressed={subTab === 'topics'}
          onClick={() => setSubTab('topics')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === 'topics'
              ? 'bg-[var(--pri)] text-[var(--onpri)] shadow-sm'
              : 'text-[var(--mute)] hover:text-[var(--ink)]'
          }`}
        >
          Konular
        </button>
        <button
          data-s="tests"
          aria-pressed={subTab === 'tests'}
          onClick={() => setSubTab('tests')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === 'tests'
              ? 'bg-[var(--pri)] text-[var(--onpri)] shadow-sm'
              : 'text-[var(--mute)] hover:text-[var(--ink)]'
          }`}
        >
          Testler
        </button>
        <button
          data-s="words"
          aria-pressed={subTab === 'words'}
          onClick={() => setSubTab('words')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === 'words'
              ? 'bg-[var(--pri)] text-[var(--onpri)] shadow-sm'
              : 'text-[var(--mute)] hover:text-[var(--ink)]'
          }`}
        >
          Kelimeler
        </button>
      </div>

      {/* Subtab: Konular */}
      {subTab === 'topics' && (
        <div className="space-y-3">
          {/* Hero Card */}
          {nextTopic.id && (
            <button
              id="hg"
              onClick={() => onOpenTopic(nextTopic.id)}
              className="w-full text-left p-4.5 rounded-3xl cursor-pointer shadow-md hover:brightness-105 active:scale-98 transition-all block text-white"
              style={{ backgroundColor: 'var(--pri)' }}
            >
              <div className="text-xs font-bold opacity-85 uppercase tracking-wide">
                Sıradaki konu
              </div>
              <h2 className="text-2xl font-extrabold font-heading my-1">
                {nextTopic.ic} {nextTopic.t}
              </h2>
              <div className="h-2.5 rounded-full bg-white/30 overflow-hidden my-3">
                <div
                  className="h-full bg-[var(--sun)] rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="text-xs font-semibold opacity-90">
                {doneCount}/{visibleTopics.length} konu tamamlandı (%{progressPct})
              </div>
            </button>
          )}

          {/* Topics List */}
          <div className="space-y-2 pt-1">
            {visibleTopics.map((t) => {
              const isDone = isTopicDone(t);
              return (
                <button
                  key={t.id}
                  data-t={t.id}
                  onClick={() => onOpenTopic(t.id)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:border-[var(--pri)] shadow-sm"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--line)',
                  }}
                >
                  <span className="w-11 h-11 rounded-xl bg-[var(--bg)] flex items-center justify-center text-xl flex-none border border-[var(--line)]">
                    {t.ic}
                  </span>
                  <div className="flex-1 min-w-0">
                    <b className="block text-sm font-bold truncate text-[var(--ink)]">
                      {t.t}
                    </b>
                    <span className="text-xs text-[var(--mute)] line-clamp-1">
                      {t.d}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md flex-none ${
                      isDone
                        ? 'bg-[var(--okbg)] text-[var(--ok)]'
                        : 'bg-[var(--sun)] text-[#14213D]'
                    }`}
                  >
                    {isDone ? '✓ Tamam' : `${(t.subs || []).length} alt konu`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtab: Testler */}
      {subTab === 'tests' && (
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-[var(--mute)]">
            Hazır Deneme Testleri
          </h3>
          <button
            onClick={() => onStartQuiz('mix')}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:border-[var(--pri)] shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <span className="w-11 h-11 rounded-xl bg-[var(--bg)] flex items-center justify-center text-xl flex-none">
              🎯
            </span>
            <div className="flex-1 min-w-0">
              <b className="block text-sm font-bold text-[var(--ink)]">
                Karışık deneme
              </b>
              <span className="text-xs text-[var(--mute)]">
                10 soru · 4 farklı soru tipi
              </span>
            </div>
            <span className="text-xs font-bold text-[var(--pri)] px-2 py-0.5 rounded-md bg-[var(--bg)]">
              {lastScores['mix'] != null ? `%${lastScores['mix']}` : 'Yeni'}
            </span>
          </button>

          <button
            onClick={() => onStartQuiz('word')}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:border-[var(--pri)] shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <span className="w-11 h-11 rounded-xl bg-[var(--bg)] flex items-center justify-center text-xl flex-none">
              🔤
            </span>
            <div className="flex-1 min-w-0">
              <b className="block text-sm font-bold text-[var(--ink)]">
                Kelime avcısı
              </b>
              <span className="text-xs text-[var(--mute)]">
                8 soru · İngilizce–Türkçe
              </span>
            </div>
            <span className="text-xs font-bold text-[var(--pri)] px-2 py-0.5 rounded-md bg-[var(--bg)]">
              {lastScores['word'] != null ? `%${lastScores['word']}` : 'Yeni'}
            </span>
          </button>

          <h3 className="text-sm font-extrabold text-[var(--mute)] pt-2">
            Konu Testleri
          </h3>
          <div className="space-y-2">
            {visibleTopics.map((t) => (
              <button
                key={t.id}
                onClick={() => onStartQuiz(t.id)}
                disabled={!t.q.length}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all shadow-sm ${
                  t.q.length
                    ? 'cursor-pointer hover:border-[var(--pri)]'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--line)',
                }}
              >
                <span className="w-11 h-11 rounded-xl bg-[var(--bg)] flex items-center justify-center text-xl flex-none">
                  {t.ic}
                </span>
                <div className="flex-1 min-w-0">
                  <b className="block text-sm font-bold text-[var(--ink)]">
                    {t.t}
                  </b>
                  <span className="text-xs text-[var(--mute)]">
                    {t.q.length} soru
                  </span>
                </div>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                    lastScores[t.id] != null && lastScores[t.id] >= 60
                      ? 'bg-[var(--okbg)] text-[var(--ok)]'
                      : 'bg-[var(--bg)] text-[var(--mute)]'
                  }`}
                >
                  {lastScores[t.id] != null ? `%${lastScores[t.id]}` : 'Yeni'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subtab: Kelimeler */}
      {subTab === 'words' && (
        <div className="space-y-3">
          <div
            className="p-5 rounded-3xl border text-center shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <span className="inline-block bg-[var(--sun)] text-[#14213D] rounded-full px-2.5 py-0.5 text-xs font-extrabold">
              {student.lv} seviyesi
            </span>
            <h2 className="text-5xl font-black font-heading mt-2 mb-0 text-[var(--pri)]">
              {dayProgress.n}/{student.goal}
            </h2>
            <p className="text-xs font-semibold text-[var(--mute)] mt-1">
              bugünkü kelime hedefin
            </p>

            <div className="h-2.5 rounded-full bg-[var(--line)] overflow-hidden my-3">
              <div
                className="h-full bg-[var(--sun)] rounded-full transition-all duration-300"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>

            <button
              id="fc"
              onClick={onStartCards}
              className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm transition-all cursor-pointer shadow-md text-white hover:brightness-105 active:scale-98"
              style={{ backgroundColor: 'var(--pri)' }}
            >
              {dayProgress.n >= student.goal
                ? 'Fazladan kelime çalış'
                : 'Kartlarla çalışmaya başla'}
            </button>
            <p className="text-xs text-[var(--mute)] mt-2.5">
              Toplam {knownCount}/{levelWords.length} kelime ezberlendi
            </p>
          </div>

          {/* Goal Adjustment Card */}
          <div
            className="p-4 rounded-2xl border shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <b className="text-xs font-bold text-[var(--ink)] block mb-1">
              Günlük hedefin
            </b>
            <div className="text-center py-1">
              <span id="gv" className="text-2xl font-black text-[var(--pri)]">
                {student.goal} kelime
              </span>
            </div>
            <input
              id="gr"
              type="range"
              min={5}
              max={30}
              step={1}
              value={student.goal}
              onChange={(e) => onUpdateGoal(Number(e.target.value))}
              className="w-full accent-[var(--pri)] cursor-pointer"
            />
            <div className="flex justify-between text-xs text-[var(--mute)] font-semibold mt-1">
              <span>5 kelime</span>
              <span>30 kelime</span>
            </div>
            <p className="text-[11px] text-[var(--mute)] mt-2">
              Her gün en az 5 kelime. Kelimeleri flashcard kartlarıyla ezberlersin.
            </p>
          </div>

          {/* Reminder Toggle */}
          <div
            className="p-4 rounded-2xl border shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <label className="flex items-center justify-between font-bold text-xs cursor-pointer">
              <span>⏰ Günlük hatırlatıcı</span>
              <input
                id="ron"
                type="checkbox"
                checked={student.rem?.on ?? false}
                onChange={(e) =>
                  onUpdateReminder(e.target.checked, student.rem?.time || '20:00')
                }
                className="w-5 h-5 accent-[var(--pri)] rounded cursor-pointer"
              />
            </label>
            {student.rem?.on && (
              <label className="block mt-3 text-xs font-bold">
                Saat
                <input
                  id="rt"
                  type="time"
                  value={student.rem?.time || '20:00'}
                  onChange={(e) => onUpdateReminder(true, e.target.value)}
                  className="w-full mt-1 p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] font-semibold text-xs"
                />
              </label>
            )}
            <p className="text-[11px] text-[var(--mute)] mt-1.5">
              Uygulama açıkken veya bildirim izniyle hatırlar.
            </p>
          </div>

          {/* Expandable Vocabulary List */}
          <details
            className="p-4 rounded-2xl border shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <summary className="font-extrabold text-xs cursor-pointer text-[var(--ink)] select-none">
              Kelime listesi ({levelWords.length})
            </summary>
            <ul className="divide-y divide-[var(--line)] mt-3">
              {levelWords.map((w) => (
                <li
                  key={w.id}
                  className="py-2 flex items-center justify-between text-xs"
                >
                  <div className="flex-1 pr-2">
                    <span className="font-bold text-sm text-[var(--ink)]">
                      {w.e}
                    </span>{' '}
                    {w.ph && (
                      <span className="text-[11px] text-[var(--mute)] font-mono">
                        /{w.ph}/
                      </span>
                    )}
                    <div className="text-[var(--mute)]">{w.tr}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-none">
                    <button
                      type="button"
                      onClick={() => sp(w.e)}
                      className="p-1 rounded-lg text-sm hover:bg-[var(--bg)] cursor-pointer"
                      title="Dinle"
                    >
                      🔊
                    </button>
                    <span>{student.kn.includes(w.id) ? '✅' : '⏳'}</span>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
};
