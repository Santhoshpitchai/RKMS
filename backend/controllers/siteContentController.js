const supabase = require('../config/supabaseClient');
const { uploadImage } = require('../services/imageService');

const isSupabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

// Auto-create site_content table if missing
const ensureTable = async () => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from('site_content').select('key').limit(1);
    if (error && error.code === '42P01') {
      // Table does not exist — create it via RPC (raw SQL)
      await supabase.rpc('exec_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS site_content (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
          CREATE POLICY IF NOT EXISTS "Public read" ON site_content FOR SELECT TO public USING (true);
        `
      }).catch(() => {}); // RPC may not be available; that's OK
      return false;
    }
    return !error;
  } catch (_) {
    return false;
  }
};

// GET /api/site-content — public, returns all key→value pairs
const getSiteContent = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(200).json({ success: true, content: {} });
    }

    const { data, error } = await supabase
      .from('site_content')
      .select('key, value');

    if (error) {
      console.warn('getSiteContent Supabase error:', error.message);
      return res.status(200).json({ success: true, content: {} });
    }

    const content = {};
    (data || []).forEach(row => { content[row.key] = row.value; });
    return res.status(200).json({ success: true, content });
  } catch (error) {
    console.error('getSiteContent error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/site-content/upload — admin only, uploads image and saves URL by key
const uploadSiteImage = async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, message: 'Image key is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadImage(req.file);
    if (!uploadResult.success) {
      return res.status(400).json({ success: false, message: uploadResult.error || 'Image upload failed' });
    }

    const imageUrl = uploadResult.imageUrl;

    // Save key → URL in site_content table
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('site_content')
        .upsert({ key, value: imageUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) {
        console.error('site_content upsert error:', error.message);
        // Still return the image URL so admin can at least see it
        return res.status(200).json({
          success: true,
          key,
          imageUrl,
          warning: 'Image uploaded but could not save to DB. Have you created the site_content table in Supabase?'
        });
      }
    }

    console.log(`✅ Site image saved: [${key}] → ${imageUrl}`);
    return res.status(200).json({ success: true, key, imageUrl });
  } catch (error) {
    console.error('uploadSiteImage error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/site-content/text — admin only, save a plain text/description value
const saveTextContent = async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, message: 'Key is required' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(503).json({ success: false, message: 'Supabase not configured' });
    }

    const { error } = await supabase
      .from('site_content')
      .upsert(
        { key, value: value || '', updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('saveTextContent Supabase error:', error.message, error.code);
      // If table missing, tell the user clearly
      if (error.code === '42P01') {
        return res.status(500).json({
          success: false,
          message: '⚠️ The site_content table does not exist in Supabase. Please run the setup SQL in the Supabase SQL Editor.'
        });
      }
      return res.status(500).json({ success: false, message: error.message });
    }

    console.log(`✅ Site text saved: [${key}] = "${String(value || '').slice(0, 60)}"`);
    return res.status(200).json({ success: true, key, value });
  } catch (error) {
    console.error('saveTextContent error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/site-content/:key — admin only, deletes from DB AND Supabase Storage
const deleteSiteContent = async (req, res) => {
  try {
    const { key } = req.params;
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'images';

    if (isSupabaseConfigured()) {
      // Step 1: Get the current URL so we know which Storage file to delete
      const { data: rows } = await supabase
        .from('site_content')
        .select('value')
        .eq('key', key)
        .limit(1);

      const imageUrl = rows?.[0]?.value;

      // Step 2: Delete from Supabase Storage if we have a URL
      if (imageUrl) {
        try {
          // Extract just the filename from the full URL
          // URL format: https://.../storage/v1/object/public/<bucket>/<filename>
          const parts = imageUrl.split(`/object/public/${bucketName}/`);
          const filePath = parts[1];
          if (filePath) {
            const { error: storageError } = await supabase.storage
              .from(bucketName)
              .remove([decodeURIComponent(filePath)]);
            if (storageError) {
              console.warn('Storage delete warning:', storageError.message);
            } else {
              console.log(`🗑️  Storage file deleted: ${filePath}`);
            }
          }
        } catch (storageErr) {
          console.warn('Storage delete error (non-fatal):', storageErr.message);
        }
      }

      // Step 3: Delete DB record
      const { error: dbError } = await supabase
        .from('site_content')
        .delete()
        .eq('key', key);
      if (dbError) console.warn('deleteSiteContent DB warning:', dbError.message);
    }

    res.status(200).json({ success: true, message: 'Image removed from storage and database' });
  } catch (error) {
    console.error('deleteSiteContent error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getSiteContent, uploadSiteImage, deleteSiteContent, saveTextContent };
