// ========== 状态 ==========
const API = '/api';
let token = localStorage.getItem('ph_token');
let currentUser = null;
let currentSpots = [];

// ========== 初始化 ==========
async function init() {
  // 检查 URL 中的 token
  const params = new URLSearchParams(window.location.search);
  if (params.get('token')) {
    token = params.get('token');
    localStorage.setItem('ph_token', token);
    window.history.replaceState({}, '', '/');
  }
  if (token) {
    await loadUser();
  } else {
    showView('home');
  }
}

// ========== 用户 ==========
async function loadUser() {
  try {
    const res = await api('GET', '/me');
    currentUser = res;
    renderHeader();
    // 首次登录（没填楼栋）→ 显示完善信息页
    if (!currentUser.building) {
      await loadProfile();
      showView('profile');
      return;
    }
    showView('home');
    document.getElementById('my-section').classList.remove('hidden');
    loadMySpots();
    loadMyBorrows();
    loadNearbySpots();
  } catch {
    token = null;
    localStorage.removeItem('ph_token');
    currentUser = null;
    renderHeader();
    showView('home');
  }
}

function showView(name) {
  ['home', 'zone', 'profile'].forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById('view-' + name);
  if (target) target.classList.remove('hidden');
}

function renderHeader() {
  const el = document.getElementById('header-right');
  if (!currentUser) {
    el.innerHTML = `<button onclick="showLoginModal()" class="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">登录</button>`;
    return;
  }
  el.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="text-sm text-neutral-600">${currentUser.nickname || '邻居'}</span>
    </div>
  `;
}

function showLoginModal() {
  if (currentUser) return;
  document.getElementById('modal-login').classList.remove('hidden');
}

async function handleLogin() {
  const phone = document.getElementById('login-phone').value.trim();
  const nickname = document.getElementById('login-nickname').value.trim();
  if (!phone || !/^1\d{10}$/.test(phone)) {
    return alert('请输入正确的11位手机号');
  }
  if (!nickname) {
    return alert('请输入昵称（如：3栋502小王）');
  }
  try {
    const res = await api('POST', '/auth/login', { phone, nickname });
    token = res.token;
    localStorage.setItem('ph_token', token);
    closeModal();
    await loadUser();
  } catch (e) {
    alert(e.message || '登录失败');
  }
}

// ========== 搜索 ==========
function handleSearch(query) {
  const container = document.getElementById('search-results');
  if (!query || query.length < 2) {
    container.classList.add('hidden');
    return;
  }
  // 搜索需要调 API
  api('GET', `/spots/search?q=${encodeURIComponent(query)}`).then(results => {
    if (!results.length) {
      container.innerHTML = '<div class="p-4 text-sm text-neutral-400 text-center">未找到</div>';
      container.classList.remove('hidden');
      return;
    }
    container.innerHTML = results.map(s => `
      <div class="flex items-center justify-between p-3 border-b border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-50" onclick="showSpotFromSearch(${s.id})">
        <div>
          <span class="text-sm font-medium">${s.spot_code}</span>
          <span class="text-xs ml-2 ${s.status === 'available' ? 'text-emerald-600' : s.status === 'occupied' ? 'text-red-500' : 'text-neutral-400'}">${statusText(s.status)}</span>
        </div>
        <span class="text-xs text-neutral-400">${s.zone} 区</span>
      </div>
    `).join('');
    container.classList.remove('hidden');
  });
}

async function showSpotFromSearch(id) {
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').classList.add('hidden');
  // 通过 API 获取车位详情
  try {
    const spot = await api('GET', `/spots/${id}`);
    currentSpots = [spot];
    showSpotDetail(id);
  } catch (e) {
    alert('获取车位详情失败');
  }
}

// ========== 车位详情 ==========
function showSpotDetail(id) {
  const spot = currentSpots.find(s => s.id === id);
  if (!spot) return;

  const modal = document.getElementById('modal-spot');
  document.getElementById('modal-title').textContent = spot.spot_code;

  document.getElementById('modal-body').innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-sm text-neutral-500">状态</span>
        <span class="text-sm font-medium ${spot.status === 'available' ? 'text-emerald-600' : spot.status === 'occupied' ? 'text-red-600' : 'text-neutral-400'}">${statusText(spot.status)}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-sm text-neutral-500">区域</span>
        <span class="text-sm font-medium">${spot.zone} 区</span>
      </div>
      ${spot.owner_name ? `
      <div class="flex items-center justify-between">
        <span class="text-sm text-neutral-500">车主</span>
        <span class="text-sm font-medium">${spot.owner_name}</span>
      </div>` : ''}
      ${spot.status === 'available' ? `
      <div class="flex items-center justify-between">
        <span class="text-sm text-neutral-500">价格</span>
        <span class="text-sm font-medium text-amber-600">¥${spot.price_hour}/时（封顶 ¥${spot.price_cap}）</span>
      </div>` : ''}
    </div>
  `;

  let actions = '';
  if (spot.status === 'available' && currentUser) {
    actions = `
      <input id="borrow-plate" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm outline-none focus:border-neutral-400 mb-2" placeholder="车牌号（可选）">
      <button onclick="borrowSpot(${spot.id})" class="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">申请使用此车位</button>
    `;
  } else if (spot.status === 'available' && !currentUser) {
    actions = `<button onclick="closeModal();showLoginModal()" class="w-full py-3 rounded-xl bg-neutral-900 text-white text-sm font-semibold">登录后可借用</button>`;
  }
  document.getElementById('modal-actions').innerHTML = actions;
  modal.classList.remove('hidden');
}

