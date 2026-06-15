export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const channelId = searchParams.get('channelId') || 'UC4LUKIDmLbd3bMAjjGJ18DQ';
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch YouTube feed: ${response.statusText}` }), {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
    }
    
    const xml = await response.text();
    
    // Parse <entry> elements using regex
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const entries = [];
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      entries.push(match[1]);
    }
    
    const videos = [];
    for (const entry of entries) {
      const videoIdMatch = entry.match(/<(?:yt:)?videoId>([^<]+)<\/(?:yt:)?videoId>/);
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
      const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);
      const thumbMatch = entry.match(/<media:thumbnail[^>]+url="([^"]+)"/);
      // Extract view count from media:statistics views attribute
      const viewCountMatch = entry.match(/<media:statistics\s+views="([^"]+)"/);
      // Extract star rating count (likes)
      const starRatingMatch = entry.match(/<media:starRating[^>]+count="([^"]+)"/);
      
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        let title = titleMatch ? titleMatch[1] : '';
        // Unescape standard XML entities
        title = title
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'");
          
        const published = publishedMatch ? publishedMatch[1] : '';
        const description = descMatch ? descMatch[1] : '';
        const thumbnail = thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        const viewCount = viewCountMatch ? parseInt(viewCountMatch[1], 10) : 0;
        const likeCount = starRatingMatch ? parseInt(starRatingMatch[1], 10) : 0;
        
        videos.push({
          videoId,
          title,
          published,
          description,
          thumbnail,
          viewCount,
          likeCount
        });
      }
    }
    
    // Determine which videos are shorts in parallel
    const checkShorts = videos.map(async (video) => {
      try {
        const res = await fetch(`https://www.youtube.com/shorts/${video.videoId}`, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          redirect: 'manual'
        });
        // In standard fetch with redirect: 'manual', a redirect returns status 0 (opaque) or 3xx.
        // A short loads without redirection, returning 200.
        video.isShort = (res.status === 200 || res.status === 204);
      } catch (err) {
        video.isShort = false;
      }
      return video;
    });
    
    const result = await Promise.all(checkShorts);
    
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600' // 10 minutes cache
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }
}
