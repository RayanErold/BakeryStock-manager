# 🥖 BakeryStock — Premium Micro-SaaS Inventory Manager

BakeryStock is a professional, high-fidelity micro-SaaS application designed for bakery owners and branch managers. It solves critical daily operations by tracking raw ingredients, logging production batches, monitoring waste, and providing real-time inventory visibility across multiple points of sale.

---

## 🚀 Key Solutions BakeryStock Resolves

*   **🏢 Multi-Branch Management (Multi-Succursales):** Track inventory, sales, and movement logs for multiple distinct physical bakeries (e.g., Douala Central, Yaoundé Bakery) from a single, unified master dashboard.
*   **⚠️ Low Stock Threshold Alerts (Anti-Gaspillage):** Never run out of crucial ingredients. Set minimum stock triggers on flour, sugar, yeast, and dairy to receive instant notifications when replenishment is required.
*   **⚖️ Live Stock Movements & Production Logs:** Track every bag of flour from inventory check-in to dough production to end-of-day waste/losses.
*   **🛡️ Multi-User Roles & Audit Trails:** Secure operations by separating user roles (Owners vs. Staff/Bakers) and logs every single inventory modification to prevent internal theft or discrepancies.

---

## 🛠️ Technology Stack

*   **Frontend:** React 19 (TypeScript), Vite, TailwindCSS, Framer Motion (animations), Wouter (routing), TanStack React Query.
*   **Backend:** Node.js (Express), drizzle-orm, PostgreSQL/SQLite.
*   **Mobile App:** Expo React Native (in `artifacts/bakerystock-mobile`).
*   **Deployment-Ready:** Fully optimized for Netlify (frontend) and Render/Heroku (backend API).

---

## 📦 Project Structure

```text
├── artifacts/
│   ├── bakerystock/          # Premium React Vite Web Frontend
│   ├── api-server/           # Node.js Express Rest API Backend
│   └── bakerystock-mobile/   # Expo React Native Cross-Platform App
├── lib/
│   └── db/                   # Common Database Schema & Drizzle migrations
├── package.json              # Monorepo Workspace configuration
└── pnpm-workspace.yaml       # PNPM workspace configurations
```

---

## ⚡ Quick Start Guide (Local Development)

### 1. Prerequisites
Ensure you have [PNPM](https://pnpm.io/) installed locally:
```bash
npm install -g pnpm
```

### 2. Install Dependencies
Run the workspace install at the root:
```bash
pnpm install
```

### 3. Run the Servers (Frontend + Backend)
Start the concurrent development environments for both the API server and Vite frontend:
```bash
pnpm dev
```
*   **Frontend:** `http://localhost:5173`
*   **Backend API:** `http://localhost:3000`

---

## 🌐 Netlify Deployment Guide (Frontend)

To deploy the React web application on **Netlify**, configure the following:

### 1. Build Command & Directory
*   **Build Command:** `pnpm --filter @workspace/bakerystock run build`
*   **Publish Directory:** `artifacts/bakerystock/dist`

### 2. SPA Route Redirects
Ensure Netlify handles client-side routing (Wouter/React Router) correctly. A standard `_redirects` file is included in `artifacts/bakerystock/public/_redirects`:
```text
/*    /index.html   200
```

### 3. Environment Variables
Configure the following Environment Variables in the Netlify dashboard:
*   `VITE_API_URL`: *The URL of your deployed Express backend API (e.g., `https://your-api.render.com`)*

---

## 💻 Git & GitHub Push Guide

To push this codebase to a fresh GitHub repository:

```bash
# 1. Initialize Git (if not already done)
git init

# 2. Add your GitHub repository as remote
git remote add origin https://github.com/your-username/BakeryStock-Manager.git

# 3. Stage and commit files
git add .
git commit -m "feat: initial commit of BakeryStock manager with landing page"

# 4. Push to main branch
git branch -M main
git push -u origin main
```

---

## 📄 License
This project is licensed under the MIT License.
