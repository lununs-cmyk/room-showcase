import { error, getRoom, json } from "./_shared.js";
export async function onRequestGet(context){
  try{
    const result=await getRoom(context.request,context.env); if(result.response)return result.response;
    const [messages,images]=await Promise.all([
      context.env.DB.prepare(`SELECT id,sender_role,content,created_at FROM messages WHERE room_id=? ORDER BY id ASC LIMIT 500`).bind(result.roomId).all(),
      context.env.DB.prepare(`SELECT id,image_name,image_type,image_size,sort_order FROM room_images WHERE room_id=? AND sort_order<900 ORDER BY sort_order ASC,id ASC LIMIT 5`).bind(result.roomId).all()
    ]);
    const [avatar,publisherAvatar,ownerAvatar]=await Promise.all([
      context.env.DB.prepare(`SELECT id,image_name FROM room_images WHERE room_id=? AND sort_order=999 ORDER BY id DESC LIMIT 1`).bind(result.roomId).first(),
      context.env.DB.prepare(`SELECT id,image_name FROM room_images WHERE room_id=? AND sort_order=997 ORDER BY id DESC LIMIT 1`).bind(result.roomId).first(),
      context.env.DB.prepare(`SELECT id,image_name FROM room_images WHERE room_id=? AND sort_order=998 ORDER BY id DESC LIMIT 1`).bind(result.roomId).first()
    ]);
    const mapped=(images.results||[]).map(x=>({...x,url:`/api/room-image?room=${encodeURIComponent(result.roomId)}&image=${x.id}`,download_url:`/api/room-image?room=${encodeURIComponent(result.roomId)}&image=${x.id}&download=1`}));
    if(result.room.config)delete result.room.config.ownerAccessKey;return json({success:true,room:result.room,images:mapped,avatar_url:avatar?`/api/room-image?room=${encodeURIComponent(result.roomId)}&image=${avatar.id}`:'',publisher_avatar_url:publisherAvatar?`/api/room-image?room=${encodeURIComponent(result.roomId)}&image=${publisherAvatar.id}`:'',owner_avatar_url:ownerAvatar?`/api/room-image?room=${encodeURIComponent(result.roomId)}&image=${ownerAvatar.id}`:'',messages:messages.results||[]});
  }catch(cause){console.error(cause);return error("SERVER_ERROR","방을 불러오지 못했습니다.",500)}
}
