export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}
export function error(code, message, status = 400, extraHeaders = {}) {
  return json({ success: false, error: code, message }, status, extraHeaders);
}
export async function getRoom(request, env, roomIdOverride = "") {
  const url = new URL(request.url);
  const roomId = roomIdOverride || request.headers.get("X-Chat-Room")?.trim() || url.searchParams.get("room")?.trim();
  if (!roomId) return { response: error("ROOM_REQUIRED", "방 코드가 필요합니다.", 400) };
  const room = await env.DB.prepare(`
    SELECT id,title,room_type,room_config,publisher_name,owner_name,publisher_avatar,owner_avatar,
           message_limit,message_count,status,created_at
    FROM rooms WHERE id = ?
  `).bind(roomId).first();
  if (!room) return { response: error("ROOM_NOT_FOUND", "방을 찾을 수 없습니다.", 404) };
  try { room.config = room.room_config ? JSON.parse(room.room_config) : {}; } catch { room.config = {}; }
  delete room.room_config;
  return { room, roomId };
}
export function validateRole(v){ return v === "publisher" || v === "owner"; }
export function validateMessage(v){
  if(typeof v !== "string") return {ok:false,message:"메시지 형식이 올바르지 않습니다."};
  const content=v.trim(); if(!content) return {ok:false,message:"빈 메시지는 전송할 수 없습니다."};
  if([...content].length>300) return {ok:false,message:"메시지는 최대 300자까지 입력할 수 있습니다."};
  return {ok:true,content};
}
export function clientIp(request){ return (request.headers.get("CF-Connecting-IP")||request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim()||"unknown").slice(0,80); }
