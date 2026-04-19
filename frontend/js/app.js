// ========== 状态 ==========
const API = '/api';
let token = localStorage.getItem('ph_token');
let currentUser = null;
let currentSpots = [];
let currentBorrows = [];
let profileQR = '';
let _notifyBorrow = null;

// ========== 路由 ==========
function navigate(page) {
  if (!currentUser && !['login','about'].includes(page)) { page = 'login'; }
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-tab').forEach(t => {
    const isActive = t.dataset.page === page;
    t.classList.toggle('text-neutral-900', isActive);
    t.classList.toggle('text-neutral-400', !isActive);
  });

  const nav = document.getElementById('bottom-nav');
  const showNav = currentUser && !['login', 'profile', 'about'].includes(page);
  nav.classList.toggle('hidden', !showNav);

  if (page === 'home') { loadNearbySpots(); loadMySpots(); loadMyBorrows(); const ms = document.getElementById('my-section'); if (currentUser && ms) ms.classList.remove('hidden'); }
  if (page === 'publish') { loadPublishSpots(); }
  if (page === 'records') { loadRecords(); }

  window.location.hash = page === 'home' ? '' : page;
}

// ========== 初始化 ==========
async function init() {
  const hash = window.location.hash.replace('#', '') || 'home';
  const params = new URLSearchParams(window.location.search);
  if (params.get('token')) {
    token = params.get('token');
    localStorage.setItem('ph_token', token);
    window.history.replaceState({}, '', '/');
  }

  if (token) {
    await loadUser();
    if (currentUser && !currentUser.building) {
      loadProfile();
      navigate('profile');
      return;
    }
    if (currentUser) { navigate(hash); return; }
  }
  // 未登录也可访问的页面
  if (['about'].includes(hash)) { navigate(hash); return; }
  navigate('login');
  loadTestAccounts();
}

// ========== 用户 ==========
async function loadUser() {
  try {
    const res = await api('GET', '/me');
    currentUser = res;
    renderHeader();
  } catch {
    token = null; localStorage.removeItem('ph_token'); currentUser = null; renderHeader();
  }
}

function renderHeader() {
  const el = document.getElementById('header-right');
  const aboutBtn = `<button onclick="navigate('about')" class="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">关于</button>`;
  if (!currentUser) {
    el.innerHTML = `<div class="flex items-center gap-3">${aboutBtn}<button onclick="navigate('login')" class="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">登录</button></div>`;
    return;
  }
  el.innerHTML = `<div class="flex items-center gap-3">
    <button onclick="navigate('profile');loadProfile()" class="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">${currentUser.nickname || '邻居'} ›</button>
    ${aboutBtn}
    <button onclick="handleLogout()" class="text-xs text-neutral-400 hover:text-red-500 transition-colors">退出</button>
  </div>`;
}

function handleLogout() {
  token = null; currentUser = null; localStorage.removeItem('ph_token');
  renderHeader(); navigate('login'); loadTestAccounts(); toast('已退出登录');
}

// ========== 微信登录 ==========
function wechatLogin() {
  const redirectUri = encodeURIComponent(window.location.origin + '/api/auth/wechat/callback');
  window.location.href = `${API}/auth/wechat?redirect_uri=${redirectUri}`;
}

// ========== 测试面板 ==========
async function loadTestAccounts() {
  try {
    const res = await api('GET', '/test/accounts');
    const el = document.getElementById('test-accounts');
    if (!res || !res.length) { el.innerHTML = '<div class="text-xs text-amber-600">暂无测试账号</div>'; return; }
    el.innerHTML = res.map(u => `<button onclick="testLogin('${u.phone}')" class="w-full text-left px-3 py-2 rounded-lg bg-white hover:bg-amber-100 transition-colors text-xs flex items-center justify-between">
      <span>${u.nickname} (${u.phone})</span>
      <span class="text-amber-500">→ 登录</span>
    </button>`).join('');
  } catch { document.getElementById('test-accounts').innerHTML = '<div class="text-xs text-amber-600">测试面板加载失败</div>'; }
}

