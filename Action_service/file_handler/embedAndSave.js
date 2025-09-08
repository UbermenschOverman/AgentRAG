const fs = require("fs/promises");
const { embeddingLLM } = require("../LLM_connector/Gemini"); // Hàm sinh embedding
const {uploadEmbeddings} = require("../weaviate/weaviateHandlers"); // Hàm upload vào Weaviate
const {chunkText} = require("./chunking"); // Hàm chunk văn bản

async function embedChunks(tenantId, documentName, labeledChunks) {
  const embeddings = embeddingLLM("document"); // Lấy model embedding

  try {
    const texts = labeledChunks.map((doc) => doc.pageContent);

    if (texts.length === 0) {
      console.warn("⚠️ Không có đoạn văn bản nào để embedding.");
      return [];
    }

    // Tạo embedding cho tất cả đoạn văn bản
    const embeddedVectors = await embeddings.embedDocuments(texts);

    // Kết hợp embedding với thông tin gốc
    const results = embeddedVectors.map((vector, index) => ({
      documentName: documentName,
      chunkId: String(labeledChunks[index].chunkId),
      pageContent: labeledChunks[index].pageContent,
      tags: labeledChunks[index].tags || [], // Gắn tags nếu có, nếu không thì để mảng rỗng
      embedding: vector,
    }));

    // Tuỳ chọn: Lưu xuống file để debug
    // const savePath = `Data/${tenantId}/${documentName}/embeddings.json`;
    // await fs.writeFile(savePath, JSON.stringify(results, null, 2), "utf-8");
    // console.log(`✅ Đã lưu embeddings vào ${savePath}`);

    return results;
  } catch (err) {
    console.error("❌ Lỗi khi tạo hoặc lưu embeddings:", err.message);
    return [];
  }
}

// hàm để save vào weaviate
async function saveToWeaviate(tenantId, documentName, embeddingsArray) {
  try {
    const result = await uploadEmbeddings(tenantId, documentName, embeddingsArray);
    if (result.success) {
      console.log(`✅ Đã upload ${result.uploaded} chunks cho tenant '${tenantId}'.`);
    } else {
      console.error(`❌ Lỗi khi upload: ${result.message}`);
    }
  } catch (error) {
    console.error("❌ Lỗi khi gọi hàm upload:", error.message);
  }
}

async function pipeline(tenantId, documentName, tags) {
  try {
    const labeledChunks = await chunkText(tenantId, documentName, tags); // Bước 1: Chunk văn bản
    // Bước 2: Tạo embedding cho các đoạn văn bản
    const embeddingsArray = await embedChunks(tenantId, documentName, labeledChunks);

    // Bước 3: Lưu vào Weaviate
    await saveToWeaviate(tenantId, documentName, embeddingsArray);
  } catch (error) {
    console.error("❌ Lỗi trong pipeline:", error.message);
  }
}

module.exports = { pipeline };

// Chạy pipeline nếu được gọi trực tiếp từ command line
if (require.main === module) {
  const tenantId = process.argv[2];
  const documentName = process.argv[3];

  if (!tenantId || !documentName) {
    console.log("❗ Vui lòng cung cấp tenantId và documentName.");
    console.log("📌 Ví dụ: node embedAndSave.js JWCafe pricelist");
    process.exit(1);
  }

  pipeline(tenantId, documentName);
}
