import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, CheckCircle2, User, Calendar, Award, ArrowLeft } from 'lucide-react';
import logo from '../assets/RKMS Logo.png';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function VerifyMember() {
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('id') || searchParams.get('memberId') || '';

  const [member, setMember] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!memberId) {
      setIsLoading(false);
      setIsError(true);
      return;
    }

    const verify = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_BASE_URL}/membership/status?memberId=${encodeURIComponent(memberId)}`);
        const data = await res.json();
        if (data.success && data.member) {
          setMember(data.member);
          setIsError(false);
        } else {
          setIsError(true);
        }
      } catch (e) {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [memberId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#0A6C87] to-cyan-700 p-6 text-white text-center relative">
          <img src={logo} alt="RKS Logo" className="w-16 h-16 bg-white rounded-full p-1 mx-auto shadow-md mb-2" />
          <h2 className="font-extrabold text-lg tracking-tight">Raju Kshatriya Mahila Sangha</h2>
          <p className="text-cyan-100 text-xs mt-0.5">Official Verification Portal</p>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-6">
          {isLoading ? (
            <div className="py-12 space-y-3">
              <div className="w-10 h-10 border-4 border-[#0A6C87] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-semibold text-gray-500">Verifying Membership Credentials...</p>
            </div>
          ) : isError || !member ? (
            <div className="py-8 space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Membership Not Found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  The membership ID <span className="font-mono font-bold text-red-600">{memberId || 'UNKNOWN'}</span> could not be verified in the official RKS database.
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#0A6C87] hover:underline pt-2"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Homepage
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-200 text-xs font-extrabold shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>OFFICIAL VERIFIED ACTIVE MEMBER</span>
              </div>

              {/* Details Card */}
              <div className="bg-gradient-to-br from-cyan-50 to-emerald-50 p-5 rounded-2xl border border-cyan-100 text-left space-y-3">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Member Full Name</span>
                  <span className="text-lg font-extrabold text-gray-900">{member.fullName || member.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-cyan-100">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Membership ID</span>
                    <span className="text-sm font-extrabold text-[#0A6C87] font-mono">{member.memberId || memberId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Membership Type</span>
                    <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-0.5">LIFETIME</span>
                  </div>
                </div>

                {member.gotraName && (
                  <div className="pt-2 border-t border-cyan-100">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Gotra</span>
                    <span className="text-xs font-bold text-gray-800">{member.gotraName}</span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-gray-500 italic">
                Verified against Official Registrar of Societies DRB1/SOR/343/2024-2025.
              </div>

              <Link
                to="/"
                className="block w-full bg-[#0A6C87] text-white py-3 rounded-xl font-bold text-xs hover:bg-cyan-800 transition-colors shadow-md"
              >
                Return to RKS Mahila Sangha Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
