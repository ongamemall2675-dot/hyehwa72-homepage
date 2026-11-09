// /market — 대학로(혜화동·명륜동·동숭동·이화동·연건동) 시세표
// 숫자는 업무관리 /sync/pub/market 에서 받아 표로만 그린다 (AI 생성 없음, 문장도 코드 틀 + 실제 숫자)
const SRC = 'https://admin.hyehwa72.org/sync/pub/market';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const man = v => { v = Math.round(Number(v) || 0); if (!v) return '-'; const e = Math.floor(v / 10000), m = v % 10000; return (e ? e + '억' : '') + (m ? (e ? ' ' : '') + m.toLocaleString() + '만' : '') + '원'; };
const ym = s => s ? `${s.slice(0, 4)}년 ${Number(s.slice(4))}월` : '';

export async function onRequestGet({ request }) {
  let d;
  try { const r = await fetch(SRC, { cf: { cacheTtl: 1800 } }); d = await r.json(); if (d.error) throw new Error(d.error); }
  catch (e) { return new Response('<!doctype html><meta charset="utf-8"><title>시세표 준비 중</title><p>시세표를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요. 문의 02-766-0720</p>', { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }); }
  const day = (d.at || '').slice(0, 10);
  const ours = d.ours || [], real = (d.real || []).filter(r => !r.error && r.n);
  const pick = (cat, deal) => ours.find(o => o.cat === cat && o.deal === deal);

  // 한 줄 답(AEO): 코드 틀 + 실제 숫자만
  const s1 = pick('상가임대 (1층)', '월세'), s2 = pick('상가임대 (2층 이상)', '월세'), one = pick('원룸임대', '월세'), villa = real.find(r => r.kind === 'RHTrade'), vr = real.find(r => r.kind === 'RHRent');
  const lines = [
    s1 && `대학로 일대 1층 상가 임대 매물(${s1.n}건)의 호가 중간값은 보증금 ${man(s1.dep)}, 월세 ${man(s1.rent)}${s1.ppy ? `, 전용 3.3㎡당 월세 약 ${man(s1.ppy)}` : ''}입니다.`,
    s2 && `2층 이상 상가 임대 매물(${s2.n}건)은 보증금 ${man(s2.dep)}, 월세 ${man(s2.rent)}이 중간값입니다.`,
    one && `원룸 월세 매물(${one.n}건)은 보증금 ${man(one.dep)}, 월세 ${man(one.rent)}이 중간값입니다.`,
    villa && `국토부 실거래 기준 최근 6개월(${ym(villa.from)}~${ym(villa.to)}) 연립·다세대 매매 ${villa.n}건의 중간값은 ${man(villa.price)}입니다.`,
    vr && `같은 기간 연립·다세대 전월세 신고 ${vr.n}건의 보증금 중간값은 ${man(vr.dep)}, 월세 중간값은 ${man(vr.rent)}입니다.`,
  ].filter(Boolean);

  const oursT = `<table><thead><tr><th>구분</th><th>매물 수</th><th>매매가 / 보증금</th><th>월세</th><th>전용 3.3㎡당</th></tr></thead><tbody>${ours.map(o => `<tr><td>${esc(o.cat)} · ${esc(o.deal)}</td><td>${o.n}</td><td>${man(o.deal === '매매' ? o.price : o.dep)}</td><td>${o.deal === '월세' ? man(o.rent) : '-'}</td><td>${o.ppy && (o.deal !== '매매' || /빌라|오피스텔|아파트/.test(o.cat)) ? man(o.ppy) + (o.deal === '월세' ? ' (월세)' : '') : '-'}</td></tr>`).join('')}</tbody></table>`;
  const realT = `<table><thead><tr><th>종류</th><th>신고 건수</th><th>거래가 / 보증금</th><th>월세</th><th>3.3㎡당</th></tr></thead><tbody>${real.map(r => `<tr><td>${esc(r.label)}</td><td>${r.n}</td><td>${man(r.isRent ? r.dep : r.price)}</td><td>${r.isRent ? man(r.rent) + (r.rentShare != null ? ` <small>(월세 낀 계약 ${r.rentShare}%)</small>` : '') : '-'}</td><td>${!r.isRent && r.ppy ? man(r.ppy) : '-'}</td></tr>`).join('')}</tbody></table>`;
  const dongs = d.area || [];
  const dongT = real.length ? `<table><thead><tr><th>종류</th>${dongs.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${real.map(r => `<tr><td>${esc(r.label)}</td>${dongs.map(x => { const v = r.dongs?.[x]; return `<td>${v ? `${man(r.isRent ? v.rent || v.dep : v.price)}<br><small>${v.n}건${r.isRent ? (v.rent ? ' · 월세' : ' · 보증금') : ''}</small>` : '-'}</td>`; }).join('')}</tr>`).join('')}</tbody></table>` : '';
  const from = real[0]?.from, to = real[0]?.to;

  const faq = [
    ['대학로·혜화동 1층 상가 월세는 얼마인가요?', lines[0] || ''],
    ['대학로·혜화동 원룸 월세 시세는?', lines[2] || ''],
    ['이 시세표는 어떤 자료로 만들었나요?', `혜화72부동산(대학로혜화72공인중개사사무소)이 접수한 계약 가능 매물의 호가 중간값과, 국토교통부 실거래가 신고 자료(해제 거래 제외)의 중간값입니다. 매일 아침 자동으로 다시 계산합니다. 기준 ${day}.`],
  ].filter(x => x[1]);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Dataset', name: '대학로(혜화동·명륜동·동숭동·이화동·연건동) 부동산 시세표', description: '서울 종로구 대학로 일대(혜화동·명륜동·동숭동·이화동·연건동)의 상가·사무실·주택 시세표입니다. 혜화72부동산이 접수한 계약 가능 매물의 호가 중간값과 국토교통부 실거래가 신고 자료(해제 거래 제외)의 중간값을 매일 아침 다시 계산합니다.', url: 'https://hyehwa72.org/market', dateModified: day, temporalCoverage: from && to ? `${from.slice(0, 4)}-${from.slice(4)}/${to.slice(0, 4)}-${to.slice(4)}` : undefined, spatialCoverage: { '@type': 'Place', name: '서울 종로구 혜화동·명륜동·동숭동·이화동·연건동' }, creator: { '@type': 'Organization', name: '대학로혜화72공인중개사사무소', alternateName: '혜화72부동산', url: 'https://hyehwa72.org/', telephone: '+82-2-766-0720' }, isBasedOn: 'https://rt.molit.go.kr/', license: 'https://hyehwa72.org/terms' },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>대학로·혜화동 상가·원룸·빌라 시세표 (${esc(day)} 기준) | 혜화72부동산</title>
<meta name="description" content="${esc((lines[0] || '대학로 일대 부동산 시세표') + ' 국토부 실거래 중간값과 함께 매일 갱신.')}">
<link rel="canonical" href="https://hyehwa72.org/market">
<meta property="og:title" content="대학로·혜화동 부동산 시세표 | 혜화72부동산"><meta property="og:url" content="https://hyehwa72.org/market">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>body{font-family:system-ui,-apple-system,'Malgun Gothic',sans-serif;max-width:980px;margin:0 auto;padding:18px;color:#222;line-height:1.6}h1{font-size:1.5rem;margin:.2em 0}h2{font-size:1.15rem;margin:1.6em 0 .4em;border-left:4px solid #c8102e;padding-left:8px}table{border-collapse:collapse;width:100%;font-size:.92rem;margin:.4em 0}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f5f5f5}small{color:#777}.ans{background:#fafafa;border:1px solid #eee;padding:10px 14px;border-radius:8px}.wrap{overflow-x:auto}a{color:#c8102e}b.n72{color:#c8102e}</style></head><body>
<p><a href="/">← 혜화<b class="n72">72</b>부동산 홈</a></p>
<h1>대학로·혜화동 부동산 시세표</h1>
<p><small>기준 ${esc(d.at || '')} · 혜화동·명륜동·동숭동·이화동·연건동 · 매일 아침 자동 갱신 · 작성 대학로혜화72공인중개사사무소 (대표 공인중개사 김훈, 등록번호 11110-2021-00036)</small></p>
<div class="ans">${lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>
<h2>① 혜화72부동산 접수 매물 기준 (호가 중간값)</h2>
<p><small>사무소에 접수된 계약 가능 매물이 부르는 값의 중간값입니다. 실제 계약가와 다를 수 있습니다. 매물 2건 이상인 구분만 표시. 단독·건물·상가 매매는 대지 면적 기준이 달라 3.3㎡당 값을 싣지 않습니다.</small></p>
<div class="wrap">${oursT}</div>
${real.length ? `<h2>② 국토교통부 실거래 기준 (${ym(from)}~${ym(to)} 신고분 중간값)</h2>
<p><small>국토교통부 실거래가 신고 자료에서 위 5개 동만 골라 계산했습니다. 해제된 거래는 뺐습니다. 신고 후 공개까지 보통 한 달쯤 걸려 최근 달은 건수가 적습니다. 상가 임대 실거래는 국토부가 공개하지 않습니다.</small></p>
<div class="wrap">${realT}</div><h2>③ 동별 실거래 중간값</h2><div class="wrap">${dongT}</div>` : ''}
<h2>자주 묻는 질문</h2>${faq.map(([q, a]) => `<h3 style="font-size:1rem;margin:.8em 0 .2em">${esc(q)}</h3><p>${esc(a)}</p>`).join('')}
<p>정확한 시세와 조건은 매물마다 다릅니다. 상담 <a href="tel:02-766-0720">02-766-0720</a> · 서울 종로구 창경궁로 266 1층 (혜화역 4번 출구 도보 2~3분)</p>
<p><small>출처: 국토교통부 실거래가 공개시스템(rt.molit.go.kr), 혜화72부동산 매물장부. 금액 단위 원.</small></p>
</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=1800' } });
}
