import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload file to Cloudinary
export const uploadToCloudinary = async (fileBuffer, options = {}) => {
  try {
    let resourceType = 'auto';
    if (options.mimetype === 'application/pdf' || (options.filename && options.filename.match(/\.pdf$/i))) {
      resourceType = 'raw';
    }
    const uploadOptions = {
      resource_type: resourceType,
      ...options
    };

    // Convert buffer to base64
    const base64File = fileBuffer.toString('base64');
    const dataURI = `data:${options.mimetype || 'application/octet-stream'};base64,${base64File}`;

    const result = await cloudinary.uploader.upload(dataURI, uploadOptions);
    
    console.log(`☁️ Uploaded to Cloudinary: ${result.public_id}`);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw error;
  }
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw error;
  }
};

// Generate thumbnail
export const generateThumbnail = async (publicId, options = {}) => {
  try {
    const thumbnailOptions = {
      width: 300,
      height: 300,
      crop: 'fill',
      quality: 'auto',
      ...options
    };

    const thumbnailUrl = cloudinary.url(publicId, thumbnailOptions);
    return thumbnailUrl;
  } catch (error) {
    console.error('❌ Thumbnail generation error:', error);
    throw error;
  }
};

export default cloudinary; 