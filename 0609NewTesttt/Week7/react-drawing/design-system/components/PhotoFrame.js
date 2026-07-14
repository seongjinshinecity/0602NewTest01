// ========================================
// 🖼️ PhotoFrame — 로딩/에러 상태가 있는 사진 프레임
// sheen 광택 + 비네트 + 코너 라벨 + 하단 캡션 포함
// props:
//   src (string)      : 이미지 경로
//   alt (string)      : 대체 텍스트
//   cornerLabel       : 좌상단 알약 라벨 (기본 '🥭 REAL PHOTO')
//   caption           : 하단 캡션 (기본 '편집샵 스타일 · 45° food photography')
//   className         : 확장
// ========================================
window.DS = window.DS || {};

(function () {
  const { useState } = React;

  function PhotoFrame({
    src,
    alt = '',
    cornerLabel = '🥭 REAL PHOTO',
    caption = '편집샵 스타일 · 45° food photography',
    className = '',
  }) {
    const [status, setStatus] = useState('loading');
    return (
      <div
        className={`relative w-full aspect-square rounded-[22px] overflow-hidden
                    shadow-[0_18px_40px_-12px_rgba(11,114,133,0.55)]
                    ring-1 ring-white/70 bg-cyan-100/60 ${className}`}
      >
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center
                          bg-gradient-to-br from-sky-100 to-amber-100 animate-pulse">
            <span className="font-body text-cyan-700/60 text-sm">사진 불러오는 중…</span>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2
                          bg-gradient-to-br from-amber-100 to-sky-100 text-center px-6">
            <span className="text-4xl">🥭</span>
            <span className="font-point text-orange-600">이미지를 불러오지 못했어요</span>
            <span className="font-body text-xs text-cyan-700/60 break-all">{src}</span>
          </div>
        )}
        <img
          src={src}
          alt={alt}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`w-full h-full object-cover transition-opacity duration-700
                      ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="pointer-events-none absolute inset-0
                        bg-gradient-to-t from-cyan-950/45 via-transparent to-cyan-950/10" />
        <div className="pointer-events-none absolute inset-0
                        shadow-[inset_0_0_60px_20px_rgba(8,51,68,0.28)] rounded-[22px]" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
          <div className="sheen absolute top-0 left-0 h-full w-1/3
                          bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
        {cornerLabel && (
          <div className="absolute top-3 left-3">
            <span className="font-point text-[11px] tracking-wide text-white/95
                             bg-orange-500/85 rounded-full px-3 py-1 shadow-sm">
              {cornerLabel}
            </span>
          </div>
        )}
        {caption && (
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <span className="font-body text-white/90 text-xs sm:text-sm drop-shadow">
              {caption}
            </span>
          </div>
        )}
      </div>
    );
  }

  window.DS.PhotoFrame = PhotoFrame;
})();
