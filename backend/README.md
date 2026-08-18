# RKS Backend API

Local backend for RKS membership, donation, events, and admin modules.

## Current Local Demo Scope

- Database: MySQL (local)
- Image handling: local uploads
- Payment flow: simulated for development
- Email + Razorpay + Cloudinary: planned for production phase

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=rks_mahila_sangha
JWT_SECRET=your_jwt_secret_key
PORT=5000
NODE_ENV=development
```

3. Create DB and import schema:
```bash
# import backend/database/schema.sql into MySQL
```

4. Run backend:
```bash
npm run dev
```

## Notes

- Store image reference as `image_url`.
- Keep upload logic behind a single service function, so moving to Cloudinary later is easy.
