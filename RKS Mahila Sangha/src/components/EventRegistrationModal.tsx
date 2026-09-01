import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Ticket, CreditCard, CheckCircle2, Download, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { eventsApi, paymentApi } from '../services/api';

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

interface SuccessData {
  registrationId: string;
  eventTitle: string;
  name: string;
  email: string;
  numberOfAttendees: number;
  totalAmount: number;
  isFree: boolean;
  date: string;
  location: string;
}

function SuccessTicket({ data, onClose }: { data: SuccessData; onClose: () => void }) {
  const handleDownloadTicket = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Please allow popups to download your ticket'); return; }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>RKS Sangha – Event Entry Ticket</title>
        <style>
          body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6; margin: 0; }
          .ticket { width: 480px; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
          .ticket-header { background: linear-gradient(135deg, #0A6C87, #0891b2); color: white; padding: 24px; }
          .ticket-header h2 { margin: 0 0 4px; font-size: 18px; font-weight: 800; }
          .ticket-header p { margin: 0; font-size: 12px; opacity: 0.85; }
          .ticket-divider { border-top: 2px dashed #d1d5db; margin: 0; }
          .ticket-body { background: white; padding: 24px; }
          .reg-id { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px; margin-bottom: 16px; text-align: center; }
          .reg-id-label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
          .reg-id-value { font-size: 20px; font-weight: 900; font-family: monospace; color: #065f46; letter-spacing: 1px; }
          .field { margin-bottom: 10px; display: flex; justify-content: space-between; }
          .field label { font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
          .field span { font-size: 12px; font-weight: 700; color: #111827; }
          .badge { background: ${data.isFree ? '#d1fae5' : '#dbeafe'}; color: ${data.isFree ? '#065f46' : '#1e40af'}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; }
          .footer { background: #f9fafb; padding: 16px 24px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="ticket-header">
            <h2>🎫 RKS Mahila Sangha – Entry Ticket</h2>
            <p>${data.eventTitle}</p>
          </div>
          <hr class="ticket-divider" />
          <div class="ticket-body">
            <div class="reg-id">
              <div class="reg-id-label">Registration ID</div>
              <div class="reg-id-value">${data.registrationId}</div>
            </div>
            <div class="field"><label>Attendee Name</label><span>${data.name}</span></div>
            <div class="field"><label>Email</label><span>${data.email}</span></div>
            <div class="field"><label>Event Date</label><span>${data.date}</span></div>
            <div class="field"><label>Location</label><span>${data.location}</span></div>
            <div class="field"><label>No. of Persons</label><span>${data.numberOfAttendees}</span></div>
            <div class="field"><label>Amount Paid</label><span class="badge">${data.isFree ? 'FREE' : '₹' + data.totalAmount.toLocaleString('en-IN')}</span></div>
          </div>
          <div class="footer">
            Raju Kshatriya Mahila Sangha • Banashankari, Bangalore<br/>
            Please present this ticket at the event venue. Valid for ${data.numberOfAttendees} person(s).
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 space-y-5">
      {/* Success Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-900">Registration Confirmed!</h3>
        <p className="text-xs text-gray-500">
          {data.isFree ? 'Free entry confirmed' : 'Payment received'} for{' '}
          <span className="font-bold text-gray-800">{data.numberOfAttendees} person(s)</span>
        </p>
      </div>

      {/* Registration ID */}
      <div className="bg-gradient-to-r from-[#0A6C87] to-cyan-700 rounded-2xl p-4 text-white text-center space-y-1 shadow-lg">
        <div className="flex items-center justify-center gap-1.5 text-cyan-200 text-[10px] font-semibold uppercase tracking-wider">
          <Hash className="w-3 h-3" /> Your Registration ID
        </div>
        <p className="text-2xl font-extrabold font-mono tracking-wider">{data.registrationId}</p>
        <p className="text-[10px] text-cyan-200">Save this ID – present at the event entry</p>
      </div>

      {/* Event Summary */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-medium flex items-center gap-1"><Ticket className="w-3.5 h-3.5" /> Event</span>
          <span className="font-bold text-gray-900 text-right max-w-[60%]">{data.eventTitle}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date</span>
          <span className="font-bold text-gray-900">{data.date}</span>
        </div>
        {data.location && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Venue</span>
            <span className="font-bold text-gray-900 text-right max-w-[60%]">{data.location}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="font-bold text-gray-900">Amount Paid</span>
          <span className={`font-extrabold text-sm ${data.isFree ? 'text-emerald-600' : 'text-[#0A6C87]'}`}>
            {data.isFree ? '₹0 (FREE)' : `₹${data.totalAmount.toLocaleString('en-IN')}`}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownloadTicket}
          className="flex-1 bg-[#0A6C87] text-white py-3 rounded-xl font-bold text-xs hover:bg-cyan-800 transition-colors flex items-center justify-center gap-2 shadow-md"
        >
          <Download className="w-4 h-4" />
          Download Ticket
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
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
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

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

  useEffect(() => {
    if (!isOpen) {
      setSuccessData(null);
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const pricePerPerson = Number(event.price || 0);
  const isFree = event.is_free || pricePerPerson === 0;
  const totalAmount = isFree ? 0 : pricePerPerson * formData.numberOfAttendees;

  const buildSuccessData = (res: any): SuccessData => ({
    registrationId: res.registrationId || `REG-${Date.now()}`,
    eventTitle: event.title,
    name: formData.name,
    email: formData.email,
    numberOfAttendees: formData.numberOfAttendees,
    totalAmount: res.totalAmount ?? totalAmount,
    isFree: res.isFree ?? isFree,
    date: new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
    location: event.location || '',
  });

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
          toast.success('Registration confirmed!');
          if (onSuccess) onSuccess();
          setSuccessData(buildSuccessData(res));
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
                toast.success('Payment verified! Registration confirmed.');
                if (onSuccess) onSuccess();
                setSuccessData(buildSuccessData(regRes));
              } else {
                toast.error(regRes.message || 'Registration failed after payment verification');
              }
            },
            modal: {
              ondismiss: function () {
                paymentApi.cancelOrder(orderRes.order.id, 'User cancelled event ticket checkout');
                toast.info('Event ticket payment was cancelled.');
              },
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
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 max-h-[95vh] overflow-y-auto">
        
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
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
            {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.location}</span>}
          </div>
        </div>

        {/* Content: either form or success ticket */}
        {successData ? (
          <SuccessTicket data={successData} onClose={onClose} />
        ) : (
          /* Registration Form */
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
        )}
      </div>
    </div>
  );
}
