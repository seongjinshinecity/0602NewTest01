// ========================================
// 🎨 Design Tokens — window.DS.tokens
// index-photo.html(실사진 망고 빙수 포스터)에서 추출한 디자인 토큰
// ========================================
window.DS = window.DS || {};

window.DS.tokens = {
  // ----------------------------------------
  // 색상 팔레트 (Tailwind 클래스 + 참고용 hex)
  // ----------------------------------------
  colors: {
    // 배경 그라데이션 계열 (하늘 → 시안 → 앰버)
    sky: [
      { name: 'sky-100',  cls: 'bg-sky-100',  hex: '#e0f2fe', use: '페이지 배경 시작' },
      { name: 'sky-300',  cls: 'bg-sky-300',  hex: '#7dd3fc', use: '포스터 셸 그라데이션 상단' },
    ],
    cyan: [
      { name: 'cyan-50',   cls: 'bg-cyan-50',   hex: '#ecfeff', use: '페이지 배경 끝' },
      { name: 'cyan-100',  cls: 'bg-cyan-100',  hex: '#cffafe', use: '사진 프레임 베이스' },
      { name: 'cyan-200',  cls: 'bg-cyan-200',  hex: '#a5f3fc', use: '포스터 셸 그라데이션 중간' },
      { name: 'cyan-700',  cls: 'text-cyan-700', hex: '#0e7490', use: '서브 타이틀 텍스트' },
      { name: 'cyan-900',  cls: 'text-cyan-900', hex: '#164e63', use: '본문 텍스트' },
    ],
    amber: [
      { name: 'amber-100', cls: 'bg-amber-100', hex: '#fef3c7', use: '포스터 셸 그라데이션 하단' },
      { name: 'amber-200', cls: 'bg-amber-200', hex: '#fde68a', use: '배경 블롭 (blur)' },
      { name: 'amber-500', cls: 'text-amber-500', hex: '#f59e0b', use: '메인 타이틀 텍스트' },
    ],
    orange: [
      { name: 'orange-500', cls: 'bg-orange-500', hex: '#f97316', use: '코너 라벨 배경' },
      { name: 'orange-600', cls: 'text-orange-600', hex: '#ea580c', use: '가격 · 포인트 텍스트' },
    ],
    surface: [
      { name: 'white/85',  cls: 'bg-white/85',  hex: 'rgba(255,255,255,.85)', use: 'Badge 배경' },
      { name: 'white/80',  cls: 'bg-white/80',  hex: 'rgba(255,255,255,.80)', use: 'InfoBar 배경 (backdrop-blur)' },
      { name: 'white/25',  cls: 'bg-white/25',  hex: 'rgba(255,255,255,.25)', use: '배경 블롭 하이라이트' },
    ],
  },

  // ----------------------------------------
  // 폰트 (Google Fonts)
  // ----------------------------------------
  fonts: {
    title: { cls: 'font-title', family: 'Black Han Sans', use: '메인 타이틀 (굵고 임팩트)' },
    point: { cls: 'font-point', family: 'Jua',            use: '포인트 · 가격 · 라벨' },
    body:  { cls: 'font-body',  family: 'Gowun Dodum',    use: '본문 설명' },
  },

  // ----------------------------------------
  // 반경 · 그림자
  // ----------------------------------------
  radius: {
    poster: 'rounded-[28px]',
    photo:  'rounded-[22px]',
    pill:   'rounded-full',
    bar:    'rounded-2xl',
  },
  shadows: {
    poster:   'shadow-2xl',
    photo:    'shadow-[0_18px_40px_-12px_rgba(11,114,133,0.55)]',
    vignette: 'shadow-[inset_0_0_60px_20px_rgba(8,51,68,0.28)]',
    soft:     'shadow-sm',
  },

  // ----------------------------------------
  // 애니메이션 (index.html <style>에 정의된 keyframe 클래스)
  // ----------------------------------------
  animations: {
    sheen:      { cls: 'sheen',       desc: '사진 위를 6s 주기로 지나가는 광택' },
    floaty:     { cls: 'floaty',      desc: '5s 상하 + 회전 (강한 부유)' },
    floatySlow: { cls: 'floaty-slow', desc: '7s 상하 (은은한 부유)' },
  },
};
