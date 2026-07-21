import { error, getRoom } from "./_shared.js";
const safe=(v)=>(v||"image").replace(/[\r\n"]/g,"_").slice(0,120);
export async function onRequestGet(context){
 try{
  const result=await getRoom(context.request,context.env); if(result.response)return result.response;
  const url=new URL(context.request.url); const imageId=Number(url.searchParams.get("image"));
  if(!Number.isInteger(imageId)||imageId<1)return error("IMAGE_REQUIRED","이미지 번호가 필요합니다.",400);
  const meta=await context.env.DB.prepare(`SELECT image_key,image_name,image_type,image_size FROM room_images WHERE id=? AND room_id=?`).bind(imageId,result.roomId).first();
  if(!meta)return error("IMAGE_NOT_FOUND","이미지를 찾을 수 없습니다.",404);
  if(!context.env.IMAGES)return error("R2_NOT_CONFIGURED","R2 바인딩이 없습니다.",503);
  const obj=await context.env.IMAGES.get(meta.image_key); if(!obj)return error("IMAGE_NOT_FOUND","원본 파일이 없습니다.",404);
  const h=new Headers(); obj.writeHttpMetadata(h); h.set("Content-Type",meta.image_type||"application/octet-stream"); h.set("X-Content-Type-Options","nosniff"); h.set("Cache-Control","public,max-age=31536000,immutable");
  h.set("Content-Disposition",`${url.searchParams.get("download")==="1"?"attachment":"inline"}; filename*=UTF-8''${encodeURIComponent(safe(meta.image_name))}`);
  return new Response(obj.body,{headers:h});
 }catch(cause){console.error(cause);return error("SERVER_ERROR","이미지를 불러오지 못했습니다.",500)}
}
