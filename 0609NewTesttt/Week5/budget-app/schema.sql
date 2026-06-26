-- 가계부 테이블 (Supabase SQL Editor 에 붙여넣어 실행해도 되고,
-- 서버 첫 실행 시 server.js 의 initDb() 가 자동으로 생성합니다.)

CREATE TABLE IF NOT EXISTS entries (
  id         BIGSERIAL PRIMARY KEY,
  type       TEXT        NOT NULL CHECK (type IN ('income', 'expense')), -- 수입/지출
  category   TEXT        NOT NULL,                                       -- 식비, 교통, 임대료, 구독료, 경조사 등
  amount     NUMERIC(14,2) NOT NULL CHECK (amount >= 0),                 -- 금액
  memo       TEXT        NOT NULL DEFAULT '',                           -- 메모
  date       DATE        NOT NULL DEFAULT CURRENT_DATE,                 -- 날짜
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entries_date     ON entries (date DESC);
CREATE INDEX IF NOT EXISTS idx_entries_category ON entries (category);

-- 카테고리별 합계 예시 (지출):
--   SELECT category, SUM(amount) AS total
--     FROM entries
--    WHERE type = 'expense'
--    GROUP BY category
--    ORDER BY total DESC;

-- 월별 지출 합계 예시:
--   SELECT to_char(date, 'YYYY-MM') AS month, SUM(amount) AS total
--     FROM entries
--    WHERE type = 'expense'
--    GROUP BY month
--    ORDER BY month;
