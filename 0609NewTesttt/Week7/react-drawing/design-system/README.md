# 여덟 시 반 디자인 시스템

실사진 망고 빙수 포스터(`../index-photo.html`)에서 추출한 **CDN 기반 컴포넌트 라이브러리**입니다.
빌드 도구 없이, 각 컴포넌트를 `.js` 파일로 나눠 `window.DS` 네임스페이스에 등록하는 방식이라
이 폴더째 복사해 다른 포스터/페이지에서 바로 재사용할 수 있습니다.

원본의 하드코딩된 텍스트("망고 빙수", "₩12,900" 등)는 전부 props로 빼서
다른 메뉴/제품에도 그대로 쓸 수 있게 일반화했습니다.

---

## 폴더 구조

```
design-system/
  tokens.js                # 색상 팔레트, 폰트, 그림자/반경, 애니메이션 토큰 (window.DS.tokens)
  components/
    Badge.js               # 알약형 라벨
    PhotoFrame.js          # 로딩/에러 상태가 있는 사진 프레임 (sheen 광택 + 비네트 + 코너 라벨 + 캡션)
    FloatingDeco.js        # 떠다니는 이모지 데코
    PosterShell.js         # 그라데이션 배경 카드 셸 + 배경 블롭 (children으로 내부 조합)
    PosterTitle.js         # 2단 타이틀 (메인 + 영문 서브)
    InfoBar.js             # 하단 가격/설명 정보 바
  index.html               # 🎨 디자인 시스템 쇼케이스(문서) 페이지
  screenshots/showcase.png # 쇼케이스 렌더링 스크린샷
  README.md                # 이 문서
```

---

## 로컬 서버로 열어야 하는 이유 (필수)

각 컴포넌트를 `<script type="text/babel" src="...">`로 **외부 파일**에서 로드합니다.
`file://`로 열면 브라우저가 CORS 정책으로 이 외부 스크립트 로드를 막아 **빈 화면**이 됩니다.
반드시 로컬 HTTP 서버로 서빙하세요.

또한 쇼케이스는 실사진을 `../photos/mango-bingsu-real.jpg`(한 단계 위 폴더)에서 참조하므로,
**`react-drawing/` 폴더(= 이 폴더의 부모)에서 서버를 띄우고** `/design-system/index.html`로 접속해야
사진까지 정상 로드됩니다.

```bash
# react-drawing 폴더(이 폴더의 부모)에서 실행
cd /path/to/react-drawing
python3 -m http.server 8000

# 브라우저에서 열기
# http://localhost:8000/design-system/index.html
```

> design-system 폴더 안에서 서버를 띄우면 `../photos`가 서버 루트를 벗어나 사진이 404가 됩니다.
> 사진 없이 컴포넌트 구조만 볼 거라면 design-system 안에서 띄워도 되지만, 사진 예시는 깨집니다.

---

## 새 포스터에서 재사용하는 방법

1. `design-system/` 폴더를 새 프로젝트로 복사합니다.
2. 새 HTML의 `<head>`에 **원본과 동일한 CDN + 폰트 + 애니메이션 CSS**를 넣습니다.
   - React 18.3.1 / react-dom 18.3.1 / **@babel/standalone@7.26.4 (v7 고정 — v8이면 빈 화면)**
   - Google Fonts: Black Han Sans / Gowun Dodum / Jua
   - `sheen` · `floaty` · `floaty-slow` keyframe (index.html의 `<style>` 참고)
   - `.font-title` / `.font-point` / `.font-body` 클래스 정의
3. `<body>` 안에서 **로드 순서**를 지켜 스크립트를 넣습니다.
   순서 = 실행 순서이고, 앱 스크립트가 마지막이어야 `window.DS`를 모두 볼 수 있습니다.
   **모든 babel 스크립트에 `data-presets="react"`를 붙이세요.**

```html
<!-- 1) 토큰 → 2) 컴포넌트 → 3) 앱(인라인, 마지막) -->
<script type="text/babel" data-presets="react" src="tokens.js"></script>
<script type="text/babel" data-presets="react" src="components/Badge.js"></script>
<script type="text/babel" data-presets="react" src="components/PhotoFrame.js"></script>
<script type="text/babel" data-presets="react" src="components/FloatingDeco.js"></script>
<script type="text/babel" data-presets="react" src="components/PosterShell.js"></script>
<script type="text/babel" data-presets="react" src="components/PosterTitle.js"></script>
<script type="text/babel" data-presets="react" src="components/InfoBar.js"></script>

<script type="text/babel" data-presets="react">
  const { Badge, PosterShell, PosterTitle, PhotoFrame, InfoBar } = window.DS;

  function DeserticaPoster() {
    return (
      <PosterShell>
        <Badge>SUMMER LIMITED · 여름 한정</Badge>
        <PosterTitle main="딸기 라떼" sub="STRAWBERRY LATTE" className="mt-4" />
        <div className="w-full mt-4 mb-1">
          <PhotoFrame src="photos/strawberry.jpg" alt="딸기 라떼"
                      cornerLabel="🍓 REAL PHOTO" caption="45° food photography" />
        </div>
        <InfoBar className="mt-6"
          lines={['국산 딸기 · 생우유', '휘핑 추가 가능']}
          price="₩6,500" priceNote="ICE only" />
      </PosterShell>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<DeserticaPoster />);
</script>
```

> ⚠️ 인라인 스크립트 안의 코드 예시에 `</script>` 문자열을 그대로 넣으면
> HTML 파서가 스크립트를 조기 종료합니다. 문자열로 보여줄 때는 `<\/script>`로 이스케이프하세요.

---

## 컴포넌트 API 요약

| 컴포넌트 | 주요 props | 설명 |
|---|---|---|
| `Badge` | `children`, `className` | 알약형 라벨 |
| `PosterTitle` | `main`, `sub`, `className` | 2단 타이틀 (한글 메인 + 영문 서브) |
| `InfoBar` | `lines[]`, `price`, `priceNote`, `className` | 좌측 설명 + 우측 가격 바 |
| `PhotoFrame` | `src`, `alt`, `cornerLabel`, `caption`, `className` | 로딩/에러 상태 있는 사진 프레임 |
| `FloatingDeco` | `items[{emoji, className}]` | 떠다니는 이모지 데코 (기본 3종) |
| `PosterShell` | `children`, `deco`, `className` | 그라데이션 배경 셸 + 배경 블롭 + FloatingDeco |
| `tokens` | — | `colors` / `fonts` / `radius` / `shadows` / `animations` |

전체 예시와 색상/타이포 레퍼런스는 `index.html` 쇼케이스 페이지에서 확인하세요.
