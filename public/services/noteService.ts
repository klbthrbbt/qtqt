
// 큐티 노트 로컬 저장소 (localStorage, 기기/브라우저별).
// 키: qtnote:YYYY-MM-DD (로컬 날짜 기준 — sheetService의 날짜 매칭과 동일 규칙).
// 나중에 서버 동기화를 붙일 때는 이 키 공간을 그대로 업로드하면 된다.

const KEY_PREFIX = 'qtnote:';

// 로컬 타임존 기준 YYYY-MM-DD (toISOString은 UTC라 자정 근처에 날짜가 밀릴 수 있어 쓰지 않는다)
export const toDateKey = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const getNote = (dateKey: string): string => {
  try {
    return localStorage.getItem(KEY_PREFIX + dateKey) ?? '';
  } catch (e) {
    return '';
  }
};

// 빈 문자열(공백만 포함)을 저장하면 항목 자체를 제거한다.
export const saveNote = (dateKey: string, text: string): void => {
  try {
    if (text.trim() === '') {
      localStorage.removeItem(KEY_PREFIX + dateKey);
    } else {
      localStorage.setItem(KEY_PREFIX + dateKey, text);
    }
  } catch (e) {
    // 시크릿 모드 등 저장 불가 환경에서는 조용히 무시 (노트는 편의 기능)
  }
};

export const hasNote = (dateKey: string): boolean => getNote(dateKey).trim() !== '';
