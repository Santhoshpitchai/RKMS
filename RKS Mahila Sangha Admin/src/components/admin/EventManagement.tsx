import { AdminLayout } from './AdminLayout';
import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, Upload, Calendar, MapPin, Search, LayoutGrid, List, Sparkles, Ticket, Download, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, resolveBackendAssetUrl } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface EventItem {
  id: number;
  title: string;
  date: string;
  location: string;
  description: string;
  image_url?: string;
  images?: string[];
  price: number;
  is_free: boolean;
  category: string;
}

export function EventManagement() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'upcoming' | 'past'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const loadData = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const eventsRes = await adminApi.getEvents(token);
      if (eventsRes && eventsRes.success && eventsRes.events) {
        setEvents(eventsRes.events as EventItem[]);
      }
    } catch (e) {
      console.error('Error loading events:', e);
    } finally {
      setIsLoading(false);
    }

    try {
      const regRes = await adminApi.getEventRegistrations(token);
      if (regRes && regRes.success && regRes.registrations) {
        setRegistrations(regRes.registrations);
      }
    } catch (e) {
      console.warn('Error loading registrations:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    location: '',
    description: '',
    imageUrlText: '',
    price: 0,
    isFree: true,
    category: 'upcoming' as 'upcoming' | 'past',
  });
  
  // Gallery state for multiple images
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [urlInputText, setUrlInputText] = useState('');

  const handleOpenModal = (event?: EventItem) => {
    if (event) {
      setEditingEvent(event);
      const existing = (event.images && event.images.length > 0)
        ? event.images
        : (event.image_url ? [event.image_url] : []);
      setExistingImageUrls(existing);
      setFormData({
        title: event.title,
        date: (event.date || '').slice(0, 10),
        location: event.location,
        description: event.description,
        imageUrlText: '',
        price: event.price,
        isFree: !!event.is_free,
        category: (event.category as 'upcoming' | 'past') || 'upcoming',
      });
      setImageFiles([]);
      setFilePreviews([]);
      setUrlInputText('');
    } else {
      setEditingEvent(null);
      setExistingImageUrls([]);
      setFormData({
        title: '',
        date: '',
        location: '',
        description: '',
        imageUrlText: '',
        price: 0,
        isFree: true,
        category: 'upcoming',
      });
      setImageFiles([]);
      setFilePreviews([]);
      setUrlInputText('');
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    filePreviews.forEach(p => { if (p.startsWith('blob:')) URL.revokeObjectURL(p); });
    setShowModal(false);
    setEditingEvent(null);
    setExistingImageUrls([]);
    setImageFiles([]);
    setFilePreviews([]);
    setUrlInputText('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      const newPreviews = selectedFiles.map(f => URL.createObjectURL(f));
      setImageFiles(prev => [...prev, ...selectedFiles]);
      setFilePreviews(prev => [...prev, ...newPreviews]);
    }
    e.target.value = '';
  };

  const handleAddUrlImage = () => {
    const trimmed = urlInputText.trim();
    if (trimmed && /^https?:\/\//i.test(trimmed)) {
      setExistingImageUrls(prev => [...prev, trimmed]);
      setUrlInputText('');
      toast.success('Image URL added to gallery');
    } else {
      toast.error('Please enter a valid HTTP/HTTPS image URL');
    }
  };

  const handleRemoveImageItem = (index: number) => {
    if (index < existingImageUrls.length) {
      setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
    } else {
      const fileIdx = index - existingImageUrls.length;
      if (filePreviews[fileIdx] && filePreviews[fileIdx].startsWith('blob:')) {
        URL.revokeObjectURL(filePreviews[fileIdx]);
      }
      setImageFiles(prev => prev.filter((_, i) => i !== fileIdx));
      setFilePreviews(prev => prev.filter((_, i) => i !== fileIdx));
    }
  };

  const buildEventFormData = (): FormData => {
    const fd = new FormData();
    fd.append('title', formData.title);
    fd.append('description', formData.description);
    fd.append('date', formData.date);
    fd.append('location', formData.location);
    fd.append('category', formData.category);
    fd.append('price', String(formData.isFree ? 0 : formData.price));
    fd.append('is_free', formData.isFree ? 'true' : 'false');

    // Send remaining existing image URLs as JSON array
    fd.append('image_urls', JSON.stringify(existingImageUrls));
    if (existingImageUrls.length > 0) {
      fd.append('image_url', existingImageUrls[0]);
    }

    // Send newly uploaded image files
    imageFiles.forEach(file => {
      fd.append('eventImages', file);
    });

    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    if (!token) {
      toast.error('Please login again');
      return;
    }

    const totalImagesCount = existingImageUrls.length + imageFiles.length;
    if (totalImagesCount === 0) {
      toast.error('Please add at least 1 image for the event (upload files or paste an image URL)');
      return;
    }

    try {
      const fd = buildEventFormData();
      if (editingEvent) {
        const response = await adminApi.updateEvent(token, editingEvent.id, fd);
        if (!response.success) throw new Error((response as any).message || (response as any).errors?.[0]?.msg || 'Update failed');
        toast.success('Event updated successfully!');
      } else {
        const response = await adminApi.createEvent(token, fd);
        if (!response.success) throw new Error((response as any).message || (response as any).errors?.[0]?.msg || 'Create failed');
        toast.success('Event created successfully!');
      }
      await loadData();
      window.dispatchEvent(new Event('events_updated'));
      localStorage.setItem('last_events_update', String(Date.now()));
      handleCloseModal();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save event');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const response = await adminApi.deleteEvent(token, id);
      if (response.success) {
        setEvents(events.filter(event => event.id !== id));
        toast.success('Event deleted successfully!');
        window.dispatchEvent(new Event('events_updated'));
        localStorage.setItem('last_events_update', String(Date.now()));
      } else {
        toast.error(response.message || 'Delete failed');
      }
    }
  };

  const handleCancelRegistration = async (regId: number) => {
    if (window.confirm('Are you sure you want to mark this registration as CANCELLED BY ADMIN?')) {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const res = await adminApi.deleteEventRegistration(token, regId, false);
      if (res.success) {
        toast.success('Registration marked as cancelled by admin');
        setRegistrations(registrations.map(r => r.id === regId ? { ...r, payment_status: 'cancelled_by_admin' } : r));
      } else {
        toast.error(res.message || 'Failed to cancel registration');
      }
    }
  };

  const handleDeleteRegistrationPermanent = async (regId: number) => {
    if (window.confirm('Are you sure you want to PERMANENTLY DELETE this registration record from database?')) {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const res = await adminApi.deleteEventRegistration(token, regId, true);
      if (res.success) {
        toast.success('Registration permanently deleted');
        setRegistrations(registrations.filter(r => r.id !== regId));
      } else {
        toast.error(res.message || 'Failed to delete registration');
      }
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
    const matchesQuery = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const handleExportRegistrations = () => {
    if (registrations.length === 0) {
      toast.error('No event registration records to export.');
      return;
    }
    const headers = ['Event Title', 'Attendee Name', 'Email', 'Phone', 'Registration ID', 'Accompanying Count', 'Amount Paid', 'Registration Status', 'Registration Date'];
    const lines = [
      headers.join(','),
      ...registrations.map((r) =>
        [
          r.event_title || r.events?.title || 'Sangha Event',
          r.name || 'Member',
          r.email || '',
          r.phone || '',
          r.registration_id || r.registrationId || '',
          r.number_of_attendees || r.accompanying_count || 1,
          r.payment_amount || 0,
          r.payment_status === 'cancelled_by_member' ? 'Cancelled by Member' : r.payment_status === 'cancelled_by_admin' ? 'Cancelled by Admin' : (r.payment_status || 'COMPLETED').toUpperCase(),
          (r.created_at || '').slice(0, 10),
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Event_Registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Registrations exported to CSV');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Event Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Event Management</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Create, update, and manage both past celebrations and upcoming events.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportRegistrations}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-4 py-3 rounded-xl font-bold text-xs shadow-md transition-all"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              Export Attendees (CSV)
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white px-5 py-3 rounded-xl font-bold text-xs shadow-lg shadow-cyan-950 transition-all transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Add New Event
            </button>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {(['all', 'upcoming', 'past'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
                  filterCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {cat === 'all' ? `All Events (${events.length})` : cat === 'upcoming' ? `Upcoming (${events.filter(e => e.category === 'upcoming').length})` : `Past (${events.filter(e => e.category === 'past').length})`}
              </button>
            ))}
          </div>

          {/* Search & Layout Toggle */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg text-xs transition-colors ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg text-xs transition-colors ${viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {isLoading && <div className="text-center py-16 text-slate-500 text-sm">Loading events...</div>}

        {/* GRID VIEW */}
        {!isLoading && viewMode === 'grid' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-slate-950/80 rounded-2xl border border-slate-800/80 overflow-hidden hover:border-cyan-500/40 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="relative h-48 bg-slate-900 overflow-hidden">
                    <img
                      src={resolveBackendAssetUrl(event.image_url)}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                    <div className="absolute top-3 right-3 flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border tracking-wider shadow-lg ${
                        event.category === 'upcoming'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                      }`}>
                        {event.category === 'upcoming' ? 'Upcoming' : 'Past Celebration'}
                      </span>
                    </div>

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {event.is_free ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 uppercase">
                          FREE
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950">
                          ₹{event.price} Entry
                        </span>
                      )}
                      {((event.images && event.images.length > 1) || false) && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-900/90 text-cyan-300 border border-cyan-500/30 shadow">
                          📷 {event.images?.length} Photos
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-white text-base line-clamp-1 group-hover:text-cyan-400 transition-colors">{event.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{event.description}</p>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span>{new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 flex gap-2">
                  <button
                    onClick={() => handleOpenModal(event)}
                    className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-800 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-semibold border border-slate-800 transition-colors"
                    title="Delete Event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TABLE VIEW */}
        {!isLoading && viewMode === 'table' && (
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Event</th>
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5">Location</th>
                    <th className="py-3.5 px-5">Fee</th>
                    <th className="py-3.5 px-5">Category</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveBackendAssetUrl(event.image_url)}
                            alt={event.title}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-800"
                          />
                          <div>
                            <p className="font-bold text-white">{event.title}</p>
                            <p className="text-[11px] text-slate-400 line-clamp-1">{event.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-medium text-slate-300">
                        {new Date(event.date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-5 text-slate-400">{event.location}</td>
                      <td className="py-3.5 px-5 font-bold text-emerald-400">
                        {event.is_free ? 'Free' : `₹${event.price}`}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          event.category === 'upcoming' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {event.category === 'upcoming' ? 'Upcoming' : 'Past'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(event)}
                            className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Registrations Section */}
        <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-white text-base">Registered Attendees</h2>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{registrations.length} Total Registrations</span>
          </div>

          {registrations.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No registrations recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Registration ID</th>
                    <th className="py-3 px-4">Attendee Details</th>
                    <th className="py-3 px-4">Membership ID</th>
                    <th className="py-3 px-4">Attendees</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {registrations.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        {r.event_title || r.events?.title || `Event #${r.event_id}`}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-cyan-400">
                        {r.registration_id || r.registrationId || `REG-${r.id}`}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-200">{r.name}</p>
                        <p className="text-[11px] text-slate-400">{r.email} {r.phone ? `• ${r.phone}` : ''}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{r.membership_id || '-'}</td>
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {r.number_of_attendees || r.accompanying_count || 1} Person(s)
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase inline-block border ${
                          r.payment_status === 'cancelled_by_member'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : r.payment_status === 'cancelled_by_admin' || r.payment_status === 'cancelled'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : r.payment_status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {r.payment_status === 'cancelled_by_member'
                            ? 'CANCELLED BY MEMBER'
                            : r.payment_status === 'cancelled_by_admin'
                            ? 'CANCELLED BY ADMIN'
                            : r.payment_status
                            ? String(r.payment_status).replace(/_/g, ' ').toUpperCase()
                            : 'COMPLETED'}
                        </span>
                        <span className="block font-bold text-emerald-400 text-[11px] mt-0.5">
                          ₹{Number(r.payment_amount || 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!r.payment_status?.includes('cancelled') && (
                            <button
                              onClick={() => handleCancelRegistration(r.id)}
                              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-extrabold transition-colors flex items-center gap-1"
                              title="Mark Registration as Cancelled by Admin"
                            >
                              <Ban className="w-3.5 h-3.5" /> Cancel
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRegistrationPermanent(r.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Permanently Delete Registration from Database"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Dialog */}
        {showModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-950 rounded-2xl max-w-2xl w-full border border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-950/95 backdrop-blur-md z-10">
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  {editingEvent ? 'Edit Event Details' : 'Create New Event'}
                </h2>
                <button onClick={handleCloseModal} className="p-1 text-slate-400 hover:text-white rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-slate-300">
                <div>
                  <label className="block font-bold text-slate-200 mb-1.5">Event Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. Annual Cultural Meet 2026"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-200 mb-1.5">Event Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isPastDate = newDate && newDate < todayStr;
                        setFormData((prev) => ({
                          ...prev,
                          date: newDate,
                          category: isPastDate ? 'past' : prev.category
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-200 mb-1.5">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as 'upcoming' | 'past' })}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                      required
                    >
                      <option value="upcoming">Upcoming Event</option>
                      <option value="past">Past Celebration</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-200 mb-1.5">Location *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. Bengaluru Cultural Center"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-200 mb-1.5">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 leading-relaxed"
                    placeholder="Describe the event, highlights, and schedule..."
                    required
                  />
                </div>

                {/* Multi-Image Gallery Upload Section */}
                {(() => {
                  const allModalPreviews = [...existingImageUrls.map(u => resolveBackendAssetUrl(u)), ...filePreviews];
                  return (
                    <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="block font-bold text-white text-xs">Event Photos Gallery *</label>
                          <p className="text-[11px] text-slate-400">Add 2-3 or more images for this event. The 1st image will be used as the primary cover banner.</p>
                        </div>
                        <span className="bg-cyan-500/20 text-cyan-400 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-cyan-500/30">
                          {allModalPreviews.length} Photo{allModalPreviews.length !== 1 ? 's' : ''} Attached
                        </span>
                      </div>

                      {/* File upload & URL inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-950/80 rounded-xl p-3 text-center cursor-pointer transition-colors">
                          <label className="cursor-pointer block space-y-1">
                            <Upload className="w-6 h-6 text-cyan-400 mx-auto" />
                            <div className="text-slate-200 font-bold text-xs">Upload Device Photos</div>
                            <div className="text-[10px] text-slate-400">Select multiple files (PNG, JPG, WEBP)</div>
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={handleImageChange}
                            />
                          </label>
                        </div>

                        <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-3 flex flex-col justify-between space-y-2">
                          <label className="block text-[11px] font-bold text-slate-300">Add Photo by Web URL</label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={urlInputText}
                              onChange={(e) => setUrlInputText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrlImage(); } }}
                              placeholder="https://images.unsplash.com/..."
                              className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500"
                            />
                            <button
                              type="button"
                              onClick={handleAddUrlImage}
                              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors flex-shrink-0"
                            >
                              + Add URL
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Live Gallery Thumbnail Grid */}
                      {allModalPreviews.length > 0 && (
                        <div className="pt-2">
                          <p className="text-[11px] font-semibold text-slate-400 mb-2">Attached Event Gallery ({allModalPreviews.length} photos):</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {allModalPreviews.map((previewUrl, idx) => (
                              <div key={idx} className={`relative group rounded-xl overflow-hidden h-28 bg-slate-950 border ${idx === 0 ? 'border-cyan-400 ring-2 ring-cyan-500/30' : 'border-slate-800'}`}>
                                <img src={previewUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-90" />
                                
                                <div className="absolute top-1.5 left-1.5">
                                  {idx === 0 ? (
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-cyan-500 text-slate-950 uppercase shadow">
                                      ⭐ Cover Banner
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-900/90 text-slate-300 border border-slate-700 shadow">
                                      Photo #{idx + 1}
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveImageItem(idx)}
                                  className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 text-white rounded-full hover:bg-rose-700 transition-colors shadow-md"
                                  title="Remove photo"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block font-bold text-slate-200 mb-1.5">Entry Fee (₹)</label>
                    <input
                      type="number"
                      value={formData.isFree ? 0 : formData.price}
                      onChange={(e) => {
                        const price = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, price: price, isFree: price === 0 });
                      }}
                      disabled={formData.isFree}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-200 mb-1.5">Is Free Event?</label>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="isFreeModal"
                        checked={formData.isFree}
                        onChange={(e) => {
                          const isFree = e.target.checked;
                          setFormData({ ...formData, isFree, price: isFree ? 0 : formData.price });
                        }}
                        className="w-4 h-4 rounded accent-cyan-500"
                      />
                      <label htmlFor="isFreeModal" className="text-slate-300 font-medium">Free Entry Event</label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-3 border border-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl font-bold shadow-lg shadow-cyan-950 transition-all"
                  >
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
