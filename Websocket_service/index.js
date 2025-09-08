const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { connectProducer } = require("./kafka/producer");
const path = require("path");
const registerClientNamespace = require("./wsHandler/client_namespace");
const registerCMSNamespace = require("./wsHandler/cms_namespace");
const validateTenantHTTP = require("./middleware/httpTenentCheck");
const { rec_AnswerConsumer } = require("./kafka/rec_AnswerConsumer");
const { orderQueueConsumer } = require("./kafka/orderQueueConsumer");
const {escalatedConsumer} = require("./kafka/escalatedConsumer");
const FacebookRouter = require("./websocketProxy");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 20000,     // Sau 20s không nhận pong từ client thì xem như disconnect
  pingInterval: 25000     // Cứ mỗi 25s server gửi một ping
});
const cors = require("cors");
app.use(cors({
  origin: "*", // hoặc "*"

}));
app.locals.io = io;
app.use(express.json());
app.use("/facebook", FacebookRouter);
// 👇 Apply trước static
// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Fallback cho SPA: trả về index.html cho mọi route không phải API
app.get("/client.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
registerClientNamespace(io);
registerCMSNamespace(io);

app.get("/", (req, res) => {
  res.send("🚀 Socket.IO server đang chạy");
});

app.use((err, req, res, next) => {
  console.error("❌ Lỗi không bắt được:", err);
  res.status(500).json({ error: "Đã có lỗi xảy ra trên server." });
});

const PORT = process.env.PORT || 7000;

async function startServer() {
  try {
    await Promise.all([
      rec_AnswerConsumer(io),
      orderQueueConsumer(io),
      escalatedConsumer(io)
    ]);
    console.log("✅ Tất cả Kafka consumers đã khởi động.");

    await connectProducer();
    server.listen(PORT, () => {
      console.log(`📡 Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Lỗi khi kết nối Kafka producer:", err);
    process.exit(1);
  }
}

startServer();
