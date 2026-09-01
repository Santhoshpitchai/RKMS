const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;
const supabase = require('../config/supabaseClient');

// Configuration
const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024; // 5MB

const isSupabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

const cloudinaryConfigured =
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET);

if (cloudinaryConfigured && !process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// Ensure uploads directory exists (local fallback)
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
});

const uploadImage = async (file) => {
  try {
    let fileBuffer = fs.readFileSync(file.path);

    // Optimize image: Max width 1200px, convert to WebP with 80% quality, preserve aspect ratio
    try {
      fileBuffer = await sharp(fileBuffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (sharpErr) {
      console.warn('Image optimization warning (using original buffer):', sharpErr.message);
    }

    // 1. Try Supabase Storage Bucket (100% Free - 1GB Included)
    if (isSupabaseConfigured()) {
      try {
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'images';
        const fileName = `event-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;

        let usedBucket = bucketName;
        let { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, fileBuffer, {
            contentType: 'image/webp',
            upsert: true
          });

        // Fallback: try lowercase 'images' bucket if the configured name failed
        if (error && bucketName !== 'images') {
          const fallbackRes = await supabase.storage
            .from('images')
            .upload(fileName, fileBuffer, {
              contentType: 'image/webp',
              upsert: true
            });
          if (!fallbackRes.error) {
            data = fallbackRes.data;
            error = null;
            usedBucket = 'images';
          }
        }

        if (!error && data) {
          // Always use the known bucket name (not parsed from path) to avoid wrong URLs
          const { data: publicUrlData } = supabase.storage
            .from(usedBucket)
            .getPublicUrl(fileName);

          if (publicUrlData && publicUrlData.publicUrl) {
            try { fs.unlinkSync(file.path); } catch (_) { }
            console.log('✅ Image uploaded to Supabase Storage:', publicUrlData.publicUrl);
            return {
              success: true,
              imageUrl: publicUrlData.publicUrl,
              filename: fileName
            };
          }
        } else if (error) {
          console.warn('Supabase storage upload notice:', error.message);
        }
      } catch (supaStoreErr) {
        console.warn('Supabase storage upload notice:', supaStoreErr.message);
      }
    }

    // 2. Try Cloudinary (Free Tier)
    if (cloudinaryConfigured) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: process.env.CLOUDINARY_FOLDER || 'rks-events'
      });
      try { fs.unlinkSync(file.path); } catch (_) { }
      return {
        success: true,
        imageUrl: result.secure_url,
        filename: result.public_id
      };
    }

    // 3. Fallback: Base64 Data URI (100% Free, zero server setup required, works live everywhere)
    if (file.size <= 3 * 1024 * 1024) { // <= 3MB
      const buffer = fs.readFileSync(file.path);
      const mime = file.mimetype || 'image/jpeg';
      const base64Str = `data:${mime};base64,${buffer.toString('base64')}`;
      try { fs.unlinkSync(file.path); } catch (_) { }
      return {
        success: true,
        imageUrl: base64Str,
        filename: file.filename
      };
    }

    // 4. Local File Fallback
    const imageUrl = `/uploads/${file.filename}`;
    return {
      success: true,
      imageUrl,
      filename: file.filename
    };
  } catch (error) {
    console.error('Image upload error:', error);
    return {
      success: false,
      error: error.message || 'Image upload failed'
    };
  }
};

const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl || String(imageUrl).startsWith('http') || String(imageUrl).startsWith('data:image')) {
      return { success: true };
    }
    const filename = String(imageUrl).split('/').pop();
    const filePath = path.join(UPLOAD_PATH, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }

    return { success: false, error: 'File not found' };
  } catch (error) {
    console.error('Image deletion error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  upload,
  uploadImage,
  deleteImage,
  UPLOAD_PATH
};
