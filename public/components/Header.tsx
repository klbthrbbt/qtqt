
import React from 'react';
import { BibleVersion, FileStatus } from '../types';

interface HeaderProps {
  selectedVersion: BibleVersion;
  fileStatus: FileStatus;
  onVersionChange: (version: BibleVersion) => void;
}

const Header: React.FC<HeaderProps> = ({ selectedVersion, onVersionChange }) => {
  return (
    <header className="bg-white border-b border-stone-100 z-50 pt-6 pb-2 shrink-0 relative">
      {/* BibleCard와 동일한 컨테이너 구조 적용 (max-w-3xl mx-auto px-5) */}
      <div className="max-w-3xl mx-auto px-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" className="shrink-0">
              <path d="M240,80a40,40,0,0,0-40-40H48A40,40,0,0,0,16,88v80a40,40,0,0,0,40,40H200a40,40,0,0,0,40-40Z" opacity="0.2" fill="#a16207"/>
              <path d="M240,80a48,48,0,0,0-48-48H48A48,48,0,0,0,8,88v80a48,48,0,0,0,48,48H200a48,48,0,0,0,48-48ZM24,88A32,32,0,0,1,48,56H200a32,32,0,0,1,32,32v8H24ZM200,200H56a32,32,0,0,1-32-32V112H232v56A32,32,0,0,1,200,200Zm-40-60a12,12,0,1,1-12-12A12,12,0,0,1,160,140Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,116,140Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,72,140Zm132,28a12,12,0,1,1-12-12A12,12,0,0,1,204,168Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,160,168Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,116,168Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,72,168Z" fill="#78350f"/>
            </svg>
            <h1 className="text-[#333] font-bold tracking-tighter text-[19px] noto-sans shrink-0">
              큐티로 빵빵한 오늘
            </h1>
          </div>
          
          <a 
            href="https://www.youtube.com/@cgn8459" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 py-1.5 px-3 bg-stone-50 hover:bg-stone-100 rounded-full transition-colors group border border-stone-100 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#ff0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            <span className="hidden sm:inline text-stone-600 font-semibold text-[11px] tracking-tight">영상으로 큐티하기 [생명의 삶]</span>
            <span className="sm:hidden text-stone-600 font-semibold text-[11px] tracking-tight">영상 큐티</span>
          </a>
        </div>

        <div className="flex justify-center mb-1">
          <div className="inline-flex bg-stone-100 p-0.5 rounded-2xl w-full border border-stone-200/40">
            {(Object.values(BibleVersion) as BibleVersion[]).map((v) => (
              <button
                key={v}
                onClick={() => onVersionChange(v)}
                className={`flex-1 py-2.5 px-1 text-[11px] font-semibold rounded-xl transition-all whitespace-nowrap eng-font ${
                  selectedVersion === v 
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' 
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
