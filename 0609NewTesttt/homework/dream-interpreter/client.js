// client.js — 프런트엔드 로직 (꿈 입력 → /api/dream-analysis 호출 → 결과 표시)
(function () {
  'use strict';

  // ─── DOM 참조 ───────────────────────────────
  const personaList = document.getElementById('persona-list');
  const dreamInput = document.getElementById('dream-input');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const errorMsg = document.getElementById('error-msg');
  const resultSection = document.getElementById('result-section');
  const resultCharacter = document.getElementById('result-character');
  const resultText = document.getElementById('result-text');
  const resultFortune = document.getElementById('result-fortune');
  const resultSummary = document.getElementById('result-summary');
  const resultKeywordsWrap = document.getElementById('result-keywords-wrap');
  const resultKeywords = document.getElementById('result-keywords');
  const resultAdviceWrap = document.getElementById('result-advice-wrap');
  const resultAdvice = document.getElementById('result-advice');

  // 길흉별 배지 스타일
  const FORTUNE_STYLE = {
    길몽: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200',
    흉몽: 'bg-rose-500/20 border-rose-400/50 text-rose-200',
    중립몽: 'bg-slate-500/20 border-slate-400/50 text-slate-200',
  };

  // 현재 선택된 해몽가 (기본값: 신비로운 점술가)
  let selectedPersona = 'mystic';

  // ─── 해몽가 카드 선택 처리 ──────────────────
  personaList.addEventListener('click', function (e) {
    const card = e.target.closest('.persona-card');
    if (!card) return;

    personaList.querySelectorAll('.persona-card').forEach(function (c) {
      c.classList.remove('active');
    });
    card.classList.add('active');
    selectedPersona = card.dataset.key;
  });

  // ─── 에러 표시 헬퍼 ─────────────────────────
  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.remove('hidden');
  }
  function clearError() {
    errorMsg.textContent = '';
    errorMsg.classList.add('hidden');
  }

  // ─── 로딩 상태 토글 ─────────────────────────
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    if (isLoading) {
      btnText.textContent = '🌙 무의식을 읽는 중...';
      btnSpinner.classList.remove('hidden');
    } else {
      btnText.textContent = '✨ 해몽하기';
      btnSpinner.classList.add('hidden');
    }
  }

  // ─── 해몽 요청 전송 ─────────────────────────
  async function requestInterpretation() {
    clearError();
    const dream = dreamInput.value.trim();

    // 입력값 검증 (공백 예외 처리)
    if (dream.length === 0) {
      showError('꿈 내용을 입력해 주세요. 🌙');
      dreamInput.focus();
      return;
    }

    setLoading(true);
    resultSection.classList.add('hidden');

    try {
      const res = await fetch('/api/dream-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dream: dream, character: selectedPersona }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        showError(json.message || '해몽에 실패했습니다. 다시 시도해 주세요.');
        return;
      }

      // 결과 매핑 및 노출 (구조화)
      const d = json.data;
      resultCharacter.textContent = d.character + ' 의 해몽';

      // 길흉 판정 배지
      const fortune = d.fortune || '중립몽';
      resultFortune.textContent = fortune;
      resultFortune.className =
        'ml-auto text-sm font-bold px-3 py-1 rounded-full border ' +
        (FORTUNE_STYLE[fortune] || FORTUNE_STYLE['중립몽']);
      resultFortune.classList.remove('hidden');

      // 한 줄 요약
      resultSummary.textContent = d.summary || '';

      // 핵심 상징 키워드
      resultKeywords.innerHTML = '';
      if (Array.isArray(d.keywords) && d.keywords.length) {
        d.keywords.forEach(function (kw) {
          const chip = document.createElement('span');
          chip.className =
            'text-sm px-3 py-1 rounded-full bg-purple-800/40 border border-purple-400/30 text-purple-100';
          chip.textContent = '#' + kw;
          resultKeywords.appendChild(chip);
        });
        resultKeywordsWrap.classList.remove('hidden');
      } else {
        resultKeywordsWrap.classList.add('hidden');
      }

      // 해석 본문
      resultText.textContent = d.interpretation || '';

      // 조언
      if (d.advice) {
        resultAdvice.textContent = d.advice;
        resultAdviceWrap.classList.remove('hidden');
      } else {
        resultAdviceWrap.classList.add('hidden');
      }

      resultSection.classList.remove('hidden');
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('[client] request error:', err);
      showError('네트워크 오류가 발생했습니다. 연결을 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  // ─── 이벤트 바인딩 ──────────────────────────
  submitBtn.addEventListener('click', requestInterpretation);

  // Ctrl/Cmd + Enter 단축키로도 제출
  dreamInput.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      requestInterpretation();
    }
  });
})();
