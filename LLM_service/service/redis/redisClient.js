const { createClient } = require("redis");
require('dotenv').config();

const redis = createClient({
  username: process.env.REDIS_USERNAME,     // có thể bỏ nếu không dùng ACL
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  }
});

redis.on('error', err => console.error('❌ Redis Error:', err));

(async () => {
  try {
    await redis.connect();
    console.log("🔗 Connected to Redis");
  } catch (err) {
    console.error("⚠️ Failed to connect to Redis:", err);
  }
})();

module.exports = redis;
