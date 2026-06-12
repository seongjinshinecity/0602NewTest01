// AI 별명 생성기 — 클라이언트 로직
// 1) 흐르는 제너러티브 리본 배경 애니메이션
// 2) 폼 제출 → /api/nicknames 호출 → 카드 렌더링
// 3) 카드 선택 / 복사 인터랙션

(function () {
  'use strict';

  /* ───────────────────────── 1. 리본 배경 ───────────────────────── */
  const canvas = document.getElementById('ribbons');
  const ctx = canvas.getContext('2d');
  const COLORS = ['#1fb6ff', '#2a3bff', '#ff3da6', '#ffcf2d', '#b6ff3d', '#12121a'];
  let W, H, dpr, ribbons, t = 0;
  let reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildRibbons();
  }

  // 화면을 가로지르며 흐르는 리본 다발.
  // 가닥 수를 뷰포트 높이에 비례시키고 세로 전체(+오버스캔)에 분포시켜
  // 어떤 화면 비율에서도 빈 곳 없이 꽉 차게 한다.
  function buildRibbons() {
    ribbons = [];
    const count = Math.round(Math.max(44, Math.min(104, H / 11)));
    for (let i = 0; i < count; i++) {
      ribbons.push({
        color: COLORS[i % COLORS.length],
        pos: i / (count - 1),                 // 0~1 정규화 세로 위치 (그릴 때 H에 곱함)
        amp: 0.04 + Math.random() * 0.11,     // 화면 높이 대비 흔들림 비율
        speed: 0.15 + Math.random() * 0.35,   // 흐르는 속도
        phase: Math.random() * Math.PI * 2,
        width: 0.8 + Math.random() * 1.8,
        alpha: 0.3 + Math.random() * 0.4,
        skew: (Math.random() - 0.5) * 0.45,   // 가닥별 대각 기울기 변주
        // 제어점(베지어 허리)을 화면 가운데 30~50% 폭 안에 모은다.
        // band = 0.3~0.5 → 가닥마다 중앙 기준 ±band/2 범위에 분포 → 중앙으로 수렴.
        cx1: 0.5 + (Math.random() - 0.5) * (0.3 + Math.random() * 0.2),
        cx2: 0.5 + (Math.random() - 0.5) * (0.3 + Math.random() * 0.2),
      });
    }
  }

  // 하나의 리본을 화면 좌우 전폭(가장자리 밖까지)에 걸쳐 베지어 흐름으로 그린다.
  function drawRibbon(r) {
    const over = H * 0.3;                                 // 위아래 오버스캔 → 세로 가장자리까지 채움
    const baseY = -over + r.pos * (H + 2 * over);         // 세로 전체에 분포
    const sway = Math.sin(t * r.speed + r.phase) * H * r.amp;
    const sway2 = Math.cos(t * r.speed * 0.8 + r.phase) * H * r.amp;

    const originX = W + 80;                               // 오른쪽 화면 밖에서 시작
    const endX = -80;                                     // 왼쪽 화면 밖으로 빠져나감
    const originY = baseY + sway;
    const endY = baseY + r.skew * H + sway2;

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.bezierCurveTo(
      W * r.cx1, baseY + sway * 1.3,                      // 제어점 가로 위치를 가닥마다 다르게
      W * r.cx2, baseY + r.skew * H * 0.6 + sway2 * 1.2,
      endX, endY
    );
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = r.alpha;
    ctx.lineWidth = r.width;
    ctx.stroke();
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    for (const r of ribbons) drawRibbon(r);
    ctx.globalAlpha = 1;
    t += 0.016;
    requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    for (const r of ribbons) drawRibbon(r);
    ctx.globalAlpha = 1;
  }

  window.addEventListener('resize', resize);
  resize();
  if (reduce) drawStatic();
  else requestAnimationFrame(frame);

  /* ───────────────────────── 2. 토스트 ───────────────────────── */
  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  /* ───────────────────────── 3. 폼 / API ───────────────────────── */
  const form = document.getElementById('form');
  const btn = document.getElementById('genBtn');
  const label = document.getElementById('genLabel');
  const output = document.getElementById('output');
  const countEl = document.getElementById('count');
  const ACCENTS = ['#2a3bff', '#ff3da6', '#1fb6ff'];

  function setLoading(on) {
    btn.disabled = on;
    label.innerHTML = on
      ? '별명 짓는 중 <span class="dots"><i></i><i></i><i></i></span>'
      : '별명 만들기 ✨';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function renderError(msg) {
    countEl.textContent = '';
    output.innerHTML = `<div class="error-box">⚠️ ${escapeHtml(msg)}</div>`;
  }

  function renderNicknames(list) {
    countEl.textContent = `${list.length}개 생성됨`;
    output.innerHTML = '';
    list.forEach((n, i) => {
      const accent = ACCENTS[i % ACCENTS.length];
      const card = document.createElement('article');
      card.className = 'nick';
      card.style.setProperty('--accent', accent);
      card.innerHTML = `
        <div class="top">
          <div class="badge">${escapeHtml(n.emoji || '✨')}</div>
          <div class="name">${escapeHtml(n.nickname)}</div>
        </div>
        ${n.reason ? `<p class="reason">${escapeHtml(n.reason)}</p>` : ''}
        <div class="actions">
          <button class="copy" type="button">복사하기</button>
        </div>
      `;

      // 카드 클릭 = 선택 토글 (하나만 선택)
      card.addEventListener('click', () => {
        const already = card.classList.contains('selected');
        document.querySelectorAll('.nick.selected').forEach((el) => el.classList.remove('selected'));
        if (!already) {
          card.classList.add('selected');
          toast(`'${n.nickname}' 선택! ⭐`);
        }
      });

      // 복사 버튼 (카드 선택과 분리)
      const copyBtn = card.querySelector('.copy');
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(n.nickname);
        } catch (_) {
          // 클립보드 권한 실패 시 폴백
          const ta = document.createElement('textarea');
          ta.value = n.nickname;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch (__) {}
          document.body.removeChild(ta);
        }
        copyBtn.textContent = '복사됨 ✓';
        copyBtn.classList.add('copied');
        toast(`'${n.nickname}' 복사 완료 📋`);
        setTimeout(() => {
          copyBtn.textContent = '복사하기';
          copyBtn.classList.remove('copied');
        }, 1400);
      });

      output.appendChild(card);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const birthday = document.getElementById('birthday').value.trim();
    const dream = document.getElementById('dream').value.trim();

    if (!name || !birthday || !dream) {
      toast('이름 · 생일 · 꿈을 모두 입력해 주세요!');
      return;
    }

    setLoading(true);
    countEl.textContent = '';
    output.innerHTML = '<div class="placeholder">AI가 당신만의 별명을 고민하는 중… 🤔</div>';

    try {
      const res = await fetch('/api/nicknames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, birthday, dream }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        renderError(json.message || '별명 생성에 실패했어요.');
      } else {
        renderNicknames(json.data.nicknames);
      }
    } catch (err) {
      renderError('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  });
})();
