
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BibleVersion, BibleTextResponse, AppState } from './types';
import { fetchDevotionalFromDb } from './services/dbService';
import Header from './components/Header';
import FooterNav from './components/FooterNav';
import BibleCard from './components/BibleCard';
import DatePickerModal from './components/DatePickerModal';
import NoteModal from './components/NoteModal';
import { toDateKey, hasNote } from './services/noteService';

const VERSIONS = Object.values(BibleVersion) as BibleVersion[];

const LYRICS = [
  "주의 말씀은 내 발의 등이요 내 길에 빛이니이다",
  "하나님의 말씀은 살아 있고 활력이 있어",
  "풀은 마르고 꽃은 시드나 우리 하나님의 말씀은 영원히 서리라",
  "여호와의 율법은 완전하여 영혼을 소생시키며",
  "사람이 떡으로만 살 것이 아니요 하나님의 입으로부터 나오는 말씀으로 살 것이라"
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentDate: new Date(),
    selectedVersion: BibleVersion.KRV,
    devotional: null,
    loading: true,
    error: null,
    fileStatus: { krv: true, uriman: true, niv: true }
  });

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [noteExists, setNoteExists] = useState(false);
  const [lyricIdx, setLyricIdx] = useState(0);
  const activeRequestRef = useRef<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // 다크모드는 시스템 설정만 따른다(수동 토글 제거). 설정이 바뀌면 즉시 반영.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', mq.matches);
    apply();
    try { localStorage.removeItem('theme'); } catch (e) {}
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // 노트 버튼 배지: 현재 날짜에 노트가 있는지 (노트 모달을 닫을 때마다 갱신)
  useEffect(() => {
    setNoteExists(hasNote(toDateKey(state.currentDate)));
  }, [state.currentDate, isNoteOpen]);

  useEffect(() => {
    if (state.loading) {
      const interval = setInterval(() => {
        setLyricIdx((prev) => (prev + 1) % LYRICS.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [state.loading]);

  const fetchData = useCallback(async (targetDate: Date) => {
    const dateStr = targetDate.toISOString().split('T')[0];
    if (activeRequestRef.current === dateStr && state.loading) return;

    activeRequestRef.current = dateStr;
    setState(prev => ({ ...prev, currentDate: targetDate, loading: true, error: null }));
    
    try {
      const dbData = await fetchDevotionalFromDb(targetDate);
      
      if (activeRequestRef.current === dateStr) {
        if (dbData) {
          setState(prev => ({ ...prev, devotional: dbData, loading: false }));
        } else {
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: "해당 날짜의 본문 정보를 찾을 수 없습니다." 
          }));
        }
      }
    } catch (err: any) {
      console.error("Fetch failed:", err);
      if (activeRequestRef.current === dateStr) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: "네트워크 오류가 발생했습니다." 
        }));
      }
    } finally {
      if (activeRequestRef.current === dateStr) activeRequestRef.current = null;
    }
  }, [state.loading]);

  useEffect(() => {
    fetchData(state.currentDate);
  }, []);

  const handleDateChange = (newDate: Date) => fetchData(newDate);
  const handleVersionChange = (version: BibleVersion) => setState(prev => ({ ...prev, selectedVersion: version }));

  // 버전 탭 순환 전환 (+1: 오른쪽 탭, -1: 왼쪽 탭, 끝에서 반대편으로 순환)
  const cycleVersion = useCallback((dir: 1 | -1) => {
    setState(prev => {
      const idx = VERSIONS.indexOf(prev.selectedVersion);
      const next = VERSIONS[(idx + dir + VERSIONS.length) % VERSIONS.length];
      return { ...prev, selectedVersion: next };
    });
  }, []);

  // 데스크탑: ←/→ 키로 버전 전환. 입력 중이거나 모달이 열려 있으면 무시.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (isNoteOpen || isDatePickerOpen) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      cycleVersion(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isNoteOpen, isDatePickerOpen, cycleVersion]);

  // 모바일: 본문 영역 좌우 스와이프로 버전 전환.
  // 가로 이동이 60px 이상이고 세로 이동의 2배를 넘을 때만 반응(세로 스크롤과 구분).
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return;
    // 왼쪽으로 스와이프(dx<0) = 오른쪽 탭으로 이동
    cycleVersion(dx < 0 ? 1 : -1);
  };

  return (
    <div className="h-screen w-full bg-white dark:bg-sop-bg-dark text-[#333] dark:text-white selection:bg-blue-50 dark:selection:bg-sop-hover/40 flex flex-col overflow-hidden">
      <Header
        selectedVersion={state.selectedVersion}
        fileStatus={state.fileStatus}
        onVersionChange={handleVersionChange}
      />
      
      <main className="flex-1 overflow-y-auto relative no-scrollbar" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {state.loading ? (
          <div className="h-full flex flex-col items-center justify-center px-10 pb-32">
            <div className="mb-14 text-center">
              <p className="text-blue-500 font-semibold text-[10px] tracking-[0.3em] uppercase mb-4 animate-pulse eng-font">
                READING WORD
              </p>
              <div className="w-8 h-[2px] bg-blue-100 dark:bg-sop-gold/40 mx-auto"></div>
            </div>
            <div className="relative h-24 w-full flex items-center justify-center overflow-hidden">
              <p key={lyricIdx} className="text-stone-400 dark:text-sop-fg text-center italic serif-font text-[15px] leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-1000 max-w-[280px] break-keep">
                "{LYRICS[lyricIdx]}"
              </p>
            </div>
          </div>
        ) : state.error ? (
          <div className="text-center py-20 px-8 max-w-md mx-auto flex flex-col items-center">
            <div className="w-14 h-14 bg-stone-50 dark:bg-sop-bg rounded-full flex items-center justify-center mb-6 border border-stone-100 dark:border-sop-fg/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 dark:text-sop-gold"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <p className="text-stone-400 dark:text-sop-fg mb-8 text-sm leading-relaxed break-keep font-medium">{state.error}</p>
            <button 
              onClick={() => fetchData(state.currentDate)} 
              className="w-full py-4 bg-blue-600 dark:bg-sop-gold text-white dark:text-sop-bg-dark rounded-full text-[12px] font-semibold tracking-[0.2em] uppercase active:scale-95 transition-all shadow-lg eng-font"
            >
              Retry
            </button>
          </div>
        ) : state.devotional && (
          <div key={state.currentDate.toISOString()} className="animate-in fade-in slide-in-from-bottom-2 duration-700 pb-24">
            <BibleCard devotional={state.devotional} selectedVersion={state.selectedVersion} />
            <div className="max-w-3xl mx-auto w-full px-6 py-16 opacity-30 text-center">
              <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-stone-400 eng-font">
                Remember Why We Do This
              </p>
            </div>
          </div>
        )}
      </main>

      <FooterNav 
        date={state.currentDate} 
        reference={state.devotional?.reference || ''}
        onOpenDatePicker={() => setIsDatePickerOpen(true)} 
      />

      {isDatePickerOpen && (
        <DatePickerModal
          currentDate={state.currentDate}
          onDateSelect={(d) => { handleDateChange(d); setIsDatePickerOpen(false); }}
          onOpenNote={(d) => { handleDateChange(d); setIsDatePickerOpen(false); setIsNoteOpen(true); }}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}

      {isNoteOpen && (
        <NoteModal
          date={state.currentDate}
          reference={state.devotional?.reference}
          onClose={() => setIsNoteOpen(false)}
        />
      )}

      <button
        onClick={() => setIsNoteOpen(true)}
        aria-label="큐티 노트 열기"
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 dark:bg-sop-gold text-white dark:text-sop-bg-dark rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-50 hover:bg-blue-700 dark:hover:bg-sop-orange"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
        {noteExists && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 dark:bg-sop-pink border-2 border-white dark:border-sop-bg-dark"></span>
        )}
      </button>
    </div>
  );
};

export default App;
