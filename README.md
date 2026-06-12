# 🌿 GreenScan — Smart Office Print & Resource Tracker

> A full-stack MERN application that tracks office printing activity, monitors consumable resources in real time, and uses predictive analytics to forecast supply depletion — enabling proactive maintenance before operations are disrupted.

---

## 🔗 Live Demo

**👉 [https://project-green-scan.vercel.app/](https://project-green-scan.vercel.app/)**

> Register a new account to explore the full dashboard — no credentials required.

---

## 📸 Quick Preview

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/b1b81736-b64a-4df7-8815-76901cb8f976" />


---

## 🎯 The Problem It Solves

Office environments routinely face unplanned downtime when printers run out of paper or toner mid-operation. GreenScan addresses this by giving administrators a single dashboard to monitor every print job, watch resource levels deplete in real time, and receive AI-generated predictions on *exactly* how many days of supply remain — before a problem occurs.

---

## ✨ Features

| Feature | Value Delivered |
|---|---|
| **Secure Authentication** | bcrypt-hashed passwords ensure user credentials are never stored in plain text |
| **Print Job Logging** | Full audit trail of every document printed — name, pages, type, user, and timestamp |
| **Live Resource Tracking** | Paper balance and CMYK toner levels recalculate instantly after every logged job |
| **Smart Predictor** | Forecasts days remaining per resource using Linear Regression + Weighted Burn Rate — eliminating reactive maintenance |
| **Smart Alerts** | Auto-generated contextual alerts for critically low toner, paper shortage, and high-volume print detection |
| **7-Day Usage Trends** | Interactive area chart (Recharts) visualising daily page volume to surface usage patterns |
| **Refill Supplies Modal** | Maintenance workflow to top up any resource with server-side hard caps preventing data corruption |
| **Full Print History** | Live search across all jobs or browse the complete database in a scrollable modal |
| **Dark Mode** | Fully themed light/dark toggle across all components |
| **Automated E2E Tests** | Selenium + TestNG suite covering all critical user workflows end-to-end |

---

## 🛠️ Tech Stack

| Layer | Technology | Key Decision |
|---|---|---|
| Frontend | **React.js** (Vite) | Component-driven UI with fast HMR in development |
| Charts | **Recharts** | Declarative, responsive area charts with minimal overhead |
| Icons | **Lucide React** | Consistent, tree-shakeable icon set |
| Backend | **Node.js + Express.js** | Lightweight REST API with clean route separation |
| Database | **MongoDB + Mongoose** | Schema-flexible document model suited to evolving resource structures |
| Auth | **bcryptjs** | Industry-standard password hashing with salt rounds |
| Testing | **Selenium WebDriver + TestNG** | Browser-level E2E automation across all critical flows |
| Deployment | **Vercel** (frontend) + **Railway** (backend) | Zero-config frontend deploys; persistent backend with auto-restart |
| Uptime | **Cron-job.org** | Scheduled heartbeat pings every 10 min to prevent Railway's free-tier sleep |

---

## 📁 Project Structure

```
TA PROJECT/
│
├── Backend/
│   ├── server.js           # Express server — all API routes & DB models
│   ├── package.json
│   └── node_modules/
│
└── green_scan/             # React frontend (Vite)
    ├── public/
    └── src/
        ├── assets/
        ├── components/
        │   ├── Home.jsx    # Dashboard — all state, logic, and UI
        │   ├── Login.jsx
        │   └── Register.jsx
        ├── styles/
        │   ├── auth.css
        │   └── home.css
        ├── App.jsx
        └── main.jsx
```

---

## 🧠 Smart Predictor — How It Works

Most resource dashboards only tell you the *current* level. GreenScan tells you *when you'll run out*.

The predictor runs entirely on the frontend and recalculates on every state change, combining two statistical methods for accuracy:

- **Linear Regression** on the 7-day page history — identifies the underlying usage trend, accounting for whether consumption is growing or declining
- **Weighted Burn Rate** — calculates a rolling average where recent days carry higher weight, reflecting current behaviour more accurately than a simple mean
- Both values are applied against current resource levels across all five resources (paper + 4 toner channels)
- The resource with the **lowest days remaining becomes the bottleneck**, displayed with the depletion reason, usage trend direction, and a confidence rating (High / Medium / Low based on usage variance)

This transforms reactive restocking into **proactive resource management** — giving administrators advance notice rather than a mid-print failure.

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Register a new user, hashes password before storage |
| `POST` | `/login` | Validate credentials, return user info + current paper balance |

### Dashboard & Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Resources + last 8 jobs + 7-day aggregated chart data |
| `GET` | `/api/jobs` | Full print job history, newest first |
| `POST` | `/api/print` | Log a job and atomically deduct resources with randomised consumption variance |
| `POST` | `/api/refill` | Add supplies; server enforces hard caps (paper: 5,000 / toner: 100%) |

---

## ⚙️ Getting Started (Local)

### Prerequisites

- Node.js v18+
- MongoDB running locally on port `27017`
- Java 11+ with ChromeDriver (E2E tests only)

### 1. Clone

```bash
git clone https://github.com/shiva1753/Project_Green_Scan.git
cd Project_Green_Scan
```

### 2. Start the Backend

```bash
cd Backend
npm install
node server.js
# ✅ Server running on http://localhost:5000
# 🌱 MongoDB auto-seeds: 5,000 sheets + 100% toner on first run
```

### 3. Start the Frontend

```bash
cd green_scan
npm install
npm run dev
# ✅ Frontend running on http://localhost:5173
```

> **Deployment Note:** The live demo backend is hosted on **Railway**. If the dashboard takes ~50 seconds to load data on first visit, the server is spinning up from inactivity. This is expected behaviour — subsequent requests are fast.

---

## 🧪 End-to-End Testing

Automated in **Java using Selenium WebDriver + TestNG**. Place `chromedriver.exe` at `C:\drivers\chromedriver.exe`, ensure both servers are running, then execute via your IDE or Maven.

| TC | Test Case |
|----|-----------|
| TC01 | Register a new user → redirects to `/login` |
| TC02 | Login with wrong password → error message displayed |
| TC03 | Login with correct credentials → lands on `/home` |
| TC04 | All 6 dashboard sections visible on load |
| TC05 | Log 2 print jobs (Color + B&W) → appear in activity table |
| TC06 | Toggle dark mode ON → `dark` class applied to root wrapper |
| TC07 | Search "report" → matching rows returned |
| TC08 | View All Print Jobs modal → record count verified, modal closes |
| TC09 | Refill all supplies → modal closes, balance confirms 5,000 |
| TC10 | Search non-existent document → empty state message shown |
| TC11 | Smart Predictor → valid days remaining and reason displayed |

---

---

## ⚡ Engineering Challenges & Solutions

Deploying a MERN app for the first time surfaces problems that local development never does. Here's what broke and how it was fixed:

**1. Cold Start Latency (Backend sleeping on free tier)**
Railway's free tier spins down the backend after inactivity, causing ~50-second delays on first load. Solved by configuring a **scheduled heartbeat ping via [Cron-job.org](https://cron-job.org)** every 10 minutes, keeping the server warm without any infrastructure cost.

**2. SPA Routing Breaks on Direct URL Access**
Navigating directly to `/home` or `/register` on Vercel returned a 404 because the static file server had no knowledge of client-side routes. Solved by adding a **`vercel.json` rewrite rule** that redirects all unmatched routes to `index.html`, letting React Router handle them client-side:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**3. API Connectivity Across Environments**
Hardcoded `localhost:5000` URLs worked locally but broke in production where the backend lives on a different domain. Solved by **centralising the API base URL in a `.env` variable** (`VITE_API_URL`), so the same codebase points to the correct host in both environments without code changes.

---

## 🔐 Security & Scope

This project was developed as an **academic lab exercise** with a deliberate focus on full-stack architecture, predictive algorithms, and test automation. A few intentional trade-offs worth noting:

- **Session management uses `localStorage`** rather than HTTP-only cookies or JWTs. This approach was chosen for simplicity in a controlled academic environment. A production system would use signed JWTs with refresh token rotation or a session store to prevent XSS exposure.
- **No role-based access control** — all authenticated users share the same resource document, which models a single shared office printer unit. A multi-tenant deployment would namespace resources per organisation.
- **Resource state is a singleton** in MongoDB — one document tracks all supplies. This is intentional for the single-printer use case and simplifies atomic updates considerably.

These decisions reflect an understanding of the **trade-offs between development velocity and production hardening** — not a gap in knowledge.

---

## 👨‍💻 Author

**Shivansh Rana**
[GitHub](https://github.com/shiva1753) · [LinkedIn](https://www.linkedin.com/in/srana10/)

Built as part of an academic lab project © 2026
