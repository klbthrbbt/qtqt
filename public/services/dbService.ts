
import { BibleVersion, BibleTextResponse } from "../types";
import { getReferenceForDate } from "./sheetService";

const WORKER_ENDPOINT = "https://qt-bible-api.junjunebug.workers.dev/api/bible";

const ABBR_ID_MAP: Record<string, number> = {
  "창": 1, "출": 2, "레": 3, "민": 4, "신": 5, "수": 6, "삿": 7, "룻": 8, "삼상": 9, "삼하": 10,
  "왕상": 11, "왕하": 12, "대상": 13, "대하": 14, "스": 15, "느": 16, "에": 17, "욥": 18, "시": 19, "잠": 20,
  "전": 21, "아": 22, "사": 23, "렘": 24, "애": 25, "겔": 26, "단": 27, "호": 28, "욜": 29, "암": 30,
  "옵": 31, "욘": 32, "미": 33, "나": 34, "합": 35, "습": 36, "학": 37, "슥": 38, "말": 39,
  "마": 40, "막": 41, "눅": 42, "요": 43, "행": 44, "롬": 45, "고전": 46, "고후": 47, "갈": 48, "엡": 49,
  "빌": 50, "골": 51, "살전": 52, "살후": 53, "딤전": 54, "딤후": 55, "딛": 56, "몬": 57, "히": 58, "약": 59,
  "벧전": 60, "벧후": 61, "요일": 62, "요이": 63, "요삼": 64, "유": 65, "계": 66
};

const ID_NAME_MAP: Record<number, string> = {
  1: "창세기", 2: "출애굽기", 3: "레위기", 4: "민수기", 5: "신명기", 6: "여호수아", 7: "사사기", 8: "룻기", 9: "사무엘상", 10: "사무엘하",
  11: "열왕기상", 12: "열왕기하", 13: "역대상", 14: "역대하", 15: "에스라", 16: "느헤미야", 17: "에스더", 18: "욥기", 19: "시편", 20: "잠언",
  21: "전도서", 22: "아가", 23: "이사야", 24: "예레미야", 25: "예레미야애가", 26: "에스겔", 27: "다니엘", 28: "호세아", 29: "요엘", 30: "아모스",
  31: "오바댜", 32: "요나", 33: "미가", 34: "나훔", 35: "하박국", 36: "스바냐", 37: "학개", 38: "스가랴", 39: "말라기",
  40: "마태복음", 41: "마가복음", 42: "누가복음", 43: "요한복음", 44: "사도행전", 45: "로마서", 46: "고린도전서", 47: "고린도후서", 48: "갈라디아서", 49: "에베소서",
  50: "빌립보서", 51: "골로새서", 52: "데살로니가전서", 53: "데살로니가후서", 54: "디모데전서", 55: "디모데후서", 56: "디도서", 57: "빌레몬서", 58: "히브리서", 59: "야고보서",
  60: "베드로전서", 61: "베드로후서", 62: "요한일서", 63: "요한이서", 64: "요한삼서", 65: "유다서", 66: "요한계시록"
};

const ID_ENG_NAME_MAP: Record<number, string> = {
  1: "Genesis", 2: "Exodus", 3: "Leviticus", 4: "Numbers", 5: "Deuteronomy", 6: "Joshua", 7: "Judges", 8: "Ruth", 9: "1 Samuel", 10: "2 Samuel",
  11: "1 Kings", 12: "2 Kings", 13: "1 Chronicles", 14: "2 Chronicles", 15: "Ezra", 16: "Nehemiah", 17: "Esther", 18: "Job", 19: "Psalms", 20: "Proverbs",
  21: "Ecclesiastes", 22: "Song of Solomon", 23: "Isaiah", 24: "Jeremiah", 25: "Lamentations", 26: "Ezekiel", 27: "Daniel", 28: "Hosea", 29: "Joel", 30: "Amos",
  31: "Obadiah", 32: "Jonah", 33: "Micah", 34: "Nahum", 35: "Habakkuk", 36: "Zephaniah", 37: "Haggai", 38: "Zechariah", 39: "Malachi",
  40: "Matthew", 41: "Mark", 42: "Luke", 43: "John", 44: "Acts", 45: "Romans", 46: "1 Corinthians", 47: "2 Corinthians", 48: "Galatians", 49: "Ephesians",
  50: "Philippians", 51: "Colossians", 52: "1 Thessalonians", 53: "2 Thessalonians", 54: "1 Timothy", 55: "2 Timothy", 56: "Titus", 57: "Philemon", 58: "Hebrews", 59: "James",
  60: "1 Peter", 61: "2 Peter", 62: "1 John", 63: "2 John", 64: "3 John", 65: "Jude", 66: "Revelation"
};

// 참조 문자열을 표준 형태로 정규화한다.
// - 전각 콜론(：)·전각 숫자(０-９)·각종 대시(– — − －)·각종 물결(∼ 〜 ～)을 표준 ASCII로 치환
// - 연속 공백을 하나로 축약 후 trim
export function normalizeReference(ref: string): string {
  return ref
    .replace(/[：﹕]/g, ':')                                   // 전각/소형 콜론
    .replace(/[–—−﹣－]/g, '-')                                // en/em/minus/전각 대시 → 하이픈
    .replace(/[∼〜～]/g, '~')                                  // 각종 물결 → ~
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)) // 전각 숫자 → 반각
    .replace(/\s+/g, ' ')
    .trim();
}

