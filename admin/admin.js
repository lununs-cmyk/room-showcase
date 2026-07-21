const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const e = {
  login: $('#login'), dashboard: $('#dashboard'), loginForm: $('#loginForm'), password: $('#password'), loginError: $('#loginError'), lock: $('#lock'),
  createForm: $('#createForm'), roomTypeInputs: $$('input[name="roomType"]'), chatFields: $('#chatFields'), cameraFields: $('#cameraFields'), feedFields: $('#feedFields'),
  images: $('#images'), filePreview: $('#filePreview'), roomCode: $('#roomCode'), regenerateCode: $('#regenerateCode'),
  titleInput: $('#titleInput'), publisherName: $('#publisherName'), ownerName: $('#ownerName'), displayName: $('#displayName'), userId: $('#userId'), caption: $('#caption'),
  livePreview: $('#livePreview'), previewTypeName: $('#previewTypeName'),
  created: $('#created'), createdUrl: $('#createdUrl'), iframe: $('#iframeCode'), openCreated: $('#openCreated'), copyCreated: $('#copyCreated'), copyIframe: $('#copyIframe'),
  rooms: $('#rooms'), count: $('#count'), refresh: $('#refresh'), tpl: $('#roomTpl'), toast: $('#toast'), createButton: $('#createButton'),
  modal: $('#iframeModal'), modalIframe: $('#modalIframe'), modalIframeCode: $('#modalIframeCode'), modalRoomName: $('#modalRoomName'), copyModalIframe: $('#copyModalIframe'), openModalRoom: $('#openModalRoom')
};

let password = sessionStorage.getItem('chat-admin-password') || '';
let timer;
let objectUrls = [];

const randomCode = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return 'room-' + btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};

function currentType() {
  return e.roomTypeInputs.find(input => input.checked)?.value || 'chat';
}

function setCode() {
  e.roomCode.value = randomCode();
}

function toast(message) {
  e.toast.textContent = message;
  e.toast.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => { e.toast.hidden = true; }, 2200);
}

