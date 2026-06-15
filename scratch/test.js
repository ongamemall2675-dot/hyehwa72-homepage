
    // Utility function
    function escapeHtml(unsafe) {
      if (!unsafe) return '';
      return unsafe
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#039;");
    }

    // --- 1. CONFIGURATION ---
    // Cloudflare Worker 프록시 주소 (배포 후 주소 기입, 예: 'https://rss-proxy.hyehwa72.workers.dev')
    // 주소가 비어있으면(기본값) 소스코드 내의 고화질 템플릿(Mock) 데이터가 노출됩니다.
    const PROXY_URL = "/api"; 
    const NAVER_BLOG_ID = "ongamemall";
    const YOUTUBE_CHANNEL_ID = "UC4LUKIDmLbd3bMAjjGJ18DQ";
    const DAILY_YOUTUBE_CHANNEL_ID = "UCukzU8IRbbMBVV9ogNtUORg";
    
    // 네이버 블로그 추천 매물 카테고리 연동 설정
    // NAVER_BLOG_PROPERTY_CATEGORY_NO: 특정 카테고리 번호가 있다면 기입 (예: '12' 또는 12). 비어있으면 전체 글 중 필터링합니다.
    // PROPERTY_CATEGORY_NAME: 방안 A 한글 카테고리명 매칭 필터 (전체 피드에서 이 카테고리의 글만 추출)
    // RSS 실제 카테고리명 '추천 매물' (공백 있음) - 공백 제거 후 비교하므로 '추천매물' 또는 '추천 매물' 모두 가능
    const NAVER_BLOG_PROPERTY_CATEGORY_NO = ""; 
    const PROPERTY_CATEGORY_NAME = "추천 매물";

    // --- 2. STATE VARIABLES ---
    let currentTheme = localStorage.getItem("theme") || "dark";
    let activeGalleryItems = [];
    let lightboxIndex = 0;

    // --- 3. DOM ELEMENTS ---
    const htmlEl = document.documentElement;
    const themeToggleBtn = document.getElementById("theme-toggle");
    const navbar = document.getElementById("navbar");
    
    // Gallery
    const filterButtons = document.querySelectorAll(".filter-btn");
    let galleryItems = document.querySelectorAll(".gallery-item");
    
    // Lightbox
    const lightboxModal = document.getElementById("lightbox-modal");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxVideoContainer = document.getElementById("lightbox-video-container");
    const lightboxIframe = document.getElementById("lightbox-iframe");
    const lightboxCaption = document.getElementById("lightbox-caption");
    const lightboxCloseBtn = document.getElementById("lightbox-close");
    const lightboxPrevBtn = document.getElementById("lightbox-prev");
    const lightboxNextBtn = document.getElementById("lightbox-next");

    // --- 4. THEME TOGGLE LOGIC ---
    function setTheme(theme) {
      htmlEl.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
      currentTheme = theme;
    }

    setTheme(currentTheme);

    themeToggleBtn.addEventListener("click", () => {
      const targetTheme = currentTheme === "dark" ? "light" : "dark";
      setTheme(targetTheme);
    });

    // Navbar Scroll Background shadow
    window.addEventListener("scroll", () => {
      if (window.scrollY > 20) {
        navbar.classList.add("scrolled");
      } else {
        navbar.classList.remove("scrolled");
      }
    });

    // --- 6. REAL-TIME NAVER BLOG RSS SCRAPING & RENDERING ---
    // 네이버 RSS XML을 파싱하여 블로그 카드를 생성하는 공통 함수
    function parseNaverRssAndRenderBlog(xmlText) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const items = xmlDoc.getElementsByTagName("item");
      const blogGrid = document.querySelector(".blog-feed-grid");
      
      if (items.length > 0 && blogGrid) {
        blogGrid.innerHTML = "";
        // 최신 글 4개 노출
        const limit = Math.min(items.length, 4);
        for (let i = 0; i < limit; i++) {
          const item = items[i];
          const titleRaw = item.querySelector("title")?.textContent || "새로운 블로그 글";
          const title = titleRaw.replace(/^\[.*?\]\s*/, "").trim() || titleRaw;
          const link = item.querySelector("link")?.textContent || "https://blog.naver.com/" + NAVER_BLOG_ID;
          const pubDateStr = item.querySelector("pubDate")?.textContent || "";
          const rawDesc = item.querySelector("description")?.textContent || "";
          const category = item.querySelector("category")?.textContent || "블로그";
          
          // 본문 내용 중 이미지 태그의 src 추출 (썸네일 자동 연동)
          let thumbnail = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600";
          const imgRegex = /<img[^>]+src=["']([^"'>\\s]+)["']/ig;
          let match;
          while ((match = imgRegex.exec(rawDesc)) !== null) {
            const src = match[1];
            if (!src.includes("storep-phinf") && src.includes("pstatic.net")) {
              thumbnail = src.replace(/^http:\/\//i, 'https://').replace(/\?type=[a-zA-Z0-9]+$/, "?type=w800");
              break;
            }
          }
          
          // HTML 태그 제거 및 텍스트 슬라이스
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = rawDesc;
          const cleanDesc = (tempDiv.textContent || tempDiv.innerText || "").replace(/\s+/g, " ").trim().substring(0, 120) + "...";
          
          // 날짜 포맷팅 (YYYY. MM. DD)
          let formattedDate = pubDateStr;
          const dateObj = new Date(pubDateStr);
          if (!isNaN(dateObj)) {
            formattedDate = `${dateObj.getFullYear()}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${String(dateObj.getDate()).padStart(2, '0')}`;
          }
          
          const card = document.createElement("a");
          card.href = link;
          card.target = "_blank";
          card.rel = "noopener noreferrer";
          card.className = "blog-feed-card";
          card.innerHTML = `
            <div class="blog-feed-thumb-box">
              <img class="blog-feed-thumb" src="${thumbnail}" referrerpolicy="no-referrer" alt="${escapeHtml(title)}" onerror="this.src='https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600'">
            </div>
            <div class="blog-feed-info">
              <div class="blog-feed-header">
                <span class="blog-feed-tag">${escapeHtml(category)}</span>
                <span class="blog-feed-date">${formattedDate}</span>
              </div>
              <h3 class="blog-feed-title">${escapeHtml(title)}</h3>
              <p class="blog-feed-summary">${escapeHtml(cleanDesc)}</p>
              <span class="blog-feed-more">블로그 글 상세 페이지 이동 <i class="fa-solid fa-arrow-right"></i></span>
            </div>
          `;
          blogGrid.appendChild(card);
        }
        console.log(`네이버 블로그 최신 글 ${limit}개가 자동으로 반영되었습니다.`);
        applySearchFilter();
        return true;
      }
      return false;
    }

    async function loadNaverBlogFeed() {
      // 전략: 로컬 JSON 캐시를 먼저 즉시 로드하여 화면 노출, 이후 실시간 RSS로 업데이트
      const rssUrl = `https://rss.blog.naver.com/${NAVER_BLOG_ID}.xml`;
      const corsProxies = [
        `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`
      ];

      // 1단계: 로컬 JSON 캐시를 먼저 즉시 로드 (무조건 빠름)
      let localLoaded = false;
      try {
        const response = await fetch('./naver_blog_posts.json', { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
          const posts = await response.json();
          const blogGrid = document.querySelector(".blog-feed-grid");
          if (posts.length > 0 && blogGrid) {
            blogGrid.innerHTML = "";
            const limit = Math.min(posts.length, 4);
            for (let i = 0; i < limit; i++) {
              const post = posts[i];
              const card = document.createElement("a");
              card.href = post.link || "https://blog.naver.com/" + NAVER_BLOG_ID;
              card.target = "_blank";
              card.rel = "noopener noreferrer";
              card.className = "blog-feed-card";
              card.innerHTML = `
                <div class="blog-feed-thumb-box">
                  <img class="blog-feed-thumb" src="${post.thumbnail || ''}" referrerpolicy="no-referrer" alt="${escapeHtml(post.title || '')}" onerror="this.src='https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600'">
                </div>
                <div class="blog-feed-info">
                  <div class="blog-feed-header">
                    <span class="blog-feed-tag">${escapeHtml(post.category || '블로그')}</span>
                    <span class="blog-feed-date">${post.date || ''}</span>
                  </div>
                  <h3 class="blog-feed-title">${escapeHtml(post.title || '')}</h3>
                  <p class="blog-feed-summary">${escapeHtml(post.summary || '')}</p>
                  <span class="blog-feed-more">블로그 글 상세 페이지 이동 <i class="fa-solid fa-arrow-right"></i></span>
                </div>
              `;
              blogGrid.appendChild(card);
            }
            console.log(`로컬 JSON 캐시에서 블로그 글 ${limit}개 즉시 로드.`);
            applySearchFilter();
            localLoaded = true;
          }
        }
      } catch (e) {
        console.log("로컬 JSON 실패:", e.message);
      }

      // 2단계: 백그라운드로 실시간 RSS 업데이트 시도
      const tryLiveUpdate = async () => {
        // 1순위: Cloudflare Functions 프록시
        if (PROXY_URL) {
          try {
            const url = `${PROXY_URL}/naver?blogId=${NAVER_BLOG_ID}`;
            const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (response.ok) {
              const xmlText = await response.text();
              const blogOk = parseNaverRssAndRenderBlog(xmlText);
              parseNaverRssAndRenderProperties(xmlText);
              if (blogOk) {
                console.log("실시간 RSS(내부 프록시)로 업데이트 완료.");
                return;
              }
            }
          } catch (e) {
            console.log("내부 프록시 실패:", e.message);
          }
        }

        // 2순위: 공개 CORS 프록시 순차 시도
        for (const proxyUrl of corsProxies) {
          try {
            const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
            if (response.ok) {
              const xmlText = await response.text();
              // XML 유효성 검증
              if (xmlText.includes('<rss') || xmlText.includes('<channel>') || xmlText.includes('<item>')) {
                const blogOk = parseNaverRssAndRenderBlog(xmlText);
                parseNaverRssAndRenderProperties(xmlText);
                if (blogOk) {
                  console.log(`실시간 RSS(${proxyUrl})로 업데이트 완료.`);
                  return;
                }
              }
            }
          } catch (e) {
            console.log(`CORS 프록시 실패(${proxyUrl}):`, e.message);
          }
        }
      };

      // 실시간 업데이트를 비동기로 실행 (로켨 로드를 블록하지 않음)
      setTimeout(tryLiveUpdate, localLoaded ? 500 : 0);
    }

    // --- 6-2. REAL-TIME PROPERTIES FROM NAVER BLOG CATEGORY ---
    // 네이버 RSS XML을 파싱하여 추천 매물 카드를 생성하는 공통 함수
    function parseNaverRssAndRenderProperties(xmlText) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const items = xmlDoc.getElementsByTagName("item");
      const propertiesGrid = document.getElementById("properties-grid");
      
      if (items.length > 0 && propertiesGrid) {
        const matchedItems = [];
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const category = item.querySelector("category")?.textContent || "";
          
          // 띄어쓰기 오차 무력화: '추천 매물' vs '추천매물' 모두 매칭
          const cleanCategory = category.replace(/\s+/g, "");
          const cleanFilter = PROPERTY_CATEGORY_NAME.replace(/\s+/g, "");
          
          if (NAVER_BLOG_PROPERTY_CATEGORY_NO || !PROPERTY_CATEGORY_NAME || cleanCategory === cleanFilter) {
            matchedItems.push(item);
          }
        }
        
        if (matchedItems.length > 0) {
          propertiesGrid.innerHTML = "";
          // 최대 3개 추천매물 카드 노출
          const limit = Math.min(matchedItems.length, 3);
          for (let i = 0; i < limit; i++) {
            const item = matchedItems[i];
            const title = item.querySelector("title")?.textContent || "새로운 매물";
            const link = item.querySelector("link")?.textContent || "https://blog.naver.com/" + NAVER_BLOG_ID;
            const pubDateStr = item.querySelector("pubDate")?.textContent || "";
            const rawDesc = item.querySelector("description")?.textContent || "";
            const category = item.querySelector("category")?.textContent || "추천 매물";
            
            // 본문 내 이미지 추출
            let thumbnail = "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600";
            const imgRegex = /<img[^>]+src=["']([^"'>\\s]+)["']/ig;
            let match;
            while ((match = imgRegex.exec(rawDesc)) !== null) {
              const src = match[1];
              if (!src.includes("storep-phinf") && src.includes("pstatic.net")) {
                thumbnail = src.replace(/^http:\/\//i, 'https://').replace(/\?type=[a-zA-Z0-9]+$/, "?type=w800");
                break;
              }
            }
            
            // 텍스트 요약
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = rawDesc;
            const cleanDesc = (tempDiv.textContent || tempDiv.innerText || "").replace(/\s+/g, " ").trim().substring(0, 100) + "...";
            
            // 날짜 포맷
            let formattedDate = pubDateStr;
            const dateObj = new Date(pubDateStr);
            if (!isNaN(dateObj)) {
              formattedDate = `${dateObj.getFullYear()}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${String(dateObj.getDate()).padStart(2, '0')}`;
            }
            
            // 제목 대괄호 내 가격/스펙 추출 파싱
            let priceText = category;
            let cleanTitle = title;
            
            // [대학로 혜화 72 부동산] 같은 브랜딩 대괄호 제거 (다양한 변형 포함)
            const brandingRegex = /\[(?:대학로\s*)?혜화\s*72\s*(?:부동산|공인중개사|중개사)?\]/gi;
            cleanTitle = cleanTitle.replace(brandingRegex, "").trim();
            
            // 남은 대괄호(예: [매매 13억]) 중 첫 대괄호를 매물 가격표로 설정
            const bracketRegex = /\[([^\]]+)\]/;
            const match = bracketRegex.exec(cleanTitle);
            if (match) {
              priceText = match[1].trim();
              cleanTitle = cleanTitle.replace(bracketRegex, "").trim();
            }
            
            const card = document.createElement("div");
            card.className = "property-card";
            card.innerHTML = `
              <div class="property-thumb-box">
                <a href="${link}" target="_blank" rel="noopener noreferrer" class="property-thumb-link" title="블로그에서 매물 상세 보기 및 문의">
                  <img class="property-thumb" src="${thumbnail}" referrerpolicy="no-referrer" alt="${escapeHtml(cleanTitle)}" onerror="this.src='https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600'">
                </a>
                <div class="property-badges-overlay">
                  <span class="property-badge property-badge-type">${escapeHtml(category)}</span>
                  <span class="property-badge property-badge-status">중개가능</span>
                </div>
              </div>
              <div class="property-info-box">
                <div class="property-price">${escapeHtml(priceText)}</div>
                <h3 class="property-title">${escapeHtml(cleanTitle)}</h3>
                <div class="property-specs">
                  <span><i class="fa-solid fa-calendar-days"></i> ${formattedDate}</span>
                  <span><i class="fa-solid fa-ruler-combined"></i> 블로그 확인</span>
                </div>
                <a href="${link}" target="_blank" rel="noopener noreferrer" class="btn-property-ask">
                  <i class="fa-solid fa-comment"></i> 블로그 상세보기 & 문의
                </a>
              </div>
            `;
            propertiesGrid.appendChild(card);
          }
          console.log(`네이버 블로그 추천매물 카테고리 글 ${limit}개가 실시간 추천매물 영역에 반영되었습니다.`);
          applySearchFilter();
          return true;
        } else {
          console.log("추천매물 카테고리에 매칭되는 블로그 글이 없어 기본 템플릿 매물을 유지합니다.");
        }
      }
      return false;
    }

    async function loadPropertiesFeed() {
      const rssUrl = `https://rss.blog.naver.com/${NAVER_BLOG_ID}.xml`;
      const corsProxies = [
        `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`
      ];

      // 1순위: 내부 Cloudflare Pages Functions 프록시
      if (PROXY_URL) {
        try {
          let url = `${PROXY_URL}/naver?blogId=${NAVER_BLOG_ID}`;
          if (NAVER_BLOG_PROPERTY_CATEGORY_NO) {
            url += `&categoryNo=${NAVER_BLOG_PROPERTY_CATEGORY_NO}`;
          }
          const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (response.ok) {
            const xmlText = await response.text();
            if (parseNaverRssAndRenderProperties(xmlText)) return;
          }
        } catch (e) {
          console.log("추천매물 내부 프록시 실패, CORS 프록시로 fallback:", e.message);
        }
      }

      // 2순위: CORS 프록시들 순차 시도
      for (const proxyUrl of corsProxies) {
        try {
          const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
          if (response.ok) {
            const xmlText = await response.text();
            if (parseNaverRssAndRenderProperties(xmlText)) return;
          }
        } catch (e) {
          console.log(`추천매물 CORS 프록시 실패 (${proxyUrl}):`, e.message);
        }
      }

      console.warn("추천매물 블로그 RSS 피드 로드 실패 (기본 매물 카드를 유지합니다)");
    }

    // --- 7. REAL-TIME YOUTUBE LATEST VIDEO SCRAPING & PLAYER AUTO-UPDATE ---
    const DEFAULT_YOUTUBE_VIDEOS = [
      {
        videoId: "cyuJQmU26x4",
        title: "보증금 3억에 월 1,600만원? 혜화역 대로변 복층 상가 실화냐?",
        published: "2026-06-09T02:07:50+00:00",
        description: "혜화역 대로변 복층 상가 나왔습니다 🔥\n\n보증금 3억 / 월 1,600만원\n196㎡ (약 59평) | 1·2층 복층\n권리금 없음\n\n대로변 전면 통유리 + 내부계단 구조\n혜화역 1번 출구 바로 앞\n\n자세한 문의는 대학로 혜화72 부동산으로 연락 주세요.\n\n☎ 02-766-0720 / 010-3160-2675\n\n본 매물은 컨텐츠 제작 당시에 거래가 이루어지지 않은 매물입니다.",
        thumbnail: "https://i4.ytimg.com/vi/cyuJQmU26x4/hqdefault.jpg",
        isShort: true
      },
      {
        videoId: "U1BNGS5idDc",
        title: "혜화역 도보 5분, 관리비·권리금 없는 3층 사무실 #혜화역사무실 #서울대병원사무실",
        published: "2026-06-08T04:25:46+00:00",
        description: "📍 서울 종로구 이화동\n📐 40.97㎡ (약 12.4평) | 3층\n💰 보증금 1,000만원 / 월세 90만원\n✅ 관리비·권리금 없음\n🛋️ 에어컨·세탁기·인덕션·냉장고 옵션\n🚶‍♂️ 혜화역 도보 5분\n📅 즉시 입주 가능\n\n재택근무 사무실이나 소규모 사무실로 추천합니다.\n\n자세한 문의는 대학로혜화72공인중개사사무소로 연락 주세요.\n\n☎ 010-2358-2176 / 02-766-0720",
        thumbnail: "https://i2.ytimg.com/vi/U1BNGS5idDc/hqdefault.jpg",
        isShort: true
      },
      {
        videoId: "kdypVaGtpzM",
        title: "숲세권 살 수 있는 가장 저렴한 아파트 찾았습니다 #서울부동산 #꿀팁 (거래완료)",
        published: "2026-06-06T08:08:10+00:00",
        description: "본 매물은 거래 완료되었습니다. ㅜㅜ\n관심 가져주신 분들께 감사드립니다.\n\n★ 안녕하세요. 대학로 혜화역 전문 혜화 ‘72 부동산입니다.\n★ 혜화역 일대(명륜동, 혜화동, 동숭동, 이화동) 주택, 오피스텔 전,월세/매매 전문입니다.\n\n* 3룸, 1욕실, 거실, 베란다\n* 올수리 다 되어 있는 상태 최상급 아파트 입니다.\n* 보증금 2억6천/월세 20만 (만기일 27년 9월 14일)\n* 혜화역, 버스정류장 8분이내 거리로 교통 편리 합니다.\n* 낙산이 바로 눈 앞에 보여 자연과 함께하는 이쁜 집 입니다.\n* 바로 뒤에가 낙산 산책로가 있어 여유로운 시간을 보내실수 있고 공기가 맑고 좋습니다.",
        thumbnail: "https://i4.ytimg.com/vi/kdypVaGtpzM/hqdefault.jpg",
        isShort: true
      },
      {
        videoId: "oUp1UaVAMvg",
        title: "혜화역 4번출구 먹자라인 22평 1층 상가 | 권리금 없이 바로 입주!",
        published: "2026-05-28T07:43:22+00:00",
        description: "안녕하세요. 대학로 혜화72 김훈입니다.\n혜화역 4번 출구 먹자라인에 위치한 실매물 1층 상가 소개해드립니다.\n✅ 전용 72.73㎡ (22평)\n✅ 보증금 5천 / 월 330만원 (관리비 포함)\n✅ 즉시 입주 가능\n✅ 권리금 없음\n✅ 전면 넓고 출입구 방향 좋음 (동향)\n✅ 현재 일반음식점 운영 중\n\n추천 업종\n고기집, 횟집, 이자카야, 술집, 카페 등 먹자골목에 잘 맞는 업종 최고!\n혜화역 4번 출구에서 나와서 바로 먹자라인이 시작되는 자리라 유동인구가 정말 좋습니다.",
        thumbnail: "https://i4.ytimg.com/vi/oUp1UaVAMvg/hqdefault.jpg",
        isShort: true
      },
      {
        videoId: "boSFPGcrHAk",
        title: "대학로 혜화72 부동산은 어떤 부동산일까?",
        published: "2026-05-19T09:08:38+00:00",
        description: "대학로 혜화72 부동산은 어떤 부동산일까?\n\n대학로혜화72공인중개사사무소 대표 김훈의 공식 소개 및 브랜드 스토리 영상입니다.\n혜화동 골목 이야기와 부동산 매물, 자산 컨설팅 정보들을 유튜브 채널에서 다룹니다.\n많은 구독과 알림 설정 부탁드립니다!",
        thumbnail: "https://i3.ytimg.com/vi/boSFPGcrHAk/hqdefault.jpg",
        isShort: true
      },
      // Mock Long-form videos to populate the long-form tab beautifully
      {
        videoId: "mock_long_1",
        title: "[준비 중] 혜화동 고즈넉한 한옥 단독주택 매매 현장 투어",
        published: "2026-06-11T12:00:00+00:00",
        description: "혜화동 골목에 숨겨진 보물 같은 한옥 주택 내부 실사 투어 영상입니다.\n리모델링 한옥 주택의 외관과 전통 중정 마당, 내부 편의 시설을 상세히 분석합니다.\n(현재 편집 중이며 곧 유튜브에 업로드될 예정입니다.)",
        thumbnail: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600",
        isShort: false,
        isMock: true
      },
      {
        videoId: "mock_long_2",
        title: "[준비 중] 대학로 상권 분석 및 1층 상가 임대 계약 법률 컨설팅",
        published: "2026-06-10T12:00:00+00:00",
        description: "대학로 1층 상가 임대 및 권리 계약 진행 시 반드시 알아야 할 법률 체크리스트와 상권 트렌드 분석 강의입니다.\n공인중개사 김훈 대표의 꿀팁이 담겨 있습니다.\n(현재 기획 중이며 곧 만나보실 수 있습니다.)",
        thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600",
        isShort: false,
        isMock: true
      }
    ];

    let youtubeVideos = [];

    async function loadYoutubeFeed() {
      try {
        let loadedVideos = [];
        if (PROXY_URL) {
          const url = `${PROXY_URL}/youtube?channelId=${YOUTUBE_CHANNEL_ID}`;
          const response = await fetch(url);
          if (response.ok) {
            loadedVideos = await response.json();
          }
        }
        
        // If API fails or returns empty, load default mocks
        if (!loadedVideos || loadedVideos.length === 0 || loadedVideos.error) {
          console.log("유튜브: API 로드 실패 또는 데이터 없음. 기본 Mock 데이터를 사용합니다.");
          youtubeVideos = [...DEFAULT_YOUTUBE_VIDEOS];
        } else {
          // Merge loaded videos from API and check if we have any long form
          const hasLongForm = loadedVideos.some(v => !v.isShort);
          if (!hasLongForm) {
            // Add mock long-form videos so the long-form tab is not empty
            const mockLongs = DEFAULT_YOUTUBE_VIDEOS.filter(v => !v.isShort);
            youtubeVideos = [...loadedVideos, ...mockLongs];
          } else {
            youtubeVideos = loadedVideos;
          }
        }
      } catch (error) {
        console.warn("유튜브 RSS 로드 중 예외 발생, 기본 데이터를 유지합니다:", error.message);
        youtubeVideos = [...DEFAULT_YOUTUBE_VIDEOS];
      }
      
      renderYoutubeVideos();
      
    }

    // Render 9 videos in a 3×3 grid

    function renderYoutubeVideos() {
      const grid = document.getElementById("yt-grid-container");
      if (!grid) return;
      grid.innerHTML = "";

      // Show up to 9 videos (fill with mocks if fewer)
      const toShow = youtubeVideos.slice(0, 9);

      if (toShow.length === 0) {
        grid.innerHTML = `<div class="yt-empty-state" style="grid-column:span 3;"><i class="fa-solid fa-video-slash"></i><p>영상을 불러오는 중입니다.</p></div>`;
        return;
      }

      toShow.forEach(video => {
        const card = document.createElement("div");
        card.className = "yt-grid-card";
        card.setAttribute("data-video-id", video.videoId);

        const badgeHtml = video.isShort
          ? `<span class="yt-grid-card-badge">Shorts</span>`
          : (video.isMock ? `<span class="yt-grid-card-badge" style="background:var(--primary);color:#070b13;">준비중</span>` : "");

        card.innerHTML = `
          <img src="${video.thumbnail}" referrerpolicy="no-referrer" alt="${escapeHtml(video.title)}" loading="lazy">
          <div class="yt-grid-card-play"><i class="fa-solid fa-play"></i></div>
          <div class="yt-grid-card-overlay">
            ${badgeHtml}
            <p class="yt-grid-card-title">${escapeHtml(video.title)}</p>
          </div>
        `;

        // Click: open lightbox with embedded video
        card.addEventListener("click", () => {
          const playId = video.isMock ? "boSFPGcrHAk" : video.videoId;
          lightboxImg.style.display = "none";
          lightboxVideoContainer.style.display = "block";
          lightboxIframe.src = `https://www.youtube.com/embed/${playId}?autoplay=1&rel=0`;
          lightboxCaption.textContent = video.title;
          lightboxModal.classList.add("active");
          document.body.style.overflow = "hidden";
        });

        grid.appendChild(card);
      });
    }

    // --- 8. GALLERY (VLOG ONLY — no category filter buttons) ---

    function updateActiveGalleryItems() {
      galleryItems = document.querySelectorAll(".gallery-item");
      activeGalleryItems = Array.from(galleryItems).filter(item => item.style.display !== "none");
    }

    // --- 9. GALLERY LIGHTBOX OVERLAY ---
    function openLightbox(index) {
      lightboxIndex = index;
      const activeItem = activeGalleryItems[lightboxIndex];
      if (!activeItem) return;
      
      const img = activeItem.querySelector(".gallery-img");
      const title = activeItem.querySelector(".gallery-title");
      const videoId = activeItem.getAttribute("data-video-id");
      
      if (videoId) {
        // Show video container, hide image
        lightboxImg.style.display = "none";
        lightboxVideoContainer.style.display = "block";
        
        // If it's a mock, play the introduction video boSFPGcrHAk as a fallback
        const playId = activeItem.getAttribute("data-is-mock") === "true" ? "boSFPGcrHAk" : videoId;
        lightboxIframe.src = `https://www.youtube.com/embed/${playId}?autoplay=1&rel=0`;
      } else {
        // Show image, hide video container
        lightboxImg.style.display = "block";
        lightboxVideoContainer.style.display = "none";
        lightboxIframe.src = "";
        
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
      }
      
      lightboxCaption.textContent = title ? title.textContent : "";
      lightboxModal.classList.add("active");
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      lightboxModal.classList.remove("active");
      document.body.style.overflow = "";
      // Reset iframe src to stop video audio playback
      lightboxIframe.src = "";
    }

    function navigateLightbox(direction) {
      lightboxIndex += direction;
      if (lightboxIndex < 0) {
        lightboxIndex = activeGalleryItems.length - 1;
      } else if (lightboxIndex >= activeGalleryItems.length) {
        lightboxIndex = 0;
      }
      openLightbox(lightboxIndex);
    }

    // Event delegation for gallery item clicks (handles static & dynamic items)
    const galleryContainer = document.getElementById("gallery-container");
    if (galleryContainer) {
      galleryContainer.addEventListener("click", (e) => {
        const item = e.target.closest(".gallery-item");
        if (item) {
          updateActiveGalleryItems();
          const activeIndex = activeGalleryItems.indexOf(item);
          openLightbox(activeIndex !== -1 ? activeIndex : 0);
        }
      });
    }

    lightboxCloseBtn.addEventListener("click", closeLightbox);
    lightboxPrevBtn.addEventListener("click", () => navigateLightbox(-1));
    lightboxNextBtn.addEventListener("click", () => navigateLightbox(1));

    lightboxModal.addEventListener("click", (e) => {
      // Close if clicking outside the media elements
      if (e.target === lightboxModal || e.target.classList.contains("lightbox-img-box") || e.target.id === "lightbox-video-container") {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (lightboxModal.classList.contains("active")) {
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") navigateLightbox(-1);
        if (e.key === "ArrowRight") navigateLightbox(1);
      }
    });

    // --- 10. REAL-TIME SEARCH FILTERING ---
    function applySearchFilter() {
      const searchInput = document.getElementById("search-input");
      if (!searchInput) return;
      
      const query = searchInput.value.toLowerCase().trim();
      
      // 1. Filter Property Cards
      const propertyCards = document.querySelectorAll(".property-card");
      propertyCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(query)) {
          card.classList.remove("filtered-out");
        } else {
          card.classList.add("filtered-out");
        }
      });
      
      // 2. Filter Blog Cards
      const blogCards = document.querySelectorAll(".blog-feed-card");
      blogCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(query)) {
          card.classList.remove("filtered-out");
        } else {
          card.classList.add("filtered-out");
        }
      });
      
      // 3. Filter Gallery Items (Vlog only — no category filter)
      const galleryItemsList = document.querySelectorAll(".gallery-item");
      galleryItemsList.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(query)) {
          item.style.display = "block";
          setTimeout(() => {
            item.style.opacity = "1";
            item.style.transform = "scale(1)";
          }, 50);
        } else {
          item.style.opacity = "0";
          item.style.transform = "scale(0.95)";
          setTimeout(() => {
            item.style.display = "none";
          }, 300);
        }
      });
      
      setTimeout(updateActiveGalleryItems, 350);
    }

    const searchInputElement = document.getElementById("search-input");
    if (searchInputElement) {
      searchInputElement.addEventListener("input", applySearchFilter);
    }

    // --- 11. HELPERS ---
    function escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // --- 12. DAILY VLOG LOAD & RENDER ---
    const DEFAULT_DAILY_VLOGS = [
      {
        videoId: "HdSKnqfzQDg",
        title: "미친 양꼬치 혜화점 오픈 날",
        thumbnail: "https://i1.ytimg.com/vi/HdSKnqfzQDg/hqdefault.jpg",
        isMock: false
      }
    ];

    async function loadDailyVlogFeed() {
      try {
        let loadedVideos = [];
        if (PROXY_URL) {
          const url = `${PROXY_URL}/youtube?channelId=${DAILY_YOUTUBE_CHANNEL_ID}`;
          const response = await fetch(url);
          if (response.ok) {
            loadedVideos = await response.json();
          }
        }
        
        if (!loadedVideos || loadedVideos.length === 0 || loadedVideos.error) {
          console.log("일상영상: API 로드 실패 또는 데이터 없음. 기본 Mock 일상 데이터를 사용합니다.");
          renderDailyVlogs(DEFAULT_DAILY_VLOGS);
        } else {
          console.log(`일상영상: API 로드 성공 (${loadedVideos.length}개)`);
          renderDailyVlogs(loadedVideos);
        }
      } catch (error) {
        console.warn("일상영상 로드 중 예외 발생, 기본 데이터를 유지합니다:", error.message);
        renderDailyVlogs(DEFAULT_DAILY_VLOGS);
      }
    }

    function renderDailyVlogs(vlogs) {
      const gc = document.getElementById("gallery-container");
      if (!gc) return;
      
      // Remove any existing vlog items
      const existingVlogs = gc.querySelectorAll('.gallery-item[data-category="vlog"]');
      existingVlogs.forEach(el => el.remove());
      
      vlogs.forEach(vlog => {
        const item = document.createElement("div");
        item.className = "gallery-item video-item";
        item.setAttribute("data-category", "vlog");
        item.setAttribute("data-video-id", vlog.videoId);
        if (vlog.isMock) {
          item.setAttribute("data-is-mock", "true");
        }
        
        item.innerHTML = `
          <img class="gallery-img" src="${vlog.thumbnail}" referrerpolicy="no-referrer" alt="${escapeHtml(vlog.title)}">
          <div class="gallery-overlay">
            <span class="gallery-tag">일상영상(Vlog)</span>
            <h3 class="gallery-title">${escapeHtml(vlog.title)}</h3>
          </div>
        `;
        
        gc.appendChild(item);
      });
      
      // Refresh gallery items and active list
      updateActiveGalleryItems();
      
      console.log(`일상영상(Vlog) ${vlogs.length}개가 갤러리에 추가 완료되었습니다.`);
    }

    // --- 13. INITIALIZATION ---
    document.addEventListener("DOMContentLoaded", () => {
      updateActiveGalleryItems();
      loadNaverBlogFeed();
      loadPropertiesFeed();
      loadYoutubeFeed();
      loadDailyVlogFeed();
      applySearchFilter();
    });
  