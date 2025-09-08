const { connectDB } = require("../mogo_service/mogodb");
const { z } = require ("zod");
const express = require("express");
const { ObjectId } = require("mongodb");

const CampaignSchema = z.object({
  type: z.enum([
    "promotion",
    "availability_block",
    "closed_period",
    "notice",
    "event",
    "maintenance"
  ]),
  name: z.string().min(1),
  description: z.string().min(1),
  start: z.coerce.date(),
  stop: z.coerce.date(),
  expireAt: z.coerce.date()
}).refine(data => data.start < data.stop, {
  message: "start must be before stop",
  path: ["start"]
});


const router = express.Router();


// tạo campaign mới
router.post("/:tenantId/", async (req, res) => {
  const { tenantId } = req.params;
  const {campaignForm} = req.body;
  try {
    const db = await connectDB();
    const tenant = await db.collection("tenants").findOne({ tenantId });
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }
    const parsed = CampaignSchema.parse(campaignForm);
    await db.collection("campaigns").insertOne({
      ...parsed,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.status(201).json({ success: true, message: "Campaign created successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// lấy danh sách campaign theo tenantId
router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  try {
    const db = await connectDB();
    const campaigns = await db.collection("campaigns").find({ tenantId }).toArray();
    res.json({ success: true, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// câp nhật campaign theo tenantId và campaignId
router.put("/:tenantId/:campaignId", async (req, res) => {
  const { tenantId, campaignId } = req.params;
  const { campaignForm } = req.body;
  try {
    const db = await connectDB();
    const parsed = CampaignSchema.parse(campaignForm);
    const result = await db.collection("campaigns").updateOne(
      { _id: new ObjectId(campaignId), tenantId },
      { $set: { ...parsed, updatedAt: new Date() } }
    );
    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// xóa campaign theo tenantId và campaignId
router.delete("/:tenantId/:campaignId", async (req, res) => {
  const { tenantId, campaignId } = req.params;
  try {
    const db = await connectDB();
    const result = await db.collection("campaigns").deleteOne({ _id: new ObjectId(campaignId), tenantId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }
    res.json({ success: true, message: "Campaign deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
    console.error("Error deleting campaign:", error);
  }
});

module.exports = router;