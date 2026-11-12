// /api/* 는 홈 화면이 불러 쓰는 자료(JSON·RSS)라 검색 색인 대상이 아니다. 서치콘솔 «크롤링됨 - 색인 안 됨» 대응 (2026-11-12)
export async function onRequest(ctx) {
  const r = await ctx.next();
  const ct = r.headers.get('Content-Type') || '';
  if (!/json|xml|text\/plain/i.test(ct)) return r;
  const out = new Response(r.body, r);
  out.headers.set('X-Robots-Tag', 'noindex');
  return out;
}