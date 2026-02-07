# SunLife Lab Software - Product Lifecycle Management System

A comprehensive web application for managing the complete lifecycle of solar inverters, batteries, and VFD products from manufacturing to warranty service. This system tracks products through factory registration, dealer distribution, sales, and service center operations.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [User Roles & Permissions](#user-roles--permissions)
- [Key Workflows](#key-workflows)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Documentation](#-documentation)

## 🎯 Overview

SunLife Lab Software is a full-stack application designed to manage the entire lifecycle of solar products:

1. **Product Registration**: Register products with serial numbers at the factory
2. **Distribution**: Track products from factory → dealer → sub-dealer
3. **Sales**: Record customer sales and activate warranty
4. **Service**: Manage warranty claims and service jobs
5. **Inventory**: Real-time stock tracking across all levels
6. **Analytics**: Dashboard with comprehensive statistics

## ✨ Features

### Core Functionality

- **Product Model Management**: Create and manage product models (Inverters, Batteries, VFD)
- **Serial Number Registration**: Single and bulk registration with scanner support
- **Category Filtering**: Filter products by Inverters, Batteries, or VFD
- **Stock Management**: Real-time inventory tracking at factory, dealer, and sub-dealer levels
- **Dispatch System**: Track product movement from factory to dealers
- **Transfer System**: Dealer to sub-dealer product transfers
- **Sales Management**: Record customer sales with invoice tracking
- **Service Jobs**: Create and manage warranty service jobs
- **Parts Dispatch**: Manage spare parts distribution to service centers
- **Lifecycle Tracking**: Complete product history from registration to service

### User Experience

- **Responsive Design**: Fully responsive UI for mobile, tablet, and desktop
- **Role-Based UI**: Color-coded interface based on user role
- **PDF Datasheets**: View product technical datasheets
- **Scanner Support**: Barcode/QR code scanner integration for quick entry
- **Excel/CSV Upload**: Bulk operations via file upload
- **Real-time Updates**: Live stock counts and statistics
- **Search & Filter**: Advanced search and filtering capabilities
- **Dark Mode**: Full dark mode support

### Advanced Features

- **Warranty Management**: Configurable warranty periods (Parts & Service)
- **Duplicate Detection**: Automatic duplicate serial number detection
- **Operator Tracking**: Track which operator entered each serial number
- **History Logging**: Complete audit trail for all operations
- **Image Management**: Product image upload with versioning
- **Status Management**: Active/Discontinued product status
- **Dealer Hierarchy**: Visual representation of dealer networks

## 🛠 Tech Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Password Hashing**: bcrypt

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Form Handling**: React Hook Form + Zod validation
- **UI Components**: Shadcn UI + Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Notifications**: Sonner (Toast notifications)

### Development Tools

- **Backend**: Nodemon (hot reload)
- **Frontend**: Vite (HMR)
- **Linting**: ESLint
- **Type Checking**: TypeScript

## 📁 Project Structure

```
sunlife-lab-software/
├── backend/
│   ├── src/
│   │   ├── app.js                 # Express app configuration
│   │   ├── server.js              # Server entry point
│   │   ├── config/
│   │   │   └── db.js              # MongoDB connection
│   │   ├── controllers/           # Route handlers
│   │   │   ├── authController.js
│   │   │   ├── dealerController.js
│   │   │   ├── inverterModelController.js
│   │   │   ├── inverterUnitController.js
│   │   │   ├── inverterDispatchController.js
│   │   │   ├── inverterSaleController.js
│   │   │   ├── operatorController.js
│   │   │   ├── operatorSerialEntryController.js
│   │   │   └── ...
│   │   ├── models/                # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── InverterModel.js
│   │   │   ├── InverterUnit.js
│   │   │   ├── InverterSale.js
│   │   │   ├── ServiceJob.js
│   │   │   └── ...
│   │   ├── routes/                # API routes
│   │   │   ├── authRoutes.js
│   │   │   ├── dealerRoutes.js
│   │   │   ├── inverterModelRoutes.js
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   └── authMiddleware.js  # JWT authentication
│   │   ├── services/
│   │   │   └── warrantyService.js  # Warranty calculations
│   │   └── utils/
│   │       ├── upload.js          # Image upload config
│   │       └── upload-pdf.js     # PDF upload config
│   ├── scripts/                   # Utility scripts
│   │   ├── resetUsersAndCreateSuperAdmin.js
│   │   ├── resetSuperAdminPassword.js
│   │   ├── seedModels.js
│   │   └── ...
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                   # API client functions
│   │   │   ├── auth-api.ts
│   │   │   ├── dealer-api.ts
│   │   │   ├── model-api.ts
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── layout/            # App shell, sidebar, topbar
│   │   │   └── ui/                # Reusable UI components
│   │   ├── pages/                 # Page components
│   │   │   ├── dashboard/
│   │   │   ├── factory/
│   │   │   ├── dealer/
│   │   │   ├── service-center/
│   │   │   └── ...
│   │   ├── routes/                # Route protection
│   │   ├── store/                 # State management
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/                   # Utilities
│   │   │   ├── image-utils.ts
│   │   │   ├── role-colors.ts
│   │   │   └── utils.ts
│   │   └── app.tsx                # Main app component
│   ├── public/
│   │   └── products/              # Product images & datasheets
│   └── package.json
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **MongoDB**: v6 or higher (local or cloud instance)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/qjcoder/sunlife-lab-system.git
   cd sunlife-lab-software
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file
   cp .env.example .env  # If exists, or create manually
   ```

   **Backend .env Configuration:**
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/sunlife-lab
   JWT_SECRET=your-secret-key-here
   NODE_ENV=development
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   
   # Create .env file (if needed)
   ```

   **Frontend .env Configuration:**
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   ```
   (Backend default port is 5000; use the same port in `.env` if you run backend on 5000.)

4. **Create Super Admin (removes all users, creates only Super Admin)**  
   From the backend folder, run:
   ```bash
   cd backend
   # Default: admin@sunlife.com / password
   npm run create-admin

   # With your email (e.g. Gmail, Outlook)
   ADMIN_NAME="Your Name" ADMIN_EMAIL=yourname@gmail.com ADMIN_PASSWORD=YourSecurePassword npm run create-admin
   ```
   This deletes all users in MongoDB and creates a single Super Admin. Log in with that email and password.

   **Recover Super Admin (forgot password)**  
   If the Super Admin forgets their password, run this from the backend folder (no users are deleted):
   ```bash
   cd backend
   ADMIN_EMAIL=yourname@gmail.com ADMIN_PASSWORD=YourNewPassword npm run reset-super-admin-password
   ```
   You must know the Super Admin’s email. Then log in with that email and the new password.

5. **Seed Initial Data (Optional)**
   ```bash
   cd backend
   npm run seed-models    # Product models
   npm run seed-parts    # Parts catalog (optional)
   ```

### Running the Application

1. **Start Backend**
   ```bash
   cd backend
   npm run dev
   ```
   Backend runs on `http://localhost:5000`

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

3. **Access the Application**
   - Open browser: `http://localhost:5173`
   - Login with your credentials

## 👥 User Roles & Permissions

### 1. Factory Admin (`FACTORY_ADMIN`)
**Color Scheme**: Red

**Permissions:**
- Create and manage product models
- Register products (single & bulk)
- Dispatch products to dealers
- Manage dealer network and hierarchy
- Create service center accounts
- Create data entry operator accounts
- Dispatch parts to service centers
- View factory stock with detailed statistics
- View complete product lifecycle
- Upload product images and datasheets
- Configure warranty periods

**Pages:**
- Dashboard
- Create Product Model (inverter-models)
- Create Parts
- Product Serial Entry
- Factory Stock
- Product Dispatch
- Parts Dispatch
- Dealers Network
- Service Centers
- Account Creation (Super Admin only)
- Product History (lifecycle by serial)

### 2. Dealer (`DEALER`)
**Color Scheme**: Blue

**Permissions:**
- View dealer stock
- Transfer products to sub-dealers
- Record sales to end customers
- View sub-dealer network
- View product lifecycle

**Pages:**
- Dashboard
- Dealer Stock
- Sub Dealers
- Transfer to Sub Dealer
- Sales

### 3. Sub-Dealer (`SUB_DEALER`)
**Color Scheme**: Green

**Permissions:**
- View own stock
- Record sales to end customers
- View product lifecycle

**Pages:**
- Dashboard
- My Stock
- Sales

### 4. Service Center (`SERVICE_CENTER`)
**Color Scheme**: Orange

**Permissions:**
- Create service jobs
- View service job history
- Manage parts stock
- Add replaced parts to service jobs
- View product lifecycle

**Pages:**
- Dashboard
- Service Jobs
- Create Service Job
- Parts Stock

### 5. Data Entry Operator (`DATA_ENTRY_OPERATOR`)
**Color Scheme**: Purple

**Permissions:**
- Register serial numbers (single & bulk)
- View serial entry history
- Scanner support for quick entry

**Pages:**
- Dashboard
- Serial Entry

## 🔄 Key Workflows

### 1. Product Registration Workflow

```
Factory Admin / Data Entry Operator
    ↓
Register Product (Serial Number + Model)
    ↓
Product appears in Factory Stock
```

**Features:**
- Single or bulk registration
- Scanner support (auto-submit on Enter)
- Excel/CSV upload for bulk entries
- Duplicate detection with operator details
- Automatic manufacturing date

### 2. Distribution Workflow

```
Factory Stock
    ↓
Dispatch to Dealer
    ↓
Dealer Stock
    ↓
Transfer to Sub-Dealer (optional)
    ↓
Sub-Dealer Stock
    ↓
Sale to Customer
    ↓
Warranty Activated
```

### 3. Service Workflow

```
Customer Reports Issue
    ↓
Service Center Creates Service Job
    ↓
Parts Dispatched from Factory (if needed)
    ↓
Parts Added to Service Center Stock
    ↓
Parts Replaced/Repaired
    ↓
Service Job Completed
```

### 4. Product Lifecycle View

Every product has a complete lifecycle that can be viewed:
- Registration date and operator
- Dispatch history
- Transfer history
- Sale information (customer, date, invoice)
- Service job history
- Warranty status

## 📡 API Documentation

### Authentication

**POST** `/api/auth/login`
```json
{
  "email": "admin@sunlife.com",
  "password": "password123",
  "role": "FACTORY_ADMIN"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "...",
    "name": "Admin User",
    "email": "admin@sunlife.com",
    "role": "FACTORY_ADMIN"
  }
}
```

### Product Models

**GET** `/api/inverter-models` - List all models

**POST** `/api/inverter-models` - Create new model
```json
{
  "brand": "Sunlife",
  "productLine": "SL SKY",
  "variant": "4kW",
  "modelCode": "SL-SKY-4KW",
  "warranty": {
    "partsMonths": 12,
    "serviceMonths": 24
  },
  "active": true
}
```

**PUT** `/api/inverter-models/:id` - Update model

**DELETE** `/api/inverter-models/:id` - Delete model

**POST** `/api/inverter-models/:id/upload-image` - Upload product image

**POST** `/api/inverter-models/:id/upload-datasheet` - Upload PDF datasheet

### Product Registration

**POST** `/api/inverters` - Register single product
```json
{
  "serialNumber": "SN-001",
  "inverterModel": "model-id",
  "manufacturingDate": "2024-01-15"
}
```

**POST** `/api/inverters/bulk` - Bulk registration
```json
{
  "modelCode": "SL-SKY-4KW",
  "serialNumbers": ["SN-001", "SN-002", "SN-003"],
  "manufacturingDate": "2024-01-15"
}
```

### Operator Serial Entry

**POST** `/api/operator/serial-entry/single` - Single entry (DATA_ENTRY_OPERATOR)

**POST** `/api/operator/serial-entry/bulk` - Bulk entry (DATA_ENTRY_OPERATOR)

**GET** `/api/operator/serial-entry/history?modelId=...&date=2024-01-15` - Entry history

### Stock Management

**GET** `/api/factory-inverter-stock` - Factory stock (FACTORY_ADMIN)

**GET** `/api/dealer-inverter-stock` - Dealer stock (DEALER)

**GET** `/api/dealer-inverter-stock/:subDealerId` - Sub-dealer stock (DEALER)

### Dispatch & Transfer

**POST** `/api/inverter-dispatches` - Dispatch to dealer

**POST** `/api/dealer-transfers` - Transfer to sub-dealer

### Sales

**POST** `/api/inverter-sales` - Record sale
```json
{
  "serialNumber": "SN-001",
  "saleInvoiceNo": "INV-2024-001",
  "saleDate": "2024-01-20",
  "customerName": "John Doe",
  "customerContact": "+1234567890"
}
```

### Service Jobs

**POST** `/api/service-jobs` - Create service job

**GET** `/api/service-jobs/:id` - Get service job details

**POST** `/api/service-jobs/:id/replaced-parts` - Add replaced part

### Lifecycle

**GET** `/api/inverters/lifecycle/:serialNumber` - Get complete product lifecycle

## 💻 Development

### Code Organization

- **Backend**: Domain-based architecture with controllers, models, routes
- **Frontend**: Feature-based pages with shared components
- **API**: RESTful endpoints with JWT authentication
- **Validation**: Zod schemas for type-safe validation

### Coding Standards

- **Backend**: ES6 modules, async/await, error handling
- **Frontend**: TypeScript, React hooks, functional components
- **Styling**: Tailwind CSS utility classes
- **Components**: Shadcn UI for consistent design

### Environment Variables

**Backend (.env)**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sunlife-lab
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

**Frontend (.env)**
```env
VITE_API_BASE_URL=http://localhost:5000
```

### Building for Production

**Backend:**
```bash
cd backend
npm run build  # If build script exists
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

### Testing

Currently, manual testing is used. Future plans include:
- Unit tests (Jest)
- Integration tests
- E2E tests (Playwright/Cypress)

## 🚢 Deployment

### Backend Deployment

1. **Set environment variables** on your hosting platform
2. **Ensure MongoDB** is accessible (MongoDB Atlas recommended)
3. **Deploy** to platform (Heroku, Railway, Render, etc.)
4. **Update CORS** settings to allow frontend domain

### Frontend Deployment

1. **Build the application**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy** `dist/` folder to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - Any static hosting service

3. **Update API URL** in environment variables

### Database

- **Development**: Local MongoDB
- **Production**: MongoDB Atlas (recommended)

### File Storage

- Product images: `frontend/public/products/`
- Datasheets: `frontend/public/products/datasheets/`
- Images are versioned (e.g., `model-v1.jpg`, `model-v2.jpg`)

## 📝 Scripts

### Backend Scripts

- `npm run dev` - Start development server with hot reload (nodemon)
- `npm start` - Start production server
- `npm run create-admin` - Remove all users and create only Super Admin
- `npm run reset-super-admin-password` - Recover Super Admin: set new password by email (no user deletion)
- `npm run seed-models` - Seed initial product models
- `npm run seed-parts` - Seed sample parts catalog

### Frontend Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for SunLife Lab.

## 👤 Author

**Qaiser Javed**
- GitHub: [@qjcoder](https://github.com/qjcoder)

## 🙏 Acknowledgments

- Shadcn UI for component library
- Radix UI for accessible primitives
- TanStack Query for data fetching
- React Router for routing
- MongoDB for database
- Express.js for backend framework

## 📚 Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — High-level architecture, data flow, and tech decisions
- **[backend/README.md](backend/README.md)** — Backend setup, API overview, and scripts
- **[frontend/README.md](frontend/README.md)** — Frontend setup, structure, and development

---

**Last Updated**: February 2025

**Version**: 1.0.0
