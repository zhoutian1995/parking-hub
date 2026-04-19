// ========== 完善信息 ==========
async function loadProfile() {
  // 显示不可改信息
  document.getElementById('profile-display-name').textContent = currentUser?.nickname || '未设置昵称';
  document.getElementById('profile-display-phone').textContent = currentUser?.phone || '';
  if (currentUser?.avatar) {
    document.getElementById('profile-avatar').src = currentUser.avatar;
    document.getElementById('profile-avatar').classList.remove('hidden');
    document.getElementById('profile-avatar-default').classList.add('hidden');
  } else {
    document.getElementById('profile-avatar').classList.add('hidden');
    document.getElementById('profile-avatar-default').classList.remove('hidden');
  }

  // 回显可编辑字段
  if (currentUser?.wechat_id) document.getElementById('profile-wechat-id').value = currentUser.wechat_id;
  if (currentUser?.contact_phone) document.getElementById('profile-contact-phone').value = currentUser.contact_phone;
  if (currentUser?.qr_alipay) document.getElementById('profile-alipay-account').value = currentUser.qr_alipay;
  if (currentUser?.qr_wechat) {
    profileQR = currentUser.qr_wechat;
    document.getElementById('profile-qr-img').src = currentUser.qr_wechat;
    document.getElementById('profile-qr-img').classList.remove('hidden');
    document.getElementById('profile-qr-placeholder').classList.add('hidden');
  }

  // 楼栋
  allBuildings = await api('GET', '/buildings');
  const sel = document.getElementById('profile-building');
  sel.innerHTML = '<option value="">选择楼栋</option>' + allBuildings.map(b => `<option value="${b.name}" ${currentUser?.building===b.name?'selected':''}>${b.name}</option>`).join('');
  sel.onchange = () => loadUnits(sel.value);
  if (currentUser?.building) { loadUnits(currentUser.building); if (currentUser.unit) document.getElementById('profile-unit').value = currentUser.unit; }

  // 区域
  allZones = await api('GET', '/zones');
  document.getElementById('profile-zones').innerHTML = allZones.map(z => `
    <button onclick="selectZone('${z.code}', this)" class="zone-btn py-2 rounded-xl border border-neutral-200 text-sm font-medium hover:border-neutral-400 transition-colors ${currentUser?.preferred_zone===z.code?'bg-neutral-900 text-white border-neutral-900':''}" data-code="${z.code}">${z.code}</button>
  `).join('');
  if (currentUser?.preferred_zone) selectedZone = currentUser.preferred_zone;
}

function loadUnits(buildingName) {
  const sel = document.getElementById('profile-unit');
  const building = allBuildings.find(b => b.name === buildingName);
  if (!building) { sel.innerHTML = '<option value="">先选择楼栋</option>'; return; }
  sel.innerHTML = building.units.split(',').map(u => `<option value="${u}" ${currentUser?.unit===u?'selected':''}>${u}</option>`).join('');
}

function selectZone(code, btn) {
  selectedZone = code;
  document.querySelectorAll('.zone-btn').forEach(b => { b.classList.remove('bg-neutral-900','text-white','border-neutral-900'); b.classList.add('border-neutral-200'); });
  btn.classList.add('bg-neutral-900','text-white','border-neutral-900'); btn.classList.remove('border-neutral-200');
}

function previewProfileQR(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    profileQR = e.target.result;
    document.getElementById('profile-qr-img').src = profileQR;
    document.getElementById('profile-qr-img').classList.remove('hidden');
    document.getElementById('profile-qr-placeholder').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  const building = document.getElementById('profile-building').value;
  const unit = document.getElementById('profile-unit').value;
  const wechatId = document.getElementById('profile-wechat-id').value.trim();
  const contactPhone = document.getElementById('profile-contact-phone').value.trim();
  const alipayAccount = document.getElementById('profile-alipay-account').value.trim();

  if (!building) return toast('请选择楼栋', 'error');
  if (!selectedZone) return toast('请选择常用停车区域', 'error');
  if (!alipayAccount && !profileQR) return toast('请至少填写一个收款方式', 'error');

  try {
    await api('PUT', '/me', {
      building, unit, preferred_zone: selectedZone,
      wechat_id: wechatId, contact_phone: contactPhone,
      qr_alipay: alipayAccount, qr_wechat: profileQR
    });
    await loadUser();
    navigate('home');
    toast('信息已保存');
  } catch (e) { toast(e.message || '保存失败', 'error'); }
}
