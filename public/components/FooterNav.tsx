
import React from 'react';

interface FooterNavProps {
  date: Date;
  reference: string;
  onOpenDatePicker: () => void;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const FooterNav: React.FC<FooterNavProps> = ({ date, reference, onOpenDatePicker }) => {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dayOfWeek = DAYS[date.getDay()];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-40 px-5 pt-3 shadow-[0_-4px_10px_rgba(0,0,0,0.01)]" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex items-baseline space-x-1.5 shrink-0">
            <span className="text-[15px] font-bold text-[#333] eng-font">{m}/{d}</span>
            <span className="text-[11px] font-semibold text-stone-400">{dayOfWeek}요일</span>
          </div>
          {reference && (
            <>
              <div className="w-[1px] h-3.5 bg-stone-200 shrink-0"></div>
              <span className="text-[12px] text-stone-500 font-medium truncate noto-sans">{reference}</span>
            </>
          )}
        </div>

        <button 
          onClick={onOpenDatePicker}
          className="ml-3 p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl transition-colors border border-stone-100 shrink-0 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
    </footer>
  );
};

export default FooterNav;
