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
          <span class=\"text-xs ml-2 text-neutral-400\">${escapeHtml(s.owner_name)||''} ${escapeHtml(s.owner_building)||''}</span>
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
  let timeInfo = '';
  if (spot.available_from && spot.available_until) {
    timeInfo = `<div class="flex items-center justify-between"><span class="text-sm text-neutral-500">空闲时段</span><span class="text-sm font-medium">${spot.available_from.substring(5,16)} ~ ${spot.available_until.substring(5,16)}</span></div>`;
  }
  document.getElementById('modal-body').innerHTML = `<div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-sm text-neutral-500">状态</span>
      <span class="text-sm font-medium ${spot.status==='available'?'text-emerald-600':spot.status==='occupied'?'text-red-600':'text-neutral-400'}">${statusText(spot.status)}</span>
    </div>
    <div class="flex items-center justify-between">
      <span class="text-sm text-neutral-500">区域</span>
      <span class="text-sm font-medium">${spot.zone} 区</span>
    </div>
    ${spot.owner_name?`<div class=\"flex items-center justify-between\"><span class=\"text-sm text-neutral-500\">业主</span><span class=\"text-sm font-medium\">${escapeHtml(spot.owner_name)}（${escapeHtml(spot.owner_building)||''}${escapeHtml(spot.owner_unit)||''}）</span></div>`:''}
    ${spot.status==='available'?`<div class="flex items-center justify-between"><span class="text-sm text-neutral-500">价格</span><span class="text-sm font-medium text-amber-600">¥${spot.price_hour}/时（24h封顶 ¥${spot.price_cap}）</span></div>`:''}
    ${timeInfo}
    ${spot.notes?`<div class=\"mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100\"><div class=\"text-xs text-amber-700 font-medium mb-1\">业主备注</div><div class=\"text-sm text-amber-800\">${escapeHtml(spot.notes)}</div></div>`:''}
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

// ========== 借用车位 ==========
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
    else if (msg.includes('才可借用')) toast(msg, 'error');
    else if (msg.includes('已过期')) toast('该车位的共享时段已过期', 'error');
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
  const startTime = document.getElementById('publish-start').value;
  const endTime = document.getElementById('publish-end').value;
  if (!spotId) return toast('请选择要发布的车位', 'error');
  if (!currentUser?.qr_alipay && !currentUser?.qr_wechat) {
    return toast('请先到个人资料设置收款方式', 'error');
  }
  try {
    await api('POST', `/spots/${spotId}/share`, {
      price_hour: price, price_cap: cap, notes,
      qr_alipay: currentUser.qr_alipay || '', qr_wechat: currentUser.qr_wechat || '',
      available_from: startTime, available_until: endTime
    });
    toast('发布成功！'); navigate('home');
  } catch (e) { toast(e.message || '发布失败', 'error'); }
}
