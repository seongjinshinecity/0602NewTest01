-- 카페 사장님 대시보드 스키마 (서버 첫 실행 시 initDb() 가 자동 생성 + 최근 30일 매출 시드).
-- 사용자 테이블은 공용 모듈(shared/auth.js)이 만든다.

CREATE TABLE IF NOT EXISTS app_users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  display_name  TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cafe_sales (
  id     BIGSERIAL PRIMARY KEY,
  date   DATE          NOT NULL,
  item   TEXT          NOT NULL,           -- 메뉴명
  qty    INT           NOT NULL CHECK (qty >= 0),
  amount NUMERIC(12,0) NOT NULL CHECK (amount >= 0)
);
CREATE INDEX IF NOT EXISTS idx_cafe_sales_date ON cafe_sales (date DESC);

-- 인기 메뉴 예시: SELECT item, SUM(qty) FROM cafe_sales WHERE date >= CURRENT_DATE-6 GROUP BY item ORDER BY 2 DESC;
