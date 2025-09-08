const fs = require('fs');
const path = require('path');
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { Document } = require("@langchain/core/documents");

async function chunkText(tenantId, documentName, tags) {
  try {
    // Đường dẫn tới file text đã được tiền xử lý
    const tenantDir = path.join(process.cwd(), 'Data', tenantId);
    const saveDir = path.join(tenantDir, documentName);
    const txtPath = path.join(saveDir, 'preprocessed.txt');
    const jsonPath = path.join(saveDir, 'faq.json');
    // Đọc nội dung file .txt
    if (!fs.existsSync(txtPath || !fs.existsSync(jsonPath))) {
      throw new Error(`File ${txtPath} does not exist.`);
    }
    const pageText = fs.readFileSync(txtPath, 'utf8');
    const faqData = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : null;
    // kiểm tra faqData có là mảng không
    if (faqData && !Array.isArray(faqData)) {
      throw new Error(`FAQ data in ${jsonPath} is not an array.`);
    }
    // xây dựng mảng các document từ faqData
    // for (const faq of faqData || []) {
    //   if (faq.question && faq.answer) {
    //     pageText += `\n\nQ: ${faq.question}\nA: ${faq.answer}`;
    //   } else {
    //     console.warn(`FAQ entry is missing question or answer: ${JSON.stringify(faq)}`);
    //   }
    // }
    // Tạo đối tượng Document từ nội dung văn bản
    const docs = [new Document({ pageContent: pageText })];

    // Khởi tạo text splitter với kích thước chunk là 250 ký tự
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 300,
      chunkOverlap: 0,
    });

    // Thực hiện chunking
    const splitDocs = await textSplitter.splitDocuments(docs);

    // Gắn chunkId và định dạng dữ liệu
    const result = splitDocs.map((chunk, idx) => ({
      documentName: documentName,
      chunkId: idx,
      pageContent: chunk.pageContent,
      tags: tags || [], // Gắn tags nếu có, nếu không thì để mảng rỗng
    }));
    // thêm faqData vào result
    if (faqData && faqData.length > 0) {
      result.push(...faqData.map((faq, idx) => ({
        documentName: documentName,
        chunkId: `faq-${idx}`,
        pageContent: `Q: ${faq.question}\nA: ${faq.answer}`,
        tags: tags || [],
      })));
    }
    return result;
  } catch (err) {
    console.error("❌ Lỗi trong chunkText:", err.message);
    throw err;
  }
}

module.exports = { chunkText };

// Hàm để test từ command line
// node chunkText.js VillaChunk policy
function testChunkText() {
  const tenantId = process.argv[2];
  const documentName = process.argv[3];

  if (!tenantId || !documentName) {
    console.log("❗ Vui lòng cung cấp tenantId và documentName.");
    console.log("📌 Ví dụ: node chunkText.js JWCafe pricelist");
    return;
  }

  chunkText(tenantId, documentName)
    .then((chunks) => {
      console.log(`✅ Đã chunk thành công (${chunks.length} đoạn):`);
      chunks.forEach((chunk, idx) => {
        console.log(`\n📄 Chunk #${idx + 1}:\n`, chunk);
      });
    })
    .catch((error) => {
      console.error("❌ Lỗi:", error.message);
    });
}

// Chạy test nếu được gọi trực tiếp từ command line
if (require.main === module) {
  testChunkText();
}
