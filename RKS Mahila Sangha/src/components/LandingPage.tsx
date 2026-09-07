import { Link } from 'react-router-dom';
import { Target, Eye, Users, Heart, Calendar, Award, MapPin, ArrowRight, BookOpen, ShieldCheck, HeartHandshake, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import heroImage from '../assets/Heroimage.jpg';
import logo from '../assets/RKMS Logo.png';
import { eventsApi, resolveBackendAssetUrl } from '../services/api';
import { MemberDashboard } from './MemberDashboard';
import { useLanguage } from '../context/LanguageContext';
import { useSiteImage } from '../services/useSiteContent';
import { formatDateSafe } from './EventRegistrationModal';

// Real Leadership Team Assets
import shanthaImg from '../assets/Shantha Kondur.png';
import padmaRajuImg from '../assets/Smt. Padma Raju.png';
import leelaImg from '../assets/Mrs. Leelakrishnamaraju.png';
import padmaRImg from '../assets/Ms. Padma R.png';
import indiraImg from '../assets/Smt. Indira.png';
import pushpaImg from '../assets/Pushpa Vasu.png';
import babithaImg from '../assets/Babitha Nadampalli Sreedhara Raju.png';

interface EventItem {
  id: number;
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  image_url?: string;
  image?: string;
  images?: string[];
  category: 'upcoming' | 'past';
  fee?: number;
}

function LandingEventGallery({ images, title }: { images: string[]; title: string }) {
  const [current, setCurrent] = useState(0);
  if (!images.length) return null;

  return (
    <div className="relative h-44 bg-gray-100 overflow-hidden">
      <ImageWithFallback
        src={resolveBackendAssetUrl(images[current])}
        alt={`${title} – photo ${current + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors z-10"
            title="Previous photo"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors z-10"
            title="Next photo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white scale-125' : 'bg-white/50'}`}
              />
            ))}
          </div>
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow">
            {current + 1}/{images.length}
          </div>
        </>
      )}
    </div>
  );
}

