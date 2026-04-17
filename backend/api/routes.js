const express = require('express');
const router = express.Router();
const userController = require('./controllers/userController');
const spotController = require('./controllers/spotController');
const borrowController = require('./controllers/borrowController');
const adminController = require('./controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 健康检查
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// 开发模式登录
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/login', (req, res) => {
    const jwt = require('jsonwebtoken');
    const { getDb } = require('../database/init');
    const config = require('../config');
    const { nickname } = req.body;
    const db = getDb();
    const devOpenid = 'dev_' + Date.now();
    const result = db.prepare('INSERT INTO users (openid, nickname, verified, is_admin) VALUES (?, ?, 1, 1)').run(devOpenid, nickname || '测试用户');
    const token = jwt.sign({ id: result.lastInsertRowid, openid: devOpenid, is_admin: 1 }, config.jwt.secret, { expiresIn: '30d' });
    res.json({ token });
  });
}

// 微信登录
router.get('/wechat/login', userController.wechatLogin);
router.get('/wechat/callback', userController.wechatCallback);

// 用户（需登录）
router.get('/me', authMiddleware, userController.getMe);
router.post('/me/verify', authMiddleware, userController.submitVerify);

// 车位（公开）
router.get('/spots', spotController.listSpots);
router.get('/spots/:id', spotController.getSpot);

// 车位（需登录）
router.post('/spots/share', authMiddleware, spotController.shareSpot);
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
