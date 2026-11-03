// 티스토리 RSS 프록시 (2026-11-03): 홈페이지 «티스토리 최신 글» 줄용
export async function onRequest() {
  const r = await fetch('https://ongamemall.tistory.com/rss', { headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 1800 } });
  return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=1800' } });
}
