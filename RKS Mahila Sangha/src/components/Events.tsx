import { Calendar, MapPin, Clock, ArrowRight, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { eventsApi, resolveBackendAssetUrl } from '../services/api';
import { EventRegistrationModal, formatDateSafe } from './EventRegistrationModal';
import { UserAuthModal } from './UserAuthModal';

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image?: string;
  image_url?: string;
  images?: string[];
  category: 'upcoming' | 'past';
  attendees?: number;
  current_participants?: number;
  price: number;
  is_free: boolean;
  fee?: number;
}

// Image gallery carousel for past events
function EventGallery({ images, title }: { images: string[]; title: string }) {
  const [current, setCurrent] = useState(0);
  if (!images.length) return null;

  return (
    <div className="relative">
      <div className="relative h-52 bg-gray-100 overflow-hidden rounded-t-2xl">
        <ImageWithFallback
          src={resolveBackendAssetUrl(images[current])}
          alt={`${title} – photo ${current + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % images.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white scale-125' : 'bg-white/50'}`}
                />
              ))}
            </div>
            <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {current + 1}/{images.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Events() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [userSession, setUserSession] = useState<{ name?: string; email?: string; phone?: string } | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<{ [id: number]: boolean }>({});

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const checkUser = () => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserSession(user);
      } catch (e) {
        setUserSession(null);
      }
    } else {
      setUserSession(null);
    }
  };

  useEffect(() => {
    checkUser();
    window.addEventListener('user_auth_change', checkUser);
    window.addEventListener('storage', checkUser);
    return () => {
      window.removeEventListener('user_auth_change', checkUser);
      window.removeEventListener('storage', checkUser);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async (isFirstLoad = false) => {
      if (isFirstLoad) setIsLoading(true);
      try {
        const response = await eventsApi.getEvents();
        if (isMounted && response.success && response.events) {
          setEvents(response.events as Event[]);
        }
      } catch (error) {
        if (isFirstLoad) {
          toast.error('Failed to load events');
        }
      } finally {
        if (isMounted && isFirstLoad) {
          setIsLoading(false);
        }
      }
    };

    loadEvents(true);

    let sse: EventSource | null = null;
    try {
      const apiOrigin = window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api';
      sse = new EventSource(`${apiOrigin}/realtime/stream`);
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (['events_updated'].includes(data.type)) {
            loadEvents(false);
          }
        } catch (e) {}
      };
    } catch (err) {}

    const handleFocus = () => loadEvents(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', () => loadEvents(false));

    return () => {
      isMounted = false;
      if (sse) sse.close();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', () => loadEvents(false));
    };
  }, []);

  const filteredEvents = events.filter(event => event.category === activeTab);

  const handleRegister = (event: Event) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      setPendingEvent(event);
      setShowAuthModal(true);
      return;
    }
    setSelectedEvent(event);
    setShowRegistrationModal(true);
  };

  const handleAuthSuccess = (u: { name: string; email: string; phone?: string }) => {
    setUserSession(u);
    setShowAuthModal(false);
    if (pendingEvent) {
      setSelectedEvent(pendingEvent);
      setPendingEvent(null);
      setShowRegistrationModal(true);
    }
  };

  return (
    <div className="bg-white text-gray-800 font-sans">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#0A6C87] to-cyan-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <span className="bg-white/10 text-yellow-300 text-xs px-3 py-1 rounded-full font-semibold border border-white/20 uppercase tracking-wider">
            Sangha Events & Programs
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold">Community Gatherings & Workshops</h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto text-cyan-100 leading-relaxed">
            Join us for cultural celebrations, educational workshops, health checkups, and empowerment events.
          </p>
        </div>
      </section>

      {/* Tabs & Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1 rounded-full font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Admin Sync Active • Real-time Event Updates</span>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap justify-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-[#0A6C87] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upcoming Events ({events.filter(e => e.category === 'upcoming').length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors ${
                activeTab === 'past'
                  ? 'bg-[#0A6C87] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Past Celebrations ({events.filter(e => e.category === 'past').length})
            </button>
          </div>

          {/* Login reminder for upcoming events tab */}
          {activeTab === 'upcoming' && !userSession && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2 rounded-full font-semibold">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Please <strong>login</strong> to register for events</span>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-base font-semibold">Loading events...</p>
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => {
              const pricePerPerson = Number(event.price || event.fee || 0);
              const isFree = event.is_free || pricePerPerson === 0;
              const isPast = event.category === 'past';

              // Build images array
              const allImages: string[] = [];
              if (event.images && event.images.length) {
                event.images.forEach(img => { if (img) allImages.push(img); });
              } else if (event.image_url) {
                allImages.push(event.image_url);
              } else if (event.image) {
                allImages.push(event.image);
              }

              return (
                <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
                  <div>
                    {/* Image / Gallery */}
                    {allImages.length > 1 ? (
                      <div className="relative">
                        <EventGallery images={allImages} title={event.title} />
                        <div className={`absolute top-3 right-3 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md ${isPast ? 'bg-gray-700' : 'bg-[#0A6C87]'}`}>
                          {isPast ? 'Completed' : 'Upcoming'}
                        </div>
                        <div className="absolute top-3 left-3 flex gap-2">
                          {isFree ? (
                            <span className="bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow uppercase">
                              FREE ENTRY
                            </span>
                          ) : (
                            <span className="bg-[#E5C100] text-[#0A6C87] text-[10px] px-2.5 py-0.5 rounded-full font-extrabold shadow">
                              ₹{pricePerPerson} / Person
                            </span>
                          )}
                          <span className="bg-white/90 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                            📷 {allImages.length} Photos
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-52 bg-gray-100">
                        <ImageWithFallback
                          src={resolveBackendAssetUrl(allImages[0] || '')}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                        <div className={`absolute top-3 right-3 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md ${isPast ? 'bg-gray-700' : 'bg-[#0A6C87]'}`}>
                          {isPast ? 'Completed' : 'Upcoming'}
                        </div>
                        {isFree ? (
                          <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md uppercase">
                            FREE ENTRY
                          </div>
                        ) : (
                          <div className="absolute top-3 left-3 bg-[#E5C100] text-[#0A6C87] text-xs px-3 py-1 rounded-full font-extrabold shadow-md">
                            PAID • ₹{pricePerPerson} / Person
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="p-6 space-y-3">
                      <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{event.title}</h3>
                      
                      <div>
                        <p className={`text-gray-600 text-xs leading-relaxed ${expandedEvents[event.id] ? '' : 'line-clamp-3'}`}>
                          {event.description}
                        </p>
                        {event.description && event.description.length > 110 && (
                          <button
                            onClick={() => setExpandedEvents(prev => ({ ...prev, [event.id]: !prev[event.id] }))}
                            className="text-[11px] font-bold text-[#0A6C87] hover:underline mt-1 focus:outline-none"
                          >
                            {expandedEvents[event.id] ? 'Show Less ▲' : 'Read More ▼'}
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2 pt-2 border-t text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#0A6C87] flex-shrink-0" />
                          <span className="font-semibold">{formatDateSafe(event.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        {event.time && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#0A6C87] flex-shrink-0" />
                            <span>{event.time}</span>
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#0A6C87] flex-shrink-0" />
                            <span className="line-clamp-1">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    {isPast ? (
                      /* Past events: show photos note + no registration */
                      <div className="space-y-2">
                        <div className="w-full bg-gray-100 text-gray-500 py-2 rounded-lg font-semibold text-xs text-center">
                          Event Concluded – Registration Closed
                        </div>
                        {allImages.length > 1 && (
                          <p className="text-[10px] text-center text-gray-400 font-medium">
                            📷 {allImages.length} event photos – scroll through above
                          </p>
                        )}
                      </div>
                    ) : (
                      /* Upcoming events: Register button */
                      <button
                        onClick={() => handleRegister(event)}
                        className={`w-full py-2.5 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm ${
                          isFree 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                            : 'bg-[#E5C100] text-[#0A6C87] hover:bg-[#CCA900]'
                        }`}
                      >
                        {!userSession && <Lock className="w-3.5 h-3.5" />}
                        {isFree ? 'Register Free' : `Pay & Register (₹${pricePerPerson})`}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && filteredEvents.length === 0 && (
          <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-2xl border border-gray-200">
            <p className="text-base font-semibold">No events listed under {activeTab} events.</p>
          </div>
        )}
      </section>

      {/* Interactive Registration Modal */}
      <EventRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        event={selectedEvent}
        userSession={userSession}
      />

      {/* Auth Modal – shown when user tries to register without login */}
      <UserAuthModal
        isOpen={showAuthModal}
        onClose={() => { setShowAuthModal(false); setPendingEvent(null); }}
        onSuccess={handleAuthSuccess}
        title="Login to Register for This Event"
      />
    </div>
  );
}