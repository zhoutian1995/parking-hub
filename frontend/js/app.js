// ========== 状态 ==========
const API = '/api';
let token = localStorage.getItem('ph_token');
let currentUser = null;
let currentZone = 'all';
let allSpots = [];

// ========== 初始化 ==========
async function init() {
  // 检查 URL 中的 token（微信回调）
  const params = new URLSearchParams(window.location.search);
  if (params.get('token')) {
    token = params.get('token');
    localStorage.setItem('ph_token', token);
    window.history.replaceState({}, '', '/');
  }

  if (token) {
    await loadUser();
  }

  await loadStats();
  await loadSpots();
}

// ========== 用户 ==========
async function loadUser() {
  try {
    const res = await api('GET', '/me');
    currentUser = res;
    renderHeader();
    document.getElementById('my-section').classList.remove('hidden');
    if (!currentUser.verified) {
      showVerifyPrompt();
    }
    loadMyBorrows();
  } catch {
    token = null;
    localStorage.removeItem('ph_token');
    renderHeader();
  }
}

function renderHeader() {
  const el = document.getElementById('header-right');
  if (!currentUser) {
    el.innerHTML = `<button onclick="handleLogin()" class="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">登录</button>`;
    return;
  }
  el.innerHTML = `
    <div class="flex items-center gap-2">
      ${currentUser.verified
        ? `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
            <iconify-icon icon="solar:verified-check-linear" class="text-sm"></iconify-icon> 已认证
          </span>`
        : `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">待认证</span>`
      }
      <span class="text-sm text-neutral-600">${currentUser.nickname || currentUser.phone || '邻居'}</span>
    </div>
  `;
}

async function handleLogin() {
  // 开发模式：直接用测试用户
  const res = await fetch(`${API}/wechat/login`);
  const data = await res.json();

  if (data.dev) {
    // 开发模式：模拟登录
    const nickname = prompt('输入昵称（开发模式）') || '测试邻居';
    const devRes = await fetch(`${API}/dev/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname })
    });
    const devData = await devRes.json();
    token = devData.token;
    localStorage.setItem('ph_token', token);
    await loadUser();
    return;
  }

  window.location.href = data.url;
}

async function loadMyBorrows() {
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
        <div class="text-xs text-neutral-400">${b.borrower_id === currentUser.id ? '借用' : '被借用'} · ${statusText(b.status)}</div>
      </div>
      <div class="text-sm font-semibold text-neutral-900">${b.total_price ? '¥' + b.total_price : statusBadge(b.status)}</div>
    </div>
  `).join('');
}

// ========== 统计 ==========
async function loadStats() {
  try {
    const res = await api('GET', '/admin/stats');
    document.getElementById('stat-available').textContent = res.available || 0;
    document.getElementById('stat-occupied').textContent = res.occupied || 0;
    document.getElementById('stat-total').textContent = res.spots || 0;
  } catch {
    // 非管理员看不到统计
    document.getElementById('stat-available').textContent = '?';
    document.getElementById('stat-occupied').textContent = '?';
    document.getElementById('stat-total').textContent = '?';
  }
}

// ========== 车位 ==========
async function loadSpots() {
  const url = currentZone === 'all' ? '/spots' : `/spots?zone=${currentZone}`;
  allSpots = await api('GET', url);
  renderSpots();
}

function renderSpots() {
  const container = document.getElementById('spots-container');
  if (!allSpots.length) {
    container.innerHTML = '<div class="text-center text-neutral-400 text-sm py-8">暂无车位数据</div>';
    return;
  }

  container.innerHTML = `<div class="spot-grid">${allSpots.map(s => `
    <div class="spot-cell ${s.status}" onclick="showSpotDetail(${s.id})" title="${s.spot_code} ${statusText(s.status)}">
      ${s.spot_code.split('-')[1]}
    </div>
  `).join('')}</div>`;
}

function switchZone(zone) {
  currentZone = zone;
  document.querySelectorAll('.zone-tab').forEach(el => {
    if (el.dataset.zone === zone) {
      el.className = 'zone-tab active px-4 py-2 rounded-xl text-sm font-medium bg-neutral-900 text-white';
    } else {
      el.className = 'zone-tab px-4 py-2 rounded-xl text-sm font-medium bg-neutral-100 text-neutral-500';
    }
  });
  loadSpots();
}

// ========== 车位详情 ==========
function showSpotDetail(id) {
  const spot = allSpots.find(s => s.id === id);
  if (!spot) return;

  const modal = document.getElementById('modal-spot');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const actions = document.getElementById('modal-actions');

  title.textContent = spot.spot_code;

  body.innerHTML = `
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

  if (spot.status === 'available' && currentUser && currentUser.verified) {
    actions.innerHTML = `
      <input id="borrow-plate" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm outline-none focus:border-neutral-400 mb-2" placeholder="车牌号（可选）">
      <button onclick="borrowSpot(${spot.id})" class="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">申请使用此车位</button>
    `;
  } else if (spot.status === 'available') {
    actions.innerHTML = `<p class="text-xs text-neutral-400 text-center">请先完成邻居认证后再借用</p>`;
  } else {
    actions.innerHTML = '';
  }

  modal.classList.remove('hidden');
}

async function borrowSpot(id) {
  const plate = document.getElementById('borrow-plate')?.value || '';
  await api('POST', '/borrows', { spot_id: id, plate });
  closeModal();
  alert('申请成功！等待车位主人确认');
  loadSpots();
}

async function shareSpot() {
  const code = document.getElementById('share-code').value.trim();
  if (!code) return alert('请输入车位编号');
  await api('POST', '/spots/share', { spot_code: code });
  document.getElementById('share-code').value = '';
  loadSpots();
  loadStats();
  alert('车位已发布！');
}

// ========== 认证 ==========
function showVerifyPrompt() {
  setTimeout(() => {
    document.getElementById('modal-verify').classList.remove('hidden');
  }, 1000);
}

async function submitVerify() {
  const fileInput = document.getElementById('verify-file');
  if (!fileInput.files[0]) return alert('请选择凭证照片');

  const reader = new FileReader();
  reader.onload = async (e) => {
    const image = e.target.result;
    await api('POST', '/me/verify', { image });
    closeModal();
    alert('已提交，等待管理员审核');
  };
  reader.readAsDataURL(fileInput.files[0]);
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

// ========== 开发登录接口 ==========
// 在开发模式下添加一个测试登录端点
// 这需要在 server.js 中添加

// ========== 启动 ==========
init();
