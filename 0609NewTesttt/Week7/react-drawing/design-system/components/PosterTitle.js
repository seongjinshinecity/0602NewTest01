// ========================================
// 🔤 PosterTitle — 2단 타이틀 (메인 + 영문 서브)
// props:
//   main      : 메인 타이틀 (예: '망고 빙수')
//   sub       : 영문 서브 타이틀 (예: 'MANGO BINGSU')
//   className : 확장
// ========================================
window.DS = window.DS || {};

(function () {
  function PosterTitle({ main, sub, className = '' }) {
    return (
      <h1 className={`text-center leading-none ${className}`}>
        <span className="block font-title text-6xl sm:text-7xl
                         text-amber-500 drop-shadow-[0_3px_0_rgba(255,255,255,0.7)]">
          {main}
        </span>
        {sub && (
          <span className="block font-point text-lg sm:text-xl text-cyan-700 mt-2 tracking-widest">
            {sub}
          </span>
        )}
      </h1>
    );
  }

  window.DS.PosterTitle = PosterTitle;
})();
