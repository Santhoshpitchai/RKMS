import { Heart, CreditCard, ShieldCheck, CheckCircle2, Download, Sparkles, BookOpen, HeartHandshake, Shield, Sparkle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { settingsApi, donationApi, paymentApi } from '../services/api';
import { UserAuthModal } from './UserAuthModal';

interface Settings {
  donationSuggestions: number[];
  organizationName: string;
}

export function Donate() {
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [purpose, setPurpose] = useState('Women Empowerment & Education');
  const [panNumber, setPanNumber] = useState('');
  const [address, setAddress] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptInfo, setReceiptInfo] = useState<any>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Auto prefill from user session
  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.name) setDonorName((prev) => prev || user.name);
        if (user.email) setDonorEmail((prev) => prev || user.email);
        if (user.phone) setDonorPhone((prev) => prev || user.phone);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsApi.getPublicSettings();
        if (response.success && response.settings) {
          setSettings(response.settings);
        }
      } catch (error) {
        setSettings({
          donationSuggestions: [500, 1000, 2500, 5000, 10000],
          organizationName: 'Raju Kshatriya Mahila Sangha'
        });
      }
    };
    fetchSettings();
  }, []);

  const predefinedAmounts = settings?.donationSuggestions || [500, 1000, 2500, 5000, 10000];

  const handleDonate = async () => {
    const parsedCustom = parseFloat(customAmount);
    const amount = customAmount && !isNaN(parsedCustom) && parsedCustom > 0 
      ? parsedCustom 
      : (selectedAmount || 0);

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }

    if (!donorName || !donorEmail || !donorPhone) {
      toast.error('Please fill in Name, Email, and Phone number');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(donorPhone.trim())) {
      toast.error('Phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    const hasUser = Boolean(localStorage.getItem('userToken'));
    if (!hasUser) {
      toast.info('Please create an account or sign in to complete your donation');
      setAuthModalOpen(true);
      return;
    }

    await startDonationProcess(amount);
  };

  const startDonationProcess = async (amount: number) => {
    setIsLoading(true);

    try {
      const response = await donationApi.createOrder({
        amount,
        name: donorName,
        email: donorEmail,
        phone: donorPhone,
        purpose: purpose,
        panNumber: panNumber,
        address: address,
      });

      if (response.success && response.order && response.razorpayKeyId) {
        const options = {
          key: response.razorpayKeyId,
          amount: response.order.amount,
          currency: 'INR',
          name: settings?.organizationName || 'Raju Kshatriya Mahila Sangha',
          description: 'Donation for Women Empowerment',
          order_id: response.order.id,
          handler: async function (razorpayResponse: any) {
            await verifyAndCreateDonation({
              ...razorpayResponse,
              amount,
              name: donorName,
              email: donorEmail,
            });
          },
          modal: {
            ondismiss: function () {
              paymentApi.cancelOrder(response.order.id, 'User closed donation checkout');
              toast.info('Donation payment was cancelled.');
            },
          },
          prefill: {
            name: donorName,
            email: donorEmail,
            contact: donorPhone,
          },
          theme: { color: '#0A6C87' },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        toast.error(response.message || 'Failed to create donation order');
      }
    } catch (error) {
      console.error('Donation error:', error);
      toast.error('Donation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndCreateDonation = async (paymentData: any) => {
    try {
      const response = await donationApi.verifyPayment({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        amount: paymentData.amount,
        name: paymentData.name,
        email: paymentData.email,
        phone: donorPhone,
        purpose: purpose,
        panNumber: panNumber,
        address: address,
      });

      if (response.success) {
        setReceiptInfo(response.receipt);
        setShowReceipt(true);
        toast.success('Thank you for your generous donation!');
      } else {
        toast.error(response.message || 'Payment verification failed');
      }
    } catch (error) {
      toast.error('Error verifying donation payment');
    }
  };

  return (
    <div className="bg-white text-gray-800 font-sans">
      {/* Hero Header */}
      <section className="bg-gradient-to-r from-[#0A6C87] to-cyan-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <span className="bg-white/10 text-yellow-300 text-xs px-3 py-1 rounded-full font-semibold border border-white/20 uppercase tracking-wider">
            Make an Impact
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold">Support RKS Mahila Sangha</h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto text-cyan-100 leading-relaxed">
            Your support directly powers scholarships, healthcare camps, relief aid, and women entrepreneurship initiatives.
          </p>
        </div>
      </section>

      {/* Main Donation Container */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Donation Causes Showcase */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#0A6C87] uppercase tracking-wider bg-cyan-50 px-3 py-1 rounded-full">
                Where Your Support Goes
              </span>
              <h2 className="text-2xl font-bold text-gray-900">Your Generosity Creates Real Change</h2>
            </div>

            <div className="space-y-4">
              {[
                { icon: BookOpen, title: 'Girl Student Education', desc: 'Providing books, fees, and academic scholarships to deserving girls.' },
                { icon: ShieldCheck, title: 'Health Checkup Camps', desc: 'Free medical camps, eye checkups, and hygiene kits for families.' },
                { icon: HeartHandshake, title: 'Social & Emergency Relief', desc: 'Ration distribution and financial assistance during community hardships.' },
                { icon: Sparkles, title: 'Women Entrepreneurship', desc: 'Skill-building workshops & micro-grants for women-led businesses.' },
              ].map((cause, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 text-[#0A6C87] flex items-center justify-center flex-shrink-0">
                    <cause.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{cause.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{cause.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                100% Transparent & Receipt Provided
              </p>
              <p className="text-amber-800">
                Official digital donation receipts are generated automatically upon successful payment.
              </p>
            </div>
          </div>

          {/* Right Column: Donation Form & Amount Selector */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-6">
            <h3 className="text-xl font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#E5C100]" />
              Select Donation Amount
            </h3>

            {/* Amount Selector Chips */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700">Choose Amount (₹)</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {predefinedAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                    className={`py-2.5 text-xs font-bold rounded-lg border transition-all ${
                      selectedAmount === amt && !customAmount
                        ? 'bg-[#0A6C87] text-white border-[#0A6C87] shadow-md'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Or Enter Custom Amount (₹)</label>
                <input
                  type="number"
                  placeholder="Enter custom amount"
                  value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                />
              </div>
            </div>

            {/* Donor Details Form */}
            <div className="space-y-4 pt-2 border-t">
              <h4 className="text-sm font-bold text-gray-900">Donor Information</h4>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={donorPhone}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Donation Cause / Purpose</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Education Aid, General Support"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDonate}
              disabled={isLoading}
              className="w-full bg-[#E5C100] text-[#0A6C87] py-3.5 rounded-xl font-bold text-sm hover:bg-[#CCA900] transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {isLoading ? 'Processing...' : `Donate ₹${((customAmount && !isNaN(parseFloat(customAmount)) && parseFloat(customAmount) > 0) ? parseFloat(customAmount) : (selectedAmount || 0)).toLocaleString('en-IN')} via Razorpay`}
            </button>
          </div>

        </div>
      </section>

      {/* Receipt Modal */}
      {showReceipt && receiptInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Donation Successful!</h3>
            <p className="text-xs text-gray-600">
              Thank you for your generous contribution of ₹{Number(receiptInfo?.amount || ((customAmount && !isNaN(parseFloat(customAmount))) ? parseFloat(customAmount) : selectedAmount || 0)).toLocaleString('en-IN')}.
            </p>

            <a
              href={receiptInfo.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#0A6C87] text-white px-6 py-2.5 rounded-lg font-bold text-xs hover:bg-cyan-800 transition-colors shadow-md"
            >
              <Download className="w-4 h-4" /> Download Official Receipt (PDF)
            </a>

            <div>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-xs text-gray-500 hover:underline pt-2"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      <UserAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          handleDonate();
        }}
        title="Sign In to Complete Donation"
      />
    </div>
  );
}