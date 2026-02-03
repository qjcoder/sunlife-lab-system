# Solar Warranty & Inventory System - Frontend

Frontend application for the Solar Warranty & Inventory System built with React, Vite, TypeScript, and shadcn/ui.

## Tech Stack

- **Framework**: React 18 + Vite
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query (server state) + React Context (auth)
- **Routing**: React Router v6 with protected routes
- **Forms**: React Hook Form + Zod validation
- **Tables**: TanStack Table
- **HTTP Client**: Axios with interceptors
- **Auth**: JWT stored in memory (localStorage fallback)

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API functions
│   ├── components/        # React components
│   │   ├── ui/           # shadcn UI components
│   │   ├── layout/       # Layout components
│   │   ├── tables/       # Table components
│   │   └── forms/        # Form components
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   ├── routes/           # Route protection components
│   ├── store/             # State management
│   └── lib/              # Utilities and constants
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```
VITE_API_BASE_URL=http://localhost:5050
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Features

### Role-Based Access Control

The application supports four user roles:
- **FACTORY_ADMIN**: Manage dealers, models, inverter registration, and dispatch
- **DEALER**: Manage stock, sub-dealers, transfers, and sales
- **SUB_DEALER**: View stock and record sales
- **SERVICE_CENTER**: Manage service jobs and view parts stock

### Key Pages

- **Login**: Authentication page
- **Factory Pages**: Dealer management, model management, inverter registration, dispatch, and stock
- **Dealer Pages**: Stock management, sub-dealer management, transfers, and sales
- **Sub-Dealer Pages**: Stock view and sales recording
- **Service Center Pages**: Service job management and parts stock
- **Lifecycle**: View complete inverter lifecycle timeline

## API Integration

All API calls are made through the centralized API layer in `src/api/`. The Axios instance automatically:
- Adds JWT tokens to requests
- Handles 401 errors by logging out and redirecting to login
- Uses the base URL from environment variables

## Authentication

Authentication is handled through JWT tokens stored in localStorage. The auth context provides:
- `login(token, user)`: Store credentials
- `logout()`: Clear credentials
- `user`: Current user object
- `isAuthenticated`: Authentication status

## Routing

Routes are protected using:
- `ProtectedRoute`: Requires authentication
- `RoleRoute`: Requires specific role(s)

## Development

The project uses:
- TypeScript for type safety
- ESLint for code quality
- Tailwind CSS for styling
- shadcn/ui for component library

## Notes

- Backend enforces all business rules - frontend only validates UX
- All stock calculations done by backend - frontend displays results
- Warranty logic in backend - frontend shows warranty status
- No duplicate business logic in frontend
