const { embeddingLLM } = require("../LLM_connector/Gemini");
const {hybridSearch} = require('../weaviate/weaviateHandlers.js');

// // Hàm truy vấn Weaviate
// async function queryWeaviate(tenant_Id, embedding, text) {
//   try {
//     const response = await hybridSearch(tenant_Id, embedding, text);
//     return response;
//   } catch (error) {
//     console.error("❌ Lỗi khi truy vấn Weaviate:", error);
//     throw error; // Ném lại lỗi để xử lý ở nơi gọi hàm
//   }
// }

async function retrieval(tenantId, text, alpha) {
  // Khởi tạo GoogleGenerativeAIEmbeddings
  const embeddings = embeddingLLM("query");
  try {
    // Lấy embedding cho câu hỏi
    const embedding = await embeddings.embedQuery(text);
    // Truy vấn Weaviate với embedding lấy được
    let result = await hybridSearch(tenantId, embedding, text, alpha)
    console.log("✅ Kết quả truy vấn Weaviate:");
    const { objects } = result;
    for (let object of objects) {
      console.log(JSON.stringify(object.properties, null, 2));
    }
  
    const context = objects.map((item, index) => item.properties.pageContent).join(" ");
    return context;
  } catch (err) {
    console.error("❌ Lỗi khi tạo embedding cho query:", err);
  }
}
module.exports = { retrieval };

async function testRetrieval() {
  const tenantId = "JWCafe"; // 👈 Sửa theo tenant bạn có
  const queryText = "Đồ ăn chay có những lựa chọn nào"; // 👈 Câu hỏi để thử

  try {
    const context = await retrieval(tenantId, queryText);
    console.log("\n🧠 Context thu được từ Weaviate:");
    console.log(context);
  } catch (err) {
    console.error("❌ Lỗi trong test retrieval:", err);
  }
}

// Gọi hàm test nếu file được chạy trực tiếp
if (require.main === module) {
  testRetrieval();
}