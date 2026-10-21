// 공개 매물 개별 페이지 사이트맵 (검색엔진·AI 크롤러용)
export async function onRequest() {
  const L = await fetch('https://admin.hyehwa72.org/sync/pub/listings', { cf: { cacheTtl: 300 } }).then(r => r.json()).catch(() => []);
  // 원룸은 홈페이지 목록에서 빼므로 사이트맵에서도 뺀다 (2026-10-21)
  const urls = L.filter(p => p.cat !== '원룸임대').map(p => `<url><loc>https://hyehwa72.org/listing/${p.id}</loc>${p.updated_at ? `<lastmod>${String(p.updated_at).slice(0, 10)}</lastmod>` : ''}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
}
