# SunLife Lab Software — Backend

Node.js/Express API for the SunLife Lab product lifecycle management system. Handles authentication, product models, units, dispatch, sales, service jobs, parts, and lifecycle data.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 5.x
- **Database**: MongoDB with Mongoose
- **Auth**: JWT (JSON Web Tokens), bcrypt for passwords
- **Uploads**: Multer (images, PDFs, Excel/CSV)

## Project Structure

```
backend/
├── src/
│   ├── app.js              # Express app (middleware, routes)
│   ├── server.js           # HTTP server entry
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── controllers/       # Request handlers
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API route definitions
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── services/
│   │   └── warrantyService.js
│   └── utils/             # Upload config, seed helpers
├── scripts/
│   ├── resetUsersAndCreateSuperAdmin.js
│   ├── resetSuperAdminPassword.js
│   ├── seedModels.js
│   └── seedParts.js
└── package.json
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   Create `.env` in `backend/`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/sunlife-lab
   JWT_SECRET=your-secret-key-min-32-chars
   NODE_ENV=development
   ```

3. **Run**
   ```bash
   npm run dev   # Development (nodemon)
   npm start     # Production
   ```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Start production server |
| `npm run create-admin` | Delete all users, create single Super Admin (default: admin@sunlife.com / password) |
| `npm run reset-super-admin-password` | Set new password for Super Admin by email (no user deletion) |
| `npm run seed-models` | Seed product models |
| `npm run seed-parts` | Seed sample parts catalog |

**Create admin with custom credentials:**
```bash
ADMIN_NAME="Your Name" ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=YourPassword npm run create-admin
```

**Reset Super Admin password:**
```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=NewPassword npm run reset-super-admin-password
```

## API Overview

- **Auth**: `POST /api/auth/login`
- **Models**: `GET/POST/PUT/DELETE /api/inverter-models`, upload image/datasheet
- **Units**: `GET/POST /api/inverters`, bulk registration
- **Factory stock**: `GET /api/factory-inverter-stock`
- **Dispatch**: `POST /api/inverter-dispatches`
- **Dealer stock / transfers**: `GET /api/dealer-inverter-stock`, `POST /api/dealer-transfers`
- **Sales**: `POST /api/inverter-sales`
- **Service jobs**: `GET/POST /api/service-jobs`, replaced parts
- **Parts**: `GET/POST/PUT/DELETE /api/parts`
- **Parts dispatch**: `GET/POST /api/part-dispatches`
- **Lifecycle**: `GET /api/inverters/lifecycle/:serialNumber`

All protected routes require `Authorization: Bearer <token>`.

## Main Models

- **User** — Roles: FACTORY_ADMIN, DEALER, SUB_DEALER, SERVICE_CENTER, DATA_ENTRY_OPERATOR
- **InverterModel** — Product models (brand, productLine, variant, warranty, image, datasheet)
- **InverterUnit** — Registered units (serialNumber, inverterModel, manufacturingDate, currentStage)
- **InverterDispatch** — Factory → dealer dispatches
- **DealerTransfer** — Dealer → sub-dealer transfers
- **InverterSale** — Customer sales (serialNumber, invoice, customer, saleDate)
- **ServiceJob** — Service center jobs; ReplacedPart for parts used
- **Part** / **ModelPart** — Parts catalog and model–part association
- **PartDispatch** — Parts dispatched to service centers

See root [README.md](../README.md) for full API examples and workflows.
