# Quick Start Guide

Get the YNM Safety Price Engine & CRM System up and running in minutes!

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment Variables
Create `.env.local` in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 3: Set Up Database
1. Open Supabase SQL Editor
2. Copy contents of `docs/COMPLETE_DATABASE_SETUP.sql`
3. Paste and run
4. Verify with: `SELECT * FROM users;`

### Step 4: Start Development Server
```bash
npm run dev
```

### Step 5: Login
Navigate to `http://localhost:3000` and login with:
- **Admin**: `Admin` / `Admin@123`
- **Employee1**: `Employee1` / `Employee1@123`

## 🎯 What You Get

✅ Complete Price Engine (MBCB, Signages, Paint)
✅ Full CRM System (Accounts, Customers, Leads, Tasks)
✅ Quotation Management with Status Tracking
✅ Activity Tracking & Engagement Scoring
✅ Notifications System
✅ Role-Based Access Control

## 📚 Next Steps

- Read [README.md](../README.md) for full documentation
- Check [FEATURES_OVERVIEW.md](./FEATURES_OVERVIEW.md) for feature list
- See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for API reference

## 🆘 Troubleshooting

**Database connection error?**
- Check `.env.local` has correct Supabase credentials
- Verify Supabase project is active

**Login not working?**
- Verify users exist: `SELECT * FROM users;`
- Check password format matches

**Build errors?**
- Run `npm install` again
- Clear `.next` folder: `rm -rf .next`
- Rebuild: `npm run build`

## 📞 Need Help?

Check the documentation files in `docs/` folder or contact the development team.

