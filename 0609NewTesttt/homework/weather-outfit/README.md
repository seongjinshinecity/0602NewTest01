# 🧥 날씨 옷차림 추천 API

위치를 보내면 **서버가 외부 날씨 API(OpenWeatherMap)를 대신 호출**하고, 받아온 날씨를 분석해 오늘에 맞는 옷차림을 JSON으로 추천하는 3파일 서버 앱입니다. 프론트엔드는 API 키를 절대 보지 않습니다.

## 실행

```bash
npm install
npm start          # http://localhost:3000
```

`.env`에 키를 넣으면 실제 날씨로, **비워두면 목(mock) 데이터로** 동작합니다.

```bash
cp .env.example .env   # 그리고 OWM_API_KEYS 입력 (선택)
```

- **키 교대(round-robin) + 폴오버**: `OWM_API_KEYS`에 콤마로 여러 키를 넣으면 요청마다 키를 번갈아 쓰고, 어떤 키가 401/429를 내면 자동으로 다음 키로 넘어갑니다. 응답의 `keyUsed`로 몇 번째 키가 쓰였는지 확인할 수 있습니다.
- **기본 위치**: 좌표/도시 입력이 없으면 항상 `DEFAULT_CITY`(기본 서울)로 추천합니다. 프론트엔드는 로드 시 서울을 자동 표시하고, 입력창에서 다른 도시로 바꿀 수 있습니다.
- **디자인**: index.html은 흑백 스크린톤·집중선·말풍선·만화 폰트(Black Han Sans / Gamja Flower / Bangers)를 쓴 일본 만화 스타일입니다.

## API

### `POST /recommend`  ·  `GET /recommend`

요청(body 또는 query) — 좌표 우선, 없으면 도시명:

```json
{ "lat": 37.56, "lon": 126.97 }   // 또는 { "city": "Seoul" }
```

```bash
curl -X POST localhost:3000/recommend -H 'Content-Type: application/json' -d '{"city":"Seoul"}'
curl "localhost:3000/recommend?lat=37.56&lon=126.97"
```

응답:

```json
{
  "success": true,
  "mocked": true,
  "data": {
    "weather": { "city": "서울", "temp": 14, "feelsLike": 12, "condition": "Rain", "windSpeed": 5.1, "pop": 70, "...": "..." },
    "recommendation": {
      "tempRange": "12℃ ~ 16℃",
      "outfit": ["자켓", "가디건", "청자켓", "셔츠", "맨투맨", "긴바지"],
      "extraItems": ["우산", "레인부츠"],
      "comments": ["활동하기 좋은 선선한 날씨예요.", "비 소식이 있어요. 우산을 꼭 챙기세요.", "바람이 강하게(5.1m/s) 불어 ..."]
    }
  }
}
```

## 추천 로직 (server.js)

- **기온별 기준** — `OUTFIT_TABLE` 매핑 테이블로 분리 (4℃ 이하 ~ 28℃ 이상 8단계).
- **추가 조건** — `buildExtras()`:
  - 비/눈 또는 강수확률 ≥ 60% → `우산`·`레인부츠`(눈은 `방수 부츠`) 추가
  - 풍속 ≥ 4m/s → "체감 온도 낮음, 겉옷 필수" 코멘트
  - 체감 온도가 실제보다 3℃ 이상 낮으면 한 겹 더 안내
- **파싱 흐름** — `fetchWeather()` → `parseWeather()`(외부 raw JSON → 평탄한 객체) → `buildRecommendation()`.

## 파일 구성

| 파일 | 역할 |
|------|------|
| `server.js` | Express 서버 · 외부 날씨 API 프록시 · 추천 로직 |
| `index.html` | UI |
| `client.js` | 위치 전송 + 결과 렌더링 |