async function testLogin(phone) {
  try {
    const res = await api('POST', '/test/login', { phone });
    token = res.token;
    localStorage.setItem('ph_token', token);
    await loadUser();
    if (!currentUser.building) { loadProfile(); navigate('profile'); }
    else { navigate('home'); }
    toast('测试登录成功');
    startGuide(); // 显示新用户引导
  } catch (e) { toast(e.message || '登录失败', 'error'); }
}

// ========== 完善信息 ==========
let allBuildings = [];
let allZones = [];
let selectedZone = '';

async function loadProfile() {
  // 显示不可改信息
  document.getElementById('profile-display-name').textContent = currentUser?.nickname || '未设置昵称';
  document.getElementById('profile-display-phone').textContent = currentUser?.phone || '';
  if (currentUser?.avatar) {
    document.getElementById('profile-avatar').src = currentUser.avatar;
    document.getElementById('profile-avatar').classList.remove('hidden');
    document.getElementById('profile-avatar-default').classList.add('hidden');
  } else {
    document.getElementById('profile-avatar').classList.add('hidden');
    document.getElementById('profile-avatar-default').classList.remove('hidden');
  }

  // 回显可编辑字段
  if (currentUser?.wechat_id) document.getElementById('profile-wechat-id').value = currentUser.wechat_id;
  if (currentUser?.contact_phone) document.getElementById('profile-contact-phone').value = currentUser.contact_phone;
  if (currentUser?.qr_alipay) document.getElementById('profile-alipay-account').value = currentUser.qr_alipay;
  if (currentUser?.qr_wechat) {
    profileQR = currentUser.qr_wechat;
    document.getElementById('profile-qr-img').src = currentUser.qr_wechat;
    document.getElementById('profile-qr-img').classList.remove('hidden');
    document.getElementById('profile-qr-placeholder').classList.add('hidden');
  }

  // 楼栋
  allBuildings = await api('GET', '/buildings');
  const sel = document.getElementById('profile-building');
  sel.innerHTML = '<option value="">选择楼栋</option>' + allBuildings.map(b => `<option value="${b.name}" ${currentUser?.building===b.name?'selected':''}>${b.name}</option>`).join('');
  sel.onchange = () => loadUnits(sel.value);
  if (currentUser?.building) { loadUnits(currentUser.building); if (currentUser.unit) document.getElementById('profile-unit').value = currentUser.unit; }

  // 区域
  allZones = await api('GET', '/zones');
  document.getElementById('profile-zones').innerHTML = allZones.map(z => `
    <button onclick="selectZone('${z.code}', this)" class="zone-btn py-2 rounded-xl border border-neutral-200 text-sm font-medium hover:border-neutral-400 transition-colors ${currentUser?.preferred_zone===z.code?'bg-neutral-900 text-white border-neutral-900':''}" data-code="${z.code}">${z.code}</button>
  `).join('');
  if (currentUser?.preferred_zone) selectedZone = currentUser.preferred_zone;
}

function loadUnits(buildingName) {
  const sel = document.getElementById('profile-unit');
  const building = allBuildings.find(b => b.name === buildingName);
  if (!building) { sel.innerHTML = '<option value="">先选择楼栋</option>'; return; }
  sel.innerHTML = building.units.split(',').map(u => `<option value="${u}" ${currentUser?.unit===u?'selected':''}>${u}</option>`).join('');
}

function selectZone(code, btn) {
  selectedZone = code;
  document.querySelectorAll('.zone-btn').forEach(b => { b.classList.remove('bg-neutral-900','text-white','border-neutral-900'); b.classList.add('border-neutral-200'); });
  btn.classList.add('bg-neutral-900','text-white','border-neutral-900'); btn.classList.remove('border-neutral-200');
}

