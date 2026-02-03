# Solar Warranty & Inventory System - Frontend Implementation

Complete React frontend implementation aligned with the backend system.

## Tech Stack

- **Framework**: React 18 + Vite
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query (server state) + React Context (auth)
- **Routing**: React Router v6 with protected routes
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios with interceptors
- **Auth**: JWT stored in memory (localStorage fallback)

## Architecture Principles

✅ **Backend is source of truth** - All business rules enforced by backend
✅ **Frontend is thin client** - Only handles UI, validation, and API calls
✅ **No duplicate logic** - Stock calculations, warranty checks, etc. done by backend
✅ **Role-based UI** - Frontend shows/hides features based on role (backend still enforces)

## Complete Feature Implementation

### 1. Authentication & Authorization ✅

**Files:**
- `src/pages/login/login.tsx` - Login page
- `src/store/auth-store.tsx` - Auth context with JWT management
- `src/routes/protected-route.tsx` - Route protection
- `src/routes/role-route.tsx` - Role-based route protection
- `src/api/auth-api.ts` - Login API

**Features:**
- JWT-based authentication
- Automatic token injection in API requests
- Auto-logout on 401 errors
- Role-based route access

---

### 2. Factory Admin Features ✅

#### 2.1 Dealer Management
- **Page**: `src/pages/factory/dealers.tsx`
- **API**: `src/api/dealer-api.ts`
- **Features**: Create main dealers

#### 2.2 Dealer Hierarchy
- **Page**: `src/pages/factory/dealer-hierarchy.tsx`
- **API**: `src/api/dealer-api.ts`
- **Features**: View complete dealer → sub-dealer tree

#### 2.3 Inverter Model Management
- **Page**: `src/pages/factory/inverter-models.tsx`
- **API**: `src/api/model-api.ts`
- **Features**: Create and list inverter models with warranty settings

#### 2.4 Inverter Registration
- **Page**: `src/pages/factory/inverter-registration.tsx`
- **API**: `src/api/inverter-api.ts`
- **Features**: 
  - Single inverter registration
  - Bulk registration (comma-separated serials)
  - Duplicate detection

#### 2.5 Factory → Dealer Dispatch
- **Page**: `src/pages/factory/factory-dispatch.tsx`
- **API**: `src/api/dispatch-api.ts`
- **Features**: 
  - Select multiple inverters
  - Dispatch to dealers
  - Automatic stock update

#### 2.6 Part Dispatch (Factory → Service Center) ✅ NEW
- **Page**: `src/pages/factory/part-dispatch.tsx`
- **API**: `src/api/part-dispatch-api.ts`
- **Features**: 
  - Dispatch spare parts to service centers
  - Add multiple parts per dispatch
  - Automatic stock update at service center

#### 2.7 Factory Stock View
- **Page**: `src/pages/factory/factory-stock.tsx`
- **API**: `src/api/stock-api.ts`
- **Features**: View available inverters at factory

---

### 3. Dealer Features ✅

#### 3.1 Dealer Stock
- **Page**: `src/pages/dealer/stock.tsx`
- **API**: `src/api/stock-api.ts`
- **Features**: View available inverters (dispatched - sold - transferred)

#### 3.2 Sub-Dealer Management
- **Page**: `src/pages/dealer/sub-dealers.tsx`
- **API**: `src/api/dealer-api.ts`
- **Features**: Create sub-dealers under main dealer

#### 3.3 Dealer → Sub-Dealer Transfer
- **Page**: `src/pages/dealer/transfer.tsx`
- **API**: `src/api/transfer-api.ts`
- **Features**: 
  - Transfer inverters to sub-dealers
  - Select multiple inverters
  - Stock validation

#### 3.4 Sales
- **Page**: `src/pages/dealer/sales.tsx`
- **API**: `src/api/sale-api.ts`
- **Features**: 
  - Single sale
  - Bulk sales
  - Warranty start on sale

---

### 4. Sub-Dealer Features ✅

#### 4.1 Sub-Dealer Stock
- **Page**: `src/pages/sub-dealer/stock.tsx`
- **API**: `src/api/stock-api.ts`
- **Features**: View available inverters

#### 4.2 Sales
- **Page**: `src/pages/sub-dealer/sales.tsx`
- **API**: `src/api/sale-api.ts`
- **Features**: Record sales to customers

---

### 5. Service Center Features ✅

#### 5.1 Service Job Creation
- **Page**: `src/pages/service-center/create-job.tsx`
- **API**: `src/api/service-api.ts`
- **Features**: 
  - Create service jobs for sold inverters
  - Warranty snapshot at visit date
  - Service type auto-determined (FREE/PAID)

#### 5.2 Service Job Listing
- **Page**: `src/pages/service-center/service-jobs.tsx`
- **API**: `src/api/service-api.ts`
- **Features**: 
  - List all service jobs
  - Filter by date, warranty, serial number
  - Link to job details and lifecycle

#### 5.3 Service Job Details ✅ NEW
- **Page**: `src/pages/service-center/service-job-details.tsx`
- **API**: `src/api/service-api.ts`
- **Features**: 
  - View complete job information
  - Add replaced parts
  - Select from dispatched parts
  - Track replacement vs repair
  - Automatic stock deduction

#### 5.4 Service Center Stock
- **Page**: `src/pages/service-center/stock.tsx`
- **API**: `src/api/service-api.ts`
- **Features**: View available parts stock

---

### 6. Shared Features ✅

