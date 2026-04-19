// ========== 新用户引导 ==========

const guideSteps = [
  {
    text: '欢迎加入 ParkingHub！\n3步开始使用你的车位',
    highlight: null, // 无高亮
    position: 'center'
  },
  {
    text: '先选择你的楼栋\n让邻居知道你在哪一幢',
    highlight: '#profile-building',
    position: 'bottom'
  },
  {
    text: '绑定你的车位\n输入车位号即可绑定',
    highlight: '#bind-spot-btn',
    position: 'top'
  },
  {
    text: '发布后邻居就能借用\n设置空闲时段和价格',
    highlight: '#publish-nav-btn',
    position: 'top'
  }
];

let currentGuideStep = 0;

function shouldShowGuide() {
  return !localStorage.getItem('ph_has_seen_guide') && currentUser;
}

function startGuide() {
  if (!shouldShowGuide()) return;
  currentGuideStep = 0;
  showGuideStep();
}

function showGuideStep() {
  const step = guideSteps[currentGuideStep];
  const overlay = document.getElementById('guide-overlay');
  const highlight = document.getElementById('guide-highlight');
  const card = document.getElementById('guide-card');
  const text = document.getElementById('guide-text');
  
  overlay.classList.remove('hidden');
  text.textContent = step.text;
  
  // 定位高亮区域
  if (step.highlight) {
    const el = document.querySelector(step.highlight);
    if (el) {
      const rect = el.getBoundingClientRect();
      highlight.style.top = `${rect.top - 8}px`;
      highlight.style.left = `${rect.left - 8}px`;
      highlight.style.width = `${rect.width + 16}px`;
      highlight.style.height = `${rect.height + 16}px`;
      highlight.classList.remove('hidden');
      
      // 滚动到高亮元素
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      highlight.classList.add('hidden');
    }
  } else {
    highlight.classList.add('hidden');
  }
  
  // 定位提示卡片
  if (step.position === 'center') {
    card.style.top = '50%';
    card.style.left = '50%';
    card.style.transform = 'translate(-50%, -50%)';
  } else if (step.position === 'bottom' && step.highlight) {
    const el = document.querySelector(step.highlight);
    if (el) {
      const rect = el.getBoundingClientRect();
      card.style.top = `${rect.bottom + 16}px`;
      card.style.left = '50%';
      card.style.transform = 'translateX(-50%)';
    }
  } else if (step.position === 'top' && step.highlight) {
    const el = document.querySelector(step.highlight);
    if (el) {
      const rect = el.getBoundingClientRect();
      card.style.top = `${rect.top - 120}px`;
      card.style.left = '50%';
      card.style.transform = 'translateX(-50%)';
    }
  }
  
  // 更新步骤指示器
  updateGuideDots();
  
  // 更新按钮文字
  const nextBtn = document.getElementById('guide-next-btn');
  if (currentGuideStep === guideSteps.length - 1) {
    nextBtn.textContent = '开始使用';
  } else {
    nextBtn.textContent = '下一步';
  }
}

function updateGuideDots() {
  const dotsContainer = document.getElementById('guide-dots');
  dotsContainer.innerHTML = '';
  
  for (let i = 0; i < guideSteps.length; i++) {
    const dot = document.createElement('div');
    dot.className = `w-2 h-2 rounded-full ${i === currentGuideStep ? 'bg-neutral-900' : 'bg-neutral-300'}`;
    dotsContainer.appendChild(dot);
  }
}

function nextGuideStep() {
  currentGuideStep++;
  if (currentGuideStep >= guideSteps.length) {
    finishGuide();
  } else {
    showGuideStep();
  }
}

function skipGuide() {
  finishGuide();
}

function finishGuide() {
  localStorage.setItem('ph_has_seen_guide', 'true');
  document.getElementById('guide-overlay').classList.add('hidden');
}

// ========== 空状态组件 ==========

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

// 各场景空状态配置
const emptyStates = {
  noSpots: {
    icon: '🅿️',
    title: '还没有绑定车位',
    description: '绑定车位后可以发布共享，让邻居借用',
    action: {
      text: '绑定车位',
      onclick: 'showVerifyModal()'
    }
  },
  noNearby: {
    icon: '🔍',
    title: '附近暂无可借车位',
    description: '当前没有邻居发布共享，试试发布你的车位？',
    action: {
      text: '发布车位',
      onclick: "navigate('publish')"
    }
  },
  noRecords: {
    icon: '📋',
    title: '还没有借用记录',
    description: '去首页看看附近有没有可借的车位吧',
    action: {
      text: '浏览车位',
      onclick: "navigate('home')"
    }
  },
  searchNoResult: (query) => ({
    icon: '😕',
    title: `未找到"${query}"`,
    description: '检查车位号是否正确，如 A050、G106',
    action: null
  }),
  noPublishSpots: {
    icon: '📤',
    title: '还没有可发布的车位',
    description: '先绑定车位，然后就能发布共享了',
    action: {
      text: '绑定车位',
      onclick: 'showVerifyModal()'
    }
  }
};

// ========== 错误处理 ==========

function handleError(error, context = '') {
  console.error(`[Error] ${context}:`, error);
  
  // 网络错误
  if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
    toast('网络连接失败，请检查网络后重试', 'error');
    return;
  }
  
  // 服务器错误
  if (error.status >= 500) {
    toast('服务器开小差了，请稍后再试', 'error');
    return;
  }
  
  // 业务错误（有错误码）
  if (error.code) {
    const messages = {
      'SPOT_ALREADY_BOUND': '该车位已被绑定',
      'BORROW_SELF_SPOT': '不能借用自己发布的车位',
      'BORROW_UNAVAILABLE': '该车位已被其他人借用',
      'INVALID_SPOT_CODE': '车位号格式不正确，如 A050',
      'SPOT_LIMIT_REACHED': '每个手机号最多绑定 2 个车位',
      'SPOT_NOT_AVAILABLE': '车位当前不可用',
      'BORROW_NOT_FOUND': '借用记录不存在',
      'BORROW_NOT_OWNER': '无权操作此借用记录',
      'BORROW_ALREADY_COMPLETED': '借用已结束'
    };
    toast(messages[error.code] || error.message || '操作失败', 'error');
    return;
  }
  
  // 默认错误
  toast(error.message || '操作失败，请重试', 'error');
}

// 更新 API 调用函数，使用统一错误处理
async function api(method, path, body = null) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    
    const res = await fetch(API + path, opts);
    const data = await res.json();
    
    if (!res.ok) {
      const error = new Error(data.message || '请求失败');
      error.status = res.status;
      error.code = data.code;
      throw error;
    }
    
    return data.data || data; // 兼容新旧格式
  } catch (error) {
    handleError(error, `${method} ${path}`);
    throw error;
  }
}