import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Upload, Check, RotateCcw, Maximize2 } from 'lucide-react';

interface ImageCropModalProps {
  file: File;
  aspectRatio?: number;
  onCropped: (croppedFile: File) => void;
  onCancel: () => void;
}

async function cropImageToBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string
): Promise<File> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth  / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width  = Math.round(crop.width  * scaleX);
  canvas.height = Math.round(crop.height * scaleY);

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width  * scaleX,
    crop.height * scaleY,
    0, 0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
      resolve(new File([blob], 'cropped-' + fileName, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.95);
  });
}

export function ImageCropModal({ file, aspectRatio, onCropped, onCancel }: ImageCropModalProps) {
  const [imgSrc]        = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping]       = useState(false);
  const [naturalSize, setNaturalSize]     = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // When image loads: default selection = entire image (no cutting)
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
    setNaturalSize({ w: naturalWidth, h: naturalHeight });

    if (aspectRatio) {
      // Locked ratio: center crop covering max area
      setCrop(centerCrop(
        makeAspectCrop({ unit: '%', width: 100 }, aspectRatio, width, height),
        width, height
      ));
    } else {
      // Free: select entire image by default
      setCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
    }
  }, [aspectRatio]);

  const handleCropAndUpload = async () => {
    if (!imgRef.current || !completedCrop) return;
    setIsCropping(true);
    try {
      const cropped = await cropImageToBlob(imgRef.current, completedCrop, file.name);
      onCropped(cropped);
    } catch {
      onCropped(file); // fallback: upload original
    }
  };

  return (
    // Full-screen overlay
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
    >
      {/* ── Top bar ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/10"
        style={{ background: 'rgba(15,23,42,0.95)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Maximize2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Crop Image</p>
            <p className="text-slate-400 text-[11px]">
              {naturalSize.w > 0 && `Original: ${naturalSize.w} × ${naturalSize.h}px · `}
              {aspectRatio
                ? `Locked to ${aspectRatio === 16/9 ? '16:9' : aspectRatio.toFixed(2)} ratio — adjust selection`
                : 'Drag to select any area — or keep full image selected'}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Image area — takes all remaining space ── */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-6"
        style={{ minHeight: 0 }}
      >
        <ReactCrop
          crop={crop}
          onChange={c => setCrop(c)}
          onComplete={c => setCompletedCrop(c)}
          aspect={aspectRatio}
          minWidth={20}
          minHeight={20}
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        >
          <img
            ref={imgRef}
            src={imgSrc}
            alt="Crop"
            onLoad={onImageLoad}
            style={{
              display: 'block',
              maxWidth:  'min(90vw, 1200px)',
              maxHeight: 'calc(100vh - 200px)',
              width:     'auto',
              height:    'auto',
              objectFit: 'contain',
            }}
          />
        </ReactCrop>
      </div>

      {/* ── Bottom action bar ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between gap-4 px-6 py-4 border-t border-white/10"
        style={{ background: 'rgba(15,23,42,0.95)' }}
      >
        {/* Tips */}
        <p className="text-slate-500 text-xs hidden sm:block">
          💡 Drag handles to adjust · Keep full selection to upload entire image
        </p>

        <div className="flex items-center gap-3 ml-auto">
          {/* Skip crop — upload original untouched */}
          <button
            onClick={() => onCropped(file)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Upload Full (no crop)
          </button>

          {/* Crop & upload */}
          <button
            onClick={handleCropAndUpload}
            disabled={!completedCrop || isCropping}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${
              !completedCrop || isCropping
                ? 'bg-cyan-500/20 text-cyan-300/40 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/30'
            }`}
          >
            {isCropping ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cropping…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <Upload className="w-4 h-4" />
                Crop &amp; Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