function previewProfileQR(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    profileQR = e.target.result;
    document.getElementById('profile-qr-img').src = profileQR;
    document.getElementById('profile-qr-img').classList.remove('hidden');
    document.getElementById('profile-qr-placeholder').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  const building = document.getElementById('profile-building').value;
  const unit = document.getElementById('profile-unit').value;
  const wechatId = document.getElementById('profile-wechat-id').value.trim();
  const contactPhone = document.getElementById('profile-contact-phone').value.trim();
  const alipayAccount = document.getElementById('profile-alipay-account').value.trim();


  if (!building) return toast('请选择楼栋', 'error');
  if (!selectedZone) return toast('请选择常用停车区域', 'error');
  if (!alipayAccount && !profileQR) return toast('请至少填写一个收款方式', 'error');

  try {
    await api('PUT', '/me', {
      building, unit, preferred_zone: selectedZone,
      wechat_id: wechatId, contact_phone: contactPhone,
      qr_alipay: alipayAccount, qr_wechat: profileQR
    });
    await loadUser();
    navigate('home');
    toast('信息已保存');
  } catch (e) { toast(e.message || '保存失败', 'error'); }
}

// ========== 搜索 ==========
function handleSearch(query) {
  const container = document.getElementById('search-results');
  if (!query || query.length < 2) { container.classList.add('hidden'); return; }
  api('GET', `/spots/search?q=${encodeURIComponent(query)}`).then(results => {
    if (!results.length) { 
      container.innerHTML = renderEmptyState(emptyStates.searchNoResult(query));
      container.classList.remove('hidden');
      return; 
    }
    container.innerHTML = results.map(s => `
      <div class="flex items-center justify-between p-3 border-b border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-50" onclick="showSpotFromSearch(${s.id})">
        <div><span class="text-sm font-medium">${s.spot_code}</span><span class="text-xs ml-2 ${s.status==='available'?'text-emerald-600':s.status==='occupied'?'text-red-500':'text-neutral-400'}">${statusText(s.status)}</span></div>
        <span class="text-xs text-neutral-400">${s.zone} 区</span>
      </div>`).join('');
    container.classList.remove('hidden');
  }).catch(e => toast(e.message || '搜索失败', 'error'));
}

async function showSpotFromSearch(id) {
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').classList.add('hidden');
  try { const spot = await api('GET', `/spots/${id}`); currentSpots = [spot]; showSpotDetail(id); }
  catch (e) { toast('获取车位详情失败', 'error'); }
}

// ========== 附近可借车位 ==========
async function loadNearbySpots() {
  if (!currentUser) return;
  try {
    const spots = await api('GET', '/spots/nearby?limit=5');
    currentSpots = spots;
    const el = document.getElementById('nearby-spots');
    if (!el) return;
    if (!spots.length) { 
      el.innerHTML = renderEmptyState(emptyStates.noNearby);
      return; 
    }
    el.innerHTML = spots.map(s => `
      <div class="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-50" onclick="showSpotDetail(${s.id})">
        <div>
          <span class="text-sm font-medium">${s.spot_code}</span>
          <span class="text-xs ml-2 text-neutral-400">${s.owner_name||''} ${s.owner_building||''}</span>
          ${s.zone===currentUser.preferred_zone?'<span class="text-xs ml-1 text-amber-600"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" class="inline text-amber-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> 同区域</span>':''}
        </div>
        <span class="text-sm font-semibold text-emerald-600">¥${s.price_hour}/h</span>
      </div>`).join('');
  } catch (e) { toast(e.message || '加载失败', 'error'); }
}

