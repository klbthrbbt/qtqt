
import React from 'react';
import { BibleVersion, BibleTextResponse } from '../types';

interface BibleCardProps {
  devotional: BibleTextResponse;
  selectedVersion: BibleVersion;
}

const BibleCard: React.FC<BibleCardProps> = ({ devotional, selectedVersion }) => {
  const currentText = devotional.texts[selectedVersion] || "";
  const isEnglish = selectedVersion === BibleVersion.NIV;
  const displayReference = isEnglish && devotional.engReference ? devotional.engReference : devotional.reference;

  const parseVerses = (text: string) => {
    const parts = text.split(/(\d+\.\s+)/).filter(Boolean);
    const verses: { num: string; content: string }[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (/^\d+\.\s+$/.test(part)) {
        const num = part.trim().replace('.', '');
        const content = parts[i + 1] || '';
        verses.push({ num, content: content.trim() });
        i++;
      } else if (part.trim()) {
        verses.push({ num: '', content: part.trim() });
      }
    }
    return verses;
  };

  const versePairs = parseVerses(currentText);

  return (
    <div className="w-full flex flex-col">
      <div className="w-full max-w-3xl mx-auto px-5 py-6">
        <div className="text-left">
          <div className="mb-6 flex items-center space-x-4">
            <h2 className={`text-[#333] dark:text-white font-bold text-xl sm:text-2xl whitespace-nowrap tracking-tight noto-sans ${isEnglish ? 'eng-font' : ''}`}>
              {displayReference}
            </h2>
            <div className="h-[1px] w-full bg-stone-100 dark:bg-sop-fg/10"></div>
          </div>
          
          <div className="space-y-7">
            {versePairs.map((v, idx) => (
              <div 
                key={idx} 
                className="flex items-baseline group animate-in fade-in slide-in-from-bottom-1 duration-300" 
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {/* 
                  숫자와 본문의 첫 줄 베이스라인을 맞추기 위해 items-baseline을 사용합니다.
                  숫자 영역에 고정 너비와 우측 여백을 부여합니다.
                */}
                <span className="w-10 shrink-0 text-[13px] font-bold text-stone-400 dark:text-sop-gold/70 group-hover:text-blue-500 dark:group-hover:text-sop-gold transition-colors eng-font pr-4">
                  {v.num}
                </span>
                <p className={`flex-1 text-[1.05rem] sm:text-[1.15rem] text-[#333] dark:text-white leading-[1.8] break-keep ${isEnglish ? 'eng-font font-medium' : 'serif-font font-medium'}`}>
                  {v.content}
                </p>
              </div>
            ))}
            
            {versePairs.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-stone-300 dark:text-sop-fg/40 italic serif-font">말씀을 읽어오는 중입니다...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BibleCard;
