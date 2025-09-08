const express = require("express");
const multer = require("multer");

const { handleUpload } = require("./handleUpload");
const { extractTextFromPdf } = require("./textExtraction");
const { pipeline } = require("./embedAndSave");
const {
  getDocumentNames,
  deleteDocEmbed,
} = require("../weaviate/weaviateHandlers");
const {
  uploadBufferToCloudinary,
  deleteImageFromCloudinary,
  uploadPdfToCloudinary,
} = require("../file_handler/imageUpload/imageHandler");
const { connectDB } = require("../mogo_service/mogodb");
const {getContext} = require("../mogo_service/mogoService");
const router = express.Router();
const upload = multer();

// Route: Upload PDF
router.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const { tenantId, documentName, description } = req.body;
    if (!req.file || !tenantId || !documentName|| !description) {
      return res.status(400).json({ success: false, message: "Thiếu file hoặc thông tin!" });
    }
    const pdfFile = { buffer: req.file.buffer };
    const result = handleUpload({ tenantId, documentName, pdfFile });
    const folder = `${tenantId}`;
    const resultCloudinary =await uploadPdfToCloudinary(
      result.pdfPath,
      folder,
      documentName
    );
        const pdfDoc = {
      name: documentName,
      url: resultCloudinary.secure_url,
      public_id: resultCloudinary.public_id,
      description: description,
      createdAt: new Date(),
    };

    const db = await connectDB();
    const tenantCollection = db.collection("tenants");
    tenantCollection.updateOne(
      { tenantId: tenantId },
      { $push: { pdfs: pdfDoc } }
    );

    res.json({ success: true, pdfPath: result.pdfPath });
  } catch (error) {
    console.error("❌ Lỗi khi upload PDF:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Route: Extract text from PDF
router.post("/extract", async (req, res) => {
  try {
    const { tenantId, documentName, description,tags } = req.body;
    if (!tenantId || !documentName || !description, !tags) {
      return res.status(400).json({ success: false, message: "Thiếu tenantId, documentName hoặc description hoặc lables!" });
    }
    // kiểm tra các tags có thuộc các giá trị cho phép không
    const allowedtags = ["policy", "price_list", "general_info", "faq"];
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ success: false, message: "tags không được để trống!" });
    }
    for (const label of tags) {
      if (!allowedtags.includes(label)) {
        return res.status(400).json({ success: false, message: `Label '${label}' không hợp lệ!` });
      }
    }
    const context = await getContext(tenantId);
    if (!context) {
      return res.status(400).json({ success: false, message: "Không tìm thấy context cho tenantId này." });
    }
    const result = await extractTextFromPdf(
      tenantId,
      documentName,
      description,
      tags,
      context
    );
    console.log({ success: true });
    res.json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// router.post("/extract", async (req, res) => {
//   try {
//     console.log("Extract bắt đầu", req.body);

//     const { tenantId, documentName, description, tags } = req.body;
//     if (!tenantId || !documentName || !description || !tags) {
//       return res.status(400).json({ success: false, message: "Thiếu thông tin" });
//     }

//     // Giả lập xử lý
//     await new Promise((resolve) => setTimeout(resolve, 1000));

//     console.log("✅ Extract thành công");
//     return res.json({ success: true });
//   } catch (error) {
//     console.error("❌ Lỗi extract:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// });


// Route: Chunk, embed, and save
router.post("/embedandsave", async (req, res) => {
  try {
    const { tenantId, documentName,tags } = req.body;
        // kiểm tra các tags có thuộc các giá trị cho phép không
    const allowedtags = ["policy", "price_list", "general_info", "faq"];
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ success: false, message: "tags không được để trống!" });
    }
    for (const label of tags) {
      if (!allowedtags.includes(label)) {
        return res.status(400).json({ success: false, message: `Label '${label}' không hợp lệ!` });
      }
    }
    await pipeline(tenantId, documentName, tags);
    res.json({ success: true, message: "Pipeline completed" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Route: Get document names
router.get("/documents/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  try {
    const result = await getDocumentNames(tenantId);
    res.json({ success: true, documentNames: result.documentNames });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
// Route: Delete document embeddings
router.delete("/documents/:tenantId/:documentName", async (req, res) => {
  const { tenantId, documentName } = req.params;
  const fs = require("fs");
  const path = require("path");
  try {
    // Xóa embedding (Weaviate)
    const result = await deleteDocEmbed(tenantId, documentName);

    // Xóa folder tài liệu trên ổ cứng
    const folderPath = path.join(process.cwd(), "Data", tenantId, documentName);
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
    // Xóa file đã upload lên Cloudinary
    const db = await connectDB();
    const tenantCollection = db.collection("tenants");
    const tenantDoc = await tenantCollection.findOne({ tenantId: tenantId });
    if (tenantDoc && tenantDoc.pdfs) {
      const pdfDoc = tenantDoc.pdfs.find(pdf => pdf.name === documentName);
      if (pdfDoc && pdfDoc.public_id) {
        await deleteImageFromCloudinary(pdfDoc.public_id);
      }
      // Xóa tài liệu khỏi danh sách pdfs trong MongoDB
      await tenantCollection.updateOne(
        { tenantId: tenantId },
        { $pull: { pdfs: { name: documentName } } }
      );
    }
    res.json({ success: true, deleted: result.deleted });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Route: Preview processed text
router.get("/documents/:tenantId/:documentName/preview", async (req, res) => {
  const { tenantId, documentName } = req.params;
  const fs = require("fs");
  const path = require("path");
  try {
    const filePath = path.join(
      process.cwd(),
      "Data",
      tenantId,
      documentName,
      "preprocessed.txt"
    );
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "Chưa có file đã xử lý." });
    }
    const text = fs.readFileSync(filePath, "utf8");
    res.json({ success: true, text });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// upload image
// POST /upload-image
router.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    const db = await connectDB();
    const tenantCollection = db.collection("tenants");

    const { tenantId, name, description } = req.body;

    // ✅ Kiểm tra thiếu thông tin
    if (!tenantId || !name|| !description) {
      return res.status(400).json({ success: false, message: "Missing tenantId or name." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided." });
    }

    // ❌ FIX: dòng dưới bị sai logic — cần là "nếu CÓ tenantId thì kiểm tra xem tồn tại"
    const tenantDoc = await tenantCollection.findOne({ tenantId: tenantId });
    if (!tenantDoc) {
      return res.status(400).json({ success: false, message: "Tenant not found." });
    }

    // ✅ Tạo folder theo tenant và nhóm tên
    const folder = `${tenantId}/${name}`;

    // ✅ Tạo tên ảnh
    const filename = Date.now().toString();

    // ✅ Upload ảnh lên Cloudinary
    const result = await uploadBufferToCloudinary(req.file.buffer, folder, filename);

    // ✅ Lưu thông tin ảnh vào tenant (MongoDB)
    const imageDoc = {
      name,
      url: result.secure_url,
      public_id: result.public_id,
      description: description,
      createdAt: new Date(),
    };

    await tenantCollection.updateOne(
      { tenantId: tenantId },
      { $push: { images: imageDoc } }
    );

    // ✅ Trả về thông tin ảnh
    res.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    });

  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route: Get images by tenantId
router.get("/images/:tenantId", async (req, res) => {
  try {
    const db = await connectDB();
    const tenantCollection = db.collection("tenants");
    const { tenantId } = req.params;

    // Kiểm tra xem tenant có tồn tại không
    const tenantDoc = await tenantCollection.findOne({ tenantId: tenantId });
    if (!tenantDoc) {
      return res.status(404).json({ success: false, message: "Tenant not found." });
    }

    // Lấy danh sách ảnh từ tenant
    const images = tenantDoc.images || [];
    res.json({ success: true, images });
  } catch (error) {
    console.error("❌ Error fetching images:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route: Delete image by public_id
router.delete("/images/:tenantId", async (req, res) => {
  try {
    const db = await connectDB();
    const tenantCollection = db.collection("tenants");
    const { tenantId } = req.params;
    const { publicId } = req.body;

    // Kiểm tra xem tenant có tồn tại không
    const tenantDoc = await tenantCollection.findOne({ tenantId: tenantId });
    if (!tenantDoc) {
      return res.status(404).json({ success: false, message: "Tenant not found." });
    }

    // Tìm ảnh trong danh sách
    const imageIndex = tenantDoc.images.findIndex(img => img.public_id === publicId);
    if (imageIndex === -1) {
      return res.status(404).json({ success: false, message: "Image not found." });
    }

    // Xóa ảnh khỏi Cloudinary
    await deleteImageFromCloudinary(publicId);

    // Xóa ảnh khỏi danh sách trong MongoDB
    tenantDoc.images.splice(imageIndex, 1);
    await tenantCollection.updateOne(
      { tenantId: tenantId },
      { $set: { images: tenantDoc.images } }
    );

    res.json({ success: true, message: "Image deleted successfully." });
  } catch (error) {
    console.error("❌ Error deleting image:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
