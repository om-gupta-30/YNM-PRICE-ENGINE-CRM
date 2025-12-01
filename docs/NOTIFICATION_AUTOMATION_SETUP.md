# Notification Automation Setup Guide

## Who Updates the Notifications Table?

The notifications table is automatically updated by **scheduled cron jobs** that run daily. Here are the options:

## Option 1: Vercel Cron Jobs (Recommended for Vercel Deployments)

If you're deploying on Vercel, the `vercel.json` file is already configured:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-notifications",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**This automatically runs every day at 9:00 AM UTC** and updates the notifications table.

### Setup Steps:
1. Deploy to Vercel
2. The cron job will automatically be registered
3. Check Vercel dashboard → Cron Jobs to verify it's running

## Option 2: External Cron Service (For Any Hosting)

Use a free cron service like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com):

1. Sign up for a cron service
2. Create a new cron job:
   - **URL**: `https://your-domain.com/api/cron/generate-notifications`
   - **Schedule**: Daily at 9:00 AM (or your preferred time)
   - **Method**: GET
3. Save and activate

### Security (Optional):
Add a `CRON_SECRET` environment variable and the cron service will need to include it:
- **Header**: `Authorization: Bearer YOUR_SECRET_KEY`

## Option 3: GitHub Actions (For GitHub Deployments)

Create `.github/workflows/generate-notifications.yml`:

```yaml
name: Generate Follow-up Notifications

on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Notifications
        run: |
          curl -X GET https://your-domain.com/api/cron/generate-notifications
```

## Option 4: Server Cron Job (For Self-Hosted)

If you have server access, add to crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 9 AM)
0 9 * * * curl -X GET https://your-domain.com/api/cron/generate-notifications
```

## Option 5: Manual Trigger (Admin Dashboard)

Admins can also manually trigger notification generation:
1. Go to CRM Dashboard
2. Click "🔔 Generate Follow-up Notifications" button
3. Notifications are created immediately

## Current Status

**Right now, notifications are generated:**
- ✅ Automatically when admin loads dashboard (once per day)
- ✅ Manually via admin button
- ⚠️ **NOT automatically via cron** (you need to set up one of the options above)

## Recommended Setup

**For Production:**
1. Use **Vercel Cron Jobs** (if on Vercel) - already configured in `vercel.json`
2. Or use **External Cron Service** - set up on cron-job.org

**For Development:**
- Use the manual button in admin dashboard
- Or call the API directly: `POST /api/notifications/generate-followups`

## Testing

To test the cron endpoint:
```bash
curl -X GET http://localhost:3000/api/cron/generate-notifications
```

## Environment Variables

Optional (for security):
```
CRON_SECRET=your-secret-key-here
```

If set, cron requests must include: `Authorization: Bearer your-secret-key-here`

---

**Next Steps:**
1. Choose one of the automation options above
2. Set it up according to your hosting provider
3. Verify it's working by checking the notifications table after the scheduled time
