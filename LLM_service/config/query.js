// make http request to mongo service
const fetch = require("node-fetch");

const API_URL = process.env.MONGO || "http://localhost:6969/api/tenant";

async function getContext(tenantId) {
    try {
        // Gửi yêu cầu đến API
        const res = await fetch(`${API_URL}/${tenantId}/context`);
    
        if (res.status === 200) {
        // Trả về dữ liệu đã parse từ JSON nếu thành công
        const data = await res.json();
        return data; // Trả về dữ liệu tenant
        } else if (res.status === 404) {
        console.log(`Không tìm thấy tenant với tenantId: ${tenantId}`);
        return false; // Không tìm thấy tenant
        } else {
        console.error(`Lỗi server: ${res.status}`);
        return false; // Lỗi server khác
        }
    } catch (err) {
        console.error("Lỗi khi gọi API:", err.message);
        return false; // Xử lý lỗi nếu không thể gọi API
    }
}

module.exports = { getContext};
