const axios = require("axios");

const API_URL = process.env.MONGO || "http://localhost:6969/api/tenant";

async function checkTenantExists(tenantId) {
  try {
    const res = await axios.get(`${API_URL}/${tenantId}`);
    if (res.status === 200) {
      return true; // Tenant tồn tại
    } else if (res.status === 404) {
      return false; // Không tìm thấy
    } else {
      console.error(`Lỗi server: ${res.status}`);
      return false;
    }
  } catch (err) {
    console.error("Lỗi khi gọi API:", err.message);
    return false;
  }
}

async function getDefaultMode (tenantId) {
  try {
    const res = await axios.get(`${API_URL}/${tenantId}/defaultMode`);
    if (res.status === 200) {
      return res.data.mode; // Trả về mode mặc định
    } else {
      console.error(`Lỗi server: ${res.status}`);
      return null;
    }
  } catch (err) {
    console.error("Lỗi khi gọi API:", err.message);
    return null;
  }
}

async function getContext(tenantId) {
  try {
    const response = await axios.get(
      `http://localhost:6969/api/tenant/${tenantId}/context`
    );
    // Giả sử API trả về context dưới dạng string
    return response.data;
  } catch (error) {
    console.error("Error fetching context:", error);
    throw new Error("Unable to fetch context for tenant " + tenantId);
  }
}

module.exports = {checkTenantExists, getDefaultMode, getContext};
