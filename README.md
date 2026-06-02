<div align="center">

# 🍞 qtqt — Daily Grace Devotional (매일 묵상)

**Cloudflare Workers 위에서 동작하는 풀스택 서버리스 일일 큐티(묵상) 웹 애플리케이션**
*A full‑stack, edge‑native daily devotional (Quiet Time) web application built on Cloudflare Workers.*

`Cloudflare Workers` · `D1 (SQLite)` · `Hono` · `Chanfana (OpenAPI)` · `React 19` · `Vite 6` · `TypeScript` · `Tailwind (CDN)` · `Gemini`

</div>

---

## 목차 / Table of Contents

1. [개요 / Overview](#개요--overview)
2. [주요 기능 / Features](#주요-기능--features)
3. [기술 스택 / Tech Stack](#기술-스택--tech-stack)
4. [시스템 아키텍처 / System Architecture](#시스템-아키텍처--system-architecture)
5. [요청 생명주기 / Request Lifecycle](#요청-생명주기--request-lifecycle)
6. [저장소 구조 / Repository Structure](#저장소-구조--repository-structure)
7. [백엔드 워커 / Backend Worker](#백엔드-워커--backend-worker)
8. [프런트엔드 / Frontend](#프런트엔드--frontend)
9. [데이터 모델 / Data Model](#데이터-모델--data-model)
10. [시작하기 / Getting Started](#시작하기--getting-started)
11. [환경 설정 / Configuration](#환경-설정--configuration)
12. [데이터베이스 & 마이그레이션 / Database & Migrations](#데이터베이스--마이그레이션--database--migrations)
13. [배포 / Deployment](#배포--deployment)
14. [API 레퍼런스 / API Reference](#api-레퍼런스--api-reference)
15. [알려진 이슈 & 기술 부채 / Known Issues & Tech Debt](#알려진-이슈--기술-부채--known-issues--tech-debt)
16. [로드맵 / Roadmap](#로드맵--roadmap)
17. [기여 & 컨벤션 / Contributing & Conventions](#기여--컨벤션--contributing--conventions)
18. [라이선스 / License](#라이선스--license)

---

## 개요 / Overview

**KO** — `qtqt`(배포명 **`qt-bible-api`**)는 매일 정해진 성경 본문(큐티 본문)을 보여 주는 모바일 우선(mobile‑first) 묵상 앱입니다. 핵심 설계는 **하나의 Cloudflare Worker가 API와 정적 자산을 모두 서빙**하는 단일 엣지 배포입니다.

- **본문 일정(어느 날 무슨 본문인지)** 은 공개된 **Google Sheets CSV**에서 가져옵니다.
- **실제 성경 구절**은 Cloudflare **D1(SQLite)** 데이터베이스(`rwwdt_dailybbang`)의 `bible_verses` 테이블에서 조회합니다.
- 두 응답 모두 **엣지 캐시**(`caches.default`)로 가속됩니다 — 일정은 stale‑while‑revalidate, 구절은 immutable.
- UI는 **React 19 + Vite** 단일 페이지 앱이며, 빌드 산출물(`public/dist`)을 동일 Worker가 정적 자산으로 서빙합니다.

**EN** — `qtqt` (deployed as **`qt-bible-api`**) is a mobile‑first devotional app that surfaces a scheduled Bible passage for each day. The architecture centers on **a single Cloudflare Worker that serves both the API and the static assets** from the edge:

- The **reading schedule** (which passage on which date) comes from a published **Google Sheets CSV**.
- The **actual verses** are read from a Cloudflare **D1 (SQLite)** database (`rwwdt_dailybbang`), table `bible_verses`.
- Both are accelerated by **edge caching** (`caches.default`) — stale‑while‑revalidate for the schedule, immutable for verses.
- The UI is a **React 19 + Vite** SPA whose build output (`public/dist`) is served as static assets by the same Worker.

---

## 주요 기능 / Features

| 기능 / Feature | 설명 / Description |
|---|---|
| 📖 일일 본문 / Daily passage | 선택한 날짜의 큐티 본문을 자동 표시 / Auto‑renders the scheduled passage for the selected date. |
| 🌏 다중 성경 버전 / Multiple versions | `개역개정(KRV)`·`NIV` 전환(코드에는 `우리말성경(URIMAN)` 흔적 잔존 — [기술 부채](#알려진-이슈--기술-부채--known-issues--tech-debt) 참고). |
| 🌙 다크 모드 / Dark mode | FOUC 방지 인라인 부트 스크립트 + 시스템 설정 감지 + `localStorage('theme')` 영속화. |
| 📅 날짜 탐색 / Date navigation | 날짜 선택 모달로 이전·이후 본문 이동. |
| ⚡ 엣지 캐싱 / Edge caching | SWR(stale‑while‑revalidate) + immutable 캐시로 저지연 응답. |
| 🏃 레이스 가드 / Race‑safe fetch | `activeRequestRef`로 빠른 날짜 전환 시 stale 응답이 화면을 덮어쓰지 않도록 방어. |
| 🎨 "Shades of Purple" 테마 | 다크 모드 팔레트가 동명의 인기 VSCode 테마 색상(`sop-*`)을 차용. |
| 🤖 AI 묵상(WIP) / AI reflection | `@google/genai`(Gemini) 기반 본문·묵상·기도 생성 서비스가 존재(현재 UI 미연결). |

---

## 기술 스택 / Tech Stack

| 레이어 / Layer | 기술 / Technology | 비고 / Notes |
|---|---|---|
| 런타임 / Runtime | **Cloudflare Workers** | `compatibility_date = 2026-01-30` |
| 배포 진입점 / Entry | **`src/index.js`** (Vanilla Worker) | `wrangler.toml`의 `main`. 실제 API 로직. |
| OpenAPI(템플릿) | **Hono 4 + Chanfana 2** (`src/index.ts`) | `/api/tasks*`, Swagger UI `/`. 미배포·목업. |
| 검증 / Validation | **Zod 3** | Chanfana 스키마 정의. |
| 데이터 / Data | **Cloudflare D1 (SQLite)** + **Google Sheets CSV** | 구절 + 일정. |
| 프런트엔드 / Frontend | **React 19**, **Vite 6**, **TypeScript ~5.8** | `public/` 독립 패키지. |
| 스타일 / Styling | **Tailwind CSS (CDN)** | 빌드 단계 없음, 인라인 `tailwind.config`. |
| 폰트 / Fonts | Pretendard, Noto Serif/Sans KR | CDN 로드. |
| AI | **`@google/genai`** (Gemini `gemini-3-flash-preview`) | 구조화 JSON 응답 + 429 백오프 재시도. |
| 툴링 / Tooling | **Wrangler 4** | dev/deploy/types/d1. |
| 테스트·린트 / Test·Lint | *(없음 / none)* | 미구성. |

---

## 시스템 아키텍처 / System Architecture

```
                          ┌───────────────────────────────────────────────┐
   브라우저 / Browser  ───▶│        Cloudflare Worker  (qt-bible-api)        │
   (React SPA)            │              src/index.js  ← main               │
                          │                                                 │
                          │  GET /api/reference ─┐                          │
                          │  GET /api/bible ─────┤  caches.default (edge)   │
                          │  /* (그 외) */ ──────┘                          │
                          └───────┬───────────────┬───────────────┬─────────┘
                                  │               │               │
                   Google Sheets │      D1 SQLite │       ASSETS  │
                   (공개 CSV)     ▼      (D1 binding▼)     (정적)  ▼
                  ┌───────────────────┐  ┌───────────────────┐  ┌──────────────┐
                  │ 큐티 본문 일정     │  │ rwwdt_dailybbang  │  │ public/dist  │
                  │ {date,reference}[]│  │   bible_verses    │  │ (Vite build) │
                  └───────────────────┘  └───────────────────┘  └──────────────┘
```

> ⚠️ **핵심 / Critical** — 배포·실행되는 진입점은 **`src/index.js`** 입니다. `src/index.ts`(Hono + Chanfana, `/api/tasks*` OpenAPI)는 `create-cloudflare` 템플릿 잔재로 **배포 설정에서 참조되지 않으며 목업 데이터만** 반환합니다.
> The deployed entrypoint is **`src/index.js`**. `src/index.ts` (the Hono + Chanfana `/api/tasks*` OpenAPI app) is template leftover — **not referenced by the deploy config**, returning mock data only.

> ⚠️ **프런트엔드 → 프로덕션 API / Frontend calls production** — `public/services/*`는 워커 URL `https://qt-bible-api.junjunebug.workers.dev/api/...`를 **하드코딩**합니다. 따라서 로컬에서 프런트엔드를 띄워도 데이터는 **프로덕션 워커**에서 옵니다. 자세한 내용은 [환경 설정](#환경-설정--configuration)·[기술 부채](#알려진-이슈--기술-부채--known-issues--tech-debt) 참고.

---

## 요청 생명주기 / Request Lifecycle

본문이 화면에 뜨기까지의 전체 데이터 흐름 / End‑to‑end data flow for rendering a passage:

```
App.tsx: fetchData(date)
   │
   ▼
dbService.fetchDevotionalFromDb(date)
   │   1) sheetService.getReferenceForDate(date)
   │        └─▶ GET /api/reference  →  [{date:"YYYY-MM-DD", reference:"마 8:14~15"}, ...]
   │              찾기: list.find(item => item.date === ISO(date))
   │   2) parseAbbrReference("마 8:14~15")
   │        └─ 정규식 ^(.+?)\s+(\d+):(\d+)(?:[-~](\d+))?$  +  ABBR_ID_MAP("마"→40)
   │        └─ { bookId:40, chapter:8, start:14, end:15 }
   │   3) GET /api/bible?book=40&ch=8&start=14&end=15
   │        └─▶ D1: SELECT translation, verse, content
   │                FROM bible_verses
   │                WHERE book_id=? AND chapter=? AND verse BETWEEN ? AND ?
   │   4) translation별로 구절 누적 → texts{ KRV, (URIMAN), NIV }
   ▼
BibleTextResponse { reference, engReference, texts } → React 상태 → <BibleCard/>
```

핵심 방어 로직 / Key safeguards:
- **레이스 가드**: `activeRequestRef`에 현재 요청 날짜를 저장하고, 응답 시점에 일치하는 경우에만 상태를 반영해 **빠른 날짜 전환 시 오래된 응답이 최신 화면을 덮어쓰는 문제를 방지**합니다.
- **로딩 UX**: 로딩 동안 5개의 말씀 구절(`LYRICS`)을 4초 간격으로 순환 표시합니다.

---

## 저장소 구조 / Repository Structure

```
qtqt/
├── wrangler.toml              # ★ 배포 설정: main=src/index.js, [assets]=public/dist, D1 바인딩
├── package.json               # 루트(워커) 의존성·스크립트 (chanfana, hono, zod, wrangler)
├── tsconfig.json              # 루트 TS 설정 (target ES2024, strict, noEmit)
├── worker-configuration.d.ts  # `wrangler types` 자동 생성 (Env 타입)
│
├── migrations/
│   └── 0001_add_bible_lookup_index.sql   # bible_verses(book_id,chapter,verse) 인덱스
│
├── src/                       # ── 백엔드 (Worker) ──
│   ├── index.js               # ★ 실제 라우팅/캐싱/D1 조회 (배포 진입점)
│   ├── index.ts               # OpenAPI 템플릿 (미배포, 목업)
│   ├── types.ts               # Zod Task 스키마 + AppContext
│   └── endpoints/
│       ├── taskList.ts        # GET  /api/tasks   (목업)
│       ├── taskCreate.ts      # POST /api/tasks   (목업)
│       ├── taskFetch.ts       # GET  /api/tasks/:taskSlug (목업)
│       └── taskDelete.ts      # DELETE /api/tasks/:taskSlug (목업)
│
└── public/                    # ── 프런트엔드 (독립 패키지) ──
    ├── package.json           # React 19 / Vite 6 / @google/genai
    ├── vite.config.ts         # port 3000, GEMINI_API_KEY 주입, alias '@'→루트
    ├── tsconfig.json
    ├── wrangler.toml          # 보조/중복 설정 (assets 블록 없음)
    ├── index.html             # Tailwind CDN + tailwind.config + FOUC 방지 테마 부트
    ├── metadata.json          # 앱 메타데이터(AI Studio)
    ├── index.tsx              # React 진입점
    ├── App.tsx                # 루트 컴포넌트 (상태/로딩/에러/테마 토글)
    ├── types.ts               # BibleVersion, BibleTextResponse, AppState
    ├── components/
    │   ├── Header.tsx         # 버전 선택 + 찬양 링크
    │   ├── BibleCard.tsx      # 본문 렌더
    │   ├── FooterNav.tsx      # 하단 고정 내비(날짜/참조)
    │   ├── DatePickerModal.tsx# 날짜 선택 모달
    │   ├── CalendarModal.tsx  # 달력 (현재 App에서 미사용)
    │   └── ReflectionCard.tsx # AI 묵상 카드 (현재 App에서 미사용)
    └── services/
        ├── dbService.ts       # ★ 기본 경로: /api/reference + /api/bible 결합
        ├── sheetService.ts    # /api/reference 조회 + 날짜 매칭
        ├── bibleService.ts    # 로컬 XML(krv/uriman/niv.xml) 파싱 (대체 경로, 미사용)
        └── geminiService.ts   # Gemini 본문·묵상·기도 생성 (대체 경로, 미사용)
```

---

## 백엔드 워커 / Backend Worker

모든 실제 로직은 **`src/index.js`** 의 단일 `fetch` 핸들러에 있습니다. 경로 매칭 순서는 ① `/api/reference` → ② `/api/bible`(또는 `?book=` 존재) → ③ 정적 자산(`ASSETS`) → ④ `404` 입니다.

### `/api/reference` — 본문 일정 (수동 SWR)

Google Sheets 공개 CSV를 파싱하여 `{ date, reference }[]`를 반환합니다. CSV 파서는 따옴표를 고려한 분할과 `YYYY[.-\s]M[.-\s]D` 날짜 정규화를 수행합니다.

캐싱 상수(파일 상단 정의):

| 상수 / Constant | 값 / Value | 의미 / Meaning |
|---|---|---|
| `REFERENCE_FRESH_TTL_MS` | `3600_000` (1시간) | 신선도 TTL. 초과 시 stale 즉시 반환 + 백그라운드 갱신. |
| `REFERENCE_EDGE_MAX_AGE` | `31536000` (1년) | 저장본 `max-age` — 엣지(`caches.default`) 보관 유도. |
| `REFERENCE_DOWNSTREAM_MAX_AGE` | `300` (5분) | 브라우저로 내려보내는 `max-age`. 5분마다 따뜻한 엣지 재확인. |

동작: 저장본은 1년 `max-age`로 엣지에 오래 보관하되, **신선도 판단은 헤더 `X-Cached-At`(저장 시각 ms)로 직접 계산**합니다. 신선/stale 모두 즉시 반환하고, stale이면 `ctx.waitUntil`로 백그라운드 갱신합니다. `?refresh=1`로 강제 갱신, 상류 실패 시 stale 폴백 또는 `502`.

### `/api/bible` — 구절 조회 (immutable)

D1에서 구절을 조회합니다. 결과는 **응답 단위로 캐시 키(URL)** 에 immutable로 저장됩니다.

| 파라미터 / Param | 기본값 / Default | 매핑 / Maps to |
|---|---|---|
| `book` | `40` (마태복음) | `book_id` |
| `ch` | `8` | `chapter` |
| `start` | `14` | `verse >= start` |
| `end` | `15` | `verse <= end` |

```sql
SELECT translation, verse, content FROM bible_verses
WHERE book_id = ? AND chapter = ? AND verse BETWEEN ? AND ?;
```

응답 헤더: `Cache-Control: public, max-age=31536000, immutable`, `Access-Control-Allow-Origin: *`. `env.DB` 미바인딩 시 `500`.

### 정적 자산 / Static assets

위 API에 매칭되지 않으면 `env.ASSETS.fetch(request)`로 `public/dist`를 서빙하고, 404면 워커가 최종 `404`를 반환합니다.

### OpenAPI 템플릿 (`src/index.ts`)

Hono 앱에 Chanfana로 `/api/tasks*` CRUD와 Swagger UI(`/`)를 등록합니다. Zod `Task` 스키마(`src/types.ts`)로 입력을 검증하지만 **핸들러는 하드코딩된 목업**을 반환하고 **배포 설정에 연결되어 있지 않습니다**.

---

## 프런트엔드 / Frontend

### 부트스트랩 & 테마 / Bootstrap & theming (`public/index.html`)
- **FOUC 방지**: `<head>` 인라인 스크립트가 첫 페인트 전에 `localStorage('theme')` 또는 `prefers-color-scheme`를 읽어 `<html>`에 `dark` 클래스를 선반영.
- **Tailwind (CDN)**: `tailwind.config = { darkMode: 'class', theme.extend.colors = { sop-* } }`. 빌드 단계 Tailwind 설정 파일은 없습니다.
- **"Shades of Purple" 팔레트**: `sop-bg #2d2b55`, `sop-bg-dark #1e1e3f`, `sop-fg #a599e9`, `sop-hover #4d21fc`, `sop-gold #fad000`, `sop-orange #ff7200`, `sop-pink #ff628c`, `sop-purple #b362ff`.
- **폰트/유틸 클래스**: `serif-font`, `noto-sans`, `eng-font`, `no-scrollbar`.
- **importmap**: React/`@google/genai`를 `esm.sh`에서 직접 매핑(빌드와 별개의 보조 경로).

### 상태 관리 / State (`public/App.tsx`)
- 단일 `AppState`(`useState`): `currentDate`, `selectedVersion`, `devotional`, `loading`, `error`, `fileStatus`.
- 다크 토글은 `classList.toggle('dark', next)` + `localStorage` 영속화.
- 초기 로드 시 `fetchData(currentDate)` 1회 실행. 날짜/버전 변경 핸들러 제공.

### 서비스 / Services

| 파일 / File | 역할 / Role | 사용 여부 / Wired in? |
|---|---|---|
| `dbService.ts` | `/api/reference` + `/api/bible`를 결합해 `BibleTextResponse` 생성. 한글 약칭→`book_id`(1–66) 매핑, 한/영 책 이름 매핑. | ✅ `App.tsx`의 기본 경로 |
| `sheetService.ts` | `/api/reference` 호출 후 ISO 날짜로 본문 참조 검색. | ✅ (dbService가 사용) |
| `bibleService.ts` | 로컬 `krv.xml`/`uriman.xml`/`niv.xml`을 `DOMParser`로 견고하게 파싱(책/장/절 별칭·인덱스 폴백). | ⚠️ 대체 경로, 현재 미사용 |
| `geminiService.ts` | Gemini `gemini-3-flash-preview` 구조화 JSON으로 본문·묵상·기도 생성, 429 지수 백오프 재시도. | ⚠️ 대체 경로, 현재 미사용 |

> 본문 조회에는 **세 가지 독립 전략**(D1 API / 로컬 XML / Gemini)이 구현돼 있으나 **현재 UI는 D1 경로만** 사용합니다.

### 컴포넌트 / Components

| 컴포넌트 | props | App 연결 |
|---|---|---|
| `Header` | `selectedVersion`, `fileStatus`, `onVersionChange` | ✅ |
| `BibleCard` | `devotional`, `selectedVersion` | ✅ |
| `FooterNav` | `date`, `reference`, `onOpenDatePicker` | ✅ |
| `DatePickerModal` | `currentDate`, `onDateSelect`, `onClose` | ✅ |
| `CalendarModal` | — | ⚠️ 미사용 |
| `ReflectionCard` | — | ⚠️ 미사용 |

---

## 데이터 모델 / Data Model

### D1: `bible_verses` (코드로부터 추론 / inferred from code)

| 컬럼 / Column | 타입(추정) / Type | 설명 / Description |
|---|---|---|
| `book_id` | INTEGER | 1–66 (창세기=1 … 요한계시록=66) |
| `chapter` | INTEGER | 장 / chapter |
| `verse` | INTEGER | 절 / verse |
| `translation` | TEXT | `'KRV'` / `'NIV'` / `'URIMAN'` |
| `content` | TEXT | 절 본문 / verse text |

인덱스: `idx_bible_lookup (book_id, chapter, verse)` — `/api/bible`의 범위 조회 가속.

> 위 스키마는 쿼리(`SELECT ... FROM bible_verses WHERE book_id=? AND chapter=? AND verse BETWEEN ? AND ?`)와 마이그레이션에서 **역추론**한 것입니다. 권위 있는 `CREATE TABLE` DDL은 저장소에 포함돼 있지 않습니다.

### 참조 문자열 형식 / Reference string format
- Sheets의 `reference`는 `마 8:14~15`처럼 **한글 약칭 + 장:절 범위** 형태(`-` 또는 `~`).
- `dbService.parseAbbrReference`가 정규식 `^(.+?)\s+(\d+):(\d+)(?:[-~](\d+))?$` 로 파싱하고 `ABBR_ID_MAP`(예: `마→40`)으로 `book_id`를 얻습니다.

---

## 시작하기 / Getting Started

### 사전 준비 / Prerequisites
- **Node.js 18+** 와 npm
- **Cloudflare 계정** + Wrangler 로그인: `npx wrangler login`
- 시드된 **D1 데이터베이스** `rwwdt_dailybbang`(`bible_verses` 테이블)
- (선택) Gemini 기능용 **`GEMINI_API_KEY`**

### 설치 & 실행 / Install & run

```bash
# 1) 워커 의존성 (repo root)
npm install

# 2) 프런트엔드 의존성 (별도 패키지!)
cd public && npm install && cd ..

# 3) 프런트엔드 빌드 → public/dist (워커가 ASSETS로 서빙)
cd public && npm run build && cd ..

# 4) 워커 로컬 실행 (정적 자산 + API)
npm run dev          # → http://localhost:8787/
#   로컬에서 실제 D1을 쓰려면:
# npx wrangler dev --remote
```

### 프런트엔드만 빠르게 개발 / Frontend‑only dev

```bash
cd public
npm run dev          # Vite dev server → http://localhost:3000/
```

> ℹ️ 프런트엔드 서비스는 **프로덕션 워커 URL을 하드코딩**하므로, Vite 단독 실행에서도 `/api/*` 데이터는 프로덕션에서 옵니다. 로컬 워커의 D1/캐시 로직을 검증하려면 `curl http://localhost:8787/api/...`로 직접 호출하세요.

---

## 환경 설정 / Configuration

| 항목 / Item | 위치 / Location | 비고 / Notes |
|---|---|---|
| 워커 이름·진입점 | 루트 `wrangler.toml` | `name="qt-bible-api"`, `main="src/index.js"` |
| 정적 자산 / Assets | 루트 `wrangler.toml` `[assets]` | `directory="./public/dist"`, `binding="ASSETS"` |
| D1 바인딩 | 루트 `wrangler.toml` `[[d1_databases]]` | `binding="DB"`, `database_name="rwwdt_dailybbang"` |
| `GEMINI_API_KEY` | `public/.env.local` | Vite가 `process.env.API_KEY`/`GEMINI_API_KEY`로 주입 |
| 프로덕션 API URL | `public/services/dbService.ts`, `sheetService.ts` | **하드코딩** `https://qt-bible-api.junjunebug.workers.dev` |
| Sheets CSV 소스 | `src/index.js` 상단 `PUBLISHED_CSV_URL` | 공개 게시 CSV |

> 🔐 시크릿(`GEMINI_API_KEY` 등)은 **커밋 금지**. `.env.local` 또는 `wrangler secret put`을 사용하세요. (`.gitignore`에 `.env*` 포함.)

> ⚠️ **두 개의 `wrangler.toml`**: 루트가 배포의 진실 공급원입니다. `public/wrangler.toml`은 `[assets]` 블록이 없는 보조/중복 설정이므로 혼동에 주의하세요.

---

## 데이터베이스 & 마이그레이션 / Database & Migrations

```bash
# 마이그레이션 적용 / apply migrations
npx wrangler d1 migrations apply rwwdt_dailybbang            # 원격 / remote
npx wrangler d1 migrations apply rwwdt_dailybbang --local    # 로컬 / local

# 임시 쿼리 / ad-hoc query
npx wrangler d1 execute rwwdt_dailybbang --remote \
  --command "SELECT translation, COUNT(*) FROM bible_verses GROUP BY translation;"
```

- `migrations/0001_add_bible_lookup_index.sql` — `bible_verses(book_id, chapter, verse)`에 인덱스를 생성해 `/api/bible` 범위 조회 성능을 높입니다.

---

## 배포 / Deployment

```bash
cd public && npm run build && cd ..   # 1) 프런트엔드 빌드 → public/dist
npm run deploy                        # 2) wrangler deploy (→ qt-bible-api)
```

워커 타입(Env) 재생성 / regenerate worker types:

```bash
npm run cf-typegen     # = wrangler types → worker-configuration.d.ts
```

> 배포 전 **반드시 `public/dist`를 빌드**하세요. 워커의 `ASSETS` 바인딩이 이 폴더를 서빙합니다. 빌드를 누락하면 정적 자산이 제공되지 않습니다.

---

## API 레퍼런스 / API Reference

### `GET /api/reference`
큐티 본문 일정 목록을 반환합니다. / Returns the devotional schedule.

```bash
curl "http://localhost:8787/api/reference"
# 강제 갱신 / force refresh:
curl "http://localhost:8787/api/reference?refresh=1"
```
```jsonc
// 200 OK  (Cache-Control: public, max-age=300)
[
  { "date": "2026-06-02", "reference": "마 8:14~15" },
  { "date": "2026-06-03", "reference": "마 8:16~17" }
]
// 502  → { "error": "sheet fetch failed" }  (상류 실패 & stale 없음)
```

### `GET /api/bible`
D1의 구절을 반환합니다. / Returns verses from D1.

```bash
curl "http://localhost:8787/api/bible?book=40&ch=8&start=14&end=15"
```
```jsonc
// 200 OK  (Cache-Control: public, max-age=31536000, immutable)
[
  { "translation": "KRV", "verse": 14, "content": "예수께서 베드로의 집에 들어가사..." },
  { "translation": "NIV", "verse": 14, "content": "When Jesus came into Peter's house..." }
]
// 500 → "데이터베이스 연결 설정(Binding)이 누락되었습니다."   (env.DB 누락)
// 500 → { "error": "<message>" }                              (쿼리 예외)
```

### `*/api/tasks*` (템플릿 / template, 미배포)
`src/index.ts`의 Chanfana OpenAPI 엔드포인트. Swagger UI는 `/`. 목업 데이터만 반환하며 배포 `main`에 연결되어 있지 않습니다.

| 메서드 / Method | 경로 / Path | 설명 / Description |
|---|---|---|
| GET | `/api/tasks` | 목록(쿼리 `page`, `isCompleted`) |
| POST | `/api/tasks` | 생성(`Task` 스키마) |
| GET | `/api/tasks/:taskSlug` | 단건 조회 |
| DELETE | `/api/tasks/:taskSlug` | 삭제 |

---

## 알려진 이슈 & 기술 부채 / Known Issues & Tech Debt

이 섹션은 신규 기여자/유지보수자가 빠르게 함정을 피하도록 **의도적으로 솔직하게** 정리했습니다.

1. **`BibleVersion` enum 불일치 / enum inconsistency.**
   `public/types.ts`의 enum은 `KRV`, `NIV`만 정의하지만, `dbService.ts`·`bibleService.ts`·`geminiService.ts`와 `AppState.fileStatus.uriman`는 여전히 `BibleVersion.URIMAN`(우리말성경)을 참조합니다(커밋 "우리말성경 제거"의 잔재). Vite는 esbuild로 **타입 검사 없이 트랜스파일**하므로 런타임에선 `undefined` 키로 흘러가지만, `tsc` 기준으로는 오류입니다. enum에 `URIMAN`을 복원하거나 모든 참조를 제거해 정리할 필요가 있습니다.

2. **프로덕션 URL 하드코딩 / Hardcoded production URLs.**
   `dbService.ts`·`sheetService.ts`가 `https://qt-bible-api.junjunebug.workers.dev/api/...`를 직접 사용 → 로컬/스테이징 분리가 불가능. **상대 경로(`/api/...`)** 또는 환경변수 기반 베이스 URL로 전환을 권장.

3. **이중 `wrangler.toml` / Duplicate config.** 루트와 `public/` 두 곳에 존재하며 `public/` 쪽은 `[assets]`가 없습니다. 설정 드리프트 위험.

4. **미배포 템플릿 / Dead template.** `src/index.ts` + `src/endpoints/*`는 목업이며 배포에 연결되지 않습니다. 제거하거나 실제 기능으로 승격할지 결정 필요.

5. **미사용 코드 / Unused modules.** `bibleService.ts`, `geminiService.ts`, `CalendarModal.tsx`, `ReflectionCard.tsx`는 현재 `App.tsx`에 연결돼 있지 않습니다.

6. **테스트·린트 부재 / No tests or linting.** 회귀 방어 장치가 없습니다. 변경 시 수동 검증 필요.

7. **D1 DDL 부재 / No authoritative DDL.** `bible_verses` 스키마는 쿼리에서 역추론할 수밖에 없습니다. `CREATE TABLE` 마이그레이션 추가를 권장.

8. **importmap ↔ Vite 중복.** `index.html`의 `esm.sh` importmap과 Vite 번들이 공존합니다.

---

## 로드맵 / Roadmap

- [ ] AI 묵상 카드(`ReflectionCard` + `geminiService`) UI 연결
- [ ] `BibleVersion`/URIMAN 일관성 정리
- [ ] API 베이스 URL 환경변수화(로컬/프로덕션 분리)
- [ ] `bible_verses` `CREATE TABLE` 마이그레이션 추가
- [ ] 기본 테스트/린트 도입(예: Vitest + ESLint)
- [ ] `src/index.ts` 템플릿 제거 또는 기능화

---

## 기여 & 컨벤션 / Contributing & Conventions

- **커밋 메시지**: `feat:`, `fix:` 등 프리픽스 + **한국어** 설명(저장소 관례). 예) `feat: 날짜 선택 모달 UX 개선`.
- **사용자 대상 문자열**은 한국어가 기본.
- **React**: 함수형 컴포넌트 + 훅, 컴포넌트 PascalCase, 함수/변수 camelCase.
- **검증**: 백엔드 스키마는 Zod(Chanfana).
- **개발 브랜치에서 작업**하고, 변경 후 `npm run dev`로 동작을 직접 확인하세요(자동 테스트 없음).

---

## 라이선스 / License

저장소에 라이선스 파일이 아직 없습니다. 공개/협업 전 라이선스를 추가하는 것을 권장합니다.
*No license file is present yet — add one before public/collaborative use.*
