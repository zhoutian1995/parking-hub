const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const config = require('../config');
const userController = require('./controllers/userController');
const spotController = require('./controllers/spotController');
const borrowController = require('./controllers/borrowController');
const adminController = require('./controllers/adminController');
const authController = require('./controllers/authController');
const { authMiddleware, optionalAuth, adminMiddleware } = require('../middleware/auth');

// Rate limiting（S4）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 20, // 每 15 分钟最多 20 次登录尝试
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟
  max: 100, // 每分钟最多 100 次 API 请求
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 测试接口环境守卫 — 生产环境直接 404
function devOnly(req, res, next) {
  if (config.env === 'production') return res.status(404).json({ error: 'Not found' });
  next();
}

// 健康检查
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// 手机号登录/注册（加限流）
router.post('/auth/login', authLimiter, authController.phoneLogin);

// 微信授权
router.get('/auth/wechat', authController.wechatAuth);
router.get('/auth/wechat/callback', authController.wechatCallback);

// 测试面板
router.get('/test/accounts', authController.testAccounts);
router.post('/test/login', authController.testLogin);

// 用户（需登录）
router.get('/me', authMiddleware, userController.getMe);
router.put('/me', authMiddleware, userController.updateMe);
router.post('/me/verify', authMiddleware, userController.submitVerify);

// 公开数据
router.get('/buildings', userController.getBuildings);
router.get('/zones', userController.getZones);

// === 车位特定路由（必须在 :id 之前） ===
router.get('/spots/nearby', authMiddleware, spotController.nearby);  // 附近车位（需登录）
router.get('/spots/stats', spotController.stats);           // 区域统计（公开）
router.get('/spots/search', optionalAuth, spotController.search);         // 搜索（公开，登录后过滤自己）
router.get('/spots/mine', authMiddleware, spotController.mySpots);     // 我的车位
router.post('/spots/bind', authMiddleware, spotController.bindSpot);   // 绑定车位
router.post('/spots/share', authMiddleware, spotController.shareSpot); // 按 code 发布

// === 车位通用路由 ===
router.get('/spots', spotController.listSpots);             // 列表（公开）
router.get('/spots/:id', spotController.getSpot);           // 详情（公开）

// 车位操作（需登录，按 ID）
router.post('/spots/:id/share', authMiddleware, spotController.shareSpotById);
router.post('/spots/:id/unshare', authMiddleware, spotController.unshareSpot);

// 借用
router.post('/borrows', authMiddleware, borrowController.create);
router.post('/borrows/:id/accept', authMiddleware, borrowController.accept);
router.post('/borrows/:id/reject', authMiddleware, borrowController.reject);
router.post('/borrows/:id/cancel', authMiddleware, borrowController.cancel);
router.post('/borrows/:id/done', authMiddleware, borrowController.done);
router.get('/borrows/mine', authMiddleware, borrowController.mine);

// 管理员
router.get('/admin/verifications', authMiddleware, adminMiddleware, adminController.listVerifications);
router.post('/admin/verifications/:id/approve', authMiddleware, adminMiddleware, adminController.approve);
router.post('/admin/verifications/:id/reject', authMiddleware, adminMiddleware, adminController.reject);
router.post('/admin/spots/init', authMiddleware, adminMiddleware, adminController.initSpots);
router.get('/admin/stats', authMiddleware, adminMiddleware, adminController.stats);

module.exports = router;
