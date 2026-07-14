// ========================================
// 💳 InfoBar — 하단 가격/설명 정보 바
// 좌측: 설명 리스트, 우측: 가격 + 부가 문구
// props:
//   lines     : string[]  좌측 설명 줄 (예: ['제철 애플망고 100%', '수제 연유 · 우유 얼음'])
//   price     : string    우측 가격 (예: '₩12,900')
//   priceNote : string    가격 아래 작은 문구 (예: '1인 · 2인 사이즈')
//   className : 확장
// ========================================
window.DS = window.DS || {};

(function () {
  function InfoBar({ lines = [], price, priceNote, className = '' }) {
    return (
      <div
        className={`w-full flex items-center justify-between
                    bg-white/80 backdrop-blur rounded-2xl px-5 py-3
                    shadow-sm ring-1 ring-white/70 ${className}`}
      >
        <div className="font-body text-xs sm:text-sm text-cyan-800/70 leading-tight">
          {lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
        <div className="text-right">
          {price && (
            <div className="font-point text-2xl sm:text-3xl text-orange-600">{price}</div>
          )}
          {priceNote && (
            <div className="font-body text-[11px] text-cyan-700/60">{priceNote}</div>
          )}
        </div>
      </div>
    );
  }

  window.DS.InfoBar = InfoBar;
})();
