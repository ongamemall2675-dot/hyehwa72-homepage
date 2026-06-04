export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const blogId = searchParams.get('blogId') || 'ongamemall';
  const url = `https://rss.blog.naver.com/${blogId}.xml`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return new Response(`Failed to fetch Naver RSS: ${response.statusText}`, {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }
    
    const xml = await response.text();
    
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600' // 10 minutes cache
      }
    });
  } catch (error) {
    return new Response(`Error: ${error.message}`, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain; charset=utf-8'
      }
    });
  }
}
