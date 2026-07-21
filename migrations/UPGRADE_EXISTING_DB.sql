-- 기존 DB 업그레이드용입니다.
-- D1 Console에서 각 ALTER TABLE 문을 한 줄씩 따로 실행하세요.
-- 이미 존재한다는 오류가 난 열은 건너뛰면 됩니다.

ALTER TABLE rooms ADD COLUMN image_key TEXT;
ALTER TABLE rooms ADD COLUMN image_name TEXT;
ALTER TABLE rooms ADD COLUMN image_type TEXT;
ALTER TABLE rooms ADD COLUMN image_size INTEGER;

CREATE TABLE IF NOT EXISTS admin_rate_limits (
  ip TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);
