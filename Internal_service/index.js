require("dotenv").config();
const express = require("express");
const path = require("path");
const {connectDB} = require("./config/mongoConnect");
const cors = require("cors");
const { generateTenantId } = require("./utils/generateTenantId");
const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: "*", // Cho phép tất cả các domain truy cập
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions)); // Sử dụng middleware CORS toàn cục
app.use(express.json());


let tenantsCollection;
let conversationsCollection;
let clientsCollection;
let orderCollection;

async function connectToDB() {
  const db = await connectDB() // lấy db mặc định từ URI
  tenantsCollection = db.collection("tenants");
  conversationsCollection = db.collection("conversations");
  clientsCollection = db.collection("clients");
  orderCollection = db.collection("orders");
}
connectToDB().catch(console.error);

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// API
app.get("/api/tenant/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  try {
    const tenant = await tenantsCollection.findOne({ tenantId });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// API để lấy orderForm của một doanh nghiệp
app.get("/api/tenant/:tenantId/orderForm", async (req, res) => {
  const { tenantId } = req.params;
  try {
    const tenant = await tenantsCollection.findOne({ tenantId });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    if (!tenant.orderForm) {
      return res
        .status(404)
        .json({ message: "Order form not found for this tenant" });
    }
    const coreFields = JSON.parse(tenant.orderForm.coreFields);
    const customFields = JSON.parse(tenant.orderForm.customFields);
    res.json([...coreFields, ...customFields]);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// API để lấy context(name+description) của một doanh nghiệp
app.get("/api/tenant/:tenantId/context", async (req, res) => {
  const { tenantId } = req.params;
  try {
    const tenant = await tenantsCollection.findOne({ tenantId });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    if (!tenant.name || !tenant.description) {
      return res
        .status(404)
        .json({ message: "Context not found for this tenant" });
    }
    const context = tenant.name + " - " + tenant.description;
    res.json(context);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get("/api/tenant/:tenantId/defaultMode", async (req, res) => {
  const { tenantId } = req.params;
  try {
    const tenant = await tenantsCollection.findOne({ tenantId });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    if (!tenant.defaultMode) {
      return res
        .status(404)
        .json({ message: "defaultMode not found for this tenant" });
    }
    res.json({ mode: tenant.defaultMode });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get("/api/tenant/:tenantId/conversation/:conversationId", async (req, res) => {
  const { tenantId, conversationId } = req.params;
  try {
    const conversations = await conversationsCollection
      .findOne({ tenantId, conversationId })
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
);

app.get("/api/tenant/:tenantId/client/:clientId", async (req, res) => {
  const { tenantId,clientId } = req.params;
  try {
    const clients = await clientsCollection.findOne({ tenantId, clientId });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
);

app.get ("/api/tenant/:tenantId/order/:orderId", async (req, res) => {
  const { tenantId, orderId } = req.params;
  try {
    const order = await orderCollection.findOne({ tenantId,
      orderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order.content);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
);
app.post("/api/tenant/:tenantId/order/:orderId", async (req, res) => {
  const {content} = req.body;
  const { tenantId, orderId } = req.params;
  try {
    const order = await orderCollection.findOne({ tenantId, orderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    // Giả sử bạn muốn cập nhật nội dung của đơn hàng
    const updatedOrder = await orderCollection.updateOne(
      { tenantId, orderId },
      { $set: { content } }
    );
    res.json({ message: "Order updated successfully", updatedOrder });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
);

app.get("/api/tenant/:tenantId/orders", async (req, res) => {
  const { tenantId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const total = await orderCollection.countDocuments({ tenantId });
    const orders = await orderCollection
      .find({ tenantId }, { projection: { meta: 1, orderId:1, _id:0 } })
      .sort({ "meta.updatedAt": -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      orders,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post("/api/tenant/:tenantId/order/:orderId/staffConfirm", async (req, res) => {
  const { tenantId, orderId } = req.params;
  const {updatedValue} = req.body;
  try {
    // kiểm tra updatedValue có phải là một giá trị hợp lệ denied hoăc approved
    if (!["denied", "approved"].includes(updatedValue)) {
      return res.status(400).json({ message: "Invalid updated value" });
    }
    const order = await orderCollection.findOne({ tenantId, orderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    // Giả sử bạn muốn cập nhật trạng thái xác nhận của nhân viên
    const updatedOrder = await orderCollection.updateOne(
      { tenantId, orderId },
      { $set: { "meta.isStaffConfirmed": updatedValue } }
    );
    res.json({ message: "Staff confirmation updated successfully", updatedOrder });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
);

const admin = require("firebase-admin");

const serviceAccount = require("./FirebaseKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


app.post('/api/tenant/:tenantId/admin/verification', async (req, res) => {
  const { tenantId } = req.params;

  // 1) Lấy token từ header
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }
  const idToken = match[1];

  try {
    // 2) Verify và extract UID
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // 3) Query DB để lấy tenant
    const tenant = await tenantsCollection.findOne({ tenantId });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // 4) So khớp adminUid
    if (tenant.adminUid !== uid) {
      return res.status(403).json({ message: 'Unauthorized: not an admin of this tenant' });
    }

    // 5) Nếu hợp lệ
    return res.status(200).json({ message: 'Verification successful' });
  } catch (err) {
    console.error('Auth verify failed:', err);
    // Token invalid / expired → 401
    return res.status(401).json({ message: 'Unauthorized', error: err.message });
  }
});

app.post("/api/register", async (req,res)=>{
 try {
      const authHeader = req.headers.authorization || '';
  const {email, name,description,address  } = req.body;
  if (!email || !name||!address|| !description) {
    return res.status(400).json({ message: 'Email, tenantId address,description are required' });
  }
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }
  const idToken = match[1];
  
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    // check uid và email có khớp không
    const user = await admin.auth().getUser(uid);
    if (user.email !== email) {
      return res.status(403).json({ message: 'Unauthorized: email does not match' });
    }
    // tạo tenantId
    const tenantId = await generateTenantId(name, tenantsCollection);
    // nếu đúng tạo tenant mới
    await tenantsCollection.insertOne({
      tenantId,
      name,
      adminUid: uid,
      adminEmail: user.email,
      description:description,
      address: address,
      orderForm: {
        coreFields: JSON.stringify([{"name":"name","required":"true"},{"name":"phoneNumber","required":"true"},{name:"llmObservation", "required":"true"}]),
        customFields: JSON.stringify([]),
      },
      images:[],
      defaultMode:  "manual",
    });
    console.log("Tenant created:", tenantId);
    // trả về tenantId
    return res.status(201).json({ message: "Tenant created successfully", tenantId });
 } catch (err) {
    console.error("Error creating tenant:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
)
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});