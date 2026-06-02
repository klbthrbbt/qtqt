
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
    <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-sop-bg-dark border-t border-stone-100 dark:border-sop-fg/10 z-40 px-5 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.01)]" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={onOpenDatePicker}
          className="w-full px-4 py-3 border border-stone-200 dark:border-sop-fg/10 rounded-xl hover:bg-stone-50 dark:hover:bg-sop-hover/20 active:bg-stone-100 dark:active:bg-sop-hover/30 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex items-baseline space-x-1.5 shrink-0">
              <span className="text-[15px] font-bold text-[#333] dark:text-white eng-font">{m}/{d}</span>
              <span className="text-[11px] font-semibold text-stone-400 dark:text-sop-fg/60">{dayOfWeek}요일</span>
            </div>
            {reference && (
              <>
                <div className="w-[1px] h-3.5 bg-stone-200 dark:bg-sop-fg/15 shrink-0"></div>
                <span className="text-[12px] text-stone-500 dark:text-sop-fg/80 font-medium truncate noto-sans">{reference}</span>
              </>
            )}
          </div>

          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-2 text-stone-400 dark:text-sop-gold">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
    </footer>
  );
};

export default FooterNav;
