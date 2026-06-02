# CLAUDE.md

이 파일은 이 저장소에서 코드를 다루는 **Claude Code**(claude.ai/code)에게 주는 운영 가이드입니다.
This file gives operational guidance to **Claude Code** (claude.ai/code) when working in this repository.

> 요약 한 줄: **API 동작을 바꾸려면 거의 항상 `src/index.js`를 고친다. `src/index.ts`는 미배포 템플릿이다.**
> TL;DR: **To change API behavior, edit `src/index.js`. `src/index.ts` is a non‑deployed template.**

---

## 1. 프로젝트 개요 / Project Overview

`qtqt`(배포명 **`qt-bible-api`**)는 Cloudflare Workers 기반 풀스택 서버리스 일일 큐티(묵상) 앱 "Daily Grace Devotional / 매일 묵상"입니다. **단일 Worker**가 (1) 큐티 본문 일정(Google Sheets 공개 CSV), (2) 성경 구절(D1 SQLite `rwwdt_dailybbang`), (3) React 정적 자산(`public/dist`)을 모두 서빙합니다. 프런트엔드는 `public/`의 **독립적인** React 19 + Vite 패키지입니다.

`qtqt` (deployed as **`qt-bible-api`**) is a full‑stack serverless devotional app on Cloudflare Workers. A **single Worker** serves the schedule (Google Sheets CSV), the verses (D1 SQLite), and the React static assets. The frontend under `public/` is a **separate** React 19 + Vite package.

---

## 2. 자주 쓰는 명령어 / Common Commands

```bash
# ── 루트(워커) / repo root (worker) ──
npm install                # 워커 의존성
npm run dev                # 로컬 워커 (= wrangler dev) → http://localhost:8787/
npx wrangler dev --remote  # 로컬 워커이되 실제 원격 D1/캐시 사용
npm run deploy             # 배포 (= wrangler deploy)
npm run cf-typegen         # Env 타입 생성 (= wrangler types → worker-configuration.d.ts)

# ── 프런트엔드 / frontend (run INSIDE public/) ──
cd public
npm install                # 루트와 분리된 의존성!
npm run dev                # Vite dev → http://localhost:3000/
npm run build              # → public/dist (워커가 ASSETS로 서빙)
npm run preview

# ── D1 데이터베이스 ──
npx wrangler d1 migrations apply rwwdt_dailybbang [--local|--remote]
npx wrangler d1 execute rwwdt_dailybbang --remote --command "SELECT ..."
```

**배포 표준 절차 / canonical deploy flow** (정적 자산 누락 방지):
```bash
cd public && npm run build && cd .. && npm run deploy
```

> ⛔ **테스트/린트 스크립트가 없습니다.** 변경 후에는 `npm run dev` 또는 `curl`로 직접 동작을 확인하세요. "테스트를 돌렸다"고 보고하지 말 것 — 존재하지 않습니다.

---

## 3. 상위 아키텍처 / High‑Level Architecture

### 3.1 이중 진입점 (가장 흔한 함정) / Dual entrypoint — the #1 trap
- ✅ **`src/index.js`** = `wrangler.toml`의 `main`. **실제 배포·실행되는 모든 라우팅/캐싱/D1 로직.**
- ⚠️ **`src/index.ts`** = Hono + Chanfana OpenAPI `/api/tasks*`(+ Swagger `/`). `create-cloudflare` 템플릿 잔재로 **목업 데이터**만 반환하고 **배포에 연결돼 있지 않음.**
- 👉 **API 기능 변경 = `index.js` 수정.** `index.ts`를 실제 기능으로 착각하지 말 것.

### 3.2 워커 라우팅 순서 / Worker routing order (`src/index.js`)
```
1) url.pathname === '/api/reference'            → Sheets CSV + 수동 SWR 캐시
2) url.searchParams.has('book') || '/api/bible' → D1 조회 + immutable 캐시
3) env.ASSETS.fetch(request)                    → public/dist 정적 자산
4) 그 외                                         → 404
```

### 3.3 프런트엔드 데이터 흐름 / Frontend data flow
```
App.tsx fetchData(date)
  → dbService.fetchDevotionalFromDb(date)
      → sheetService.getReferenceForDate(date)  → GET /api/reference  → ISO 날짜 매칭
      → parseAbbrReference("마 8:14~15")         → {book_id, chapter, start, end}
      → GET /api/bible?book=&ch=&start=&end=     → D1 구절
      → translation별 누적 → texts{KRV,(URIMAN),NIV}
  → BibleTextResponse → React 상태 → <BibleCard/>
```
**레이스 가드**: `activeRequestRef`에 현재 요청 날짜를 저장하고 응답 시 일치할 때만 상태 반영(빠른 날짜 전환의 stale 응답 방어). 변경 시 이 불변식을 깨지 말 것.

