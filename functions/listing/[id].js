// 매물 개별 페이지 /listing/:id — 검색엔진·AI가 읽을 수 있게 서버에서 완성된 HTML로 (AEO)
// 데이터: admin.hyehwa72.org/sync/pub/listing/:id (홈페이지 공개 매물만, 번지·호·소유자·내부메모 제외)
const API = 'https://admin.hyehwa72.org/sync/pub';
const SITE = 'https://hyehwa72.org';
const OFFICE = {
  name: '대학로 혜화72 공인중개사사무소', tel: '02-766-0720', addr: '서울특별시 종로구 창경궁로 266, 1층',
  near: '혜화역 4번 출구 도보 2~3분, 우리은행 옆', reg: '11110-2021-00036', ceo: '김훈',
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// 10-20: 금액 칸에 '230만원(부.미포)'·'160(부별)'처럼 글자가 섞여도 앞 숫자로 표시하고 나머지는 괄호 메모로
const numOf = v => { if (typeof v === 'number') return v; const m = String(v ?? '').match(/^\s*([\d,]+(?:\.\d+)?)/); return m ? Number(m[1].replace(/,/g, '')) : 0; };
const noteOf = v => typeof v === 'number' ? '' : String(v ?? '').replace(/^\s*[\d,]+(?:\.\d+)?\s*(만원|만)?/, '').replace(/\(?\s*(부\.?\s*미포|부별|부가세\s*별도)\s*\)?/, '(부가세 별도)').trim();
const sampleKey = p => { const t = [p.bldg_type, p.cat, p.sub_kind].join(' '), f = String(p.floor || '') + ' ' + (p.sub_kind || ''); if (/상가/.test(t)) return /지하|B\d/i.test(f) ? 'shop_basement' : /(^|\D)1\s*[층,.~]|1층/.test(f) && !/2층 이상/.test(f) ? 'shop_1f' : 'shop_upper'; if (/사무실|지식산업/.test(t)) return 'office'; if (/원룸|오피스텔/.test(t)) return 'oneroom'; if (/건물/.test(t)) return 'building'; if (/빌라|아파트|주택|다가구|단독|투룸|3룸/.test(t)) return 'house'; return 'shop_1f'; };
const won = v => { const n = numOf(v); if (!n) return ''; const s = n >= 10000 ? `${Math.floor(n / 10000)}억${n % 10000 ? ' ' + (n % 10000).toLocaleString() + '만' : ''}원` : `${n.toLocaleString()}만원`; const nt = noteOf(v); return nt ? `${s} ${nt}` : s; };
const HY = [37.58218, 127.00196];
// 10-22: 가까운 지하철역 기준 (업무관리 near_st = 카카오맵). 없으면 혜화역 1.5km 안일 때만 혜화역
function walk(p) {
  const v = parseInt(String(p.walk_min || '').replace(/\D/g, ''), 10);
  let st = null; try { st = (typeof p.near_st === 'string' ? JSON.parse(p.near_st) : p.near_st)?.st?.[0] || null; } catch {}
  if (st) { const name = st.name + (st.lines?.length ? `(${st.lines.join('·')})` : ''); return v > 0 ? { st: st.name, name, min: v, how: '카카오맵 도보 길찾기 기준' } : { st: st.name, name, min: st.min || Math.max(1, Math.round(st.m * 1.3 / 70)), how: `직선 약 ${st.m}m 기준 추정` }; }
  if (v > 0) return { st: '혜화역', name: '혜화역(4호선)', min: v, how: '카카오맵 도보 길찾기 기준' };
  if (!p.lat || !p.lng) return null;
  const R = 6371000, r = x => x * Math.PI / 180, a = r(p.lat - HY[0]), b = r(p.lng - HY[1]);
  const m = 2 * R * Math.asin(Math.sqrt(Math.sin(a / 2) ** 2 + Math.cos(r(HY[0])) * Math.cos(r(p.lat)) * Math.sin(b / 2) ** 2));
  if (m > 1500) return null;
  return { st: '혜화역', name: '혜화역(4호선)', min: Math.max(1, Math.round(m * 1.3 / 70)), how: '직선거리 기준 추정' };
}
function info(p) {
  const deal = (p.deal !== '매매' && numOf(p.rent) > 0) ? '월세' : (p.deal || (/매매/.test(p.cat || '') ? '매매' : '월세')); // 월세가 있으면 월세로
  const kind = p.sub_kind || p.bldg_type || p.cat || '매물';
  const price = deal === '매매' ? `매매가 ${won(p.price)}` : deal === '전세' ? `전세 ${won(p.deposit)}` : `보증금 ${won(p.deposit)} / 월세 ${won(p.rent)}`;
  const mg = p.mgmt == null || p.mgmt === '' ? '' : Number(p.mgmt) === 0 ? '관리비 없음' : `관리비 ${typeof p.mgmt === 'number' ? p.mgmt + '만원' : p.mgmt}`;
  const area = [p.excl_m2 && `전용 ${p.excl_m2}㎡ (약 ${Math.round(p.excl_m2 * 0.3025 * 10) / 10}평)`, !p.excl_m2 && p.area_py].filter(Boolean).join('');
  const w = walk(p), where = [p.gu || '종로구', p.dong].filter(Boolean).join(' ');
  return { deal, kind, price, mg, area, w, where };
}

export async function onRequest({ params }) {
  const id = Number(params.id);
  const res = await fetch(`${API}/listing/${id}`, { cf: { cacheTtl: 300 } });
  if (!res.ok) return new Response(notFound(), { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
  const p = await res.json();
  const I = info(p), url = `${SITE}/listing/${id}`;
  const rel = await related(p);
  const title = `${I.where} ${I.kind} ${I.deal}${I.w ? ` · ${I.w.st} 도보 ${I.w.min}분` : ''} | 대학로 혜화72`;
  const summary = `${I.where}에 있는 ${I.kind} ${I.deal} 매물입니다. ${[I.area, I.price, I.mg].filter(Boolean).join(', ')}${I.w ? `이며 ${I.w.name}까지 도보 약 ${I.w.min}분(${I.w.how})` : ''}입니다.`;
  const checked = String(p.updated_at || '').slice(0, 10);
  const rows = [
    ['소재지', `${I.where} (상세 위치는 상담 시 안내)`], ['종류', [p.bldg_type, p.sub_kind].filter(Boolean).join(' · ') || p.cat], ['거래', I.deal],
    ['가격', I.price], ['관리비', I.mg.replace(/^관리비\s*/, '')], ['권리금', p.premium ? (/없|무/.test(String(p.premium)) || p.premium === 0 ? '없음' : won(p.premium) || p.premium) : ''],
    ['면적', I.area], ['층', [p.floor, p.total_floors && `총 ${p.total_floors}`].filter(Boolean).join(' / ')], ['방·욕실', [p.rooms, p.baths].filter(Boolean).join(' / ')],
    ['방향', p.direction], ['주차', p.parking], ['엘리베이터', p.elevator], ['건축물 용도', p.usage], ['사용승인일', p.approval_date], ['입주가능일', p.move_in],
    [I.w ? I.w.name : '가까운 역', I.w ? `도보 약 ${I.w.min}분 (${I.w.how})` : ''], ['정보 확인일', checked],
  ].filter(([, v]) => v);
  const faq = [
    [`이 ${I.kind}의 가격은 얼마인가요?`, `${I.price}${I.mg ? `, ${I.mg}` : ''}입니다. (${checked} 기준, 계약 전 변동 여부를 확인해 주세요)`],
    I.w && [`${I.w.st}에서 얼마나 걸리나요?`, `${I.w.name}에서 도보 약 ${I.w.min}분입니다 (${I.w.how}).`],
    p.parking && [`주차가 되나요?`, `주차: ${p.parking}.`],
    p.move_in && [`언제 입주할 수 있나요?`, `입주가능일: ${p.move_in}.`],
    [`이 매물은 어디에 문의하나요?`, `${OFFICE.name}(${OFFICE.tel})로 문의하시면 현장 안내와 상담을 도와드립니다. 사무소는 ${OFFICE.near}에 있습니다.`],
  ].filter(Boolean);
  const photos = (p.photos || []).slice(0, 12).map(x => `${API}/photo/${x}`);
  const priceNum = numOf(I.deal === '매매' ? p.price : I.deal === '전세' ? p.deposit : p.rent) || null;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'RealEstateListing', name: title, url, description: summary, datePosted: checked || undefined, image: photos.slice(0, 5),
      offers: priceNum ? { '@type': 'Offer', price: Number(priceNum) * 10000, priceCurrency: 'KRW', businessFunction: I.deal === '매매' ? 'http://purl.org/goodrelations/v1#Sell' : 'http://purl.org/goodrelations/v1#LeaseOut', availability: 'https://schema.org/InStock' } : undefined,
      contentLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: 'KR', addressRegion: '서울특별시', addressLocality: p.gu || '종로구', streetAddress: p.dong || '' }, ...(p.lat ? { geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng } } : {}) },
      provider: { '@id': SITE + '/#agent' } },
    { '@context': 'https://schema.org', '@type': 'RealEstateAgent', '@id': SITE + '/#agent', name: OFFICE.name, telephone: OFFICE.tel, url: SITE,
      address: { '@type': 'PostalAddress', streetAddress: '창경궁로 266, 1층', addressLocality: '종로구', addressRegion: '서울특별시', addressCountry: 'KR' },
      founder: { '@type': 'Person', name: OFFICE.ceo, jobTitle: '대표 공인중개사' }, areaServed: ['혜화동', '명륜동', '동숭동', '이화동', '연건동', '대학로'] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: '추천 매물', item: SITE + '/#listings' }, { '@type': 'ListItem', position: 3, name: title, item: url }] },
  ];
  const desc = esc(p.ad_desc || '').replace(/\n/g, '<br>');
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(summary)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(summary)}"><meta property="og:url" content="${url}">${photos[0] ? `<meta property="og:image" content="${photos[0]}">` : ''}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>body{margin:0;background:#F6F0E6;color:#2A2320;font-family:Pretendard,sans-serif;line-height:1.75}a{color:#9E3D2A}.w{max-width:860px;margin:0 auto;padding:24px 18px}
header{background:#FFFBF4;border-bottom:1px solid #E4D8C6}header .w{display:flex;justify-content:space-between;align-items:center;padding:14px 18px}header b{font-size:18px}
.call{background:#9E3D2A;color:#fff;padding:8px 14px;border-radius:999px;text-decoration:none;font-weight:600}h1{font-size:28px;line-height:1.4;margin:18px 0 10px}
.sum{background:#FFFBF4;border:1px solid #E4D8C6;border-left:5px solid #9E3D2A;border-radius:12px;padding:16px 18px;font-size:17px}
h2{font-size:21px;margin:30px 0 10px;border-left:4px solid #9E3D2A;padding-left:10px}table{width:100%;border-collapse:collapse;background:#FFFBF4}th,td{border:1px solid #E4D8C6;padding:9px 12px;text-align:left;vertical-align:top}th{width:28%;background:#F3E9DC;font-weight:600}
.ph{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}.ph img{width:100%;border-radius:10px;aspect-ratio:4/3;object-fit:cover}
.rel{padding-left:20px}.rel li{margin:6px 0}.faq dt{font-weight:700;margin-top:14px}.faq dd{margin:4px 0 0}.by{font-size:14px;color:#7A6A5E;margin-top:26px}.box{background:#2A2320;color:#EADBC9;border-radius:14px;padding:20px 22px;margin:30px 0}.box b{color:#fff;font-size:18px}
footer{font-size:13px;color:#7A6A5E;border-top:1px solid #E4D8C6;padding:18px 0 40px}</style></head><body>
<header><div class="w"><a href="/" style="text-decoration:none;color:inherit"><b>대학로 혜화72</b></a><a class="call" href="tel:027660720">☎ ${OFFICE.tel}</a></div></header>
<main class="w">
<nav style="font-size:13px"><a href="/">홈</a> › <a href="/#listings">추천 매물</a> › ${esc(I.where)}</nav>
<h1>${esc(title.replace(' | 대학로 혜화72', ''))}</h1>
<p class="sum">${esc(summary)}</p>
<h2>매물 한눈에 보기</h2><table>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
${desc ? `<h2>매물 설명</h2><p>${desc}</p>` : ''}
${photos.length ? `<h2>사진</h2><div class="ph">${photos.map((s, i) => `<img src="${s}" alt="${esc(I.where + ' ' + I.kind + ' 사진 ' + (i + 1))}" loading="lazy">`).join('')}</div>` : `<h2>사진</h2><figure style="margin:0"><img src="/img/sample/${sampleKey(p)}.jpg" alt="견본 이미지" loading="lazy" onerror="this.closest('figure').remove()" style="width:100%;max-width:640px;border-radius:10px"><figcaption style="color:#c0392b;font-weight:700;font-size:.9rem;margin-top:6px">견본 이미지</figcaption></figure>`}
${p.youtube_url || p.shorts_url ? `<h2>영상</h2><p><a href="${esc(p.youtube_url || p.shorts_url)}" rel="noopener" target="_blank">매물 영상 보기</a></p>` : ''}
${rel.length ? `<h2>이 매물과 비슷한 매물</h2><ul class="rel">${rel.map(x => { const J = info(x); return `<li><a href="/listing/${x.id}">${esc(J.where)} ${esc(J.kind)} ${esc(J.deal)}</a> · ${esc(J.price)}${x.floor ? ' · ' + esc(x.floor) : ''}${x.area_py ? ' · ' + esc(x.area_py) : ''}</li>`; }).join('')}</ul>` : ''}
<h2>자주 묻는 질문</h2><dl class="faq">${faq.map(([q, a]) => `<dt>Q. ${esc(q)}</dt><dd>A. ${esc(a)}</dd>`).join('')}</dl>
<div class="box"><b>이 매물, 직접 보고 싶으신가요?</b><br>혜화동 토박이 15년, ${OFFICE.name}가 현장 안내와 상담을 도와드립니다.<br><a class="call" href="tel:027660720" style="display:inline-block;margin-top:10px">☎ ${OFFICE.tel}</a> <a href="/#listings" style="color:#F6EADB;margin-left:10px">다른 매물 보기</a></div>
<p class="by">✍ 작성·확인: ${OFFICE.name} 대표 공인중개사 ${OFFICE.ceo} (혜화동 토박이, 혜화역 일대 15년 중개) · 정보 확인일 ${esc(checked)} · 계약 전 현재 거래 가능 여부를 꼭 확인하세요.</p>
</main>
<footer><div class="w">${OFFICE.name} · 대표 ${OFFICE.ceo} · 등록번호 ${OFFICE.reg} · ${OFFICE.addr} (${OFFICE.near}) · ☎ ${OFFICE.tel}</div></footer>
</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}
// 10-26 대표: 비슷한 매물 6개 (같은 분류 먼저 → 같은 동 → 가까운 거리 → 비슷한 가격). 검색엔진이 다른 매물 페이지도 따라가게 내부 링크
async function related(p) {
  try {
    const r = await fetch(`${API}/listings`, { cf: { cacheTtl: 300 } }); if (!r.ok) return [];
    const L = (await r.json()).filter(x => x.cat !== '원룸임대' && x.id !== p.id);
    const sale = x => numOf(x.price) > 0 || /매매/.test(x.cat || ''), amt = x => sale(x) ? numOf(x.price) : numOf(x.rent) * 100 + numOf(x.deposit);
    const km = x => p.lat && x.lat ? Math.hypot(p.lat - x.lat, (p.lng - x.lng) * 0.79) * 111 : 3, pa = amt(p) || 1;
    const score = x => (x.cat === p.cat ? 0 : 5) + (x.dong === p.dong ? 0 : 1) + Math.min(km(x), 3) + Math.min(Math.abs(Math.log((amt(x) || 1) / pa)), 3) * 0.8;
    return L.filter(x => sale(x) === sale(p)).sort((a, b) => score(a) - score(b)).slice(0, 6);
  } catch { return []; }
}
function notFound() {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>거래가 끝났거나 비공개된 매물 | 대학로 혜화72</title></head><body style="font-family:sans-serif;padding:40px"><h1>거래가 끝났거나 비공개된 매물입니다</h1><p>비슷한 매물은 <a href="/#listings">추천 매물</a>에서 보시거나 02-766-0720으로 문의해 주세요.</p></body></html>`;
}
