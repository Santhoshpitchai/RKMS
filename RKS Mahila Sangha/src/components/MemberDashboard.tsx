import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, LogOut, CreditCard, IdCard, Calendar, Heart, ShieldCheck, 
  Download, PlusCircle, X, Sparkles, BookOpen, HeartHandshake, 
  CheckCircle2, Lock, Mail, Phone, Settings, LayoutDashboard, UserCheck, ShieldAlert,
  Trash2, Save, Edit3, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { membershipApi, donationApi, eventsApi, settingsApi, API_BASE_URL } from '../services/api';
import logo from '../assets/RKMS Logo.png';
import { EventRegistrationModal } from './EventRegistrationModal';
import { useLanguage } from '../context/LanguageContext';

interface UserData {
  name: string;
  email: string;
  phone?: string;
}

export function MemberDashboard({ user, onLogout }: { user: UserData; onLogout: () => void }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromPath = (path: string): 'overview' | 'membership' | 'donations' | 'events' | 'settings' => {
    if (path.startsWith('/membership')) return 'membership';
    if (path.startsWith('/donate')) return 'donations';
    if (path.startsWith('/events')) return 'events';
    if (path.startsWith('/settings') || path.startsWith('/profile')) return 'settings';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'membership' | 'donations' | 'events' | 'settings'>(
    getTabFromPath(location.pathname)
  );

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleTabChange = (tab: 'overview' | 'membership' | 'donations' | 'events' | 'settings') => {
    setActiveTab(tab);
    if (tab === 'membership') navigate('/membership');
    else if (tab === 'donations') navigate('/donate');
    else if (tab === 'events') navigate('/events');
    else if (tab === 'settings') navigate('/settings');
    else navigate('/dashboard');
  };
  
  const [membership, setMembership] = useState<any | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (membership && membership.memberId) {
      const verifyUrl = `${window.location.origin}/verify-member?id=${encodeURIComponent(membership.memberId)}`;
      QRCode.toDataURL(verifyUrl, { width: 140, margin: 1 })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => {});
    }
  }, [membership]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Event Registration Modal State
  const [selectedEventModal, setSelectedEventModal] = useState<any | null>(null);
  const [showEventRegModal, setShowEventRegModal] = useState(false);

  // Membership Form State inside Member Portal
  const [membershipForm, setMembershipForm] = useState({
    fullName: user.name || '',
    guardianName: '',
    gotraName: '',
    email: user.email || '',
    phone: user.phone || '',
    dateOfBirth: '',
    educationalQualification: '',
    profession: '',
    maritalStatus: 'Single',
    bloodGroup: 'O+',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '',
    aadharNumber: '',
  });

  const [profileForm, setProfileForm] = useState({
    fullName: user.name || '',
    phone: user.phone || '',
    guardianName: '',
    gotraName: '',
    profession: '',
    address: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingMembership, setIsDeletingMembership] = useState(false);

  useEffect(() => {
    if (membership) {
      setProfileForm({
        fullName: membership.fullName || user.name || '',
        phone: membership.phone || user.phone || '',
        guardianName: membership.guardianName || '',
        gotraName: membership.gotraName || '',
        profession: membership.profession || '',
        address: membership.address || '',
        city: membership.city || '',
        state: membership.state || 'Karnataka',
        pincode: membership.pincode || '',
      });
    }
  }, [membership, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdatingProfile(true);
      const res = await membershipApi.updateDetails({
        email: user.email,
        name: profileForm.fullName,
        phone: profileForm.phone,
        guardianName: profileForm.guardianName,
        gotraName: profileForm.gotraName,
        profession: profileForm.profession,
        address: profileForm.address,
        city: profileForm.city,
        state: profileForm.state,
        pincode: profileForm.pincode,
      });

      if (res.success) {
        toast.success('Membership profile details updated successfully!');
        const updatedUserData = { ...user, name: profileForm.fullName, phone: profileForm.phone };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        window.dispatchEvent(new Event('user_auth_change'));
        await loadMemberData();
      } else {
        toast.error(res.message || 'Failed to update profile details');
      }
    } catch (err) {
      toast.error('Error updating membership profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDeleteMembership = async () => {
    try {
      setIsDeletingMembership(true);
      const res = await membershipApi.cancel(user.email);
      if (res.success) {
        toast.success('Your lifetime membership has been cancelled and deleted.');
        setMembership(null);
        setShowDeleteConfirmModal(false);
        await loadMemberData();
      } else {
        toast.error(res.message || 'Failed to cancel membership');
      }
    } catch (err) {
      toast.error('Error cancelling membership');
    } finally {
      setIsDeletingMembership(false);
    }
  };

  // Donation State
  const [selectedDonationAmt, setSelectedDonationAmt] = useState<number>(1000);
  const [customDonationAmt, setCustomDonationAmt] = useState<string>('');
  const [donationPurpose, setDonationPurpose] = useState('Women Empowerment & Education');

  // Events State
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const loadMemberData = async () => {
    if (user.email) {
      try {
        const res = await membershipApi.getStatus(user.email);
        if (res && res.exists && res.member) {
          setMembership(res.member);
          if (res.payments) setPayments(res.payments);
        }
      } catch (err) {
        console.warn('Member data load warning:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const res = await eventsApi.getEvents();
      if (res.success && res.events) {
        setEventsList(res.events);
      }
    } catch (err) {
      console.warn('Events load warning:', err);
    }
  };

  useEffect(() => {
    loadMemberData();
    loadEvents();
    const interval = setInterval(loadEvents, 4000);
    return () => clearInterval(interval);
  }, [user.email]);

  // Card Print/Download
  const handleDownloadCard = () => {
    if (!membership) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print/download your membership card');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>RKS Mahila Sangha - Digital Membership Card</title>
        <style>
          body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6; margin: 0; }
          .card { width: 450px; background: linear-gradient(135deg, #0A6C87 0%, #0891b2 100%); color: white; border-radius: 20px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .logo { width: 50px; height: 50px; background: white; border-radius: 50%; padding: 5px; }
          .title { text-align: right; }
          .title h3 { margin: 0; font-size: 16px; font-weight: bold; }
          .title p { margin: 2px 0 0 0; font-size: 12px; opacity: 0.9; }
          .content { background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 12px; padding: 15px; margin-bottom: 15px; }
          .field { margin-bottom: 10px; }
          .field label { font-size: 11px; opacity: 0.8; display: block; text-transform: uppercase; }
          .field span { font-size: 16px; font-weight: bold; }
          .id-val { color: #E5C100; font-family: monospace; font-size: 18px; }
          .footer { display: flex; justify-content: space-between; font-size: 12px; opacity: 0.9; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <img src="${logo}" class="logo" />
            <div class="title">
              <h3>Raju Kshatriya Mahila Sangha</h3>
              <p>Official Digital Membership Card</p>
            </div>
          </div>
          <div class="content">
            <div class="field">
              <label>Member Name</label>
              <span>${membership.fullName}</span>
            </div>
            <div class="field">
              <label>Membership ID</label>
              <span class="id-val">${membership.memberId}</span>
            </div>
            <div class="field">
              <label>Registration Date</label>
              <span>${membership.registrationDate}</span>
            </div>
          </div>
          <div class="footer">
            <span>✓ Verified Member</span>
            <span>RKS Mahila Sangha</span>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Buy Membership via Razorpay
  const handleBuyMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipForm.fullName || !membershipForm.email || !membershipForm.phone || !membershipForm.address || !membershipForm.city) {
      toast.error('Please fill in all required fields (Name, Email, Phone, Address, City)');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const orderRes = await membershipApi.createOrder({
        name: membershipForm.fullName,
        guardianName: membershipForm.guardianName,
        gotraName: membershipForm.gotraName,
        email: membershipForm.email,
        phone: membershipForm.phone,
        dateOfBirth: membershipForm.dateOfBirth,
        educationalQualification: membershipForm.educationalQualification,
        profession: membershipForm.profession,
        maritalStatus: membershipForm.maritalStatus || 'Single',
        bloodGroup: membershipForm.bloodGroup || 'O+',
        address: membershipForm.address,
        city: membershipForm.city,
        state: membershipForm.state || 'Karnataka',
        pincode: membershipForm.pincode,
        aadharNumber: membershipForm.aadharNumber,
      });

      if (orderRes.success && orderRes.order && orderRes.razorpayKeyId) {
        const options = {
          key: orderRes.razorpayKeyId,
          amount: orderRes.order.amount,
          currency: 'INR',
          name: 'RKS Mahila Sangha',
          description: 'Lifetime Membership Buying (₹1,001)',
          order_id: orderRes.order.id,
          handler: async function (rzpRes: any) {
            const verifyRes = await membershipApi.verifyPayment({
              razorpay_order_id: rzpRes.razorpay_order_id,
              razorpay_payment_id: rzpRes.razorpay_payment_id,
              razorpay_signature: rzpRes.razorpay_signature,
              name: membershipForm.fullName,
              guardianName: membershipForm.guardianName,
              gotraName: membershipForm.gotraName,
              email: membershipForm.email,
              phone: membershipForm.phone,
              dateOfBirth: membershipForm.dateOfBirth,
              educationalQualification: membershipForm.educationalQualification,
              profession: membershipForm.profession,
              maritalStatus: membershipForm.maritalStatus,
              bloodGroup: membershipForm.bloodGroup,
              address: membershipForm.address,
              city: membershipForm.city,
              state: membershipForm.state,
              pincode: membershipForm.pincode,
              aadharNumber: membershipForm.aadharNumber,
              photo: membershipForm.photo || undefined,
            });

            if (verifyRes.success) {
              toast.success('Congratulations! Your Lifetime Membership is active.');
              await loadMemberData();
              setActiveTab('membership');
            } else {
              toast.error(verifyRes.message || 'Payment verification failed');
            }
          },
          prefill: {
            name: membershipForm.fullName,
            email: membershipForm.email,
            contact: membershipForm.phone,
          },
          theme: { color: '#0A6C87' },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        toast.error(orderRes.message || 'Failed to create membership order');
      }
    } catch (err) {
      toast.error('Error starting membership payment');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Make Donation via Razorpay
  const handleMakeDonation = async () => {
    const parsedCustom = parseFloat(customDonationAmt);
    const amount = (customDonationAmt && !isNaN(parsedCustom) && parsedCustom > 0)
      ? parsedCustom
      : (selectedDonationAmt || 0);

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const orderRes = await donationApi.createOrder({
        amount,
        name: user.name,
        email: user.email,
        phone: user.phone || '9999999999',
        purpose: donationPurpose,
        panNumber: '',
        address: 'Bengaluru, Karnataka'
      });

      if (orderRes.success && orderRes.order && orderRes.razorpayKeyId) {
        const options = {
          key: orderRes.razorpayKeyId,
          amount: orderRes.order.amount,
          currency: 'INR',
          name: 'RKS Mahila Sangha',
          description: `Donation for ${donationPurpose}`,
          order_id: orderRes.order.id,
          handler: async function (rzpRes: any) {
            const verifyRes = await donationApi.verifyPayment({
              ...rzpRes,
              amount,
              name: user.name,
              email: user.email,
              phone: user.phone || '9999999999',
              purpose: donationPurpose,
              panNumber: '',
              address: 'Bengaluru, Karnataka'
            });

            if (verifyRes.success) {
              toast.success('Thank you for your generous donation!');
              setCustomDonationAmt('');
              await loadMemberData();
            } else {
              toast.error(verifyRes.message || 'Donation payment verification failed');
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone || '',
          },
          theme: { color: '#0A6C87' },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        toast.error(orderRes.message || 'Failed to create donation order');
      }
    } catch (err) {
      toast.error('Error initiating donation');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const filteredEvents = eventsList.filter(e => {
    if (eventFilter === 'upcoming') return e.isUpcoming;
    if (eventFilter === 'past') return !e.isUpcoming;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-16">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#0A6C87] to-cyan-700 text-white py-8 border-b border-cyan-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl font-bold border border-white/30 shadow-inner">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Member Portal</h1>
                <span className="bg-[#E5C100] text-[#0A6C87] text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {membership ? 'ACTIVE MEMBER' : 'REGISTERED USER'}
                </span>
              </div>
              <p className="text-cyan-100 text-xs md:text-sm mt-1">{user.name} • {user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onLogout}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border border-white/20"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 py-2">
          {[
            { id: 'overview', label: t('dashboard.overview'), icon: LayoutDashboard },
            { id: 'membership', label: t('dashboard.memberCard'), icon: IdCard },
            { id: 'donations', label: t('dashboard.donations'), icon: Heart },
            { id: 'events', label: t('dashboard.events'), icon: Calendar },
            { id: 'settings', label: t('dashboard.settings'), icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#0A6C87] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-[#0A6C87]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Quick Action Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => handleTabChange('membership')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-[#0A6C87]">
                  <IdCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{membership ? 'Member Card' : 'Buy Membership'}</h3>
                  <p className="text-xs text-gray-500">{membership ? 'View & Download ID' : '₹1,001 Lifetime'}</p>
                </div>
              </button>

              <button
                onClick={() => handleTabChange('donations')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-[#E5C100]">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Make Donation</h3>
                  <p className="text-xs text-gray-500">Support Causes</p>
                </div>
              </button>

              <button
                onClick={() => handleTabChange('events')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">RKS Events</h3>
                  <p className="text-xs text-gray-500">Browse & Register</p>
                </div>
              </button>

              <button
                onClick={() => handleTabChange('settings')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Account Status</h3>
                  <p className="text-xs text-gray-500">Email Verified</p>
                </div>
              </button>
            </div>

            {/* Membership Status Box */}
            <div className="grid md:grid-cols-3 gap-8 items-start">
              <div className="md:col-span-1">
                {isLoading ? (
                  <div className="bg-white p-8 rounded-2xl shadow text-center text-gray-400">Loading Member Status...</div>
                ) : membership ? (
                  <div className="bg-gradient-to-br from-[#0A6C87] to-cyan-700 rounded-2xl shadow-xl overflow-hidden text-white">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <img src={logo} alt="RKS Logo" className="w-12 h-12 bg-white rounded-full p-1" />
                        <div className="text-right">
                          <h4 className="font-bold text-sm">RKS Mahila Sangha</h4>
                          <p className="text-cyan-100 text-xs">Official Member Card</p>
                        </div>
                      </div>

                      <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex items-center justify-between gap-3 mb-6">
                        <div className="space-y-3">
                          <div>
                            <p className="text-cyan-100 text-xs uppercase font-semibold">Member Name</p>
                            <p className="font-bold text-lg">{membership.fullName}</p>
                          </div>
                          <div>
                            <p className="text-cyan-100 text-xs uppercase font-semibold">Membership ID</p>
                            <p className="font-bold text-[#E5C100] font-mono">{membership.memberId}</p>
                          </div>
                        </div>
                        {qrCodeDataUrl && (
                          <div className="bg-white p-1.5 rounded-xl shadow-md flex-shrink-0 text-center">
                            <img src={qrCodeDataUrl} alt="Verify QR Code" className="w-16 h-16 rounded-lg" />
                            <span className="text-[8px] font-extrabold text-[#0A6C87] uppercase block mt-0.5">Scan to Verify</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleDownloadCard}
                        className="w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-colors"
                      >
                        <Download className="w-4 h-4" /> Download Official Card
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-cyan-100 p-6 text-center space-y-4">
                    <div className="w-14 h-14 bg-cyan-50 rounded-full flex items-center justify-center mx-auto text-[#0A6C87]">
                      <PlusCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">No Active Membership</h3>
                      <p className="text-xs text-gray-500 mt-1">Get your official RKS Lifetime Membership Card recognized across chapters.</p>
                    </div>
                    <button
                      onClick={() => handleTabChange('membership')}
                      className="w-full bg-[#E5C100] text-[#0A6C87] py-3 rounded-xl font-bold text-sm hover:bg-[#CCA900] transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Buy Lifetime Membership (₹1,001)
                    </button>
                  </div>
                )}
              </div>

              {/* Transactions Table Snippet */}
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[#0A6C87]" />
                      Recent Payment Transactions
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Your donation and membership order history</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('donations')}
                    className="text-xs font-bold text-[#0A6C87] hover:underline"
                  >
                    View All
                  </button>
                </div>

                {payments.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">No transactions recorded yet.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {payments.slice(0, 3).map((p) => (
                      <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-gray-900 capitalize">{p.type} Payment</p>
                          <p className="text-gray-500">{p.date} • ID: {p.orderId || `#${p.id}`}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#0A6C87]">₹{p.amount?.toLocaleString('en-IN')}</p>
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">
                            {p.status || 'COMPLETED'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. MEMBERSHIP TAB */}
        {activeTab === 'membership' && (
          <div className="space-y-8 animate-fade-in">
            {membership ? (
              /* Display Member Details & Card */
              <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-8">
                <div className="flex justify-between items-center border-b pb-4">
                  <div className="flex items-center gap-3">
                    <img src={logo} alt="RKS Logo" className="w-12 h-12" />
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Your Lifetime Membership Details</h2>
                      <p className="text-xs text-gray-500">Registered member of Raju Kshatriya Mahila Sangha</p>
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                    ✓ ACTIVE MEMBER
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-200 text-xs">
                  <div>
                    <label className="text-gray-400 font-semibold block uppercase text-[10px]">Member Name</label>
                    <span className="font-bold text-gray-900 text-sm">{membership.fullName}</span>
                  </div>
                  <div>
                    <label className="text-gray-400 font-semibold block uppercase text-[10px]">Membership ID</label>
                    <span className="font-bold text-[#0A6C87] text-sm font-mono">{membership.memberId}</span>
                  </div>
                  <div>
                    <label className="text-gray-400 font-semibold block uppercase text-[10px]">Registration Date</label>
                    <span className="font-bold text-gray-900">{membership.registrationDate}</span>
                  </div>
                  <div>
                    <label className="text-gray-400 font-semibold block uppercase text-[10px]">Email Address</label>
                    <span className="font-medium text-gray-800">{membership.email}</span>
                  </div>
                  <div>
                    <label className="text-gray-400 font-semibold block uppercase text-[10px]">Phone Number</label>
                    <span className="font-medium text-gray-800">{membership.phone}</span>
                  </div>
                  <div>
                    <label className="text-gray-400 font-semibold block uppercase text-[10px]">City / Location</label>
                    <span className="font-medium text-gray-800">{membership.city || 'Karnataka'}</span>
                  </div>
                </div>

                <button
                  onClick={handleDownloadCard}
                  className="bg-[#0A6C87] text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-cyan-800 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download / Print Official Card (PDF)
                </button>
              </div>
            ) : (
              /* Membership Registration & Buying Form */
              <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-6">
                <div className="border-b pb-4">
                  <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-bold">
                    Lifetime Membership • ₹1,001
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 mt-2">Buy Lifetime Membership</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Complete your details to receive your official digital membership card via Razorpay.
                  </p>
                </div>

                <form onSubmit={handleBuyMembership} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={membershipForm.fullName}
                        onChange={(e) => setMembershipForm({ ...membershipForm, fullName: e.target.value })}
                        required
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Guardian / Husband Name</label>
                      <input
                        type="text"
                        value={membershipForm.guardianName}
                        onChange={(e) => setMembershipForm({ ...membershipForm, guardianName: e.target.value })}
                        placeholder="Enter guardian name"
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        value={membershipForm.email}
                        onChange={(e) => setMembershipForm({ ...membershipForm, email: e.target.value })}
                        required
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        value={membershipForm.phone}
                        onChange={(e) => setMembershipForm({ ...membershipForm, phone: e.target.value })}
                        required
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Gotra Name</label>
                      <input
                        type="text"
                        value={membershipForm.gotraName}
                        onChange={(e) => setMembershipForm({ ...membershipForm, gotraName: e.target.value })}
                        placeholder="e.g. Kashyapa"
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={membershipForm.dateOfBirth}
                        onChange={(e) => setMembershipForm({ ...membershipForm, dateOfBirth: e.target.value })}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Blood Group</label>
                      <select
                        value={membershipForm.bloodGroup}
                        onChange={(e) => setMembershipForm({ ...membershipForm, bloodGroup: e.target.value })}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                      >
                        <option value="A+">A+</option>
                        <option value="B+">B+</option>
                        <option value="O+">O+</option>
                        <option value="AB+">AB+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Address *</label>
                      <input
                        type="text"
                        value={membershipForm.address}
                        onChange={(e) => setMembershipForm({ ...membershipForm, address: e.target.value })}
                        required
                        placeholder="Street address"
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">City *</label>
                      <input
                        type="text"
                        value={membershipForm.city}
                        onChange={(e) => setMembershipForm({ ...membershipForm, city: e.target.value })}
                        required
                        placeholder="e.g. Bengaluru"
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="w-full bg-[#E5C100] text-[#0A6C87] py-3.5 rounded-xl font-bold text-sm hover:bg-[#CCA900] transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                  >
                    <CreditCard className="w-4 h-4" />
                    {isProcessingPayment ? 'Processing Order...' : 'Proceed to Buy Lifetime Membership (₹1,001)'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 3. DONATIONS TAB */}
        {activeTab === 'donations' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-6 max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#E5C100]" />
                Make a Donation
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Select Donation Amount (₹)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[500, 1000, 2500, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { setSelectedDonationAmt(amt); setCustomDonationAmt(''); }}
                        className={`py-2.5 text-xs font-bold rounded-lg border transition-all ${
                          selectedDonationAmt === amt && !customDonationAmt
                            ? 'bg-[#0A6C87] text-white border-[#0A6C87]'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Custom Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="Enter custom amount"
                    value={customDonationAmt}
                    onChange={(e) => { setCustomDonationAmt(e.target.value); setSelectedDonationAmt(0); }}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Donation Cause</label>
                  <select
                    value={donationPurpose}
                    onChange={(e) => setDonationPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                  >
                    <option value="Women Empowerment & Education">Girl Student Education & Scholarships</option>
                    <option value="Health Checkup Camps">Health Checkup & Eye Camps</option>
                    <option value="Emergency Relief">Social & Emergency Relief Aid</option>
                    <option value="General Cause">General RKS Sangha Support</option>
                  </select>
                </div>

                <button
                  onClick={handleMakeDonation}
                  disabled={isProcessingPayment}
                  className="w-full bg-[#E5C100] text-[#0A6C87] py-3.5 rounded-xl font-bold text-sm hover:bg-[#CCA900] transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  {isProcessingPayment ? 'Processing...' : `Donate ₹${((customDonationAmt && !isNaN(parseFloat(customDonationAmt))) ? parseFloat(customDonationAmt) : selectedDonationAmt).toLocaleString('en-IN')} via Razorpay`}
                </button>
              </div>

              {/* Transactions Audit List */}
              <div className="pt-6 border-t space-y-4">
                <h3 className="text-base font-bold text-gray-900">Your Complete Financial Audit History</h3>
                {payments.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-xs bg-gray-50 rounded-xl">No past payment records.</div>
                ) : (
                  <div className="overflow-x-auto border rounded-xl divide-y">
                    {payments.map((p) => (
                      <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-gray-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 capitalize">{p.type} Payment</p>
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">
                              {p.status || 'COMPLETED'}
                            </span>
                          </div>
                          <p className="text-gray-500 mt-0.5">{p.date} • Transaction ID: {p.paymentId || p.orderId || `#${p.id}`}</p>
                        </div>
                        <div className="flex items-center gap-3 justify-between sm:justify-end">
                          <p className="font-bold text-[#0A6C87] text-sm">₹{p.amount?.toLocaleString('en-IN')}</p>
                          <a
                            href={`${API_BASE_URL}/donation/receipt/${p.paymentId || p.orderId || p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#0A6C87] text-white hover:bg-cyan-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" /> 80G PDF Receipt
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. EVENTS TAB */}
        {activeTab === 'events' && (
          <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">RKS Mahila Sangha Events</h2>
                <p className="text-xs text-gray-500">Browse upcoming meets and cultural gatherings</p>
              </div>

              <div className="flex gap-2">
                {['all', 'upcoming', 'past'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setEventFilter(f as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                      eventFilter === f ? 'bg-[#0A6C87] text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs bg-white rounded-2xl border">No events found.</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((evt) => {
                  const pricePerPerson = Number(evt.price || evt.fee || 0);
                  const isFree = evt.is_free || pricePerPerson === 0;

                  return (
                    <div key={evt.id} className="bg-white rounded-2xl shadow-md border overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
                      <div>
                        {evt.imageUrl && (
                          <div className="relative h-44 bg-gray-100">
                            <img src={evt.imageUrl} alt={evt.title} className="w-full h-full object-cover" />
                            {isFree ? (
                              <span className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                                FREE ENTRY
                              </span>
                            ) : (
                              <span className="absolute top-2.5 left-2.5 bg-[#E5C100] text-[#0A6C87] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                                PAID • ₹{pricePerPerson} / Person
                              </span>
                            )}
                          </div>
                        )}
                        <div className="p-5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                              evt.isUpcoming !== false ? 'bg-cyan-50 text-[#0A6C87]' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {evt.isUpcoming !== false ? 'Upcoming Event' : 'Past Event'}
                            </span>
                            {!evt.imageUrl && (
                              isFree ? (
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                  FREE
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                  ₹{pricePerPerson}
                                </span>
                              )
                            )}
                          </div>
                          <h3 className="font-bold text-gray-900 text-base">{evt.title}</h3>
                          <p className="text-xs text-gray-600 line-clamp-2">{evt.description}</p>
                        </div>
                      </div>

                      <div className="p-5 pt-0 border-t mt-4 flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">{evt.date}</span>
                        <button
                          onClick={() => {
                            setSelectedEventModal(evt);
                            setShowEventRegModal(true);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-sm ${
                            isFree 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                              : 'bg-[#E5C100] hover:bg-[#CCA900] text-[#0A6C87]'
                          }`}
                        >
                          {isFree ? 'Register Free' : `Pay & Register (₹${pricePerPerson})`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
            {/* Account Status Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="w-12 h-12 bg-cyan-50 text-[#0A6C87] rounded-xl flex items-center justify-center font-bold text-xl">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{user.name} Profile & Settings</h2>
                  <p className="text-xs text-gray-500">Manage account information and membership status</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
                <div>
                  <label className="text-gray-400 font-semibold block text-[10px]">Email Verification Status</label>
                  <span className="font-bold text-emerald-700 text-sm flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Verified Member Account ({user.email})
                  </span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                  VERIFIED
                </span>
              </div>

              {/* Profile Edit Form */}
              <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold text-[#0A6C87] flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#0A6C87]" />
                    Modify / Update Membership Details
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-cyan-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Phone Number (10 Digits) *</label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-cyan-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Father / Husband Name</label>
                    <input
                      type="text"
                      value={profileForm.guardianName}
                      onChange={(e) => setProfileForm({ ...profileForm, guardianName: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-cyan-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Gotra Name</label>
                    <input
                      type="text"
                      value={profileForm.gotraName}
                      onChange={(e) => setProfileForm({ ...profileForm, gotraName: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-cyan-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Profession</label>
                    <input
                      type="text"
                      value={profileForm.profession}
                      onChange={(e) => setProfileForm({ ...profileForm, profession: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-cyan-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-cyan-600"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-cyan-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="bg-[#0A6C87] text-white hover:bg-cyan-800 px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isUpdatingProfile ? 'Saving Updates...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>

              {/* Danger Zone: Delete Membership */}
              {membership && (
                <div className="border-t pt-6 space-y-4">
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        Danger Zone: Delete Lifetime Membership
                      </h4>
                      <p className="text-[11px] text-rose-600 mt-1">
                        Permanently delete your official active membership record (ID: {membership.memberId}).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirmModal(true)}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Membership
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 py-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 border mt-4"
              >
                <LogOut className="w-4 h-4" />
                Sign Out of Member Account
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-100 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-extrabold text-gray-900">Delete Lifetime Membership?</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Are you sure you want to delete your active membership record <span className="font-bold text-gray-900">({membership?.memberId})</span>? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMembership}
                  disabled={isDeletingMembership}
                  className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-rose-700 transition-colors shadow flex items-center justify-center gap-1.5"
                >
                  {isDeletingMembership ? 'Deleting...' : 'Yes, Delete Membership'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <EventRegistrationModal
        isOpen={showEventRegModal}
        onClose={() => setShowEventRegModal(false)}
        event={selectedEventModal}
        userSession={user}
      />
    </div>
  );
}
