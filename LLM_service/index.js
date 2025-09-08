const express = require("express");
const bodyParser = require("body-parser");
const { LLMMesConsumer } = require("./service/Kafka/LLM_mesConsumer");
const { resumeState } = require("./service/LLM/tools/test"); // nơi bạn export resumeState

const app = express();
const port = process.env.PORT || 7103;
app.use(bodyParser.json());

// Route để CMS gửi bản review
app.post("/resume", async (req, res) => {
  try {
    const { requestId, editedText } = req.body;

    if (!requestId || !editedText) {
      return res.status(400).json({ error: "Thiếu requestId hoặc editedText" });
    }

    console.log(`🔁 Nhận resume từ CMS - requestId: ${requestId}`);

    await resumeState(requestId, editedText);

    return res.status(200).json({ message: "Graph resumed thành công." });
  } catch (err) {
    console.error("❌ Resume error:", err);
    return res.status(500).json({ error: "Lỗi khi resume state." });
  }
});

async function main() {
  await LLMMesConsumer(); // Khởi chạy consumer Kafka để lắng nghe tin nhắn agent
}

main().catch((err) => {
  console.error("❌ Error starting service:", err);
});

app.listen(port, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
});
