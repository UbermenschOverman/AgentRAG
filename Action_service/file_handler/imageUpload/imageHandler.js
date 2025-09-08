const cloudinary = require('./cloudinary');
const streamifier = require('streamifier');

/**
 * Upload buffer lên Cloudinary với tag
 */
async function uploadBufferToCloudinary(buffer, folder, filename = null) {
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: 'image',
    };

    if (filename) {
      options.public_id = filename;         // tên ảnh cụ thể
      options.use_filename = false;         // không lấy tên file gốc
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// delete image from Cloudinary
async function deleteImageFromCloudinary(publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

// Upload pdf file to Cloudinary
async function uploadPdfToCloudinary(path, folder, filename = null) {
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: 'raw', // Đặt resource_type là 'raw' cho file PDF
    };
    if (filename) {
      options.public_id = filename;         // tên file cụ thể
      options.use_filename = false;         // không lấy tên file gốc
    }
    const uploadStream = cloudinary.uploader.upload(path, options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

async function deletePdfFromCloudinary(publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}
// }

module.exports = {
  uploadBufferToCloudinary,
  deleteImageFromCloudinary,
  uploadPdfToCloudinary,
  deletePdfFromCloudinary
};