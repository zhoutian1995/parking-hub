// ========== 错误码定义 ==========
const ERROR_CODES = {
  // 通用错误
  INVALID_INPUT: { code: 'INVALID_INPUT', message: '输入参数不正确', status: 400 },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: '请先登录', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', message: '没有权限执行此操作', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', message: '资源不存在', status: 404 },
  SERVER_ERROR: { code: 'SERVER_ERROR', message: '服务器开小差了，请稍后再试', status: 500 },

  // 车位相关
  SPOT_NOT_FOUND: { code: 'SPOT_NOT_FOUND', message: '车位不存在', status: 404 },
  SPOT_ALREADY_BOUND: { code: 'SPOT_ALREADY_BOUND', message: '该车位已被绑定', status: 409 },
  SPOT_NOT_AVAILABLE: { code: 'SPOT_NOT_AVAILABLE', message: '该车位当前不可用', status: 409 },
  SPOT_LIMIT_REACHED: { code: 'SPOT_LIMIT_REACHED', message: '每个手机号最多绑定 2 个车位', status: 400 },
  INVALID_SPOT_CODE: { code: 'INVALID_SPOT_CODE', message: '车位号格式不正确，如 A050', status: 400 },

  // 借用相关
  BORROW_NOT_FOUND: { code: 'BORROW_NOT_FOUND', message: '借用记录不存在', status: 404 },
  BORROW_SELF_SPOT: { code: 'BORROW_SELF_SPOT', message: '不能借用自己发布的车位', status: 400 },
  BORROW_UNAVAILABLE: { code: 'BORROW_UNAVAILABLE', message: '该车位已被其他人借用', status: 409 },
  BORROW_NOT_OWNER: { code: 'BORROW_NOT_OWNER', message: '无权操作此借用记录', status: 403 },
  BORROW_ALREADY_COMPLETED: { code: 'BORROW_ALREADY_COMPLETED', message: '借用已结束', status: 400 },

  // 用户相关
  USER_NOT_FOUND: { code: 'USER_NOT_FOUND', message: '用户不存在', status: 404 },
  PHONE_ALREADY_USED: { code: 'PHONE_ALREADY_USED', message: '手机号已被注册', status: 409 },
};

// ========== 错误响应工具函数 ==========

/**
 * 发送错误响应
 * @param {Object} res - Express response 对象
 * @param {string|Object} error - 错误码或错误对象
 * @param {string} [customMessage] - 自定义消息（可选）
 */
function sendError(res, error, customMessage = null) {
  let errorObj;

  if (typeof error === 'string') {
    // 通过错误码查找
    errorObj = ERROR_CODES[error] || ERROR_CODES.SERVER_ERROR;
  } else if (error && error.code && ERROR_CODES[error.code]) {
    // 已经是错误对象
    errorObj = ERROR_CODES[error.code];
  } else {
    // 默认服务器错误
    errorObj = ERROR_CODES.SERVER_ERROR;
  }

  const response = {
    code: errorObj.code,
    message: customMessage || errorObj.message
  };

  // 开发环境返回更多错误信息
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    response.stack = error.stack;
  }

  res.status(errorObj.status).json(response);
}

/**
 * 发送成功响应
 * @param {Object} res - Express response 对象
 * @param {*} data - 响应数据
 * @param {string} [message] - 成功消息（可选）
 */
function sendSuccess(res, data, message = null) {
  const response = { success: true, data };
  if (message) response.message = message;
  res.json(response);
}

/**
 * 异步路由错误处理包装器
 * @param {Function} fn - 异步路由处理函数
 * @returns {Function} 包装后的路由处理函数
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(err => {
      console.error(`[Error] ${req.method} ${req.path}:`, err);
      sendError(res, err);
    });
  };
}

module.exports = {
  ERROR_CODES,
  sendError,
  sendSuccess,
  asyncHandler
};