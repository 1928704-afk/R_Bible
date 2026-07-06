# Bible Reading Challenge

청년부·소그룹 단위의 성경읽기 인증을 관리하는 PWA 웹앱입니다. 단체장이 단체와 부서를 만들고, 소속원은 단체/부서/이름으로 참여해 매일 성경읽기 인증과 묵상글을 남길 수 있습니다.

## 프로젝트 개요

- 목적: 교회 청년부의 월별 성경읽기 참여 현황을 부서 단위로 관리
- 형태: Expo 기반 React Native Web PWA
- 배포: Cloudflare Pages + Supabase
- 데이터: Supabase Postgres
- 알림: Web Push + Supabase Edge Function + pg_cron
- 향후 확장: 동일 코드베이스를 Android/iOS 앱 출시로 확장 가능

## 주요 기능

- 단체 생성 및 참여 온보딩
- 부서별 월 목표 인원수 설정
- 성경 66권/장 선택 기반 오늘 인증
- 하루 1회 인증 제한
- 오늘 작성된 묵상글 모아보기
- 내 인증 기록 및 묵상글 상세 보기
- 부서별 진행률과 전체 진행률 대시보드
- PWA 설치 지원
- 웹 푸시 알림 구독 및 매일 리마인드 발송
- Supabase Edge Function 배포용 GitHub Actions 워크플로

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | Expo SDK 54, React 19, React Native, React Native Web, TypeScript |
| Storage/API | Supabase JS, Supabase Postgres, Row Level Security |
| PWA | Web App Manifest, Service Worker, Web Push |
| Backend Job | Supabase Edge Functions, pg_cron, pg_net |
| Deploy | Cloudflare Pages, GitHub Actions |
| Package Manager | pnpm |

## 아키텍처

```text
사용자 브라우저/PWA
  ├─ React Native Web UI
  ├─ Service Worker
  └─ Push Subscription

Supabase
  ├─ organizations
  ├─ departments
  ├─ members
  ├─ reading_logs
  ├─ push_subscriptions
  ├─ Edge Function: send-reminders
  └─ pg_cron: daily-reading-reminder

GitHub
  └─ Actions: Deploy Supabase Functions

Cloudflare Pages
  └─ 정적 웹앱 배포
```

## 폴더 구조

```text
App.tsx                              # 화면, 상태, 인증/가입 플로우
lib/supabase.ts                      # Supabase 클라이언트 설정
public/manifest.webmanifest          # PWA manifest
public/sw.js                         # 캐시, push, notificationclick 처리
supabase/schema.sql                  # 운영 DB 스키마 및 RLS 정책
supabase/cron.sql                    # 매일 리마인드 cron 설정
supabase/config.toml                 # Edge Function 설정
supabase/functions/send-reminders/   # Web Push 발송 Edge Function
.github/workflows/                   # Supabase Function 배포 자동화
```

## 실행 방법

```bash
pnpm install
pnpm run web
```

웹 정적 빌드:

```bash
pnpm run build:web
```

타입 검사:

```bash
pnpm exec tsc --noEmit
```

## 환경 변수

프론트엔드 환경 변수는 `.env.example`을 기준으로 설정합니다.

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
EXPO_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
```

Supabase Edge Function Secret:

```text
SERVICE_ROLE_KEY
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
REMINDER_CRON_SECRET
```

GitHub Actions Secret:

```text
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_ID
```

## Supabase 설정

1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. Edge Function Secret 등록
4. GitHub Actions Secret 등록
5. `Deploy Supabase Functions` 워크플로 실행
6. SQL Editor에서 `supabase/cron.sql` 실행

리마인드 cron은 UTC 기준 `0 12 * * *`이며, 한국시간 기준 매일 21:00에 실행됩니다.

## 구현 포인트

- 모바일 우선 PWA UX를 기반으로 데스크톱에서도 자연스럽게 보이도록 반응형 구성
- 데이터 구조를 단체, 부서, 구성원, 인증 기록으로 분리
- Web Push 구독 정보를 DB에 저장하고 Edge Function에서 구독 목록을 순회 발송
- 만료된 push subscription은 Edge Function에서 정리
- Supabase CLI 로컬 배포 실패 상황을 GitHub Actions 배포 경로로 우회
- 민감한 키는 프론트 코드와 GitHub 저장소에 포함하지 않고 Secret으로 분리

## 현재 상태

- PWA 웹앱 운영 가능
- Supabase DB 연동 가능
- Web Push 수동 테스트 발송 성공
- GitHub main push 기반 Cloudflare Pages 자동 배포 가능
- Android/iOS 네이티브 앱 출시는 추후 EAS Build로 확장 예정
