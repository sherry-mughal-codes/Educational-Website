# Google Analytics 4 (GA4) - Human Owner Setup Guide

This guide walks the property owner step-by-step through configuring live Google Analytics 4 tracking for the FBISE Educational Platform.

---

## 1. Owner Prerequisite: Google Account
Google Analytics property creation is an account-owner task. You will need your own Google account (e.g. Gmail or Google Workspace).

---

## 2. Step-by-Step GA4 Setup

### Step A: Access Google Analytics
1. Navigate to [https://analytics.google.com/](https://analytics.google.com/) and sign in with your Google account.
2. If this is your first time using Google Analytics, click **Start measuring**.
3. Under **Account setup**, enter an account name (e.g. `FBISE Educational Platform`).
4. Select your data-sharing preferences and click **Next**.

### Step B: Create Property
1. Enter **Property name**: `FBISE Notes & Model Papers`.
2. Set reporting time zone to **Pakistan (PKT / GMT+5)**.
3. Set currency to **PKR (Pakistani Rupee)**.
4. Click **Next**, choose industry category (`Jobs & Education`), and select business size (`Small`).
5. Choose business objectives (e.g., `Examine user behavior`) and click **Create**.
6. Accept the Google Analytics Terms of Service.

### Step C: Create Web Data Stream
1. In the **Choose a platform** screen, select **Web**.
2. Enter your **Website URL**:
   - For local development: `http://localhost:3001`
   - For production: `https://your-domain.com` (replace with your live domain once deployed).
3. Enter **Stream name**: `FBISE Web Platform`.
4. Leave **Enhanced measurement** enabled.
5. Click **Create stream**.

### Step D: Obtain Your Measurement ID
1. On the **Web stream details** page, locate the **Measurement ID** in the top right.
2. It has the format: `G-XXXXXXXXXX` (starts with `G-` followed by 10 alphanumeric characters).
3. Copy this ID.

> [!CAUTION]
> Never share your Google account password or measurement protocol API secrets. The Measurement ID (`G-XXXXXXXXXX`) is a public identifier designed for frontend tracking.

---

## 3. Configuring the Application

1. Open the project's root `.env` file (or host environment):
   ```env
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   NEXT_PUBLIC_GA_DEBUG_MODE=true
   ```
2. Restart the frontend container to apply the environment variable:
   ```bash
   docker compose restart frontend
   ```

---

## 4. Validating Events in GA4

### Realtime Report
1. Open the website at `http://localhost:3001`.
2. Click through several routes:
   - `/`
   - `/class-9/`
   - `/class-9/physics/`
   - `/class-9/physics/physics-complete-notes/`
   - `/search?q=chemistry`
3. In Google Analytics, navigate to **Reports > Realtime**.
4. You will observe active users, card views, and real-time page titles.

### DebugView Validation
1. Ensure `NEXT_PUBLIC_GA_DEBUG_MODE=true` is set.
2. In Google Analytics, navigate to **Admin > Data display > DebugView**.
3. All client events (`page_view`) will appear in the timeline showing `page_location`, `page_title`, and `page_path`.

---

## 5. Duplicate Prevention & PII Protection

- **Duplicate Prevention:** Next.js uses client-side SPA routing. In `frontend/src/components/Analytics.tsx`, the Google Tag is initialized with `send_page_view: false`. Route changes are tracked manually by the App Router listener. This guarantees that initial load and subsequent page transitions emit exactly **one** clean page view event per route without duplicates.
- **Privacy & PII Protection:** The utility `frontend/src/lib/analytics.ts` automatically strips forbidden keys (`email`, `password`, `token`, `name`, `cnic`, `phone`, `card`) from payloads.
