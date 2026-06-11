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

  // 화면 우측에서 흘러나와 좌하단으로 휘어지는 리본 다발 (책 표지 결을 차용)
  function buildRibbons() {
    ribbons = [];
    const count = W < 720 ? 26 : 46;
    for (let i = 0; i < count; i++) {
      ribbons.push({
        color: COLORS[i % COLORS.length],
        offset: (i / count) * 320 - 40,      // 다발 내 세로 위치
        amp: 60 + Math.random() * 120,       // 흔들림 폭
        speed: 0.15 + Math.random() * 0.35,  // 흐르는 속도
        phase: Math.random() * Math.PI * 2,
        width: 0.8 + Math.random() * 1.8,
        alpha: 0.35 + Math.random() * 0.4,
      });
    }
  }

  // 하나의 리본을 베지어 흐름으로 그린다.
  function drawRibbon(r) {
    const originX = W * 0.96;
    const originY = H * 0.16 + r.offset;
    const endX = -W * 0.12;
    const endY = H * 0.92 + r.offset * 0.4;

    const sway = Math.sin(t * r.speed + r.phase) * r.amp;
    const sway2 = Math.cos(t * r.speed * 0.7 + r.phase) * r.amp * 0.8;

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.bezierCurveTo(
      W * 0.62, originY + sway,
      W * 0.34 + sway2, H * 0.58 + r.offset * 0.6,
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
