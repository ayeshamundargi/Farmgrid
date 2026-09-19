# 🌾 FarmGrid — Agricultural Resource Coordination Under Scarcity

> **Autonomous, fair, and resilient agricultural machinery coordination engine for regional farmer cooperatives, equipment custom hiring centers, and agricultural administrators.**

---

## 🚀 The Scarcity Challenge

During peak harvesting, planting, and monsoonal weather shifts, agricultural communities face severe resource scarcity:
- **Competing Deadlines**: Dozens of farmers need high-capacity combine harvesters and heavy-duty tractors in the exact same 48-hour window before rain spoils mature crops.
- **Logistics & Transit Overhead**: Farm machinery moves slowly (15–25 km/h) over rural terrain. Scheduling without travel time margins causes cascading delays and bitter field conflicts.
- **Unforgiving Disruptions**: Sudden hydraulic failures, flat tires, and unpredicted cloudbursts leave critical crops stranded without alternatives.
- **Rural Connectivity Deficits**: Farmers frequently operate in low-bandwidth or zero-connectivity dead zones where cloud-only booking apps fail completely.

**FarmGrid solves this with an algorithmic, offline-first coordination engine that guarantees zero double-bookings, transparent priority scoring, transit buffers, and dynamic automated reallocations.**

---

## 🧠 Algorithmic Core

FarmGrid features four deterministic algorithmic engines:

### 1. Multi-Factor Priority Engine (`priorityEngine.js`)
Fairness under scarcity requires transparent, explainable scoring. Every request receives a normalized score (0–100) computed from:
- **Urgency & Proximity to Deadline** (Weight: 25%)
- **Weather Risk Proximity** (Weight: 25%): Severe storm or flash flood forecasts dynamically amplify priority.
- **Crop Biological Stage** (Weight: 20%): Prioritizes harvest-ready and peak-ripening crops facing rapid spoilage over early-stage vegetative tilling.
- **Waitlist & Queue Starvation** (Weight: 15%): Linear starvation protection ensures long-waiting requests gain priority over newer requests.
- **Geographic Distance & Transit Efficiency** (Weight: 15%): Rewards assignments with shorter road transit between depot and farm.

### 2. Smart Feasibility & Scheduler Engine (`schedulerEngine.js`)
- Enforces strict operational windows (06:00 – 20:00).
- Calculates Haversine geographic transit times between depot and farm coordinates.
- Inserts mandatory **logistics buffers** (15 minutes prep before, 15 minutes clean-down after) to prevent buffer bleed.
- Evaluates existing bookings on compatible regional units to guarantee zero overlap. If impossible, automatically stages the request into the priority waitlist.

### 3. Conflict Prevention Engine (`conflictEngine.js`)
- Continuously audits the global schedule matrix across all machines.
- Emits real-time Socket.IO alerts (`conflictDetected`) and prevents double-bookings.
- Proposes mathematically feasible alternative time windows or alternate compatible machinery.

### 4. Dynamic Reallocation & Resilience Engine (`reallocationEngine.js`)
- **Equipment Breakdowns**: When an owner reports a mechanical failure, the engine automatically finds alternative nearby machines of the same type, migrates scheduled farmers with cleared buffers, and updates the waitlist.
- **Approaching Storms / Weather**: Re-ranks requests to prioritize vulnerable ripening crops in the path of the storm.
- **Farmer Cancellations**: Instantly backfills released slots with the highest-priority waitlisted request without requiring manual administrative intervention.

---

## 📱 Offline-First Architecture

- Built with **IndexedDB** (`idb`) to provide client-side offline persistence.
- Farmers in low-connectivity fields can draft and submit requests offline.
- Requests are stored locally with status `PENDING_SYNC`.
- **Automatic Sync**: As soon as internet connectivity returns (via `window.addEventListener('online')`), queued requests are automatically submitted to the central coordinator in order of creation.
- **1-Click Network Simulator**: The navbar includes an interactive Online / Offline badge that can be clicked to simulate network loss and observe offline staging and sync directly in the browser!

---

## 💻 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS, Leaflet, React-Leaflet, Recharts, Lucide React, IndexedDB (`idb`), Socket.IO Client |
| **Backend** | Node.js, Express, Socket.IO, Prisma ORM, MySQL, JWT Authentication, Bcrypt |
| **Algorithms** | Deterministic Multi-Factor Priority Engine, Haversine Routing, Non-Overlapping Slot Allocator, Real-Time Reallocation Engine |

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js (v18+)
- MySQL database running on `localhost:3306`

### 2. Setup Environment
Ensure your MySQL database `farmgrid` exists, then configure `server/.env`:
```env
PORT=5000
DATABASE_URL="mysql://root:password@localhost:3306/farmgrid"
JWT_SECRET="farmgrid_super_secret_jwt_key_hackathon_2026_scarcity"
CLIENT_URL="http://localhost:5173"
NODE_ENV=development
```

### 3. Install Dependencies & Seed Database
```powershell
# Install all dependencies
npm.cmd run install:all

# Seed demo dataset (Admin, Owners, Farmers, Farms, Machinery, Bookings)
npm.cmd run seed
```

### 4. Run Development Server
```powershell
npm.cmd run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

---

## 🧪 Running Tests

FarmGrid includes unit and integration test suites:

```powershell
# Run full algorithmic & API test suites
node server/tests/algorithms.test.js
node server/tests/api.test.js
```

---

## 👥 Demo Personas (1-Click Switchers)

The application includes 1-click role switchers in the top navigation bar and landing page:

| Persona | Email | Password | Role Description |
|---|---|---|---|
| **Farmer** | `farmer@farmgrid.demo` | `demo123` | Ramesh Kumar — Requests tractors/harvesters, views priority breakdown, offline booking. |
| **Equipment Owner** | `owner@farmgrid.demo` | `demo123` | Rajesh Hub — Manages machinery fleet, toggles maintenance, reports breakdowns. |
| **Administrator** | `admin@farmgrid.demo` | `demo123` | System Admin — Master timeline schedule, conflict center, disruption simulator, geospatial fleet map. |

---

## 📄 License
MIT © FarmGrid Team
