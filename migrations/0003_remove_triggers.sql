PRAGMA foreign_keys = ON;

DROP TRIGGER IF EXISTS messages_limit_guard;
DROP TRIGGER IF EXISTS messages_increment_room;

CREATE INDEX IF NOT EXISTS idx_messages_room_id_id
ON messages(room_id, id);
