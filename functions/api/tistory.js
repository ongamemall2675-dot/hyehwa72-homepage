// 티스토리 최신 글 (2026-11-03): RSS에는 사진이 없어서 글 페이지의 og:image 를 함께 읽어 JSON 으로 준다
// 2026-11-08: 본문이 빈 글은 건너뛰고, og:image 가 티스토리 기본 그림이면 본문 첫 사진을 쓴다. 캐시 10분.
const dec = s => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&mdash;/g, '—').replace(/&middot;/g, '·').replace(/&frac12;/g, '½').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const UA = { headers: { 'User-Agent': 'Mozilla/5.0' } };
const isDefault = u => !u || /openGraph%2Fopengraph\.png|openGraph\/opengraph\.png|no-image/i.test(u);
export async function onRequest() {
  const xml = await (await fetch('https://ongamemall.tistory.com/rss', UA)).text();
  const items = xml.split('<item>').slice(1, 11).map(s => {
    const g = t => dec((s.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)) || [])[1] || '').trim();
    return { title: g('title'), link: g('link'), category: g('category'), date: g('pubDate'), summary: dec(g('description').replace(/<[^>]+>/g, ' ')).replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 90) };
  });
  await Promise.all(items.map(async it => {
    try {
      const h = await (await fetch(it.link, UA)).text();
      const og = (h.match(/property="og:image"\s+content="([^"]+)"/) || [])[1] || '';
      const i0 = h.indexOf('contents_style');
      const body = i0 > 0 ? h.slice(i0, h.indexOf('<!-- System - START', i0) > 0 ? h.indexOf('<!-- System - START', i0) : i0 + 200000) : '';
      it.empty = body.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length < 30;
      const first = (body.match(/<img[^>]+src="(https:\/\/(?:blog\.kakaocdn\.net|t1\.daumcdn\.net|img1\.daumcdn\.net)[^"]+)"/) || [])[1] || '';
      it.image = isDefault(og) ? first : og;
      if (!it.summary) it.summary = dec((h.match(/property="og:description"\s+content="([^"]+)"/) || [])[1] || '').slice(0, 90);
    } catch { it.image = ''; it.empty = false; }
  }));
  const out = items.filter(it => !it.empty).slice(0, 4).map(({ empty, ...it }) => it);
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
}