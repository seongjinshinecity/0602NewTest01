# 🥕 당근클론 — [Final] 당근마켓 클론 (7주차 퀘스트 6)

노션 원본: https://ruucm.notion.site/39d7eb4baa8c80e6b6bcf92e5ce3ba06

> 당근마켓 = **(1) 글쓰기 + (2) 이미지 업로드 + (3) 1:1 채팅**의 합성.
> 5~6주차 쇼핑몰(`Week6/shopping-mall-complete`)의 인증·DB·이미지 업로드 구조를 출발점으로 재사용했다.

## 🔗 배포 URL

**https://karrot-clone-taupe.vercel.app**

## 미션 매핑

| Part | 구현 |
|---|---|
| **1. 회원가입 & 로그인** | 이메일 가입(bcrypt+HMAC 세션 쿠키) + **동네 직접 입력**(`karrot_profiles`) |
| **2. 상품 등록** | 이미지 **최대 3장**(클라이언트 리사이즈 → base64 → ImageKit CDN) + 제목·가격·설명·카테고리. **본인만 수정/삭제** (`WHERE user_id = 세션 사용자` SQL 조건으로 소유권 강제) |
| **3. 목록 & 상세** | 최신순 목록 + 카테고리 칩 필터 + 키워드 검색(제목·설명 ILIKE). 상세: 이미지 슬라이드(썸네일 전환), 판매자·동네, **관심(찜) 토글** |
| **4. 채팅 (1:1)** | 상품 상세 "채팅하기" → 구매자-판매자 채팅방(상품×구매자 UNIQUE). **3초 Polling**(`?after=<마지막 id>`)으로 주기적 DB 변화 체크. 내 상품 셀프 채팅 차단, 참여자 외 접근 403 |
| **5. 마이페이지** | 내 상품 / 관심 목록 / 채팅 목록 탭 |
| **6. 배포** | Vercel (Express 서버리스, `api/index.js` rewrite) |

## 핵심 구조

```
Auth     : mall_users (공용) + HMAC 세션 쿠키 — 누가 등록했는지/채팅하는지
DB       : karrot_products · karrot_product_images · karrot_favorites
           karrot_chats · karrot_messages · karrot_profiles (Supabase Postgres, Week6-1)
Storage  : ImageKit CDN (base64 업로드 → URL 저장) — 5주차 쇼핑몰 패턴 재사용
Realtime : Polling — GET /api/chats/:id/messages?after=<id> 3초 주기
```

- ※ 퀘스트 팁은 Supabase RLS를 권하지만, 이 레포는 pg 직결 패턴이라 **서버측 소유권 조건**(user_id 외래키 + SQL WHERE)으로 동일한 권한 분기를 강제했다 (`lib/auth.js` 주석 참고).

## 검증한 것 (curl + 브라우저 실사용)

- 비로그인 등록/채팅 → 401 · 타인 상품 수정/삭제 → 403 · 내 상품 셀프 채팅 → 400
- 이미지 3장 제한·1장 미만 거부·가격/제목 검증
- 구매자 ↔ 판매자 실제 채팅 왕복 (프로덕션에서 계정 2개로 시연)

## 실행 (로컬)

```bash
npm install
cp ../../Week6/shopping-mall-complete/.env .env   # DATABASE_URL + IMAGEKIT_* + SESSION_SECRET
npm start                                          # → http://localhost:3030
```

## 스크린샷 · 데모

- `screenshots/karrot-clone-demo.mp4` — **데모 영상 28초** (가입·동네설정 → 상품 등록(사진 업로드) → 로그인 전환 → 검색 → 관심 → 채팅 → 판매자 답장)
- `screenshots/chat-seller-view.jpg` — 판매자 시점 1:1 채팅 (양방향 메시지)
- `screenshots/agent-chat-karrot.png` — 에이전트 대화 스크린샷

## 남긴 것 (정직 고지)

- "본인 외 1명 가입 인증"은 데모 계정 2개(판매자 미도 / 금천구매자)로 시연한 것 — 실제 타인 인증 보너스를 받으려면 지인 1명에게 URL을 보내 가입·채팅 요청 필요
- 위치는 텍스트 입력(동네 이름) — GPS 인증은 보너스 범위라 제외
