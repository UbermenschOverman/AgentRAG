const {checkTenantExists} = require("../tenent_service/tenantService.js");

async function validateTenantHTTP(req, res, next) {
  const tenantId = req.query.tenantId.toString() ?? "invalid"; // Lấy tenantId từ query string của HTTP request
  console.log("đây là: ", req.query);
  console.log("đây là tennantId: ", tenantId);
  if (tenantId === "invalid") {
    return res.status(400).send("❗ Missing tenantId in query");
  } else {
    const exists = await checkTenantExists(tenantId);
    console.log("đây là exists: ", exists);
    if (!exists) {
      return res.status(404).send("❌ Tenant not found");
    }
  }

  next(); // Tiếp tục xử lý nếu tenantId hợp lệ
}

module.exports = validateTenantHTTP;
