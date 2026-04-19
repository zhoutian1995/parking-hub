// ========== 全局状态 ==========
const API = '/api';
let token = localStorage.getItem('ph_token');
let currentUser = null;
let currentSpots = [];
let currentBorrows = [];
let profileQR = '';
let _notifyBorrow = null;
let allBuildings = [];
let allZones = [];
let selectedZone = '';

// ========== API 请求 ==========
async function api(method, path, body) {
  const opts = { method, headers: {} };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) { const err = await res.json().catch(() => ({ error: '请求失败' })); throw new Error(err.error); }
  return res.json();
}
