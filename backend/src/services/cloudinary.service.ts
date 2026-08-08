import { cloudinary } from '../config/cloudinary.config';
import { UploadApiResponse } from 'cloudinary';
import { logger } from '../utils/logger';

type CloudinaryFolder = 'logos' | 'covers' | 'menu-items' | 'payment-proofs' | 'gallery';

/**
 * Uploads a file buffer to Cloudinary under a specific folder.
 * Returns the secure URL string.
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: CloudinaryFolder,
  publicId?: string
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `restren/${folder}`,
        public_id: publicId,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
      },
      (error, result) => {
        if (error || !result) {
          logger.error('Cloudinary upload failed:', error);
          return reject(error || new Error('Cloudinary upload returned empty result'));
        }
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Deletes an image from Cloudinary by its public_id.
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Cloudinary: deleted asset ${publicId}`);
  } catch (err) {
    logger.error('Cloudinary delete failed:', err);
  }
};
