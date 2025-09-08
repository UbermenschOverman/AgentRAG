const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const uri = process.env.MONGO_URI; // Lấy URI kết nối từ biến môi trường

if (!uri) {
  throw new Error("❌ MONGO_URI is not defined in .env file");
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db = null;

async function connectDB() {
 if (!db) {
    try {
      await client.connect();
      db = client.db("CSKH"); // thay bằng tên database của bạn
      console.log("✅ MongoDB connected successfully");
    } catch (err) {
      console.error("❌ MongoDB connection failed:", err);
      throw err;
    }
  }
  return db;
}

module.exports = {
  connectDB,
  client
};