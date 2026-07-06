# 청년부 성경읽기 챌린지

60명 / 3부서 / 부서당 월 목표 300회 기준의 성경읽기 챌린지 앱입니다.

## 주요 기능

- 오늘 성경 읽기 +1 인증
- 개인 누적, 연속 기록, 부서 진행률
- 부서 현황과 전체 3부서 현황
- 인증 완료 후 공유 문구 복사 / 공유 시트 열기
- 이름과 소속 부서 설정
- 기기 저장소 기반 기록 유지
- 웹, Expo Go, 추후 앱스토어 빌드까지 이어지는 Expo 코드베이스

> 현재 완성본은 서버 없이 기기 안에 기록을 저장합니다.
> 교회 전체 운영 버전으로 확장할 때는 Supabase Auth/DB, 서버 시간 기준 1일 1회 제한, Expo Push Notifications를 연결하면 됩니다.

## 실행 방법 (웹앱 개발)

웹앱으로 먼저 운영 흐름을 확인할 수 있습니다.

```bash
pnpm install
pnpm expo start --web --host lan --port 8081
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:8081
```

같은 Wi-Fi의 휴대폰 브라우저에서는 터미널에 표시되는 LAN 주소 또는 현재 개발 PC의 IP 주소로 접속합니다.

## 실행 방법 (Expo Go 테스트)

Expo 공식 문서는 실물 기기에서 Expo Go로 테스트할 때 SDK 54 프로젝트 사용을 안내합니다.

```bash
pnpm install
pnpm expo start --host lan --port 8081
```

1. 휴대폰에 **Expo Go** 설치
2. 컴퓨터와 휴대폰을 같은 Wi‑Fi에 연결
3. 터미널 QR 코드를 Expo Go로 스캔

Android 앱 파일(AAB/APK) 또는 iOS 빌드는 EAS Build를 사용합니다.

```bash
pnpm add -g eas-cli
eas login
eas build:configure
eas build --platform android
```

## 서버 운영 전환 체크리스트

1. Supabase 프로젝트 생성
2. `users`, `departments`, `monthly_challenges`, `reading_logs` 테이블 연결
3. `UNIQUE(user_id, read_date)`로 하루 1회 인증 강제
4. 운영자 웹(Next.js) 연결
5. Expo Push Token 저장 및 Edge Function/Cron 발송
6. 실제 앱 아이콘, 스플래시, 개인정보처리방침 추가
7. TestFlight / Google Play 비공개 테스트 배포

## 폴더 구성

```text
App.tsx      # 앱 화면과 상태 로직
index.ts     # Expo 앱 엔트리
app.json     # 앱 이름 / Android·iOS 식별자
package.json # Expo 실행 설정
```