async function borrowSpot(id) {
  if (!currentUser) return alert('请先登录');
  const plate = document.getElementById('borrow-plate')?.value || '';
  try {
    await api('POST', '/borrows', { spot_id: id, plate });
    closeModal();
    alert('申请成功！等待车位主人确认');
    loadNearbySpots();
  } catch (e) {
    alert(e.message);
  }
}

// ========== 我的车位 ==========
async function loadMySpots() {
  try {
    const res = await api('GET', '/spots/mine');
    const el = document.getElementById('my-spots');
    if (!res.length) {
      el.innerHTML = `
        <div class="text-sm text-neutral-400 mb-2">暂未绑定车位</div>
        <button onclick="showVerifyModal()" class="text-sm text-emerald-600 font-medium hover:text-emerald-700">+ 绑定车位</button>
      `;
      return;
    }
    el.innerHTML = res.map(s => `
      <div class="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
        <div>
          <span class="text-sm font-medium">${s.spot_code}</span>
          <span class="text-xs ml-2 text-neutral-400">${s.status === 'available' ? '已发布' : '未发布'}</span>
        </div>
        <div class="flex gap-2">
          ${s.status === 'available'
            ? `<button onclick="unshareSpot(${s.id})" class="text-xs text-red-500">下架</button>`
            : `<button onclick="shareSpot(${s.id})" class="text-xs text-emerald-600">发布</button>`
          }
        </div>
      </div>
    `).join('') + (res.length < 2 ? `
      <button onclick="showVerifyModal()" class="text-sm text-emerald-600 font-medium hover:text-emerald-700 mt-2">+ 绑定更多车位（最多2个）</button>
    ` : '');
  } catch {}
}

async function shareSpot(id) {
  const price = prompt('设置小时价格（默认4元）：', '4');
  if (price === null) return;
  const cap = prompt('设置封顶价格（默认20元）：', '20');
  if (cap === null) return;
  await api('POST', `/spots/${id}/share`, { price_hour: parseFloat(price) || 4, price_cap: parseFloat(cap) || 20 });
  loadMySpots();
  loadNearbySpots();
}

async function unshareSpot(id) {
  await api('POST', `/spots/${id}/unshare`);
  loadMySpots();
  loadNearbySpots();
}

function showVerifyModal() {
  if (!currentUser) return showLoginModal();
  document.getElementById('modal-verify').classList.remove('hidden');
}

async function submitVerify() {
  const spotCode = document.getElementById('verify-spot-code').value.trim().toUpperCase();
  const fileInput = document.getElementById('verify-file');
  if (!spotCode) return alert('请输入车位编号');

  let image = '';
  if (fileInput.files[0]) {
    image = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(fileInput.files[0]);
    });
  }

  try {
    await api('POST', '/spots/bind', { spot_code: spotCode, contract_image: image });
    closeModal();
    alert('车位绑定成功！');
    loadMySpots();
    loadNearbySpots();
  } catch (e) {
    alert(e.message || '提交失败');
  }
}

// ========== 我的借用 ==========
async function loadMyBorrows() {
  try {
    const res = await api('GET', '/borrows/mine');
    const el = document.getElementById('my-borrows');
    if (!res.length) {
      el.innerHTML = '<div class="text-sm text-neutral-400">暂无记录</div>';
      return;
    }
    el.innerHTML = res.map(b => {
      const isOwner = b.owner_id === currentUser.id;
      const isActive = b.status === 'active';
      const notifyBtn = (isOwner && isActive) ? `
        <button onclick="copyNotifyText(${b.id})" class="text-xs text-blue-600 font-medium hover:text-blue-700 mt-1">
          📋 通知管家
        </button>
      ` : '';
      const acceptBtn = (isOwner && b.status === 'pending') ? `
        <button onclick="acceptBorrow(${b.id})" class="text-xs text-emerald-600 font-medium hover:text-emerald-700">确认</button>
      ` : '';
      const doneBtn = (isOwner && isActive) ? `
        <button onclick="doneBorrow(${b.id})" class="text-xs text-neutral-500 font-medium hover:text-neutral-700">结束</button>
      ` : '';
      return `
        <div class="py-2 border-b border-neutral-100 last:border-0">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium">${b.spot_code || '车位'}</div>
              <div class="text-xs text-neutral-400">${isOwner ? '被借用' : '我借用'} · ${statusText(b.status)}</div>
            </div>
            <div class="flex items-center gap-2">
              ${acceptBtn} ${doneBtn}
              ${b.total_price ? '<span class="text-sm font-semibold text-neutral-900">¥' + b.total_price + '</span>' : statusBadge(b.status)}
            </div>
          </div>
          ${notifyBtn}
        </div>
      `;
    }).join('');
  } catch {}
}

