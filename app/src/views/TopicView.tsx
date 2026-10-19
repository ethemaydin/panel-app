import React from 'react';
import { Topic, Student } from '../types.ts';
import { okDate } from '../utils/logic.ts';
import { sp } from '../utils/speech.ts';

interface TopicViewProps {
  topic: Topic;
  student: Student;
  onBack: () => void;
  onOpenSubTopic: (subId: string) => void;
  onStartQuiz: (topicId: string) => void;
}

export const TopicView: React.FC<TopicViewProps> = ({
  topic,
  student,
  onBack,
  onOpenSubTopic,
  onStartQuiz,
}) => {
  const visibleSubs = (topic.subs || []).filter(okDate);
  const doneCount = visibleSubs.filter((x) => student.sd && student.sd[x.id]).length;
  const isDone = !!(student.td && student.td[topic.id]);
  const isTestPassed = !!(student.tpass && student.tpass[topic.id]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <button
        id="b"
        onClick={onBack}
        className="font-bold text-xs text-[var(--pri)] cursor-pointer flex items-center gap-1 hover:underline"
      >
        ‹ Konular
      </button>

      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)] flex items-center gap-2">
          <span>{topic.ic}</span>
          <span>{topic.t}</span>
        </h1>
        {topic.d && <p className="text-xs text-[var(--mute)] mt-0.5">{topic.d}</p>}
      </div>

      {visibleSubs.length > 0 && (
        <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}>
          <div className="flex justify-between items-center text-xs font-bold text-[var(--mute)] mb-1.5">
            <span>Alt Konu İlerlemesi</span>
            <span>{doneCount}/{visibleSubs.length}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden">
            <div
              className="h-full bg-[var(--pri)] rounded-full transition-all duration-300"
              style={{ width: `${(doneCount / visibleSubs.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {topic.q.length > 0 && !isDone && (
        <div className="p-3 rounded-xl bg-[var(--sun)]/20 border border-[var(--sun)]/40 text-xs text-[var(--ink)] font-semibold flex items-center gap-2">
          <span>🎯</span>
          <span>
            Konuyu tamamlamak için testten en az %60 almalısın
            {isTestPassed ? ' (test geçildi ✓)' : ''}
          </span>
        </div>
      )}

      {topic.exp && (
        <div
          className="p-4 rounded-2xl border text-xs leading-relaxed whitespace-pre-wrap shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          {topic.exp}
        </div>
      )}

      {/* Subtopics List */}
      <div className="space-y-2">
        {visibleSubs.map((sub) => {
          const isSubDone = !!(student.sd && student.sd[sub.id]);
          return (
            <button
              key={sub.id}
              data-sb={sub.id}
              onClick={() => onOpenSubTopic(sub.id)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:border-[var(--pri)] shadow-sm"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--line)',
              }}
            >
              <span className="w-10 h-10 rounded-xl bg-[var(--bg)] flex items-center justify-center text-lg flex-none border border-[var(--line)]">
                {isSubDone ? '✅' : '📖'}
              </span>
              <div className="flex-1 min-w-0">
                <b className="block text-sm font-bold text-[var(--ink)] truncate">
                  {sub.t}
                </b>
                <span className="text-xs text-[var(--mute)]">
                  {(sub.imgs || []).length > 0 ? '🖼️ Resimli ' : ''}
                  {isSubDone ? 'Tamamlandı' : 'Başla'}
                </span>
              </div>
              <span className="text-xs font-bold text-[var(--pri)]">›</span>
            </button>
          );
        })}
      </div>

      {/* Examples List */}
      {topic.ex.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
            Örnek Cümleler
          </h3>
          <div
            className="p-3.5 rounded-2xl border shadow-sm divide-y divide-[var(--line)]"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            {topic.ex.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                <div className="flex-1 pr-2">
                  <div className="font-bold text-sm text-[var(--ink)]">{item[0]}</div>
                  <div className="text-[var(--mute)]">{item[1]}</div>
                </div>
                <button
                  type="button"
                  onClick={() => sp(item[0])}
                  className="p-1.5 rounded-lg text-sm hover:bg-[var(--bg)] cursor-pointer flex-none"
                  title="Dinle"
                >
                  🔊
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Words List */}
      {topic.words.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
            Kelimeler
          </h3>
          <div
            className="p-3.5 rounded-2xl border shadow-sm divide-y divide-[var(--line)]"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            {topic.words.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                <div className="flex-1 pr-2">
                  <div className="font-bold text-sm text-[var(--ink)]">{item[0]}</div>
                  <div className="text-[var(--mute)]">{item[1]}</div>
                </div>
                <button
                  type="button"
                  onClick={() => sp(item[0])}
                  className="p-1.5 rounded-lg text-sm hover:bg-[var(--bg)] cursor-pointer flex-none"
                  title="Dinle"
                >
                  🔊
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz trigger */}
      {topic.q.length > 0 && (
        <button
          id="gt"
          onClick={() => onStartQuiz(topic.id)}
          className="w-full py-4 px-4 rounded-2xl font-extrabold text-sm transition-all cursor-pointer shadow-md text-white hover:brightness-105 active:scale-98"
          style={{ backgroundColor: 'var(--pri)' }}
        >
          Konu testini çöz ({topic.q.length} soru)
        </button>
      )}
    </div>
  );
};
