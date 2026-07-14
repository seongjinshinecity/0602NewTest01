// ========================================
// 🏷️ Badge — 알약형 라벨
// 반투명 화이트 배경 + 오렌지 텍스트, 여름 한정 등 라벨용
// props: children (라벨 텍스트), className (확장)
// ========================================
window.DS = window.DS || {};

(function () {
  function Badge({ children, className = '' }) {
    return (
      <span
        className={`inline-block font-point text-sm sm:text-base tracking-wide
                    bg-white/85 text-orange-600 rounded-full px-4 py-1.5
                    shadow-sm ring-1 ring-orange-200 ${className}`}
      >
        {children}
      </span>
    );
  }

  window.DS.Badge = Badge;
})();
