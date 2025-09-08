const slugify = require('slugify');
require("dotenv").config();
const { connectDB: getDB } = require("../config/mongoConnect");

async function getTenantsCollection() {
  const db = await getDB();
  return db.collection("tenants");
}

async function checkExist(tenantId) {
  try {
    const tenantsCollection = await getTenantsCollection();
    const tenant = await tenantsCollection.findOne({ tenantId });
    return !!tenant; // true nếu tồn tại
  } catch (err) {
    console.error("❌ Error checking tenant existence:", err);
    return false;
  }
}

async function generateTenantId(name) {
  const base = slugify(name, {
    lower: true,
    strict: true,
  });

  // Thử ngẫu nhiên hậu tố 3 chữ số
  let suffix = Math.floor(100 + Math.random() * 900);
  let candidate = base + suffix;

  if (!(await checkExist(candidate))) {
    return candidate;
  }

  // Nếu đã tồn tại thì tăng dần hậu tố
  suffix = 1;
  while (true) {
    candidate = base + suffix;
    if (!(await checkExist(candidate))) {
      return candidate;
    }
    suffix++;
  }
}

module.exports = { generateTenantId };
