# ♻️ 분리수거 AI (PWA)

사진을 찍거나 말로 물어보면, **선택한 구(區)의 기준**에 맞춰 물건을 부위별로 나눠 분리배출 방법을 알려주는 PWA입니다.
(예: "린스통" → 펌프는 일반쓰레기 / 용기는 헹궈서 플라스틱 + 송파구 배출 요일)

## 구조

```
[휴대폰 PWA]  사진 📷 + 말하기 🎤 / 글 ⌨️ + 지역 선택 📍
      │  /api/ask, /api/transcribe
      ▼
[api/ (Vercel 서버리스 함수)]  ← OpenAI API 키는 여기에만 있음
      │  knowledge/national.md + knowledge/regions/<구>.md 를 프롬프트에 넣음
      ▼
[OpenAI]  부위별 배출 안내를 JSON 형식으로 응답 → 카드로 표시
```

```
src/                  화면 (React)
  App.tsx             대화 화면, 지역 선택(대화 중 변경 가능)
  components/         AnswerCard(답변 카드), Composer(입력창: 사진·음성·글)
  hooks/useSpeech.ts  음성 인식 (브라우저 내장 → 안 되면 녹음 후 서버 받아쓰기)
api/                  서버 함수 (ask: 안내 생성, transcribe: 받아쓰기)
server/               프롬프트, 지식 문서 로딩, OpenAI 클라이언트
shared/               지역 목록, 타입 (화면·서버 공용)
knowledge/            AI가 근거로 쓰는 배출 기준 문서 ← 여기를 채우는 게 핵심!
```

## 로컬 실행

```bash
npm install
copy .env.example .env.local   # 그리고 OPENAI_API_KEY 입력
npm run dev                    # http://localhost:5173
```

**휴대폰에서 테스트(같은 Wi-Fi):** `npm run dev:mobile` → 표시된 `https://<PC IP>:5173` 접속
(인증서 경고는 "계속"으로 진행. 카메라·마이크는 HTTPS에서만 동작)

## 휴대폰에 앱으로 설치 (배포)

1. GitHub에 올린 뒤 [Vercel](https://vercel.com)에서 Import (Vite 프로젝트로 자동 인식)
2. Settings → Environment Variables 에 `OPENAI_API_KEY` 와 `APP_ACCESS_CODE`(권장) 추가
3. 배포된 `https://….vercel.app` 주소를 휴대폰으로 열기
   - **안드로이드(크롬):** 메뉴 ⋮ → "앱 설치" 또는 "홈 화면에 추가"
   - **아이폰(사파리):** 공유 버튼 → "홈 화면에 추가"
4. 앱의 ⚙️ 설정에 접근 코드 입력

> `APP_ACCESS_CODE`를 설정하지 않으면 주소를 아는 누구나 내 API 키로 요금을 쓸 수 있어요.

## 음성 인식

| 환경 | 방식 |
|---|---|
| 안드로이드 크롬, 아이폰 사파리 | 브라우저 내장 음성 인식 (무료, 실시간) |
| 브라우저 인식이 막힌 환경 (예: 아이폰 홈 화면 앱) | 자동으로 녹음 방식 전환 → OpenAI 받아쓰기 (`/api/transcribe`) |

답변 카드의 🔊 버튼으로 안내를 읽어줄 수도 있어요.

## 지역 자료 채우기

`knowledge/README.md` 참고. 강남구·송파구는 틀만 있고 내용은 **미확인** 상태예요.
미확인 항목은 AI가 지어내지 않고 "구청 확인 필요"로 답하도록 되어 있습니다.
