import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Ticket, CreditCard, Users, CheckCircle2, User } from 'lucide-react';
import { toast } from 'sonner';
import { eventsApi } from '../services/api';

interface EventData {
  id: number;
  title: string;
  date: string;
  location: string;
  description: string;
  price: number;
  is_free: boolean;
  imageUrl?: string;
  image_url?: string;
}

interface EventRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventData | null;
  userSession?: { name?: string; email?: string; phone?: string } | null;
  onSuccess?: () => void;
}

export function EventRegistrationModal({
  isOpen,
  onClose,
  event,
  userSession,
  onSuccess
}: EventRegistrationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    numberOfAttendees: 1,
    guestNames: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userSession) {
      setFormData((prev) => ({
        ...prev,
        name: userSession.name || prev.name,
        email: userSession.email || prev.email,
        phone: userSession.phone || prev.phone,
      }));
    }
  }, [userSession, isOpen]);

  if (!isOpen || !event) return null;

  const pricePerPerson = Number(event.price || 0);
  const isFree = event.is_free || pricePerPerson === 0;
  const totalAmount = isFree ? 0 : pricePerPerson * formData.numberOfAttendees;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please fill in your Name, Email, and Phone number');
      return;
    }

    setIsLoading(true);

    try {
      if (isFree) {
        // FREE EVENT: Direct Registration
        const res = await eventsApi.registerEvent(event.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          numberOfAttendees: formData.numberOfAttendees,
          guestNames: formData.guestNames,
          paymentStatus: 'completed',
          paymentAmount: 0,
        });

        if (res.success) {
          toast.success(res.message || `Free registration confirmed for ${formData.numberOfAttendees} attendee(s)!`);
          if (onSuccess) onSuccess();
          onClose();
        } else {
          toast.error(res.message || 'Registration failed');
        }
      } else {
        // PAID EVENT: Razorpay Payment Flow
        const orderRes = await eventsApi.createOrder(event.id, {
          numberOfAttendees: formData.numberOfAttendees,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        });

        if (orderRes.success && orderRes.order && orderRes.razorpayKeyId) {
          const options = {
            key: orderRes.razorpayKeyId,
            amount: orderRes.order.amount,
            currency: 'INR',
            name: 'RKS Mahila Sangha',
            description: `Event Entry: ${event.title} (${formData.numberOfAttendees} Ticket(s))`,
            order_id: orderRes.order.id,
            handler: async function (rzpRes: any) {
              const regRes = await eventsApi.registerEvent(event.id, {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                numberOfAttendees: formData.numberOfAttendees,
                guestNames: formData.guestNames,
                paymentStatus: 'completed',
                paymentAmount: totalAmount,
                paymentId: rzpRes.razorpay_payment_id,
              });

              if (regRes.success) {
                toast.success(`Payment verified! Registration confirmed for ${formData.numberOfAttendees} attendee(s).`);
                if (onSuccess) onSuccess();
                onClose();
              } else {
                toast.error(regRes.message || 'Registration failed after payment verification');
              }
            },
            prefill: {
              name: formData.name,
              email: formData.email,
              contact: formData.phone,
            },
            theme: { color: '#0A6C87' },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } else {
          toast.error(orderRes.message || 'Failed to create event payment order');
        }
      }
    } catch (err) {
      console.error('Event registration error:', err);
      toast.error('An error occurred during event registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0A6C87] to-cyan-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
              isFree ? 'bg-emerald-400 text-emerald-950' : 'bg-[#E5C100] text-[#0A6C87]'
            }`}>
              {isFree ? 'FREE ENTRY EVENT' : `PAID EVENT • ₹${pricePerPerson} / Person`}
            </span>
          </div>

          <h3 className="text-xl font-bold leading-snug">{event.title}</h3>
          
          <div className="flex flex-wrap gap-4 text-xs text-cyan-100 mt-2">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {event.date}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.location}</span>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Registrant Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter full name"
                className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0A6C87] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="Enter email"
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0A6C87] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  placeholder="Enter phone"
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0A6C87] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                <span>Number of Attendees *</span>
                <span className="text-[10px] text-gray-500 font-normal">Including yourself and family</span>
              </label>
              <select
                value={formData.numberOfAttendees}
                onChange={(e) => setFormData({ ...formData, numberOfAttendees: parseInt(e.target.value) })}
                className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0A6C87] outline-none bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Person' : 'People / Family Members'}
                  </option>
                ))}
              </select>
            </div>

            {formData.numberOfAttendees > 1 && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Accompanying Guest Names (Optional)
                </label>
                <input
                  type="text"
                  value={formData.guestNames}
                  onChange={(e) => setFormData({ ...formData, guestNames: e.target.value })}
                  placeholder="e.g. Santhosh, Priya, Rahul"
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0A6C87] outline-none"
                />
              </div>
            )}
          </div>

          {/* Pricing Summary Box */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 font-medium">Ticket Type</span>
              <span className="font-bold text-gray-900">{isFree ? 'Free Admission' : `₹${pricePerPerson} × ${formData.numberOfAttendees} Person(s)`}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
              <span className="font-bold text-gray-900">Total Payable Amount</span>
              <span className={`font-extrabold text-base ${isFree ? 'text-emerald-600' : 'text-[#0A6C87]'}`}>
                {isFree ? '₹0 (FREE)' : `₹${totalAmount.toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              isFree
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#E5C100] hover:bg-[#CCA900] text-[#0A6C87]'
            }`}
          >
            {isFree ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {isLoading ? 'Processing Registration...' : 'Complete Free Event Registration'}
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                {isLoading ? 'Opening Razorpay...' : `Proceed to Pay ₹${totalAmount.toLocaleString('en-IN')} via Razorpay`}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
