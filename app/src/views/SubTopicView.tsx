import React from 'react';
import { Topic, SubTopic, Student } from '../types.ts';

interface SubTopicViewProps {
  topic: Topic;
  subTopic: SubTopic;
  student: Student;
  onBack: () => void;
  onMarkComplete: () => void;
}

export const SubTopicView: React.FC<SubTopicViewProps> = ({
  topic,
  subTopic,
  student,
  onBack,
  onMarkComplete,
}) => {
  const isDone = !!(student.sd && student.sd[subTopic.id]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <button
        id="b"
        onClick={onBack}
        className="font-bold text-xs text-[var(--pri)] cursor-pointer flex items-center gap-1 hover:underline"
      >
        ‹ {topic.t}
      </button>

      <div>
        <span className="text-xs font-bold text-[var(--mute)]">
          {topic.ic} {topic.t}
        </span>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)] mt-0.5">
          {subTopic.t}
        </h1>
      </div>

      {subTopic.exp && (
        <div
          className="p-4 rounded-2xl border text-sm leading-relaxed whitespace-pre-wrap shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          {subTopic.exp}
        </div>
      )}

      {subTopic.imgs && subTopic.imgs.length > 0 && (
        <div className="space-y-3">
          {subTopic.imgs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="w-full rounded-2xl object-cover border border-[var(--line)] shadow-sm"
            />
          ))}
        </div>
      )}

      <button
        id="dn"
        onClick={onMarkComplete}
        disabled={isDone}
        className={`w-full py-4 px-4 rounded-2xl font-extrabold text-sm transition-all shadow-md ${
          isDone
            ? 'bg-[var(--okbg)] text-[var(--ok)] border border-[var(--ok)]/30 cursor-default'
            : 'text-white cursor-pointer hover:brightness-105 active:scale-98'
        }`}
        style={!isDone ? { backgroundColor: 'var(--pri)' } : {}}
      >
        {isDone ? 'Tamamlandı ✓' : 'Bu bölümü bitirdim'}
      </button>
    </div>
  );
};
