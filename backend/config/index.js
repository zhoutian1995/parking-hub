module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 3400,
  domain: process.env.DOMAIN || 'localhost:3400',
  dbPath: process.env.DB_PATH || './database/parking.db',
  wechat: {
    appId: process.env.WECHAT_APPID,
    secret: process.env.WECHAT_SECRET,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  },
  adminOpenids: (process.env.ADMIN_OPENIDS || '').split(',').filter(Boolean),
};
