
import React, { useState } from 'react';

interface DatePickerModalProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const DatePickerModal: React.FC<DatePickerModalProps> = ({ currentDate, onDateSelect, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDateRange = () => {
    const dates: Date[] = [];
    for (let i = -6; i <= 2; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const dateRange = getDateRange();

  const formatDate = (d: Date) => {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}/${day}`;
  };

  const isSelected = (d: Date) => d.toDateString() === selectedDate.toDateString();
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isCurrent = (d: Date) => d.toDateString() === currentDate.toDateString();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-[320px] mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-[15px] font-bold text-[#333] noto-sans mb-1">날짜 선택</h3>
          <p className="text-[11px] text-stone-400 font-medium">다른 날의 큐티를 확인해보세요</p>
        </div>

        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            {dateRange.map((d, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedDate(d)}
                className={`flex flex-col items-center py-3 px-2 rounded-xl transition-all duration-150 ${
                  isSelected(d)
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-stone-50 hover:bg-stone-100 text-[#333]'
                }`}
              >
                <span className={`text-[10px] font-medium mb-0.5 ${isSelected(d) ? 'text-blue-100' : 'text-stone-400'}`}>
                  {DAYS[d.getDay()]}
                </span>
                <span className={`text-[14px] font-bold eng-font ${isSelected(d) ? 'text-white' : ''}`}>
                  {formatDate(d)}
                </span>
                {isToday(d) && (
                  <span className={`text-[9px] font-semibold mt-0.5 ${isSelected(d) ? 'text-blue-200' : 'text-blue-500'}`}>
                    오늘
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-5 flex items-center space-x-2">
          <button
            onClick={() => { setSelectedDate(today); }}
            className="flex-1 py-3 text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors active:scale-[0.98]"
          >
            오늘로 이동
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 text-[12px] font-semibold text-stone-500 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors active:scale-[0.98]"
          >
            취소
          </button>
          <button
            onClick={() => onDateSelect(selectedDate)}
            className="flex-1 py-3 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md shadow-blue-200 active:scale-[0.98]"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatePickerModal;
