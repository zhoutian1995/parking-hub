// ========== 借用记录（记录页） ==========
async function loadRecords() {
  try {
    const res = await api('GET', '/borrows/mine');
    currentBorrows = res;
    const el = document.getElementById('records-list');
    if (!res.length) { el.innerHTML = '<div class="text-sm text-neutral-400 text-center py-8">暂无记录</div>'; return; }
    el.innerHTML = res.map(b => {
      const isOwner = b.owner_id === currentUser.id;
      const acceptBtn = (isOwner && b.status === 'pending') ? `<button onclick="acceptBorrow(${b.id})" class="text-xs text-emerald-600 font-medium hover:text-emerald-700">确认</button>` : '';
      const rejectBtn = (isOwner && b.status === 'pending') ? `<button onclick="rejectBorrow(${b.id})" class="text-xs text-red-500 font-medium hover:text-red-700">拒绝</button>` : '';
      const cancelBtn = (!isOwner && b.status === 'pending') ? `<button onclick="cancelBorrow(${b.id})" class="text-xs text-red-500 font-medium hover:text-red-700">取消</button>` : '';
      const doneBtn = (b.status === 'active') ? `<button onclick="doneBorrow(${b.id})" class="text-xs text-neutral-500 font-medium hover:text-neutral-700">结束</button>` : '';
      const notifyBtn = (isOwner && b.status === 'active') ? `<button onclick="showNotifyModal(${b.id})" class="text-xs text-neutral-600 font-medium hover:text-neutral-800 mt-1 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg> 通知管家</button>` : '';
      return `<div class="py-3 border-b border-neutral-100 last:border-0">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">${b.spot_code||'车位'}</div>
            <div class="text-xs text-neutral-400">${isOwner?'被借用':'我借用'} · ${statusText(b.status)}</div>
            ${b.borrower_plate?`<div class="text-xs text-neutral-400">车牌：${b.borrower_plate}</div>`:''}
            ${b.start_time?`<div class="text-xs text-neutral-400">时间：${b.start_time.substring(5,16)}${b.end_time?' ~ '+b.end_time.substring(5,16):''}</div>`:''}
          </div>
          <div class="flex items-center gap-2">${acceptBtn}${rejectBtn}${cancelBtn} ${doneBtn}${b.total_price?'<span class="text-sm font-semibold text-neutral-900">¥'+b.total_price+'</span>':statusBadge(b.status)}</div>
        </div>
        ${notifyBtn}
      </div>`;
    }).join('');
  } catch (e) { toast(e.message || '加载失败', 'error'); }
}

// ========== 最近借用（首页） ==========
async function loadMyBorrows() {
  try {
    const res = await api('GET', '/borrows/mine');
    currentBorrows = res;
    const el = document.getElementById('my-borrows');
    if (!res.length) { el.innerHTML = '<div class="text-sm text-neutral-400">暂无记录</div>'; return; }
    el.innerHTML = res.slice(0, 3).map(b => {
      const isOwner = b.owner_id === currentUser.id;
      const acceptBtn = (isOwner && b.status === 'pending') ? `<button onclick="acceptBorrow(${b.id})" class="text-xs text-emerald-600 font-medium hover:text-emerald-700">确认</button>` : '';
      const rejectBtn = (isOwner && b.status === 'pending') ? `<button onclick="rejectBorrow(${b.id})" class="text-xs text-red-500 font-medium hover:text-red-700">拒绝</button>` : '';
      const cancelBtn = (!isOwner && b.status === 'pending') ? `<button onclick="cancelBorrow(${b.id})" class="text-xs text-red-500 font-medium hover:text-red-700">取消</button>` : '';
      const doneBtn = (b.status === 'active') ? `<button onclick="doneBorrow(${b.id})" class="text-xs text-neutral-500 font-medium hover:text-neutral-700">结束</button>` : '';
      const notifyBtn = (isOwner && b.status === 'active') ? `<button onclick="showNotifyModal(${b.id})" class="text-xs text-neutral-600 font-medium hover:text-neutral-800 mt-1">📋 通知管家</button>` : '';
      return `<div class="py-2 border-b border-neutral-100 last:border-0">
        <div class="flex items-center justify-between">
          <div><div class="text-sm font-medium">${b.spot_code||'车位'}</div><div class="text-xs text-neutral-400">${isOwner?'被借用':'我借用'} · ${statusText(b.status)}</div></div>
          <div class="flex items-center gap-2">${acceptBtn}${rejectBtn}${cancelBtn} ${doneBtn}${b.total_price?'<span class="text-sm font-semibold text-neutral-900">¥'+b.total_price+'</span>':statusBadge(b.status)}</div>
        </div>${notifyBtn}
      </div>`;
    }).join('');
  } catch (e) { toast(e.message || '操作失败', 'error'); }
}

// ========== 借用操作 ==========
async function acceptBorrow(id) {
  try {
    await api('POST', `/borrows/${id}/accept`);
    toast('已确认借用！');
    loadMyBorrows(); loadRecords(); loadNearbySpots();
  } catch (e) { toast(e.message, 'error'); }
}

async function rejectBorrow(id) {
  if (!confirm('确定拒绝该借用申请？')) return;
  try {
    await api('POST', `/borrows/${id}/reject`);
    toast('已拒绝');
    loadMyBorrows(); loadRecords();
  } catch (e) { toast(e.message, 'error'); }
}

async function cancelBorrow(id) {
  if (!confirm('确定取消该借用申请？')) return;
  try {
    await api('POST', `/borrows/${id}/cancel`);
    toast('已取消');
    loadMyBorrows(); loadRecords();
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
