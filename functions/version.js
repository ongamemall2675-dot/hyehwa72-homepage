// 11-23 버전 확인: 지금 홈페이지(hyehwa72.org)에 올라가 있는 커밋 — 업무관리 [🔖 버전]이 GitHub 최신과 비교
export async function onRequest({ env }) {
  const keys = Object.keys(env || {}).filter(k => /^CF_PAGES/.test(k));
  return new Response(JSON.stringify({ sha: env.CF_PAGES_COMMIT_SHA || null, branch: env.CF_PAGES_BRANCH || null, keys, now: new Date().toISOString() }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
}