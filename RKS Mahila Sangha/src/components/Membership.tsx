import { UserPlus, CreditCard, ShieldCheck, IdCard, Sparkles, BookOpen, HeartHandshake, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { settingsApi, membershipApi, paymentApi, resolveBackendAssetUrl } from '../services/api';
import logo from '../assets/RKMS Logo.png';
import { UserAuthModal } from './UserAuthModal';
import { PaymentResultModal, type PaymentSuccessInfo, type PaymentFailureInfo } from './PaymentResultModal';

interface MembershipData {
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  photoUrl?: string;
  registrationDate: string;
}

export function Membership() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
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
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const checkUserMembership = async (user: { name: string; email: string; phone?: string }) => {
    setUserSession(user);
    const full = user.name || '';
    const parts = full.split(' ');
    const fName = parts[0] || '';
    const lName = parts.slice(1).join(' ');

    setFormData((prev) => ({
      ...prev,
      firstName: fName || prev.firstName,
      lastName: lName || prev.lastName,
      fullName: full || prev.fullName,
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

    const checkRazorpayRedirect = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const razorpay_payment_id = searchParams.get('razorpay_payment_id');
      const razorpay_order_id = searchParams.get('razorpay_order_id');
      const razorpay_signature = searchParams.get('razorpay_signature');

      const errorCode = searchParams.get('error[code]') || searchParams.get('error_code');
      const errorDesc = searchParams.get('error[description]') || searchParams.get('error_description') || searchParams.get('error[reason]');

      if (razorpay_payment_id && razorpay_order_id) {
        window.history.replaceState({}, document.title, window.location.pathname);
        const storedPending = sessionStorage.getItem('pending_membership_data');
        let currentData = formData;
        if (storedPending) {
          try {
            currentData = { ...formData, ...JSON.parse(storedPending) };
          } catch (e) {}
        }
        sessionStorage.removeItem('pending_membership_data');
        sessionStorage.removeItem('pending_membership_order_id');

        await verifyAndCreateMembership(
          {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature: razorpay_signature || '',
          },
          currentData
        );
      } else if (errorCode || errorDesc) {
        window.history.replaceState({}, document.title, window.location.pathname);
        const savedOrderId = sessionStorage.getItem('pending_membership_order_id');
        sessionStorage.removeItem('pending_membership_data');
        sessionStorage.removeItem('pending_membership_order_id');

        setPaymentFailure({
          type: 'membership',
          reason: decodeURIComponent(errorDesc || 'Membership payment was declined or failed.'),
          code: errorCode || undefined,
          amount: 1001,
          orderId: savedOrderId || undefined,
        });
      }
    };

    checkRazorpayRedirect();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData((prev) => ({ ...prev, photo: file }));
      setPhotoPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const computedName = `${formData.firstName} ${formData.lastName}`.trim() || formData.fullName;

    if (!computedName || !formData.email || !formData.phone || !formData.address || !formData.city) {
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

    await startMembershipPaymentProcess({ ...formData, fullName: computedName });
  };

  const startMembershipPaymentProcess = async (data: typeof formData) => {
    setIsLoading(true);

    try {
      const orderResponse = await membershipApi.createOrder({
        name: data.fullName || `${data.firstName} ${data.lastName}`.trim(),
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
        // Save pending data for redirect recovery
        try {
          sessionStorage.setItem('pending_membership_data', JSON.stringify(data));
          sessionStorage.setItem('pending_membership_order_id', orderResponse.order.id);
        } catch (e) {}

        const options = {
          key: orderResponse.razorpayKeyId,
          amount: orderResponse.order.amount,
          currency: 'INR',
          name: 'Raju Kshatriya Mahila Sangha',
          description: 'Lifetime Membership Buying (₹1,001)',
          order_id: orderResponse.order.id,
          callback_url: window.location.href,
          handler: async function (razorpayResponse: any) {
            sessionStorage.removeItem('pending_membership_data');
            sessionStorage.removeItem('pending_membership_order_id');
            await verifyAndCreateMembership(razorpayResponse, data);
          },
          modal: {
            ondismiss: function () {
              paymentApi.cancelOrder(orderResponse.order.id, 'User closed checkout window');
              sessionStorage.removeItem('pending_membership_data');
              sessionStorage.removeItem('pending_membership_order_id');
              toast.info('Membership payment was cancelled.');
            },
          },
          prefill: {
            name: data.fullName,
            email: data.email,
            contact: data.phone,
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
            amount: orderResponse.order.amount / 100,
            orderId: resp?.error?.metadata?.order_id || orderResponse.order.id,
          });
        });
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

  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessInfo | null>(null);
  const [paymentFailure, setPaymentFailure] = useState<PaymentFailureInfo | null>(null);

  const printMemberIdCard = (member: {
    fullName: string;
    memberId: string;
    phone?: string;
    city?: string;
    registrationDate?: string;
    photoUrl?: string;
    isCancelled?: boolean;
  }) => {
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
    const isCancelled = Boolean(member.isCancelled);

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
          .page { width: 100%; display: flex; flex-direction: column; gap: 18px; }

          /* ORG HEADER */
          .org-header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #0A6C87; padding-bottom: 12px; }
          .org-logo { width: 64px; height: 64px; border-radius: 50%; border: 2px solid #E5C100; }
          .org-name-block .org-en { font-size: 19px; font-weight: 900; color: #0A6C87; text-transform: uppercase; letter-spacing: 0.5px; }
          .org-name-block .org-kn { font-size: 13px; color: #0891b2; font-weight: 600; margin-top: 1px; }
          .org-name-block .org-tag { font-size: 10px; color: #64748b; margin-top: 2px; }
          .org-badge { margin-left: auto; background: #E5C100; color: #0A6C87; font-size: 9px; font-weight: 900; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
          .org-badge.cancelled { background: #ef4444 !important; color: #ffffff !important; }
          .cancelled-seal {
            position: absolute;
            top: 48%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-18deg);
            border: 4px solid #ef4444;
            color: #ef4444;
            font-size: 32px;
            font-weight: 900;
            letter-spacing: 6px;
            padding: 8px 24px;
            border-radius: 8px;
            background: rgba(15, 23, 42, 0.88);
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
            text-transform: uppercase;
            white-space: nowrap;
            z-index: 30;
            pointer-events: none;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* CARD */
          .card-wrap { display: flex; justify-content: center; }
          .id-card { width: 500px; background: linear-gradient(135deg, #0A6C87 0%, #064E62 60%, #043A4B 100%); border-radius: 16px; border: 3px solid #E5C100; color: white; padding: 16px 20px; position: relative; overflow: hidden; box-shadow: 0 8px 24px rgba(10,108,135,0.25); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .id-card.cancelled-card { border-color: #ef4444 !important; }
          .id-card::before { content: ''; position: absolute; top: -50px; right: -50px; width: 160px; height: 160px; background: rgba(229,193,0,0.10); border-radius: 50%; }
          .id-card::after { content: ''; position: absolute; bottom: -40px; left: -40px; width: 120px; height: 120px; background: rgba(255,255,255,0.05); border-radius: 50%; }
          .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.25); padding-bottom: 10px; margin-bottom: 12px; }
          .card-header-left { display: flex; align-items: center; gap: 8px; }
          .card-logo { width: 34px; height: 34px; background: white; border-radius: 50%; padding: 2px; }
          .card-title { font-size: 12px; font-weight: 800; text-transform: uppercase; line-height: 1.2; }
          .card-subtitle { font-size: 8px; color: #7dd3fc; font-weight: 600; }
          .lifetime-badge { background: #E5C100; color: #0A6C87; font-size: 7.5px; font-weight: 900; padding: 3px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .lifetime-badge.cancelled { background: #ef4444 !important; color: #ffffff !important; }
          .card-body { display: flex; gap: 14px; align-items: center; }
          .photo-slot { width: 82px; height: 98px; border-radius: 8px; border: 2px solid #E5C100; overflow: hidden; background: #0f172a; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
          .photo-slot img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
          .photo-placeholder { font-size: 8px; color: #bae6fd; text-align: center; font-weight: bold; line-height: 1.5; }
          .card-details { flex: 1; min-width: 0; padding: 0 2px; }
          .card-member-name { font-size: 15px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
          .card-row { display: flex; align-items: baseline; gap: 5px; margin-bottom: 4px; font-size: 9.5px; color: #e0f2fe; }
          .card-lbl { color: #93c5fd; font-weight: 700; font-size: 8px; text-transform: uppercase; white-space: nowrap; }
          .card-id { font-family: monospace; font-weight: 900; color: #E5C100; font-size: 11.5px; }
          .card-footer { border-top: 1px dashed rgba(255,255,255,0.2); margin-top: 12px; padding-top: 7px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #bae6fd; }

          /* TERMS */
          .terms-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; background: #f8fafc; }
          .terms-title { font-size: 12px; font-weight: 800; color: #0A6C87; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
          .terms-list { list-style: none; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; }
          .terms-list li { font-size: 9.5px; color: #475569; padding-left: 14px; position: relative; line-height: 1.5; }
          .terms-list li::before { content: '✦'; position: absolute; left: 0; color: #0A6C87; font-size: 7px; top: 2px; }

          /* PAGE FOOTER */
          .page-footer { border-top: 2px solid #0A6C87; padding-top: 10px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #475569; }
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
            ${isCancelled 
              ? `<div class="org-badge cancelled">✕ MEMBERSHIP CANCELLED</div>`
              : `<div class="org-badge">✓ Verified Lifetime Member</div>`
            }
          </div>

          <!-- MEMBER ID CARD -->
          <div class="card-wrap">
            <div class="id-card ${isCancelled ? 'cancelled-card' : ''}">
              ${isCancelled ? `<div class="cancelled-seal">CANCELLED</div>` : ''}
              <div class="card-header">
                <div class="card-header-left">
                  <img src="${logo}" class="card-logo" />
                  <div>
                    <div class="card-title">Raju Kshatriya Mahila Sangha</div>
                    <div class="card-subtitle">ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘ &nbsp;•&nbsp; Official ID Card</div>
                  </div>
                </div>
                <span class="lifetime-badge ${isCancelled ? 'cancelled' : ''}">
                  ${isCancelled ? 'CANCELLED' : 'LIFETIME MEMBER'}
                </span>
              </div>
              <div class="card-body">
                <div class="photo-slot">
                  ${memberPhotoUrl ? `<img src="${resolveBackendAssetUrl(memberPhotoUrl)}" />` : `<div class="photo-placeholder">MEMBER<br/>PHOTO</div>`}
                </div>
                <div class="card-details">
                  <div class="card-member-name">${memberName}</div>
                  <div class="card-row"><span class="card-lbl">MEMBER ID:</span><span class="card-id">${memberId}</span></div>
                  <div class="card-row"><span class="card-lbl">PHONE:</span><span>${memberPhone}</span></div>
                  <div class="card-row"><span class="card-lbl">CITY:</span><span>${memberCity}</span></div>
                  <div class="card-row"><span class="card-lbl">JOINED:</span><span>${regDate}</span></div>
                  <div class="card-row">
                    <span class="card-lbl">STATUS:</span>
                    ${isCancelled 
                      ? `<span style="color:#ef4444;font-weight:800;">CANCELLED &amp; INACTIVE</span>`
                      : `<span style="color:#4ade80;font-weight:800;">ACTIVE &amp; VERIFIED</span>`
                    }
                  </div>
                </div>
              </div>
              <div class="card-footer">
                <span>RKS Mahila Sangha &nbsp;•&nbsp; RR Nagar, Bengaluru &nbsp;|&nbsp; +91 9972648909</span>
                <span>Authorized Signatory – RKS Sangha</span>
              </div>
            </div>
          </div>

          ${isCancelled ? `
            <div style="border: 2px solid #fca5a5; background: #fef2f2; color: #991b1b; font-weight: 800; font-size: 10px; padding: 10px 14px; border-radius: 8px; text-align: center; text-transform: uppercase; margin-top: 5px;">
              ⚠️ NOTICE: THIS MEMBERSHIP HAS BEEN OFFICIALLY CANCELLED. THIS DOCUMENT IS NO LONGER VALID FOR SANGHA BENEFITS, EVENT ENTRY, OR MEMBER VERIFICATION.
            </div>
          ` : ''}
              <div class="card-footer">
                <span>RKS Mahila Sangha &nbsp;&bull;&nbsp; RR Nagar, Bengaluru &nbsp;|&nbsp; +91 9972648909</span>
                <span>Authorized Signatory &ndash; RKS Sangha</span>
              </div>
            </div>
          </div>

          <!-- TERMS & CONDITIONS -->
          <div class="terms-box">
            <div class="terms-title">&#128203; Terms &amp; Conditions of Membership</div>
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
              Parallel to BDA Link Road, Rajarajeshwari Nagar Post, Bengaluru &ndash; 560 098<br/>
              &#128222; +91 9972648909 &nbsp;|&nbsp; &#9993; rajukshatriyamahilasangha2024@gmail.com
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

        const createdMember = verifyRes.member || {
          memberId: verifyRes.membership_id,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          city: data.city,
          photoUrl: verifyRes.photoUrl,
          registrationDate: new Date().toISOString().split('T')[0]
        };

        setPaymentSuccess({
          type: 'membership',
          paymentId: verifyRes.payment_id || rzpRes.razorpay_payment_id || `PAY_${Date.now()}`,
          orderId: verifyRes.order_id || rzpRes.razorpay_order_id || `ORDER_${Date.now()}`,
          amount: verifyRes.amount || 1001,
          memberId: verifyRes.membership_id || createdMember.memberId,
          memberName: data.fullName,
          email: data.email,
          phone: data.phone,
          city: data.city || 'Bengaluru',
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          photoUrl: createdMember.photoUrl || (data.photo ? URL.createObjectURL(data.photo) : undefined),
        });
      } else {
        setPaymentFailure({
          type: 'membership',
          reason: verifyRes.message || 'Membership payment verification failed.',
          amount: 1001,
          orderId: rzpRes.razorpay_order_id,
        });
      }
    } catch (err) {
      setPaymentFailure({
        type: 'membership',
        reason: 'An unexpected error occurred while verifying your payment.',
        amount: 1001,
      });
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
                <div className="flex items-center gap-4 sm:col-span-2 border-b border-white/15 pb-4">
                  {membershipData.photoUrl ? (
                    <img
                      src={resolveBackendAssetUrl(membershipData.photoUrl)}
                      alt={membershipData.fullName}
                      className="w-20 h-24 object-cover rounded-xl border-2 border-white/40 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-24 bg-white/20 rounded-xl border-2 border-white/40 flex flex-col items-center justify-center text-cyan-100">
                      <User className="w-10 h-10" />
                      <span className="text-[9px] uppercase mt-1">Photo</span>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-cyan-200 uppercase font-semibold">Member Name</p>
                    <p className="text-2xl font-bold text-white mt-0.5">{membershipData.fullName}</p>
                    <p className="text-xs text-cyan-100 mt-1">ID: <span className="font-mono font-bold text-[#E5C100]">{membershipData.memberId}</span></p>
                  </div>
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

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-cyan-100 pt-2 border-t border-white/10">
                <span className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-green-300" /> Verified Lifetime Membership (₹1,001)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => printMemberIdCard(membershipData)}
                    className="bg-[#E5C100] text-[#0A6C87] hover:bg-[#CCA900] px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download Official Member ID Card
                  </button>
                </div>
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
            <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-8 space-y-6">
              <h3 className="text-xl font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#0A6C87]" />
                Membership Buying Form (₹1,001)
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter first name"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter last name"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Father / Husband Name</label>
                    <input
                      type="text"
                      name="guardianName"
                      value={formData.guardianName}
                      onChange={handleInputChange}
                      placeholder="Enter guardian / husband name"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#0A6C87]"
                    />
                  </div>

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
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Member Passport Photo (Optional)</label>
                  {photoPreviewUrl ? (
                    <div className="flex items-center gap-3 bg-cyan-50/60 p-2.5 rounded-xl border border-cyan-200">
                      <img src={photoPreviewUrl} alt="Passport Photo Preview" className="w-14 h-16 object-cover rounded-lg border-2 border-white shadow-sm" />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{formData.photo?.name || 'Passport Photo Selected'}</p>
                        <p className="text-[10px] text-cyan-800">Will be printed on your digital Membership Card & Certificate</p>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, photo: null }));
                            setPhotoPreviewUrl(null);
                          }}
                          className="text-[11px] text-rose-600 font-semibold hover:underline mt-1 block"
                        >
                          Remove / Change Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-xs text-gray-500 border rounded-lg p-2 bg-gray-50 cursor-pointer"
                    />
                  )}
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

      {/* Payment Result Modal */}
      {(paymentSuccess || paymentFailure) && (
        <PaymentResultModal
          success={paymentSuccess}
          failure={paymentFailure}
          onClose={() => { setPaymentSuccess(null); setPaymentFailure(null); }}
          onRetry={() => { /* user can resubmit form */ }}
          onDownloadCard={paymentSuccess ? () => printMemberIdCard({
            fullName: paymentSuccess.memberName!,
            memberId: paymentSuccess.memberId!,
            phone: paymentSuccess.phone,
            city: paymentSuccess.city,
            registrationDate: paymentSuccess.date,
            photoUrl: paymentSuccess.photoUrl,
          }) : undefined}
        />
      )}

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