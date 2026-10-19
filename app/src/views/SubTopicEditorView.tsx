import React, { useState } from 'react';
import { SubTopic, Topic } from '../types.ts';

interface SubTopicEditorViewProps {
  topic: Topic;
  subTopic: SubTopic;
  onBack: () => void;
  onSave: (updated: SubTopic) => void;
  onDelete: (subId: string) => void;
}

export const SubTopicEditorView: React.FC<SubTopicEditorViewProps> = ({
  topic,
  subTopic,
  onBack,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState(subTopic.t);
  const [exp, setExp] = useState(subTopic.exp);
  const [fromDate, setFromDate] = useState(subTopic.from || '');
  const [untilDate, setUntilDate] = useState(subTopic.until || '');
  const [imgs, setImgs] = useState<string[]>([...(subTopic.imgs || [])]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleSave = () => {
    onSave({
      ...subTopic,
      t: title.trim() || 'Alt konu',
      exp: exp.trim(),
      from: fromDate || undefined,
      until: untilDate || undefined,
      imgs,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImgs([...imgs, reader.result]);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <button
        id="b"
        onClick={() => {
          handleSave();
          onBack();
        }}
        className="font-bold text-xs text-[var(--pri)] cursor-pointer flex items-center gap-1 hover:underline"
      >
        ‹ {topic.t}
      </button>

      <div>
        <h1 className="text-2xl font-extrabold font-heading text-[var(--ink)]">
          Alt Konuyu Düzenle
        </h1>
        <p className="text-xs text-[var(--mute)]">
          {topic.t} konusuna ait bölüm ve resimler
        </p>
      </div>

      <div
        className="p-4 rounded-3xl border space-y-3 shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <label className="block text-xs font-bold text-[var(--ink)]">
          Başlık
          <input
            id="s1"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)]"
          />
        </label>

        <label className="block text-xs font-bold text-[var(--ink)]">
          İçerik Anlatımı
          <textarea
            id="s2"
            rows={6}
            value={exp}
            onChange={(e) => setExp(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium text-[var(--ink)] leading-relaxed resize-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-bold text-[var(--ink)]">
            Başlangıç tarihi
            <input
              id="s3"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full mt-1 p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
            />
          </label>
          <label className="block text-xs font-bold text-[var(--ink)]">
            Bitiş tarihi
            <input
              id="s4"
              type="date"
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
              className="w-full mt-1 p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
            />
          </label>
        </div>
      </div>

      {/* Images Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-[var(--mute)] uppercase tracking-wider">
          Resimler ({imgs.length})
        </h3>
        <div
          className="p-3.5 rounded-2xl border space-y-2 shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          {imgs.map((src, idx) => (
            <div key={idx} className="relative rounded-xl overflow-hidden border border-[var(--line)]">
              <img src={src} alt="" className="w-full max-h-48 object-cover" />
              <button
                type="button"
                data-ri={idx}
                onClick={() => setImgs(imgs.filter((_, i) => i !== idx))}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-[var(--bad)] text-white text-xs font-bold shadow-md cursor-pointer hover:brightness-105"
              >
                Sil
              </button>
            </div>
          ))}

          <label className="block w-full py-2.5 px-3 rounded-xl border border-dashed border-[var(--pri)] text-xs font-bold text-[var(--pri)] text-center cursor-pointer hover:bg-[var(--pri)]/5">
            🖼️ Cihazdan resim seç ve ekle
            <input
              id="si"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <button
        id="ssv"
        type="button"
        onClick={() => {
          handleSave();
          onBack();
        }}
        className="w-full py-3.5 px-4 rounded-xl font-extrabold text-xs text-white shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
        style={{ backgroundColor: 'var(--pri)' }}
      >
        Kaydet
      </button>

      <button
        id="sdl"
        type="button"
        onClick={() => {
          if (!deleteConfirm) {
            setDeleteConfirm(true);
            return;
          }
          onDelete(subTopic.id);
        }}
        className="w-full text-center py-2 text-xs font-bold text-[var(--bad)] cursor-pointer hover:underline"
      >
        {deleteConfirm ? 'Emin misin? Silmek için tekrar bas.' : 'Alt konuyu sil'}
      </button>
    </div>
  );
};
