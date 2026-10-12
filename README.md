# 📖 Bible Reading Challenge (R_Bible)

> **교회 청년부·소그룹을 위한 성경읽기 인증 및 공동체 챌린지 PWA 웹앱**  
> 단체와 부서를 개설하고, 매일 성경 본문 읽기 인증과 묵상을 함께 나누며 공동체의 읽기 목표 달성률을 한눈에 확인할 수 있습니다.

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Demo-rbible.workers.dev-0284c7?style=for-the-badge&logo=cloudflare&logoColor=white)](https://rbible.tjsghkwlsgh.workers.dev)
[![GitHub Repository](https://img.shields.io/badge/GitHub-R__Bible-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/1928704-afk/R_Bible)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native Web](https://img.shields.io/badge/React_Native_Web-React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://necolas.github.io/react-native-web/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Functions-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](./LICENSE)

</div>

---

## 🔗 배포 링크 (Live Demo)

- **🌐 프로덕션 웹앱**: [https://rbible.tjsghkwlsgh.workers.dev](https://rbible.tjsghkwlsgh.workers.dev)
- **📦 GitHub 저장소**: [https://github.com/1928704-afk/R_Bible](https://github.com/1928704-afk/R_Bible)

> 💡 **PWA 설치 지원**: 모바일 브라우저(Safari, Chrome 등)에서 접속 후 **‘홈 화면에 추가’**를 누르면 독립형 네이티브 앱처럼 사용할 수 있습니다.

---

## 📌 프로젝트 개요

- **목적**: 청년부/공동체 구성원들의 성경읽기 습관 형성을 돕고, 부서별 월간 목표 인원수 대비 참여율을 투명하게 시각화
- **플랫폼**: Expo 기반의 React Native Web Single Page Application (PWA)
- **호스팅/인프라**: Cloudflare Workers (Static Assets)
- **백엔드/데이터베이스**: Supabase Postgres (Row Level Security 적용)
- **백엔드 자동화/알림**: Supabase Edge Functions + pg_cron + Web Push Notification
- **향후 확장**: 동일한 코드베이스로 Android / iOS 네이티브 앱(EAS Build) 패키징 지원 가능

---

## ✨ 주요 기능

### 1. 간편한 온보딩 & 참여
- 단체(공동체) 개설 및 부서 생성 (부서별 월간 목표 인원수 설정)
- 별도의 복잡한 회원가입 절차 없이 단체 / 부서 선택 및 이름 입력으로 즉시 참여
- 로컬 스토리지 자동 저장을 통한 자동 로그인 환경 제공

### 2. 성경읽기 인증 & 묵상 기록
- 성경 66권 및 장(Chapter) 선택을 통한 직관적인 인증 입력
- 하루 1회 중복 방지 인증 규칙 적용
- 오늘 인증한 말씀에 대한 개인 묵상글(선택 사항) 작성 및 공유

### 3. 피드 & 대시보드
- **오늘의 묵상**: 같은 날 인증을 완료한 지체들의 묵상글 실시간 피드 모아보기
- **내 기록 조회**: 본인이 지금까지 작성한 인증 내역 및 묵상글 히스토리 열람
- **진행률 대시보드**: 부서별 목표 인원수 대비 참여율 및 전체 공동체 달성률 실시간 집계

### 4. PWA & Web Push 리마인드 알림
- 웹 매니페스트 및 서비스 워커 기반 PWA 설치 지원
- VAPID 기반 Web Push 알림 구독 기능
- 매일 지정된 시간(한국시간 21:00 등)에 미인증자 대상 성경읽기 독려 푸시 발송 (Edge Function & pg_cron 연동)

### 5. 관리자 기능
- 단체 및 부서 목표 수정 / 관리
- 비정상 인증 기록 또는 부적절한 묵상글에 대한 관리자 삭제 기능

---

## 🛠 기술 스택

| 영역 | 기술 스택 | 설명 |
| --- | --- | --- |
| **Frontend** | React 19, React Native, React Native Web | 크로스 플랫폼 호환 웹/앱 UI 구성 |
| **Framework** | Expo SDK 54 | 번들링 및 정적 웹 내보내기(`expo export -p web`) |
| **Language** | TypeScript | 엄격한 타입 안정성 보장 |
| **Database & Auth** | Supabase Postgres | 관계형 데이터베이스 및 RLS 보안 정책 |
| **Backend & Cron** | Supabase Edge Functions, pg_cron, pg_net | 서버리스 푸시 알림 스케줄러 |
| **Hosting** | Cloudflare Workers (Assets) | 글로벌 엣지 CDN을 통한 초고속 정적 배포 |
| **CI / CD** | GitHub Actions | Supabase Edge Functions 배포 자동화 |
| **Package Manager**| pnpm | 빠르고 효율적인 의존성 관리 |

---

## 🏗 아키텍처

```text
┌────────────────────────────────────────────────────────┐
│                  사용자 기기 (Web / PWA)                 │
│   React Native Web UI ── Service Worker ── Web Push    │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌──────────────────────────┐   ┌─────────────────────────┐
│ Cloudflare Workers CDN   │   │        Supabase         │
│   (정적 Assets 호스팅)     │   │ ├─ organizations        │
└──────────────────────────┘   │ ├─ departments          │
                               │ ├─ members              │
┌──────────────────────────┐   │ ├─ reading_logs         │
│      GitHub Actions      │   │ ├─ push_subscriptions   │
│   (Edge Function 배포)    ├───┼─ Edge Function         │
└──────────────────────────┘   │ └─ pg_cron (알림 스케줄)  │
                               └─────────────────────────┘
```

---

## 📂 폴더 구조

```text
├── App.tsx                              # 전체 화면 UI, 상태 관리 및 라우팅 로직
├── lib/
│   └── supabase.ts                      # Supabase 클라이언트 초기화
├── public/
│   ├── manifest.webmanifest          # PWA 웹 매니페스트 설정
│   └── sw.js                         # Service Worker (오프라인 캐시 및 푸시 알림 핸들러)
├── supabase/
│   ├── schema.sql                    # 데이터베이스 스키마 및 RLS(Row Level Security)
│   ├── cron.sql                      # 정기 푸시 알림 발송 pg_cron 설정
│   ├── config.toml                   # Supabase 로컬 개발 및 Edge Function 설정
│   └── functions/
│       └── send-reminders/           # Web Push 발송을 담당하는 Deno 기반 Edge Function
├── .github/workflows/
│   └── deploy-supabase-functions.yml # GitHub Actions 자동 배포 워크플로
├── wrangler.toml                     # Cloudflare Workers 빌드 및 배포 설정
└── package.json
```

---

## 🚀 로컬 실행 방법

### 1. 저장소 클론 및 패키지 설치
```bash
git clone https://github.com/1928704-afk/R_Bible.git
cd R_Bible
pnpm install
```

### 2. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하고 Supabase 프로젝트 정보를 입력합니다.
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
EXPO_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### 3. 개발 서버 실행
```bash
# 로컬 웹 개발 서버 시작 (http://localhost:8081)
pnpm run web

# 타입 검사
pnpm run typecheck
```

### 4. 정적 웹 빌드
```bash
pnpm run build:web
```

---

## ☁️ 배포 가이드

### Cloudflare Workers 배포
프로젝트 루트의 `wrangler.toml`에 따라 Cloudflare에 배포됩니다.
```bash
# 정적 웹 빌드 후 Cloudflare Workers 배포
pnpm run build:web
npx wrangler deploy
```

### Supabase Edge Function 배포
GitHub Actions 워크플로(`.github/workflows/deploy-supabase-functions.yml`)를 통해 main 브랜치 푸시 시 자동 배포됩니다.

필요한 Repository Secrets:
- `SUPABASE_ACCESS_TOKEN`: Supabase Personal Access Token
- `SUPABASE_PROJECT_ID`: Supabase Project Reference ID

---

## 📄 라이선스

이 프로젝트는 [MIT License](./LICENSE)를 따릅니다.
