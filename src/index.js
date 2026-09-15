const PUBLISHED_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRcRMiOvoZBJsSxuEv-SJzW-AIne_JaS6xO2smUL8EWwUpOTJdpCiZEEc3Z5geX7dHtYM0U6DxJ4YBR/pub?gid=455762225&single=true&output=csv";

// /api/reference 캐시 신선도: 이 시간이 지나면 stale을 반환하면서 백그라운드로 갱신한다.
const REFERENCE_FRESH_TTL_MS = 3600 * 1000; // 1시간
// 엣지(caches.default) 보관 시간(초). caches.default는 저장본의 max-age만큼만 보관하므로,
// 길게 잡아 edge가 항목을 유지하게 한다. 실제 신선도는 X-Cached-At 기반 로직이 책임진다.
const REFERENCE_EDGE_MAX_AGE = 31536000; // 1년 (엣지 보관용)
// 클라이언트(브라우저)에게 주는 max-age(초). 짧게 두어 5분마다 따뜻한 엣지캐시로 재확인한다.
const REFERENCE_DOWNSTREAM_MAX_AGE = 300; // 5분

function parseCsvToList(csvText) {
  const rows = csvText.split(/\r?\n/).filter(r => r.trim() !== "");
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ''));
    if (cols.length < 2) continue;
    const dateRaw = cols[0].trim();
    const reference = cols[1];
    const m = dateRaw.match(/(\d{4})[.\-\s]+(\d{1,2})[.\-\s]+(\d{1,2})/);
    if (!m) continue;
    const [, y, mo, d] = m;
    const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    out.push({ date: iso, reference });
  }
  return out;
}

// Google Sheets CSV를 fetch→parse하여 캐시 가능한 JSON Response를 만든다.
// X-Cached-At: 저장 시각(ms) — 읽을 때 age 계산에 사용. 상류 실패 시 throw.
async function buildReferenceResponse() {
  const upstream = await fetch(PUBLISHED_CSV_URL, { cf: { cacheTtl: 0 } });
  if (!upstream.ok) {
    throw new Error(`sheet fetch failed: ${upstream.status}`);
  }
  const csvText = await upstream.text();
  const list = parseCsvToList(csvText);
  // 저장본은 긴 max-age로 만들어 caches.default가 항목을 오래 보관하게 한다(신선도는 X-Cached-At가 책임).
  return new Response(JSON.stringify(list), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": `public, max-age=${REFERENCE_EDGE_MAX_AGE}`,
      "X-Cached-At": String(Date.now()),
    },
  });
}

// 캐시 저장본/빌드본을 클라이언트용으로 다시 감싼다: 엣지 보관본은 긴 max-age를 유지하되,
// 브라우저에게는 짧은 max-age를 줘 5분마다 재확인하게 한다(본문은 그대로 스트리밍).
function toClientResponse(res) {
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", `public, max-age=${REFERENCE_DOWNSTREAM_MAX_AGE}`);
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API 엔드포인트: 큐티 본문 참조 리스트 (Google Sheets CSV → JSON, 수동 SWR 캐싱)
    if (url.pathname === '/api/reference') {
      const cache = caches.default;
      const cacheKey = new Request(new URL('/api/reference', url.origin).toString());
      const forceRefresh = url.searchParams.get('refresh') === '1';

      // 수동 강제 갱신: 캐시 무시하고 상류 fetch → 갱신 후 반환.
      if (forceRefresh) {
        try {
          const fresh = await buildReferenceResponse();
          ctx.waitUntil(cache.put(cacheKey, fresh.clone()));
          return toClientResponse(fresh);
        } catch (e) {
          const stale = await cache.match(cacheKey);
          if (stale) return toClientResponse(stale);
          return new Response(JSON.stringify({ error: "sheet fetch failed" }), {
            status: 502,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
      }

      const cached = await cache.match(cacheKey);
      if (cached) {
        const cachedAt = Number(cached.headers.get('X-Cached-At')) || 0;
        const age = Date.now() - cachedAt;
        if (age >= REFERENCE_FRESH_TTL_MS) {
          // Stale: 즉시 반환하면서 백그라운드에서 갱신(사용자 대기 없음).
          ctx.waitUntil(
            buildReferenceResponse()
              .then((fresh) => cache.put(cacheKey, fresh))
              .catch((e) => console.error('reference background refresh failed:', e))
          );
        }
        // 신선/stale 모두 캐시에서 즉시 반환(클라이언트엔 짧은 max-age).
        return toClientResponse(cached);
      }

      // 캐시 없음: 동기 fetch 후 저장.
      try {
        const fresh = await buildReferenceResponse();
        ctx.waitUntil(cache.put(cacheKey, fresh.clone()));
        return toClientResponse(fresh);
      } catch (e) {
        return new Response(JSON.stringify({ error: "sheet fetch failed" }), {
          status: 502,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // API 엔드포인트: 쿼리에 book 파라미터가 있으면 DB 쿼리 (기존 호환)
    if (url.searchParams.has('book') || url.pathname === '/api/bible') {
      const book = Number(url.searchParams.get('book')) || 40;
      const ch = Number(url.searchParams.get('ch')) || 8;
      const start = Number(url.searchParams.get('start')) || 14;
      const end = Number(url.searchParams.get('end')) || 15;
      // 끝 장(생략 시 시작 장과 동일). 교차 장 참조(예: 막 8:34~9:1) 지원용.
      const endCh = Number(url.searchParams.get('endCh')) || ch;

      if (!env.DB) {
        return new Response("데이터베이스 연결 설정(Binding)이 누락되었습니다.", { status: 500 });
      }

      try {
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        const cached = await cache.match(cacheKey);
        if (cached) return cached;

        // (장*1000+절) 복합 키 범위로 같은 장/교차 장을 한 번에 조회한다.
        // 정경의 어느 장도 1000절 미만이므로 인접 장과 범위가 겹치지 않는다.
        const lo = ch * 1000 + start;
        const hi = endCh * 1000 + end;
        const { results } = await env.DB.prepare(
          "SELECT translation, chapter, verse, content FROM bible_verses WHERE book_id = ? AND (chapter * 1000 + verse) BETWEEN ? AND ? ORDER BY chapter, verse"
        ).bind(book, lo, hi).all();

        const response = new Response(JSON.stringify(results), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=31536000, immutable"
          }
        });
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // Static Assets 서빙
    if (env.ASSETS) {
      try {
        const response = await env.ASSETS.fetch(request);
        if (response.status !== 404) {
          return response;
        }
      } catch (e) {
        console.error('Assets fetch error:', e);
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
