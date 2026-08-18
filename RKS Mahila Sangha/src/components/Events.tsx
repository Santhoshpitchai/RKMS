import { Calendar, MapPin, Clock, ArrowRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { eventsApi, resolveBackendAssetUrl } from '../services/api';
import { EventRegistrationModal } from './EventRegistrationModal';

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image?: string;
  image_url?: string;
  category: 'upcoming' | 'past';
  attendees?: number;
  current_participants?: number;
  price: number;
  is_free: boolean;
  fee?: number;
}

export function Events() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [userSession, setUserSession] = useState<{ name?: string; email?: string; phone?: string } | null>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserSession(user);
      } catch (e) {
        // ignore
      }
    }
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
    const interval = setInterval(() => loadEvents(false), 4000);
    const handleFocus = () => loadEvents(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', () => loadEvents(false));

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', () => loadEvents(false));
    };
  }, []);

  const filteredEvents = events.filter(event => event.category === activeTab);

  const handleRegister = (event: Event) => {
    setSelectedEvent(event);
    setShowRegistrationModal(true);
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

          <div className="flex justify-center gap-3">
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

              return (
                <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="relative h-52 bg-gray-100">
                      <ImageWithFallback
                        src={
                          resolveBackendAssetUrl(event.image_url) ||
                          resolveBackendAssetUrl(event.image)
                        }
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3 bg-[#0A6C87] text-white text-xs px-3 py-1 rounded-full font-bold shadow-md">
                        {event.category === 'upcoming' ? 'Upcoming' : 'Completed'}
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
                    
                    <div className="p-6 space-y-3">
                      <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{event.title}</h3>
                      <p className="text-gray-600 text-xs leading-relaxed line-clamp-3">{event.description}</p>
                      
                      <div className="space-y-2 pt-2 border-t text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#0A6C87] flex-shrink-0" />
                          <span className="font-semibold">{new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                    {event.category === 'upcoming' ? (
                      <button
                        onClick={() => handleRegister(event)}
                        className={`w-full py-2.5 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm ${
                          isFree 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                            : 'bg-[#E5C100] text-[#0A6C87] hover:bg-[#CCA900]'
                        }`}
                      >
                        {isFree ? 'Register Free' : `Pay & Register (₹${pricePerPerson})`}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="w-full bg-gray-100 text-gray-500 py-2 rounded-lg font-semibold text-xs text-center">
                        Event Concluded
                      </div>
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
    </div>
  );
}