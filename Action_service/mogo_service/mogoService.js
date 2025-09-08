const {connectDB} = require('./mogodb');
const axios = require("axios");

async function getDefaultOrder (tenantId){
    try {
        const db = await connectDB(); // ✅ thêm await
        const tenantCollection = db.collection("tenants");
        const tenant = await tenantCollection.findOne({tenantId: tenantId});
        if (!tenant) {
            console.error(`Không tìm thấy tenant với tenantId: ${tenantId}`);
            return false; // Không tìm thấy tenant
        }
        if (!tenant.orderForm){
            console.error(`Tenant ${tenantId} không có orderForm.`);
            return false; // Không có orderForm
        }
        const coreFields = JSON.parse(tenant.orderForm.coreFields);
        const customFields = JSON.parse(tenant.orderForm.customFields);
        const schemaFields = [...coreFields, ...customFields];
        // nhét value = null vào các trường
        const defaultOrderContent = schemaFields.map(field => ({
            ...field,
            value: null // Đặt giá trị mặc định là null
        }));
        return defaultOrderContent; // Trả về mảng các trường với giá trị null
    }catch (err) {
        console.error("Lỗi khi lấy orderForm:", err.message);
        return false; // Xử lý lỗi nếu không thể lấy orderForm
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

module.exports = {
    getDefaultOrder,
    getContext
};