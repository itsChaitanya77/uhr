# Universal Health Record (UHR)

A capstone-grade smart healthcare platform: patients own their medical records, doctors access them with consent, and verified clinicians can use a time-limited, fully audited **break-glass emergency access** when a patient cannot communicate.

> **All data is synthetic. Emergency authorization and contact notifications are simulated demonstrations.**

**Stack:** React 19 + Vite 8 · Tailwind CSS v4 · Lucide · Recharts · `qrcode.react` + `html5-qrcode` · Node/Express 5 · MongoDB (Mongoose) · JWT · bcrypt · zod

---

## ⚡ Quick Start (Zero-Config)

Requires **Node.js 20+**.
If a local MongoDB is not running, UHR **automatically spins up an embedded in-memory MongoDB and auto-seeds all synthetic clinical data**.

```bash
# 1. Start everything from the root directory
npm start
# -> Opens http://localhost:5000 (serves both React Frontend & API!)
```

### Development Mode (with Live Reloading)
```bash
# Terminal 1: Backend API (port 5000)
cd server
npm run dev

# Terminal 2: React Frontend (port 5173 with Vite hot-reload)
cd client
npm run dev
```

---

## 🚀 Smooth Production Deployment

UHR is engineered for zero-friction cloud deployment. The Express backend automatically serves the compiled React app with client-side SPA routing fallback.

### Option A: Render (1-Click Deployment)
A [`render.yaml`](file:///c:/Users/chaitanya/Downloads/UHR-project (1)/uhr/render.yaml) blueprint is preconfigured:
1. Connect this repository to [Render.com](https://render.com).
2. Choose **New Blueprint** and select this repo.
3. Render automatically builds the frontend, links environment variables, and launches the service.

### Option B: Docker Container
A multi-stage production [`Dockerfile`](file:///c:/Users/chaitanya/Downloads/UHR-project (1)/uhr/Dockerfile) is included:
```bash
docker build -t uhr-platform .
docker run -p 5000:5000 uhr-platform
```

### Option C: Railway / VPS / Cloud Host
```bash
# Build frontend
cd client && npm install && npm run build

# Start server
cd ../server && npm install --omit=dev
npm start
```

---

## 👥 Demo Accounts (Also available via 1-Click Auto-Fill on Login)

| Role | Email | Password | Highlights |
|---|---|---|---|
| **Admin** | `admin@uhr.demo` | `Admin@123` | License verification, emergency review, immutable audit trail |
| **Doctor (Emergency)** | `dr.sharma@uhr.demo` | `Doctor@123` | Verified · Emergency access enabled · Cardiology |
| **Doctor (Cardiology)** | `dr.patel@uhr.demo` | `Doctor@123` | Verified · Prescribing enabled · Clinical records |
| **Doctor (Pending)** | `dr.nair@uhr.demo` | `Doctor@123` | Unverified · Demonstrates doctor onboarding workflow |
| **Patient 1** | `aarav@uhr.demo` | `Patient@123` | O+ · Type 2 Diabetes (Insulin) · Severe Penicillin allergy |
| **Patient 2** | `priya@uhr.demo` | `Patient@123` | A− · Severe persistent asthma · NSAID allergy |
| **Patient 3 (Break-Glass)** | `rohan@uhr.demo` | `Patient@123` | B+ · Epilepsy · Peanut/Latex life-threatening allergy |
| **Patient 4** | `meera@uhr.demo` | `Patient@123` | AB+ · Pregnancy (28w) · Contrast media allergy |
| **Patient 5** | `karthik@uhr.demo` | `Patient@123` | O− · Warfarin anticoagulation · Cardiac stent |

---

## ⏱️ 5-Minute Suggested Demo Script

1. **Patient Portal (`rohan@uhr.demo`)**:
   - Open **Emergency Card**: Download or view the emergency QR code. Notice the payload is an opaque token (`UHR-EMG:...`) with no plaintext medical info.
2. **Doctor Portal (`dr.sharma@uhr.demo`)**:
   - Go to **Patient Search** for Rohan Das → Status displays *"No access granted"*.
   - Click **Open Break-Glass Session**, enter `UHR-1000003` (or scan his QR).
   - Click **Break Glass**: Re-enter password (`Doctor@123`), enter clinical reason, acknowledge emergency terms.
   - The **Emergency Mission-Control Dashboard** appears with a **30-minute real-time countdown**, critical vitals, severe allergies, and primary contact details.
3. **Emergency Alert Notification (`rohan@uhr.demo`)**:
   - Log back into Rohan's account: A high-priority emergency notification appears, and **Privacy & Access Control** displays Dr. Sharma's break-glass audit entry.
4. **Admin Governance (`admin@uhr.demo`)**:
   - **Emergency Review**: Mark the incident as *Justified* or *Flagged* with administrative findings.
   - **User Management**: Approve Dr. Nair's pending medical credentials.
   - **Audit Logs**: Filter by event type (`EMERGENCY_ACCESS_ACTIVATED`) to inspect IP, timestamps, and details.

---

## 🔒 Security Design

- **Authentication**: JWT tokens (8h expiration), bcrypt password hashing (cost 12), rate-limited authentication and lookup endpoints.
- **Zero-Knowledge QR Codes**: Tokens are strictly `UHR-EMG:<random 192-bit token>`. No PII or clinical data is encoded.
- **Access Sovereignty**: Doctors cannot view charts without explicit patient consent granted during appointment booking or via Privacy controls.
- **Break-Glass Auditability**: Requires re-authentication, mandatory justification, auto-notifies contacts, and undergoes post-incident admin review.
- **File Upload Protection**: PDF/PNG/JPEG validation with magic-byte verification (rejecting executable scripts), 5 MB cap, stored with randomized server filenames and served exclusively via authenticated streams.
