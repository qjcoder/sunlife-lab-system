# Architecture Overview

High-level architecture and design of the SunLife Lab Software system.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                           │
│  Vite + TypeScript, React Router, TanStack Query, Shadcn UI      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST (JWT)
┌────────────────────────────▼────────────────────────────────────┐
│                     Backend (Express)                             │
│  REST API, JWT auth, role-based access                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      MongoDB                                      │
│  Users, Models, Units, Dispatches, Sales, ServiceJobs, Parts      │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Product lifecycle

1. **Registration** — Factory/operator registers units (serial + model + date) → `InverterUnit` with `currentStage: 'factory'`.
2. **Dispatch** — Factory dispatches to dealer → `InverterDispatch`; unit stage → `'dispatched'` / dealer stock.
3. **Transfer** — Dealer transfers to sub-dealer → `DealerTransfer`; unit moves to sub-dealer stock.
4. **Sale** — Dealer/sub-dealer records sale → `InverterSale`; warranty start set; unit marked sold.
5. **Service** — Service center creates job, adds replaced parts → `ServiceJob`, `ReplacedPart`; lifecycle API aggregates history.

### Parts flow

- **Parts catalog** — `Part` + `ModelPart` (model–part link). Managed under Create Parts (by category/model).
- **Parts dispatch** — Factory dispatches parts to service centers → `PartDispatch` (with model/variant on items when applicable).

## Frontend Structure

- **Layout**: `AppShell` → `Sidebar` (nav by role) + `Topbar` (brand, section, theme, notifications, user) + main content.
- **Routes**: Role-based; `ProtectedRoute` (auth) + `RoleRoute` (role check). Routes and sidebar sections aligned (Overview, Setup, Inventory, Dispatch, etc.).
- **State**: Auth in `auth-store` (context); server state via TanStack Query; forms with React Hook Form + Zod.
- **API**: Axios instance in `api/axios.ts`; base URL from `VITE_API_BASE_URL`; JWT from localStorage; 401 → logout.

## Backend Structure

- **Layers**: Routes → Controllers → Models. Auth middleware on protected routes; role checks where needed.
- **Uploads**: Multer for product images and datasheets (stored under `frontend/public/products/` or configured path). Excel/CSV parsed for bulk operations.
- **Warranty**: `warrantyService` and model warranty fields (partsMonths, serviceMonths) drive warranty display and logic.

## Security

- **Auth**: JWT in header; stored in localStorage (frontend). Backend validates token and attaches user to request.
- **Roles**: FACTORY_ADMIN, DEALER, SUB_DEALER, SERVICE_CENTER, DATA_ENTRY_OPERATOR. UI and API restrict actions by role.
- **Super Admin**: Special flag for script-created admin; can access Account Creation and other admin-only features.

## Conventions

- **Ids**: MongoDB `_id` (ObjectId) for all main entities.
- **References**: Models reference other models by `_id`; populated where needed for display (e.g. unit → inverterModel, partDispatch → serviceCenter).
- **Naming**: REST-style routes; camelCase in JSON; kebab-case or camelCase in URLs per existing code.

## Related Docs

- [Root README](../README.md) — Setup, roles, workflows, API examples
- [Backend README](../backend/README.md) — API and scripts
- [Frontend README](../frontend/README.md) — Frontend setup and structure
