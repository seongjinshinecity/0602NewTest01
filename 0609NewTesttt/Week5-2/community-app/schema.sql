-- 커뮤니티 앱 스키마 (서버 첫 실행 시 initDb() 가 자동 생성하므로 수동 실행은 선택).
-- 사용자 테이블은 공용 모듈(shared/auth.js)이 만든다.

CREATE TABLE IF NOT EXISTS app_users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  display_name  TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_posts (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT      NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, -- 작성자(소유권)
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_created ON community_posts (created_at DESC);

-- 본인 글만 수정/삭제는 앱에서 `WHERE id=$1 AND user_id=$me` 로 강제한다.
