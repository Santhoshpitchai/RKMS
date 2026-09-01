import { useState, useEffect } from 'react';
import { Image, Upload, RefreshCw, CheckCircle, AlertCircle, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../services/api';
import { AdminLayout } from './AdminLayout';
import { useTheme } from '../../context/ThemeContext';
import { ImageCropModal } from './ImageCropModal';

const IMAGE_SLOTS = [
  {
    group: 'About Us Page',
    aspect: undefined, // free crop
    items: [
      { key: 'about_us_hero', label: 'Organization History Image', hint: 'Shown beside "Our Journey" text on the About Us page' },
    ]
  },
  {
    group: 'Services Page',
    aspect: 16 / 9, // landscape for service cards
    items: [
      { key: 'service_educational', label: 'Educational Programs',  hint: 'Educational Programs service card' },
      { key: 'service_skill',       label: 'Skill Development',     hint: 'Skill Development service card' },
      { key: 'service_community',   label: 'Community Support',     hint: 'Community Support service card' },
      { key: 'service_welfare',     label: 'Women Welfare',         hint: 'Women Welfare service card' },
      { key: 'service_cultural',    label: 'Cultural Activities',   hint: 'Cultural Activities service card' },
      { key: 'service_family',      label: 'Family Support',        hint: 'Family Support service card' },
    ]
  },
  {
    group: 'Landing Page',
    aspect: 16 / 9,
    items: [
      { key: 'landing_hero', label: 'Hero / Banner Image', hint: 'Main hero image on the homepage' },
    ]
  }
];

interface ContentMap { [key: string]: string }

export function PageImagesManager() {
  const token = localStorage.getItem('adminToken') || '';
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [content,   setContent]   = useState<ContentMap>({});
  const [descs,     setDescs]     = useState<ContentMap>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving,    setSaving]    = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  // Crop modal state
  const [cropTarget, setCropTarget] = useState<{ key: string; file: File; aspect?: number } | null>(null);

  /* ── styles ─────────────────────────────────────────── */
  const card     = isLight ? 'bg-white border-slate-200 shadow'           : 'bg-slate-900/70 border-slate-800';
  const textPrim = isLight ? 'text-slate-900'                              : 'text-white';
  const textSub  = isLight ? 'text-slate-500'                              : 'text-slate-400';
  const inputCls = isLight
    ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-cyan-400'
    : 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-600 focus:border-cyan-500';

  /* ── fetch all site content ──────────────────────────── */
  const fetchContent = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_BASE_URL}/site-content`);
      const json = await res.json();
      if (json.success) {
        const all: ContentMap = json.content || {};
        const imgs: ContentMap = {};
        const dsc:  ContentMap = {};
        Object.entries(all).forEach(([k, v]) => {
          if (k.endsWith('_desc')) dsc[k.slice(0, -5)] = v;
          else imgs[k] = v;
        });
        setContent(imgs);
        setDescs(dsc);
      }
    } catch {
      toast.error('Failed to load page images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContent(); }, []);

  /* ── upload image ────────────────────────────────────── */
  const handleUpload = async (key: string, file: File) => {
    setUploading(key);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('key', key);

      const res  = await fetch(`${API_BASE_URL}/site-content/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();

      if (json.success) {
        setContent(prev => ({ ...prev, [key]: json.imageUrl }));
        if (json.warning) toast.warning(json.warning);
        else toast.success('✅ Image uploaded and live on the website!');
      } else {
        toast.error(json.message || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  /* ── save description ────────────────────────────────── */
  const handleSaveDesc = async (key: string) => {
    const value = descs[key] ?? '';
    setSaving(key);
    try {
      const res  = await fetch(`${API_BASE_URL}/site-content/text`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: `${key}_desc`, value }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success('Description saved!');
      } else {
        toast.error(json.message || 'Could not save description');
      }
    } catch {
      toast.error('Save failed. Check the backend is running.');
    } finally {
      setSaving(null);
    }
  };

  /* ── remove image ────────────────────────────────────── */
  const handleRemove = async (key: string) => {
    try {
      await fetch(`${API_BASE_URL}/site-content/${key}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setContent(prev => { const n = { ...prev }; delete n[key]; return n; });
      toast.success('Image removed — default will show');
    } catch {
      toast.error('Remove failed');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Crop Modal */}
        {cropTarget && (
          <ImageCropModal
            file={cropTarget.file}
            aspectRatio={cropTarget.aspect}
            onCropped={croppedFile => {
              setCropTarget(null);
              handleUpload(cropTarget.key, croppedFile);
            }}
            onCancel={() => setCropTarget(null)}
          />
        )}

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-extrabold ${textPrim}`}>Page Images</h1>
            <p className={`text-sm mt-1 ${textSub}`}>
              Upload custom images and add descriptions for each section. Changes go live instantly.
            </p>
          </div>
          <button
            onClick={fetchContent}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold hover:bg-cyan-500/20 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* ── Loading ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          IMAGE_SLOTS.map(group => (
            <div key={group.group} className={`rounded-2xl border p-5 ${card}`}>

              {/* Group title */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Image className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <h2 className={`font-bold text-sm ${textPrim}`}>{group.group}</h2>
              </div>

              {/* Cards */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map(slot => {
                  const imgUrl     = content[slot.key];
                  const descVal    = descs[slot.key] ?? '';
                  const isUploading = uploading === slot.key;
                  const isSaving   = saving   === slot.key;

                  return (
                    <div
                      key={slot.key}
                      className={`rounded-xl border overflow-hidden ${
                        isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-700/60 bg-slate-800/40'
                      }`}
                    >
                      {/* ── Square image box ── */}
                      <div
                        style={{ position: 'relative', width: '100%', paddingTop: '100%' }}
                        className={`overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}
                      >
                        <div style={{ position: 'absolute', inset: 0 }} className="flex items-center justify-center">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={slot.label}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="text-center space-y-1 p-4">
                              <AlertCircle className={`w-8 h-8 mx-auto ${isLight ? 'text-slate-300' : 'text-slate-600'}`} />
                              <p className={`text-[10px] font-medium ${textSub}`}>No image uploaded yet</p>
                            </div>
                          )}

                          {/* Upload spinner overlay */}
                          {isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <p className="text-white text-xs font-bold">Uploading…</p>
                            </div>
                          )}
                        </div>

                        {/* Live badge */}
                        {imgUrl && !isUploading && (
                          <span
                            style={{ position: 'absolute', top: 8, left: 8 }}
                            className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg"
                          >
                            <CheckCircle className="w-3 h-3" /> Live
                          </span>
                        )}

                        {/* Remove button */}
                        {imgUrl && !isUploading && (
                          <button
                            onClick={() => handleRemove(slot.key)}
                            style={{ position: 'absolute', top: 8, right: 8 }}
                            className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg shadow-lg transition-all"
                            title="Remove image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* ── Controls below image ── */}
                      <div className="p-3 space-y-3">

                        {/* Slot name */}
                        <div>
                          <p className={`text-xs font-bold ${textPrim}`}>{slot.label}</p>
                          <p className={`text-[10px] mt-0.5 ${textSub}`}>{slot.hint}</p>
                        </div>

                        {/* Description textarea */}
                        <div className="space-y-1.5">
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>
                            Caption / Description
                          </p>
                          <textarea
                            rows={3}
                            value={descVal}
                            placeholder="Write a caption or description for this image…"
                            onChange={e => setDescs(prev => ({ ...prev, [slot.key]: e.target.value }))}
                            className={`w-full resize-none rounded-lg border px-2.5 py-2 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all ${inputCls}`}
                          />
                          <button
                            onClick={() => handleSaveDesc(slot.key)}
                            disabled={isSaving}
                            className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              isSaving
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 opacity-60 cursor-not-allowed'
                                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'
                            }`}
                          >
                            {isSaving ? (
                              <>
                                <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                Saving…
                              </>
                            ) : (
                              <><Save className="w-3 h-3" /> Save Description</>
                            )}
                          </button>
                        </div>

                        {/* Upload button — opens crop modal */}
                        <label className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg border-2 border-dashed cursor-pointer text-xs font-bold transition-all ${
                          isUploading
                            ? 'opacity-50 cursor-not-allowed border-slate-400 text-slate-400'
                            : isLight
                              ? 'border-slate-300 text-slate-500 hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50'
                              : 'border-slate-600 text-slate-400 hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/5'
                        }`}>
                          <Upload className="w-3.5 h-3.5" />
                          {imgUrl ? 'Replace (with Crop)' : 'Upload & Crop'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploading}
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) setCropTarget({ key: slot.key, file: f, aspect: group.aspect });
                              e.target.value = '';
                            }}
                          />
                        </label>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