async function api(options = {}) {
  const headers = { 'X-Admin-Password': password, ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch('/api/admin', { ...options, headers, cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload.message || `HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return payload;
}

function showLogin(message = '') {
  e.login.hidden = false;
  e.dashboard.hidden = true;
  e.lock.hidden = true;
  e.loginError.hidden = !message;
  e.loginError.textContent = message;
}

function showDash() {
  e.login.hidden = true;
  e.dashboard.hidden = false;
  e.lock.hidden = false;
}

function fail(err) {
  if ([401, 429, 503].includes(err.status)) {
    password = '';
    sessionStorage.removeItem('chat-admin-password');
    showLogin(err.message);
  } else {
    toast(err.message);
  }
}

const roomUrl = id => `${location.origin}/?room=${encodeURIComponent(id)}`;

function iframeHeight(type) {
  return type === 'camera' ? 820 : type === 'feed' ? 900 : 780;
}

function iframeCode(url, type) {
  return `<iframe src="${url}" style="width:100%;height:${iframeHeight(type)}px;border:0;border-radius:24px" loading="lazy"></iframe>`;
}

async function copy(text) {
  await navigator.clipboard.writeText(text);
  toast('복사했습니다.');
}

async function load() {
  try {
    const payload = await api();
    showDash();
    renderRooms(payload.rooms || []);
  } catch (err) {
    fail(err);
  }
}

function renderRooms(rooms) {
  e.rooms.innerHTML = '';
  e.count.textContent = `총 ${rooms.length}개`;
  const names = { chat: '채팅', camera: '카메라', feed: 'SNS' };

  for (const room of rooms) {
    const node = e.tpl.content.firstElementChild.cloneNode(true);
    const url = roomUrl(room.id);
    $('h3', node).textContent = room.title;
    $('code', node).textContent = room.id;
    $('.badge', node).textContent = names[room.room_type] || room.room_type;
    $('.stats', node).textContent = room.room_type === 'chat'
      ? `이미지 ${room.image_count}장 · 메시지 ${room.message_count}/${room.message_limit}`
      : `이미지 ${room.image_count}장 · ${names[room.room_type] || room.room_type}형`;

    $('.open', node).href = url;
    $('.copy', node).onclick = () => copy(url);
    $('.iframe-view', node).onclick = () => openIframeModal(room);
    $('.limit', node).value = room.message_limit;

    $('.update', node).onclick = async () => {
      try {
        await api({ method: 'PATCH', body: JSON.stringify({ action: 'updateLimit', roomId: room.id, messageLimit: Number($('.limit', node).value) }) });
        toast('변경했습니다.');
        load();
      } catch (err) { fail(err); }
    };

    $('.reset', node).onclick = async () => {
      if (!confirm('대화를 초기화할까요?')) return;
      try {
        await api({ method: 'PATCH', body: JSON.stringify({ action: 'reset', roomId: room.id }) });
        toast('초기화했습니다.');
        load();
      } catch (err) { fail(err); }
    };

    $('.delete', node).onclick = async () => {
      if (!confirm('방과 이미지 원본을 삭제할까요?')) return;
      try {
        await api({ method: 'DELETE', body: JSON.stringify({ roomId: room.id }) });
        toast('삭제했습니다.');
        load();
      } catch (err) { fail(err); }
    };

    if (room.room_type !== 'chat') {
      $('.limit-label', node).hidden = true;
      $('.update', node).hidden = true;
      $('.reset', node).hidden = true;
    }
    e.rooms.appendChild(node);
  }
}

function openIframeModal(room) {
  const url = roomUrl(room.id);
  const code = iframeCode(url, room.room_type);
  e.modalRoomName.textContent = `${room.title} · ${room.id}`;
  e.modalIframeCode.value = code;
  e.openModalRoom.href = url;
  e.modalIframe.style.height = `${iframeHeight(room.room_type)}px`;
  e.modalIframe.src = url;
  e.modal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeIframeModal() {
  e.modal.hidden = true;
  e.modalIframe.src = 'about:blank';
  document.body.classList.remove('modal-open');
}

function syncConditionalFields() {
  const type = currentType();
  e.chatFields.hidden = type !== 'chat';
  e.cameraFields.hidden = type !== 'camera';
  e.feedFields.hidden = type !== 'feed';
  e.previewTypeName.textContent = { chat: '제한 채팅형', camera: '카메라 셔터형', feed: 'SNS 피드형' }[type];
  renderLivePreview();
}

function clearObjectUrls() {
  objectUrls.forEach(url => URL.revokeObjectURL(url));
  objectUrls = [];
}

function selectedImageUrl() {
  return objectUrls[0] || '';
}

function makeImageOrPlaceholder(className = '') {
  const url = selectedImageUrl();
  if (url) {
    const img = document.createElement('img');
    img.className = `mock-image ${className}`.trim();
    img.src = url;
    img.alt = '선택 이미지 미리보기';
    return img;
  }
  const div = document.createElement('div');
  div.className = `mock-placeholder ${className}`.trim();
  div.textContent = '이미지를 선택하면 여기에 표시됩니다.';
  return div;
}

function renderLivePreview() {
  const type = currentType();
  const title = e.titleInput.value.trim() || '방 제목';
  e.livePreview.innerHTML = '';

  if (type === 'chat') {
    const wrap = document.createElement('div');
    wrap.className = 'mock-chat';
    const head = document.createElement('div');
    head.className = 'mock-chat-head';
    const h = document.createElement('strong');
    h.textContent = title;
    const sub = document.createElement('div');
    sub.className = 'helper';
    sub.textContent = `${e.publisherName.value.trim() || '이미지 게시자'} · ${e.ownerName.value.trim() || '게시판 주인'}`;
    head.append(h, sub);
    wrap.append(head, makeImageOrPlaceholder());
    const body = document.createElement('div');
    body.className = 'mock-chat-body';
    const left = document.createElement('div');
    left.className = 'bubble left';
    left.textContent = '이미지에 대한 첫 번째 메시지입니다.';
    const right = document.createElement('div');
    right.className = 'bubble right';
    right.textContent = '답변은 이렇게 표시됩니다.';
    body.append(left, right);
    wrap.append(body);
    e.livePreview.append(wrap);
    return;
  }

  if (type === 'camera') {
    const wrap = document.createElement('div');
    wrap.className = 'mock-camera';
    wrap.append(makeImageOrPlaceholder());
    const overlay = document.createElement('div');
    overlay.className = 'camera-overlay';
    overlay.innerHTML = '<div class="camera-top"><span>⚡</span><strong></strong><span>⚙</span></div><div class="camera-focus">＋</div><div class="camera-bottom"><div class="helper">사진 · 인물 · 비디오</div><div class="shutter"></div></div>';
    $('strong', overlay).textContent = title;
    wrap.append(overlay);
    e.livePreview.append(wrap);
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'mock-feed';
  const head = document.createElement('div');
  head.className = 'mock-feed-head';
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  const user = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = e.displayName.value.trim() || '오늘의 기록';
  const id = document.createElement('div');
  id.className = 'helper';
  id.textContent = e.userId.value.trim() || '@daily_moment';
  user.append(name, id);
  head.append(avatar, user);
  wrap.append(head, makeImageOrPlaceholder());
  const copyBox = document.createElement('div');
  copyBox.className = 'mock-feed-copy';
  const actions = document.createElement('div');
  actions.className = 'mock-feed-actions';
  actions.textContent = '♡ ◯ ↗';
  const likes = document.createElement('strong');
  likes.textContent = '좋아요 수는 자동 결정';
  const body = document.createElement('p');
  body.textContent = e.caption.value.trim() || '게시글 본문이 여기에 표시됩니다.';
  copyBox.append(actions, likes, body);
  wrap.append(copyBox);
  e.livePreview.append(wrap);
}

function renderFilePreview() {
  clearObjectUrls();
  const files = [...e.images.files];
  e.filePreview.innerHTML = '';
  if (files.length > 5) {
    alert('이미지는 최대 5장입니다.');
    e.images.value = '';
    renderLivePreview();
    return;
  }
  files.forEach(file => {
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    const item = document.createElement('div');
    item.className = 'file-item';
    const img = document.createElement('img');
    img.src = url;
    img.alt = file.name;
    const name = document.createElement('span');
    name.textContent = file.name;
    item.append(img, name);
    e.filePreview.append(item);
  });
  renderLivePreview();
}

e.loginForm.onsubmit = event => {
  event.preventDefault();
  password = e.password.value;
  sessionStorage.setItem('chat-admin-password', password);
  load();
};

e.lock.onclick = () => {
  password = '';
  sessionStorage.removeItem('chat-admin-password');
  showLogin();
};

e.roomTypeInputs.forEach(input => input.addEventListener('change', syncConditionalFields));
e.regenerateCode.onclick = setCode;
e.images.onchange = renderFilePreview;
[e.titleInput, e.publisherName, e.ownerName, e.displayName, e.userId, e.caption].forEach(input => input.addEventListener('input', renderLivePreview));

e.createForm.onsubmit = async event => {
  event.preventDefault();
  if (e.images.files.length > 5) return alert('이미지는 최대 5장입니다.');
  if (currentType() === 'chat') {
    const limitInput = e.createForm.querySelector('[name="messageLimit"]');
    const imageCount = e.images.files.length;
    if (Number(limitInput.value) < imageCount) {
      limitInput.value = imageCount;
      return alert(`채팅 제한은 첨부 이미지 수(${imageCount}) 이상이어야 합니다. 제한값을 ${imageCount}회로 조정했습니다.`);
    }
  }
  const form = new FormData(e.createForm);
  e.createButton.disabled = true;
  try {
    const payload = await api({ method: 'POST', body: form });
    const url = roomUrl(payload.room.id);
    e.createdUrl.value = url;
    e.iframe.value = iframeCode(url, payload.room.room_type);
    e.openCreated.href = url;
    e.created.hidden = false;
    e.createForm.reset();
    e.roomTypeInputs[0].checked = true;
    setCode();
    clearObjectUrls();
    e.filePreview.innerHTML = '';
    syncConditionalFields();
    toast('생성했습니다.');
    load();
  } catch (err) {
    fail(err);
  } finally {
    e.createButton.disabled = false;
  }
};

e.copyCreated.onclick = () => copy(e.createdUrl.value);
e.copyIframe.onclick = () => copy(e.iframe.value);
e.refresh.onclick = load;
e.copyModalIframe.onclick = () => copy(e.modalIframeCode.value);
$$('[data-close-modal], .close-modal').forEach(el => el.addEventListener('click', closeIframeModal));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !e.modal.hidden) closeIframeModal(); });

setCode();
syncConditionalFields();
password ? load() : showLogin();
