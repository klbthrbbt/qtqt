// 두란노 생명의삶 "○월호 본문" 공지 → 큐티 시트 자동 반영 (Google Apps Script)
// 매달 15일 실행. 3일 이상 지난 행은 삭제하고, 이미 채운(수동 편집 포함) 칸은 건드리지 않고 빈 칸·없는 날짜만 채운다.

const SHEET_GID = 455762225;
const BASE = 'https://www.duranno.com/qt/view/';

function syncDurannoSchedule() {
  const sheet = SpreadsheetApp.getActive().getSheets().find(s => s.getSheetId() === SHEET_GID);
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  deleteOldRows(sheet, tz);

  const list = fetchText(BASE + 'notice.asp');
  const posts = [...list.matchAll(/notice_detail\.asp\?sn=(\d+)[^>]*>\s*<span>\s*(\d{4})년\s*(\d{1,2})월호 본문/g)];
  if (!posts.length) console.warn('공지 목록에서 "○월호 본문" 글을 못 찾음 (사이트 구조 변경?)');

  for (const [, sn, y, m] of posts.reverse()) {
    const lastDay = new Date(+y, +m, 0).getDate();
    const days = parseSchedule(fetchText(BASE + 'notice_detail.asp?page=notice&sn=' + sn), lastDay); // page=notice 없으면 본문 빈 페이지
    // 파싱이 어긋나면 엉뚱한 값을 쓰지 않도록 그 달은 건너뜀
    if (!days) {
      console.warn(`${y}년 ${m}월호: 일정 파싱 실패 → 건너뜀`);
      continue;
    }
    for (let d = 1; d <= lastDay; d++) writeDay(sheet, tz, +y, +m, d, days[d]);
  }
}

function fetchText(url) {
  return UrlFetchApp.fetch(url).getContentText('EUC-KR');
}

// "1 몬 1:1~14 2 ..." 또는 "1일 고후 6:1~13 ... 23일 성탄절 QT 사 11:1~9" → {1: '몬 1:1~14', ...}
// 1일부터 순서대로 날짜 표시를 찾고, 그 뒤 첫 "책 장[:절~...]"을 구절로 본다. 하루라도 못 찾으면 null.
function parseSchedule(html, lastDay) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  let pos = text.indexOf('본문은');
  if (pos < 0) return null;
  const days = {};
  for (let d = 1; d <= lastDay; d++) {
    const marker = new RegExp(`\\s${d}일?\\s+(?=[가-힣])`, 'g');
    marker.lastIndex = pos;
    const hit = marker.exec(text);
    if (!hit) return null;
    pos = marker.lastIndex;
    const ref = text.slice(pos, pos + 60).match(/[가-힣]+ \d+(?:[:~-]\d+)*/);
    if (!ref) return null;
    days[d] = ref[0];
  }
  return days;
}

function dateKey(a, tz) {
  return a instanceof Date ? Utilities.formatDate(a, tz, 'yyyy. MM. dd') : String(a).trim();
}

// 오늘로부터 3일 이상 지난 날짜 행과 빈 행을 삭제 (deleteRow라 아래 행이 위로 올라옴)
function deleteOldRows(sheet, tz) {
  const cutoff = Utilities.formatDate(new Date(Date.now() - 3 * 864e5), tz, 'yyyy. MM. dd');
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 2).getValues();
  let remaining = values.length - 1;
  for (let i = values.length - 1; i >= 1; i--) { // 1행(헤더)은 제외, 아래부터 지워야 인덱스가 안 밀림
    const key = dateKey(values[i][0], tz);
    // 데이터 행은 최소 1개 남김: 새 행 추가 시 서식을 복사할 원본이 필요
    if (remaining > 1 && (key === '' || (/^\d{4}\. \d{2}\. \d{2}$/.test(key) && key <= cutoff))) {
      sheet.deleteRow(i + 1);
      remaining--;
    }
  }
}

function writeDay(sheet, tz, y, m, d, ref) {
  const key = Utilities.formatDate(new Date(y, m - 1, d, 12), tz, 'yyyy. MM. dd');
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 2).getValues();
  const idx = values.findIndex(([a]) => dateKey(a, tz) === key);

  if (idx >= 0) {
    if (values[idx][1] === '') sheet.getRange(idx + 1, 2).setValue(ref);
    return;
  }
  // 날짜 행이 없으면 마지막 행 포맷 그대로 추가
  const last = sheet.getLastRow();
  const row = last + 1;
  const prevA = values[last - 1][0];
  sheet.getRange(last, 1, 1, 2).copyTo(sheet.getRange(row, 1, 1, 2), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  sheet.getRange(row, 1).setValue(prevA instanceof Date ? Utilities.parseDate(key, tz, 'yyyy. MM. dd') : key);
  sheet.getRange(row, 2).setValue(ref);
}

// 한 번만 실행: 매달 15일 오전 6시 트리거 등록
function setupMonthlyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncDurannoSchedule').timeBased().onMonthDay(15).atHour(6).create();
}

function testParse() {
  const a = parseSchedule('본문은 아래와 같습니다. *2611 본문 1 몬 1:1~14 2 시 2 3 대상 4~6 <p>서울특별시 용산구</p>', 3);
  console.assert(JSON.stringify(a) === JSON.stringify({ 1: '몬 1:1~14', 2: '시 2', 3: '대상 4~6' }), JSON.stringify(a));
  const b = parseSchedule('본문은 *2612 본문 1일 고후 6:14~7:1 2일 성탄절 QT 요일 4:9~15', 2);
  console.assert(JSON.stringify(b) === JSON.stringify({ 1: '고후 6:14~7:1', 2: '요일 4:9~15' }), JSON.stringify(b));
  console.assert(parseSchedule('본문은 1 몬 1:1~14', 2) === null, '누락된 날은 null');
}
