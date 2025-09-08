// // mongoClient.js
// const { MongoClient } = require('mongodb');

// const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
// const client = new MongoClient(uri);

// let db = null;

// async function connectDB() {
//   if (!db) {
//     await client.connect();
//     db = client.db("CSKH");
//     console.log("MongoDB connected");
//   }
//   return db;
// }

// module.exports = {
//   connectDB,
//   client
// };



const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const uri = process.env.MONGO_URI; // Lấy URI kết nối từ biến môi trường

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