#### 6.1 Inverter Lifecycle View
- **Page**: `src/pages/lifecycle/inverter-lifecycle.tsx`
- **API**: `src/api/inverter-api.ts`
- **Features**: 
  - Complete lifecycle timeline
  - Factory registration
  - Dispatch history
  - Transfer timeline
  - Sale information
  - Service jobs
  - Replaced parts
  - Warranty status

---

## API Integration Status

All backend APIs have corresponding frontend implementations:

| Backend API | Frontend Implementation | Status |
|------------|------------------------|--------|
| `POST /api/auth/login` | `auth-api.ts` | ✅ |
| `POST /api/dealers` | `dealer-api.ts` | ✅ |
| `POST /api/dealers/sub-dealer` | `dealer-api.ts` | ✅ |
| `GET /api/dealers/hierarchy` | `dealer-api.ts` | ✅ |
| `POST /api/inverter-models` | `model-api.ts` | ✅ |
| `GET /api/inverter-models` | `model-api.ts` | ✅ |
| `POST /api/inverters` | `inverter-api.ts` | ✅ |
| `POST /api/inverters/bulk` | `inverter-api.ts` | ✅ |
| `POST /api/inverter-dispatches` | `dispatch-api.ts` | ✅ |
| `POST /api/dealer-transfers` | `transfer-api.ts` | ✅ |
| `GET /api/factory-inverter-stock` | `stock-api.ts` | ✅ |
| `GET /api/dealer-inverter-stock` | `stock-api.ts` | ✅ |
| `POST /api/inverter-sales/sell` | `sale-api.ts` | ✅ |
| `POST /api/inverter-sales/bulk` | `sale-api.ts` | ✅ |
| `POST /api/service-jobs` | `service-api.ts` | ✅ |
| `GET /api/service-jobs` | `service-api.ts` | ✅ |
| `GET /api/service-jobs/:id` | `service-api.ts` | ✅ |
| `POST /api/service-jobs/:id/replaced-parts` | `service-api.ts` | ✅ |
| `POST /api/part-dispatches` | `part-dispatch-api.ts` | ✅ |
| `GET /api/part-dispatches` | `part-dispatch-api.ts` | ✅ |
| `GET /api/service-center-stock` | `service-api.ts` | ✅ |
| `GET /api/inverters/:serialNumber/lifecycle` | `inverter-api.ts` | ✅ |

---

## Route Structure

```
/login                          # Public
/                               # Protected (redirects to /lifecycle)
  /factory/
    /dealers                    # FACTORY_ADMIN
    /dealer-hierarchy           # FACTORY_ADMIN
    /inverter-models            # FACTORY_ADMIN
    /inverter-registration      # FACTORY_ADMIN
    /dispatch                   # FACTORY_ADMIN
    /part-dispatch              # FACTORY_ADMIN ✅ NEW
    /stock                      # FACTORY_ADMIN
  /dealer/
    /stock                      # DEALER
    /sub-dealers                # DEALER
    /transfer                   # DEALER
    /sales                      # DEALER
  /sub-dealer/
    /stock                      # SUB_DEALER
    /sales                      # SUB_DEALER
  /service-center/
    /jobs                       # SERVICE_CENTER
    /jobs/create                # SERVICE_CENTER
    /jobs/:serviceJobId         # SERVICE_CENTER ✅ NEW
    /stock                      # SERVICE_CENTER
  /lifecycle                    # All authenticated
  /lifecycle/:serialNumber      # All authenticated
```

---

## Key Features

### Error Handling
- ✅ Toast notifications for all operations
- ✅ Loading states on all pages
- ✅ Error boundaries for API failures
- ✅ Form validation with Zod

### User Experience
- ✅ Role-based navigation (sidebar shows only relevant links)
- ✅ Search and filtering on list pages
- ✅ Responsive design
- ✅ Consistent UI with shadcn/ui

### Data Management
- ✅ TanStack Query for server state
- ✅ Automatic cache invalidation
- ✅ Optimistic updates where appropriate
- ✅ Loading and error states

---

## Setup Instructions

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Configure environment:**
Create `.env` file:
```
VITE_API_BASE_URL=http://localhost:5050
```

3. **Start development server:**
```bash
npm run dev
```

4. **Build for production:**
```bash
npm run build
```

---

## Testing Checklist

### Factory Admin
- [x] Create dealers
- [x] View dealer hierarchy
- [x] Create inverter models
- [x] Register inverters (single & bulk)
- [x] Dispatch inverters to dealers
- [x] Dispatch parts to service centers ✅ NEW
- [x] View factory stock

### Dealer
- [x] View dealer stock
- [x] Create sub-dealers
- [x] Transfer to sub-dealers
- [x] Record sales (single & bulk)

### Sub-Dealer
- [x] View stock
- [x] Record sales

### Service Center
- [x] Create service jobs
- [x] List service jobs
- [x] View service job details ✅ NEW
- [x] Add replaced parts ✅ NEW
- [x] View parts stock

### All Roles
- [x] View inverter lifecycle
- [x] Search and filter functionality

---

## Recent Additions

1. **Part Dispatch Feature** - Factory admins can now dispatch parts to service centers
2. **Service Job Details Page** - View complete job info and add replaced parts
3. **Replaced Parts Management** - Add parts with dispatch selection, replacement type, and automatic stock deduction

---

## Notes

- All business logic is enforced by the backend
- Frontend only handles UI/UX and API communication
- Stock calculations are derived by backend
- Warranty logic is backend-controlled
- No duplicate business rules in frontend
