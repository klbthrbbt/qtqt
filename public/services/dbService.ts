
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

// 장 전체를 뜻할 때 끝 절로 쓰는 값(어떤 장도 이보다 절이 많지 않음).
const WHOLE_CHAPTER_END = 999;

interface ParsedReference {
  bookId: number;
  chapter: number;
  start: number;
  endChapter: number;
  end: number;
  wholeChapters: boolean;
  bookName: string;
  engBookName: string;
}

// 시트 참조 형식(듀란노 표기)을 파싱한다. 지원 형식:
//   "시 119:137~152"   한 장 안의 절 범위
//   "요 3:16"          한 절
//   "대상 7:1~9:34"    장을 넘어가는 절 범위
//   "대상 4~6장"       장 전체 범위
//   "대상 4장"         한 장 전체
// 구분자는 '~' 또는 '-' 모두 허용.
export function parseAbbrReference(ref: string): ParsedReference | null {
  const text = ref.trim();
  const build = (abbr: string, chapter: number, start: number, endChapter: number, end: number, wholeChapters: boolean) => {
    const bookId = ABBR_ID_MAP[abbr.trim()];
    if (!bookId) return null;
    return { bookId, chapter, start, endChapter, end, wholeChapters, bookName: ID_NAME_MAP[bookId], engBookName: ID_ENG_NAME_MAP[bookId] };
  };

  // 장 넘어가는 절 범위: 책 N:V~M:W
  let m = text.match(/^(.+?)\s+(\d+):(\d+)\s*[-~]\s*(\d+):(\d+)$/);
  if (m) return build(m[1], +m[2], +m[3], +m[4], +m[5], false);

  // 한 장 안의 절(범위): 책 N:V[~W]
  m = text.match(/^(.+?)\s+(\d+):(\d+)(?:\s*[-~]\s*(\d+))?$/);
  if (m) {
    const chapter = +m[2];
    const start = +m[3];
    return build(m[1], chapter, start, chapter, m[4] ? +m[4] : start, false);
  }

  // 장 전체(범위): 책 N[~M]장
  m = text.match(/^(.+?)\s+(\d+)(?:\s*[-~]\s*(\d+))?\s*장$/);
  if (m) {
    const chapter = +m[2];
    return build(m[1], chapter, 1, m[3] ? +m[3] : chapter, WHOLE_CHAPTER_END, true);
  }

  return null;
}

// 화면 상단에 보여줄 참조 문자열(한글/영문).
export function formatReference(p: ParsedReference) {
  const multiChapter = p.endChapter !== p.chapter;
  if (p.wholeChapters) {
    const ko = multiChapter ? `${p.bookName} ${p.chapter}~${p.endChapter}장` : `${p.bookName} ${p.chapter}장`;
    const en = multiChapter ? `${p.engBookName} ${p.chapter}-${p.endChapter}` : `${p.engBookName} ${p.chapter}`;
    return { ko, en };
  }
  const range = multiChapter
    ? `${p.chapter}:${p.start}~${p.endChapter}:${p.end}`
    : `${p.chapter}:${p.start}${p.start !== p.end ? `~${p.end}` : ""}`;
  return { ko: `${p.bookName} ${range}`, en: `${p.engBookName} ${range}` };
}

export const fetchDevotionalFromDb = async (date: Date): Promise<BibleTextResponse | null> => {
  try {
    const rawRef = await getReferenceForDate(date);
    if (!rawRef) return null;

    const params = parseAbbrReference(rawRef);
    if (!params) return null;

    const multiChapter = params.endChapter !== params.chapter;
    const url = `${WORKER_ENDPOINT}?book=${params.bookId}&ch=${params.chapter}&start=${params.start}&ech=${params.endChapter}&end=${params.end}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("API Fetch Failed");

    const rawData = await response.json();
    if (!Array.isArray(rawData)) return null;

    const texts = {
      [BibleVersion.KRV]: "",
      [BibleVersion.URIMAN]: "",
      [BibleVersion.NIV]: ""
    };

    rawData.forEach((item: any) => {
      // 여러 장이면 절 번호 앞에 장을 붙여(예: "5:1.") 장이 바뀌는 지점을 구분한다.
      const label = multiChapter && item.chapter != null ? `${item.chapter}:${item.verse}` : `${item.verse}`;
      const content = `${label}. ${item.content} `;
      if (item.translation === "KRV") texts[BibleVersion.KRV] += content;
      else if (item.translation === "URIMAN") texts[BibleVersion.URIMAN] += content;
      else if (item.translation === "NIV") texts[BibleVersion.NIV] += content;
    });

    const { ko: fullReference, en: engReference } = formatReference(params);

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
