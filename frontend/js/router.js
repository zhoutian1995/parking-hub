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

// ========== 启动 ==========
init();
