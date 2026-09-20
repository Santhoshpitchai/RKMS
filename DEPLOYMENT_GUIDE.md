# RKS Mahila Sangha — Complete Deployment Guide

This guide walks through deploying all three parts of the project:
- **Backend API** (Node.js / Express)
- **Main Website** (React + Vite)
- **Admin Portal** (React + Vite)

---

## 📦 What's in the ZIP

| Folder | Description |
|--------|-------------|
| `backend/` | Express API server + Supabase integration |
| `RKS Mahila Sangha/` | Public-facing membership & donation website |
| `RKS Mahila Sangha Admin/` | Admin portal for managing members, events, settings |
| `backend/database/supabase_schema.sql` | Full database schema to run in Supabase |
| `DEPLOYMENT_GUIDE.md` | This file |

> ⚠️ **node_modules is NOT included.** You must run `npm install` in each folder before starting.

---

## ✅ Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] A [Supabase](https://supabase.com/) account and project created
- [ ] A [Razorpay](https://razorpay.com/) account with API keys
- [ ] An SMTP email account (Gmail App Password recommended) for OTP emails
- [ ] A hosting provider for the backend (Render, Railway, or a VPS)
- [ ] A hosting provider for the frontends (Vercel or Netlify)

---

## 1. Supabase Database Setup

1. Sign up / log in at [Supabase Dashboard](https://supabase.com/).
2. Create a new project named `RKS Mahila Sangha`.
3. Open **SQL Editor** from the left sidebar.
4. Open the file `backend/database/supabase_schema.sql`.
5. Copy its entire content, paste it into the SQL Editor, and click **Run**.
6. Go to **Project Settings → API** and copy:
   - **Project URL** → e.g. `https://abcxyz.supabase.co`
   - **service_role API Key** (use this in the backend, NOT the anon key)

---

## 2. Razorpay Payment Gateway Setup

1. Sign up / log in at [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Use **Test Mode** while testing; switch to **Live Mode** for production.
3. Go to **Account & Settings → API Keys → Generate Key**.
4. Save your **Key ID** (`rzp_test_...` or `rzp_live_...`) and **Key Secret**.

---

## 3. Email (SMTP) Setup for OTPs

The backend sends OTP emails for:
- Admin password reset
- Creating a new admin account

**Recommended: Gmail App Password**

1. Enable 2-Step Verification on your Google account.
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Generate an App Password for "Mail".
4. Use these values in the backend `.env`:

```env
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password
```

---

## 4. Backend Setup & Deployment

### Step 1 — Install Dependencies

```bash
cd backend
npm install
```

### Step 2 — Configure Environment Variables

Create/update `backend/.env` with the following:

```env
PORT=5001
NODE_ENV=production

# JWT
JWT_SECRET=your_strong_random_jwt_secret_here

# Supabase
SUPABASE_URL=https://[your-project-id].supabase.co
SUPABASE_KEY=your_supabase_service_role_key

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# SMTP Email (for OTPs)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password

# CORS — comma-separated list of allowed frontend URLs
CORS_ORIGIN=https://your-main-website.com,https://your-admin-portal.com
```

> ⚠️ **CORS_ORIGIN must exactly match your deployed frontend URLs** (no trailing slash).

### Step 3 — Start the Backend

```bash
npm start
```

The server runs on `http://localhost:5001` by default.

**For production hosting (Render / Railway):**
- Point the start command to `npm start`
- Set all the above environment variables in the hosting dashboard
- Note the public backend URL — you'll need it for the frontend `.env`

---

## 5. Main Website (RKS Mahila Sangha) Deployment

### Step 1 — Install Dependencies

```bash
cd "RKS Mahila Sangha"
npm install
```

### Step 2 — Configure Environment Variables

Create `RKS Mahila Sangha/.env`:

```env
VITE_API_URL=https://your-backend-url.onrender.com/api
```

> Replace `https://your-backend-url.onrender.com` with the actual deployed backend URL.

### Step 3 — Build for Production

```bash
npm run build
```

This generates the `dist/` folder.

### Step 4 — Deploy

**Vercel / Netlify settings:**
- **Root Directory**: `RKS Mahila Sangha`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: `VITE_API_URL` = your backend URL + `/api`

---

## 6. Admin Portal (RKS Mahila Sangha Admin) Deployment

### Step 1 — Install Dependencies

```bash
cd "RKS Mahila Sangha Admin"
npm install
```

### Step 2 — Configure Environment Variables

Create `RKS Mahila Sangha Admin/.env`:

```env
VITE_API_URL=https://your-backend-url.onrender.com/api
```

### Step 3 — Build for Production

```bash
npm run build
```

### Step 4 — Deploy

**Vercel / Netlify settings:**
- **Root Directory**: `RKS Mahila Sangha Admin`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: `VITE_API_URL` = your backend URL + `/api`

> 💡 Deploy to a **separate** Vercel/Netlify project from the main website.

---

## 7. First Login — Admin Account

The first admin account must be created directly in the Supabase database:

1. Open Supabase → **Table Editor** → `admin_users` table.
2. Insert a new row:
   - `username`: your admin username (e.g. `admin`)
   - `password_hash`: use bcrypt to hash your password (rounds = 10)
   - `email`: your admin email
   - `is_active`: `true`

**Quick bcrypt hash generator (Node.js):**

```js
const bcrypt = require('bcrypt');
bcrypt.hash('your_password', 10).then(console.log);
```

Run `node -e "require('bcrypt').hash('your_password',10).then(console.log)"` inside the `backend/` folder.

3. Paste the hash into Supabase as `password_hash`.
4. Log in at the Admin Portal with those credentials.

> After logging in, you can create additional admin accounts from **Settings → Admin Accounts** inside the portal.

---

## 8. Post-Deployment Verification Checklist

After deploying, verify these work end-to-end:

- [ ] Backend health: visit `https://your-backend-url/api/health` → should return `{ "status": "ok" }`
- [ ] Admin login works with credentials
- [ ] Admin can create a new admin account (OTP email received)
- [ ] Main website loads events and settings from backend
- [ ] Membership form submits successfully
- [ ] Razorpay donation payment completes
- [ ] Donation receipt PDF downloads correctly
- [ ] Membership card displays correctly on member dashboard

---

## 9. How Live Updates Work

- All content (events, settings, membership fees, donation goals) is stored in **Supabase**.
- The admin portal updates Supabase directly via the backend API.
- The main website fetches data in real-time — **no frontend redeployment needed** when admins make changes.

---

## 10. Troubleshooting

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| `CORS error` in browser | `CORS_ORIGIN` in backend `.env` doesn't match frontend URL | Update `CORS_ORIGIN` exactly |
| OTP emails not arriving | Wrong `EMAIL_USER` / `EMAIL_PASS` | Re-generate Gmail App Password |
| Razorpay payment fails | Wrong API keys or Test/Live mismatch | Check Key ID prefix (`rzp_test_` vs `rzp_live_`) |
| 401 Unauthorized on API | `JWT_SECRET` mismatch between sessions | Keep `JWT_SECRET` consistent |
| DB errors on startup | Schema not applied | Re-run `supabase_schema.sql` in SQL Editor |
| Frontend shows blank page | Wrong `VITE_API_URL` | Ensure it ends with `/api` and has no trailing slash issues |
