const fs = require('fs');
const path = require('path');

function getDirectorySize(dirPath) {
  let totalSize = 0;

  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
      } else {
        totalSize += stats.size;
      }
    }
  }

  walk(dirPath);
  return totalSize;
}

function handleUpload({ tenantId, documentName, pdfFile }) {
  if (!tenantId || !documentName || !pdfFile || !pdfFile.buffer) {
    throw new Error('Missing required fields');
  }

  const tenantDir = path.join(process.cwd(), 'Data', tenantId);
  const saveDir = path.join(tenantDir, documentName);
  const pdfPath = path.join(saveDir, 'original.pdf');

  // Tạo thư mục nếu chưa có
  fs.mkdirSync(saveDir, { recursive: true });

  // Tính kích thước thư mục tenant (nếu tồn tại)
  const MAX_TENANT_SIZE = 10 * 1024 * 1024; // 10 MB
  if (fs.existsSync(tenantDir)) {
    const currentSize = getDirectorySize(tenantDir);
    if (currentSize > MAX_TENANT_SIZE) {
      throw new Error(`Tenant '${tenantId}' exceeds 10MB limit. Please delete old files.`);
    }
  }

  // Lưu file PDF từ buffer
  fs.writeFileSync(pdfPath, pdfFile.buffer);

  return { pdfPath };
}

// Hàm để test từ command line
// node handleUpload.js VillaChunk 'policy' E:\cv\diagram\chat-system\RAG_service\MenuDemo.pdf 

// function testHandleUploadFromCommandLine() {
//     const tenantId = process.argv[2];  // Nhận tenantId từ command line argument
//     const documentName = process.argv[3];  // Nhận documentName từ command line argument
//     const pdfFilePath = process.argv[4];  // Nhận đường dẫn file PDF từ command line argument
  
//     if (!tenantId || !documentName || !pdfFilePath) {
//       console.log("Please provide tenantId, documentName, and the path to the PDF file.");
//       return;
//     }
  
//     const pdfFile = { path: pdfFilePath };
  
//     try {
//       const result = handleUpload({ tenantId, documentName, pdfFile });
//       console.log('File uploaded successfully:', result.pdfPath);
//     } catch (error) {
//       console.error('Error uploading file:', error.message);
//     }
//   }
  
//   // Chạy hàm test từ command line
//   testHandleUploadFromCommandLine();
  
module.exports = { handleUpload };