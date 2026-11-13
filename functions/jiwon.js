// /jiwon — 정적 jiwon.html 에 «매일 자동 갱신 혜택 목록»을 서버에서 끼워 넣는다 (검색엔진·AI가 읽게, AEO)
// 데이터: 노트북 n8n이 매일 08:10 복지로·보조금24·기업마당 공식 API 원문을 admin.hyehwa72.org/sync/jiwon 에 넣음
const API = 'https://admin.hyehwa72.org/sync/pub/jiwon';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

function li(i) {
  const meta = [i.how && '신청: ' + cut(i.how, 40), i.period && '기간: ' + cut(i.period, 40)].filter(Boolean).join(' · ');
  const name = i.link ? `<a href="${esc(i.link)}" target="_blank" rel="noopener nofollow">${esc(i.name)}</a>` : esc(i.name);
  return `<li><strong>${name}</strong>${i.summary ? ' — ' + esc(cut(i.summary, 130)) : ''}${meta ? `<br><small>${esc(meta)}</small>` : ''}</li>`;
}

function render(d) {
  const items = d.items || [];
  if (!items.length) return '';
  const day = String(d.at || '').slice(0, 10);
  const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const fresh = items.filter(i => i.first && i.first >= since);
  const g = (f) => items.filter(f);
  const groups = [
    ['종로구 주민 혜택 (복지로·보조금24)', g(i => /종로구/.test(i.src) && !/기업마당/.test(i.src)), true],
    ['사장님·소상공인 지원 공고 (기업마당, 서울·종로)', g(i => /기업마당/.test(i.src)), true],
    ['서울시 전체 복지 혜택 (종로구민도 해당)', g(i => /서울시/.test(i.src)), false],
  ];
  let h = `<h2 id="auto">종로·혜화에서 받을 수 있는 혜택 전체 목록 (매일 자동 갱신)</h2>
<p>기준일 <strong>${esc(day)}</strong>. 복지로(한국사회보장정보원)·보조금24(행정안전부)·기업마당(중소벤처기업부) 공식 자료를 매일 아침 받아 종로구와 서울시 것만 모았습니다. 총 ${items.length}건. 금액·대상·기간은 각 이름을 눌러 원문에서 꼭 확인하세요.</p>`;
  if (fresh.length) h += `<h3>최근 30일 안에 새로 올라온 혜택 (${fresh.length}건)</h3><ul>${fresh.slice(0, 30).map(li).join('')}</ul>`;
  for (const [t, arr, open] of groups) if (arr.length) h += `<details${open ? ' open' : ''}><summary><strong>${esc(t)} — ${arr.length}건</strong></summary><ul>${arr.map(li).join('')}</ul></details>`;
  h += `<p><small>자료: 공공데이터포털 «한국사회보장정보원_지자체복지서비스», «행정안전부_대한민국 공공서비스(혜택) 정보», 기업마당 지원사업정보 API. 혜화72는 신청을 대행하지 않습니다. 혜화·대학로 집·가게 상담은 02-766-0720.</small></p>\n`;
  return h;
}

export async function onRequest(context) {
  const res = await context.next();
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;
  let html = await res.text();
  try {
    const r = await fetch(API, { cf: { cacheTtl: 600 } });
    if (r.ok) {
      const sec = render(await r.json());
      if (sec) {
        const mark = '<h2>혜화·대학로에서 가게를 열 계획이라면</h2>';
        html = html.includes(mark) ? html.replace(mark, sec + mark) : html.replace('</main>', sec + '</main>');
      }
    }
  } catch (e) { /* 목록을 못 받아도 원래 페이지는 그대로 */ }
  const h = new Headers(res.headers); h.delete('content-length'); h.set('cache-control', 'public, max-age=600');
  return new Response(html, { status: res.status, headers: h });
}
