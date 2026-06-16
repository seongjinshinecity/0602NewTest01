// 프론트엔드 로직 — 위치를 서버 /recommend 로 보내고 결과를 그린다.
// 외부 날씨 API나 키는 전혀 다루지 않는다(전부 서버가 처리).

const $ = (sel) => document.querySelector(sel);

const els = {
  city: $('#city'),
  geoBtn: $('#geoBtn'),
  submitBtn: $('#submitBtn'),
  status: $('#status'),
  result: $('#result'),
};

// 추천 요청 — { lat, lon } 또는 { city } 를 POST
async function requestRecommend(payload) {
  setStatus('날씨를 확인하고 옷차림을 고르는 중...', 'loading');
  els.result.innerHTML = '';
  try {
    const res = await fetch('/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || '요청 실패');
    render(json.data, json.mocked);
    setStatus('', '');
  } catch (err) {
    setStatus(`오류: ${err.message}`, 'error');
  }
}

function setStatus(text, kind) {
  els.status.textContent = text;
  els.status.className = `status ${kind}`;
}

function render(data, mocked) {
  const w = data.weather;
  const r = data.recommendation;

  const chips = (arr) => arr.map((x) => `<span class="chip">${x}</span>`).join('');
  const extras = r.extraItems.length
    ? `<div class="block"><h3>🎒 추가로 챙기세요</h3><div class="chips">${chips(r.extraItems)}</div></div>`
    : '';

  els.result.innerHTML = `
    ${mocked ? '<div class="mock-badge">목(mock) 데이터로 표시 중 — 서버에 OWM_API_KEY를 넣으면 실제 날씨로 동작합니다.</div>' : ''}
    <div class="weather-head">
      ${w.icon ? `<img src="https://openweathermap.org/img/wn/${w.icon}@2x.png" alt="">` : ''}
      <div>
        <div class="temp">${w.temp}℃ <span class="feels">체감 ${w.feelsLike ?? '-'}℃</span></div>
        <div class="desc">${w.city} · ${w.description || w.condition} · 💨 ${w.windSpeed}m/s · ☔ ${w.pop}%</div>
      </div>
    </div>
    <div class="block">
      <h3>👕 추천 옷차림 <span class="range">(${r.tempRange})</span></h3>
      <div class="chips">${chips(r.outfit)}</div>
    </div>
    ${extras}
    <div class="block comments">
      ${r.comments.map((c) => `<p>💬 ${c}</p>`).join('')}
    </div>
  `;
}

// 현재 위치(브라우저 Geolocation) → 좌표로 요청
els.geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    setStatus('이 브라우저는 위치 정보를 지원하지 않아요. 도시명을 입력해 주세요.', 'error');
    return;
  }
  setStatus('현재 위치를 확인하는 중...', 'loading');
  navigator.geolocation.getCurrentPosition(
    (pos) => requestRecommend({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
    () => setStatus('위치 권한이 거부됐어요. 도시명을 입력해 주세요.', 'error'),
  );
});

// 도시명으로 요청
els.submitBtn.addEventListener('click', () => {
  const city = els.city.value.trim();
  if (!city) {
    setStatus('도시명을 입력하거나 "현재 위치" 버튼을 눌러주세요.', 'error');
    return;
  }
  requestRecommend({ city });
});

els.city.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.submitBtn.click();
});

// 페이지 로드 시: 위치를 항상 서울로 기본 설정하고 자동으로 추천을 받아온다.
// (사용자는 입력창을 고쳐 다른 위치로 다시 검색할 수 있다)
window.addEventListener('DOMContentLoaded', () => {
  els.city.value = 'Seoul';
  requestRecommend({ city: 'Seoul' });
});
