// ========== 工具函数 ==========
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function closeModal() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); }

function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `${type==='error'?'bg-red-600':'bg-neutral-900'} text-white text-sm px-4 py-2 rounded-xl shadow-lg fade-in`;
  el.textContent = msg; container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 2500);
}

function statusText(s) { return { idle:'未认领', available:'可借用', occupied:'使用中', pending:'待确认', active:'进行中', done:'已完成', rejected:'已拒绝', cancelled:'已取消' }[s] || s; }

function statusBadge(s) { const c = { pending:'text-amber-600', active:'text-emerald-600', done:'text-neutral-400', rejected:'text-red-500', cancelled:'text-neutral-400' }; return `<span class="${c[s]||''}">${statusText(s)}</span>`; }

// ========== 空状态 ==========
const emptyStates = {
  noNearby: {
    icon: '🔍',
    title: '附近暂无可借车位',
    description: '当前没有邻居发布共享，试试发布你的车位？',
    action: { text: '发布车位', onclick: "navigate('publish')" }
  },
  noSpots: {
    icon: '🅿️',
    title: '还没有绑定车位',
    description: '绑定车位后可以发布共享，让邻居借用',
    action: { text: '绑定车位', onclick: 'showVerifyModal()' }
  },
  noRecords: {
    icon: '📋',
    title: '还没有借用记录',
    description: '去首页看看附近有没有可借的车位吧',
    action: { text: '浏览车位', onclick: "navigate('home')" }
  },
  searchNoResult: (q) => ({
    icon: '😕',
    title: `未找到"${q}"`,
    description: '检查车位号是否正确，如 A050、G106',
    action: null
  }),
  noPublishSpots: {
    icon: '📤',
    title: '还没有可发布的车位',
    description: '先绑定车位，然后就能发布共享了',
    action: { text: '绑定车位', onclick: 'showVerifyModal()' }
  }
};

function renderEmptyState({ icon, title, description, action }) {
  return `
    <div class="flex flex-col items-center justify-center py-8 px-4">
      <div class="text-4xl mb-3">${icon}</div>
      <h3 class="text-sm font-medium text-neutral-700 mb-1">${title}</h3>
      <p class="text-xs text-neutral-400 text-center mb-4 max-w-xs">${description}</p>
      ${action ? `<button onclick="${action.onclick}" class="px-4 py-2 bg-neutral-900 text-white text-xs rounded-lg hover:bg-neutral-800 transition-colors">${action.text}</button>` : ''}
    </div>
  `;
}
