const app=document.querySelector('#app'),params=new URLSearchParams(location.search),roomId=params.get('room')||'';let data,current=0,role=sessionStorage.getItem(`role:${roomId}`)||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(){if(!roomId){app.innerHTML='<div class="error">room 주소가 필요합니다.</div>';return}const r=await fetch(`/api/room?room=${encodeURIComponent(roomId)}`),p=await r.json();if(!r.ok){app.innerHTML=`<div class="error">${esc(p.message||'방을 불러오지 못했습니다.')}</div>`;return}data=p;render()}
function openViewer(img){const d=document.querySelector('#viewer');if(d)d.remove();document.body.insertAdjacentHTML('beforeend',`<dialog id="viewer"><button>×</button><img src="${img.url}" alt="원본 이미지"><a href="${img.url}" download="${esc(img.name||'image')}">원본 저장</a></dialog>`);const v=document.querySelector('#viewer');v.querySelector('button').onclick=()=>v.close();v.showModal()}
function render(){const t=data.room.room_type||'chat';if(t==='camera')renderCamera();else if(t==='feed')renderFeed();else renderChat()}
function formatMessageTime(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}).format(d)}
function renderChat(){app.innerHTML=`<section class="chat-card"><header><div><h1>${esc(data.room.title)}</h1><p>${esc(data.room.publisher_name)} · ${esc(data.room.owner_name)}</p></div><b id="remain"></b></header><div id="messages" class="messages"></div><footer class="chat-controls"><div class="roles"><button data-role="publisher">${esc(data.room.publisher_name)}</button><button data-role="owner">${esc(data.room.owner_name)}</button></div><form id="form"><textarea maxlength="300" placeholder="입력자를 선택하세요"></textarea><button>전송</button></form></footer></section>`;const box=document.querySelector('#messages'),form=document.querySelector('#form'),input=form.querySelector('textarea');function draw(){let imageIndex=0;box.innerHTML=data.messages.map(m=>{let media='';if(m.sender_role==='publisher'&&imageIndex<(data.images||[]).length){const img=data.images[imageIndex++];media=`<button class="message-image" data-image-id="${img.id}"><img src="${img.url}" alt="채팅 첨부 이미지"></button>`}const name=m.sender_role==='publisher'?data.room.publisher_name:data.room.owner_name;return `<div class="msg ${m.sender_role}"><span class="sender-name">${esc(name)}</span><div class="message-row"><div class="bubble">${media}<p>${esc(m.content)}</p></div><time>${esc(formatMessageTime(m.created_at))}</time></div></div>`}).join('')||'<div class="empty">아직 대화가 없습니다.</div>';box.querySelectorAll('.message-image').forEach(b=>{const img=data.images.find(x=>String(x.id)===b.dataset.imageId);b.onclick=()=>img&&openViewer(img)});box.scrollTop=box.scrollHeight;const rem=Math.max(0,data.room.message_limit-data.room.message_count);document.querySelector('#remain').textContent=`${rem} / ${data.room.message_limit}`;input.disabled=data.room.status==='closed'||!role;form.querySelector('button').disabled=input.disabled;input.placeholder=data.room.status==='closed'?'종료된 채팅입니다':role?'메시지 입력':'입력자를 선택하세요'}document.querySelectorAll('.roles button').forEach(b=>{b.classList.toggle('active',b.dataset.role===role);b.onclick=()=>{role=b.dataset.role;sessionStorage.setItem(`role:${roomId}`,role);document.querySelectorAll('.roles button').forEach(x=>x.classList.toggle('active',x===b));draw();input.focus()}});form.onsubmit=async e=>{e.preventDefault();const content=input.value.trim();if(!content)return;const r=await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room:roomId,senderRole:role,content})});const p=await r.json();if(!r.ok){alert(p.message);return}data.messages.push(p.message);data.room={...data.room,...p.room};input.value='';draw()};draw()}
function renderCamera(){const c=data.room.config||{},imgs=data.images||[];if(!imgs.length){app.innerHTML='<div class="error">카메라형 방에는 이미지가 필요합니다.</div>';return}app.innerHTML=`<svg width="0" height="0" aria-hidden="true"><filter id="soop-sharpen" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB"><feConvolveMatrix order="3" kernelMatrix="0 -0.45 0 -0.45 2.8 -0.45 0 -0.45 0" divisor="1" edgeMode="duplicate" preserveAlpha="true"/></filter></svg><section class="soop-camera" id="cameraApp"><div class="camera-stage"><div class="soop-photo-frame"><img id="cameraImage" class="soop-photo" alt="촬영 이미지">${c.showGrid!==false?'<div class="soop-grid"></div><div class="soop-focus"></div>':''}<div class="capture-look"></div><div class="sticker-layer"></div><div class="capture-meta"><span id="metaLeft"></span><span id="metaRight"></span></div><div class="soop-flash"></div></div><div class="soop-top"><span>⚡</span><b>${esc(data.room.title)}</b><span>◌</span></div><div class="camera-nav"><button id="camPrev">‹</button><span id="camCounter"></span><button id="camNext">›</button></div><div class="soop-bottom"><div class="mode-row">${imgs.map((_,i)=>`<button data-i="${i}" class="mode-btn ${i===0?'active':''}">포토${i+1}</button>`).join('')}</div><div class="camera-controls"><button id="thumb" class="cam-thumb"></button><div class="shutter-slot"><button id="shutter" class="soop-shutter"></button><div id="captureActions" class="capture-actions"><a id="savePhoto">사진 저장</a><button id="retake">다시 촬영</button></div></div><button id="flip" class="flip-btn">↻</button></div></div><div id="saveToast" class="save-toast">원본 사진을 저장했습니다</div></div></section>`;
let captured=false,idx=0;const root=document.querySelector('#cameraApp'),image=document.querySelector('#cameraImage'),flash=document.querySelector('.soop-flash'),look=document.querySelector('.capture-look'),stickers=document.querySelector('.sticker-layer'),meta=document.querySelector('.capture-meta'),actions=document.querySelector('#captureActions'),shutter=document.querySelector('#shutter'),sound=new Audio('/assets/shutter.mp3'),counter=document.querySelector('#camCounter'),thumb=document.querySelector('#thumb');
function show(i,transition=false){idx=(i+imgs.length)%imgs.length;image.className='soop-photo';image.src=imgs[idx].url;image.onload=()=>image.classList.add(captured?'sharp-final':'loaded');thumb.style.backgroundImage=`url("${imgs[idx].url}")`;counter.textContent=`${idx+1} / ${imgs.length}`;document.querySelectorAll('.mode-btn').forEach((b,n)=>b.classList.toggle('active',n===idx));document.querySelector('#savePhoto').href=imgs[idx].url;document.querySelector('#savePhoto').download=imgs[idx].name||`photo-${idx+1}`;if(captured&&transition)captureTransition()}
function burst(){stickers.innerHTML='';if(c.showStickers===false)return;['♡','★','✦','🎀'].sort(()=>Math.random()-.5).slice(0,3+Math.floor(Math.random()*2)).forEach((s,i)=>{const el=document.createElement('span');el.textContent=s;el.className='camera-sticker';el.style.left=`${12+Math.random()*76}%`;el.style.top=`${15+Math.random()*66}%`;el.style.setProperty('--r',`${-20+Math.random()*40}deg`);el.style.animationDelay=`${i*55}ms`;stickers.append(el)})}
function captureTransition(){root.classList.add('camera-shake');flash.classList.remove('active');void flash.offsetWidth;flash.classList.add('active');if(c.shutterSound!==false){try{sound.currentTime=0;sound.play().catch(()=>{})}catch{}}setTimeout(()=>{image.classList.remove('loaded','auto-exposure');image.classList.add('sharp-final','auto-exposure');burst();meta.innerHTML=`<span>IMG_${String(Date.now()%10000).padStart(4,'0')}<br>${new Date().toLocaleString('ko-KR')}</span><span>ISO ${[80,100,125,160,200][Math.floor(Math.random()*5)]} · 1/60 · f/1.8</span>`;look.classList.add('show');if(c.showMeta!==false)meta.classList.add('show');root.classList.remove('camera-shake')},180);setTimeout(()=>image.classList.remove('auto-exposure'),520)}
shutter.onclick=()=>{if(captured)return;captured=true;captureTransition();document.querySelectorAll('.soop-grid,.soop-focus').forEach(x=>x.classList.add('hidden'));shutter.classList.add('hidden');actions.classList.add('show')};document.querySelector('#retake').onclick=()=>{captured=false;actions.classList.remove('show');shutter.classList.remove('hidden');look.classList.remove('show');meta.classList.remove('show');stickers.innerHTML='';document.querySelectorAll('.soop-grid,.soop-focus').forEach(x=>x.classList.remove('hidden'));show(idx)};document.querySelector('#camPrev').onclick=()=>show(idx-1,captured);document.querySelector('#camNext').onclick=()=>show(idx+1,captured);document.querySelectorAll('.mode-btn').forEach(b=>b.onclick=()=>show(Number(b.dataset.i),captured));show(0)}
async function downloadOriginal(img){try{const r=await fetch(img.url,{cache:'no-store'});if(!r.ok)throw new Error();const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=img.name||'image';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);snsToast('원본 이미지를 저장했습니다.')}catch{snsToast('이미지를 저장하지 못했습니다.')}}
function renderFeed(){
  const c=data.room.config||{},imgs=data.images||[];
  const commentPool=[
    ['mood_archive','분위기 뭐야… 너무 좋잖아 (´｡• ᵕ •｡`) ♡'],
    ['soft_day','색감이 완전 취향저격 ✦˖°'],
    ['daily_note','이 장면 저장해두고 싶다…📌'],
    ['cloudy_page','오늘 무드랑 찰떡이에요 𓂃☁︎'],
    ['tiny_record','구도 진짜 안정적이다 ｡ﾟ+.(･∀･)ﾟ+.ﾟ'],
    ['afterglow_','빛이 사르르 들어온다… ✧˖°'],
    ['slow_weekend','한참 멍하니 보게 돼요 (｡•́‿•̀｡)'],
    ['film_note','필름 카메라 감성 미쳤다 🎞️⋆｡°✩'],
    ['violet_hour','색 조합이 완벽해요…♡'],
    ['room_404','배경화면 각이다 [저장 완료] ⌁'],
    ['still_moment','표정이 너무 자연스러워서 좋아요 ˶ᵔ ᵕ ᵔ˶'],
    ['summer_letter','사진에서 온도가 느껴져요 ☀︎₊˚'],
    ['mono_log','디테일 하나하나 살아있네…!'],
    ['night_walk','분위기 장인 등장 ✦( •̀ᴗ•́ )و'],
    ['peach_milk','너무 귀엽고 사랑스러워요 ૮₍ ˶ᵔ ᵕ ᵔ˶ ₎ა'],
    ['blue_archive','다음 사진도 궁금해요 →→'],
    ['lazy_sunday','편안한 느낌 너무 좋다 𓈒𓏸'],
    ['paper_moon','조명 연출 최고…🌙✧'],
    ['little_star','오늘 본 사진 중 1등 ★彡'],
    ['warm_frame','색감이 포근포근해요 (づ｡◕‿‿◕｡)づ'],
    ['quiet_scene','말 없이 오래 보고 싶은 장면… 𓂃'],
    ['daydreamer','이 분위기 그대로 박제하고 싶다 ⟡'],
    ['soft_focus','넘길 때마다 느낌이 달라서 재밌어요 ↻'],
    ['memory_box','추억 한 장 꺼내 본 기분 📷♡'],
    ['pixel_bloom','헉… 첫 장부터 심장에 치명타 (๑•́ ₃ •̀๑)'],
    ['zero_hour','이건 반칙이지… 너무 예뻐요 !!'],
    ['starry_zip','✨✨✨ 말이 필요 없다'],
    ['cozy_signal','좋아요 버튼 한 번으로 부족해요 ♡♡♡'],
    ['mint_letter','스크롤 멈추게 만드는 사진이다 〰︎'],
    ['noon_dream','분위기 한 스푼, 감성 두 스푼 ₊˚⊹'],
    ['tiny_orbit','여기서 못 나가겠어요…( ˘͈ ᵕ ˘͈ )'],
    ['archive_7','사진마다 이야기가 있는 느낌 📖✦']
  ];
  if(!imgs.length){app.innerHTML='<div class="empty">첨부 이미지가 없습니다.</div>';return}
  app.innerHTML=`<section class="sns-shell"><div class="sns-top"><b><span>✦</span>Moment</b><div>♡</div></div><main class="sns-feed"><article class="sns-post is-building"><header><img id="snsAvatar" src="${imgs[0].url}"><div><b>${esc(c.displayName||'오늘의 기록')}</b><span>${esc(c.userId||'@daily_moment')} · 방금 전</span></div><strong>•••</strong></header><div class="sns-media" id="snsMedia"><div class="new-badge">NEW POST</div><button class="sns-arrow sns-prev" id="snsPrev" aria-label="이전 이미지">‹</button><div class="sns-track" id="snsTrack">${imgs.map((img,i)=>`<div class="sns-slide"><img src="${img.url}" alt="게시 이미지 ${i+1}"></div>`).join('')}</div><button class="sns-arrow sns-next" id="snsNext" aria-label="다음 이미지">›</button><div class="scan"></div><div class="sns-counter" id="snsCounter">1 / ${imgs.length}</div></div><div class="sns-body"><div class="sns-comments"></div><div class="sns-feed-info"><div class="sns-actions"><button class="like" aria-label="좋아요">♡</button><button class="comment-btn" aria-label="댓글">○</button><button class="bookmark" aria-label="원본 이미지 저장">⇩</button></div><div class="sns-likes">좋아요 <span>${Number(c.likeCount||0)}</span>개</div><p><b>${esc(c.displayName||'오늘의 기록')}</b> ${esc(c.caption||'')}</p></div></div></article></main><div id="snsToast" class="sns-toast"></div></section>`;
  const post=document.querySelector('.sns-post');requestAnimationFrame(()=>post.classList.add('is-ready'));wirePost(post,commentPool,imgs,c)
}
function wirePost(post,commentPool,imgs,c){
  const like=post.querySelector('.like'),count=post.querySelector('.sns-likes span'),track=post.querySelector('#snsTrack'),counter=post.querySelector('#snsCounter'),bookmark=post.querySelector('.bookmark'),prev=post.querySelector('#snsPrev'),next=post.querySelector('#snsNext');
  let liked=false,index=0;
  function heart(x,y){for(let i=0;i<5;i++){const h=document.createElement('span');h.className='burst-heart';h.textContent='♥';h.style.left=`${x}px`;h.style.top=`${y}px`;h.style.setProperty('--x',`${-55+Math.random()*110}px`);h.style.setProperty('--r',`${-30+Math.random()*60}deg`);document.body.append(h);setTimeout(()=>h.remove(),850)}}
  function move(nextIndex,animate=true){index=Math.max(0,Math.min(imgs.length-1,nextIndex));track.style.transition=animate?'transform .32s cubic-bezier(.2,.8,.2,1)':'none';track.style.transform=`translateX(${-index*100}%)`;counter.textContent=`${index+1} / ${imgs.length}`;post.querySelector('#snsAvatar').src=imgs[index].url;prev.disabled=index===0;next.disabled=index===imgs.length-1}
  like.onclick=e=>{liked=!liked;like.classList.toggle('liked',liked);like.textContent=liked?'♥':'♡';count.textContent=Number(count.textContent)+(liked?1:-1);if(liked)heart(e.clientX,e.clientY)};
  bookmark.onclick=()=>downloadOriginal(imgs[index]);
  prev.onclick=()=>move(index-1);next.onclick=()=>move(index+1);
  if(imgs.length<=1){prev.hidden=true;next.hidden=true}
  const box=post.querySelector('.sns-comments');
  if(c.showComments!==false){
    const shuffled=[...commentPool].sort(()=>Math.random()-.5);
    const selected=shuffled.slice(0,2+Math.floor(Math.random()*4));
    selected.forEach(([id,text],i)=>setTimeout(()=>{const d=document.createElement('div');d.className='sns-comment';d.innerHTML=`<b>${id}</b> ${text}`;box.append(d);count.textContent=Number(count.textContent)+1+Math.floor(Math.random()*4)},900+i*(480+Math.floor(Math.random()*320))))
  }
  move(0,false)
}
function snsToast(msg){const t=document.querySelector('#snsToast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(snsToast.timer);snsToast.timer=setTimeout(()=>t.classList.remove('show'),1800)}
load();