async function acceptBorrow(id) {
  try {
    await api('POST', `/borrows/${id}/accept`);
    alert('已确认');
    loadMyBorrows();
    loadNearbySpots();
  } catch (e) { alert(e.message); }
}

async function doneBorrow(id) {
  try {
    const res = await api('POST', `/borrows/${id}/done`);
    alert('借用结束，费用：¥' + (res.total_price || 0));
    loadMyBorrows();
    loadNearbySpots();
  } catch (e) { alert(e.message); }
}

function copyNotifyText(borrowId) {
  // Generate notification text from current borrow data
  const b = currentUser;
  const text = `您好，我是${b.building}${b.unit}的业主${b.nickname}。
我的车位已借给邻居使用。
麻烦知悉，谢谢！`;
  navigator.clipboard.writeText(text).then(() => {
    alert('已复制，发给管家吧！');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('已复制，发给管家吧！');
  });
}

// ========== 工具 ==========
function closeModal() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

function statusText(s) {
  return { idle: '未认领', available: '可借用', occupied: '使用中', pending: '待确认', active: '进行中', done: '已完成' }[s] || s;
}

function statusBadge(s) {
  const colors = { pending: 'text-amber-600', active: 'text-emerald-600', done: 'text-neutral-400' };
  return `<span class="${colors[s] || ''}">${statusText(s)}</span>`;
}

async function api(method, path, body) {
  const opts = { method, headers: {} };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error);
  }
  return res.json();
}

// ========== 完善信息页 ==========
let allBuildings = [];
let allZones = [];
let selectedZone = '';

async function loadProfile() {
  // 预填昵称
  if (currentUser?.nickname) {
    document.getElementById('profile-nickname').value = currentUser.nickname;
  }
  // 加载楼栋
  allBuildings = await api('GET', '/buildings');
  const sel = document.getElementById('profile-building');
  sel.innerHTML = '<option value="">选择楼栋</option>' +
    allBuildings.map(b => `<option value="${b.name}">${b.name}</option>`).join('');
  sel.onchange = () => loadUnits(sel.value);
  // 加载区域
  allZones = await api('GET', '/zones');
  const zoneContainer = document.getElementById('profile-zones');
  zoneContainer.innerHTML = allZones.map(z => `
    <button onclick="selectZone('${z.code}', this)"
      class="zone-btn py-2 rounded-xl border border-neutral-200 text-sm font-medium hover:border-neutral-400 transition-colors"
      data-code="${z.code}">
      ${z.code}
    </button>
  `).join('');
}

function loadUnits(buildingName) {
  const sel = document.getElementById('profile-unit');
  const building = allBuildings.find(b => b.name === buildingName);
  if (!building) {
    sel.innerHTML = '<option value="">先选择楼栋</option>';
    return;
  }
  const units = building.units.split(',');
  sel.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
}

function selectZone(code, btn) {
  selectedZone = code;
  document.querySelectorAll('.zone-btn').forEach(b => {
    b.classList.remove('bg-neutral-900', 'text-white', 'border-neutral-900');
    b.classList.add('border-neutral-200');
  });
  btn.classList.add('bg-neutral-900', 'text-white', 'border-neutral-900');
  btn.classList.remove('border-neutral-200');
}

async function submitProfile() {
  const nickname = document.getElementById('profile-nickname').value.trim();
  const building = document.getElementById('profile-building').value;
  const unit = document.getElementById('profile-unit').value;
  if (!nickname) return alert('请输入昵称');
  if (!building) return alert('请选择楼栋');
  if (!selectedZone) return alert('请选择常用停车区域');
  try {
    await api('PUT', '/me', { nickname, building, unit, preferred_zone: selectedZone });
    // 重新加载用户
    await loadUser();
  } catch (e) {
    alert(e.message || '保存失败');
  }
}

// ========== 附近可借车位 ==========
async function loadNearbySpots() {
  if (!currentUser) return;
  try {
    const spots = await api('GET', '/spots/nearby?limit=5');
    const container = document.getElementById('nearby-spots');
    if (!container) return;
    if (!spots.length) {
      container.innerHTML = '<div class="text-sm text-neutral-400 text-center py-4">暂无可借车位</div>';
      return;
    }
    container.innerHTML = spots.map(s => `
      <div class="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-50" onclick="showSpotDetail(${s.id})">
        <div>
          <span class="text-sm font-medium">${s.spot_code}</span>
          <span class="text-xs ml-2 text-neutral-400">${s.owner_name || ''} ${s.owner_building || ''}</span>
          ${s.zone === currentUser.preferred_zone ? '<span class="text-xs ml-1 text-amber-600">⭐同区域</span>' : ''}
        </div>
        <span class="text-sm font-semibold text-emerald-600">¥${s.price_hour}/h</span>
      </div>
    `).join('');
  } catch {}
}

// ========== 启动 ==========
init();
