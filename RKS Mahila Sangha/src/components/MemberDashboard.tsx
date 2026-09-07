import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, LogOut, CreditCard, IdCard, Calendar, Heart, ShieldCheck, 
  Download, PlusCircle, X, Sparkles, BookOpen, HeartHandshake, 
  CheckCircle2, Lock, Mail, Phone, Settings, LayoutDashboard, UserCheck, ShieldAlert,
  Trash2, Save, Edit3, AlertTriangle, Ticket, RotateCcw, ChevronLeft, ChevronRight,
  XCircle, ClipboardCopy, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { membershipApi, donationApi, eventsApi, settingsApi, paymentApi, API_BASE_URL, resolveBackendAssetUrl } from '../services/api';
import logo from '../assets/RKMS Logo.png';
import { EventRegistrationModal } from './EventRegistrationModal';
import { useLanguage } from '../context/LanguageContext';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { PaymentResultModal, type PaymentSuccessInfo, type PaymentFailureInfo } from './PaymentResultModal';

function DashboardEventGallery({ images, title }: { images: string[]; title: string }) {
  const [current, setCurrent] = useState(0);
  if (!images.length) return null;

  return (
    <div className="relative">
      <div className="relative h-44 bg-gray-100 overflow-hidden rounded-t-2xl">
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
    </div>
  );
}

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
  const [imgLoadError, setImgLoadError] = useState(false);
  const [cardImgError, setCardImgError] = useState(false);

  useEffect(() => {
    if (membership && membership.memberId) {
      const verifyUrl = `${window.location.origin}/verify-member?id=${encodeURIComponent(membership.memberId)}`;
      QRCode.toDataURL(verifyUrl, { width: 140, margin: 1 })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => {});
    }
  }, [membership]);

  // Reset image error flags whenever the photo URL changes so newly uploaded photos always attempt to display
  const prevPhotoUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const currentUrl = membership?.photoUrl || membership?.photo_url || null;
    if (currentUrl !== prevPhotoUrlRef.current) {
      prevPhotoUrlRef.current = currentUrl;
      setImgLoadError(false);
      setCardImgError(false);
    }
  }, [membership?.photoUrl, membership?.photo_url]);
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
    firstName: '',
    lastName: '',
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
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingMembership, setIsDeletingMembership] = useState(false);

  const initializedMemberIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (membership) {
      const currentMemberKey = `${membership.memberId || membership.membership_id || membership.id || ''}_${membership.fullName || membership.name || ''}`;
      if (initializedMemberIdRef.current !== currentMemberKey) {
        initializedMemberIdRef.current = currentMemberKey;
        const full = membership.fullName || membership.name || user.name || '';
        let fName = membership.firstName || '';
        let lName = membership.lastName || '';
        if (!fName && !lName && full) {
          const parts = full.split(' ');
          fName = parts[0] || '';
          lName = parts.slice(1).join(' ');
        }
        setProfileForm({
          firstName: fName,
          lastName: lName,
          fullName: full,
          phone: membership.phone || user.phone || '',
          guardianName: membership.guardianName || membership.guardian_name || '',
          gotraName: membership.gotraName || membership.gotra_name || '',
          profession: membership.profession || '',
          address: membership.address || '',
          city: membership.city || '',
          state: membership.state || 'Karnataka',
          pincode: membership.pincode || '',
        });
      }
    }
  }, [membership, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdatingProfile(true);
      const computedFullName = `${profileForm.firstName} ${profileForm.lastName}`.trim() || profileForm.fullName;

      const storedUserData = localStorage.getItem('userData');
      let fallbackEmail = '';
      if (storedUserData) {
        try {
          const parsed = JSON.parse(storedUserData);
          fallbackEmail = parsed.email || '';
        } catch (e) {}
      }
      const effectiveEmail = (user && user.email) ? user.email : (fallbackEmail || localStorage.getItem('userEmail') || '');

      const res = await membershipApi.updateDetails({
        email: effectiveEmail,
        name: computedFullName,
        fullName: computedFullName,
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
        guardianName: profileForm.guardianName,
        gotraName: profileForm.gotraName,
        profession: profileForm.profession,
        address: profileForm.address,
        city: profileForm.city,
        state: profileForm.state,
        pincode: profileForm.pincode,
        photo: profilePhotoFile || undefined,
      });

      if (res.success) {
        toast.success('Membership profile details updated successfully!');
        // Capture the new photoUrl BEFORE calling loadMemberData() so it isn't lost
        const updatedPhoto = res.photoUrl || (res.member && res.member.photoUrl) || null;
        
        const updatedMemberKey = `${membership?.memberId || ''}_${computedFullName}`;
        initializedMemberIdRef.current = updatedMemberKey;

        // Immediately update state with all changes including the new photo
        setMembership((prev: any) => ({
          ...(prev || {}),
          fullName: computedFullName,
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          phone: profileForm.phone,
          guardianName: profileForm.guardianName,
          gotraName: profileForm.gotraName,
          profession: profileForm.profession,
          address: profileForm.address,
          city: profileForm.city,
          state: profileForm.state,
          pincode: profileForm.pincode,
          // Only update photoUrl if backend returned a new one; otherwise keep existing
          ...(updatedPhoto ? { photoUrl: updatedPhoto, photo_url: updatedPhoto } : {}),
        }));

        // Reset image error flags so the new photo displays immediately
        if (updatedPhoto) {
          setImgLoadError(false);
          setCardImgError(false);
        }

        const updatedUserData = { ...user, name: computedFullName, phone: profileForm.phone };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        window.dispatchEvent(new Event('user_auth_change'));
        setProfilePhotoFile(null);
        setProfilePhotoPreview(null);

        // Refresh from DB but preserve the new photoUrl if DB hasn't propagated yet
        await loadMemberData();
        // Re-apply the new photo after DB refresh in case it returned stale data
        if (updatedPhoto) {
          setMembership((prev: any) => ({
            ...(prev || {}),
            ...((!prev?.photoUrl || prev.photoUrl !== updatedPhoto) ? { photoUrl: updatedPhoto, photo_url: updatedPhoto } : {}),
          }));
        }
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

  const [donationsHistory, setDonationsHistory] = useState<any[]>([]);
  const [eventRegistrationsHistory, setEventRegistrationsHistory] = useState<any[]>([]);
  const [selectedRegistrationModal, setSelectedRegistrationModal] = useState<any>(null);

  const handleCancelRegistration = async (registrationDbId: number) => {
    if (window.confirm('Are you sure you want to cancel this event registration?')) {
      try {
        const res = await eventsApi.cancelRegistration(registrationDbId);
        if (res.success) {
          toast.success('Registration cancelled successfully');
          setShowEventRegModal(false);
          setSelectedRegistrationModal(null);
          setEventRegistrationsHistory((prev) =>
            prev.map((r) => (r.id === registrationDbId ? { ...r, paymentStatus: 'cancelled_by_member' } : r))
          );
          await loadMemberData();
          await loadEvents();
        } else {
          toast.error(res.message || 'Failed to cancel registration');
        }
      } catch (err) {
        toast.error('Error cancelling registration');
      }
    }
  };

  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(text);
    toast.success(`Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadMemberData = async () => {
    const token = localStorage.getItem('userToken');
    const storedUserData = localStorage.getItem('userData');
    let fallbackEmail = '';
    if (storedUserData) {
      try {
        const parsed = JSON.parse(storedUserData);
        fallbackEmail = parsed.email || '';
      } catch (e) {}
    }
    const userEmail = (user && user.email) ? user.email : (fallbackEmail || localStorage.getItem('userEmail') || '');

    let combinedPayments: any[] = [];

    if (token || userEmail) {
      try {
        const historyRes = await userApi.getHistory(token, userEmail);
        if (historyRes && historyRes.success) {
          if (historyRes.membership) setMembership(historyRes.membership);
          if (historyRes.donations && Array.isArray(historyRes.donations)) {
            setDonationsHistory(historyRes.donations);
            combinedPayments = [...historyRes.donations];
          }
          if (historyRes.eventRegistrations) {
            setEventRegistrationsHistory(historyRes.eventRegistrations);
          }
        }
      } catch (err) {
        console.warn('History load error:', err);
      }
    }

    if (userEmail) {
      try {
        const res = await membershipApi.getStatus(userEmail);
        if (res) {
          if (res.exists && res.member) {
            setMembership((prev: any) => ({ ...(prev || {}), ...res.member }));
          }
          if (res.payments && Array.isArray(res.payments)) {
            const existingKeys = new Set(combinedPayments.map(p => String(p.orderId || p.paymentId || p.id)));
            res.payments.forEach((p: any) => {
              const key = String(p.orderId || p.paymentId || p.id);
              if (!existingKeys.has(key)) {
                combinedPayments.push(p);
              } else {
                const idx = combinedPayments.findIndex(x => String(x.orderId || x.paymentId || x.id) === key);
                if (idx !== -1) {
                  combinedPayments[idx] = { ...combinedPayments[idx], ...p };
                }
              }
            });
          }
        }
      } catch (err) {
        console.warn('Member data load warning:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }

    setPayments(combinedPayments);
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
    
    // Connect to Backend Real-Time Event Stream (SSE)
    let sse: EventSource | null = null;
    try {
      sse = new EventSource(`${API_BASE_URL}/realtime/stream`);
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (['payment_completed', 'payment_cancelled', 'payment_updated', 'events_updated'].includes(data.type)) {
            loadMemberData();
            loadEvents();
          }
        } catch (e) {}
      };
    } catch (err) {
      console.warn('SSE stream notice:', err);
    }

    const interval = setInterval(loadEvents, 10000);
    return () => {
      if (sse) sse.close();
      clearInterval(interval);
    };
  }, [user.email]);

  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessInfo | null>(null);
  const [paymentFailure, setPaymentFailure] = useState<PaymentFailureInfo | null>(null);

  useEffect(() => {
    const checkRazorpayRedirect = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const razorpay_payment_id = searchParams.get('razorpay_payment_id');
      const razorpay_order_id = searchParams.get('razorpay_order_id');
      const razorpay_signature = searchParams.get('razorpay_signature');

      const errorCode = searchParams.get('error[code]') || searchParams.get('error_code');
      const errorDesc = searchParams.get('error[description]') || searchParams.get('error_description') || searchParams.get('error[reason]');

      if (razorpay_payment_id && razorpay_order_id) {
        window.history.replaceState({}, document.title, window.location.pathname);
        const pendingMem = sessionStorage.getItem('pending_membership_data');
        const pendingDon = sessionStorage.getItem('pending_donation_data');

        if (pendingMem) {
          let memData = membershipForm;
          try { memData = { ...membershipForm, ...JSON.parse(pendingMem) }; } catch (e) {}
          sessionStorage.removeItem('pending_membership_data');
          sessionStorage.removeItem('pending_membership_order_id');

          const verifyRes = await membershipApi.verifyPayment({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature: razorpay_signature || '',
            name: memData.fullName,
            email: memData.email,
            phone: memData.phone,
            address: memData.address,
            city: memData.city,
          });

          if (verifyRes.success) {
            toast.success('Congratulations! Your Lifetime Membership is active.');
            await loadMemberData();
            setActiveTab('membership');
            setPaymentSuccess({
              type: 'membership',
              paymentId: razorpay_payment_id,
              orderId: razorpay_order_id,
              amount: 1001,
              memberId: verifyRes.membership_id || verifyRes.member?.memberId,
              memberName: memData.fullName,
              email: memData.email,
              phone: memData.phone,
              city: memData.city,
              date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
              photoUrl: verifyRes.photoUrl || verifyRes.member?.photoUrl,
            });
          } else {
            setPaymentFailure({
              type: 'membership',
              reason: verifyRes.message || 'Membership payment verification failed.',
              amount: 1001,
              orderId: razorpay_order_id,
            });
          }
        } else if (pendingDon) {
          let donData = { amount: 1000, name: user.name, email: user.email, phone: user.phone, purpose: donationPurpose };
          try { donData = { ...donData, ...JSON.parse(pendingDon) }; } catch (e) {}
          sessionStorage.removeItem('pending_donation_data');
          sessionStorage.removeItem('pending_donation_order_id');

          const verifyRes = await donationApi.verifyPayment({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature: razorpay_signature || '',
            amount: donData.amount,
            name: donData.name,
            email: donData.email,
            phone: donData.phone || user.phone || '9999999999',
            purpose: donData.purpose || donationPurpose,
            address: 'Bengaluru, Karnataka',
          });

          if (verifyRes.success) {
            toast.success('Thank you for your generous donation!');
            await loadMemberData();
            setPaymentSuccess({
              type: 'donation',
              paymentId: razorpay_payment_id,
              orderId: razorpay_order_id,
              amount: donData.amount,
              date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
              donorName: donData.name,
              donorEmail: donData.email,
              donorPhone: donData.phone,
              purpose: donData.purpose,
              receiptDownloadUrl: verifyRes.receipt?.downloadUrl,
            });
          } else {
            setPaymentFailure({
              type: 'donation',
              reason: verifyRes.message || 'Donation verification failed.',
              amount: donData.amount,
              orderId: razorpay_order_id,
            });
          }
        } else {
          setPaymentSuccess({
            type: 'membership',
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            amount: 1001,
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            memberName: user.name,
            email: user.email,
          });
        }
      } else if (errorCode || errorDesc) {
        window.history.replaceState({}, document.title, window.location.pathname);
        const savedMemOrderId = sessionStorage.getItem('pending_membership_order_id');
        const savedDonOrderId = sessionStorage.getItem('pending_donation_order_id');
        sessionStorage.removeItem('pending_membership_data');
        sessionStorage.removeItem('pending_membership_order_id');
        sessionStorage.removeItem('pending_donation_data');
        sessionStorage.removeItem('pending_donation_order_id');

        setPaymentFailure({
          type: savedDonOrderId ? 'donation' : 'membership',
          reason: decodeURIComponent(errorDesc || 'Payment was declined or failed.'),
          code: errorCode || undefined,
          orderId: savedDonOrderId || savedMemOrderId || undefined,
        });
      }
    };

    checkRazorpayRedirect();
  }, []);

  // Print/Download – single A4 page: header → card → terms → footer
  const printMemberIdCard = (member: {
    fullName: string;
    memberId: string;
    phone?: string;
    city?: string;
    registrationDate?: string;
    photoUrl?: string;
  }, qrDataUrl?: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to download your membership ID card');
      return;
    }

    const memberName = member.fullName;
    const memberId = member.memberId;
    const memberPhone = member.phone || '-';
    const memberCity = member.city || 'Bengaluru';
    const regDate = member.registrationDate || 'Active';
    const memberPhotoUrl = member.photoUrl;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>RKS Mahila Sangha – Official Member ID Card</title>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4 portrait; margin: 18mm 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #fff;
            color: #1e293b;
            font-size: 11px;
          }

          /* ── PAGE WRAPPER ── */
          .page {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 18px;
          }

          /* ── ORG HEADER ── */
          .org-header {
            display: flex;
            align-items: center;
            gap: 14px;
            border-bottom: 3px solid #0A6C87;
            padding-bottom: 12px;
          }
          .org-logo { width: 64px; height: 64px; border-radius: 50%; border: 2px solid #E5C100; }
          .org-name-block .org-en { font-size: 19px; font-weight: 900; color: #0A6C87; text-transform: uppercase; letter-spacing: 0.5px; }
          .org-name-block .org-kn { font-size: 13px; color: #0891b2; font-weight: 600; margin-top: 1px; }
          .org-name-block .org-tag { font-size: 10px; color: #64748b; margin-top: 2px; }
          .org-badge {
            margin-left: auto;
            background: #E5C100;
            color: #0A6C87;
            font-size: 9px;
            font-weight: 900;
            padding: 4px 10px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
          }

          /* ── CARD ── */
          .card-wrap { display: flex; justify-content: center; }
          .id-card {
            width: 500px;
            background: linear-gradient(135deg, #0A6C87 0%, #064E62 60%, #043A4B 100%);
            border-radius: 16px;
            border: 3px solid #E5C100;
            color: white;
            padding: 16px 20px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(10,108,135,0.25);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .id-card::before {
            content: '';
            position: absolute;
            top: -50px; right: -50px;
            width: 160px; height: 160px;
            background: rgba(229,193,0,0.10);
            border-radius: 50%;
          }
          .id-card::after {
            content: '';
            position: absolute;
            bottom: -40px; left: -40px;
            width: 120px; height: 120px;
            background: rgba(255,255,255,0.05);
            border-radius: 50%;
          }
          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px dashed rgba(255,255,255,0.25);
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .card-header-left { display: flex; align-items: center; gap: 8px; }
          .card-logo { width: 34px; height: 34px; background: white; border-radius: 50%; padding: 2px; }
          .card-title { font-size: 12px; font-weight: 800; text-transform: uppercase; line-height: 1.2; }
          .card-subtitle { font-size: 8px; color: #7dd3fc; font-weight: 600; }
          .lifetime-badge {
            background: #E5C100;
            color: #0A6C87;
            font-size: 7.5px;
            font-weight: 900;
            padding: 3px 8px;
            border-radius: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .card-body { display: flex; gap: 14px; align-items: center; }
          .photo-slot {
            width: 82px;
            height: 98px;
            border-radius: 8px;
            border: 2px solid #E5C100;
            overflow: hidden;
            background: #0f172a;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .photo-slot img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
          .photo-placeholder { font-size: 8px; color: #bae6fd; text-align: center; font-weight: bold; line-height: 1.5; }
          .card-details { flex: 1; min-width: 0; padding: 0 2px; }
          .card-member-name { font-size: 15px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
          .card-row { display: flex; align-items: baseline; gap: 5px; margin-bottom: 4px; font-size: 9.5px; color: #e0f2fe; }
          .card-lbl { color: #93c5fd; font-weight: 700; font-size: 8px; text-transform: uppercase; white-space: nowrap; }
          .card-id { font-family: monospace; font-weight: 900; color: #E5C100; font-size: 11.5px; }
          .card-qr { background: white; padding: 5px; border-radius: 8px; flex-shrink: 0; border: 1.5px solid #E5C100; text-align: center; }
          .card-qr img { width: 56px; height: 56px; display: block; margin: 0 auto; }
          .card-qr-label { font-size: 7px; color: #0A6C87; font-weight: 900; text-align: center; text-transform: uppercase; margin-top: 3px; letter-spacing: 0.5px; }
          .card-footer {
            border-top: 1px dashed rgba(255,255,255,0.2);
            margin-top: 12px;
            padding-top: 7px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8px;
            color: #bae6fd;
          }

          /* ── TERMS ── */
          .terms-box {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px 16px;
            background: #f8fafc;
          }
          .terms-title {
            font-size: 12px;
            font-weight: 800;
            color: #0A6C87;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
          }
          .terms-list {
            list-style: none;
            padding: 0;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 18px;
          }
          .terms-list li {
            font-size: 9.5px;
            color: #475569;
            padding-left: 14px;
            position: relative;
            line-height: 1.5;
          }
          .terms-list li::before {
            content: '✦';
            position: absolute;
            left: 0;
            color: #0A6C87;
            font-size: 7px;
            top: 2px;
          }

          /* ── PAGE FOOTER ── */
          .page-footer {
            border-top: 2px solid #0A6C87;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 9px;
            color: #475569;
          }
          .page-footer .addr { line-height: 1.6; }
          .page-footer .sig { text-align: right; }
          .page-footer .sig-line { width: 110px; border-top: 1px solid #94a3b8; margin-bottom: 3px; margin-left: auto; }
        </style>
      </head>
      <body>
        <div class="page">

          <!-- ORG HEADER -->
          <div class="org-header">
            <img src="${logo}" class="org-logo" />
            <div class="org-name-block">
              <div class="org-en">Raju Kshatriya Mahila Sangha</div>
              <div class="org-kn">ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘ</div>
              <div class="org-tag">Official Member Identity Document</div>
            </div>
            <div class="org-badge">✓ Verified Lifetime Member</div>
          </div>

          <!-- MEMBER ID CARD -->
          <div class="card-wrap">
            <div class="id-card">
              <div class="card-header">
                <div class="card-header-left">
                  <img src="${logo}" class="card-logo" />
                  <div>
                    <div class="card-title">Raju Kshatriya Mahila Sangha</div>
                    <div class="card-subtitle">ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘ &nbsp;•&nbsp; Official ID Card</div>
                  </div>
                </div>
                <span class="lifetime-badge">LIFETIME MEMBER</span>
              </div>

              <div class="card-body">
                <div class="photo-slot">
                  ${memberPhotoUrl
                    ? `<img src="${resolveBackendAssetUrl(memberPhotoUrl)}" />`
                    : `<div class="photo-placeholder">MEMBER<br/>PHOTO</div>`
                  }
                </div>
                <div class="card-details">
                  <div class="card-member-name">${memberName}</div>
                  <div class="card-row"><span class="card-lbl">MEMBER ID:</span><span class="card-id">${memberId}</span></div>
                  <div class="card-row"><span class="card-lbl">PHONE:</span><span>${memberPhone}</span></div>
                  <div class="card-row"><span class="card-lbl">CITY:</span><span>${memberCity}</span></div>
                  <div class="card-row"><span class="card-lbl">JOINED:</span><span>${regDate}</span></div>
                  <div class="card-row"><span class="card-lbl">STATUS:</span><span style="color:#4ade80;font-weight:800;">ACTIVE &amp; VERIFIED</span></div>
                </div>
                ${qrDataUrl ? `
                  <div class="card-qr">
                    <img src="${qrDataUrl}" />
                    <div class="card-qr-label">Scan Verify</div>
                  </div>
                ` : ''}
              </div>

              <div class="card-footer">
                <span>RKS Mahila Sangha &nbsp;•&nbsp; RR Nagar, Bengaluru &nbsp;|&nbsp; +91 9972648909</span>
                <span>Authorized Signatory – RKS Sangha</span>
              </div>
            </div>
          </div>

          <!-- TERMS & CONDITIONS -->
          <div class="terms-box">
            <div class="terms-title">📋 Terms &amp; Conditions of Membership</div>
            <ul class="terms-list">
              <li>This card is the official identity document issued by Raju Kshatriya Mahila Sangha.</li>
              <li>Membership is strictly non-transferable and valid only for the named holder.</li>
              <li>The card must be presented for event entry, benefits, and member verification.</li>
              <li>If lost or damaged, the member must report immediately for re-issuance.</li>
              <li>Misuse of the membership card will result in immediate cancellation of membership.</li>
              <li>The sangha reserves the right to update membership policies with prior notice.</li>
              <li>Members are expected to uphold the values and code of conduct of the sangha.</li>
              <li>Benefits are applicable as per the current membership scheme and may be revised.</li>
              <li>Member data is stored securely and will not be shared with third parties.</li>
              <li>Any dispute will be subject to the jurisdiction of Bengaluru courts only.</li>
            </ul>
          </div>

          <!-- PAGE FOOTER -->
          <div class="page-footer">
            <div class="addr">
              <strong>Raju Kshatriya Mahila Sangha</strong><br/>
              No. 797, "Lakshmi Nilayam", 1st Floor, Banashankari 6th Stage, 1st Block,<br/>
              Parallel to BDA Link Road, Rajarajeshwari Nagar Post, Bengaluru – 560 098<br/>
              📞 +91 9972648909 &nbsp;|&nbsp; ✉ rajukshatriyamahilasangha2024@gmail.com
            </div>
            <div class="sig">
              <div class="sig-line"></div>
              <div><strong>Authorized Signatory</strong></div>
              <div>Raju Kshatriya Mahila Sangha</div>
              <div style="color:#94a3b8;margin-top:4px;">Date: ${new Date().toLocaleDateString('en-IN')}</div>
            </div>
          </div>

        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Trigger Download Member Card
  const handleDownloadCard = () => {
    if (!membership) return;
    printMemberIdCard({
      fullName: membership.fullName || user.name,
      memberId: membership.memberId || membership.membership_id,
      phone: membership.phone || user.phone,
      city: membership.city,
      registrationDate: membership.registrationDate || membership.created_at || 'Active',
      photoUrl: membership.photoUrl || membership.photo_url,
    }, qrCodeDataUrl);
  };

  // Trigger Download Certificate (Full Page Format)
  const handleDownloadCertificate = () => {
    if (!membership) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to download your certificate');
      return;
    }

    const memberName = membership.fullName || user.name;
    const memberId = membership.memberId || membership.membership_id;
    const regDate = membership.registrationDate || membership.created_at || 'Active';
    const payId = membership.paymentId || 'PAY_LIFETIME_ACTIVE';
    const memberPhotoUrl = membership.photoUrl || membership.photo_url;
    const memberPhotoHtml = memberPhotoUrl
      ? `<div style="margin:15px 0;"><img src="${resolveBackendAssetUrl(memberPhotoUrl)}" style="width:110px; height:130px; object-fit:cover; border-radius:10px; border:3px solid #0A6C87; box-shadow:0 4px 10px rgba(0,0,0,0.15);" /></div>`
      : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>RKS Sangha - Lifetime Membership Certificate</title>
        <style>
          body { font-family: 'Georgia', serif; background: #f8fafc; margin: 0; padding: 30px; display: flex; justify-content: center; }
          .cert-container { width: 750px; background: white; border: 12px double #0A6C87; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; color: #1e293b; }
          .cert-header { margin-bottom: 20px; }
          .logo { width: 80px; height: 80px; margin-bottom: 10px; }
          .org-name { font-size: 24px; font-weight: bold; color: #0A6C87; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
          .org-sub { font-size: 15px; color: #0891b2; margin-top: 4px; font-weight: 600; }
          .address-box { font-size: 11px; color: #64748b; margin-top: 8px; line-height: 1.5; font-family: sans-serif; }
          .cert-title { font-size: 22px; font-weight: bold; color: #d97706; margin: 25px 0 15px 0; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #fef3c7; display: inline-block; padding-bottom: 5px; }
          .cert-body { font-size: 15px; line-height: 1.8; margin: 15px 0; }
          .member-name { font-size: 28px; font-weight: bold; color: #0A6C87; font-family: 'Times New Roman', serif; text-decoration: underline; margin: 8px 0; }
          .grid-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f0fdfa; border: 1px solid #ccfbf1; padding: 15px; border-radius: 8px; margin: 25px 0; text-align: left; font-family: sans-serif; font-size: 13px; }
          .grid-item label { color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: bold; display: block; }
          .grid-item span { font-weight: bold; color: #0f172a; }
          .thank-you { font-style: italic; font-size: 13px; color: #475569; margin: 20px 0; line-height: 1.6; }
          .cert-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; font-family: sans-serif; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="cert-container">
          <div class="cert-header">
            <img src="${logo}" class="logo" />
            <h1 class="org-name">Raju Kshatriya Mahila Sangha</h1>
            <div class="org-sub">ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘ</div>
            <div class="address-box">
              No. 797, "Lakshmi Nilayam", 1st Floor, Banashankari 6th Stage, 1st Block, Parallel to BDA Link Road,<br/>
              Rajarajeshwari Nagar Post, Bengaluru-560 098. | Contact: +91 9972648909 | rajukshatriyamahilasangha2024@gmail.com
            </div>
          </div>
          <div class="cert-title">Certificate of Lifetime Membership</div>
          ${memberPhotoHtml}
          <div class="cert-body">
            This is to proudly certify that
            <div class="member-name">${memberName}</div>
            has been admitted as a distinguished <strong>Lifetime Member</strong> of Raju Kshatriya Mahila Sangha.
          </div>
          <div class="grid-details">
            <div class="grid-item"><label>Membership ID</label><span style="color:#0A6C87; font-family:monospace; font-size:15px;">${memberId}</span></div>
            <div class="grid-item"><label>Membership Status</label><span style="color:#16a34a;">ACTIVE / VERIFIED</span></div>
            <div class="grid-item"><label>Payment ID</label><span>${payId}</span></div>
            <div class="grid-item"><label>Purchase / Reg Date</label><span>${regDate}</span></div>
            <div class="grid-item"><label>Membership Type</label><span>Lifetime Membership</span></div>
            <div class="grid-item"><label>Amount Paid</label><span>₹1,001.00</span></div>
          </div>
          <div class="thank-you">
            "Thank you for becoming a lifetime member of Raju Kshatriya Mahila Sangha. Your valuable membership supports our initiatives in women empowerment, education, healthcare checkups, and community welfare across Karnataka."
          </div>
          <div class="cert-footer">
            <div>Date: ${new Date().toLocaleDateString('en-IN')}</div>
            <div><strong>Authorized Signatory</strong><br/>RKS Mahila Sangha</div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
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
        try {
          sessionStorage.setItem('pending_membership_data', JSON.stringify(membershipForm));
          sessionStorage.setItem('pending_membership_order_id', orderRes.order.id);
        } catch (err) {}

        const options = {
          key: orderRes.razorpayKeyId,
          amount: orderRes.order.amount,
          currency: 'INR',
          name: 'RKS Mahila Sangha',
          description: 'Lifetime Membership Buying (₹1,001)',
          order_id: orderRes.order.id,
          callback_url: window.location.href,
          handler: async function (rzpRes: any) {
            sessionStorage.removeItem('pending_membership_data');
            sessionStorage.removeItem('pending_membership_order_id');

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

              const createdMember = verifyRes.member || {
                memberId: verifyRes.membership_id,
                fullName: membershipForm.fullName,
                email: membershipForm.email,
                phone: membershipForm.phone,
                city: membershipForm.city,
                photoUrl: verifyRes.photoUrl,
                registrationDate: new Date().toISOString().split('T')[0]
              };

              setPaymentSuccess({
                type: 'membership',
                paymentId: verifyRes.payment_id || rzpRes.razorpay_payment_id || `PAY_${Date.now()}`,
                orderId: verifyRes.order_id || rzpRes.razorpay_order_id || `ORDER_${Date.now()}`,
                amount: verifyRes.amount || 1001,
                memberId: verifyRes.membership_id || createdMember.memberId,
                memberName: membershipForm.fullName,
                email: membershipForm.email,
                phone: membershipForm.phone,
                city: membershipForm.city || 'Bengaluru',
                date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                photoUrl: createdMember.photoUrl || (membershipForm.photo ? URL.createObjectURL(membershipForm.photo) : undefined)
              });
            } else {
              setPaymentFailure({
                type: 'membership',
                reason: verifyRes.message || 'Payment verification failed',
                amount: 1001,
                orderId: rzpRes.razorpay_order_id,
              });
            }
          },
          modal: {
            ondismiss: function () {
              paymentApi.cancelOrder(orderRes.order.id, 'User closed membership window');
              sessionStorage.removeItem('pending_membership_data');
              sessionStorage.removeItem('pending_membership_order_id');
              toast.info('Membership payment was cancelled.');
            },
          },
          prefill: {
            name: membershipForm.fullName,
            email: membershipForm.email,
            contact: membershipForm.phone,
          },
          theme: { color: '#0A6C87' },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          sessionStorage.removeItem('pending_membership_data');
          sessionStorage.removeItem('pending_membership_order_id');
          setPaymentFailure({
            type: 'membership',
            reason: resp?.error?.description || resp?.error?.reason || 'Payment was declined by your bank or payment provider.',
            code: resp?.error?.code,
            amount: 1001,
            orderId: resp?.error?.metadata?.order_id || orderRes.order.id,
          });
        });
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
        try {
          sessionStorage.setItem('pending_donation_data', JSON.stringify({ amount, name: user.name, email: user.email, phone: user.phone, purpose: donationPurpose }));
          sessionStorage.setItem('pending_donation_order_id', orderRes.order.id);
        } catch (err) {}

        const options = {
          key: orderRes.razorpayKeyId,
          amount: orderRes.order.amount,
          currency: 'INR',
          name: 'RKS Mahila Sangha',
          description: `Donation for ${donationPurpose}`,
          order_id: orderRes.order.id,
          callback_url: window.location.href,
          handler: async function (rzpRes: any) {
            sessionStorage.removeItem('pending_donation_data');
            sessionStorage.removeItem('pending_donation_order_id');

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

              setPaymentSuccess({
                type: 'donation',
                paymentId: rzpRes.razorpay_payment_id || `PAY_${Date.now()}`,
                orderId: rzpRes.razorpay_order_id || `ORDER_${Date.now()}`,
                amount: amount,
                date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                donorName: user.name,
                donorEmail: user.email,
                donorPhone: user.phone,
                purpose: donationPurpose,
                receiptDownloadUrl: verifyRes.receipt?.downloadUrl,
              });
            } else {
              setPaymentFailure({
                type: 'donation',
                reason: verifyRes.message || 'Donation payment verification failed',
                amount: amount,
                orderId: rzpRes.razorpay_order_id,
              });
            }
          },
          modal: {
            ondismiss: function () {
              paymentApi.cancelOrder(orderRes.order.id, 'User closed donation window');
              sessionStorage.removeItem('pending_donation_data');
              sessionStorage.removeItem('pending_donation_order_id');
              toast.info('Donation payment was cancelled.');
            },
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone || '',
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
            amount: amount,
            orderId: resp?.error?.metadata?.order_id || orderRes.order.id,
          });
        });
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
    const todayStr = new Date().toISOString().slice(0, 10);
    const evtDateStr = e.date ? String(e.date).slice(0, 10) : '';
    const isPast = e.category === 'past' || (evtDateStr && evtDateStr < todayStr);

    if (eventFilter === 'upcoming') return !isPast;
    if (eventFilter === 'past') return isPast;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-16">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#0A6C87] to-cyan-700 text-white py-6 sm:py-8 border-b border-cyan-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 max-w-full">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-xl sm:text-2xl font-bold border border-white/30 shadow-inner flex-shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Member Portal</h1>
                <span className="bg-[#E5C100] text-[#0A6C87] text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0">
                  {membership ? 'ACTIVE MEMBER' : 'REGISTERED USER'}
                </span>
              </div>
              <p className="text-cyan-100 text-xs sm:text-sm mt-0.5 truncate max-w-[200px] xs:max-w-xs sm:max-w-none">{user.name} • {user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onLogout}
              className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border border-white/20"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto scrollbar-hide gap-2 py-2 w-full max-w-full">
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
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Quick Action Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <button
                onClick={() => handleTabChange('membership')}
                className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-4"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-[#0A6C87] flex-shrink-0">
                  <IdCard className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm leading-snug">{membership ? 'Member Card' : 'Buy Membership'}</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{membership ? 'View & Download ID' : '₹1,001 Lifetime'}</p>
                </div>
              </button>

              <button
                onClick={() => handleTabChange('donations')}
                className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-4"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 flex items-center justify-center text-[#E5C100] flex-shrink-0">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm leading-snug">Make Donation</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Support Causes</p>
                </div>
              </button>

              <button
                onClick={() => handleTabChange('events')}
                className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-4"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm leading-snug">RKS Events</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Browse & Register</p>
                </div>
              </button>

              <button
                onClick={() => handleTabChange('settings')}
                className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-4"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                  <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm leading-snug">Account Status</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Email Verified</p>
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

                      <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 space-y-3 mb-6">
                        <div className="flex items-center gap-3">
                          {(membership.photoUrl || membership.photo_url) && !cardImgError ? (
                            <img
                              src={resolveBackendAssetUrl(membership.photoUrl || membership.photo_url)}
                              alt={membership.fullName}
                              className="w-14 h-16 object-cover rounded-xl border-2 border-white/40 shadow-md flex-shrink-0"
                              onError={() => setCardImgError(true)}
                            />
                          ) : (
                            <div className="w-14 h-16 bg-white/20 rounded-xl border-2 border-white/40 flex flex-col items-center justify-center text-cyan-100 flex-shrink-0">
                              <User className="w-7 h-7" />
                              <span className="text-[7px] uppercase mt-0.5 font-bold">Photo</span>
                            </div>
                          )}
                          <div className="space-y-1 flex-1 min-w-0">
                            <div>
                              <p className="text-cyan-100 text-[10px] uppercase font-semibold">Member Name</p>
                              <p className="font-bold text-base truncate">{membership.fullName}</p>
                            </div>
                            <div>
                              <p className="text-cyan-100 text-[10px] uppercase font-semibold">Membership ID</p>
                              <p className="font-bold text-[#E5C100] font-mono text-sm">{membership.memberId}</p>
                            </div>
                          </div>
                        </div>

                        {qrCodeDataUrl && (
                          <div className="bg-white/10 p-2 rounded-xl flex items-center justify-between border border-white/10 mt-2">
                            <span className="text-[10px] text-cyan-100 font-semibold">Verify Member QR</span>
                            <img src={qrCodeDataUrl} alt="Verify QR Code" className="w-10 h-10 rounded-md bg-white p-0.5" />
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
                    <p className="text-xs text-gray-500 mt-0.5">Your donation, membership, and failed payment reference order history</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('donations')}
                    className="text-xs font-bold text-[#0A6C87] hover:underline"
                  >
                    View All &amp; Track Status
                  </button>
                </div>

                {payments.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">No payment transactions recorded yet.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {payments.slice(0, 5).map((p) => {
                      const st = String(p.status || 'completed').toLowerCase();
                      const isCompleted = st === 'completed' || st === 'success';
                      const isFailed = st === 'failed';
                      const isCancelled = st === 'cancelled';
                      const orderRef = p.orderId || p.paymentId || `REF-${p.id}`;

                      return (
                        <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900 capitalize flex items-center gap-1.5">
                                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                {isFailed && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                                {isCancelled && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                {!isCompleted && !isFailed && !isCancelled && <CreditCard className="w-3.5 h-3.5 text-cyan-600" />}
                                {p.purpose || `${p.type || 'Payment'} Transaction`}
                              </p>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                                isCompleted ? 'bg-emerald-100 text-emerald-700' :
                                isCancelled ? 'bg-amber-100 text-amber-700' :
                                isFailed ? 'bg-rose-100 text-rose-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {p.status || 'COMPLETED'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-gray-500 text-[11px]">
                              <span>{p.date}</span>
                              <span>•</span>
                              <span className="font-mono font-semibold text-gray-700">Ref: {orderRef}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(orderRef)}
                                className="text-gray-400 hover:text-[#0A6C87] transition-colors"
                                title="Copy Payment Reference ID"
                              >
                                {copiedId === orderRef ? <span className="text-emerald-600 text-[9px] font-bold">✓ Copied</span> : <ClipboardCopy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 justify-between sm:justify-end">
                            <div className="text-right">
                              <p className={`font-bold ${isFailed || isCancelled ? 'text-rose-600 line-through' : 'text-[#0A6C87]'}`}>
                                ₹{p.amount?.toLocaleString('en-IN')}
                              </p>
                            </div>

                            {(isFailed || isCancelled) && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (p.type === 'membership') {
                                    setActiveTab('membership');
                                  } else {
                                    setActiveTab('donations');
                                    setSelectedDonationAmt(p.amount || 1000);
                                  }
                                  toast.info(`Retrying ${p.type || 'payment'} for ₹${p.amount}...`);
                                }}
                                className="bg-[#0A6C87] hover:bg-cyan-800 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm flex-shrink-0"
                              >
                                <RotateCcw className="w-3 h-3" /> Retry
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
              /* Display Member ID Card – card only, clean view */
              <div className="max-w-lg mx-auto space-y-5">
                {/* Physical-style ID Card */}
                <div className="bg-gradient-to-br from-[#0A6C87] via-[#075e78] to-[#043A4B] rounded-2xl border-4 border-[#E5C100] shadow-2xl p-5 text-white relative overflow-hidden">
                  {/* decorative blobs */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#E5C100]/10 rounded-full pointer-events-none" />
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <img src={logo} alt="RKS Logo" className="w-9 h-9 bg-white rounded-full p-0.5" />
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wide leading-tight">Raju Kshatriya Mahila Sangha</p>
                        <p className="text-[8px] text-sky-200 font-semibold">ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘ • Official ID Card</p>
                      </div>
                    </div>
                    <span className="bg-[#E5C100] text-[#0A6C87] text-[8px] font-extrabold px-2.5 py-1 rounded-full uppercase">LIFETIME MEMBER</span>
                  </div>

                  {/* Card Body */}
                  <div className="flex items-start gap-4 relative z-10">
                    {/* Photo */}
                    {(membership.photoUrl || membership.photo_url) && !cardImgError ? (
                      <img
                        src={resolveBackendAssetUrl(membership.photoUrl || membership.photo_url)}
                        alt={membership.fullName}
                        className="w-20 h-24 object-cover rounded-lg border-2 border-[#E5C100] shadow-md flex-shrink-0"
                        onError={() => setCardImgError(true)}
                      />
                    ) : (
                      <div className="w-20 h-24 bg-white/20 rounded-lg border-2 border-[#E5C100] flex flex-col items-center justify-center text-cyan-100 flex-shrink-0">
                        <User className="w-9 h-9" />
                        <span className="text-[7px] uppercase mt-1 font-bold">Photo</span>
                      </div>
                    )}
                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-base font-extrabold text-white truncate">{membership.fullName}</p>
                      <div className="space-y-1 text-[10px] text-sky-100">
                        <p><span className="text-sky-300 font-bold uppercase text-[8px] mr-1">ID:</span><span className="font-mono font-extrabold text-[#E5C100]">{membership.memberId}</span></p>
                        <p><span className="text-sky-300 font-bold uppercase text-[8px] mr-1">Phone:</span>{membership.phone || '-'}</p>
                        <p><span className="text-sky-300 font-bold uppercase text-[8px] mr-1">City:</span>{membership.city || 'Karnataka'}</p>
                        <p><span className="text-sky-300 font-bold uppercase text-[8px] mr-1">Joined:</span>{membership.registrationDate || membership.created_at || '-'}</p>
                        <p><span className="text-[8px] bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-bold px-2 py-0.5 rounded-full">✓ ACTIVE &amp; VERIFIED</span></p>
                      </div>
                    </div>
                    {/* QR if available */}
                    {qrCodeDataUrl && (
                      <div className="bg-white p-1.5 rounded-lg flex-shrink-0">
                        <img src={qrCodeDataUrl} alt="QR" className="w-12 h-12 block" />
                        <p className="text-[6px] text-[#0A6C87] font-extrabold text-center mt-0.5 uppercase">Scan Verify</p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="border-t border-white/20 mt-3 pt-2.5 flex justify-between items-center text-[8px] text-sky-200 relative z-10">
                    <span>RKS Mahila Sangha • RR Nagar, Bengaluru | +91 9972648909</span>
                    <span className="font-bold">Auth Signatory – RKS Sangha</span>
                  </div>
                </div>

                {/* Print & Download buttons side by side */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadCard}
                    className="flex-1 bg-[#0A6C87] hover:bg-[#075e78] text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Print Card
                  </button>
                  <button
                    onClick={handleDownloadCard}
                    className="flex-1 bg-[#E5C100] hover:bg-[#CCA900] text-[#0A6C87] py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                </div>
                <p className="text-center text-[10px] text-gray-400">Clicking Print or Download opens the official single-page membership document with your ID card, terms &amp; contact details.</p>
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

              {/* Transactions Audit & Failed Reference Tracker */}
              <div className="pt-6 border-t space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#0A6C87]" />
                      Payment Transaction &amp; Audit History
                    </h3>
                    <p className="text-xs text-gray-500">Track completed donations, membership payments, and failed/cancelled order references</p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${historyFilter === 'all' ? 'bg-white text-gray-900 shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      All ({payments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('completed')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${historyFilter === 'completed' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Completed ({payments.filter(p => String(p.status).toLowerCase() === 'completed' || String(p.status).toLowerCase() === 'success').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('failed')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${historyFilter === 'failed' ? 'bg-white text-rose-700 shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Failed / Cancelled ({payments.filter(p => ['failed', 'cancelled'].includes(String(p.status).toLowerCase())).length})
                    </button>
                  </div>
                </div>

                {payments.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl border border-dashed">No payment records found.</div>
                ) : (
                  <div className="space-y-3">
                    {payments
                      .filter((p) => {
                        const st = String(p.status || 'completed').toLowerCase();
                        if (historyFilter === 'completed') return st === 'completed' || st === 'success';
                        if (historyFilter === 'failed') return st === 'failed' || st === 'cancelled';
                        return true;
                      })
                      .map((p) => {
                        const st = String(p.status || 'completed').toLowerCase();
                        const isCompleted = st === 'completed' || st === 'success';
                        const isFailed = st === 'failed';
                        const isCancelled = st === 'cancelled';
                        const orderRef = p.orderId || p.paymentId || `REF-${p.id}`;

                        return (
                          <div
                            key={p.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              isCompleted ? 'bg-white border-gray-200 hover:border-emerald-300 shadow-sm' :
                              isFailed ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300' :
                              isCancelled ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300' :
                              'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-gray-100 pb-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-gray-900 capitalize">
                                    {p.purpose || `${p.type || 'Donation'} Payment`}
                                  </span>
                                  <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                                    isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                    isCancelled ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                    isFailed ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                    'bg-blue-100 text-blue-800 border border-blue-200'
                                  }`}>
                                    {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                                    {isFailed && <XCircle className="w-3 h-3" />}
                                    {isCancelled && <AlertTriangle className="w-3 h-3" />}
                                    {p.status || 'COMPLETED'}
                                  </span>
                                </div>
                                <p className="text-gray-500 text-[11px]">
                                  Transaction Date: <span className="font-semibold text-gray-800">{p.date}</span>
                                </p>
                              </div>

                              <div className="text-left sm:text-right">
                                <span className="text-[10px] text-gray-400 uppercase font-bold block">Amount</span>
                                <span className={`text-lg font-extrabold ${isFailed || isCancelled ? 'text-rose-600 line-through' : 'text-[#0A6C87]'}`}>
                                  ₹{p.amount?.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Reference Numbers & Actions row */}
                            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                <div className="bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200/80 flex items-center justify-between gap-2">
                                  <span className="text-gray-400 font-bold uppercase text-[9px]">Order ID:</span>
                                  <div className="flex items-center gap-1 font-mono font-bold text-gray-900">
                                    <span>{p.orderId || orderRef}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(p.orderId || orderRef)}
                                      className="text-gray-400 hover:text-[#0A6C87]"
                                      title="Copy Order ID"
                                    >
                                      <ClipboardCopy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {p.paymentId && (
                                  <div className="bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200/80 flex items-center justify-between gap-2">
                                    <span className="text-gray-400 font-bold uppercase text-[9px]">Payment ID:</span>
                                    <div className="flex items-center gap-1 font-mono font-bold text-gray-900">
                                      <span>{p.paymentId}</span>
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(p.paymentId)}
                                        className="text-gray-400 hover:text-[#0A6C87]"
                                        title="Copy Payment ID"
                                      >
                                        <ClipboardCopy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 justify-end pt-1 sm:pt-0">
                                {isCompleted && (
                                  <a
                                    href={`${API_BASE_URL}/donation/receipt/${p.paymentId || p.orderId || p.id}?token=${encodeURIComponent(localStorage.getItem('userToken') || localStorage.getItem('adminToken') || '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-[#0A6C87] text-white hover:bg-cyan-800 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                  >
                                    <Download className="w-3.5 h-3.5" /> 80G PDF Receipt
                                  </a>
                                )}

                                {(isFailed || isCancelled) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (p.type === 'membership') {
                                        setActiveTab('membership');
                                      } else {
                                        setSelectedDonationAmt(p.amount || 1000);
                                        window.scrollTo({ top: 300, behavior: 'smooth' });
                                      }
                                      toast.info(`Retrying ${p.type || 'donation'} payment of ₹${p.amount}...`);
                                    }}
                                    className="bg-[#E5C100] text-[#0A6C87] hover:bg-[#CCA900] px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" /> Retry Payment (₹{p.amount?.toLocaleString('en-IN')})
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. EVENTS TAB */}
        {activeTab === 'events' && (
          <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            {/* Active User Registrations Section */}
            {eventRegistrationsHistory.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-[#0A6C87]" />
                    <h3 className="font-bold text-gray-900 text-base">Your Active Event Registrations</h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    {eventRegistrationsHistory.length} Event(s) Registered
                  </span>
                </div>

                {/* Mobile Cards (< sm) */}
                <div className="sm:hidden space-y-3">
                  {eventRegistrationsHistory.map((reg) => (
                    <div key={reg.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{reg.eventTitle || 'RKS Event'}</p>
                          {reg.eventDate && <p className="text-[11px] text-gray-500 mt-0.5">{reg.eventDate}</p>}
                        </div>
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-extrabold uppercase border flex-shrink-0 ${
                          reg.paymentStatus?.includes('cancelled')
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : reg.paymentStatus === 'pending' || reg.requiresPayment
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : reg.isFree
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        }`}>
                          {reg.paymentStatus === 'cancelled_by_member' ? 'CANCELLED BY YOU'
                            : reg.paymentStatus === 'cancelled_by_admin' ? 'CANCELLED BY ADMIN'
                            : reg.paymentStatus?.includes('cancelled') ? 'CANCELLED'
                            : reg.paymentStatus === 'pending' || reg.requiresPayment ? `PAY ₹${reg.paymentAmount}`
                            : reg.isFree ? 'FREE' : `₹${reg.paymentAmount}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span><span className="font-semibold text-[#0A6C87] font-mono text-[10px]">{reg.registrationId || `REG-${reg.id}`}</span></span>
                        <span>{reg.numberOfAttendees || 1} Person(s)</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {reg.paymentStatus?.includes('cancelled') ? (
                          <>
                            <span className="text-[11px] font-bold text-rose-600">Cancelled</span>
                            <button
                              onClick={() => {
                                const matchedEvt = eventsList.find(e => Number(e.id) === Number(reg.eventId)) || { id: reg.eventId, title: reg.eventTitle, date: reg.eventDate, location: reg.eventLocation, description: '', price: reg.paymentAmount, is_free: reg.isFree };
                                setSelectedEventModal(matchedEvt); setSelectedRegistrationModal(null); setShowEventRegModal(true);
                              }}
                              className="px-3 py-1.5 bg-[#0A6C87] text-white rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Register Again
                            </button>
                          </>
                        ) : reg.paymentStatus === 'pending' || reg.requiresPayment ? (
                          <>
                            <button
                              onClick={() => {
                                const matchedEvt = eventsList.find(e => Number(e.id) === Number(reg.eventId)) || { id: reg.eventId, title: reg.eventTitle, date: reg.eventDate, location: reg.eventLocation, description: '', price: reg.paymentAmount, is_free: false };
                                setSelectedEventModal(matchedEvt); setSelectedRegistrationModal(reg); setShowEventRegModal(true);
                              }}
                              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Pay ₹{reg.paymentAmount}
                            </button>
                            <button onClick={() => handleCancelRegistration(reg.id)} className="px-2.5 py-1.5 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                const matchedEvt = eventsList.find(e => Number(e.id) === Number(reg.eventId)) || { id: reg.eventId, title: reg.eventTitle, date: reg.eventDate, location: reg.eventLocation, description: '', price: reg.paymentAmount, is_free: reg.isFree };
                                setSelectedEventModal(matchedEvt); setSelectedRegistrationModal(reg); setShowEventRegModal(true);
                              }}
                              className="px-3 py-1.5 bg-[#0A6C87] text-white rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" /> Ticket (PDF)
                            </button>
                            <button onClick={() => handleCancelRegistration(reg.id)} className="px-2.5 py-1.5 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold">Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table (sm+) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50 uppercase text-[10px] font-bold text-gray-500 tracking-wider border-b">
                      <tr>
                        <th className="py-3 px-4">Event Title</th>
                        <th className="py-3 px-4">Registration ID</th>
                        <th className="py-3 px-4">Attendees</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {eventRegistrationsHistory.map((reg) => (
                        <tr key={reg.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-gray-900">
                            {reg.eventTitle || 'RKS Event'}
                            {reg.eventDate && <span className="block text-[11px] font-normal text-gray-500">{reg.eventDate}</span>}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#0A6C87]">
                            {reg.registrationId || `REG-${reg.id}`}
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-800">
                            {reg.numberOfAttendees || 1} Person(s)
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase inline-block border ${
                              reg.paymentStatus?.includes('cancelled')
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : reg.paymentStatus === 'pending' || reg.requiresPayment
                                ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                                : reg.isFree
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}>
                              {reg.paymentStatus === 'cancelled_by_member'
                                ? 'CANCELLED BY YOU'
                                : reg.paymentStatus === 'cancelled_by_admin'
                                ? 'CANCELLED BY ADMIN'
                                : reg.paymentStatus?.includes('cancelled')
                                ? 'CANCELLED'
                                : reg.paymentStatus === 'pending' || reg.requiresPayment
                                ? `PAYMENT DUE: ₹${reg.paymentAmount}`
                                : reg.isFree
                                ? 'FREE ENTRY'
                                : `₹${reg.paymentAmount}`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {reg.paymentStatus?.includes('cancelled') ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 inline-block">
                                  Cancelled
                                </span>
                                <button
                                  onClick={() => {
                                    const matchedEvt = eventsList.find(e => Number(e.id) === Number(reg.eventId)) || {
                                      id: reg.eventId,
                                      title: reg.eventTitle,
                                      date: reg.eventDate,
                                      location: reg.eventLocation,
                                      description: '',
                                      price: reg.paymentAmount,
                                      is_free: reg.isFree
                                    };
                                    setSelectedEventModal(matchedEvt);
                                    setSelectedRegistrationModal(null);
                                    setShowEventRegModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-[#0A6C87] text-white hover:bg-cyan-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Register Again
                                </button>
                              </div>
                            ) : reg.paymentStatus === 'pending' || reg.requiresPayment ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    const matchedEvt = eventsList.find(e => Number(e.id) === Number(reg.eventId)) || {
                                      id: reg.eventId,
                                      title: reg.eventTitle,
                                      date: reg.eventDate,
                                      location: reg.eventLocation,
                                      description: '',
                                      price: reg.paymentAmount,
                                      is_free: false
                                    };
                                    setSelectedEventModal(matchedEvt);
                                    setSelectedRegistrationModal(reg);
                                    setShowEventRegModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Pay Ticket Fee (₹{reg.paymentAmount})
                                </button>
                                <button
                                  onClick={() => handleCancelRegistration(reg.id)}
                                  className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    const matchedEvt = eventsList.find(e => Number(e.id) === Number(reg.eventId)) || {
                                      id: reg.eventId,
                                      title: reg.eventTitle,
                                      date: reg.eventDate,
                                      location: reg.eventLocation,
                                      description: '',
                                      price: reg.paymentAmount,
                                      is_free: reg.isFree
                                    };
                                    setSelectedEventModal(matchedEvt);
                                    setSelectedRegistrationModal(reg);
                                    setShowEventRegModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-[#0A6C87] text-white hover:bg-cyan-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" /> Ticket (PDF)
                                </button>
                                <button
                                  onClick={() => handleCancelRegistration(reg.id)}
                                  className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">RKS Mahila Sangha Events</h2>
                <p className="text-xs text-gray-500">Browse upcoming meets and cultural gatherings</p>
              </div>

              <div className="flex gap-2 flex-wrap">
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
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const evtDateStr = evt.date ? String(evt.date).slice(0, 10) : '';
                  const isPast = evt.category === 'past' || (evtDateStr && evtDateStr < todayStr);

                  // Check active vs cancelled user registration
                  const activeUserReg = eventRegistrationsHistory.find((r) => {
                    const rId = r.eventId != null ? Number(r.eventId) : (r.event_id != null ? Number(r.event_id) : null);
                    const eId = evt.id != null ? Number(evt.id) : null;
                    const isIdMatch = rId !== null && eId !== null && !isNaN(rId) && !isNaN(eId) && rId === eId;
                    const isTitleMatch = Boolean(r.eventTitle && evt.title && r.eventTitle.trim().toLowerCase() === evt.title.trim().toLowerCase());
                    return (isIdMatch || isTitleMatch) && !r.paymentStatus?.includes('cancelled');
                  });

                  const cancelledUserReg = eventRegistrationsHistory.find((r) => {
                    const rId = r.eventId != null ? Number(r.eventId) : (r.event_id != null ? Number(r.event_id) : null);
                    const eId = evt.id != null ? Number(evt.id) : null;
                    const isIdMatch = rId !== null && eId !== null && !isNaN(rId) && !isNaN(eId) && rId === eId;
                    const isTitleMatch = Boolean(r.eventTitle && evt.title && r.eventTitle.trim().toLowerCase() === evt.title.trim().toLowerCase());
                    return (isIdMatch || isTitleMatch) && Boolean(r.paymentStatus?.includes('cancelled'));
                  });

                  // Gather all possible image references
                  const allImages: string[] = [];
                  if (Array.isArray(evt.images) && evt.images.length > 0) {
                    evt.images.forEach((img: string) => { if (img && typeof img === 'string') allImages.push(img); });
                  }
                  if (evt.image_url) allImages.push(evt.image_url);
                  if (evt.image) allImages.push(evt.image);
                  if (evt.imageUrl) allImages.push(evt.imageUrl);

                  const uniqueImages = Array.from(new Set(allImages));
                  const primaryImage = uniqueImages.length > 0 ? resolveBackendAssetUrl(uniqueImages[0]) : '';

                  return (
                    <div key={evt.id} className="bg-white rounded-2xl shadow-md border overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
                      <div>
                        {uniqueImages.length > 1 ? (
                          <div className="relative">
                            <DashboardEventGallery images={uniqueImages} title={evt.title} />
                            <div className={`absolute top-2.5 right-2.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase shadow ${
                              isPast ? 'bg-gray-800 text-white' : 'bg-[#0A6C87] text-white'
                            }`}>
                              {isPast ? 'CONCLUDED' : 'UPCOMING'}
                            </div>
                            <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-10">
                              {isFree ? (
                                <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase shadow">
                                  FREE ENTRY
                                </span>
                              ) : (
                                <span className="bg-[#E5C100] text-[#0A6C87] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase shadow">
                                  PAID • ₹{pricePerPerson}
                                </span>
                              )}
                              <span className="bg-white/90 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                                📷 {uniqueImages.length} Photos
                              </span>
                            </div>
                          </div>
                        ) : primaryImage ? (
                          <div className="relative h-44 bg-gray-100">
                            <img src={primaryImage} alt={evt.title} className="w-full h-full object-cover" />
                            <div className={`absolute top-2.5 right-2.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase shadow ${
                              isPast ? 'bg-gray-800 text-white' : 'bg-[#0A6C87] text-white'
                            }`}>
                              {isPast ? 'CONCLUDED' : 'UPCOMING'}
                            </div>
                            {isFree ? (
                              <span className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase shadow">
                                FREE ENTRY
                              </span>
                            ) : (
                              <span className="absolute top-2.5 left-2.5 bg-[#E5C100] text-[#0A6C87] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase shadow">
                                PAID • ₹{pricePerPerson} / Person
                              </span>
                            )}
                          </div>
                        ) : null}
                        
                        <div className="p-5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                              isPast ? 'bg-gray-100 text-gray-600' : 'bg-cyan-50 text-[#0A6C87]'
                            }`}>
                              {isPast ? 'Past Event' : 'Upcoming Event'}
                            </span>
                            {!primaryImage && (
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
                        <span className="text-gray-500 font-medium">{evtDateStr || evt.date}</span>
                        {isPast ? (
                          <span className="bg-gray-100 text-gray-500 font-semibold px-3 py-1.5 rounded-lg text-xs border border-gray-200">
                            Event Concluded
                          </span>
                        ) : activeUserReg ? (
                          <button
                            onClick={() => {
                              setSelectedEventModal(evt);
                              setSelectedRegistrationModal(activeUserReg);
                              setShowEventRegModal(true);
                            }}
                            className="px-3.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors flex items-center gap-1.5 shadow-sm border border-emerald-300"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Registered ✓
                          </button>
                        ) : cancelledUserReg ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg font-extrabold text-[11px] bg-rose-100 text-rose-800 border border-rose-200">
                              {cancelledUserReg.paymentStatus === 'cancelled_by_admin' ? 'Cancelled by Admin' : 'Cancelled by You'}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedEventModal(evt);
                                setSelectedRegistrationModal(null);
                                setShowEventRegModal(true);
                              }}
                              className="px-3 py-1.5 rounded-lg font-bold text-xs bg-[#0A6C87] text-white hover:bg-cyan-800 transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Register Again
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedEventModal(evt);
                              setSelectedRegistrationModal(null);
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
                        )}
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

                {/* Member Passport Photo Section in Settings */}
                <div className="bg-cyan-50/60 p-4 rounded-2xl border border-cyan-200/80 space-y-2">
                  <label className="block font-bold text-gray-800 text-xs">Member Passport Photo</label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-16 h-20 bg-white rounded-xl border border-gray-300 overflow-hidden flex items-center justify-center shadow-md flex-shrink-0">
                      {profilePhotoPreview ? (
                        <img src={profilePhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (membership?.photoUrl || membership?.photo_url) && !imgLoadError ? (
                        <img
                          src={resolveBackendAssetUrl(membership.photoUrl || membership.photo_url)}
                          alt="Current Member Photo"
                          className="w-full h-full object-cover"
                          onError={() => setImgLoadError(true)}
                        />
                      ) : (
                        <div className="flex flex-col items-center text-gray-400">
                          <User className="w-7 h-7" />
                          <span className="text-[8px] uppercase mt-0.5 font-bold">No Photo</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                      <input
                        type="file"
                        accept="image/*"
                        id="settingsPhotoInput"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setProfilePhotoFile(file);
                            setProfilePhotoPreview(URL.createObjectURL(file));
                            setImgLoadError(false);
                          }
                        }}
                        className="hidden"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor="settingsPhotoInput"
                          className="inline-flex items-center gap-1.5 bg-white border border-cyan-300 hover:bg-cyan-50 text-[#0A6C87] px-3.5 py-2 rounded-xl font-bold text-xs cursor-pointer shadow-sm transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {(membership?.photoUrl || membership?.photo_url || profilePhotoPreview) ? 'Select New Photo' : 'Add Passport Photo'}
                        </label>
                        {profilePhotoFile && (
                          <button
                            type="button"
                            onClick={handleUpdateProfile}
                            disabled={isUpdatingProfile}
                            className="inline-flex items-center gap-1.5 bg-[#0A6C87] text-white px-3.5 py-2 rounded-xl font-bold text-xs hover:bg-[#08566c] shadow-sm transition-colors disabled:opacity-50"
                          >
                            {isUpdatingProfile ? 'Uploading...' : 'Save & Upload Photo Now'}
                          </button>
                        )}
                      </div>
                      {profilePhotoFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setProfilePhotoFile(null);
                            setProfilePhotoPreview(null);
                          }}
                          className="block text-[11px] text-rose-600 font-semibold hover:underline mx-auto sm:mx-0"
                        >
                          Cancel Selection
                        </button>
                      )}
                      <p className="text-[10px] text-gray-500">
                        This passport photo will be displayed on your digital Member Card and printed on your official Certificate.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#0A6C87] focus:ring-2 focus:ring-cyan-100 shadow-sm"
                      placeholder="First Name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#0A6C87] focus:ring-2 focus:ring-cyan-100 shadow-sm"
                      placeholder="Last Name"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Phone Number (10 Digits) *</label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#0A6C87] focus:ring-2 focus:ring-cyan-100 shadow-sm"
                      placeholder="10-digit mobile number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Father / Husband Name</label>
                    <input
                      type="text"
                      value={profileForm.guardianName}
                      onChange={(e) => setProfileForm({ ...profileForm, guardianName: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#0A6C87] focus:ring-2 focus:ring-cyan-100 shadow-sm"
                      placeholder="Father or Husband Name"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Gotra Name</label>
                    <input
                      type="text"
                      value={profileForm.gotraName}
                      onChange={(e) => setProfileForm({ ...profileForm, gotraName: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#0A6C87] focus:ring-2 focus:ring-cyan-100 shadow-sm"
                      placeholder="Gotra Name"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Profession</label>
                    <input
                      type="text"
                      value={profileForm.profession}
                      onChange={(e) => setProfileForm({ ...profileForm, profession: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#0A6C87] focus:ring-2 focus:ring-cyan-100 shadow-sm"
                      placeholder="Profession / Occupation"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#0A6C87] focus:ring-2 focus:ring-cyan-100 shadow-sm"
                      placeholder="City"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#0A6C87] focus:ring-2 focus:ring-cyan-100 shadow-sm"
                      placeholder="Full Address"
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
                      <p className="text-[11px] font-bold text-rose-700 mt-1.5 flex items-center gap-1">
                        ⚠️ Any payment made for this membership will <span className="underline">NOT be refunded</span> upon deletion.
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
              {/* No-Refund Warning */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-left">
                <span className="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
                <div>
                  <p className="text-xs font-extrabold text-amber-800">No Refund Policy</p>
                  <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                    Any payment made towards this membership is <span className="font-bold underline">non-refundable</span>. Deleting your account will permanently remove your membership and you will lose all associated benefits. This cannot be reversed.
                  </p>
                </div>
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

        <EventRegistrationModal
          isOpen={showEventRegModal}
          onClose={() => {
            setShowEventRegModal(false);
            setSelectedRegistrationModal(null);
          }}
          event={selectedEventModal}
          userSession={user}
          existingRegistration={selectedRegistrationModal}
          onCancelRegistration={handleCancelRegistration}
          onSuccess={(newRegObj?: any) => {
            if (newRegObj) {
              setEventRegistrationsHistory((prev) => [newRegObj, ...prev.filter(p => p.id !== newRegObj.id)]);
            }
            loadMemberData();
            loadEvents();
          }}
        />

        {/* Payment Success & Failure Result Modal */}
        {(paymentSuccess || paymentFailure) && (
          <PaymentResultModal
            success={paymentSuccess}
            failure={paymentFailure}
            onClose={() => { setPaymentSuccess(null); setPaymentFailure(null); }}
            onRetry={() => { setActiveTab('membership'); }}
            onDownloadCard={paymentSuccess?.type === 'membership' ? () => printMemberIdCard({
              fullName: paymentSuccess.memberName || user.name,
              memberId: paymentSuccess.memberId || membership?.memberId || '',
              phone: paymentSuccess.phone || user.phone,
              city: paymentSuccess.city || membership?.city,
              registrationDate: paymentSuccess.date,
              photoUrl: paymentSuccess.photoUrl || membership?.photoUrl,
            }, qrCodeDataUrl) : undefined}
          />
        )}
      </div>
    </div>
  );
}
