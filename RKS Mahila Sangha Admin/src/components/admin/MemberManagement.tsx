import { AdminLayout } from './AdminLayout';
import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Calendar, RefreshCw, Users, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface Member {
  id: string;
  name: string;
  guardianName: string;
  gotraName: string;
  email: string;
  phone: string;
  membershipId: string;
  dateOfBirth: string;
  educationalQualification: string;
  profession: string;
  maritalStatus: string;
  bloodGroup: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  aadharNumber: string;
  photoUrl: string;
  joinDate: string;
  status: 'Active' | 'Inactive';
}

const MEMBERS_FETCH_LIMIT = 2000;

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function triggerFileDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function MemberManagement() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('adminToken');
    if (!token) {
      toast.error('Please login to view members');
      setIsLoading(false);
      return;
    }
    try {
      const response = await adminApi.getMembers(token, 1, MEMBERS_FETCH_LIMIT);
      if (response.success && Array.isArray(response.members)) {
        const rows: Member[] = response.members.map((m: Record<string, unknown>) => ({
          id: String(m.id),
          name: String(m.name ?? ''),
          guardianName: String(m.guardian_name ?? ''),
          gotraName: String(m.gotra_name ?? ''),
          email: String(m.email ?? ''),
          phone: String(m.phone ?? ''),
          membershipId: String(m.membership_id ?? ''),
          dateOfBirth: String(m.date_of_birth ?? ''),
          educationalQualification: String(m.educational_qualification ?? ''),
          profession: String(m.profession ?? ''),
          maritalStatus: String(m.marital_status ?? ''),
          bloodGroup: String(m.blood_group ?? ''),
          address: String(m.address ?? ''),
          city: String(m.city ?? ''),
          state: String(m.state ?? ''),
          pincode: String(m.pincode ?? ''),
          aadharNumber: String(m.aadhar_number ?? ''),
          photoUrl: String(m.photo_url ?? ''),
          joinDate: String(m.created_at ?? ''),
          status: m.is_active === 1 || m.is_active === true ? 'Active' : 'Inactive',
        }));
        setMembers(rows);
      } else {
        toast.error('Failed to load members');
        setMembers([]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load members');
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers, refreshKey]);

  const filteredMembers = members.filter((member) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      member.name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      member.phone.includes(q) ||
      member.membershipId.toLowerCase().includes(q) ||
      member.city.toLowerCase().includes(q);

    const memberDate = new Date(member.joinDate);
    const validDate = !Number.isNaN(memberDate.getTime());
    const matchesStartDate = !startDate || (validDate && memberDate >= new Date(startDate));
    const matchesEndDate = !endDate || (validDate && memberDate <= new Date(`${endDate}T23:59:59`));

    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const handleExportCSV = () => {
    const headers = ['Membership ID', 'Name', 'Email', 'Phone', 'City', 'State', 'Status', 'Join Date'];
    const lines = [
      headers.map(csvEscape).join(','),
      ...filteredMembers.map((member) =>
        [
          member.membershipId,
          member.name,
          member.email,
          member.phone,
          member.city,
          member.state,
          member.status,
          (member.joinDate || '').slice(0, 10),
        ]
          .map(csvEscape)
          .join(',')
      ),
    ];
    triggerFileDownload(lines.join('\n'), `members_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    toast.success('CSV download started.');
  };

  const handleExportExcel = () => {
    const headers = ['Membership ID', 'Name', 'Email', 'Phone', 'City', 'State', 'Status', 'Join Date'];
    const lines = [
      headers.join('\t'),
      ...filteredMembers.map((member) =>
        [
          member.membershipId,
          member.name,
          member.email,
          member.phone,
          member.city,
          member.state,
          member.status,
          (member.joinDate || '').slice(0, 10),
        ].join('\t')
      ),
    ];
    triggerFileDownload(lines.join('\n'), `members_${new Date().toISOString().split('T')[0]}.xls`, 'application/vnd.ms-excel');
    toast.success('Excel spreadsheet download started.');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl border shadow-xl transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
        }`}>
          <div>
            <div className="flex items-center gap-2 text-cyan-500 text-xs font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Membership Database</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Member Directory
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              View, search, filter, and export official community members.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={isLoading}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-500' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!filteredMembers.length}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={handleExportExcel}
              disabled={!filteredMembers.length}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className={`p-5 rounded-2xl border shadow-xl transition-colors ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search name, email, phone, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400' : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                }`}
              />
            </div>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              />
            </div>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Member Table */}
        <div className={`rounded-2xl border overflow-hidden shadow-xl transition-colors ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className={`p-4 border-b flex justify-between items-center ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h3 className={`font-bold text-sm flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Users className="w-4 h-4 text-cyan-500" />
              Total Members ({filteredMembers.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading members directory...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-left text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <thead className={`uppercase text-[10px] font-bold tracking-wider border-b ${
                  isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-900/80 text-slate-400 border-slate-800'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Membership ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Gotra / Guardian</th>
                    <th className="py-3 px-4">Contact Email & Phone</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">Profession</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/50'}`}>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-600">{member.membershipId}</td>
                      <td className={`py-3 px-4 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{member.name}</td>
                      <td className={`py-3 px-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{member.gotraName || member.guardianName || '-'}</td>
                      <td className="py-3 px-4">
                        <div className={isLight ? 'text-slate-800' : 'text-slate-200'}>{member.email}</div>
                        <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{member.phone}</div>
                      </td>
                      <td className={`py-3 px-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{member.city || '-'}</td>
                      <td className={`py-3 px-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{member.profession || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      </td>
                      <td className={`py-3 px-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
