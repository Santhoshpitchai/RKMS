import { UserPlus, CreditCard, CheckCircle2, Download, ShieldCheck, IdCard, Sparkles, BookOpen, HeartHandshake } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { settingsApi, membershipApi } from '../services/api';
import logo from '../assets/RKMS Logo.png';
import { UserAuthModal } from './UserAuthModal';

interface MembershipData {
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  registrationDate: string;
}

export function Membership() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    guardianName: '',
    gotraName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    educationalQualification: '',
    profession: '',
    maritalStatus: 'Single',
    bloodGroup: 'O+',
    photo: null as File | null,
    address: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
    aadharNumber: '',
  });

  const [showMembershipCard, setShowMembershipCard] = useState(false);
  const [membershipData, setMembershipData] = useState<MembershipData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userSession, setUserSession] = useState<{ name: string; email: string; phone?: string } | null>(null);

  const checkUserMembership = async (user: { name: string; email: string; phone?: string }) => {
    setUserSession(user);
    setFormData((prev) => ({
      ...prev,
      fullName: user.name || prev.fullName,
      email: user.email || prev.email,
      phone: user.phone || prev.phone,
    }));

    try {
      const statusRes = await membershipApi.getStatus(user.email);
      if (statusRes && statusRes.exists && statusRes.member) {
        setMembershipData(statusRes.member);
        setShowMembershipCard(true);
      }
    } catch (err) {
      console.warn('Membership status check error:', err);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        checkUserMembership(user);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, photo: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.phone || !formData.address || !formData.city) {
      toast.error('Please fill in all required fields (Name, Email, Phone, Address, City)');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      toast.error('Phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    const hasUser = Boolean(localStorage.getItem('userToken'));
    if (!hasUser) {
      toast.info('Please sign in or create an account to complete membership buying');
      setAuthModalOpen(true);
      return;
    }

    await startMembershipPaymentProcess(formData);
  };

  const startMembershipPaymentProcess = async (data: typeof formData) => {
    setIsLoading(true);

    try {
      const orderResponse = await membershipApi.createOrder({
        name: data.fullName,
        guardianName: data.guardianName,
        gotraName: data.gotraName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        educationalQualification: data.educationalQualification,
        profession: data.profession,
        maritalStatus: data.maritalStatus || 'Single',
        bloodGroup: data.bloodGroup || 'O+',
        address: data.address,
        city: data.city,
        state: data.state || 'Karnataka',
        pincode: data.pincode,
        aadharNumber: data.aadharNumber,
      });

      if (orderResponse.success && orderResponse.order && orderResponse.razorpayKeyId) {
        const options = {
          key: orderResponse.razorpayKeyId,
          amount: orderResponse.order.amount,
          currency: 'INR',
          name: 'Raju Kshatriya Mahila Sangha',
          description: 'Lifetime Membership Buying (₹1,001)',
          order_id: orderResponse.order.id,
          handler: async function (razorpayResponse: any) {
            await verifyAndCreateMembership(razorpayResponse, data);
          },
          prefill: {
            name: data.fullName,
            email: data.email,
            contact: data.phone,
          },
          theme: { color: '#0A6C87' },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else if (orderResponse.alreadyMember) {
        toast.info(orderResponse.message || 'Your membership is already active!');
        if (orderResponse.member) {
          setMembershipData(orderResponse.member);
          setShowMembershipCard(true);
        } else {
          navigate('/dashboard');
        }
      } else {
        toast.error(orderResponse.message || 'Failed to create Razorpay membership order');
      }
    } catch (error) {
      console.error('Membership order error:', error);
      toast.error('Failed to initiate membership payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndCreateMembership = async (rzpRes: any, data: typeof formData) => {
    setIsLoading(true);
    try {
      const verifyRes = await membershipApi.verifyPayment({
        razorpay_order_id: rzpRes.razorpay_order_id,
        razorpay_payment_id: rzpRes.razorpay_payment_id,
        razorpay_signature: rzpRes.razorpay_signature,
        name: data.fullName,
        guardianName: data.guardianName,
        gotraName: data.gotraName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        educationalQualification: data.educationalQualification,
        profession: data.profession,
        maritalStatus: data.maritalStatus,
        bloodGroup: data.bloodGroup,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        aadharNumber: data.aadharNumber,
        photo: data.photo || undefined,
      });

      if (verifyRes.success) {
        toast.success('Congratulations! Your Lifetime Membership is active.');
        await checkUserMembership({ name: data.fullName, email: data.email, phone: data.phone });
      } else {
        toast.error(verifyRes.message || 'Membership payment verification failed');
      }
    } catch (err) {
      toast.error('Error verifying membership payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white text-gray-800 font-sans">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#0A6C87] to-cyan-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <span className="bg-white/10 text-yellow-300 text-xs px-3 py-1 rounded-full font-semibold border border-white/20 uppercase tracking-wider">
            Lifetime Membership • ₹1,001
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold">Become a Lifetime Member</h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto text-cyan-100 leading-relaxed">
            Get your official digital membership card, event access, and join our active network of empowered women.
          </p>
        </div>
      </section>

      {/* Main Container */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* If user ALREADY HAS membership */}
        {showMembershipCard && membershipData ? (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-gradient-to-br from-[#0A6C87] to-cyan-800 rounded-3xl shadow-2xl p-8 text-white space-y-6">
              <div className="flex items-center justify-between border-b border-white/20 pb-4">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="RKS Logo" className="w-14 h-14 bg-white rounded-full p-1.5" />
                  <div>
                    <h3 className="font-bold text-lg">Raju Kshatriya Mahila Sangha</h3>
                    <p className="text-xs text-cyan-100">Official Lifetime Member Card</p>
                  </div>
                </div>
                <span className="bg-[#E5C100] text-[#0A6C87] text-xs font-extrabold px-3 py-1 rounded-full">
                  ACTIVE MEMBER
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-cyan-200 uppercase font-semibold">Member Name</p>
                  <p className="text-xl font-bold text-white mt-1">{membershipData.fullName}</p>
                </div>

                <div>
                  <p className="text-xs text-cyan-200 uppercase font-semibold">Membership ID</p>
                  <p className="text-xl font-bold text-[#E5C100] font-mono mt-1">{membershipData.memberId}</p>
                </div>

                <div>
                  <p className="text-xs text-cyan-200 uppercase font-semibold">Email & Phone</p>
                  <p className="text-sm font-medium text-white mt-1">{membershipData.email}</p>
                  <p className="text-xs text-cyan-100">{membershipData.phone}</p>
                </div>

                <div>
                  <p className="text-xs text-cyan-200 uppercase font-semibold">Registration Date & City</p>
                  <p className="text-sm font-medium text-white mt-1">{membershipData.registrationDate}</p>
                  <p className="text-xs text-cyan-100">{membershipData.city || 'Karnataka'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-cyan-100 pt-2">
                <span className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-green-300" /> Verified Lifetime Membership
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* New Registration Form & Benefits */
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            
            {/* Benefits Left */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#0A6C87] uppercase tracking-wider bg-cyan-50 px-3 py-1 rounded-full">
                  Member Privileges
                </span>
                <h2 className="text-2xl font-bold text-gray-900">Why Join RKS Mahila Sangha?</h2>
              </div>

              <div className="space-y-4">
                {[
                  { icon: IdCard, title: 'Official Digital Membership Card', desc: 'Receive your unique Membership ID card recognized across sangha chapters.' },
                  { icon: Sparkles, title: 'Priority Access to Events', desc: 'VIP invitations to cultural gatherings, annual meets, and workshops.' },
                  { icon: BookOpen, title: 'Educational Assistance', desc: 'Eligibility for scholarships and academic support for children.' },
                  { icon: HeartHandshake, title: 'Community Network', desc: 'Connect with hundreds of women leaders across Karnataka.' },
                ].map((b, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-100 text-[#0A6C87] flex items-center justify-center flex-shrink-0">
                      <b.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{b.title}</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Registration Form Right */}
            <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-6">
              <h3 className="text-xl font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#0A6C87]" />
                Membership Buying Form (₹1,001)
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter full name"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Guardian / Husband Name</label>
                    <input
                      type="text"
                      name="guardianName"
                      value={formData.guardianName}
                      onChange={handleInputChange}
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
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter email"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter phone number"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Gotra Name</label>
                    <input
                      type="text"
                      name="gotraName"
                      value={formData.gotraName}
                      onChange={handleInputChange}
                      placeholder="e.g. Kashyapa"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Blood Group</label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleInputChange}
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
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter street address"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Bengaluru, Hosur"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Member Photo (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-xs text-gray-500 border rounded-lg p-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#E5C100] text-[#0A6C87] py-3.5 rounded-xl font-bold text-sm hover:bg-[#CCA900] transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  <CreditCard className="w-4 h-4" />
                  {isLoading ? 'Processing Order...' : 'Proceed to Buy Membership (₹1,001) via Razorpay'}
                </button>
              </form>
            </div>

          </div>
        )}

      </section>

      <UserAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          setAuthModalOpen(false);
          const updated = {
            ...formData,
            fullName: u.name || formData.fullName,
            email: u.email || formData.email,
            phone: u.phone || formData.phone,
          };
          setFormData(updated);
          // Automatically launch Razorpay order creation after login/OTP
          if (updated.fullName && updated.email && updated.phone && updated.address && updated.city) {
            startMembershipPaymentProcess(updated);
          } else {
            toast.info('Please complete your address details and click Proceed to Buy');
          }
        }}
        title="Sign In to Complete Membership Buying"
      />
    </div>
  );
}