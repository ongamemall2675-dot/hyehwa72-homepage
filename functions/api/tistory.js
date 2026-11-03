// 티스토리 최신 글 (2026-11-03): RSS에는 사진이 없어서 글 페이지의 og:image 를 함께 읽어 JSON 으로 준다
const dec = s => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&mdash;/g, '—').replace(/&middot;/g, '·').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
export async function onRequest() {
  const xml = await (await fetch('https://ongamemall.tistory.com/rss', { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
  const items = xml.split('<item>').slice(1, 5).map(s => {
    const g = t => dec((s.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)) || [])[1] || '').trim();
    return { title: g('title'), link: g('link'), category: g('category'), date: g('pubDate'), summary: dec(g('description').replace(/<[^>]+>/g, ' ')).replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 90) };
  });
  await Promise.all(items.map(async it => {
    try { const h = await (await fetch(it.link, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text(); it.image = (h.match(/property="og:image"\s+content="([^"]+)"/) || [])[1] || ''; } catch { it.image = ''; }
  }));
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=1800' } });
}
