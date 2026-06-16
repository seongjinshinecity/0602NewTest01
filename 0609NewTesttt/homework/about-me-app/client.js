// client.js — about-me 포트폴리오 프런트엔드
//   /api/profile 로 about-me2.md 를 받아 렌더링하고,
//   /api/ask 로 근거 기반 Q&A 를 호출한다.

const SAMPLE_QUESTIONS = [
  '어떤 꿈을 꾸던 사람이야?',
  '직업이 뭐야?',
  '취미가 뭐야?',
  '좋아하는 색은?',
  '혈액형이 뭐야?', // 문서에 없음 → "모릅니다" 시연
];

// ── 프로필 로드 & 렌더 ──────────────────────────────
async function loadProfile() {
  const docEl = document.getElementById('doc');
  try {
    const res = await fetch('/api/profile');
    const json = await res.json();
    if (!json.success) throw new Error(json.message || '데이터 로드 실패');

    const md = json.data.markdown;

    // 본문 렌더
    docEl.innerHTML = marked.parse(md);

    // Hero 정보 추출 (문서 내용 그대로 사용)
    hydrateHero(md);
  } catch (err) {
    docEl.innerHTML =
      '<p style="color:#b04a3a">프로필을 불러오지 못했습니다: ' +
      err.message +
      '</p>';
  }
}

// 마크다운에서 크레도/기본정보 추출해 Hero 채우기
function hydrateHero(md) {
  const credoEl = document.getElementById('heroCredo');
  const metaEl = document.getElementById('heroMeta');

  // 크레도: *"..."* 형태의 따옴표 문장
  const credoMatch = md.match(/크레도[^:]*:\s*\*?["“](.+?)["”]\*?/);
  credoEl.textContent = credoMatch
    ? '“' + credoMatch[1] + '”'
    : '가장 완벽한 기술은 인간의 시선에서 출발한다.';

  // 기본정보 칩: 현재 신분 / 생년월일
  const chips = [];
  const role = md.match(/현재 신분[^:]*:\s*\**(.+)/);
  if (role) chips.push(role[1].replace(/\*/g, '').trim());
  const birth = md.match(/생년월일[^:]*:\s*\**(.+)/);
  if (birth) chips.push(birth[1].replace(/\*/g, '').trim());
  chips.push('Minimalism · Wood & White');

  metaEl.innerHTML = chips
    .map((c) => '<span class="chip">' + c + '</span>')
    .join('');
}

// ── Q&A ─────────────────────────────────────────────
const qInput = document.getElementById('q');
const askBtn = document.getElementById('askBtn');
const answerEl = document.getElementById('answer');

async function ask(question) {
  if (!question || !question.trim()) return;

  askBtn.disabled = true;
  answerEl.className = 'show';
  answerEl.innerHTML = '<span class="loading">생각하는 중…</span>';

  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || '요청 실패');

    const { answer, demo } = json.data;
    const label = demo ? '데모 모드' : 'about-mf';
    answerEl.innerHTML =
      '<span class="who">' + label + '</span>' + escapeHtml(answer);
  } catch (err) {
    answerEl.innerHTML =
      '<span class="who">오류</span>' + escapeHtml(err.message);
  } finally {
    askBtn.disabled = false;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 샘플 질문 칩 렌더
const samplesEl = document.getElementById('samples');
samplesEl.innerHTML = SAMPLE_QUESTIONS.map(
  (s) => '<button class="sample" type="button">' + s + '</button>'
).join('');
samplesEl.querySelectorAll('.sample').forEach((btn) => {
  btn.addEventListener('click', () => {
    qInput.value = btn.textContent;
    ask(btn.textContent);
  });
});

askBtn.addEventListener('click', () => ask(qInput.value));
qInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') ask(qInput.value);
});

// 시작
loadProfile();
