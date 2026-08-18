import { useState, useEffect } from 'react';
import { Settings, CreditCard, DollarSign, Building, Sparkles, Save, Plus, Trash2, ShieldCheck, UserPlus, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../services/api';
import { AdminLayout } from './AdminLayout';
import { useTheme } from '../../context/ThemeContext';

interface SettingsData {
  membershipFee: number;
  donationSuggestions: number[];
  contactEmail: string;
  organizationName: string;
  defaultEventPrice: number;
  razorpayKeyId: string;
  emailUser: string;
}

interface AdminUser {
  id: number | string;
  username: string;
  created_at?: string;
}

export function SettingsManagement() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [settings, setSettings] = useState<SettingsData>({
    membershipFee: 1001,
    donationSuggestions: [500, 1000, 2500, 5000, 10000],
    contactEmail: 'info@rksmahilavedike.org',
    organizationName: 'Raju Kshatriya Mahila Sangha',
    defaultEventPrice: 0,
    razorpayKeyId: '',
    emailUser: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState<number | string | null>(null);

  const fetchAdminUsers = async () => {
    try {
      setIsLoadingAdmins(true);
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const res = await adminApi.getAllAdmins(token);
      if (res.success && res.admins) {
        setAdminUsers(res.admins);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await adminApi.getSettings();
        if (response.success && response.settings) {
          setSettings((prev) => ({
            ...prev,
            ...response.settings,
          }));
        }
      } catch (e) {
        console.warn('Settings fetch warning:', e);
      }
    };

    fetchSettings();
    fetchAdminUsers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: name === 'membershipFee' || name === 'defaultEventPrice' ? parseFloat(value) || 0 : value
    }));
  };

  const handleDonationSuggestionChange = (index: number, value: string) => {
    const newSuggestions = [...settings.donationSuggestions];
    newSuggestions[index] = parseFloat(value) || 0;
    setSettings((prev) => ({ ...prev, donationSuggestions: newSuggestions }));
  };

  const addDonationSuggestion = () => {
    setSettings((prev) => ({
      ...prev,
      donationSuggestions: [...prev.donationSuggestions, 1000]
    }));
  };

  const removeDonationSuggestion = (index: number) => {
    if (settings.donationSuggestions.length > 1) {
      const newSuggestions = settings.donationSuggestions.filter((_, i) => i !== index);
      setSettings((prev) => ({ ...prev, donationSuggestions: newSuggestions }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        toast.error('Admin authentication token missing');
        return;
      }
      const response = await adminApi.updateSettings(token, settings);
      if (response.success) {
        toast.success('Settings updated successfully!');
      } else {
        toast.error('Failed to update settings');
      }
    } catch (e) {
      toast.error('Error updating settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.username || !newAdmin.password) {
      toast.error('Please enter username and password');
      return;
    }
    setIsCreatingAdmin(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        toast.error('Admin authentication token missing');
        return;
      }
      const response = await adminApi.register(token, newAdmin);
      if (response.success) {
        toast.success(`Admin user "${newAdmin.username}" created successfully!`);
        setNewAdmin({ username: '', password: '' });
        fetchAdminUsers();
      } else {
        toast.error(response.message || 'Failed to create admin user');
      }
    } catch (err) {
      console.error('Error creating admin:', err);
      toast.error('Failed to create admin user');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (adminId: number | string, adminUsername: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete admin "${adminUsername}" from the database?`)) {
      return;
    }
    setDeletingAdminId(adminId);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        toast.error('Admin authentication token missing');
        return;
      }
      const response = await adminApi.deleteAdmin(token, adminId);
      if (response.success) {
        toast.success(`Admin "${adminUsername}" removed from database.`);
        fetchAdminUsers();
      } else {
        toast.error(response.message || 'Failed to delete admin account');
      }
    } catch (err) {
      console.error('Error deleting admin:', err);
      toast.error('Failed to delete admin account');
    } finally {
      setDeletingAdminId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        
        {/* Header */}
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl border shadow-xl transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
        }`}>
          <div>
            <div className="flex items-center gap-2 text-cyan-500 text-xs font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Platform Control Panel</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Global System Settings
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Configure organization branding, membership pricing, and manage admin accounts.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>

        {/* Administrator Account Management Card */}
        <div className={`p-6 rounded-2xl border shadow-xl space-y-6 text-xs transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-slate-300'
        }`}>
          <div className={`flex justify-between items-center border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h3 className={`font-bold text-sm flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <ShieldCheck className="w-4 h-4 text-cyan-500" />
              Manage Administrator Accounts
            </h3>
            <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Admins: {adminUsers.length}</span>
          </div>

          {/* Existing Admin Accounts Table */}
          <div className="space-y-2">
            <h4 className={`font-semibold uppercase tracking-wider text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
              Registered Admin Users in DB
            </h4>
            
            {isLoadingAdmins ? (
              <div className="p-4 text-center text-slate-400 text-xs">Loading admin accounts...</div>
            ) : adminUsers.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">No admin accounts found in DB.</div>
            ) : (
              <div className={`divide-y rounded-xl border overflow-hidden ${
                isLight ? 'bg-slate-50 border-slate-200 divide-slate-200' : 'bg-slate-900/60 border-slate-800 divide-slate-800/60'
              }`}>
                {adminUsers.map((u) => (
                  <div key={u.id} className={`p-3 flex items-center justify-between transition-colors ${isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-900/80'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 font-bold flex items-center justify-center text-xs">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className={`font-bold text-xs flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {u.username}
                          <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> SMTP Verified
                          </span>
                        </div>
                        <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>ID: #{u.id} {u.created_at ? `• Added ${new Date(u.created_at).toLocaleDateString()}` : ''}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteAdmin(u.id, u.username)}
                      disabled={deletingAdminId === u.id}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                      title="Delete Admin from Database"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      {deletingAdminId === u.id ? 'Deleting...' : 'Delete Admin'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Admin Form */}
          <form onSubmit={handleCreateAdmin} className={`space-y-4 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h4 className={`font-semibold uppercase tracking-wider text-[10px] ${isLight ? 'text-slate-900' : 'text-white'}`}>Add New Administrator</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">New Admin Username / Email</label>
                <input
                  type="text"
                  value={newAdmin.username}
                  onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                  placeholder="e.g. manager@rksmahila.org"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Password</label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  placeholder="Set a strong password"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isCreatingAdmin}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {isCreatingAdmin ? 'Creating Administrator...' : 'Create New Administrator'}
              </button>
            </div>
          </form>
        </div>

        <div className="grid md:grid-cols-2 gap-6 text-xs">
          
          {/* Organization Settings */}
          <div className={`p-6 rounded-2xl border shadow-xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-slate-300'
          }`}>
            <h3 className={`font-bold text-sm flex items-center gap-2 border-b pb-3 ${
              isLight ? 'border-slate-200 text-slate-900' : 'border-slate-800 text-white'
            }`}>
              <Building className="w-4 h-4 text-cyan-500" />
              Organization Identity
            </h3>

            <div>
              <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Official Organization Name</label>
              <input
                type="text"
                name="organizationName"
                value={settings.organizationName}
                onChange={handleInputChange}
                className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                }`}
              />
            </div>

            <div>
              <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Primary Contact Email</label>
              <input
                type="email"
                name="contactEmail"
                value={settings.contactEmail}
                onChange={handleInputChange}
                className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                }`}
              />
            </div>
          </div>

          {/* Payment & Fees */}
          <div className={`p-6 rounded-2xl border shadow-xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-slate-300'
          }`}>
            <h3 className={`font-bold text-sm flex items-center gap-2 border-b pb-3 ${
              isLight ? 'border-slate-200 text-slate-900' : 'border-slate-800 text-white'
            }`}>
              <CreditCard className="w-4 h-4 text-cyan-500" />
              Pricing & Default Fees
            </h3>

            <div>
              <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Lifetime Membership Fee (₹)</label>
              <input
                type="number"
                name="membershipFee"
                value={settings.membershipFee}
                onChange={handleInputChange}
                className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                }`}
              />
            </div>

            <div>
              <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Default Event Ticket Fee (₹)</label>
              <input
                type="number"
                name="defaultEventPrice"
                value={settings.defaultEventPrice}
                onChange={handleInputChange}
                className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                }`}
              />
            </div>
          </div>

        </div>

        {/* Donation Suggestions */}
        <div className={`p-6 rounded-2xl border shadow-xl space-y-4 text-xs transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-slate-300'
        }`}>
          <div className={`flex justify-between items-center border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h3 className={`font-bold text-sm flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <DollarSign className="w-4 h-4 text-cyan-500" />
              Public Donation Suggestions (₹)
            </h3>
            <button
              onClick={addDonationSuggestion}
              className={`px-3 py-1.5 rounded-xl text-cyan-600 font-bold flex items-center gap-1 transition-colors border ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-cyan-400'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Add Preset
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {settings.donationSuggestions.map((suggestion, index) => (
              <div key={index} className={`flex items-center gap-2 p-2 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <input
                  type="number"
                  value={suggestion}
                  onChange={(e) => handleDonationSuggestionChange(index, e.target.value)}
                  className={`w-full bg-transparent font-extrabold px-2 focus:outline-none text-sm ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                />
                <button
                  onClick={() => removeDonationSuggestion(index)}
                  disabled={settings.donationSuggestions.length <= 1}
                  className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* API Credentials */}
        <div className={`p-6 rounded-2xl border shadow-xl space-y-4 text-xs transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-slate-300'
        }`}>
          <h3 className={`font-bold text-sm flex items-center gap-2 border-b pb-3 ${
            isLight ? 'border-slate-200 text-slate-900' : 'border-slate-800 text-white'
          }`}>
            <Settings className="w-4 h-4 text-cyan-500" />
            Integrations & API Gateways
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Razorpay Key ID</label>
              <input
                type="text"
                name="razorpayKeyId"
                value={settings.razorpayKeyId}
                onChange={handleInputChange}
                placeholder="rzp_test_..."
                className={`w-full rounded-xl px-4 py-2.5 font-mono focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                }`}
              />
            </div>
            <div>
              <label className={`block font-semibold mb-1.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>SMTP Email Username</label>
              <input
                type="text"
                name="emailUser"
                value={settings.emailUser}
                onChange={handleInputChange}
                placeholder="smtp@rksmahila.org"
                className={`w-full rounded-xl px-4 py-2.5 font-mono focus:outline-none focus:border-cyan-500 border ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                }`}
              />
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
