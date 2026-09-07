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

// Magic byte signature validation to block fake extension executables & XSS payloads
const validateFileMagicBytes = (buffer) => {
  if (!buffer || buffer.length < 4) return { valid: false, reason: 'File payload is empty or corrupted' };

  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
  const isWebp = buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;

  if (isJpeg || isPng || isGif || isWebp || isPdf) {
    return { valid: true };
  }

  return { valid: false, reason: 'File content failed signature verification. Disguised executables and unverified extensions are rejected.' };
};

const uploadImage = async (file, prefix = 'image') => {
  try {
    let fileBuffer = fs.readFileSync(file.path);

    // Perform strict file signature magic-byte verification
    const magicCheck = validateFileMagicBytes(fileBuffer);
    if (!magicCheck.valid) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      console.warn('⚠️ File upload security block:', magicCheck.reason);
      return { success: false, error: magicCheck.reason };
    }

    // Optimize image: Max width 1200px, convert to WebP with 80% quality, preserve aspect ratio
    try {
      fileBuffer = await sharp(fileBuffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (sharpErr) {
      console.warn('Image optimization warning (using original buffer):', sharpErr.message);
      // If sharp fails, re-read original file buffer
      fileBuffer = fs.readFileSync(file.path);
    }

    // 1. Try Supabase Storage Bucket (100% Free - 1GB Included)
    if (isSupabaseConfigured()) {
      try {
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'images';
        const fileName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;

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
            // Validate the URL is actually publicly accessible (bucket may be private)
            let urlAccessible = false;
            try {
              const http = require('https');
              urlAccessible = await new Promise((resolve) => {
                const req = http.request(publicUrlData.publicUrl, { method: 'HEAD', timeout: 3000 }, (res) => {
                  resolve(res.statusCode >= 200 && res.statusCode < 400);
                });
                req.on('error', () => resolve(false));
                req.on('timeout', () => { req.destroy(); resolve(false); });
                req.end();
              });
            } catch (_) {
              urlAccessible = false;
            }

            if (urlAccessible) {
              try { fs.unlinkSync(file.path); } catch (_) { }
              console.log('✅ Image uploaded to Supabase Storage (public):', publicUrlData.publicUrl);
              return {
                success: true,
                imageUrl: publicUrlData.publicUrl,
                filename: fileName
              };
            } else {
              // Bucket is private or URL inaccessible — delete the uploaded file and fall through to base64
              console.warn('⚠️ Supabase Storage bucket appears to be private or URL inaccessible. Falling back to base64. To fix: go to Supabase Dashboard → Storage → Policies → make the "images" bucket public.');
              try {
                await supabase.storage.from(usedBucket).remove([fileName]);
              } catch (_) {}
            }
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

    // 3. Base64 Data URI fallback — works on ALL devices without any server dependency.
    // Increased to 5MB to cover typical member passport photos.
    const bufferForBase64 = fileBuffer.length > 0 ? fileBuffer : fs.readFileSync(file.path);
    const mime = 'image/webp'; // we always output webp from sharp above
    const base64Str = `data:${mime};base64,${bufferForBase64.toString('base64')}`;
    try { fs.unlinkSync(file.path); } catch (_) { }
    console.log('ℹ️ Image stored as base64 (cross-device compatible)');
    return {
      success: true,
      imageUrl: base64Str,
      filename: file.filename
    };

    // NOTE: We intentionally do NOT fall back to /uploads/filename paths because
    // those are device-local and break when accessed from other machines or browsers.
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
