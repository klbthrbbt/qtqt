
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

  // 열릴 때 포커스 + 커서를 기존 텍스트 맨 끝으로 (autoFocus는 커서를 맨 앞에 둠)
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      const len = ta.value.length;
      ta.setSelectionRange(len, len);
    }
  }, []);

  // 모바일 키보드가 화면을 가리는 높이(px). visualViewport로 추적해
  // 자동저장 필을 항상 키보드 위에 띄운다. 데스크탑에선 0.
  const [keyboardInset, setKeyboardInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKeyboardInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

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

      {/* 자동저장 상태 필 — 키보드 위(모바일) / 하단 바 위(데스크탑) 우측에 반투명 표시.
          body 포털 + 전부 인라인 스타일: 모달의 등장 애니메이션 transform이 fixed 기준을
          바꾸고, CDN Tailwind가 포털 요소에 클래스를 입혀주지 않기 때문. */}
      {text.trim() !== '' && createPortal(
        (() => {
          const isDark = document.documentElement.classList.contains('dark');
          const bg = isDark ? 'rgba(30, 30, 63, 0.78)' : 'rgba(255, 255, 255, 0.78)';
          const border = saved
            ? (isDark ? '1px solid rgba(250, 208, 0, 0.35)' : '1px solid rgba(134, 239, 172, 0.8)')
            : (isDark ? '1px solid rgba(165, 153, 233, 0.2)' : '1px solid rgba(214, 211, 209, 0.8)');
          const color = saved
            ? (isDark ? '#fad000' : '#16a34a')
            : (isDark ? 'rgba(165, 153, 233, 0.75)' : '#a8a29e');
          return (
            <div
              style={{
                position: 'fixed',
                right: '1.25rem',
                bottom: `calc(${keyboardInset + (keyboardInset > 80 ? 12 : 76)}px + env(safe-area-inset-bottom, 0px))`,
                zIndex: 110,
                pointerEvents: 'none',
                transition: 'bottom 0.2s ease',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 14px',
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 700,
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  background: bg,
                  border,
                  color,
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.12), 0 4px 6px -4px rgba(0,0,0,0.1)',
                  transition: 'color 0.3s ease, border-color 0.3s ease',
                }}
              >
                {saved ? '✓ 저장됨' : '저장 중…'}
              </span>
            </div>
          );
        })(),
        document.body
      )}

      <div className="flex-1 overflow-hidden">
        <div className="max-w-3xl mx-auto h-full px-5 py-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setSaved(false); }}
            placeholder={"오늘 말씀에서 받은 은혜와 적용을 기록해보세요.\n쓰는 대로 자동 저장돼요."}
            className="w-full h-full resize-none bg-transparent outline-none text-[1.02rem] leading-[1.9] text-[#333] dark:text-white placeholder:text-stone-300 dark:placeholder:text-sop-fg/30 serif-font break-keep"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-sop-bg-dark border-t border-stone-100 dark:border-sop-fg/10 px-5 py-3 shrink-0" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={text.trim() === ''}
            className={`flex items-center space-x-1.5 text-[14px] font-bold px-5 py-3 rounded-xl transition-colors noto-sans ${
              text.trim() === ''
                ? 'text-stone-300 bg-stone-50 dark:text-sop-fg/30 dark:bg-sop-fg/5 cursor-not-allowed'
                : 'text-red-500 bg-red-50 hover:bg-red-100 active:scale-95 dark:text-sop-pink dark:bg-sop-pink/15 dark:hover:bg-sop-pink/25'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span>삭제</span>
          </button>
          <span className="text-[12px] font-medium text-stone-400 dark:text-sop-fg/60">
            자동 저장 · 이 기기에만 보관돼요
          </span>
        </div>
      </div>
    </div>
  );
};

export default NoteModal;
