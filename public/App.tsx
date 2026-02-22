
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BibleVersion, BibleTextResponse, AppState } from './types';
import { fetchDevotionalFromDb } from './services/dbService';
import Header from './components/Header';
import FooterNav from './components/FooterNav';
import BibleCard from './components/BibleCard';
import DatePickerModal from './components/DatePickerModal';

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
  const [lyricIdx, setLyricIdx] = useState(0);
  const activeRequestRef = useRef<string | null>(null);

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

  const handleShare = async () => {
    if (!state.devotional) return;
    let text = `[오늘의 말씀]\n${state.devotional.reference}\n\n"${state.devotional.texts[state.selectedVersion]}"`;
    
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (err) {}
    } else {
      await navigator.clipboard.writeText(text);
      alert("말씀이 복사되었습니다.");
    }
  };

  return (
    <div className="h-screen w-full bg-white text-[#333] selection:bg-blue-50 flex flex-col overflow-hidden">
      <Header 
        selectedVersion={state.selectedVersion}
        fileStatus={state.fileStatus}
        onVersionChange={handleVersionChange}
      />
      
      <main className="flex-1 overflow-y-auto relative no-scrollbar">
        {state.loading ? (
          <div className="h-full flex flex-col items-center justify-center px-10 pb-32">
            <div className="mb-14 text-center">
              <p className="text-blue-500 font-semibold text-[10px] tracking-[0.3em] uppercase mb-4 animate-pulse eng-font">
                READING WORD
              </p>
              <div className="w-8 h-[2px] bg-blue-100 mx-auto"></div>
            </div>
            <div className="relative h-24 w-full flex items-center justify-center overflow-hidden">
              <p key={lyricIdx} className="text-stone-400 text-center italic serif-font text-[15px] leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-1000 max-w-[280px] break-keep">
                "{LYRICS[lyricIdx]}"
              </p>
            </div>
          </div>
        ) : state.error ? (
          <div className="text-center py-20 px-8 max-w-md mx-auto flex flex-col items-center">
            <div className="w-14 h-14 bg-stone-50 rounded-full flex items-center justify-center mb-6 border border-stone-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <p className="text-stone-400 mb-8 text-sm leading-relaxed break-keep font-medium">{state.error}</p>
            <button 
              onClick={() => fetchData(state.currentDate)} 
              className="w-full py-4 bg-blue-600 text-white rounded-full text-[12px] font-semibold tracking-[0.2em] uppercase active:scale-95 transition-all shadow-lg eng-font"
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
          onClose={() => setIsDatePickerOpen(false)} 
        />
      )}

      <button onClick={handleShare} className="fixed bottom-32 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-50 hover:bg-blue-700">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
      </button>
    </div>
  );
};

export default App;