---

## 4. 코드 위치 맵 / Code Map

| 무엇을 / What | 어디에 / Where |
|---|---|
| **배포되는 워커 로직** | `src/index.js` |
| `/api/reference` (CSV + SWR) | `src/index.js` (`buildReferenceResponse`, `toClientResponse`, `parseCsvToList`) |
| `/api/bible` (D1 + immutable) | `src/index.js` |
| 정적 자산 서빙 | `src/index.js` → `env.ASSETS` (`public/dist`) |
| 배포 설정(진실 공급원) | 루트 `wrangler.toml` |
| OpenAPI 템플릿(미배포) | `src/index.ts`, `src/endpoints/*`, `src/types.ts` |
| 프런트 진입/루트 | `public/index.tsx`, `public/App.tsx` |
| 타입 | `public/types.ts` (`BibleVersion`, `BibleTextResponse`, `AppState`) |
| 데이터 결합(기본 경로) | `public/services/dbService.ts` |
| 일정 조회 | `public/services/sheetService.ts` |
| 로컬 XML 파서(미사용) | `public/services/bibleService.ts` |
| Gemini(미사용) | `public/services/geminiService.ts` |
| UI 컴포넌트 | `public/components/*` |
| 테마/Tailwind/폰트 | `public/index.html` |
| D1 마이그레이션 | `migrations/*.sql` |

---

## 5. 백엔드 심화 / Backend Deep‑Dive (`src/index.js`)

### `/api/reference` 캐싱 모델
`caches.default` 기반 **수동 SWR**. 상수로 정책을 제어:

| 상수 | 값 | 역할 |
|---|---|---|
| `REFERENCE_FRESH_TTL_MS` | 1시간 | 신선도 판단 임계(헤더 `X-Cached-At` 기준 age 계산) |
| `REFERENCE_EDGE_MAX_AGE` | 1년 | 저장본 `max-age` — 엣지가 항목을 오래 보관하도록 |
| `REFERENCE_DOWNSTREAM_MAX_AGE` | 5분 | 브라우저로 내보내는 `max-age` |

- 신선/stale 모두 **즉시 반환**, stale이면 `ctx.waitUntil`로 백그라운드 갱신.
- `?refresh=1` → 강제 갱신, 실패 시 stale 폴백 또는 `502`.
- **의도**: "엣지 보관(1년) ↔ 클라이언트 재확인(5분)"을 분리. 캐시 헤더를 단순화할 때 이 분리를 무너뜨리지 말 것.

### `/api/bible` 계약
- 쿼리 `book`(기본 40), `ch`(8), `start`(14), `end`(15) → `bible_verses` 범위 조회.
- 반환: `[{ translation, verse, content }]`, `Cache-Control: public, max-age=31536000, immutable`.
- `env.DB` 없으면 한국어 메시지로 `500`.
- 캐시 키는 전체 URL이므로 쿼리 파라미터가 다르면 별도 캐시 항목.

---

## 6. 프런트엔드 심화 / Frontend Deep‑Dive

### 테마 / Theming (`public/index.html`)
- **FOUC 방지**: `<head>` 인라인 스크립트가 첫 페인트 전에 `localStorage('theme')`/`prefers-color-scheme`로 `<html>.dark`를 설정.
- **Tailwind CDN** + 인라인 `tailwind.config`(`darkMode: 'class'`). **빌드용 tailwind 설정 파일 없음** — 색상 추가는 `index.html`의 `theme.extend.colors`를 편집.
- 팔레트 = "Shades of Purple": `sop-bg/-dark/-fg/-hover/-gold/-orange/-pink/-purple`.
- 유틸 클래스: `serif-font`, `noto-sans`, `eng-font`, `no-scrollbar`.

### 상태 / State (`public/App.tsx`)
- 단일 `AppState`(useState). 다크 토글 = `classList.toggle('dark', next)` + `localStorage`.
- 로딩 화면은 `LYRICS` 5개를 4초마다 순환.

### 본문 조회 — 세 가지 전략 / Three verse strategies
| 서비스 | 방식 | 현재 사용 |
|---|---|---|
| `dbService` | 프로덕션 워커 `/api/bible`(D1) | ✅ 기본 |
| `bibleService` | 로컬 `krv/uriman/niv.xml`을 `DOMParser`로 파싱 | ⚠️ 미사용 |
| `geminiService` | Gemini `gemini-3-flash-preview` 구조화 JSON(본문+묵상+기도), 429 백오프 | ⚠️ 미사용 |

### 컴포넌트 / Components
연결됨: `Header`, `BibleCard`, `FooterNav`, `DatePickerModal`.
미사용: `CalendarModal`, `ReflectionCard`(AI 묵상 UI 연결 시 활용 지점).

---

## 7. 데이터 모델 & 참조 파싱 / Data Model & Reference Parsing

