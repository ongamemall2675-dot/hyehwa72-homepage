// 혜화72 홈페이지 유튜브 목록 API
// 1순위: 유튜브 RSS → 2순위: 채널 페이지(동영상·Shorts 탭) 직접 읽기 → 3순위: /youtube_videos.json (저장본)
// 2026-10-26: 이 채널의 RSS가 404를 내서 홈페이지가 6월 영상 5개 + "준비 중" 가짜 카드만 보이던 문제 수정.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9', 'Cookie': 'CONSENT=YES+1; SOCS=CAI' };

function json(body, status = 200, maxAge = 1800) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': `public, max-age=${maxAge}`
    }
  });
}

function unescapeXml(s) {
  return (s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
}

// "조회수 1.5천회", "2천", "123" → 숫자
function parseViews(t) {
  if (!t) return 0;
  const m = String(t).replace(/,/g, '').match(/([\d.]+)\s*(천|만|억)?/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const mul = { '천': 1e3, '만': 1e4, '억': 1e8 }[m[2]] || 1;
  return Math.round(n * mul);
}

// "3개월 전", "2주 전", "5일 전" → 대략의 날짜
function parseRelative(t, now) {
  const m = String(t || '').match(/(\d+)\s*(초|분|시간|일|주|개월|년)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const ms = { '초': 1e3, '분': 6e4, '시간': 36e5, '일': 864e5, '주': 6048e5, '개월': 2592e6, '년': 31536e6 }[m[2]];
  return new Date(now - n * ms).toISOString();
}

async function fromRss(channelId) {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { headers: HEADERS });
  if (!res.ok) return [];
  const xml = await res.text();
  const out = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    if (!id) continue;
    out.push({
      videoId: id,
      title: unescapeXml((e.match(/<title>([^<]+)<\/title>/) || [])[1]),
      published: (e.match(/<published>([^<]+)<\/published>/) || [])[1] || '',
      description: unescapeXml((e.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1]),
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      viewCount: parseInt((e.match(/<media:statistics\s+views="([^"]+)"/) || [])[1] || '0', 10),
      likeCount: 0,
      isShort: false
    });
  }
  return out;
}

function parseChannelPage(html, isShortTab) {
  const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
  if (!m) return [];
  let data;
  try { data = JSON.parse(m[1]); } catch (e) { return []; }
  const out = [];
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (o.lockupViewModel && o.lockupViewModel.contentId) {
      const l = o.lockupViewModel;
      const md = l.metadata && l.metadata.lockupMetadataViewModel;
      const parts = [];
      ((md && md.metadata && md.metadata.contentMetadataViewModel && md.metadata.contentMetadataViewModel.metadataRows) || [])
        .forEach(r => (r.metadataParts || []).forEach(p => parts.push((p.text && p.text.content) || '')));
      out.push({ videoId: l.contentId, title: (md && md.title && md.title.content) || '', views: parts[0] || '', rel: parts[1] || '', isShort: isShortTab });
      return;
    }
    if (o.shortsLockupViewModel) {
      const s = o.shortsLockupViewModel;
      const id = (s.onTap && s.onTap.innertubeCommand && s.onTap.innertubeCommand.reelWatchEndpoint && s.onTap.innertubeCommand.reelWatchEndpoint.videoId)
        || String(s.entityId || '').replace('shorts-shelf-item-', '');
      const ov = s.overlayMetadata || {};
      out.push({ videoId: id, title: (ov.primaryText && ov.primaryText.content) || '', views: (ov.secondaryText && ov.secondaryText.content) || '', rel: '', isShort: true });
      return;
    }
    if (o.videoRenderer) {
      const v = o.videoRenderer;
      out.push({ videoId: v.videoId, title: ((v.title && v.title.runs) || []).map(r => r.text).join(''), views: (v.viewCountText && v.viewCountText.simpleText) || '', rel: (v.publishedTimeText && v.publishedTimeText.simpleText) || '', isShort: isShortTab });
      return;
    }
    for (const k in o) walk(o[k]);
  };
  walk(data);
  return out.filter(v => v.videoId && /^[\w-]{11}$/.test(v.videoId));
}

async function fromChannelPages(channelId, known) {
  const now = Date.now();
  const [vRes, sRes] = await Promise.all(['videos', 'shorts'].map(tab =>
    fetch(`https://www.youtube.com/channel/${channelId}/${tab}`, { headers: HEADERS }).then(r => r.ok ? r.text() : '').catch(() => '')
  ));
  const longs = parseChannelPage(vRes, false);
  const shorts = parseChannelPage(sRes, true);
  const all = [...longs, ...shorts];
  // 날짜: 저장본에 있으면 정확한 날짜, 없으면 '몇 개월 전' 추정, Shorts는 목록 순서(최신순)로 추정
  return all.map((v, i) => {
    const k = known.get(v.videoId);
    let published = k && k.published;
    if (!published) published = parseRelative(v.rel, now) || new Date(now - i * 60000).toISOString();
    return {
      videoId: v.videoId,
      title: v.title || (k && k.title) || '',
      published,
      description: (k && k.description) || '',
      thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      viewCount: parseViews(v.views) || (k && k.viewCount) || 0,
      likeCount: 0,
      isShort: v.isShort
    };
  });
}

async function loadSaved(context) {
  try {
    const url = new URL('/youtube_videos.json', context.request.url);
    const res = context.env && context.env.ASSETS ? await context.env.ASSETS.fetch(url) : await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) {}
  return [];
}

export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const channelId = searchParams.get('channelId') || 'UC4LUKIDmLbd3bMAjjGJ18DQ';
  const saved = await loadSaved(context);
  const known = new Map(saved.map(v => [v.videoId, v]));

  let videos = [];
  let source = 'rss';
  try { videos = await fromRss(channelId); } catch (e) { videos = []; }
  if (!videos.length) {
    source = 'channel-page';
    try { videos = await fromChannelPages(channelId, known); } catch (e) { videos = []; }
  }
  if (!videos.length) {
    source = 'saved';
    videos = saved;
  }
  // RSS에는 Shorts 구분이 없다 → 저장본·채널 페이지 정보로 보완
  if (source === 'rss') videos.forEach(v => { const k = known.get(v.videoId); if (k) v.isShort = !!k.isShort; });

  videos.sort((a, b) => String(b.published).localeCompare(String(a.published)));
  return new Response(JSON.stringify(videos), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=1800',
      'X-Youtube-Source': source
    }
  });
}