// ========== 车位详情 ==========
function showSpotDetail(id) {
  const spot = currentSpots.find(s => s.id === id);
  if (!spot) return;
  document.getElementById('modal-title').textContent = spot.spot_code;
  document.getElementById('modal-body').innerHTML = `<div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-sm text-neutral-500">状态</span>
      <span class="text-sm font-medium ${spot.status==='available'?'text-emerald-600':spot.status==='occupied'?'text-red-600':'text-neutral-400'}">${statusText(spot.status)}</span>
    </div>
    <div class="flex items-center justify-between">
      <span class="text-sm text-neutral-500">区域</span>
      <span class="text-sm font-medium">${spot.zone} 区</span>
    </div>
    ${spot.owner_name?`<div class="flex items-center justify-between"><span class="text-sm text-neutral-500">业主</span><span class="text-sm font-medium">${spot.owner_name}（${spot.owner_building||''}${spot.owner_unit||''}）</span></div>`:''}
    ${spot.status==='available'?`<div class="flex items-center justify-between"><span class="text-sm text-neutral-500">价格</span><span class="text-sm font-medium text-amber-600">¥${spot.price_hour}/时（24h封顶 ¥${spot.price_cap}）</span></div>`:''}
    ${spot.notes?`<div class="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100"><div class="text-xs text-amber-700 font-medium mb-1">业主备注</div><div class="text-sm text-amber-800">${spot.notes}</div></div>`:''}
  </div>`;
  let actions = '';
  if (spot.status === 'available' && currentUser) {
    actions = `<input id="borrow-plate" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm outline-none focus:border-neutral-400 mb-2" placeholder="车牌号（必填，如 浙A·12345）" required>
      <button onclick="borrowSpot(${spot.id})" class="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">申请使用此车位</button>`;
  } else if (spot.status === 'available' && !currentUser) {
    actions = `<button onclick="closeModal();navigate('login')" class="w-full py-3 rounded-xl bg-neutral-900 text-white text-sm font-semibold">登录后可借用</button>`;
  }
  document.getElementById('modal-actions').innerHTML = actions;
  document.getElementById('modal-spot').classList.remove('hidden');
}

async function borrowSpot(id) {
  if (!currentUser) return toast('请先登录', 'error');
  const plate = document.getElementById('borrow-plate')?.value?.trim() || '';
  if (!plate) return toast('请填写车牌号', 'error');
  try {
    const res = await api('POST', '/borrows', { spot_id: id, plate });
    closeModal();
    toast(res.notice || '申请成功！已通知车位主人，请等待确认');
    loadMyBorrows(); loadRecords();
  } catch (e) {
    const msg = e.message || '申请失败';
    if (msg.includes('已申请过')) toast('你已申请过该车位，等待车主确认中', 'error');
    else if (msg.includes('不可用')) toast('该车位当前不可用', 'error');
    else if (msg.includes('自己')) toast('不能借用自己发布的车位', 'error');
    else if (msg.includes('已被其他人')) toast('该车位已被其他人申请', 'error');
    else toast(msg, 'error');
  }
}

// ========== 我的车位 ==========
async function loadMySpots() {
  try {
    const res = await api('GET', '/spots/mine');
    const el = document.getElementById('my-spots');
    if (!res.length) { 
      el.innerHTML = renderEmptyState(emptyStates.noSpots);
      return; 
    }
    el.innerHTML = res.map(s => `<div class="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
      <div><span class="text-sm font-medium">${s.spot_code}</span><span class="text-xs ml-2 text-neutral-400">${s.status==='available'?'已发布':'未发布'}</span></div>
      <div class="flex gap-2">${s.status==='available'?`<button onclick="unshareSpot(${s.id})" class="text-xs text-red-500">下架</button>`:`<button onclick="navigate('publish')" class="text-xs text-emerald-600">发布</button>`}</div>
    </div>`).join('') + (res.length < 2 ? `<button onclick="showVerifyModal()" id="bind-spot-btn" class="text-sm text-emerald-600 font-medium hover:text-emerald-700 mt-2">+ 绑定更多车位（最多2个）</button>` : '');
  } catch (e) { toast(e.message || '加载失败', 'error'); }
}

async function unshareSpot(id) {
  try { await api('POST', `/spots/${id}/unshare`); toast('已下架'); loadMySpots(); loadNearbySpots(); }
  catch (e) { toast(e.message, 'error'); }
}

function showVerifyModal() { if (!currentUser) return navigate('login'); document.getElementById('modal-verify').classList.remove('hidden'); }

async function submitVerify() {
  const spotCode = document.getElementById('verify-spot-code').value.trim().toUpperCase();
  if (!spotCode) return toast('请输入车位编号', 'error');
  let image = '';
  const fileInput = document.getElementById('verify-file');
  if (fileInput.files[0]) { image = await new Promise(r => { const rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsDataURL(fileInput.files[0]); }); }
  try { await api('POST', '/spots/bind', { spot_code: spotCode, contract_image: image }); closeModal(); toast('车位绑定成功！'); loadMySpots(); }
  catch (e) { toast(e.message || '提交失败', 'error'); }
}

