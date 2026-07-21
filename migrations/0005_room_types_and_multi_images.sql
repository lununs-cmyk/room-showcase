-- 기존 DB에서 한 줄씩 실행하세요.
ALTER TABLE rooms ADD COLUMN room_type TEXT NOT NULL DEFAULT 'chat';
ALTER TABLE rooms ADD COLUMN room_config TEXT;
CREATE TABLE IF NOT EXISTS room_images(id INTEGER PRIMARY KEY AUTOINCREMENT,room_id TEXT NOT NULL,image_key TEXT NOT NULL,image_name TEXT,image_type TEXT,image_size INTEGER,sort_order INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_room_images_room_order ON room_images(room_id,sort_order,id);
-- 기존 v3 단일 이미지가 있다면 아래 INSERT를 한 번 실행해 이동합니다.
INSERT INTO room_images(room_id,image_key,image_name,image_type,image_size,sort_order)
SELECT id,image_key,image_name,image_type,image_size,0 FROM rooms WHERE image_key IS NOT NULL AND NOT EXISTS(SELECT 1 FROM room_images ri WHERE ri.room_id=rooms.id);
