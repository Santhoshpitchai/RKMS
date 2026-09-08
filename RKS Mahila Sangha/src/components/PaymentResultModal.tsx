import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Download, RotateCcw, X, Phone, Mail, MapPin, Hash, ClipboardCopy } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentSuccessInfo {
  type: 'membership' | 'donation';
  paymentId: string;
  orderId: string;
  amount: number;
  date: string;
  // Membership-specific
  memberId?: string;
  memberName?: string;
  email?: string;
  phone?: string;
  city?: string;
  photoUrl?: string;
  // Donation-specific
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  purpose?: string;
  receiptDownloadUrl?: string;
}

export interface PaymentFailureInfo {
  type: 'membership' | 'donation';
  reason?: string;
  code?: string;
  amount?: number;
  orderId?: string;
}

interface PaymentResultModalProps {
  success?: PaymentSuccessInfo | null;
  failure?: PaymentFailureInfo | null;
  onClose: () => void;
  onRetry?: () => void;
  onDownloadCard?: () => void;
}

// ─── Confetti Particle ────────────────────────────────────────────────────────

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  shape: 'rect' | 'circle' | 'star';
  opacity: number;
}

const COLORS = ['#E5C100', '#0A6C87', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const burstCount = useRef(0);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const spawn = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.35;
      for (let i = 0; i < 120; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 8;
        particles.current.push({
          id: Date.now() + i,
          x: cx + (Math.random() - 0.5) * 40,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 5 + Math.random() * 8,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 12,
          shape: (['rect', 'circle', 'star'] as const)[Math.floor(Math.random() * 3)],
          opacity: 1,
        });
      }
    };

    spawn();
    burstCount.current = 1;

    // Second burst
    const t1 = setTimeout(() => { spawn(); burstCount.current++; }, 400);
    const t2 = setTimeout(() => { spawn(); burstCount.current++; }, 800);

    const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const b = ((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        else ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        ctx.lineTo(cx + (r / 2) * Math.cos(b), cy + (r / 2) * Math.sin(b));
      }
      ctx.closePath();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current = particles.current.filter(p => p.opacity > 0);
      particles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;
        p.opacity -= 0.012;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'star') {
          drawStar(ctx, 0, 0, p.size / 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      });
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animRef.current);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active]);

  return canvasRef;
}