// ========== 发布共享 ==========
async function loadPublishSpots() {
  try {
    const res = await api('GET', '/spots/mine');
    const sel = document.getElementById('publish-spot');
    if (!res.length) { sel.innerHTML = '<option value="">请先绑定车位</option>'; return; }
    sel.innerHTML = '<option value="">选择要发布的车位</option>' + res.map(s => `<option value="${s.id}">${s.spot_code}（${s.status==='available'?'已发布':'未发布'}）</option>`).join('');
    const now = new Date(); const pad = n => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    document.getElementById('publish-start').value = `${today}T09:00`;
    document.getElementById('publish-end').value = `${today}T18:00`;
  } catch (e) { toast(e.message || '加载车位失败', 'error'); }
}

async function handlePublish() {
  const spotId = document.getElementById('publish-spot').value;
  const price = parseFloat(document.getElementById('publish-price').value) || 4;
  const cap = parseFloat(document.getElementById('publish-cap').value) || 20;
  const notes = document.getElementById('publish-notes').value.trim();
  if (!spotId) return toast('请选择要发布的车位', 'error');
  // 检查用户是否有收款方式
  if (!currentUser?.qr_alipay && !currentUser?.qr_wechat) {
    return toast('请先到个人资料设置收款方式', 'error');
  }
  try {
    await api('POST', `/spots/${spotId}/share`, { price_hour: price, price_cap: cap, notes });
    toast('发布成功！'); navigate('home');
  } catch (e) { toast(e.message || '发布失败', 'error'); }
}

// ========== 借用记录 ==========
async function loadRecords() {
  try {
    const res = await api('GET', '/borrows/mine');
    currentBorrows = res;
    const el = document.getElementById('records-list');
    if (!res.length) { el.innerHTML = '<div class="text-sm text-neutral-400 text-center py-8">暂无记录</div>'; return; }
    el.innerHTML = res.map(b => {
      const isOwner = b.owner_id === currentUser.id;
      const acceptBtn = (isOwner && b.status === 'pending') ? `<button onclick="acceptBorrow(${b.id})" class="text-xs text-emerald-600 font-medium hover:text-emerald-700">确认</button>` : '';
      const doneBtn = (isOwner && b.status === 'active') ? `<button onclick="doneBorrow(${b.id})" class="text-xs text-neutral-500 font-medium hover:text-neutral-700">结束</button>` : '';
      const notifyBtn = (isOwner && b.status === 'active') ? `<button onclick="showNotifyModal(${b.id})" class="text-xs text-neutral-600 font-medium hover:text-neutral-800 mt-1 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg> 通知管家</button>` : '';
      return `<div class="py-3 border-b border-neutral-100 last:border-0">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">${b.spot_code||'车位'}</div>
            <div class="text-xs text-neutral-400">${isOwner?'被借用':'我借用'} · ${statusText(b.status)}</div>
            ${b.borrower_plate?`<div class="text-xs text-neutral-400">车牌：${b.borrower_plate}</div>`:''}
            ${b.start_time?`<div class="text-xs text-neutral-400">时间：${b.start_time.substring(5,16)}${b.end_time?' ~ '+b.end_time.substring(5,16):''}</div>`:''}
          </div>
          <div class="flex items-center gap-2">${acceptBtn} ${doneBtn}${b.total_price?'<span class="text-sm font-semibold text-neutral-900">¥'+b.total_price+'</span>':statusBadge(b.status)}</div>
        </div>
        ${notifyBtn}
      </div>`;
    }).join('');
  } catch (e) { toast(e.message || '加载失败', 'error'); }
}

