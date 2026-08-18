# RKS Mahila Sangha - Clean Project Structure

## Project Overview
- Lightweight local setup
- Backend + Frontend + Admin portal
- Local database: MySQL

## Folder Structure

```
RKS/
├── backend/                    # Node.js API Server
│   ├── controllers/            # API Controllers
│   ├── models/                 # Data models
│   ├── routes/                 # API Routes
│   ├── services/               # Business Logic
│   ├── database/               # MySQL connection + schema
│   └── package.json
├── RKS Mahila Sangha/          # React Frontend
│   ├── src/
│   │   ├── components/         # React Components
│   │   ├── services/           # API Services
│   │   └── assets/             # Images/Icons
│   └── package.json
├── RKS Mahila Sangha Admin/    # React Admin Portal
│   ├── src/
│   │   ├── components/         # Admin Components
│   │   └── services/           # API Services
│   └── package.json
├── setup-lightweight.bat       # One-click setup
└── .gitignore                 # Git ignore rules
```

## Quick Start

1. **Setup Dependencies**: Run `setup-lightweight.bat`
2. **Create database**: `rks_mahila_sangha`
3. **Import schema**: `backend/database/schema.sql`
4. **Start Services**:
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd "RKS Mahila Sangha" && npm run dev`
   - Admin: `cd "RKS Mahila Sangha Admin" && npm run dev`

## Notes
- Keep `image_url` in DB (not hardcoded local disk paths).
- Use local uploads now and switch to Cloudinary later.
- Keep Razorpay and email integration for production phase.
