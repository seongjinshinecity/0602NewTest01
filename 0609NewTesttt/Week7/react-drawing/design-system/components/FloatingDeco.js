// ========================================
// ✨ FloatingDeco — 떠다니는 이모지 데코
// 포스터 셸 내부에 절대배치로 얹는 장식 이모지들
// props:
//   items : [{ emoji, className }] 배열 (기본: 망고/반짝임/물방울 3종)
//           className에 위치(top/left…)와 floaty/floaty-slow 애니메이션 포함
// ========================================
window.DS = window.DS || {};

(function () {
  const DEFAULT_ITEMS = [
    { emoji: '🥭', className: 'floaty top-24 left-4 text-3xl opacity-80' },
    { emoji: '✨', className: 'floaty-slow top-16 right-5 text-2xl opacity-70' },
    { emoji: '💧', className: 'floaty-slow bottom-28 left-6 text-xl opacity-60' },
  ];

  function FloatingDeco({ items = DEFAULT_ITEMS }) {
    return (
      <>
        {items.map((it, i) => (
          <div
            key={i}
            className={`pointer-events-none absolute select-none ${it.className}`}
          >
            {it.emoji}
          </div>
        ))}
      </>
    );
  }

  window.DS.FloatingDeco = FloatingDeco;
})();