// 장 끝까지를 의미하는 절 상한. 정경 어느 장도 999절을 넘지 않는다(최대 시편 119편 176절).
export const CHAPTER_END_VERSE = 999;

export interface ParsedReference {
  bookId: number;
  abbr: string;        // 시트 원문 약칭 (예: "마") — 모달 라벨용
  chapter: number;     // 시작 장
  start: number;       // 시작 절
  endChapter: number;  // 끝 장 (단일 장이면 chapter와 동일)
  endVerse: number;    // 끝 절 (장-only면 CHAPTER_END_VERSE)
  chapterOnly: boolean;
  bookName: string;
  engBookName: string;
}

export function parseReference(ref: string): ParsedReference | null {
  if (!ref) return null;
  const s = normalizeReference(ref);

  // 1) 책약칭 + 장:절[ -~ (장:)?절 ]  (끝 앵커 없이 뒤 잡음 허용)
  //    예) "마 8:14", "마 8:14~15", "막 8:34~9:1"(교차 장), "마 5:1, 3"(콤마 뒤 무시)
  const m = s.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)(?:\s*[-~]\s*(?:(\d+)\s*:\s*)?(\d+))?/);
  // 2) 책약칭 + 장 (절 없음)  예) "시 117"
  const mChapter = !m ? s.match(/^(.+?)\s+(\d+)\s*$/) : null;

  if (!m && !mChapter) return null;

  const abbr = (m ? m[1] : mChapter![1]).trim();
  const bookId = ABBR_ID_MAP[abbr];
  if (!bookId) return null;

  const chapter = parseInt(m ? m[2] : mChapter![2]);
  const names = { bookName: ID_NAME_MAP[bookId], engBookName: ID_ENG_NAME_MAP[bookId] };

  if (m) {
    const start = parseInt(m[3]);
    return {
      bookId,
      abbr,
      chapter,
      start,
      endChapter: m[4] ? parseInt(m[4]) : chapter,
      endVerse: m[5] ? parseInt(m[5]) : start,
      chapterOnly: false,
      ...names,
    };
  }

  // 장만 지정: 해당 장 전체
  return {
    bookId,
    abbr,
    chapter,
    start: 1,
    endChapter: chapter,
    endVerse: CHAPTER_END_VERSE,
    chapterOnly: true,
    ...names,
  };
}

// 표시용 참조 라벨 생성 (교차 장 / 장-only 케이스 포함). 카드·모달 공용.
export function buildReferenceLabel(p: ParsedReference, bookName: string): string {
  if (p.chapterOnly) return `${bookName} ${p.chapter}`;
  const head = `${bookName} ${p.chapter}:${p.start}`;
  if (p.endChapter !== p.chapter) return `${head}~${p.endChapter}:${p.endVerse}`;
  return p.start !== p.endVerse ? `${head}~${p.endVerse}` : head;
}

// 원문 참조 문자열 → 약칭 기반 라벨 (날짜 선택 모달용). 파싱 실패 시 정규화 문자열 반환.
export function formatReferenceLabel(ref: string): string {
  const p = parseReference(ref);
  return p ? buildReferenceLabel(p, p.abbr) : normalizeReference(ref);
}

export const fetchDevotionalFromDb = async (date: Date): Promise<BibleTextResponse | null> => {
  try {
    const rawRef = await getReferenceForDate(date);
    if (!rawRef) return null;

    const params = parseReference(rawRef);
    if (!params) return null;

    // 교차 장(endCh != ch)도 워커가 (장*1000+절) 복합 범위로 한 번에 조회한다.
    const url = `${WORKER_ENDPOINT}?book=${params.bookId}&ch=${params.chapter}&start=${params.start}&endCh=${params.endChapter}&end=${params.endVerse}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("API Fetch Failed");

    const rawData = await response.json();
    if (!Array.isArray(rawData)) return null;

    const texts = {
      [BibleVersion.KRV]: "",
      [BibleVersion.URIMAN]: "",
      [BibleVersion.NIV]: ""
    };

    // 절 번호만 표기한다("17.", "1."). 교차 장이면 절 번호가 장마다 초기화되지만
    // 장 범위는 헤더 라벨(예: 요나 1:17~2:10)이 전달한다. "장:절"로 표기하면
    // BibleCard.parseVerses의 /(\d+\.\s+)/ 분리와 충돌해 군더더기가 생긴다.
    rawData.forEach((item: any) => {
      const content = `${item.verse}. ${item.content} `;
      if (item.translation === "KRV") texts[BibleVersion.KRV] += content;
      else if (item.translation === "URIMAN") texts[BibleVersion.URIMAN] += content;
      else if (item.translation === "NIV") texts[BibleVersion.NIV] += content;
    });

    // 표시용 참조 라벨 생성 (교차 장 / 장-only 케이스 포함)
    const fullReference = buildReferenceLabel(params, params.bookName);
    const engReference = buildReferenceLabel(params, params.engBookName);

    return {
      reference: fullReference,
      engReference: engReference,
      texts: {
        [BibleVersion.KRV]: texts[BibleVersion.KRV].trim() || "본문이 없습니다.",
        [BibleVersion.URIMAN]: texts[BibleVersion.URIMAN].trim() || "본문이 없습니다.",
        [BibleVersion.NIV]: texts[BibleVersion.NIV].trim() || "본문이 없습니다."
      }
    };
  } catch (error) {
    console.error("fetchDevotionalFromDb error:", error);
    throw error;
  }
};
