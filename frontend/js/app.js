// ========== 状态 ==========
const API = '/api';
let token = localStorage.getItem('ph_token');
let currentUser = null;
let zoneStats = {}; // { E: {total, available, occupied}, F: {...}, G: {...} }
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
  }
  await loadZoneStats();
  renderZoneCards();
}

// ========== 用户 ==========
async function loadUser() {
  try {
    const res = await api('GET', '/me');
    currentUser = res;
    renderHeader();
    document.getElementById('my-section').classList.remove('hidden');
    loadMySpots();
    loadMyBorrows();
  } catch {
    token = null;
    localStorage.removeItem('ph_token');
    currentUser = null;
    renderHeader();
  }
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

// ========== 区域统计 ==========
async function loadZoneStats() {
  try {
    const res = await api('GET', '/spots/stats');
    // res 格式: { E: {total, available, occupied}, F: {...}, G: {...}, all: {total, available, occupied} }
    zoneStats = res;
    document.getElementById('stat-available').textContent = res.all?.available || 0;
    document.getElementById('stat-occupied').textContent = res.all?.occupied || 0;
    document.getElementById('stat-total').textContent = res.all?.total || 0;
  } catch {
    document.getElementById('stat-available').textContent = '-';
    document.getElementById('stat-occupied').textContent = '-';
    document.getElementById('stat-total').textContent = '-';
  }
}

function renderZoneCards() {
  const container = document.getElementById('zone-cards');
  const zones = ['E', 'F', 'G'];
  const zoneNames = { E: 'E 区', F: 'F 区', G: 'G 区' };
  const zoneColors = { E: 'emerald', F: 'blue', F: 'blue', G: 'amber' };

  container.innerHTML = zones.map(z => {
    const s = zoneStats[z] || { total: 0, available: 0, occupied: 0 };
    const idle = s.total - s.available - s.occupied;
    return `
      <div class="zone-card bg-white rounded-2xl border border-neutral-200/50 p-5 cursor-pointer" onclick="enterZone('${z}')">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-neutral-900">${zoneNames[z]}</h3>
            <div class="flex items-center gap-4 mt-2">
              <span class="text-xs text-neutral-400">共 <span class="font-semibold text-neutral-700">${s.total}</span> 个</span>
              <span class="text-xs text-emerald-600">${s.available} 可借用</span>
              <span class="text-xs text-red-500">${s.occupied} 使用中</span>
            </div>
          </div>
          <iconify-icon icon="solar:alt-arrow-right-linear" class="text-neutral-300 text-xl"></iconify-icon>
        </div>
      </div>
    `;
  }).join('');
}

// ========== 进入区域 ==========
async function enterZone(zone) {
  document.getElementById('view-home').classList.add('hidden');
  document.getElementById('view-zone').classList.remove('hidden');
  document.getElementById('zone-title').textContent = zone + ' 区';
  await loadSpots(zone);
}

function goHome() {
  document.getElementById('view-home').classList.remove('hidden');
  document.getElementById('view-zone').classList.add('hidden');
  loadZoneStats(); // 刷新统计
}

async function loadSpots(zone) {
  currentSpots = await api('GET', `/spots?zone=${zone}`);
  renderSpots();
}

function renderSpots() {
  const container = document.getElementById('spots-container');
  if (!currentSpots.length) {
    container.innerHTML = '<div class="text-center text-neutral-400 text-sm py-8">暂无车位数据</div>';
    return;
  }
  container.innerHTML = `<div class="spot-grid">${currentSpots.map(s => `
    <div class="spot-cell ${s.status}" onclick="showSpotDetail(${s.id})" title="${s.spot_code}">
      ${s.spot_code.split('-')[1]}
    </div>
  `).join('')}</div>`;
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
      <div class="flex items-center justify-between p-3 border-b border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-50" onclick="showSpotFromSearch(${s.id}, '${s.zone}')">
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

async function showSpotFromSearch(id, zone) {
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').classList.add('hidden');
  // 加载该区域的车位数据然后显示详情
  currentSpots = await api('GET', `/spots?zone=${zone}`);
  showSpotDetail(id);
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
    const spot = currentSpots.find(s => s.id === id);
    if (spot) loadSpots(spot.zone);
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
  await api('POST', `/spots/${id}/share`);
  loadMySpots();
  loadZoneStats();
}

async function unshareSpot(id) {
  await api('POST', `/spots/${id}/unshare`);
  loadMySpots();
  loadZoneStats();
}

function showVerifyModal() {
  if (!currentUser) return showLoginModal();
  document.getElementById('modal-verify').classList.remove('hidden');
}

async function submitVerify() {
  const spotCode = document.getElementById('verify-spot-code').value.trim().toUpperCase();
  const fileInput = document.getElementById('verify-file');
  if (!spotCode) return alert('请输入车位编号');
  if (!fileInput.files[0]) return alert('请上传车位租售合同照片');

  const reader = new FileReader();
  reader.onload = async (e) => {
    const image = e.target.result;
    try {
      await api('POST', '/spots/bind', { spot_code: spotCode, contract_image: image });
      closeModal();
      alert('提交成功！AI 正在验证合同，通过后自动绑定。');
      loadMySpots();
    } catch (e) {
      alert(e.message || '提交失败');
    }
  };
  reader.readAsDataURL(fileInput.files[0]);
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
    el.innerHTML = res.map(b => `
      <div class="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
        <div>
          <div class="text-sm font-medium">${b.spot_code}</div>
          <div class="text-xs text-neutral-400">${b.borrower_id === currentUser.id ? '我借用' : '被借用'} · ${statusText(b.status)}</div>
        </div>
        <div class="text-sm font-semibold text-neutral-900">${b.total_price ? '¥' + b.total_price : statusBadge(b.status)}</div>
      </div>
    `).join('');
  } catch {}
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

// ========== 启动 ==========
init();
