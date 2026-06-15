# 대학로 혜화72 공인중개사 사무소 — 공식 브랜드 허브 사이트

혜화동·대학로 전문 공인중개사이자 유튜브 크리에이터인 '김훈(대학로 혜화72 공인중개사 사무소)'의 공식 브랜드 허브 사이트입니다.

---

## 📂 폴더 구조
```
hyehwa72_homepage/
├── index.html          # 메인 HTML (모든 스타일 및 스크립트 내장)
└── README.md           # 본 안내 파일
```

---

## ⚙️ 설정 및 수정 가이드

### 1. 소셜 미디어 링크 수정
`index.html`을 텍스트 에디터로 열어 아래 주소들을 원하시는 주소로 수정할 수 있습니다:
- **유튜브 채널**: `https://www.youtube.com/channel/UC4LUKIDmLbd3bMAjjGJ18DQ`
- **인스타그램**: `https://www.instagram.com/realhyehwa72/`
- **쓰레드**: `https://www.threads.com/@realhyehwa72`
- **틱톡**: `https://www.tiktok.com/@ongamemall`
- **네이버 블로그**: `https://blog.naver.com/ongamemall`

### 2. 연락처 및 푸터 비즈니스 정보 수정
`index.html` 하단 영역의 연락처 주소와 중개사무소 필수 표기 사항을 수정하실 수 있습니다:
- **대표전화**: `010-3160-2675`
- **사무실번호**: `02-766-0720`
- **이메일**: `ongamemall@naver.com`
- **사무실 주소**: `서울 종로구 창경궁로 266 (혜화동) 1층`
- **상호 및 등록번호**: 대학로 혜화72 공인중개사 사무소 / 대표 김훈 / 등록번호 11110-2021-00036

---

## 🚀 GitHub Push & Cloudflare Pages 자동 배포 시스템 구축

이 프로젝트는 Git 로컬 저장소가 이미 초기화 및 커밋 완료되어 있습니다. 깃허브에 코드를 푸시하고 Cloudflare Pages와 연동하여 **코드 업데이트 시 실시간 자동 배포**가 수행되도록 구성하는 절차입니다.

### 1단계. 깃허브(GitHub)에 코드 업로드하기
1. **GitHub** (`github.com`)에 로그인 후 새로운 저장소(New Repository)를 생성합니다. (저장소 이름 예: `hyehwa72-homepage`)
2. 로컬 터미널(프로젝트 폴더 경로)에서 아래 명령어를 차례대로 실행하여 코드를 업로드합니다:
   ```bash
   # 기본 브랜치 이름을 main으로 지정
   git branch -M main

   # 깃허브 원격 저장소 연결 (깃허브 주소를 실제 주소로 변경하여 실행)
   git remote add origin https://github.com/사용자이름/hyehwa72-homepage.git

   # 코드를 깃허브로 전송
   git push -u origin main
   ```

### 2단계. Cloudflare Pages와 GitHub 연동하기
1. **Cloudflare 대시보드** 로그인 (`dash.cloudflare.com`).
2. 좌측 메뉴에서 **Workers & Pages** ➡️ **Create application** ➡️ **Pages** 탭 선택.
3. **Connect to Git** (깃 연동) 버튼을 클릭합니다.
4. GitHub 계정을 연동한 후, 방금 생성하여 코드를 푸시한 `hyehwa72-homepage` 저장소를 선택합니다.
5. **Set up builds and deployments** 단계에서 다음 설정을 확인합니다:
   - **Project name**: 설정한 프로젝트 명 (도메인 주소로 사용됨)
   - **Production branch**: `main`
   - **Framework preset**: `None` (정적 페이지이므로 빌드 명령어가 필요 없습니다.)
   - **Build command**: 비워둠
   - **Build output directory**: 비워둠 (루트 디렉토리를 그대로 사용)
6. **Save and Deploy**를 누르면 최초 배포가 완료되며 고유 주소(예: `hyehwa72-homepage.pages.dev`)가 발급됩니다.

이제부터는 로컬에서 파일을 수정하고 `git commit` 후 `git push`만 실행하면, **Cloudflare Pages가 자동으로 감지하여 10~15초 내에 무료로 실시간 배포**를 완료합니다.

---

## 🧪 로컬 테스트 방법
로컬 웹 서버가 정상 구동 중인 상태에서 아래 주소로 접속하여 테스트하실 수 있습니다.
- 접속 주소: [http://localhost:8000](http://localhost:8000)