async function loadMyBorrows() {
  try {
    const res = await api('GET', '/borrows/mine');
    currentBorrows = res;
    const el = document.getElementById('my-borrows');
    if (!res.length) { el.innerHTML = '<div class="text-sm text-neutral-400">暂无记录</div>'; return; }
    el.innerHTML = res.slice(0, 3).map(b => {
      const isOwner = b.owner_id === currentUser.id;
      const acceptBtn = (isOwner && b.status === 'pending') ? `<button onclick="acceptBorrow(${b.id})" class="text-xs text-emerald-600 font-medium hover:text-emerald-700">确认</button>` : '';
      const doneBtn = (isOwner && b.status === 'active') ? `<button onclick="doneBorrow(${b.id})" class="text-xs text-neutral-500 font-medium hover:text-neutral-700">结束</button>` : '';
      const notifyBtn = (isOwner && b.status === 'active') ? `<button onclick="showNotifyModal(${b.id})" class="text-xs text-neutral-600 font-medium hover:text-neutral-800 mt-1">📋 通知管家</button>` : '';
      return `<div class="py-2 border-b border-neutral-100 last:border-0">
        <div class="flex items-center justify-between">
          <div><div class="text-sm font-medium">${b.spot_code||'车位'}</div><div class="text-xs text-neutral-400">${isOwner?'被借用':'我借用'} · ${statusText(b.status)}</div></div>
          <div class="flex items-center gap-2">${acceptBtn} ${doneBtn}${b.total_price?'<span class="text-sm font-semibold text-neutral-900">¥'+b.total_price+'</span>':statusBadge(b.status)}</div>
        </div>${notifyBtn}
      </div>`;
    }).join('');
  } catch (e) { toast(e.message || '操作失败', 'error'); }
}

async function acceptBorrow(id) {
  try {
    await api('POST', `/borrows/${id}/accept`);
    toast('已确认借用！');
    loadMyBorrows(); loadRecords(); loadNearbySpots();
  } catch (e) { toast(e.message, 'error'); }
}

async function doneBorrow(id) {
  try {
    const res = await api('POST', `/borrows/${id}/done`);
    toast('借用结束，费用：¥' + (res.total_price || 0));
    loadMyBorrows(); loadRecords(); loadNearbySpots();
  } catch (e) { toast(e.message, 'error'); }
}

// ========== 通知管家 ==========
function showNotifyModal(borrowId) {
  const b = currentBorrows.find(x => x.id === borrowId);
  if (!b) return;
  _notifyBorrow = b;
  const u = currentUser;
  const plate = b.borrower_plate || '未提供';
  const start = b.start_time ? b.start_time.substring(5, 16) : '';
  const end = b.end_time ? b.end_time.substring(5, 16) : '待定';
  const timeStr = start ? `${start} ~ ${end}` : '待定';
  const text = `您好，我是${u.building}${u.unit}的业主${u.nickname}。\n我的车位 ${b.spot_code} 已借给邻居使用。\n停车时间：${timeStr}\n车牌号：${plate}\n麻烦知悉，谢谢！`;
  document.getElementById('notify-text').textContent = text;
  document.getElementById('modal-notify').classList.remove('hidden');
}

function copyNotifyText() {
  const text = document.getElementById('notify-text').textContent;
  navigator.clipboard.writeText(text).then(() => { toast('已复制，发给管家吧！'); closeModal(); }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('已复制！'); closeModal();
  });
}

// ========== 工具 ==========
function closeModal() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); }

function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `${type==='error'?'bg-red-600':'bg-neutral-900'} text-white text-sm px-4 py-2 rounded-xl shadow-lg fade-in`;
  el.textContent = msg; container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 2500);
}

function statusText(s) { return { idle:'未认领', available:'可借用', occupied:'使用中', pending:'待确认', active:'进行中', done:'已完成' }[s] || s; }

function statusBadge(s) { const c = { pending:'text-amber-600', active:'text-emerald-600', done:'text-neutral-400' }; return `<span class="${c[s]||''}">${statusText(s)}</span>`; }

async function api(method, path, body) {
  const opts = { method, headers: {} };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) { const err = await res.json().catch(() => ({ error: '请求失败' })); throw new Error(err.error); }
  return res.json();
}

// ========== 启动 ==========
init();