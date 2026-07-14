// ========================================
// 🪧 PosterShell — 그라데이션 배경 카드 셸 + 배경 블롭
// 포스터의 바깥 틀. 내부 콘텐츠는 children으로 받는다.
// props:
//   children  : 포스터 내부 콘텐츠
//   deco      : true면 기본 FloatingDeco 자동 삽입 (기본 true)
//   className : 확장
// ========================================
window.DS = window.DS || {};

(function () {
  function PosterShell({ children, deco = true, className = '' }) {
    const FloatingDeco = window.DS.FloatingDeco;
    return (
      <div
        className={`relative w-full max-w-[440px] mx-auto
                    rounded-[28px] overflow-hidden shadow-2xl
                    bg-gradient-to-br from-sky-300 via-cyan-200 to-amber-100
                    ring-1 ring-white/60 ${className}`}
      >
        {/* 배경 블롭 (blur) */}
        <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56
                        rounded-full bg-white/25 blur-2xl" />
        <div className="pointer-events-none absolute top-24 -right-20 w-60 h-60
                        rounded-full bg-amber-200/40 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-full h-40
                        bg-gradient-to-t from-amber-100/70 to-transparent" />
        {deco && FloatingDeco && <FloatingDeco />}
        <div className="relative px-7 pt-9 pb-8 flex flex-col items-center">
          {children}
        </div>
      </div>
    );
  }

  window.DS.PosterShell = PosterShell;
})();
