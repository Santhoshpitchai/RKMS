# RKS Mahila Sangha - Multi-URL Deployment & Supabase Setup Guide

This guide details how to set up **Supabase PostgreSQL**, configure **Razorpay Payment Gateway**, and deploy the **Main Website**, **Admin Portal**, and **Backend Server** to separate URLs.

---

## 1. Supabase Database Setup

1. Sign up/log in at [Supabase Dashboard](https://supabase.com/).
2. Create a new project named `RKS Mahila Sangha`.
3. Open **SQL Editor** from the left menu.
4. Open the SQL script file: [`backend/database/supabase_schema.sql`](file:///Users/santhoshpitchai/Downloads/RKMS-Website-master/backend/database/supabase_schema.sql).
5. Copy its entire content, paste it into the Supabase SQL Editor, and click **Run**.
6. Go to **Project Settings -> API** and copy:
   - **Project URL** (`https://[project-id].supabase.co`)
   - **anon / service_role API Key**

---

## 2. Razorpay Payment Gateway Setup

1. Sign up/log in at [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Switch to **Test Mode** (or **Live Mode** when going to production).
3. Navigate to **Account & Settings -> API Keys** and click **Generate Key**.
4. Save your **Key ID** (`rzp_test_...` or `rzp_live_...`) and **Key Secret**.

---

## 3. Backend Deployment (Render / Railway / Vercel)

Deploy the [`backend`](file:///Users/santhoshpitchai/Downloads/RKMS-Website-master/backend) folder to your preferred backend host (e.g., Render Web Service).

### Environment Variables for Backend:
```env
PORT=5001
JWT_SECRET=your_custom_jwt_secret_key_2026
SUPABASE_URL=https://[your-project-id].supabase.co
SUPABASE_KEY=your_supabase_service_role_key
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
CORS_ORIGIN=https://rksmahilavedike.org,https://admin.rksmahilavedike.org
```

**Example Backend URL**: `https://rks-backend-api.onrender.com`

---

## 4. Main Website Deployment (Vercel / Netlify)

Deploy the [`RKS Mahila Sangha`](file:///Users/santhoshpitchai/Downloads/RKMS-Website-master/RKS%20Mahila%20Sangha) folder to Vercel or Netlify.

### Build Settings:
- **Framework Preset**: Vite
- **Root Directory**: `RKS Mahila Sangha`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Environment Variables:
```env
VITE_API_URL=https://rks-backend-api.onrender.com/api
```

**Example Website URL**: `https://rksmahilavedike.org` or `https://rks-mahila.vercel.app`

---

## 5. Admin Portal Deployment (Vercel / Netlify)

Deploy the [`RKS Mahila Sangha Admin`](file:///Users/santhoshpitchai/Downloads/RKMS-Website-master/RKS%20Mahila%20Sangha%20Admin) folder to a separate Vercel or Netlify project.

### Build Settings:
- **Framework Preset**: Vite
- **Root Directory**: `RKS Mahila Sangha Admin`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Environment Variables:
```env
VITE_API_URL=https://rks-backend-api.onrender.com/api
```

**Example Admin URL**: `https://admin.rksmahilavedike.org` or `https://rks-admin.vercel.app`

---

## 6. How Dynamic Admin Updates Work

- **Live Content Sync**: When an admin logs in at the Admin URL and creates/edits an event or changes membership fees/donation settings, the backend writes directly to Supabase.
- The Public Website instantly fetches the updated data from `/api/settings/public` and `/api/events` without requiring code redeployment.
