// ========== 用户加载 ==========
async function loadUser() {
  try {
    const res = await api('GET', '/me');
    currentUser = res;
    renderHeader();
  } catch {
    token = null; localStorage.removeItem('ph_token'); currentUser = null; renderHeader();
  }
}

// ========== Header 渲染 ==========
function renderHeader() {
  const el = document.getElementById('header-right');
  const aboutBtn = `<button onclick="navigate('about')" class="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">关于</button>`;
  if (!currentUser) {
    el.innerHTML = `<div class="flex items-center gap-3">${aboutBtn}<button onclick="navigate('login')" class="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">登录</button></div>`;
    return;
  }
  el.innerHTML = `<div class="flex items-center gap-3">
<button onclick=\"navigate('profile');loadProfile()\" class=\"text-sm text-neutral-600 hover:text-neutral-900 transition-colors\">${escapeHtml(currentUser.nickname) || '邻居'} ›</button>
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
      <span>${escapeHtml(u.nickname)} (${escapeHtml(u.phone)})</span>
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