// ─── Copied Feedback ──────────────────────────────────────────────────────────
function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="space-y-0.5">
      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[11px] font-bold text-gray-900 truncate">{value}</span>
        <button type="button" onClick={copy} className="text-gray-400 hover:text-[#0A6C87] transition-colors flex-shrink-0">
          {copied ? <span className="text-emerald-500 text-[9px] font-bold">✓</span> : <ClipboardCopy className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function PaymentResultModal({ success, failure, onClose, onRetry, onDownloadCard }: PaymentResultModalProps) {
  const isSuccess = Boolean(success);
  const canvasRef = useConfetti(isSuccess);

  // Prevent scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!success && !failure) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Confetti Canvas (success only) */}
      {isSuccess && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ width: '100%', height: '100%' }}
        />
      )}

      <div
        className="relative z-20 bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        style={{ maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gradient bar */}
        <div
          className="h-2"
          style={{
            background: isSuccess
              ? 'linear-gradient(90deg, #10b981, #0A6C87, #E5C100)'
              : 'linear-gradient(90deg, #ef4444, #f97316, #b91c1c)',
          }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-5">

          {/* ── SUCCESS STATE ── */}
          {isSuccess && success && (
            <>
              {/* Badge */}
              <div className="text-center space-y-3 pt-1">
                <div className="relative inline-flex">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl border-4 border-emerald-100"
                    style={{ background: 'linear-gradient(135deg,#d1fae5,#ecfdf5)' }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </div>
                  {/* Animated ring */}
                  <span className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-30" />
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">
                    {success.type === 'membership' ? '🎉 Membership Activated!' : '💚 Donation Received!'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {success.type === 'membership'
                      ? 'Congratulations! Your Lifetime Membership is now officially active in Raju Kshatriya Mahila Sangha.'
                      : 'Thank you for your generous contribution! Your support empowers women across Karnataka.'}
                  </p>
                </div>

                {/* Amount pill */}
                <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-5 py-2">
                  <span className="text-xs font-bold text-emerald-700">Amount Paid</span>
                  <span className="text-xl font-extrabold text-emerald-700">₹{success.amount.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] bg-emerald-500 text-white rounded-full px-2 py-0.5 font-bold">✓ PAID</span>
                </div>
              </div>

              {/* Transaction Summary Card */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Hash className="w-3 h-3" /> Transaction Summary
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <CopyableField label="Payment ID" value={success.paymentId} />
                  <CopyableField label="Order ID" value={success.orderId} />
                  {success.memberId && <CopyableField label="Member ID" value={success.memberId} />}
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">Date & Time</span>
                    <span className="text-[11px] font-bold text-gray-900">{success.date}</span>
                  </div>
                </div>
              </div>

              {/* Person details */}
              {success.type === 'membership' && success.memberName && (
                <div className="bg-gradient-to-br from-[#0A6C87] to-cyan-800 rounded-2xl p-4 text-white flex items-center gap-3">
                  {success.photoUrl ? (
                    <img src={success.photoUrl} alt={success.memberName} className="w-14 h-16 rounded-xl object-cover border-2 border-white/30 flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-16 bg-white/20 rounded-xl border-2 border-white/30 flex items-center justify-center flex-shrink-0 text-2xl">👤</div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="font-extrabold text-base truncate">{success.memberName}</h4>
                    <p className="text-[11px] text-[#E5C100] font-mono font-bold">{success.memberId}</p>
                    {success.email && (
                      <p className="text-[10px] text-cyan-100 flex items-center gap-1"><Mail className="w-3 h-3" />{success.email}</p>
                    )}
                    {success.phone && (
                      <p className="text-[10px] text-cyan-100 flex items-center gap-1"><Phone className="w-3 h-3" />{success.phone}</p>
                    )}
                    {success.city && (
                      <p className="text-[10px] text-cyan-100 flex items-center gap-1"><MapPin className="w-3 h-3" />{success.city}</p>
                    )}
                  </div>
                  <span className="bg-[#E5C100] text-[#0A6C87] text-[8px] font-black px-2 py-1 rounded-full uppercase flex-shrink-0">ACTIVE</span>
                </div>
              )}

              {success.type === 'donation' && success.donorName && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-extrabold text-emerald-800">Donor Details</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <div><span className="font-bold text-gray-400 text-[9px] block uppercase">Name</span>{success.donorName}</div>
                    <div><span className="font-bold text-gray-400 text-[9px] block uppercase">Email</span><span className="truncate block">{success.donorEmail}</span></div>
                    {success.donorPhone && <div><span className="font-bold text-gray-400 text-[9px] block uppercase">Phone</span>{success.donorPhone}</div>}
                    {success.purpose && <div><span className="font-bold text-gray-400 text-[9px] block uppercase">Purpose</span>{success.purpose}</div>}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-1">
                {success.type === 'membership' && onDownloadCard && (
                  <button
                    type="button"
                    onClick={onDownloadCard}
                    className="w-full bg-[#E5C100] hover:bg-[#CCA900] text-[#0A6C87] py-3 rounded-xl font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-100"
                  >
                    <Download className="w-4 h-4" /> Download Official Member ID Card
                  </button>
                )}
                {success.type === 'donation' && (
                  <a
                    href={
                      (() => {
                        const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken') || '';
                        const base = success.receiptDownloadUrl && !success.receiptDownloadUrl.includes('/uploads/')
                          ? (success.receiptDownloadUrl.startsWith('http') ? success.receiptDownloadUrl : `${API_BASE_URL}${success.receiptDownloadUrl.startsWith('/') ? '' : '/'}${success.receiptDownloadUrl}`)
                          : `${API_BASE_URL}/donation/receipt/${success.paymentId || success.orderId}`;
                        return base.includes('token=') ? base : `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
                      })()
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-[#0A6C87] hover:bg-cyan-800 text-white py-3 rounded-xl font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-100 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Download Official Receipt (PDF)
                  </a>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-xs transition-colors"
                >
                  {success.type === 'membership' ? 'Close & View Membership Card' : 'Close Window'}
                </button>
              </div>
            </>
          )}

          {/* ── FAILURE STATE ── */}
          {!isSuccess && failure && (
            <>
              {/* Sad header */}
              <div className="text-center space-y-3 pt-1">
                <div className="relative inline-flex">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl border-4 border-red-100"
                    style={{ background: 'linear-gradient(135deg,#fee2e2,#fff1f2)' }}
                  >
                    <XCircle className="w-12 h-12 text-red-500" />
                  </div>
                </div>

                {/* Sad emojis row */}
                <div className="flex justify-center gap-2 text-2xl animate-bounce">
                  <span>😔</span><span>💔</span><span>😢</span>
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Payment Failed</h2>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {failure.type === 'membership'
                      ? "We're sorry, your membership payment could not be completed. No amount has been deducted."
                      : "We're sorry, your donation could not be processed. No amount has been deducted."}
                  </p>
                </div>
              </div>

              {/* Error details */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-400">Failure Details</p>
                <div className="space-y-2 text-xs">
                  {failure.reason && (
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <div>
                        <span className="text-[9px] font-bold text-red-400 uppercase block">Reason</span>
                        <span className="font-semibold text-red-900">{failure.reason}</span>
                      </div>
                    </div>
                  )}
                  {failure.code && (
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <div>
                        <span className="text-[9px] font-bold text-red-400 uppercase block">Error Code</span>
                        <span className="font-mono font-bold text-red-900">{failure.code}</span>
                      </div>
                    </div>
                  )}
                  {failure.orderId && (
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <div>
                        <span className="text-[9px] font-bold text-red-400 uppercase block">Order Reference</span>
                        <span className="font-mono font-bold text-red-900">{failure.orderId}</span>
                      </div>
                    </div>
                  )}
                  {failure.amount && (
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <div>
                        <span className="text-[9px] font-bold text-red-400 uppercase block">Attempted Amount</span>
                        <span className="font-bold text-red-900">₹{failure.amount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-extrabold text-amber-800">💡 What you can do</p>
                <ul className="text-[11px] text-amber-700 space-y-1.5 leading-relaxed">
                  <li>• Check that your card/UPI/bank details are correct</li>
                  <li>• Ensure sufficient balance in your account</li>
                  <li>• Try a different payment method (UPI, Net Banking, Card)</li>
                  <li>• Contact your bank if money was deducted but payment failed</li>
                  <li>• Reach us at <span className="font-bold">+91 9972648909</span> for support</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                {onRetry && (
                  <button
                    type="button"
                    onClick={() => { onClose(); setTimeout(onRetry, 150); }}
                    className="w-full bg-[#0A6C87] hover:bg-cyan-800 text-white py-3 rounded-xl font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-100"
                  >
                    <RotateCcw className="w-4 h-4" /> Try Again
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
