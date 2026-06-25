# QUARTER — 카페 웹사이트 (단일 index.html)

QUARTER 카페 컨셉(블랙·스테인리스 메탈 미니멀 프리미엄) 기반 공식 웹사이트 UI.
CDN 기반 **React 18 + ReactDOM + Babel(v7) + Tailwind**, 빌드 도구 없이 단일 `index.html`.

## 실행
```bash
cd 04_웹사이트
python3 -m http.server 8000
# → http://localhost:8000/
```
> 구글맵 embed·CDN 때문에 `file://`로 직접 열기보다 로컬 서버 권장.
> (`npx serve .` / VS Code Live Server 도 가능)

## 페이지 (해시 라우팅)
| 라우트 | 페이지 | 내용 |
|---|---|---|
| `#/` | 홈 | Q 메탈 링 로고·슬로건 "시즌마다, 새로 짓다", 라디얼 글로우 히어로, 소개·CTA |
| `#/menu` | 메뉴 | 음료/디저트/시즌 한정 필터 + 카드 그리드, 프리미엄 가격·한정 배지 |
| `#/event` | 이벤트 | 시즌 전환·콜라보·신메뉴 타임라인 카드 |
| `#/reserve` | 예약 | 예약 신청 폼 + 게시판(추가/삭제), **localStorage 저장**(새로고침 유지) |
| `#/location` | 오시는 길 | 성수동 구글맵 embed, 주소·영업시간, 네이버 지도/길찾기 버튼 |

## 기능
- 예약 게시판: 이름·연락처·날짜·시간·인원·요청사항 → 게시판 등록 → localStorage 영속
- 외부 링크 아이콘(헤더+푸터): **네이버 지도 · 인스타그램 · 스레드** (인라인 SVG)
- 구글맵 iframe + 네이버 지도/길찾기 연결

## 디자인
- 다크 글래시 프리미엄: 글래스모피즘 카드, 시안/블루 액센트, 알약 라벨, 메탈 텍스트, 라디얼 글로우
- 컬러: Black #0A0A0B · Ink #14151A · Steel #6C7077 · Cyan #22C7C7 · Blue #3B82F6
- 한국어 웹폰트(Pretendard), 반응형

## 파일
- `index.html` — 앱 본체 (단일 파일)
- `command-input.txt` — 생성에 쓴 요구사항
- `screenshots/` — 페이지별 미리보기 (home·menu·event·reserve·location)

![홈](screenshots/home.png)
![메뉴](screenshots/menu.png)
![이벤트](screenshots/event.png)
![예약](screenshots/reserve.png)
![오시는 길](screenshots/location.png)
