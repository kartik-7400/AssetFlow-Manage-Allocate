# AssetFlow — Smart Asset Management & Resource Allocation Platform

AssetFlow is a full-stack web application that helps organizations efficiently track, manage, and allocate shared resources. It replaces spreadsheets and manual records with a centralized platform featuring inventory management, asset booking with approval workflows, real-time notifications, and operational analytics.

Built to solve real-world resource management challenges — such as those faced by university cultural councils, event teams, and organizations sharing equipment across departments — AssetFlow provides complete visibility and accountability throughout the asset lifecycle.

---

## Technology Stack

| Layer              | Technology                                                     |
| ------------------ | -------------------------------------------------------------- |
| **Frontend**       | React 19, TypeScript, Vite                                     |
| **Styling**        | Tailwind CSS 4, shadcn/ui, Lucide Icons, tw-animate-css        |
| **Charting**       | Recharts                                                       |
| **Routing**        | React Router DOM v7                                            |
| **Authentication** | Clerk (React SDK + Express middleware)                         |
| **Backend**        | Node.js, Express.js, TypeScript (ESM)                          |
| **Database**       | MongoDB with Mongoose ODM                                      |
| **Realtime**       | Socket.IO                                                      |
| **QR Scanning**    | html5-qrcode, qrcode.react                                     |
| **Code Quality**   | ESLint, Prettier, Husky, lint-staged                           |

---

## Setup Instructions

### Prerequisites

- **Node.js** ≥ 20.0.0
- **npm** (comes with Node.js)
- **MongoDB** — local instance or a cloud-hosted URI (e.g., MongoDB Atlas)
- **Clerk Account** — for authentication keys ([clerk.com](https://clerk.com))

### 1. Clone the Repository

```bash
git clone https://github.com/kartik-7400/AssetFlow-Manage-Allocate.git
cd AssetFlow-Manage-Allocate
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file (use `.env.example` as reference):

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

MONGO_URI=mongodb://localhost:27017
DB_NAME=AssetFlow
DB_TEST_NAME=test
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file (use `.env.example` as reference):

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_BACKEND_URL=http://localhost:3000
```

### 4. Seed the Database *(optional)*

Pre-populate the database with sample assets and data:

```bash
cd ../backend
npm run seed
```

---

## Running the Application

### Local Development

Start both the backend and frontend dev servers in separate terminals:

**Terminal 1 — Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

The frontend will be available at **http://localhost:5173** and the backend API at **http://localhost:3000**.

### Production Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm run preview
```

---

## Feature List

### Authentication & Authorization
- OAuth-based sign-in/sign-up via Clerk
- Role-based access control (Admin / User)
- Protected routes with secure session management

### Inventory Management *(Admin)*
- Full CRUD operations on assets (create, read, update, delete)
- Categorize assets and manage available quantities
- Track asset status and condition

### Asset Catalog & Booking *(User)*
- Browse, search, and filter available assets
- Check real-time availability
- Request assets for specific durations
- Automatic prevention of overbooking

### Approval Workflow *(Admin)*
- Review, approve, or reject incoming booking requests
- View all active allocations
- Users can monitor request status in real time

### Asset Issue & Return
- Track asset issuance and returns
- Due date monitoring
- Automatic inventory synchronization on return

### Analytics Dashboard
- Interactive charts and summary cards powered by Recharts
- Insights into most-utilized assets, utilization rates, active bookings, available inventory, and overdue returns
- Visualizations include bar charts, line graphs

### QR Code Asset Tracking
- Generate QR codes for each asset
- Scan QR codes during issue and return for instant lookup
- Built with html5-qrcode and qrcode.react

### Real-Time Notifications
- Live updates via Socket.IO
- Booking approval/rejection alerts
- Return reminders and overdue notifications

### Audit Logs *(Admin)*
- Track system-critical activities: asset creation, inventory updates, booking approvals, asset returns

### Maintenance Tracking
- Record and monitor asset condition
- Maintenance logs and damage reports

### Borrowing History
- Users can view current bookings and full borrowing history
- Admins can access organization-wide activity records

### Code Quality
- ESLint + Prettier with auto-formatting
- Pre-commit hooks via Husky and lint-staged

---

## Project Structure

```
AssetFlow-Manage-Allocate/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── middlewares/       # Auth & request middleware
│   │   ├── models/            # Mongoose schemas (Asset, Booking, User, AuditLog, Notification, Maintenance)
│   │   ├── routes/            # Express route definitions
│   │   ├── services/          # Business logic layer
│   │   ├── app.ts             # Express app configuration
│   │   ├── server.ts          # Server entry point
│   │   └── seed.ts            # Database seeder
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page-level views
│   │   ├── lib/               # Utilities and helpers
│   │   ├── App.tsx            # Root component with routing
│   │   └── main.tsx           # Application entry point
│   ├── vite.config.ts
│   └── package.json
└── README.md
```

---