export function LandingPage() {
  const { t } = useLanguage();
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [user, setUser] = useState<{ name: string; email: string; phone?: string } | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [expandedLandingEvents, setExpandedLandingEvents] = useState<{ [id: number]: boolean }>({});

  // Dynamic Hero Image managed via Admin Panel
  const dynamicHero = useSiteImage('landing_hero', heroImage);

  const checkUserSession = () => {
    const storedUser = localStorage.getItem('userData');
    const storedToken = localStorage.getItem('userToken');

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && (parsed.name || parsed.email)) {
          setUser(parsed);
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    if (storedToken) {
      setUser({ name: 'Active Member', email: '' });
      return;
    }

    setUser(null);
  };

  useEffect(() => {
    checkUserSession();
    const interval = setInterval(checkUserSession, 300);
    window.addEventListener('user_auth_change', checkUserSession);
    window.addEventListener('storage', checkUserSession);
    window.addEventListener('focus', checkUserSession);
    return () => {
      clearInterval(interval);
      window.removeEventListener('user_auth_change', checkUserSession);
      window.removeEventListener('storage', checkUserSession);
      window.removeEventListener('focus', checkUserSession);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchLandingEvents = () => {
      eventsApi.getEvents().then(res => {
        if (isMounted && res.success && res.events) {
          const upcoming = (res.events as EventItem[]).filter(e => e.category === 'upcoming').slice(0, 3);
          setUpcomingEvents(upcoming);
        }
      }).catch(err => console.warn('Landing page events fetch warning:', err));
    };

    fetchLandingEvents();

    const interval = setInterval(fetchLandingEvents, 4000);
    const handleFocus = () => fetchLandingEvents();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleFocus);
    };
  }, []);

  const committeeMembers = [
    { name: 'Shantha Kondur', role: 'President & Executive Lead', image: shanthaImg },
    { name: 'Smt. Padma Raju', role: 'Vice President', image: padmaRajuImg },
    { name: 'Mrs. Leelakrishnamaraju', role: 'General Secretary', image: leelaImg },
    { name: 'Ms. Padma R', role: 'Treasurer', image: padmaRImg },
    { name: 'Smt. Indira', role: 'Joint Secretary', image: indiraImg },
    { name: 'Pushpa Vasu', role: 'Committee Executive Member', image: pushpaImg },
    { name: 'Babitha Nadampalli Sreedhara Raju', role: 'Committee Executive Member', image: babithaImg },
  ];

  // Continuous auto-sliding carousel loop (moves continuously every 2.5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % committeeMembers.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [committeeMembers.length]);

  const handlePrevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + committeeMembers.length) % committeeMembers.length);
  };

  const handleNextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % committeeMembers.length);
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    setUser(null);
    window.dispatchEvent(new Event('user_auth_change'));
  };

  // If user is logged in, show dedicated Member Dashboard!
  if (user) {
    return <MemberDashboard user={user} onLogout={handleLogout} />;
  }

  // Calculate visible 3 members for carousel display
  const visibleMembers = [
    committeeMembers[carouselIndex],
    committeeMembers[(carouselIndex + 1) % committeeMembers.length],
    committeeMembers[(carouselIndex + 2) % committeeMembers.length],
  ];

  return (
    <div className="bg-white text-gray-800 font-sans">
      
      {/* 1. Hero Banner - Background Image VISIBLE with Balanced Overlay */}
      <section className="relative bg-[#0A6C87] text-white py-20 md:py-28 overflow-hidden">
        {/* Background Image Fully Visible */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 opacity-100"
          style={{ backgroundImage: `url(${dynamicHero})` }}
        ></div>
        {/* Sleek Dark Overlay to ensure 100% image clarity + text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/50 to-black/30"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            
            <div className="md:col-span-8 space-y-6 text-left">
              <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 text-yellow-300 text-xs font-semibold shadow-md">
                <img src={logo} alt="RKS Logo" className="w-5 h-5 bg-white rounded-full p-0.5" />
                <span>ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘ • Estd 2011</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md">
                {t('hero.title')}
              </h1>

              <p className="text-base sm:text-lg text-cyan-50 max-w-2xl leading-relaxed drop-shadow">
                {t('hero.desc')}
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-2 items-stretch sm:items-center">
                <Link
                  to="/membership"
                  className="bg-[#E5C100] text-[#0A6C87] hover:bg-[#CCA900] px-6 sm:px-7 py-3.5 rounded-xl font-extrabold text-xs sm:text-sm shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 text-center"
                >
                  <span>{t('hero.joinBtn')}</span>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Link>

                <Link
                  to="/donate"
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/40 backdrop-blur-md px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center text-center"
                >
                  <span>{t('hero.donateBtn')}</span>
                </Link>
              </div>
            </div>

            <div className="md:col-span-4 hidden md:block">
              <div className="bg-white/95 backdrop-blur-md text-gray-900 rounded-2xl p-6 shadow-2xl border border-white/40 space-y-4">
                <div className="flex items-center gap-3 border-b pb-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-100 text-[#0A6C87] flex items-center justify-center font-bold">
                    RKS
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0A6C87]">RKS Mahila Sangha</h3>
                    <p className="text-xs text-gray-500">Karnataka Community Welfare</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Official Member Cards & Benefits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Annual Cultural Celebrations & Meets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Educational Assistance & Scholarships</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Community Health & Support Programs</span>
                  </div>
                </div>

                <Link
                  to="/membership"
                  className="block text-center bg-[#0A6C87] text-white py-2.5 rounded-lg font-bold text-xs hover:bg-cyan-800 transition-colors shadow-md"
                >
                  Join Sangha (₹1,001)
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Key Impact Statistics Bar */}
      <section className="bg-gray-50 border-b border-gray-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Users, label: t('stats.members'), value: '800+' },
              { icon: Heart, label: t('stats.lives'), value: '2000+' },
              { icon: Calendar, label: t('stats.events'), value: '70+' },
              { icon: Award, label: t('stats.years'), value: '4 Years' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <stat.icon className="w-7 h-7 text-[#0A6C87] mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-extrabold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. About Us & Core Objectives */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-[#0A6C87] uppercase tracking-wider bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100">
              Our Vision & Mission
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Building a Unified, Self-Reliant & Empowered Women Community
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Raju Kshatriya Mahila Sangha provides a respectful platform for women to develop leadership, support youth education, and preserve cultural heritage.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Mission */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-cyan-100 text-[#0A6C87] flex items-center justify-center mb-4">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Our Mission</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                To empower women through collective support, encourage active participation in social initiatives, and provide opportunities for every woman to grow and excel.
              </p>
            </div>

            {/* Vision */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-[#E5C100] flex items-center justify-center mb-4">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Our Vision</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                To build a strong community where women become confident, financially aware, socially unified, and active contributors to society.
              </p>
            </div>

            {/* Objectives */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Our Objectives</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Promote social welfare, cultural heritage, educational scholarships, healthcare camps, and support women-led micro-enterprises.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Executive Committee & Leadership CONTINUOUS CAROUSEL with FULL UNCROPPED IMAGES */}
      <section className="py-16 bg-gray-50 border-t border-gray-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <span className="text-xs font-bold text-[#0A6C87] uppercase tracking-wider">
                Sangha Leadership
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                Executive Committee Members
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Continuously moving showcase of our dedicated leaders driving social service initiatives.
              </p>
            </div>

            {/* Manual Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevSlide}
                className="w-10 h-10 rounded-full bg-white border border-gray-300 hover:border-[#0A6C87] hover:bg-cyan-50 text-[#0A6C87] flex items-center justify-center shadow-sm transition-colors"
                title="Previous Member"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextSlide}
                className="w-10 h-10 rounded-full bg-white border border-gray-300 hover:border-[#0A6C87] hover:bg-cyan-50 text-[#0A6C87] flex items-center justify-center shadow-sm transition-colors"
                title="Next Member"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Continuously Moving Auto Carousel Cards with FULL UNCROPPED IMAGES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-700 ease-in-out">
            {visibleMembers.map((member, idx) => (
              <div 
                key={`${member.name}-${idx}`} 
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Image Container with object-contain to ensure FULL UNCROPPED PORTRAIT */}
                <div className="h-64 bg-gray-50 p-3 flex items-center justify-center border-b border-gray-100">
                  <img 
                    src={member.image} 
                    alt={member.name} 
                    className="max-h-full max-w-full object-contain rounded-xl drop-shadow-sm"
                  />
                </div>
                <div className="p-5 space-y-1">
                  <h4 className="font-bold text-gray-900 text-base">{member.name}</h4>
                  <p className="text-xs font-semibold text-[#0A6C87]">{member.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Carousel Dot Indicators */}
          <div className="flex justify-center items-center gap-2 pt-2">
            {committeeMembers.map((_, i) => (
              <button
                key={i}
                onClick={() => setCarouselIndex(i)}
                className={`h-2.5 rounded-full transition-all ${
                  carouselIndex === i ? 'w-8 bg-[#0A6C87]' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                }`}
                title={`Go to member ${i + 1}`}
              />
            ))}
          </div>

        </div>
      </section>

      {/* 5. Key Community Programs & Activities */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#0A6C87] uppercase tracking-wider">
              Community Programs
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Our Core Activities & Initiatives
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: BookOpen, title: 'Educational Support', desc: 'Providing books, scholarships, and academic assistance to deserving students.' },
              { icon: HeartHandshake, title: 'Social & Relief Welfare', desc: 'Distributing food, ration kits, and financial aid during community needs.' },
              { icon: ShieldCheck, title: 'Health Camps', desc: 'Organizing free health checkups, eye tests, and medical awareness drives.' },
              { icon: Calendar, title: 'Cultural Gatherings', desc: 'Celebrating traditional festivals, annual meets, and empowering workshops.' },
            ].map((prog, i) => (
              <div key={i} className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-100 text-[#0A6C87] flex items-center justify-center">
                  <prog.icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm">{prog.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{prog.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. Live Upcoming Events Showcase */}
      {upcomingEvents.length > 0 && (
        <section className="py-16 bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex justify-between items-end border-b pb-4">
              <div>
                <span className="text-xs font-bold text-[#0A6C87] uppercase tracking-wider">Join Us</span>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">Upcoming Events</h2>
              </div>
              <Link to="/events" className="text-xs font-bold text-[#0A6C87] hover:underline flex items-center gap-1">
                View All Events <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {upcomingEvents.map((evt) => {
                const allImgs: string[] = [];
                if (Array.isArray(evt.images) && evt.images.length > 0) {
                  evt.images.forEach((img: string) => { if (img && typeof img === 'string') allImgs.push(img); });
                }
                if (evt.image_url) allImgs.push(evt.image_url);
                if (evt.image) allImgs.push(evt.image);
                const uniqueImgs = Array.from(new Set(allImgs));

                return (
                  <div key={evt.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      {uniqueImgs.length > 1 ? (
                        <div className="relative">
                          <LandingEventGallery images={uniqueImgs} title={evt.title} />
                          <span className="absolute top-3 right-3 bg-[#0A6C87] text-white text-xs px-2.5 py-0.5 rounded-full font-semibold shadow z-10">
                            Upcoming
                          </span>
                          <span className="absolute top-3 left-3 bg-white/90 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow z-10">
                            📷 {uniqueImgs.length} Photos
                          </span>
                        </div>
                      ) : (
                        <div className="h-44 bg-gray-100 relative">
                          <ImageWithFallback
                            src={resolveBackendAssetUrl(uniqueImgs[0] || evt.image_url || evt.image || '')}
                            alt={evt.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-3 right-3 bg-[#0A6C87] text-white text-xs px-2.5 py-0.5 rounded-full font-semibold">
                            Upcoming
                          </span>
                        </div>
                      )}
                      
                      <div className="p-5 space-y-2">
                        <h4 className="font-bold text-gray-900 text-base line-clamp-1">{evt.title}</h4>
                        <div>
                          <p className={`text-xs text-gray-600 ${expandedLandingEvents[evt.id] ? '' : 'line-clamp-2'}`}>
                            {evt.description}
                          </p>
                          {evt.description && evt.description.length > 90 && (
                            <button
                              onClick={() => setExpandedLandingEvents(prev => ({ ...prev, [evt.id]: !prev[evt.id] }))}
                              className="text-[11px] font-bold text-[#0A6C87] hover:underline mt-1 focus:outline-none"
                            >
                              {expandedLandingEvents[evt.id] ? 'Show Less ▲' : 'Read More ▼'}
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 pt-2 border-t space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#0A6C87]" />
                            <span>{formatDateSafe(evt.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          {evt.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-[#0A6C87]" />
                              <span className="line-clamp-1">{evt.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <Link
                        to="/events"
                        className="block text-center bg-[#E5C100] text-[#0A6C87] py-2 rounded-lg font-bold text-xs hover:bg-[#CCA900] transition-colors"
                      >
                        Event Details & Registration
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 7. Call to Action Banner */}
      <section className="bg-[#0A6C87] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl md:text-4xl font-bold">
            Join Raju Kshatriya Mahila Sangha Today
          </h2>
          <p className="text-sm md:text-base text-cyan-100 max-w-2xl mx-auto leading-relaxed">
            Become a part of our growing community of empowered women. Get your official digital membership card and support our social welfare programs.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              to="/membership"
              className="bg-[#E5C100] text-[#0A6C87] hover:bg-[#CCA900] px-8 py-3.5 rounded-lg font-bold text-sm shadow-md transition-colors"
            >
              Become a Member (₹1,001)
            </Link>
            <Link
              to="/donate"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-8 py-3.5 rounded-lg font-semibold text-sm transition-colors"
            >
              Make a Donation
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}