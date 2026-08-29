
import React, { useState, useEffect, useRef } from 'react';
import { toDateKey, getNote, saveNote } from '../services/noteService';

interface NoteModalProps {
  date: Date;
  reference?: string;
  onClose: () => void;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const NoteModal: React.FC<NoteModalProps> = ({ date, reference, onClose }) => {
  const dateKey = toDateKey(date);
  const [text, setText] = useState<string>(() => getNote(dateKey));
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 언마운트 저장용 최신 텍스트 (state 클로저는 마운트 시점 값에 고정되므로 ref로 추적)
  const latestTextRef = useRef(text);
  latestTextRef.current = text;

  // 입력 후 400ms 지나면 자동 저장 (닫기 전에 저장 버튼을 누를 필요 없음)
  useEffect(() => {
    const t = setTimeout(() => {
      saveNote(dateKey, text);
      setSaved(text.trim() !== '');
    }, 400);
    return () => clearTimeout(t);
  }, [text, dateKey]);

  // 닫히는 순간에도 마지막 내용을 저장 (디바운스 대기 중 이탈 방어)
  useEffect(() => {
    return () => saveNote(dateKey, latestTextRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDelete = () => {
    if (window.confirm('이 날짜의 노트를 삭제할까요?')) {
      setText('');
      saveNote(dateKey, '');
      setSaved(false);
      textareaRef.current?.focus();
    }
  };

  const m = date.getMonth() + 1;
  const d = date.getDate();

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-sop-bg-dark flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="bg-white dark:bg-sop-bg-dark border-b border-stone-100 dark:border-sop-fg/10 px-5 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-baseline space-x-3 min-w-0">
            <h3 className="text-[17px] font-bold text-[#333] dark:text-white noto-sans shrink-0">큐티 노트</h3>
            <span className="text-[12px] font-semibold text-stone-400 dark:text-sop-fg/60 eng-font shrink-0">
              {m}/{d} {DAYS[date.getDay()]}
            </span>
            {reference && (
              <span className="text-[12px] font-medium text-stone-500 dark:text-sop-gold/80 noto-sans truncate">
                {reference}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="노트 닫기"
            className="p-2 hover:bg-stone-100 dark:hover:bg-sop-fg/10 rounded-lg transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500 dark:text-sop-fg/70">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="max-w-3xl mx-auto h-full px-5 py-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            placeholder="오늘 말씀에서 받은 은혜와 적용을 기록해보세요..."
            className="w-full h-full resize-none bg-transparent outline-none text-[1.02rem] leading-[1.9] text-[#333] dark:text-white placeholder:text-stone-300 dark:placeholder:text-sop-fg/30 serif-font break-keep"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-sop-bg-dark border-t border-stone-100 dark:border-sop-fg/10 px-5 py-3 shrink-0" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={text.trim() === ''}
            className={`text-[12px] font-semibold px-3 py-2 rounded-lg transition-colors ${
              text.trim() === ''
                ? 'text-stone-300 dark:text-sop-fg/25 cursor-not-allowed'
                : 'text-red-400 hover:bg-red-50 dark:text-sop-pink dark:hover:bg-sop-pink/10'
            }`}
          >
            삭제
          </button>
          <span className={`text-[11px] font-medium transition-opacity duration-300 eng-font ${saved ? 'opacity-100' : 'opacity-0'} text-stone-400 dark:text-sop-fg/60`}>
            ✓ 저장됨 · 이 기기에만 보관
          </span>
        </div>
      </div>
    </div>
  );
};

export default NoteModal;
