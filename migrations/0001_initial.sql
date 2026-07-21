PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS rooms(
 id TEXT PRIMARY KEY,title TEXT NOT NULL,room_type TEXT NOT NULL DEFAULT 'chat',room_config TEXT,
 publisher_name TEXT NOT NULL,owner_name TEXT NOT NULL,publisher_avatar TEXT NOT NULL DEFAULT '/assets/default-avatar.svg',owner_avatar TEXT NOT NULL DEFAULT '/assets/default-avatar.svg',
 message_limit INTEGER NOT NULL DEFAULT 30 CHECK(message_limit BETWEEN 1 AND 1000),message_count INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open','closed')),created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,room_id TEXT NOT NULL,sender_role TEXT NOT NULL CHECK(sender_role IN('publisher','owner')),content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 300),created_at TEXT NOT NULL,FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS room_images(id INTEGER PRIMARY KEY AUTOINCREMENT,room_id TEXT NOT NULL,image_key TEXT NOT NULL,image_name TEXT,image_type TEXT,image_size INTEGER,sort_order INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS admin_rate_limits(ip TEXT PRIMARY KEY,attempts INTEGER NOT NULL DEFAULT 0,window_start INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_messages_room_id_id ON messages(room_id,id);CREATE INDEX IF NOT EXISTS idx_room_images_room_order ON room_images(room_id,sort_order,id);