const express = require("express");
const router = express.Router();
const { queryPipeline } = require("../query/pipeline");

router.post("/", async (req, res) => {
  const { query, bussiness_detail, tenant_Id } = req.body;

  if (!query || query.trim() === "" || !tenant_Id || tenant_Id.trim() === "") {
    return res.status(400).json({ error: "Câu hỏi không hợp lệ." });
  }

  try {
    const result = await queryPipeline(bussiness_detail, query, tenant_Id);
    res.json(result);
  } catch (error) {
    console.error("❌ Lỗi xử lý câu hỏi:", error.message);
    res.status(500).json({ error: "Lỗi server khi xử lý câu hỏi." });
  }
});

module.exports = router; // ✅ Export router trực tiếp
