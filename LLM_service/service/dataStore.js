const axios = require("axios");

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

module.exports = { getContext };
