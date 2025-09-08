const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
const { generateFAQ } = require("./FaQAutoGen");
require("dotenv").config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function extractTextFromPdf(
  tenantId,
  documentName,
  description,
  tags,
  context
) {
  try {
    const tenantDir = path.join(process.cwd(), "Data", tenantId);
    const saveDir = path.join(tenantDir, documentName);
    const pdfPath = path.join(saveDir, "original.pdf");

    // Đọc file PDF
    const fileData = fs.readFileSync(pdfPath);

    const contents = [
      {
        text: `Bạn là nhân viên hỗ trợ tiền xử lý dữ liệu cho hệ thống RAG của doanh nghiệp  ${context}.
        Nhiệm vụ của bạn là trích xuất thông tin từ file pdf cho sẵn thành văn bản text để phục vụ quá trình chunking. 
        Bạn sẽ được cung cấp tên tài liệu, các tags và mô tả của nó. 
        Trong đó tags có 4 loại là "policy", "price_list", "general_info", "faq", và 1 văn bản có thể có nhiều tags.
          Đối với các văn bản có tags là "policy", bạn cần trích xuất các thông tin như chính sách, quy định, hướng dẫn, điều khoản và điều kiện.
          Đối với các văn bản có tags là "price_list", bạn cần trích xuất các thông tin về bảng giá, sản phẩm, mô tả sản phẩm và giá cả tương ứng.
          Đối với các văn bản có tags là "general_info", bạn cần dựa vào tên văn bản cũng như mô tả để xác định những nội dung chính cần trích xuất của văn bản này.
          Đối với các văn bản có tags là "faq", bạn cần trích xuất các câu hỏi thường gặp và câu trả lời tương ứng.

        Chú ý với các file menu bảng giá, bạn cần phải trích xuất được các thông tin như sản phẩm mô tả sản phẩm và giá cả tương ứng nếu có.
        
        Văn bản đầu ra phải đảm bảo:
        - Có thể lược bỏ các thông tin không có giá trị tìm kiếm như: tiêu đề, tiêu đề phụ, số trang, ngày tháng, tên tác giả, tên tổ chức, tên file, tên thư mục, tên người gửi, tên người nhận.

        - Tổ chức các đoạn văn bản theo nội dung logic sao cho mỗi đoạn văn bản đều có ý nghĩa riêng biệt và có thể được tìm kiếm một cách hiệu quả.

        - Phải chứa đầy đủ các thông tin quan trọng, mà bạn nghĩ rằng sẽ hữu ích cho người dùng trong quá trình tìm kiếm và trả lời câu hỏi.

        - phải giữ nguyên được các cấu trúc logic như nhóm các món ăn liên quan, nhóm các sản phẩm liên quan. Các thông tin trong cùng nhóm thì viết Không cách dòng.

        - CHỈ PHẢN HỒI NỘI DUNG VĂN BẢN, KHÔNG PHẢN HỒI CÁC THÔNG TIN KHÁC.

==== biết rằng văn bản đầu có chi tiết sau ====
Tên file: ${documentName}.pdf
Có mô tả: ${description || "Không có mô tả"}
Có tags: ${tags && tags.length > 0 ? tags.join(", ") : "Không có tags"}

*** PDF ***
`,
      },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: fileData.toString("base64"),
        },
      },
    ];

    // Gọi API Google GenAI để xử lý
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    // Xử lý kết quả trả về
    const result =
      response.candidates?.[0]?.content?.parts?.[0]?.text || "No output";

    // Lưu file txt có tên là "preprocessed.txt"
    // Lưu file txt có tên là "preprocessed.txt"
    const outputPath = path.format({
      dir: saveDir, // Thư mục lưu file
      name: "preprocessed", // Tên file không có phần mở rộng
      ext: ".txt", // Phần mở rộng là .txt
    });

    // Lưu kết quả vào file text
    fs.writeFileSync(outputPath, result, "utf8");

    console.log(`Saved result to ${outputPath}`);

    await generateFAQ(tenantId, documentName, description, tags, context); // Gọi hàm generateFAQ để tạo FAQ từ văn bản đã xử lý

    // Trả lại nội dung của file text
    return result;
  } catch (error) {
    console.error("Error processing file:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

module.exports = { extractTextFromPdf };

// Hàm để test từ command line
// node textExtraction.js VillaChunk 'policy'
function testExtractTextFromPdf() {
  const tenantId = process.argv[2]; // Nhận tenantId từ command line argument
  const documentName = process.argv[3]; // Nhận documentName từ command line argument

  if (!tenantId || !documentName) {
    console.log("Please provide tenantId and documentName.");
    return;
  }

  extractTextFromPdf(tenantId, documentName)
    .then((result) => {
      console.log("Text extraction successful!");
      console.log(result); // In ra nội dung của file text đã xử lý
    })
    .catch((error) => {
      console.error("Error:", error.message);
    });
}

// Chạy hàm test từ command line
testExtractTextFromPdf();
