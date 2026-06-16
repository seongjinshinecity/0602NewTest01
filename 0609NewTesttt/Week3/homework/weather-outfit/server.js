// 날씨 기반 옷차림 추천 서버
// ─────────────────────────────────────────────────────────────────────────
// 흐름:  클라이언트(위치) → 이 서버 → 외부 날씨 API(OpenWeatherMap) 대신 호출
//        → 응답 파싱 → 기온/강수/풍속 분석 → 옷차림 추천 JSON 반환
//
// 프론트엔드(index.html / client.js)는 외부 API 키를 절대 보지 않습니다.
// 키는 이 서버에서만 사용되고, API 키가 없으면 자동으로 "목(mock) 데이터"로 동작합니다.

const express = require('express');
const path = require('path');
const fs = require('fs');

// 로컬 개발용 .env 로더 — 의존성 없이 동작.
// (Vercel 등 배포 환경에서는 .env가 없고 대시보드 환경변수를 사용하므로 조용히 건너뜀)
(function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      const val = m[2].replace(/^["']|["']$/g, '');
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch (_) { /* .env 없으면 무시 */ }
})();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── 설정 ──────────────────────────────────────────────────────────────────
// OpenWeatherMap API 키 목록. 콤마(,)로 여러 개 지정하면 "교대(round-robin)"로 사용하고,
// 어떤 키가 401/429를 내면 자동으로 다음 키로 폴오버합니다.
// (구버전 호환: OWM_API_KEY 단일 값도 그대로 인식)
const OWM_API_KEYS = (process.env.OWM_API_KEYS || process.env.OWM_API_KEY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const OWM_URL = 'https://api.openweathermap.org/data/2.5/weather';

// 기본 위치 — 좌표/도시 입력이 전혀 없으면 항상 이 도시를 사용
const DEFAULT_CITY = (process.env.DEFAULT_CITY || 'Seoul').trim();

// OpenWeatherMap은 한국어 도시명을 인식하지 못하므로(404), 자주 쓰는 한글명을
// OWM이 알아듣는 "영문명,국가코드" 로 변환한다. (지도에 없으면 입력값 그대로 시도)
const KOREAN_CITY_MAP = {
  서울: 'Seoul,KR', 부산: 'Busan,KR', 인천: 'Incheon,KR', 대구: 'Daegu,KR',
  대전: 'Daejeon,KR', 광주: 'Gwangju,KR', 울산: 'Ulsan,KR', 세종: 'Sejong,KR',
  수원: 'Suwon,KR', 성남: 'Seongnam,KR', 고양: 'Goyang,KR', 용인: 'Yongin,KR',
  창원: 'Changwon,KR', 청주: 'Cheongju,KR', 전주: 'Jeonju,KR', 천안: 'Cheonan,KR',
  제주: 'Jeju,KR', 강릉: 'Gangneung,KR', 춘천: 'Chuncheon,KR', 포항: 'Pohang,KR',
  도쿄: 'Tokyo,JP', 오사카: 'Osaka,JP', 삿포로: 'Sapporo,JP', 후쿠오카: 'Fukuoka,JP',
  베이징: 'Beijing,CN', 상하이: 'Shanghai,CN', 홍콩: 'Hong Kong,HK', 타이베이: 'Taipei,TW',
  방콕: 'Bangkok,TH', 싱가포르: 'Singapore,SG', 뉴욕: 'New York,US', 로스앤젤레스: 'Los Angeles,US',
  런던: 'London,GB', 파리: 'Paris,FR', 베를린: 'Berlin,DE', 시드니: 'Sydney,AU',
};

// 입력 도시명을 OWM이 알아듣는 형태로 정규화
function normalizeCity(city) {
  const key = city.replace(/\s+/g, '');
  return KOREAN_CITY_MAP[key] || city;
}

// 교대 사용을 위한 커서. 성공할 때마다 다음 키로 한 칸 이동한다.
let keyCursor = 0;

// ═══════════════════════════════════════════════════════════════════════════
// 1) 옷차림 추천 "서비스 로직" — 기온별 기준을 매핑 테이블로 분리
// ═══════════════════════════════════════════════════════════════════════════
// 각 구간은 [최저, 최고] 기온(℃)과 추천 의상/한 줄 코멘트를 가집니다.
// max 가 Infinity 인 마지막 구간이 "28℃ 이상"을 담당합니다.
const OUTFIT_TABLE = [
  { min: -Infinity, max: 4,        label: '4℃ 이하',     items: ['패딩', '두꺼운 코트', '목도리', '기모 제품'],                   comment: '매우 추워요. 단단히 껴입으세요.' },
  { min: 5,         max: 8,        label: '5℃ ~ 8℃',     items: ['코트', '가죽 자켓', '히트텍', '니트', '레깅스'],                comment: '쌀쌀하니 보온에 신경 쓰세요.' },
  { min: 9,         max: 11,       label: '9℃ ~ 11℃',    items: ['자켓', '트렌치코트', '야상', '니트', '청바지'],                 comment: '겉옷이 필요한 날씨예요.' },
  { min: 12,        max: 16,       label: '12℃ ~ 16℃',   items: ['자켓', '가디건', '청자켓', '셔츠', '맨투맨', '긴바지'],         comment: '활동하기 좋은 선선한 날씨예요.' },
  { min: 17,        max: 19,       label: '17℃ ~ 19℃',   items: ['얇은 가디건', '셔츠', '맨투맨', '후드티', '긴바지'],            comment: '아침저녁으로 살짝 쌀쌀할 수 있어요.' },
  { min: 20,        max: 22,       label: '20℃ ~ 22℃',   items: ['블라우스', '긴팔 티셔츠', '면바지', '슬랙스'],                  comment: '딱 좋은 봄가을 날씨예요.' },
  { min: 23,        max: 27,       label: '23℃ ~ 27℃',   items: ['반팔 티셔츠', '얇은 셔츠', '반바지', '면바지'],                 comment: '가볍게 입어도 좋은 따뜻한 날씨예요.' },
  { min: 28,        max: Infinity, label: '28℃ 이상',     items: ['민소매', '반팔', '반바지', '린넨 옷'],                          comment: '무더워요. 시원하고 통풍 잘 되는 옷을 추천해요.' },
];

// 기온(℃)을 받아 해당 구간을 반환
function pickOutfitByTemp(temp) {
  return OUTFIT_TABLE.find((r) => temp >= r.min && temp <= r.max) || OUTFIT_TABLE[OUTFIT_TABLE.length - 1];
}

// ═══════════════════════════════════════════════════════════════════════════
// 2) "추가 조건" 로직 — 강수 / 바람 등 기온 외 변수를 반영
// ═══════════════════════════════════════════════════════════════════════════
const WIND_STRONG_MS = 4; // 이 풍속(m/s) 이상이면 "바람 강함"으로 판단

// 파싱된 날씨 데이터를 받아 추가 추천 아이템/코멘트 배열을 만든다.
function buildExtras(weather) {
  const extraItems = [];   // 추가로 챙길 물건
  const comments = [];     // 안내 코멘트

  // (1) 강수 — 비/눈 여부 또는 강수 확률
  if (weather.isSnow) {
    extraItems.push('방수 부츠', '두꺼운 장갑');
    comments.push('눈이 와요. 미끄럼 방지 신발과 방한용품을 챙기세요.');
  } else if (weather.isRain) {
    extraItems.push('우산', '레인부츠');
    comments.push('비 소식이 있어요. 우산을 꼭 챙기세요.');
  } else if (weather.pop >= 60) {
    // pop(precipitation probability) = 강수 확률(%)
    extraItems.push('우산');
    comments.push(`강수 확률이 ${weather.pop}%로 높아요. 우산을 챙기는 게 좋겠어요.`);
  }

  // (2) 바람 — 풍속이 강하면 체감 온도가 낮아짐
  if (weather.windSpeed >= WIND_STRONG_MS) {
    comments.push(`바람이 강하게(${weather.windSpeed}m/s) 불어 체감 온도가 낮아요. 겉옷은 필수예요.`);
  }

  // (3) 체감 온도가 실제 기온보다 많이 낮을 때
  if (weather.feelsLike != null && weather.temp - weather.feelsLike >= 3) {
    comments.push(`실제 ${weather.temp}℃지만 체감은 ${weather.feelsLike}℃예요. 한 겹 더 챙기세요.`);
  }

  return { extraItems, comments };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3) 외부 날씨 API 호출 + 파싱
// ═══════════════════════════════════════════════════════════════════════════

// 가상의 외부 날씨 API(OpenWeatherMap 형식) Response 예시 — 키가 없을 때 사용.
// 실제 API 응답 구조를 그대로 본떠, 파싱 흐름을 동일하게 검증할 수 있게 함.
function getMockOwmResponse() {
  return {
    coord: { lon: 126.9778, lat: 37.5683 },
    weather: [{ id: 500, main: 'Rain', description: '약한 비', icon: '10d' }],
    main: { temp: 14.3, feels_like: 11.8, humidity: 78, temp_min: 13.1, temp_max: 15.6 },
    wind: { speed: 5.1, deg: 250 },
    rain: { '1h': 0.8 },
    pop: 0.7, // 강수 확률(0~1) — 일부 엔드포인트(forecast)에서 제공
    clouds: { all: 90 },
    dt: 1718000000,
    name: '서울',
  };
}

// 외부 API의 raw JSON → 우리 서비스가 쓰기 좋은 평탄한 객체로 변환(파싱)
function parseWeather(raw) {
  const w = (raw.weather && raw.weather[0]) || {};
  const main = (w.main || '').toLowerCase(); // rain / snow / clouds / clear ...
  return {
    city: raw.name || '알 수 없음',
    temp: Math.round(raw.main?.temp ?? 0),
    feelsLike: raw.main?.feels_like != null ? Math.round(raw.main.feels_like) : null,
    humidity: raw.main?.humidity ?? null,
    condition: w.main || 'Unknown',     // 영문 상태
    description: w.description || '',    // 한 줄 설명
    icon: w.icon || '',                  // 아이콘 코드(예: 10d)
    windSpeed: Number(raw.wind?.speed ?? 0),
    isRain: ['rain', 'drizzle', 'thunderstorm'].includes(main) || !!raw.rain,
    isSnow: main === 'snow' || !!raw.snow,
    pop: raw.pop != null ? Math.round(raw.pop * 100) : 0, // 강수 확률 % 로 환산
  };
}

// 위치를 받아 외부 API를 호출(키 없으면 목 데이터). 반환은 항상 parseWeather 결과.
// 여러 키를 교대로 쓰고, 401/429가 나면 다음 키로 자동 폴오버한다.
async function fetchWeather({ lat, lon, city }) {
  // 키가 하나도 없으면 외부 호출 없이 목 데이터로 동작 → 키 없이도 즉시 테스트 가능
  if (OWM_API_KEYS.length === 0) {
    return { weather: parseWeather(getMockOwmResponse()), mocked: true, keyUsed: null };
  }

  // 공통 쿼리 구성: 좌표 우선, 없으면 도시명
  const baseParams = new URLSearchParams({ units: 'metric', lang: 'kr' });
  if (lat != null && lon != null) {
    baseParams.set('lat', String(lat));
    baseParams.set('lon', String(lon));
  } else if (city) {
    baseParams.set('q', normalizeCity(city)); // 한글명 → 영문명,국가코드
  } else {
    throw new Error('위치 정보(lat/lon 또는 city)가 필요합니다.');
  }

  // 커서 위치부터 시작해, 키 개수만큼 순회하며 시도(교대 + 폴오버)
  const start = keyCursor;
  let lastErr = '';
  for (let n = 0; n < OWM_API_KEYS.length; n++) {
    const idx = (start + n) % OWM_API_KEYS.length;
    const params = new URLSearchParams(baseParams);
    params.set('appid', OWM_API_KEYS[idx]);

    const resp = await fetch(`${OWM_URL}?${params.toString()}`);
    if (resp.ok) {
      keyCursor = (idx + 1) % OWM_API_KEYS.length; // 다음 요청은 그 다음 키부터
      const raw = await resp.json();
      return { weather: parseWeather(raw), mocked: false, keyUsed: idx + 1 };
    }
    // 인증 실패/레이트리밋은 다른 키로 폴오버
    if (resp.status === 401 || resp.status === 429) {
      lastErr = `key#${idx + 1} → HTTP ${resp.status}`;
      continue;
    }
    // 위치를 못 찾은 경우(404)는 키를 바꿔도 무의미 → 친절한 안내로 변환
    if (resp.status === 404) {
      throw new Error(`'${city}' 위치를 찾을 수 없어요. 영문 도시명(예: Seoul, Tokyo)으로 입력해 보세요.`);
    }
    // 그 외 오류는 즉시 보고
    const text = await resp.text().catch(() => '');
    throw new Error(`외부 날씨 API 오류 (${resp.status}): ${text.slice(0, 200)}`);
  }
  throw new Error(`모든 API 키 사용 실패 (${lastErr}). 키 활성화/유효성을 확인하세요.`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4) 최종 추천 조립 — 기온 추천 + 추가 조건을 합쳐 응답 형태로
// ═══════════════════════════════════════════════════════════════════════════
function buildRecommendation(weather) {
  const base = pickOutfitByTemp(weather.temp);
  const extras = buildExtras(weather);

  return {
    weather: {
      city: weather.city,
      temp: weather.temp,
      feelsLike: weather.feelsLike,
      humidity: weather.humidity,
      condition: weather.condition,
      description: weather.description,
      icon: weather.icon,
      windSpeed: weather.windSpeed,
      pop: weather.pop,
    },
    recommendation: {
      tempRange: base.label,                 // 어떤 기온 구간인지
      outfit: base.items,                    // 기온 기준 추천 의상
      extraItems: extras.extraItems,         // 강수/바람 등으로 추가된 물건
      comments: [base.comment, ...extras.comments], // 안내 코멘트 모음
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5) API 라우트
// ═══════════════════════════════════════════════════════════════════════════

// 추천 처리 공통 핸들러 (GET 쿼리 / POST 바디 모두 지원)
async function handleRecommend(input, res) {
  try {
    const lat = input.lat != null && input.lat !== '' ? Number(input.lat) : null;
    const lon = input.lon != null && input.lon !== '' ? Number(input.lon) : null;
    let city = input.city ? String(input.city).trim() : null;

    // 좌표도 도시도 없으면 항상 기본 위치(서울)로
    if (lat == null && lon == null && !city) city = DEFAULT_CITY;

    const { weather, mocked, keyUsed } = await fetchWeather({ lat, lon, city });
    const result = buildRecommendation(weather);

    res.json({ success: true, mocked, keyUsed, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || '추천 처리 중 오류가 발생했습니다.' });
  }
}

// POST /recommend  — body: { lat, lon } 또는 { city }
app.post('/recommend', (req, res) => handleRecommend(req.body || {}, res));

// GET /recommend?lat=..&lon=..  또는  ?city=Seoul  — 브라우저에서 바로 테스트하기 편함
app.get('/recommend', (req, res) => handleRecommend(req.query || {}, res));

// 헬스체크 — 등록된 키 개수와 기본 위치를 함께 알려준다
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    mocked: OWM_API_KEYS.length === 0,
    keyCount: OWM_API_KEYS.length,
    defaultCity: DEFAULT_CITY,
    message: 'ok',
  });
});

// SPA fallback (Express 4/5 모두 호환) — API 외 경로는 index.html 반환
app.get(/^(?!\/recommend|\/api).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Local: 서버 시작 / Vercel: app export
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🧥 날씨 옷차림 추천 서버 실행 중 → http://localhost:${PORT}`);
    console.log(
      OWM_API_KEYS.length
        ? `   (OpenWeatherMap 실제 API · 키 ${OWM_API_KEYS.length}개 교대 사용 · 기본 위치: ${DEFAULT_CITY})`
        : '   (API 키 없음 → 목 데이터로 동작)',
    );
  });
}
module.exports = app;
