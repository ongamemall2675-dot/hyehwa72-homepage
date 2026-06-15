import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update nav links
old_nav = '''    <div class="nav-links">
      <a href="#about">소개</a>
      <a href="#youtube">최신영상</a>
      <a href="#properties">추천매물</a>
      <a href="#feeds">소셜콘텐츠</a>
      <a href="#gallery">갤러리</a>
      <a href="#contact">간편문의</a>
    </div>'''
new_nav = '''    <div class="nav-links">
      <a href="#about">소개</a>
      <a href="#properties">추천매물</a>
      <a href="#feeds">소셜콘텐츠</a>
      <a href="#youtube">최신영상</a>
      <a href="#gallery">갤러리</a>
      <a href="#contact">간편문의</a>
    </div>'''
html = html.replace(old_nav, new_nav)

# 2. Update Properties title
old_header = '''      <div class="section-header">
        <span class="subtitle">FEATURED LISTINGS</span>
        <h2 class="title">혜화 실시간 추천 매물</h2>
      </div>'''
new_header = '''      <div class="section-header">
        <span class="subtitle">NAVER BLOG LISTINGS</span>
        <h2 class="title">네이버 블로그 추천 매물</h2>
      </div>'''
html = html.replace(old_header, new_header)

# 3. Clear properties grid
grid_pattern = re.compile(r'(<div class="properties-grid" id="properties-grid">).*?(      </div>\s*<!-- Outlinks -->)', re.DOTALL)
html = grid_pattern.sub(r'\1\n        <!-- 네이버 블로그 추천 매물 카테고리의 글이 이곳에 렌더링됩니다. -->\n\2', html)

# 4. Update tryLiveUpdate to call parseNaverRssAndRenderProperties
old_live1 = '''              if (parseNaverRssAndRenderBlog(xmlText)) {
                console.log("실시간 RSS(내부 프록시)로 업데이트 완료.");'''
new_live1 = '''              const blogOk = parseNaverRssAndRenderBlog(xmlText);
              parseNaverRssAndRenderProperties(xmlText);
              if (blogOk) {
                console.log("실시간 RSS(내부 프록시)로 업데이트 완료.");'''
html = html.replace(old_live1, new_live1)

old_live2 = '''                if (parseNaverRssAndRenderBlog(xmlText)) {
                  console.log(`실시간 RSS(${proxyUrl})로 업데이트 완료.`);'''
new_live2 = '''                const blogOk = parseNaverRssAndRenderBlog(xmlText);
                parseNaverRssAndRenderProperties(xmlText);
                if (blogOk) {
                  console.log(`실시간 RSS(${proxyUrl})로 업데이트 완료.`);'''
html = html.replace(old_live2, new_live2)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Done applying modifications.')
