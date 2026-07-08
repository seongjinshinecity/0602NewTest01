# 🗣️ 모여라 — 커뮤니티 앱 (Auth + DB + CRUD)

로그인한 사용자만 글을 쓰고, **자기 글만** 수정/삭제하는 자유 커뮤니티. (5주차 배치1 — [Auth] 퀘스트)

## 스택
- **백엔드** Express + `pg` → Supabase Postgres
- **인증** 공용 `shared/auth.js` (bcrypt 해시 + HMAC 서명 세션 쿠키)
- **프론트** 단일 `public/index.html` (바닐라 JS SPA, 다크 테마)

> ⚠️ 가이드는 "Supabase Auth"를 권장하지만, 이 레포는 pg 로 Postgres 에 직접 붙는 패턴이라
> 동일 스택 유지를 위해 **앱 레벨 인증**으로 구현했다. 소유권(본인 글만 수정/삭제)은
> `user_id` 외래키 + SQL 조건으로 강제하므로 학습 목표(권한 분기)는 동일하게 충족한다.
> Supabase Auth/RLS 로 바꾸려면 `shared/auth.js` 한 파일만 교체하면 된다.

## 실행
```bash
cd Week5-2
npm install                 # 최초 1회 (루트 공용)
cp .env.example .env        # DATABASE_URL(Supabase) 채우기
npm run community           # → http://localhost:3001
```

## 기능 (미션 매핑)
- **회원가입 & 로그인** — `/api/auth/*`
- **게시글 CRUD** — 작성=로그인 사용자만 / 조회=누구나(작성자 표시) / 수정·삭제=본인 글만
- **목록** — 최신순(제목·작성자·시간), 클릭 시 본문 펼치기

## API
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/auth/register` `/login` `/logout` | - | 인증 |
| GET | `/api/auth/me` | - | 현재 로그인 정보 |
| GET | `/api/posts` | 공개 | 목록(최신순, 작성자명) |
| GET | `/api/posts/:id` | 공개 | 상세 |
| POST | `/api/posts` | 로그인 | 작성 `{title, content}` |
| PUT | `/api/posts/:id` | 본인만 | 수정 |
| DELETE | `/api/posts/:id` | 본인만 | 삭제 |

본인 글이 아닌 글을 수정/삭제하면 **403**을 반환한다.

## 스크린샷
`screenshots/` 참고 (가입→로그인→글쓰기→목록→본인글 수정/삭제).

## 다음 단계
Vercel 배포(서버리스 함수로 `server.js` 래핑) 후 타인 가입·작성 인증 시 올클리어(25pt).

> ⚠️ 로컬에서는 4개 앱이 쿠키를 공유해 한 번 로그인하면 통합 로그인처럼 동작한다(localhost가 포트를
> 구분하지 않는 쿠키 특성). 각각 다른 Vercel 도메인으로 배포하면 이 공유는 끊기므로, 앱마다
> 동일한 `SESSION_SECRET`·`DATABASE_URL` 을 환경변수로 넣고 쿠키에 `Secure` 속성을 더해야 한다.