**`bible_verses`(쿼리에서 역추론)**: `book_id`(1–66), `chapter`, `verse`, `translation`('KRV'|'NIV'|'URIMAN'), `content`. 인덱스 `idx_bible_lookup(book_id, chapter, verse)`. **권위 있는 `CREATE TABLE` DDL은 저장소에 없음.**

**참조 형식**: `마 8:14~15`(한글 약칭 + 장:절, `-`/`~`). `parseAbbrReference` 정규식 `^(.+?)\s+(\d+):(\d+)(?:[-~](\d+))?$` + `ABBR_ID_MAP`(예 `마→40`). 책 ID↔한/영 이름 매핑 테이블은 `dbService.ts`에 있음.

---

## 8. 컨벤션 / Conventions

- **커밋**: `feat:`/`fix:` + **한국어** 설명(예: `fix: 날짜 선택 모달 정렬 및 선택 로직 개선`).
- **사용자 문자열**은 한국어 기본.
- **React**: 함수형 + 훅, PascalCase 컴포넌트, camelCase 함수/변수.
- **검증**: 백엔드 스키마는 Zod(Chanfana).
- **개발 브랜치**에서 작업하고 커밋/푸시는 지시가 있을 때만.

---

## 9. 알려진 함정 & 기술 부채 / Known Gotchas & Tech Debt

작업 전 반드시 인지할 사항 / Read before editing:

1. **`BibleVersion.URIMAN` 불일치** — `public/types.ts` enum에는 `KRV`, `NIV`만 있으나 `dbService`/`bibleService`/`geminiService`/`AppState.fileStatus.uriman`가 `URIMAN`을 참조. Vite(esbuild)는 타입검사를 건너뛰어 런타임에선 `undefined` 키로 통과하지만 `tsc`로는 오류. **버전 관련 코드를 만지면 이 불일치를 의식**하고, 가능하면 정리(enum 복원 또는 참조 제거).
2. **프로덕션 URL 하드코딩** — `dbService.ts`/`sheetService.ts`에 `https://qt-bible-api.junjunebug.workers.dev`가 박혀 있음. 로컬 워커로 데이터를 검증하려면 직접 `curl localhost:8787/api/...` 사용. 리팩터 시 상대경로/환경변수 권장.
3. **이중 `wrangler.toml`** — 루트가 진실 공급원. `public/wrangler.toml`은 `[assets]` 없는 보조본. 배포 관련 변경은 **루트만** 수정.
4. **`src/index.ts` 미배포** — 실제 기능 아님. `main`을 `index.ts`로 바꾸면 현재 동작이 깨짐.
5. **미사용 모듈** — `bibleService`, `geminiService`, `CalendarModal`, `ReflectionCard`.
6. **테스트/린트 없음** — 수동 검증 필수.
7. **D1 DDL 부재** — 스키마 변경 시 추론에 의존.
8. **importmap ↔ Vite 중복** — `index.html`의 `esm.sh` importmap과 번들 공존.

---

## 10. 변경 시 검증 체크리스트 / Verification Checklist

- [ ] 프런트 변경: `cd public && npm run build` → `npm run dev` → `http://localhost:8787/`에서 육안 확인.
- [ ] 워커/캐시 변경: `curl "http://localhost:8787/api/reference"`, `curl "http://localhost:8787/api/bible?book=40&ch=8&start=14&end=15"`로 응답·헤더 확인(필요 시 `--remote`).
- [ ] D1 스키마/인덱스 변경: `wrangler d1 migrations apply` 후 `wrangler d1 execute ... --command "SELECT ..."`로 검증.
- [ ] 타입 의존 변경: `npm run cf-typegen`으로 `Env` 재생성.
- [ ] 캐시 헤더 변경: "엣지 1년 / 클라이언트 5분(reference)" 및 "immutable(bible)" 의도 유지 확인.

---

## 11. 하지 말 것 / Things to Avoid

- ❌ `src/index.ts`/`/api/tasks*`를 실제 기능으로 오인해 수정하지 말 것(미배포).
- ❌ `wrangler.toml`의 `main`을 임의로 `index.ts`로 변경하지 말 것.
- ❌ `public/dist` 빌드 없이 정적 자산 변경이 반영된다고 가정하지 말 것.
- ❌ 시크릿(`GEMINI_API_KEY` 등)을 코드/`wrangler.toml`에 하드코딩·커밋하지 말 것 → `.env.local` 또는 `wrangler secret`.
- ❌ `activeRequestRef` 레이스 가드를 제거/약화하지 말 것.
- ❌ 캐시 헤더를 "단순화"하면서 엣지/클라이언트 분리 의도를 무너뜨리지 말 것.
- ❌ 존재하지 않는 테스트/린트를 실행했다고 보고하지 말 것.
