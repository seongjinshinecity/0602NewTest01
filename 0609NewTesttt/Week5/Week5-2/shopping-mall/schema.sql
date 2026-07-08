-- 쇼핑몰 스키마 (서버 첫 실행 시 initDb() 가 자동 생성 + 샘플 상품 10종 시드).
-- 사용자 테이블은 공용 모듈(shared/auth.js)이 만든다.

CREATE TABLE IF NOT EXISTS app_users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  display_name  TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_products (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT          NOT NULL,
  price       NUMERIC(12,0) NOT NULL CHECK (price >= 0),
  image_url   TEXT          NOT NULL DEFAULT '',
  description TEXT          NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS shop_cart (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,    -- 로그인 본인만
  product_id BIGINT NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  quantity   INT    NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE (user_id, product_id)   -- 같은 상품은 한 줄, 수량만 증감
);

-- 합계 예시: SELECT SUM(c.quantity * p.price) FROM shop_cart c JOIN shop_products p ON p.id=c.product_id WHERE c.user_id=$1;
