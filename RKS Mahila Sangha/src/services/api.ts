export const API_BASE_URL = 
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5001/api'
    : (import.meta.env.VITE_API_URL || '/api');

/** API host only (no `/api`), for static files like `/uploads/...` */
export const getApiOrigin = (): string => API_BASE_URL.replace(/\/api\/?$/, '');

/** Turn stored DB paths into full URLs when needed */
export const resolveBackendAssetUrl = (url?: string | null): string => {
  if (!url) return '';
  const u = String(url).trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:image/')) return u;
  return u.startsWith('/') ? `${getApiOrigin()}${u}` : `${getApiOrigin()}/${u}`;
};

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  receipt?: {
    downloadUrl: string;
    filename: string;
  };
  settings?: T;
  member?: T;
  payment?: T;
  order?: any;
  razorpayKeyId?: string;
  amount?: number;
  memberData?: any;
  donorData?: any;
  events?: T[];
  members?: T[];
  payments?: T[];
  stats?: any;
  recentMembers?: any[];
  recentPayments?: any[];
  pagination?: any;
  membership_id?: string;
}

// Settings API
export const settingsApi = {
  getPublicSettings: async () => {
    const response = await fetch(`${API_BASE_URL}/settings/public`);
    return response.json() as Promise<ApiResponse<{
      membershipFee: number;
      donationSuggestions: number[];
      contactEmail: string;
      organizationName: string;
    }>>;
  },
};

// Membership API
export const membershipApi = {
  getStatus: async (email: string) => {
    const token = localStorage.getItem('userToken');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/membership/status?email=${encodeURIComponent(email)}`, { headers });
    return response.json() as Promise<ApiResponse<any> & { exists?: boolean; member?: any; payments?: any[] }>;
  },

  createOrder: async (memberData: {
    name: string;
    guardianName: string;
    gotraName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    educationalQualification: string;
    profession: string;
    maritalStatus: string;
    bloodGroup: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    aadharNumber?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/membership/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  verifyPayment: async (paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    name: string;
    guardianName: string;
    gotraName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    educationalQualification: string;
    profession: string;
    maritalStatus: string;
    bloodGroup: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    aadharNumber?: string;
    photo?: File;
  }) => {
    const formData = new FormData();
    
    // Add all text fields
    Object.keys(paymentData).forEach(key => {
      if (key !== 'photo' && paymentData[key as keyof typeof paymentData] !== undefined) {
        formData.append(key, paymentData[key as keyof typeof paymentData] as string);
      }
    });

    // Add photo file if present
    if (paymentData.photo) {
      formData.append('photo', paymentData.photo);
    }

    const response = await fetch(`${API_BASE_URL}/membership/verify-payment`, {
      method: 'POST',
      body: formData, // Use FormData for file upload support
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  updateDetails: async (updateData: {
    email: string;
    name?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    guardianName?: string;
    gotraName?: string;
    dateOfBirth?: string;
    profession?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    photo?: File;
  }) => {
    const token = localStorage.getItem('userToken');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (updateData.photo) {
      const formData = new FormData();
      Object.keys(updateData).forEach(key => {
        if (key !== 'photo' && updateData[key as keyof typeof updateData] !== undefined) {
          formData.append(key, updateData[key as keyof typeof updateData] as string);
        }
      });
      formData.append('photo', updateData.photo);
      const response = await fetch(`${API_BASE_URL}/membership/update`, {
        method: 'PUT',
        headers,
        body: formData,
      });
      return response.json() as Promise<ApiResponse<any>>;
    }

    const response = await fetch(`${API_BASE_URL}/membership/update`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  cancel: async (email: string) => {
    const token = localStorage.getItem('userToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/membership/cancel`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ email }),
    });
    return response.json() as Promise<ApiResponse<any>>;
  },
};

// Donation API
export const donationApi = {
  createOrder: async (donorData: {
    amount: number;
    name: string;
    email: string;
    phone: string;
    purpose: string;
    panNumber: string;
    address: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/donation/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(donorData),
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  verifyPayment: async (paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    amount: number;
    name: string;
    email: string;
    phone: string;
    purpose: string;
    panNumber: string;
    address: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/donation/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });
    return response.json() as Promise<ApiResponse<any>>;
  },
};

// Payment Common API
export const paymentApi = {
  cancelOrder: async (orderId: string, reason?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, reason }),
      });
      return response.json() as Promise<ApiResponse<any>>;
    } catch (e) {
      console.warn('Payment cancel request warning:', e);
      return { success: false };
    }
  },
};

// Events API
export const eventsApi = {
  getEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/events`);
    return response.json() as Promise<ApiResponse<any[]>>;
  },
  createOrder: async (eventId: number, payload: {
    numberOfAttendees: number;
    name: string;
    email: string;
    phone: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json() as Promise<ApiResponse<any>>;
  },
  registerEvent: async (eventId: number, payload: {
    name: string;
    email: string;
    phone?: string;
    numberOfAttendees?: number;
    guestNames?: string;
    membershipId?: string;
    paymentStatus?: 'pending' | 'completed' | 'failed';
    paymentAmount?: number;
    paymentId?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json() as Promise<ApiResponse<any>>;
  },
  cancelRegistration: async (registrationDbId: number) => {
    const token = localStorage.getItem('userToken');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/events/registration/${registrationDbId}?by=member`, {
      method: 'DELETE',
      headers,
    });
    return response.json() as Promise<ApiResponse<any>>;
  },
};


// Contact API
export const contactApi = {
  submitContact: async (contactData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    });
    return response.json() as Promise<ApiResponse<any>>;
  },
};

// Admin API
export const adminApi = {
  login: async (credentials: { username: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return response.json() as Promise<ApiResponse<{
      token: string;
      admin: { id: string; username: string };
    }>>;
  },

  getDashboard: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  getMembers: async (token: string, page = 1, limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/admin/members?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  getPayments: async (token: string, page = 1, limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/admin/payments?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  getSettings: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  updateSettings: async (token: string, settings: any) => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });
    return response.json() as Promise<ApiResponse<any>>;
  },
};

// Visitor User Auth API
export const userApi = {
  register: async (payload: { name: string; email: string; phone?: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json() as Promise<ApiResponse<{ token?: string; user?: any; requiresVerification?: boolean; email?: string }>>;
  },

  verifyOtp: async (payload: { email: string; otp: string }) => {
    const response = await fetch(`${API_BASE_URL}/user/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json() as Promise<ApiResponse<{ token: string; user: any }>>;
  },

  resendOtp: async (payload: { email: string }) => {
    const response = await fetch(`${API_BASE_URL}/user/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  login: async (credentials: { email: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return response.json() as Promise<ApiResponse<{ token?: string; user?: any; requiresVerification?: boolean; email?: string }>>;
  },

  getProfile: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.json() as Promise<ApiResponse<{ user: any }>>;
  },

  getHistory: async (token?: string | null, email?: string | null) => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    const response = await fetch(`${API_BASE_URL}/user/history${query}`, { headers });
    return response.json() as Promise<ApiResponse<any> & {
      membership?: any;
      donations?: any[];
      eventRegistrations?: any[];
    }>;
  },

  forgotPassword: async (payload: { email: string }) => {
    const response = await fetch(`${API_BASE_URL}/user/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  resetPassword: async (payload: { email: string; otp: string; newPassword: string }) => {
    const response = await fetch(`${API_BASE_URL}/user/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json() as Promise<ApiResponse<any>>;
  },
};

