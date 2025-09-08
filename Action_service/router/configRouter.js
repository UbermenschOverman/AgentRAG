const { connectDB } = require("../mogo_service/mogodb");
const { z } = require("zod");
const express = require("express");
const { Parser } = require("@json2csv/plainjs");
const {  flatten } = require ('@json2csv/transforms');

const router = express.Router();

// lấy danh sách custom fields theo tenantId
router.get("/form/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  try {
    const db = await connectDB();
    const tenant = await db.collection("tenants").findOne({ tenantId });
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found" });
    }
    const customFields = tenant.orderForm?.customFields || [];
    res.json({ success: true, customFields });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// cập nhật custom fields theo tenantId
router.put("/form/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const { customFields } = req.body;
  try {
    const db = await connectDB();
    const tenant = await db.collection("tenants").findOne({ tenantId });
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found" });
    }
    await db
      .collection("tenants")
      .updateOne(
        { tenantId },
        { $set: { "orderForm.customFields": customFields } }
      );
    res.json({ success: true, message: "Custom fields updated successfully" });
  } catch (error) {
    console.log("Received customFields:", customFields);
    res.status(500).json({ success: false, message: error.message });
  }
});

// chuyển chế độ defaultMode của tenant
router.put("/defaultMode/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const { defaultMode } = req.body;
  try {
    const db = await connectDB();
    const tenant = await db.collection("tenants").findOne({ tenantId });
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found" });
    }
    // Kiểm tra giá trị defaultMode chỉ được là auto hoặc manual
    if (!["auto", "manual"].includes(defaultMode)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid default mode" });
    }
    await db
      .collection("tenants")
      .updateOne({ tenantId }, { $set: { defaultMode } });
    res.json({ success: true, message: "Default mode updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// route để sửa name, description,address
router.put("/tenant/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const { name, description, address } = req.body;

  try {
    const db = await connectDB();
    const tenant = await db.collection("tenants").findOne({ tenantId });

    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (address) updateData.address = address;

    await db
      .collection("tenants")
      .updateOne({ tenantId }, { $set: updateData });

    res.json({ success: true, message: "Tenant updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// route để lấy thông tin tenant
router.get("/tenant/:tenantId", async (req, res) => {
  const { tenantId } = req.params;

  try {
    const db = await connectDB();
    const tenant = await db.collection("tenants").findOne({ tenantId });

    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found" });
    }

    res.json({ success: true, tenant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// router để xuất đơn theo tenantId
router.get("/tenant/:tenantId/export_orders", async (req, res) => {
  const { tenantId } = req.params;
  const { getall } = req.query;
  const parser = new Parser({
    transforms: [
      flatten({ object: true, array: true, separator: '_'}),
    ]
  });
  const pipeline = [];
  if (!tenantId) {
    return res
      .status(400)
      .json({ success: false, message: "tenantId is required" });
  }
  pipeline.push({ $match: { tenantId: tenantId } });
  pipeline.push({
    $unset: ["_id", "tenantId", "conversationId", "content.llmObservation"],
  });
  try {
    const db = await connectDB();
    if (getall == "0") {
      const { fromDate, toDate } = req.query;
      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          message: "fromDate and toDate are required",
        });
      }
      pipeline.push({
        $match: {
          "meta.createdAt": {
            $gte: fromDate,
            $lte: toDate,
          },
        },
      });
    }
    pipeline.push({
      $sort: { "meta.createdAt": -1 }, // Sắp xếp theo ngày tạo giảm dần
    });
    const orders = await db.collection("orders").aggregate(pipeline).toArray();
    if (orders.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "No orders found for this tenant" });
    }
    const csv = parser.parse(orders);
    res.header("Content-Type", "text/csv; charset=utf-8");
    res.attachment(`orders_${tenantId}.csv`);
    res.send("\uFEFF" + csv); // Thêm BOM đầu file
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// route để lấy danh sách khách hàng
router.get("/tenant/:tenantId/export_clients", async (req, res) => {
  const { tenantId } = req.params;
  if (!tenantId) {
    return res
      .status(400)
      .json({ success: false, message: "tenantId is required" });
  }
  try {
    const db = await connectDB();
    const customers = await db
      .collection("clients")
      .find({ tenantId })
      .project({ _id: 0, tenantId: 0, conversations: 0, orders: 0 }) // loại bỏ _id và tenantId
      .toArray();

    const parser = new Parser({
    transforms: [
      flatten({ object: true, array: true, separator: '_'}),
    ]
  });;
    if (customers.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No customers found for this tenant",
      });
    }
    const csv = parser.parse(customers);
    res.header("Content-Type", "text/csv; charset=utf-8")
    res.attachment(`customers_${tenantId}.csv`);
     res.send("\uFEFF" + csv); // Thêm BOM đầu file
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
