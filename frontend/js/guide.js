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

// guide.js 的 renderEmptyState/emptyStates 已移至 utils.js
// handleError 已在各模块中直接处理