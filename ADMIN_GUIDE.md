# Life OS — Administrator Guide

## Quick Reference

| URL | `https://your-project.pages.dev` |
|---|---|
| Admin Dashboard | `/#/admin` |
| Supabase Dashboard | `https://app.supabase.com` |

---

## Initial Setup Checklist

Before going live, complete these steps in order:

### 1. Create the Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com) and create a new project
2. In the **SQL Editor**, run the full contents of `supabase/schema.sql` from this repository
3. Go to **Project Settings → Edge Functions → Secrets** and add:
   - `ADMIN_EMAIL` = your email address (this designates your admin account)
4. Note your **Project URL** and **anon key** from **Project Settings → API**

### 2. Deploy Edge Functions

Install the Supabase CLI and deploy all functions:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy
```

Or deploy individually:
```bash
supabase functions deploy create-access-request
supabase functions deploy check-status
supabase functions deploy request-otp
supabase functions deploy approve-user
supabase functions deploy reject-user
supabase functions deploy suspend-user
supabase functions deploy reactivate-user
supabase functions deploy revoke-sessions
supabase functions deploy ingest-events
supabase functions deploy start-session
supabase functions deploy end-session
supabase functions deploy update-session
supabase functions deploy admin-list-users
supabase functions deploy admin-user-detail
supabase functions deploy admin-overview-stats
supabase functions deploy admin-product-stats
```

### 3. Configure Supabase Auth

In Supabase Dashboard → **Authentication → Settings**:
- Set **Site URL** to `https://your-project.pages.dev`
- Under **Redirect URLs**, add `https://your-project.pages.dev/**`

### 4. Connect Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Pages → Create a project
2. Connect your GitHub repository
3. Set build command: `npm run build`, output directory: `dist`, Node version: `22`
4. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `VITE_APP_URL` = `https://your-project.pages.dev`
   - `VITE_APP_VERSION` = `1.1.0`

### 5. Sign In as Admin

1. Open `https://your-project.pages.dev`
2. If you see the registration form, click **"Already approved? Sign in →"**
3. Enter your admin email address (the one set as `ADMIN_EMAIL` in Supabase secrets)
4. Check your email for the sign-in code
5. Enter the 6-digit code — you're now signed in as admin

---

## Managing Users

### Approving a Registration

1. Navigate to `/#/admin/users`
2. Click the **Pending** filter tab — new requests appear here
3. Click the **⋮** menu next to the user, then **Approve**
4. The user receives an email invitation immediately
5. Status updates to **Approved**

### Rejecting a Registration

1. Click the **⋮** menu next to a pending user, then **Reject**
2. Optionally enter a reason (not shown to the user, for your records)
3. Status updates to **Rejected**

### Suspending a User

1. Find the user in the directory (use the search bar or Approved filter)
2. Click **⋮ → Suspend**
3. Confirm in the dialog — this immediately signs the user out of all sessions
4. The user sees "Account Suspended" on their next app open

### Reactivating a Suspended User

1. Find the suspended user (use the Suspended filter)
2. Click **⋮ → Reactivate**
3. The user can sign in again immediately

### Revoking Sessions Without Suspension

Use **⋮ → Revoke Sessions** to sign a user out everywhere without changing their account status. Useful if you suspect a compromised session.

---

## Understanding the Analytics Dashboard

### Overview Page (`/#/admin`)

| Metric | Definition |
|---|---|
| **DAU** | Unique users who opened at least one module today |
| **WAU** | Unique users who opened at least one module in the last 7 days |
| **MAU** | Unique users who opened at least one module in the last 30 days |

> Login alone does NOT count toward DAU/WAU/MAU. The user must navigate to a module.

### Individual User Page

Click any user in the Users tab to see:
- **Account timeline**: registration date, approval date, last login, last active
- **Activity heatmap**: 90-day calendar showing activity intensity
- **Module usage**: which parts of the app they use most
- **Feature adoption**: which of the 19 tracked actions they have performed
- **Session history**: each session's start time, duration, and platform

### Product Page (`/#/admin/product`)

| Section | What it shows |
|---|---|
| **Feature adoption** | % of approved users who have used each feature |
| **Module popularity** | Ranked list of most-visited modules |
| **Retention** | % of users who returned on Day 1 / Day 7 / Day 30 |
| **Weekly cohorts** | Retention heatmap by registration week |
| **Platform breakdown** | web vs. iOS PWA vs. Android PWA |

### Retention Definitions

- **Day-1**: % of users with module activity within 2 days of registration
- **Day-7**: % of users with module activity within 2–8 days of registration
- **Day-30**: % of users with module activity within 8–31 days of registration

---

## Adding a Second Administrator

This requires a one-time SQL update in the Supabase dashboard:

1. Go to **Supabase Dashboard → SQL Editor**
2. Run:
```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
WHERE email = 'second-admin@example.com';
```
3. The second admin must sign in once for the JWT to reflect the new role

---

## Known Limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| App bundle at `*.pages.dev` is publicly downloadable | Anyone can read the code, not the data | No personal data in bundle; all data behind Supabase RLS |
| Supabase free tier: 500MB database, 50k MAU | Adequate for small private app | Monitor usage in Supabase dashboard |
| OTP emails from `noreply@mail.supabase.io` may land in spam | Users miss their approval email | Ask users to check spam; consider custom SMTP |
| iOS PWA session end may not fire if app is killed | Session duration shows as estimated | Expected; marked with `is_estimated` in the dashboard |
| URL change from GitHub Pages to Cloudflare Pages | Existing users' IndexedDB data doesn't transfer automatically | Users must export backup on old URL, import on new URL |
| Single admin account via env var | Only one admin | Add second admin via SQL (see above) |
| `localStorage` pending registration state | Clearing browser storage loses pending state | User can re-register; 409 handled gracefully |

---

## Updating iOS Shortcuts

After migrating to Cloudflare Pages, existing iOS Shortcuts using the old GitHub Pages URL need updating:

1. Open **Shortcuts** on iPhone
2. Find your Life OS shortcuts (e.g., "Log expense", "Quick Add")
3. Edit each shortcut
4. Update the URL from `https://deepakjadhav0330.github.io/personal-life-os/#/...`
   to `https://your-project.pages.dev/#/...`

The Settings → iOS Shortcuts page in the app now shows the correct new URLs to copy.

---

## Analytics Privacy Summary

**What the admin can see:**
- User identity (name, email)
- Which modules users open
- Feature actions taken (task created, habit completed, etc.)
- Session timing and duration
- Platform used (web, iOS PWA, Android PWA)

**What the admin cannot see:**
- Task names or descriptions
- Journal entries
- Transaction amounts or descriptions
- Body measurements
- Food logs
- Goal descriptions
- Any other personal record content

All analytics data is stored in Supabase (not shared with any third party). Raw events are retained for 1 year.
