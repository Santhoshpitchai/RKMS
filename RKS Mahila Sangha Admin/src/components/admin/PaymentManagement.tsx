import { AdminLayout } from './AdminLayout';
import { useState, useEffect } from 'react';
import { Download, CreditCard, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface Transaction {
  id: string;
  name: string;
  email: string;
  donor_name?: string;
  donor_email?: string;
  donor_phone?: string;
  type: 'donation' | 'membership' | 'event';
  amount: number;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
  payment_id?: string;
  order_id?: string;
  membership_id?: string;
  purpose?: string;
  pan_number?: string;
  address?: string;
}

export function PaymentManagement() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [filterType, setFilterType] = useState<'all' | 'donation' | 'membership' | 'event'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [filterDonationPurpose, setFilterDonationPurpose] = useState<'all' | 'Scholarship' | 'Health' | 'General' | 'Education'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      toast.error('Please login to access payments');
      return;
    }

    const fetchPayments = async () => {
      try {
        setIsLoading(true);
        const response = await adminApi.getPayments(token, currentPage, 10);
        if (response.success && response.payments) {
          setTransactions(response.payments);
          if (response.pagination) {
            setTotalPages(response.pagination.totalPages || 1);
          }
        } else {
          toast.error('Failed to fetch payments');
        }
      } catch (e) {
        console.error('Error fetching payments:', e);
        toast.error('Failed to fetch payments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [currentPage]);

  const amt = (t: Transaction) => Number(t.amount) || 0;

  const filteredTransactions = transactions.filter((t) => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesPurpose = filterDonationPurpose === 'all' || (t.type === 'donation' && t.purpose === filterDonationPurpose);
    
    const dateObj = new Date(t.created_at);
    const isValidDate = !Number.isNaN(dateObj.getTime());
    const matchesStart = !startDate || (isValidDate && dateObj >= new Date(startDate));
    const matchesEnd = !endDate || (isValidDate && dateObj <= new Date(`${endDate}T23:59:59`));

    return matchesType && matchesStatus && matchesPurpose && matchesStart && matchesEnd;
  });

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + amt(t), 0);
  const totalDonations = filteredTransactions.filter(t => t.type === 'donation').reduce((sum, t) => sum + amt(t), 0);
  const totalMemberships = filteredTransactions.filter(t => t.type === 'membership').reduce((sum, t) => sum + amt(t), 0);
  const totalEventFees = filteredTransactions.filter(t => t.type === 'event').reduce((sum, t) => sum + amt(t), 0);

  const donationByPurpose = {
    Scholarship: filteredTransactions.filter(t => t.type === 'donation' && t.purpose === 'Scholarship').reduce((s, t) => s + amt(t), 0),
    Health: filteredTransactions.filter(t => t.type === 'donation' && t.purpose === 'Health').reduce((s, t) => s + amt(t), 0),
    General: filteredTransactions.filter(t => t.type === 'donation' && (!t.purpose || t.purpose === 'General')).reduce((s, t) => s + amt(t), 0),
    Education: filteredTransactions.filter(t => t.type === 'donation' && t.purpose === 'Education').reduce((s, t) => s + amt(t), 0),
  };

  const handleExport = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [
      ['ID', 'Name', 'Email', 'Type', 'Amount', 'Date', 'Status', 'Payment ID', 'Donation Purpose', 'PAN Number', 'Address'],
      ...filteredTransactions.map((t) => [
        t.id,
        t.name || t.donor_name || 'Guest',
        t.email || t.donor_email || '',
        t.type,
        Number(t.amount) || 0,
        new Date(t.created_at).toLocaleDateString(),
        t.status,
        t.payment_id || '',
        t.type === 'donation' && t.purpose ? t.purpose : '',
        t.type === 'donation' && t.pan_number ? t.pan_number : '',
        t.type === 'donation' && t.address ? t.address : '',
      ]),
    ];
    const csv = rows.map((row) => row.map(esc).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast.success('CSV download started.');
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
              <span>Financial Audit & Accounting</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Payment Management
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Track memberships, donations, and event fees.
            </p>
          </div>

          <button
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export Financial Report (CSV)
          </button>
        </div>

        {/* Financial KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className={`p-5 rounded-2xl border shadow-xl ${
            isLight ? 'bg-white border-cyan-200 text-slate-800' : 'bg-slate-950/80 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent text-white'
          }`}>
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Revenue</span>
            <div className={`text-2xl font-extrabold mt-1 ${isLight ? 'text-cyan-600' : 'text-white'}`}>₹{totalAmount.toLocaleString()}</div>
          </div>
          <div className={`p-5 rounded-2xl border shadow-xl ${
            isLight ? 'bg-white border-emerald-200 text-slate-800' : 'bg-slate-950/80 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent text-white'
          }`}>
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Donations</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">₹{totalDonations.toLocaleString()}</div>
          </div>
          <div className={`p-5 rounded-2xl border shadow-xl ${
            isLight ? 'bg-white border-blue-200 text-slate-800' : 'bg-slate-950/80 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent text-white'
          }`}>
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Membership Fees</span>
            <div className="text-2xl font-extrabold text-blue-600 mt-1">₹{totalMemberships.toLocaleString()}</div>
          </div>
          <div className={`p-5 rounded-2xl border shadow-xl ${
            isLight ? 'bg-white border-purple-200 text-slate-800' : 'bg-slate-950/80 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent text-white'
          }`}>
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Event Registrations</span>
            <div className="text-2xl font-extrabold text-purple-600 mt-1">₹{totalEventFees.toLocaleString()}</div>
          </div>
        </div>

        {/* Donation Purpose Chips */}
        {(filterType === 'all' || filterType === 'donation') && (
          <div className={`p-5 rounded-2xl border shadow-xl space-y-3 transition-colors ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-slate-800'
          }`}>
            <h4 className={`font-bold text-xs uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Donations by Welfare Cause
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className={`font-semibold block text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Scholarship Fund</span>
                <span className="font-extrabold text-purple-600 text-sm">₹{donationByPurpose.Scholarship.toLocaleString()}</span>
              </div>
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className={`font-semibold block text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Community Healthcare</span>
                <span className="font-extrabold text-rose-600 text-sm">₹{donationByPurpose.Health.toLocaleString()}</span>
              </div>
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className={`font-semibold block text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Youth Education</span>
                <span className="font-extrabold text-cyan-600 text-sm">₹{donationByPurpose.Education.toLocaleString()}</span>
              </div>
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className={`font-semibold block text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>General Sangha Welfare</span>
                <span className="font-extrabold text-emerald-600 text-sm">₹{donationByPurpose.General.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className={`p-5 rounded-2xl border shadow-xl text-xs transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-white'
        }`}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Transaction Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className={`w-full rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                }`}
              >
                <option value="all">All Types</option>
                <option value="donation">Donations</option>
                <option value="membership">Memberships</option>
                <option value="event">Event Fees</option>
              </select>
            </div>
            <div>
              <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Payment Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className={`w-full rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                }`}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                }`}
              />
            </div>
            <div>
              <label className={`block font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                }`}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterType('all');
                  setFilterStatus('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className={`w-full py-2 rounded-xl border font-semibold transition-colors ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className={`rounded-2xl border overflow-hidden shadow-xl transition-colors ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className={`p-4 border-b flex justify-between items-center ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h3 className={`font-bold text-sm flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <CreditCard className="w-4 h-4 text-cyan-500" />
              Transactions ({filteredTransactions.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading payments...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-left text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <thead className={`uppercase text-[10px] font-bold tracking-wider border-b ${
                  isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-900/80 text-slate-400 border-slate-800'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Payer Name & Email</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Payment Ref</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/50'}`}>
                      <td className={`py-3.5 px-4 font-mono font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>#{tx.id}</td>
                      <td className={`py-3.5 px-4 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <div>{tx.name || tx.donor_name || 'Guest User'}</div>
                        <div className={`text-[11px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{tx.email || tx.donor_email || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4 capitalize font-bold text-cyan-600">{tx.type}</td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-600">₹{amt(tx).toLocaleString()}</td>
                      <td className={`py-3.5 px-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{tx.payment_id || tx.order_id || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`p-4 border-t flex justify-between items-center text-xs ${
              isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
            }`}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50 flex items-center gap-1 ${
                  isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50 flex items-center gap-1 ${
                  isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
