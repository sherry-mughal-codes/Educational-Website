# Google AdSense Readiness & Application Guide

This document outlines the architectural preparations completed in Phase 2 to prepare the FBISE Educational Platform for a future Google AdSense application, along with the required owner actions.

---

## 1. Architectural Readiness Checklist

In accordance with Google AdSense program policies, Phase 2 implements:

1. **Original, High-Value Educational Content:**
   - Real, structured curriculum metadata for FBISE Class 9 and Class 10.
   - Comprehensive subject overviews, textbook solutions, and model question guides.
   - Zero scraped, automated thin pages, or placeholder filler text.
2. **Robust, Transparent Navigation:**
   - Clear multi-level hierarchy: Class pages → Subject pages → Complete Resource pages.
   - Search functionality with real-time feedback.
   - Mobile and desktop responsive layouts.
   - Functional breadcrumbs and internal links.
3. **Mandatory Policy & Transparency Pages:**
   - **About Page (`/about/`):** Explains educational mission, SLO curriculum alignment, and independent portal status.
   - **Contact Page (`/contact/`):** Clear support inquiry channels and syllabus error reporting.
   - **Privacy Policy (`/privacy-policy/`):** Accurate description of Google Analytics, cookies, and future personalized advertising disclosure.
   - **Terms of Use (`/terms/`):** Permitted student self-study use and copyright boundaries.
   - **Disclaimer (`/disclaimer/`):** Trademark nominative use, copyright attribution, and Fair Use doctrine.
4. **No Premature Ad Code:**
   - No fake publisher IDs (`pub-XXXXXXXXXX`).
   - No broken ad placeholders or layout shifts.
   - No ads that imitate navigation or deceive students.

---

## 2. Owner-Facing AdSense Application Procedure

> [!IMPORTANT]
> Google AdSense application and approval is exclusively an account-owner task handled directly with Google. Do not apply until the site is live on a public domain with SSL (HTTPS) and has undergone content review.

### Step 1: Deploy on Custom Domain
1. Deploy the platform to your production hosting environment.
2. Connect your custom domain (e.g. `https://fbise-notes.pk` or `https://fbise.example.com`).
3. Ensure HTTPS is enforced and all public pages load properly.

### Step 2: Submit Application in Google AdSense
1. Visit [https://adsense.google.com/](https://adsense.google.com/).
2. Sign in with the property owner's Google account.
3. Enter your website's public domain URL.
4. Select your country of payment (Pakistan) and agree to AdSense Terms.
5. Provide your legal payee profile and tax information.

### Step 3: Site Ownership Verification
1. AdSense will prompt you to verify ownership of your domain. Google typically provides:
   - An **AdSense Code snippet** (`<script>` tag with `ca-pub-XXXXXXXXXX`), or
   - An **ads.txt** file, or
   - A **Meta tag**.
2. When ready, provide the verification code to be placed in `frontend/src/app/layout.tsx` or upload the `ads.txt` file to `frontend/public/ads.txt`.

### Step 4: Request Review
1. In the AdSense console, confirm that the verification snippet is installed and click **Request Review**.
2. Google’s automated systems and human reviewers will evaluate the site against AdSense Program Policies.
3. Monitor your email and the AdSense dashboard for feedback or approval.

### Step 5: Post-Approval Ad Configuration
1. Once Google approves the application, enable **Auto ads** or create discrete ad units in the AdSense console.
2. Maintain standard ad placement rules: never place ads where they can be accidentally clicked, and avoid intrusive overlays that obstruct student reading.
