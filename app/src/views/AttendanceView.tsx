import React, { useState } from 'react';
import { Student, ClassGroup } from '../types.ts';

interface AttendanceViewProps {
  students: Student[];
  classes: ClassGroup[];
  sessions: string[];
  sessionClasses: (string | null)[];
  onSaveAttendance: (
    classId: string,
    sessionKey: number | 'new',
    attendanceMap: Record<number, string>
  ) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  classes,
  sessions,
  sessionClasses,
  onSaveAttendance,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes[0]?.id || 'c1'
  );
  const [sessionKey, setSessionKey] = useState<number | 'new'>('new');
  const [tempAttendance, setTempAttendance] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState('');

  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const todayLabel = `${new Date().getDate()} ${months[new Date().getMonth()]}`;

  // Filter session indices for this class
  const classSessionIndices = sessions
    .map((_, idx) => idx)
    .filter((idx) => sessionClasses[idx] === null || sessionClasses[idx] === selectedClassId);

  const todayIndex = classSessionIndices.find(
    (idx) => sessions[idx] === todayLabel && sessionClasses[idx] === selectedClassId
  );

  const LBL: Record<string, string> = { g: 'Geldi', y: 'Yok', i: 'İzinli' };

  // Get current code for a student
  const getStatus = (student: Student, idx: number) => {
    if (tempAttendance[idx]) return tempAttendance[idx];
    if (sessionKey === 'new') return 'g';
    return student.a[sessionKey] || 'g';
  };

  const handleStatusChange = (idx: number, code: string) => {
    setTempAttendance({ ...tempAttendance, [idx]: code });
    setFeedback('');
  };

  const handleSave = () => {
    onSaveAttendance(selectedClassId, sessionKey, tempAttendance);
    setTempAttendance({});
    setFeedback('Kaydedildi ✓');
    setTimeout(() => setFeedback(''), 4000);
  };

  const classStudents = students.filter(
    (s) => s.c === selectedClassId && !s.off
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          Yoklama Defteri
        </h1>
        <p className="text-xs text-[var(--mute)]">
          Sınıfı ve ders gününü seçip katılım durumlarını işaretle
        </p>
      </div>

      {/* Class filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {classes.map((cls) => (
          <button
            key={cls.id}
            data-rc={cls.id}
            onClick={() => {
              setSelectedClassId(cls.id);
              setSessionKey('new');
              setTempAttendance({});
            }}
            className={`px-3 py-1.5 rounded-xl border font-extrabold text-xs transition-all cursor-pointer ${
              selectedClassId === cls.id
                ? 'bg-[var(--pri)] text-[var(--onpri)] border-[var(--pri)] shadow-sm'
                : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--pri)]'
            }`}
          >
            {cls.n}
          </button>
        ))}
      </div>

      {/* Session dates chips */}
      <div className="space-y-1">
        <span className="text-xs font-bold text-[var(--mute)]">
          Ders günü (geçmiş günleri de düzenleyebilirsin):
        </span>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {classSessionIndices.slice(-6).map((idx) => (
            <button
              key={idx}
              data-rk={idx}
              onClick={() => {
                setSessionKey(idx);
                setTempAttendance({});
              }}
              className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                sessionKey === idx
                  ? 'bg-[var(--pri)] text-[var(--onpri)] border-[var(--pri)] shadow-sm'
                  : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink)]'
              }`}
            >
              {sessions[idx]}
            </button>
          ))}

          {todayIndex === undefined && (
            <button
              data-rk="new"
              onClick={() => {
                setSessionKey('new');
                setTempAttendance({});
              }}
              className={`px-2.5 py-1 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                sessionKey === 'new'
                  ? 'bg-[var(--pri)] text-[var(--onpri)] border-[var(--pri)] shadow-sm'
                  : 'bg-[var(--card)] border-[var(--line)] text-[var(--pri)]'
              }`}
            >
              + Bugün ({todayLabel})
            </button>
          )}
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-2.5 pt-1">
        {classStudents.map((student) => {
          const globalIndex = students.indexOf(student);
          const currentStatus = getStatus(student, globalIndex);

          return (
            <div
              key={student.e}
              className="p-3.5 rounded-2xl border shadow-sm space-y-2"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
            >
              <div className="flex justify-between items-center">
                <b className="text-sm font-bold text-[var(--ink)]">{student.n}</b>
                <span className="text-[11px] text-[var(--mute)] font-medium">
                  {student.e}
                </span>
              </div>

              <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
                {(['g', 'y', 'i'] as const).map((code) => {
                  const isActive = currentStatus === code;
                  let activeColors = 'bg-[var(--pri)] text-[var(--onpri)]';
                  if (code === 'g') activeColors = 'bg-[var(--ok)] text-white';
                  if (code === 'y') activeColors = 'bg-[var(--bad)] text-white';
                  if (code === 'i') activeColors = 'bg-[var(--sun)] text-[#14213D]';

                  return (
                    <button
                      key={code}
                      type="button"
                      data-c={code}
                      aria-pressed={isActive}
                      onClick={() => handleStatusChange(globalIndex, code)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? `${activeColors} shadow-sm font-extrabold`
                          : 'text-[var(--mute)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {LBL[code]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {classStudents.length === 0 && (
          <div
            className="p-6 rounded-2xl border text-center text-xs text-[var(--mute)] shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            Bu sınıfta kayıtlı öğrenci yok.
          </div>
        )}
      </div>

      {feedback && (
        <p id="ym" className="text-xs font-black text-center text-[var(--ok)]">
          {feedback}
        </p>
      )}

      <button
        id="sv"
        onClick={handleSave}
        className="w-full py-4 px-4 rounded-2xl font-extrabold text-sm text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
        style={{ backgroundColor: 'var(--pri)' }}
      >
        {sessionKey === 'new' ? 'Yoklamayı kaydet' : 'Değişiklikleri kaydet'}
      </button>
    </div>
  );
};
