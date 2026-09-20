import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, PartyPopper, X, ArrowRight, ShieldCheck, HeartHandshake, Users, Award, Scissors, Rocket, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// GRAND LAUNCH CONFIGURATION
// You can adjust these settings to control when the launch celebration active.
// ============================================================================
const LAUNCH_CONFIG = {
  // Master switch - set to false whenever you want to completely disable launch animations
  enabled: true,

  // Auto-expiration date (YYYY-MM-DD format). After this date, animations auto-hide!
  expirationDate: '2026-10-04',

  // LocalStorage key to remember if user already performed the launch ceremony
  storageKey: 'rkms_launch_curtain_done_v2',

  // Duration in milliseconds for how long celebration particles run after clicking launch (e.g. 5000ms = 5s)
  celebrationDurationMs: 5000,
};

export const GrandLaunchCelebration: React.FC = () => {
  const [showCurtain, setShowCurtain] = useState<boolean>(false);
  const [isOpening, setIsOpening] = useState<boolean>(false);
  const [isCelebrating, setIsCelebrating] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<any[]>([]);
  const navigate = useNavigate();

  // Check expiration date and activation
  const isLaunchActive = (): boolean => {
    if (!LAUNCH_CONFIG.enabled) return false;
    const now = new Date();
    const expire = new Date(LAUNCH_CONFIG.expirationDate);
    expire.setHours(23, 59, 59, 999);
    return now <= expire;
  };

  const active = isLaunchActive();

  useEffect(() => {
    if (!active) return;
    const performed = localStorage.getItem(LAUNCH_CONFIG.storageKey);
    if (!performed) {
      setShowCurtain(true);
    }
  }, [active]);

  // Web Audio API Fanfare Chime (Plays synthesized brass chime on click)
  const playLaunchFanfare = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const freqs = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.01, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.9);
      });
    } catch (e) {
      // Audio autoplay restriction fallback
    }
  };

  // 60FPS Confetti & Fireworks Particle Engine
  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const colors = ['#f59e0b', '#ec4899', '#0d9488', '#e11d48', '#10b981', '#6366f1', '#fbbf24', '#ffffff'];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render Active Burst Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.vRotation;
        p.opacity -= p.decay;

        if (p.opacity <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'star') {
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            ctx.lineTo(Math.cos((s * Math.PI * 2) / 5) * p.size, Math.sin((s * Math.PI * 2) / 5) * p.size);
            ctx.lineTo(
              Math.cos((s * Math.PI * 2 + Math.PI) / 5) * (p.size / 2),
              Math.sin((s * Math.PI * 2 + Math.PI) / 5) * (p.size / 2)
            );
          }
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // ONLY spawn ambient sparkles WHILE celebration is active
      if (isCelebrating && Math.random() < 0.3) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: -10,
          size: Math.random() * 6 + 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 2 + 1,
          gravity: 0.02,
          rotation: Math.random() * Math.PI * 2,
          vRotation: (Math.random() - 0.5) * 0.1,
          shape: Math.random() > 0.5 ? 'star' : 'rect',
          opacity: 1,
          decay: 0.005,
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, isCelebrating]);

  // Trigger massive fireworks explosion around center screen
  const triggerFireworksBurst = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    const colors = ['#f59e0b', '#ec4899', '#0d9488', '#e11d48', '#10b981', '#6366f1', '#fbbf24', '#ffffff', '#ffd700'];

    const newParticles: any[] = [];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 14 + 3;
      newParticles.push({
        x: centerX + (Math.random() - 0.5) * 40,
        y: centerY + (Math.random() - 0.5) * 40,
        size: Math.random() * 10 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        gravity: 0.15,
        rotation: Math.random() * Math.PI * 2,
        vRotation: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.6 ? 'star' : Math.random() > 0.3 ? 'rect' : 'circle',
        opacity: 1,
        decay: Math.random() * 0.01 + 0.008,
      });
    }

    particlesRef.current.push(...newParticles);
  };

  // User Clicks "LAUNCH WEBSITE" Button
  const handleLaunchClick = () => {
    if (isOpening) return;

    setIsOpening(true);
    setIsCelebrating(true);

    // Play fanfare audio chime
    playLaunchFanfare();

    // Trigger initial fireworks blast
    triggerFireworksBurst();

    // Secondary fireworks blast 350ms later
    setTimeout(() => {
      triggerFireworksBurst();
    }, 350);

    // Mark storage as launch ceremony completed
    localStorage.setItem(LAUNCH_CONFIG.storageKey, 'true');

    // After curtain animation opens (1.2s), reveal site and show welcome modal
    setTimeout(() => {
      setShowCurtain(false);
      setIsOpening(false);
      setShowModal(true);
    }, 1200);

    // ⏱️ AUTOMATICALLY STOP CELEBRATION & PARTICLES AFTER 5 SECONDS
    setTimeout(() => {
      setIsCelebrating(false);
    }, LAUNCH_CONFIG.celebrationDurationMs);

    // Automatically close modal after 8 seconds total so site returns to 100% normal view
    setTimeout(() => {
      setShowModal(false);
    }, LAUNCH_CONFIG.celebrationDurationMs + 3000);
  };

  if (!active) return null;

  return (
    <>
      {/* Canvas Layer for Fireworks & Celebration Particles */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50"
      />

      {/* 🎭 GRAND LAUNCH CURTAIN REVEAL OVERLAY */}
      {showCurtain && (
        <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-between pointer-events-auto">
          {/* TOP CURTAIN HALF */}
          <div
            className={`w-full h-1/2 bg-gradient-to-b from-slate-950 via-rose-950 to-amber-950 border-b-4 border-amber-400 shadow-2xl transition-transform duration-1000 ease-in-out flex flex-col items-center justify-end pb-8 ${
              isOpening ? '-translate-y-full' : 'translate-y-0'
            }`}
          >
            {/* Top Golden Ornamental Crest */}
            <div className="absolute top-6 flex items-center space-x-3 text-amber-300/80 uppercase tracking-widest text-xs font-semibold">
              <Crown className="w-5 h-5 text-amber-400 animate-bounce" />
              <span>Raju Kshatriya Mahila Sangha</span>
              <Crown className="w-5 h-5 text-amber-400 animate-bounce" />
            </div>

            {/* Glowing Logo & Title */}
            <div className="text-center px-4 space-y-3 max-w-xl">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 shadow-2xl ring-4 ring-amber-300/40 animate-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-100 to-amber-300 tracking-tight drop-shadow-md">
                GRAND DIGITAL LAUNCH
              </h1>
              <p className="text-xs sm:text-sm text-amber-100/80 font-medium">
                Official Digital Platform & Member Portal Inauguration
              </p>
            </div>
          </div>

          {/* CENTER LAUNCH BUTTON */}
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className={`pointer-events-auto transition-all duration-500 ${isOpening ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`}>
              <button
                onClick={handleLaunchClick}
                className="relative group px-8 sm:px-10 py-4 sm:py-5 rounded-full bg-gradient-to-r from-amber-500 via-rose-600 to-amber-500 text-white font-extrabold text-base sm:text-xl shadow-2xl hover:shadow-[0_0_50px_rgba(245,158,11,0.8)] ring-8 ring-amber-300/50 hover:ring-amber-200 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center space-x-3.5 cursor-pointer overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="p-2 bg-black/20 rounded-full text-amber-200 group-hover:rotate-12 transition-transform">
                  <Scissors className="w-6 h-6" />
                </span>
                <span className="tracking-wider uppercase drop-shadow-md">
                  🚀 LAUNCH WEBSITE
                </span>
                <span className="p-2 bg-black/20 rounded-full text-amber-200 group-hover:scale-125 transition-transform">
                  <PartyPopper className="w-6 h-6" />
                </span>
              </button>
              <p className="text-center text-amber-200/90 text-xs mt-3 font-semibold tracking-wide drop-shadow animate-pulse">
                ✨ Click button to inaugurate & open platform
              </p>
            </div>
          </div>

          {/* BOTTOM CURTAIN HALF */}
          <div
            className={`w-full h-1/2 bg-gradient-to-t from-slate-950 via-rose-950 to-amber-950 border-t-4 border-amber-400 shadow-2xl transition-transform duration-1000 ease-in-out flex flex-col items-center justify-start pt-12 ${
              isOpening ? 'translate-y-full' : 'translate-y-0'
            }`}
          >
            <div className="text-center text-amber-200/60 text-xs space-y-1">
              <p>Empowering Women • Fostering Community • Serving Society</p>
              <p className="text-[10px] text-amber-300/40">© 2026 Raju Kshatriya Mahila Sangha. All Rights Reserved.</p>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 TOP ANNOUNCEMENT RIBBON */}
      {showBanner && !showCurtain && (
        <div className="relative z-30 bg-gradient-to-r from-amber-600 via-rose-600 to-teal-700 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex items-center justify-between text-xs sm:text-sm font-medium">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <span className="inline-flex items-center justify-center p-1 bg-white/20 backdrop-blur-md rounded-full text-amber-200 animate-pulse shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <p className="truncate">
                <span className="font-bold uppercase tracking-wider text-amber-200 bg-amber-950/40 px-2 py-0.5 rounded text-[10px] sm:text-xs mr-2">
                  Official Launch
                </span>
                Welcome to the official digital platform of <span className="font-semibold underline decoration-amber-300">Raju Kshatriya Mahila Sangha</span>! 🎉
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0 ml-2">
              <button
                onClick={() => {
                  setShowCurtain(true);
                  setIsOpening(false);
                }}
                className="hidden sm:inline-flex items-center space-x-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border border-amber-300/40 text-xs px-3 py-1 rounded-full backdrop-blur-sm transition-all shadow-sm font-semibold"
              >
                <Rocket className="w-3.5 h-3.5 text-amber-300" />
                <span>Re-play Launch Ceremony</span>
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center space-x-1 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm transition-all shadow-sm"
              >
                <span>Highlights</span>
                <PartyPopper className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white"
                title="Hide Banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎆 POST-LAUNCH WELCOME MODAL */}
      {showModal && !showCurtain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300 animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-100 transform transition-all animate-scaleUp">
            {/* Modal Header Decorative Banner */}
            <div className="relative h-48 bg-gradient-to-br from-amber-500 via-rose-500 to-teal-700 flex items-center justify-center p-6 text-center text-white overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_60%)] pointer-events-none" />
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative z-10 space-y-2 max-w-lg">
                <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest text-amber-100 border border-white/30 shadow-inner">
                  <PartyPopper className="w-4 h-4 text-amber-300" />
                  <span>Grand Inauguration Complete</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-sm leading-tight">
                  Welcome to Our Official Website!
                </h2>
                <p className="text-xs sm:text-sm text-white/90 font-medium">
                  Raju Kshatriya Mahila Sangha — Connecting, Empowering & Serving Our Community Digitally.
                </p>
              </div>
            </div>

            {/* Modal Body / Feature Cards */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-start space-x-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Official Membership</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Register online, get instant digital membership ID & access member portal.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-start space-x-3">
                  <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Community Events</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      View upcoming events, book registration tickets & get instant QR pass.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100 flex items-start space-x-3">
                  <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-md shrink-0">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Direct Causes & Support</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Support women empowerment, student scholarships & social welfare.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-start space-x-3">
                  <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Instant Audit Receipts</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Download PDF receipts with Razorpay payment tracking anytime.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-gray-100">
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-center"
                >
                  Explore Website
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    navigate('/membership');
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-amber-600 via-rose-600 to-teal-700 hover:opacity-95 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 group"
                >
                  <span>Become a Member Today</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
