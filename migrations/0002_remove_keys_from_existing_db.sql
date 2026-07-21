-- 기존 비밀키 버전을 이미 D1에 적용한 경우에만 실행하세요.
-- 기존 대화 기록과 사용량을 유지하면서 rooms 테이블의 키 열을 제거합니다.

PRAGMA foreign_keys = OFF;

CREATE TABLE rooms_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  publisher_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  publisher_avatar TEXT NOT NULL DEFAULT '/assets/default-avatar.svg',
  owner_avatar TEXT NOT NULL DEFAULT '/assets/default-avatar.svg',
  message_limit INTEGER NOT NULL DEFAULT 30 CHECK (message_limit BETWEEN 1 AND 1000),
  message_count INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL
);

INSERT INTO rooms_new (
  id, title, publisher_name, owner_name,
  publisher_avatar, owner_avatar,
  message_limit, message_count, status, created_at
)
SELECT
  id, title, publisher_name, owner_name,
  publisher_avatar, owner_avatar,
  message_limit, message_count, status, created_at
FROM rooms;

DROP TABLE rooms;
ALTER TABLE rooms_new RENAME TO rooms;

PRAGMA foreign_keys = ON;
