const express = require('express');
const router = express.Router();
const userController = require('./controllers/userController');
const spotController = require('./controllers/spotController');
const borrowController = require('./controllers/borrowController');
const adminController = require('./controllers/adminController');
const authController = require('./controllers/authController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 健康检查
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// 手机号登录/注册
router.post('/auth/login', authController.phoneLogin);

// 微信登录（保留）
router.get('/wechat/login', userController.wechatLogin);
router.get('/wechat/callback', userController.wechatCallback);

// 用户（需登录）
router.get('/me', authMiddleware, userController.getMe);
router.post('/me/verify', authMiddleware, userController.submitVerify);

// === 车位特定路由（必须在 :id 之前） ===
router.get('/spots/stats', spotController.stats);           // 区域统计（公开）
router.get('/spots/search', spotController.search);         // 搜索（公开）
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
router.post('/borrows/:id/done', authMiddleware, borrowController.done);
router.get('/borrows/mine', authMiddleware, borrowController.mine);

// 管理员
router.get('/admin/verifications', authMiddleware, adminMiddleware, adminController.listVerifications);
router.post('/admin/verifications/:id/approve', authMiddleware, adminMiddleware, adminController.approve);
router.post('/admin/verifications/:id/reject', authMiddleware, adminMiddleware, adminController.reject);
router.post('/admin/spots/init', authMiddleware, adminMiddleware, adminController.initSpots);
router.get('/admin/stats', authMiddleware, adminMiddleware, adminController.stats);

module.exports = router;
