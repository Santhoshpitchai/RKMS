import { Heart, CreditCard, ShieldCheck, Sparkles, BookOpen, HeartHandshake } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { settingsApi, donationApi, paymentApi } from '../services/api';
import { UserAuthModal } from './UserAuthModal';
import { PaymentResultModal, type PaymentSuccessInfo, type PaymentFailureInfo } from './PaymentResultModal';

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
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessInfo | null>(null);
  const [paymentFailure, setPaymentFailure] = useState<PaymentFailureInfo | null>(null);
  const [pendingAmount, setPendingAmount] = useState(0);

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

    const checkRazorpayRedirect = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const razorpay_payment_id = searchParams.get('razorpay_payment_id');
      const razorpay_order_id = searchParams.get('razorpay_order_id');
      const razorpay_signature = searchParams.get('razorpay_signature');

      const errorCode = searchParams.get('error[code]') || searchParams.get('error_code');
      const errorDesc = searchParams.get('error[description]') || searchParams.get('error_description') || searchParams.get('error[reason]');

      if (razorpay_payment_id && razorpay_order_id) {
        window.history.replaceState({}, document.title, window.location.pathname);
        const storedPending = sessionStorage.getItem('pending_donation_data');
        let pending = { amount: 1000, name: donorName, email: donorEmail, phone: donorPhone, purpose, panNumber, address };
        if (storedPending) {
          try {
            pending = { ...pending, ...JSON.parse(storedPending) };
          } catch (e) {}
        }
        sessionStorage.removeItem('pending_donation_data');
        sessionStorage.removeItem('pending_donation_order_id');

        await verifyAndCreateDonation({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature: razorpay_signature || '',
          amount: pending.amount,
          name: pending.name || donorName,
          email: pending.email || donorEmail,
          phone: pending.phone || donorPhone,
          purpose: pending.purpose || purpose,
          panNumber: pending.panNumber || panNumber,
          address: pending.address || address,
        });
      } else if (errorCode || errorDesc) {
        window.history.replaceState({}, document.title, window.location.pathname);
        const savedOrderId = sessionStorage.getItem('pending_donation_order_id');
        const storedPending = sessionStorage.getItem('pending_donation_data');
        let amt = 1000;
        if (storedPending) {
          try {
            amt = JSON.parse(storedPending).amount || amt;
          } catch (e) {}
        }
        sessionStorage.removeItem('pending_donation_data');
        sessionStorage.removeItem('pending_donation_order_id');

        setPaymentFailure({
          type: 'donation',
          reason: decodeURIComponent(errorDesc || 'Donation payment was declined or failed.'),
          code: errorCode || undefined,
          amount: amt,
          orderId: savedOrderId || undefined,
        });
      }
    };

    checkRazorpayRedirect();
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
    setPendingAmount(amount);

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
        try {
          sessionStorage.setItem('pending_donation_data', JSON.stringify({ amount, name: donorName, email: donorEmail, phone: donorPhone, purpose, panNumber, address }));
          sessionStorage.setItem('pending_donation_order_id', response.order.id);
        } catch (e) {}

        const options = {
          key: response.razorpayKeyId,
          amount: response.order.amount,
          currency: 'INR',
          name: settings?.organizationName || 'Raju Kshatriya Mahila Sangha',
          description: 'Donation for Women Empowerment',
          order_id: response.order.id,
          callback_url: window.location.href,
          handler: async function (razorpayResponse: any) {
            sessionStorage.removeItem('pending_donation_data');
            sessionStorage.removeItem('pending_donation_order_id');
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
              sessionStorage.removeItem('pending_donation_data');
              sessionStorage.removeItem('pending_donation_order_id');
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
        rzp.on('payment.failed', (resp: any) => {
          sessionStorage.removeItem('pending_donation_data');
          sessionStorage.removeItem('pending_donation_order_id');
          setPaymentFailure({
            type: 'donation',
            reason: resp?.error?.description || resp?.error?.reason || 'Payment was declined by your bank or payment provider.',
            code: resp?.error?.code,
            amount,
            orderId: resp?.error?.metadata?.order_id || response.order.id,
          });
        });
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
        toast.success('Thank you for your generous donation! 💚');
        setPaymentSuccess({
          type: 'donation',
          paymentId: paymentData.razorpay_payment_id || `PAY_${Date.now()}`,
          orderId: paymentData.razorpay_order_id || `ORDER_${Date.now()}`,
          amount: paymentData.amount || pendingAmount,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          donorName: paymentData.name || donorName,
          donorEmail: paymentData.email || donorEmail,
          donorPhone: donorPhone,
          purpose: purpose,
          receiptDownloadUrl: response.receipt?.downloadUrl,
        });
      } else {
        setPaymentFailure({
          type: 'donation',
          reason: response.message || 'Payment verification failed. Please contact support.',
          amount: paymentData.amount || pendingAmount,
          orderId: paymentData.razorpay_order_id,
        });
      }
    } catch (error) {
      setPaymentFailure({
        type: 'donation',
        reason: 'An unexpected error occurred while verifying your payment.',
        amount: pendingAmount,
      });
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
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-8 space-y-6">
            <h3 className="text-xl font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#E5C100]" />
              Select Donation Amount
            </h3>

            {/* Amount Selector Chips */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700">Choose Amount (₹)</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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

      {/* Payment Result Modal */}
      {(paymentSuccess || paymentFailure) && (
        <PaymentResultModal
          success={paymentSuccess}
          failure={paymentFailure}
          onClose={() => { setPaymentSuccess(null); setPaymentFailure(null); }}
          onRetry={() => startDonationProcess(pendingAmount)}
        />
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